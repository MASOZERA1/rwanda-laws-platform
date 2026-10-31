
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// LAWS DATABASE
const lawsFile = path.join(__dirname, "../data/laws.json");

function loadLaws() {
    try {
        if (!fs.existsSync(lawsFile)) {
            console.log("Laws file not found:", lawsFile);
            return [];
        }
        const data = JSON.parse(fs.readFileSync(lawsFile, "utf8"));
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.laws)) return data.laws;
        if (Array.isArray(data.data)) return data.data;
        return [];
    } catch (error) {
        console.error("Error reading laws.json:", error.message);
        return [];
    }
}

// TEXT HELPERS
function cleanText(value) {
    return String(value || "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
    return cleanText(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getLawTitle(law) {
    return cleanText(law.title || law.fileName || law.number || law.lawNumber || "Itegeko");
}

function getLawNumber(law) {
    return cleanText(law.number || law.lawNumber || "");
}

function getLawCategory(law) {
    return cleanText(law.category || "");
}

function getRawLawCategory(law) {
    return String(law.category || "").trim();
}

function getCategoryLabel(category) {
    return cleanText(category).replace(/^\d+\.?\s*/, "").trim();
}

function getAvailableCategories(laws) {
    return [...new Set(laws.map(getRawLawCategory).filter(Boolean))].sort((a, b) => {
        const aNumber = parseInt(a, 10);
        const bNumber = parseInt(b, 10);
        if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber) && aNumber !== bNumber) {
            return aNumber - bNumber;
        }
        return a.localeCompare(b);
    });
}

function getLawSource(law) {
    return cleanText(law.officialSource || law.source || "RLRC");
}

function getLawPdf(law) {
    return law.pdfUrl || law.pdf || law.url || "";
}

// SEARCH LAWS
function searchLaws(query) {
    const laws = loadLaws();
    const search = normalizeText(query);
    if (!search) return [];
    const words = search.split(/\s+/).filter(Boolean);

    return laws.map(law => {
        const searchableText = normalizeText([
            law.title, law.fileName, law.category, law.source,
            law.officialSource, law.number, law.lawNumber
        ].filter(Boolean).join(" "));
        let score = 0;
        if (searchableText.includes(search)) score += 10;
        words.forEach(word => {
            if (searchableText.includes(word)) score += 2;
        });
        return { law, score };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.law);
}

function mainMenu() {
    return "CON 🇷🇼 RWANDA LAWS PLATFORM\n" +
        "1. Shaka itegeko\n" +
        "2. Ibyiciro by'amategeko\n" +
        "3. Amategeko mashya\n" +
        "4. Ubufasha\n" +
        "0. Sohoka";
}

// WEBSITE HOME
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

// HEALTH CHECK
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Rwanda Laws Platform API is running",
        platform: "Rwanda Laws Platform",
        version: "1.0.0"
    });
});

// ALL LAWS
app.get("/api/laws", (req, res) => {
    const laws = loadLaws();
    res.json({
        success: true,
        language: req.query.language || "rw",
        count: laws.length,
        lastChecked: new Date().toISOString().slice(0, 10),
        laws
    });
});

// ONE LAW
app.get("/api/laws/:id", (req, res) => {
    const laws = loadLaws();
    const law = laws.find(item => String(item.id) === String(req.params.id));
    if (!law) {
        return res.status(404).json({ success: false, message: "Law not found" });
    }
    res.json({ success: true, law });
});

