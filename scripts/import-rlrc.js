const fs = require("fs");
const path = require("path");
const https = require("https");

const BASE_URL = "https://www.rlrc.gov.rw";

const START_URL =
  BASE_URL +
  "/mandate/laws-of-rwanda?tx_filelist_filelist%5Baction%5D=list&tx_filelist_filelist%5Bcontroller%5D=File&tx_filelist_filelist%5Bpath%5D=%2Fuser_upload%2FRLRC%2FLaws_of_Rwanda_v2%2FDomestic_laws%2FLaws_in_force%2F&cHash=86926f044b8085a1b13c0c79949136f3";

const OUTPUT = path.join(__dirname, "..", "data", "laws.json");

const visited = new Set();
const laws = [];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 Rwanda-Laws-Platform"
          }
        },
        (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => resolve(data));
        }
      )
      .on("error", reject);
  });
}

function absoluteUrl(href) {
  if (href.startsWith("http")) {
    return href;
  }

  return BASE_URL + href;
}

function cleanHtml(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function getLinks(html) {
  const links = [];
  const regex = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    links.push({
      href: match[1].replace(/&amp;/g, "&"),
      text: cleanHtml(match[2])
    });
  }

  return links;
}

function getPathFromUrl(url) {
  try {
    const parsed = new URL(url);

    const match = parsed.search.match(
      /tx_filelist_filelist%5Bpath%5D=([^&]+)/
    );

    if (match) {
      return decodeURIComponent(match[1]);
    }

    const match2 = parsed.search.match(
      /tx_filelist_filelist\[path\]=([^&]+)/
    );

    if (match2) {
      return decodeURIComponent(match2[1]);
    }
  } catch (error) {}

  return "";
}

function categoryFromPath(filePath) {
  const parts = filePath
    .split("/")
    .filter(Boolean);

  const lawsIndex = parts.indexOf("Laws_in_force");

  if (lawsIndex === -1) {
    return "Other";
  }

  return parts[lawsIndex + 1] || "Other";
}

async function crawl(url, depth = 0) {
  if (visited.has(url)) {
    return;
  }

  visited.add(url);

  if (depth > 20) {
    return;
  }

  console.log(
    "📂".padEnd(4) +
      " ".repeat(depth * 2) +
      url.substring(0, 120)
  );

  let html;

  try {
    html = await fetchPage(url);
  } catch (error) {
    console.log("❌ Could not open page");
    return;
  }

  const links = getLinks(html);

  for (const link of links) {
    const href = link.href;

    if (!href) {
      continue;
    }

    const absolute = absoluteUrl(href);

    if (/\.pdf(?:$|\?)/i.test(absolute)) {
      const fileName = decodeURIComponent(
        absolute.split("/").pop().split("?")[0]
      );

      const filePath = absolute.split("/fileadmin/")[1] || "";

      const law = {
        id: "rlrc-" + (laws.length + 1),
        title: fileName.replace(/\.pdf$/i, ""),
        fileName: fileName,
        category: categoryFromPath(filePath),
        status: "in_force",
        language: "en",
        source: "Rwanda Law Reform Commission",
        officialSource: "RLRC",
        pdfUrl: absolute,
        sourcePage: url,
        lastChecked: new Date().toISOString().split("T")[0]
      };

      if (!laws.some((item) => item.pdfUrl === law.pdfUrl)) {
        laws.push(law);

        console.log(
          "📄 " +
            laws.length +
            ". " +
            law.title
        );
      }

      continue;
    }

    if (
      absolute.includes("tx_filelist_filelist") &&
      absolute.includes("action") &&
      absolute.includes("path")
    ) {
      const lowerText = link.text.toLowerCase();

      if (
        lowerText === ".." ||
        lowerText.includes("next") ||
        lowerText.includes("previous")
      ) {
        continue;
      }

      const folderPath = getPathFromUrl(absolute);

      if (
        folderPath.includes("/Laws_in_force/") &&
        folderPath.endsWith("/")
      ) {
        await crawl(absolute, depth + 1);
      }
    }
  }
}

async function main() {
  console.log("");
  console.log("==============================================");
  console.log("🇷🇼 RWANDA LAWS PLATFORM");
  console.log("==============================================");
  console.log("RLRC FULL LAW IMPORTER");
  console.log("Starting...");
  console.log("");

  await crawl(START_URL);

  fs.mkdirSync(path.dirname(OUTPUT), {
    recursive: true
  });

  fs.writeFileSync(
    OUTPUT,
    JSON.stringify(laws, null, 2),
    "utf8"
  );

  console.log("");
  console.log("==============================================");
  console.log("✅ IMPORT FINISHED");
  console.log("==============================================");
  console.log("Total PDF laws found: " + laws.length);
  console.log("Pages visited: " + visited.size);
  console.log("");
  console.log("Database:");
  console.log(OUTPUT);
  console.log("==============================================");
}

main().catch((error) => {
  console.error("");
  console.error("❌ IMPORT FAILED");
  console.error(error);
  process.exit(1);
});