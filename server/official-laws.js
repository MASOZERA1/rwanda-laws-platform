const https = require("https");

const OFFICIAL_SOURCES = {
  rlrc: "https://www.rlrc.gov.rw/mandate/laws-of-rwanda",
  domesticLaws: "https://www.rlrc.gov.rw/about-rlrc/rlrc-laws",
  portal: "https://amategeko.gov.rw/"
};

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Rwanda-Laws-Platform/1.0"
        }
      },
      (res) => {
        const statusCode = res.statusCode;
        res.resume();

        resolve({
          available: statusCode >= 200 && statusCode < 400,
          statusCode
        });
      }
    );

    req.on("error", (error) => {
      resolve({
        available: false,
        statusCode: null,
        error: error.message
      });
    });

    req.setTimeout(15000, () => {
      req.destroy();

      resolve({
        available: false,
        statusCode: null,
        error: "Request timed out"
      });
    });
  });
}

async function checkOfficialSources() {
  const checkedAt = new Date().toISOString();

  const results = {};

  for (const [key, url] of Object.entries(OFFICIAL_SOURCES)) {
    results[key] = {
      url,
      ...(await checkUrl(url))
    };
  }

  return {
    success: true,
    checkedAt,
    sources: results
  };
}

module.exports = {
  OFFICIAL_SOURCES,
  checkOfficialSources
};