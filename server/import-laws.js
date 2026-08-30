const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://www.rlrc.gov.rw";
const START_URL =
  "https://www.rlrc.gov.rw/mandate/laws-of-rwanda";

const OUTPUT_FILE = path.join(__dirname, "laws.json");
const CHANGES_FILE = path.join(__dirname, "law-changes.json");

const visited = new Set();
const discovered = new Map();

function getPage(url) {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        headers: {
          "User-Agent": "Rwanda-Laws-Platform/1.0"
        }
      },
      (res) => {
        let data = "";

        res.setEncoding("utf8");

        res.on("data", chunk => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 400) {
            resolve(data);
          } else {
            reject(
              new Error(`HTTP ${res.statusCode}: ${url}`)
            );
          }
        });
      }
    ).on("error", reject);
  });
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(value) {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href) {
  href = decodeHtml(href);

  if (!href) return "";

  try {
    return new URL(href, BASE_URL).href;
  } catch {
    return "";
  }
}

function getPathFromUrl(url) {
  try {
    const parsed = new URL(url);

    const p =
      parsed.searchParams.get(
        "tx_filelist_filelist[path]"
      );

    return p || "";
  } catch {
    return "";
  }
}

function getLinks(html) {
  const results = [];

  const regex =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    results.push({
      href: decodeHtml(match[1]),
      text: cleanText(match[2])
    });
  }

  return results;
}

function makeDirectoryUrl(directoryPath) {
  return (
    `${BASE_URL}/mandate/laws-of-rwanda` +
    `?tx_filelist_filelist%5Baction%5D=list` +
    `&tx_filelist_filelist%5Bcontroller%5D=File` +
    `&tx_filelist_filelist%5Bpath%5D=` +
    encodeURIComponent(directoryPath)
  );
}

function categoryFromPath(directoryPath) {
  const parts = directoryPath
    .split("/")
    .filter(Boolean);

  const index = parts.findIndex(
    p => p.toLowerCase() === "laws_in_force"
  );

  if (index >= 0 && parts[index + 1]) {
    return parts[index + 1]
      .replace(/[_-]+/g, " ")
      .trim();
  }

  return "Unclassified";
}

function createLaw(text, url, directoryPath) {
  return {
    id: `rlrc-${Buffer
      .from(url)
      .toString("base64url")}`,

    lawNumber: "",

    title: {
      rw: text,
      en: text
    },

    category: categoryFromPath(directoryPath),

    status: "in_force",

    publicationDate: null,

    effectiveDate: null,

    lastVerified:
      new Date().toISOString().slice(0, 10),

    summary: {
      rw: "",
      en: ""
    },

    officialSource: url,

    gazette: "",

    amendments: [],

    repealedBy: null,

    sourceType: "Official RLRC"
  };
}

async function crawl(url) {
  if (visited.has(url)) return;

  visited.add(url);

  console.log(`Scanning: ${url}`);

  let html;

  try {
    html = await getPage(url);
  } catch (error) {
    console.log(
      `Could not read: ${url}`
    );
    console.log(error.message);
    return;
  }

  const links = getLinks(html);

  for (const link of links) {
    const fullUrl = absoluteUrl(link.href);

    if (!fullUrl) continue;

    const lower = fullUrl.toLowerCase();

    // PDF
    if (lower.includes(".pdf")) {
      const law = createLaw(
        link.text ||
          decodeHtml(
            fullUrl.split("/").pop()
          ),
        fullUrl,
        getPathFromUrl(url)
      );

      discovered.set(
        fullUrl,
        law
      );

      continue;
    }

    // RLRC folder
    const childPath =
      getPathFromUrl(fullUrl);

    if (
      childPath &&
      childPath.includes(
        "/Laws_of_Rwanda_v2/"
      )
    ) {
      await crawl(fullUrl);
    }
  }
}

function loadOldLaws() {
  try {
    if (!fs.existsSync(OUTPUT_FILE)) {
      return [];
    }

    const data = JSON.parse(
      fs.readFileSync(
        OUTPUT_FILE,
        "utf8"
      )
    );

    return Array.isArray(data.laws)
      ? data.laws
      : [];
  } catch {
    return [];
  }
}

function detectChanges(oldLaws, newLaws) {
  const oldMap = new Map(
    oldLaws.map(
      law => [
        law.officialSource,
        law
      ]
    )
  );

  const newMap = new Map(
    newLaws.map(
      law => [
        law.officialSource,
        law
      ]
    )
  );

  const added = [];
  const removed = [];

  for (const law of newLaws) {
    if (!oldMap.has(law.officialSource)) {
      added.push(law);
    }
  }

  for (const law of oldLaws) {
    if (
      law.officialSource &&
      !newMap.has(law.officialSource)
    ) {
      removed.push({
        ...law,
        detectedStatus:
          "no_longer_listed_as_in_force",
        detectedAt:
          new Date().toISOString()
      });
    }
  }

  return {
    added,
    removed
  };
}

async function main() {
  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "RWANDA LAWS PLATFORM"
  );
  console.log(
    "OFFICIAL RLRC IMPORTER"
  );
  console.log(
    "=========================================="
  );

  console.log(
    "Starting from:"
  );

  console.log(START_URL);
  console.log("");

  await crawl(START_URL);

  const laws =
    Array.from(
      discovered.values()
    );

  const oldLaws =
    loadOldLaws();

  const changes =
    detectChanges(
      oldLaws,
      laws
    );

  if (laws.length === 0) {
    console.error("");
    console.error(
      "IMPORT FAILED: No official law documents were discovered."
    );
    console.error(
      "laws.json was NOT replaced."
    );
    console.error("");

    process.exit(1);
  }

  const database = {
    metadata: {
      platform:
        "Rwanda Laws Platform",

      version: "1.0.0",

      primarySource:
        "Rwanda Law Reform Commission",

      primarySourceUrl:
        "https://www.rlrc.gov.rw/mandate/laws-of-rwanda",

      portalUrl:
        "https://amategeko.gov.rw/",

      lastChecked:
        new Date()
          .toISOString()
          .slice(0, 10),

      totalLaws:
        laws.length
    },

    laws
  };

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      database,
      null,
      2
    ),
    "utf8"
  );

  const changeReport = {
    checkedAt:
      new Date().toISOString(),

    source:
      "Rwanda Law Reform Commission",

    summary: {
      current:
        laws.length,

      added:
        changes.added.length,

      removed:
        changes.removed.length
    },

    added:
      changes.added,

    removed:
      changes.removed
  };

  fs.writeFileSync(
    CHANGES_FILE,
    JSON.stringify(
      changeReport,
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "IMPORT COMPLETED"
  );
  console.log(
    "=========================================="
  );

  console.log(
    `Current official records: ${laws.length}`
  );

  console.log(
    `New records detected: ${changes.added.length}`
  );

  console.log(
    `Removed records detected: ${changes.removed.length}`
  );

  console.log(
    `Saved: ${OUTPUT_FILE}`
  );

  console.log(
    `Changes: ${CHANGES_FILE}`
  );

  console.log(
    "=========================================="
  );
}

main().catch(error => {
  console.error("");
  console.error(
    "OFFICIAL IMPORT ERROR:"
  );
  console.error(
    error.message
  );

  process.exit(1);
});