const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

// ======================================================
// STATIC WEBSITE
// ======================================================

app.use(
    express.static(
        path.join(__dirname, "../public")
    )
);

// ======================================================
// LAWS DATABASE
// ======================================================

const lawsFile = path.join(
    __dirname,
    "../data/laws.json"
);

function loadLaws() {
    try {

        if (!fs.existsSync(lawsFile)) {

            console.log(
                "❌ laws.json not found:",
                lawsFile
            );

            return [];
        }

        const raw =
            fs.readFileSync(
                lawsFile,
                "utf8"
            );

        const data =
            JSON.parse(raw);

        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data.laws)) {
            return data.laws;
        }

        if (Array.isArray(data.data)) {
            return data.data;
        }

        return [];

    } catch (error) {

        console.error(
            "❌ Error reading laws.json:",
            error.message
        );

        return [];
    }
}

// ======================================================
// TEXT HELPERS
// ======================================================

function cleanText(value) {

    return String(value || "")
        .replace(/[_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}

function normalizeText(value) {

    return cleanText(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}

function getLawTitle(law) {

    return cleanText(
        law.title ||
        law.fileName ||
        law.number ||
        law.lawNumber ||
        "Itegeko"
    );

}

function getLawNumber(law) {

    return cleanText(
        law.number ||
        law.lawNumber ||
        ""
    );

}

function getLawCategory(law) {

    return cleanText(
        law.category ||
        ""
    );

}

function getLawSource(law) {

    return cleanText(
        law.officialSource ||
        law.source ||
        "RLRC"
    );

}

function getLawPdf(law) {

    return (
        law.pdfUrl ||
        law.pdf ||
        law.url ||
        ""
    );

}

// ======================================================
// SEARCH LAWS
// ======================================================

function searchLaws(query) {

    const laws =
        loadLaws();

    const search =
        normalizeText(query);

    if (!search) {
        return [];
    }

    const words =
        search
            .split(/\s+/)
            .filter(Boolean);

    return laws
        .map(law => {

            const searchableText =
                normalizeText(
                    [
                        law.title,
                        law.fileName,
                        law.category,
                        law.source,
                        law.officialSource,
                        law.number,
                        law.lawNumber
                    ]
                        .filter(Boolean)
                        .join(" ")
                );

            let score = 0;

            // Exact phrase
            if (
                searchableText.includes(search)
            ) {
                score += 10;
            }

            // Individual words
            words.forEach(word => {

                if (
                    searchableText.includes(word)
                ) {
                    score += 2;
                }

            });

            return {
                law,
                score
            };

        })
        .filter(item => item.score > 0)
        .sort(
            (a, b) =>
                b.score - a.score
        )
        .map(item => item.law);

}

// ======================================================
// WEBSITE HOME
// ======================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "../public/index.html"
        )
    );

});

// ======================================================
// HEALTH
// ======================================================

app.get("/api/health", (req, res) => {

    res.json({

        success: true,

        message:
            "Rwanda Laws Platform API is running",

        platform:
            "Rwanda Laws Platform",

        version:
            "1.0.0"

    });

});

// ======================================================
// ALL LAWS
// ======================================================

app.get("/api/laws", (req, res) => {

    const laws =
        loadLaws();

    res.json({

        success: true,

        language:
            req.query.language || "rw",

        count:
            laws.length,

        lastChecked:
            new Date()
                .toISOString()
                .slice(0, 10),

        laws

    });

});

// ======================================================
// ONE LAW
// ======================================================

app.get(
    "/api/laws/:id",
    (req, res) => {

        const laws =
            loadLaws();

        const law =
            laws.find(
                item =>
                    String(item.id) ===
                    String(req.params.id)
            );

        if (!law) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Law not found"

                });

        }

        res.json({

            success: true,

            law

        });

    }
);

// ======================================================
// 🇷🇼 USSD
// AFRICA'S TALKING
// ======================================================