// USSD - AFRICA'S TALKING
app.post("/api/ussd", (req, res) => {
    try {
        const sessionId = req.body.sessionId || "";
        const serviceCode = req.body.serviceCode || "";
        const phoneNumber = req.body.phoneNumber || "";
        const text = String(req.body.text || "").trim();

        console.log("====================================");
        console.log("USSD REQUEST", { sessionId, serviceCode, phoneNumber, text });
        console.log("====================================");

        // FIRST MENU
        if (text === "") {
            return res.type("text/plain").send(mainMenu());
        }

        // SEARCH MENU
        if (text === "1") {
            return res.type("text/plain").send(
                "CON SHAKA ITEGEKO\nAndika ijambo ushaka.\nUrugero: umurimo"
            );
        }

        // DYNAMIC CATEGORY MENU: 2
        if (text === "2") {
            const categories = getAvailableCategories(loadLaws());
            if (categories.length === 0) {
                return res.type("text/plain").send("END Nta byiciro by'amategeko bibonetse.");
            }
            let message = "CON IBYICIRO BY'AMATEGEKO\n";
            categories.forEach((category, index) => {
                message += `${index + 1}. ${getCategoryLabel(category).substring(0, 28)}\n`;
            });
            message += "0. Subira";
            return res.type("text/plain").send(message);
        }

        // SELECT CATEGORY: 2*categoryNumber
        if (text.startsWith("2*") && text.split("*").length === 2) {
            const selectedCategory = parseInt(text.split("*")[1], 10);
            if (selectedCategory === 0) {
                return res.type("text/plain").send(mainMenu());
            }
            const laws = loadLaws();
            const categories = getAvailableCategories(laws);
            if (!selectedCategory || selectedCategory < 1 || selectedCategory > categories.length) {
                return res.type("text/plain").send("END Icyo cyiciro ntikiboneka. Ongera ugerageze.");
            }
            const rawCategory = categories[selectedCategory - 1];
            const categoryLaws = laws.filter(law => getRawLawCategory(law) === rawCategory);
            if (categoryLaws.length === 0) {
                return res.type("text/plain").send("END Nta mategeko ari muri iki cyiciro.");
            }
            let message = `CON ${getCategoryLabel(rawCategory).substring(0, 35)}\n`;
            categoryLaws.slice(0, 5).forEach((law, index) => {
                message += `${index + 1}. ${getLawTitle(law).substring(0, 48)}\n`;
            });
            message += "0. Subira ku byiciro";
            return res.type("text/plain").send(message);
        }

        // SELECT LAW IN CATEGORY: 2*categoryNumber*lawNumber
        if (text.startsWith("2*") && text.split("*").length === 3) {
            const parts = text.split("*");
            const categoryIndex = parseInt(parts[1], 10);
            const lawIndex = parseInt(parts[2], 10);
            const laws = loadLaws();
            const categories = getAvailableCategories(laws);
            const rawCategory = categories[categoryIndex - 1];

            if (lawIndex === 0) {
                return res.type("text/plain").send("CON Subira ku byiciro\n" +
                    categories.map((category, index) => `${index + 1}. ${getCategoryLabel(category).substring(0, 28)}`).join("\n") +
                    "\n0. Subira");
            }
            if (!rawCategory || !lawIndex || lawIndex < 1) {
                return res.type("text/plain").send("END Ihitamo ntabwo ribonetse.");
            }
            const categoryLaws = laws.filter(law => getRawLawCategory(law) === rawCategory);
            if (lawIndex > Math.min(categoryLaws.length, 5)) {
                return res.type("text/plain").send("END Iryo tegeko ntiriboneka kuri uru rutonde.");
            }
            const law = categoryLaws[lawIndex - 1];
            const number = getLawNumber(law);
            return res.type("text/plain").send(
                "CON " + getLawTitle(law).substring(0, 75) + "\n" +
                (number ? "No: " + number.substring(0, 30) + "\n" : "") +
                "Category: " + getCategoryLabel(rawCategory).substring(0, 30) + "\n" +
                "1. Amakuru\n2. PDF link\n0. Subira"
            );
        }

        // CATEGORY LAW ACTIONS: 2*category*law*action
        if (text.startsWith("2*") && text.split("*").length === 4) {
            const parts = text.split("*");
            const categoryIndex = parseInt(parts[1], 10);
            const lawIndex = parseInt(parts[2], 10);
            const action = parts[3];
            const laws = loadLaws();
            const categories = getAvailableCategories(laws);
            const rawCategory = categories[categoryIndex - 1];
            const categoryLaws = rawCategory
                ? laws.filter(law => getRawLawCategory(law) === rawCategory)
                : [];
            const law = categoryLaws[lawIndex - 1];

            if (!law || lawIndex > 5 || lawIndex < 1) {
                return res.type("text/plain").send("END Itegeko ntabwo ribonetse.");
            }
            if (action === "1") {
                return res.type("text/plain").send(
                    "END AMAKURU Y'ITEGEKO\n" +
                    getLawTitle(law).substring(0, 85) + "\n" +
                    "Category: " + getCategoryLabel(rawCategory).substring(0, 30) + "\n" +
                    "Status: " + cleanText(law.status || "unknown").substring(0, 20) + "\n" +
                    "Source: " + getLawSource(law).substring(0, 30)
                );
            }
            if (action === "2") {
                const pdf = getLawPdf(law);
                if (!pdf) return res.type("text/plain").send("END PDF y'iri tegeko ntibonetse.");
                return res.type("text/plain").send("END PDF link (fungura kuri internet):\n" + pdf);
            }
            return res.type("text/plain").send("END Ihitamo ntabwo rizwi.");
        }

        // RECENT / NEW LAWS
        if (text === "3") {
            const laws = loadLaws();
            if (laws.length === 0) {
                return res.type("text/plain").send("END Nta mategeko yabonetse.");
            }
            let message = "END AMATEGEKO:\n";
            laws.slice(0, 5).forEach((law, index) => {
                message += `${index + 1}. ${getLawTitle(law).substring(0, 45)}\n`;
            });
            return res.type("text/plain").send(message);
        }

        // HELP
        if (text === "4") {
            return res.type("text/plain").send(
                "END Rwanda Laws Platform 🇷🇼\nShaka itegeko ukoresheje ijambo. Urugero: umurimo, ubutaka, ubucuruzi."
            );
        }

        // EXIT
        if (text === "0") {
            return res.type("text/plain").send("END Murakoze gukoresha Rwanda Laws Platform 🇷🇼");
        }

        // SEARCH RESULTS: 1*query
        if (text.startsWith("1*") && text.split("*").length === 2) {
            const query = text.split("*")[1].trim();
            const results = searchLaws(query);
            if (results.length === 0) {
                return res.type("text/plain").send("END Nta tegeko ribonetse kuri:\n" + query);
            }
            let message = "CON AMATEGEKO YABONETSE:\n";
            results.slice(0, 5).forEach((law, index) => {
                message += `${index + 1}. ${getLawTitle(law).substring(0, 55)}\n`;
            });
            message += "0. Subira";
            return res.type("text/plain").send(message);
        }

        // SELECT SEARCH RESULT: 1*query*number
        if (text.startsWith("1*") && text.split("*").length === 3) {
            const parts = text.split("*");
            const query = parts[1].trim();
            const selected = parseInt(parts[2], 10);
            const results = searchLaws(query);
            if (!selected || selected < 1 || selected > Math.min(results.length, 5)) {
                return res.type("text/plain").send("END Ihitamo ntabwo ribonetse.");
            }
            const law = results[selected - 1];
            const number = getLawNumber(law);
            const category = getLawCategory(law);
            return res.type("text/plain").send(
                "CON " + getLawTitle(law).substring(0, 80) + "\n" +
                (number ? "No: " + number.substring(0, 30) + "\n" : "") +
                (category ? "Category: " + category.substring(0, 35) + "\n" : "") +
                "1. Amakuru\n2. PDF\n3. Ohereza SMS\n0. Subira"
            );
        }

        // SEARCH RESULT ACTIONS: 1*query*number*action
        if (text.startsWith("1*") && text.split("*").length === 4) {
            const parts = text.split("*");
            const query = parts[1].trim();
            const selected = parseInt(parts[2], 10);
            const action = parts[3];
            const results = searchLaws(query);

            if (!selected || selected < 1 || selected > Math.min(results.length, 5)) {
                return res.type("text/plain").send("END Itegeko ntabwo ribonetse.");
            }

            const law = results[selected - 1];
            const title = getLawTitle(law);
            const category = getLawCategory(law);
            const status = cleanText(law.status || "unknown");
            const source = getLawSource(law);
            const pdf = getLawPdf(law);

            if (action === "1") {
                return res.type("text/plain").send(
                    "CON AMAKURU\n" + title.substring(0, 70) + "\n" +
                    "Category: " + category.substring(0, 30) + "\n" +
                    "Status: " + status.substring(0, 20) + "\n" +
                    "Source: " + source.substring(0, 30) + "\n" +
                    "1. PDF\n2. SMS\n0. Subira"
                );
            }
            if (action === "2") {
                if (!pdf) return res.type("text/plain").send("END PDF y'iri tegeko ntibonetse.");
                return res.type("text/plain").send(
                    "END PDF y'itegeko iboneka kuri website ya Rwanda Laws Platform. Link: " + pdf
                );
            }
            if (action === "3") {
                return res.type("text/plain").send(
                    "END SMS request yakiriwe. Tugiye kohereza amakuru y'itegeko kuri " + phoneNumber
                );
            }
        }

        // UNKNOWN INPUT
        return res.type("text/plain").send("END Ihitamo ntabwo rizwi. Ongera utangire.");

    } catch (error) {
        console.error("USSD ERROR:", error);
        return res.type("text/plain").send("END Habaye ikibazo. Ongera ugerageze.");
    }
});

// INCOMING SMS
app.post("/api/sms/incoming", (req, res) => {
    try {
        console.log("INCOMING SMS", {
            from: req.body.from,
            to: req.body.to,
            text: req.body.text,
            linkId: req.body.linkId
        });
        return res.status(200).send("OK");
    } catch (error) {
        console.error("SMS ERROR:", error);
        return res.status(500).send("ERROR");
    }
});

// SMS DELIVERY CALLBACK
app.post("/api/sms/delivery", (req, res) => {
    console.log("SMS DELIVERY:", req.body);
    return res.status(200).send("OK");
});

// API 404
app.use("/api", (req, res) => {
    res.status(404).json({ success: false, message: "API endpoint not found" });
});

// START SERVER
app.listen(PORT, () => {
    console.log("====================================");
    console.log("🇷🇼 RWANDA LAWS PLATFORM");
    console.log("====================================");
    console.log(`Server running on port ${PORT}`);
    console.log(`Laws file: ${lawsFile}`);
    console.log("USSD endpoint: /api/ussd");
    console.log("SMS incoming endpoint: /api/sms/incoming");
    console.log("SMS delivery endpoint: /api/sms/delivery");
    console.log(`Laws loaded: ${loadLaws().length}`);
});