app.post(
    "/api/ussd",
    (req, res) => {

        try {

            const sessionId =
                req.body.sessionId || "";

            const serviceCode =
                req.body.serviceCode || "";

            const phoneNumber =
                req.body.phoneNumber || "";

            const text =
                String(
                    req.body.text || ""
                ).trim();

            console.log(
                "===================================="
            );

            console.log(
                "📱 USSD REQUEST"
            );

            console.log(
                "Session:",
                sessionId
            );

            console.log(
                "Service:",
                serviceCode
            );

            console.log(
                "Phone:",
                phoneNumber
            );

            console.log(
                "Text:",
                text
            );

            console.log(
                "===================================="
            );

            // ==================================================
            // FIRST MENU
            // ==================================================

            if (text === "") {

                return res
                    .type("text/plain")
                    .send(
                        "CON 🇷🇼 RWANDA LAWS PLATFORM\n" +
                        "1. Shaka itegeko\n" +
                        "2. Ibyiciro by'amategeko\n" +
                        "3. Amategeko mashya\n" +
                        "4. Ubufasha\n" +
                        "0. Sohoka"
                    );

            }

            // ==================================================
            // SEARCH MENU
            // ==================================================

            if (text === "1") {

                return res
                    .type("text/plain")
                    .send(
                        "CON SHAKA ITEGEKO\n" +
                        "Andika ijambo ushaka.\n" +
                        "Urugero: umurimo"
                    );

            }

            // ==================================================
            // CATEGORIES
            // ==================================================

            if (text === "2") {

                return res
                    .type("text/plain")
                    .send(
                        "CON IBYICIRO\n" +
                        "1. Criminal\n" +
                        "2. Civil\n" +
                        "3. Business\n" +
                        "4. Labour\n" +
                        "5. Land\n" +
                        "6. Family\n" +
                        "0. Subira"
                    );

            }

            // ==================================================
            // RECENT / NEW LAWS
            // ==================================================

            if (text === "3") {

                const laws =
                    loadLaws();

                if (
                    laws.length === 0
                ) {

                    return res
                        .type("text/plain")
                        .send(
                            "END Nta mategeko yabonetse."
                        );

                }

                const recent =
                    laws.slice(0, 5);

                let message =
                    "END AMATEGEKO:\n";

                recent.forEach(
                    (law, index) => {

                        const title =
                            getLawTitle(law);

                        message +=
                            `${index + 1}. ${title.substring(0, 45)}\n`;

                    }
                );

                return res
                    .type("text/plain")
                    .send(message);

            }

            // ==================================================
            // HELP
            // ==================================================

            if (text === "4") {

                return res
                    .type("text/plain")
                    .send(
                        "END Rwanda Laws Platform 🇷🇼\n" +
                        "Shaka itegeko ukoresheje ijambo. " +
                        "Urugero: umurimo, ubutaka, ubucuruzi."
                    );

            }

            // ==================================================
            // EXIT
            // ==================================================

            if (text === "0") {

                return res
                    .type("text/plain")
                    .send(
                        "END Murakoze gukoresha Rwanda Laws Platform 🇷🇼"
                    );

            }

            // ==================================================
            // SEARCH RESULT
            //
            // Example:
            // 1*umurimo
            // ==================================================

            if (
                text.startsWith("1*") &&
                text.split("*").length === 2
            ) {

                const query =
                    text
                        .split("*")[1]
                        .trim();

                const results =
                    searchLaws(query);

                if (
                    results.length === 0
                ) {

                    return res
                        .type("text/plain")
                        .send(
                            "END Nta tegeko ribonetse kuri:\n" +
                            query
                        );

                }

                const limitedResults =
                    results.slice(0, 5);

                let message =
                    "CON AMATEGEKO YABONETSE:\n";

                limitedResults.forEach(
                    (law, index) => {

                        const title =
                            getLawTitle(law);

                        message +=
                            `${index + 1}. ${title.substring(0, 55)}\n`;

                    }
                );

                message +=
                    "0. Subira";

                return res
                    .type("text/plain")
                    .send(message);

            }

            // ==================================================
            // SELECT SEARCH RESULT
            //
            // Example:
            // 1*umurimo*1
            // ==================================================

            if (
                text.startsWith("1*") &&
                text.split("*").length === 3
            ) {

                const parts =
                    text.split("*");

                const query =
                    parts[1].trim();

                const selected =
                    parseInt(
                        parts[2],
                        10
                    );

                const results =
                    searchLaws(query);

                if (
                    !selected ||
                    selected < 1 ||
                    selected > results.length
                ) {

                    return res
                        .type("text/plain")
                        .send(
                            "END Ihitamo ntabwo ribonetse."
                        );

                }

                const law =
                    results[selected - 1];

                const title =
                    getLawTitle(law);

                const category =
                    getLawCategory(law);

                const number =
                    getLawNumber(law);

                const pdf =
                    getLawPdf(law);

                return res
                    .type("text/plain")
                    .send(
                        "CON " +
                        title.substring(0, 80) +
                        "\n" +
                        (number
                            ? "No: " +
                              number.substring(0, 30) +
                              "\n"
                            : "") +
                        (category
                            ? "Category: " +
                              category.substring(0, 35) +
                              "\n"
                            : "") +
                        "1. Amakuru\n" +
                        "2. PDF\n" +
                        "3. Ohereza SMS\n" +
                        "0. Subira"
                    );

            }

            // ==================================================
            // LAW INFORMATION
            //
            // Example:
            // 1*umurimo*1*1
            // ==================================================

            if (
                text.startsWith("1*") &&
                text.split("*").length === 4
            ) {

                const parts =
                    text.split("*");

                const query =
                    parts[1].trim();

                const selected =
                    parseInt(
                        parts[2],
                        10
                    );

                const action =
                    parts[3];

                const results =
                    searchLaws(query);

                if (
                    !selected ||
                    selected < 1 ||
                    selected > results.length
                ) {

                    return res
                        .type("text/plain")
                        .send(
                            "END Itegeko ntabwo ribonetse."
                        );

                }

                const law =
                    results[selected - 1];

                const title =
                    getLawTitle(law);

                const category =
                    getLawCategory(law);

                const status =
                    cleanText(
                        law.status ||
                        "unknown"
                    );

                const source =
                    getLawSource(law);

                const pdf =
                    getLawPdf(law);

                // ------------------------------------------
                // ACTION 1 - INFORMATION
                // ------------------------------------------

                if (
                    action === "1"
                ) {

                    return res
                        .type("text/plain")
                        .send(
                            "CON AMAKURU\n" +
                            title.substring(0, 70) +
                            "\n" +
                            "Category: " +
                            category.substring(0, 30) +
                            "\n" +
                            "Status: " +
                            status.substring(0, 20) +
                            "\n" +
                            "Source: " +
                            source.substring(0, 30) +
                            "\n" +
                            "1. PDF\n" +
                            "2. SMS\n" +
                            "0. Subira"
                        );

                }

                // ------------------------------------------
                // ACTION 2 - PDF
                // ------------------------------------------

                if (
                    action === "2"
                ) {

                    if (!pdf) {

                        return res
                            .type("text/plain")
                            .send(
                                "END PDF y'iri tegeko ntibonetse."
                            );

                    }

                    return res
                        .type("text/plain")
                        .send(
                            "END PDF y'itegeko iboneka kuri website ya Rwanda Laws Platform. " +
                            "Link: " +
                            pdf
                        );

                }

                // ------------------------------------------
                // ACTION 3 - SMS
                // ------------------------------------------

                if (
                    action === "3"
                ) {

                    return res
                        .type("text/plain")
                        .send(
                            "END SMS request yakiriwe. " +
                            "Tugiye kohereza amakuru y'itegeko kuri " +
                            phoneNumber
                        );

                }

            }

            // ==================================================
            // UNKNOWN INPUT
            // ==================================================

            return res
                .type("text/plain")
                .send(
                    "END Ihitamo ntabwo rizwi. Ongera utangire."
                );

        } catch (error) {

            console.error(
                "❌ USSD ERROR:",
                error
            );

            return res
                .type("text/plain")
                .send(
                    "END Habaye ikibazo. Ongera ugerageze."
                );

        }

    }
);

// ======================================================
// 📩 INCOMING SMS
// ======================================================

app.post(
    "/api/sms/incoming",
    (req, res) => {

        try {

            console.log(
                "===================================="
            );

            console.log(
                "📩 INCOMING SMS"
            );

            console.log(
                "From:",
                req.body.from
            );

            console.log(
                "To:",
                req.body.to
            );

            console.log(
                "Text:",
                req.body.text
            );

            console.log(
                "LinkId:",
                req.body.linkId
            );

            console.log(
                "===================================="
            );

            return res
                .status(200)
                .send("OK");

        } catch (error) {

            console.error(
                "❌ SMS ERROR:",
                error
            );

            return res
                .status(500)
                .send("ERROR");

        }

    }
);

// ======================================================
// 📩 SMS DELIVERY CALLBACK
// ======================================================

app.post(
    "/api/sms/delivery",
    (req, res) => {

        console.log(
            "📩 SMS DELIVERY:"
        );

        console.log(
            req.body
        );

        return res
            .status(200)
            .send("OK");

    }
);

// ======================================================
// API 404
// ======================================================

app.use(
    "/api",
    (req, res) => {

        res
            .status(404)
            .json({

                success: false,

                message:
                    "API endpoint not found"

            });

    }
);

// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    () => {

        console.log(
            "===================================="
        );

        console.log(
            "🇷🇼 RWANDA LAWS PLATFORM"
        );

        console.log(
            "===================================="
        );

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            `Laws file: ${lawsFile}`
        );

        console.log(
            "USSD endpoint: /api/ussd"
        );

        console.log(
            "SMS incoming endpoint: /api/sms/incoming"
        );

        console.log(
            "SMS delivery endpoint: /api/sms/delivery"
        );

        const laws =
            loadLaws();

        console.log(
            `📚 Laws loaded: ${laws.length}`
        );

    }
);