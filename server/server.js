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

app.use(
    express.urlencoded({
        extended: true
    })
);

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

        const raw = fs.readFileSync(
            lawsFile,
            "utf8"
        );

        const data = JSON.parse(raw);

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

function getTitle(law) {
    return cleanText(
        law.title ||
        law.fileName ||
        law.number ||
        "Itegeko"
    );
}

function getCategory(law) {
    return cleanText(
        law.category ||
        ""
    );
}

function getPdf(law) {
    return (
        law.pdfUrl ||
        law.pdf ||
        law.url ||
        ""
    );
}

function getSource(law) {
    return cleanText(
        law.officialSource ||
        law.source ||
        "Rwanda Law Reform Commission"
    );
}

function getNumber(law) {
    return cleanText(
        law.number ||
        law.lawNumber ||
        ""
    );
}

function displayCategory(category) {
    return cleanText(category)
        .replace(
            /^\d+(\.\d+)*\s*[._-]*\s*/i,
            ""
        );
}

// ======================================================
// SEARCH LAWS
// ======================================================

function searchLaws(query) {

    const laws = loadLaws();

    const search = normalizeText(query);

    if (!search) {
        return [];
    }

    const words = search
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

            if (
                searchableText.includes(search)
            ) {
                score += 10;
            }

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
        .filter(
            item => item.score > 0
        )
        .sort(
            (a, b) =>
                b.score - a.score
        )
        .map(
            item => item.law
        );
}

// ======================================================
// CATEGORIES FROM laws.json
// ======================================================

function getCategories() {

    const laws = loadLaws();

    const categories = [];

    const seen = new Set();

    laws.forEach(law => {

        const raw =
            getCategory(law);

        if (!raw) {
            return;
        }

        const key =
            normalizeText(raw);

        if (!seen.has(key)) {

            seen.add(key);

            categories.push({
                raw,
                display:
                    displayCategory(raw)
            });

        }

    });

    return categories;
}

// ======================================================
// LAWS BY CATEGORY
// ======================================================

function lawsByCategory(category) {

    const laws = loadLaws();

    const wanted =
        normalizeText(category);

    return laws.filter(law => {

        const actual =
            normalizeText(
                law.category
            );

        return (
            actual === wanted ||
            actual.includes(wanted) ||
            wanted.includes(actual)
        );

    });
}

// ======================================================
// LANGUAGE TEXT
// ======================================================

const languageText = {

    rw: {

        welcome:
            "CON 🇷🇼 RWANDA LAWS PLATFORM\n" +
            "Hitamo ururimi:\n" +
            "1. Kinyarwanda\n" +
            "2. English\n" +
            "3. Français",

        menu:
            "CON 🇷🇼 AMATEGEKO Y'U RWANDA\n" +
            "1. Shaka itegeko\n" +
            "2. Ibyiciro by'amategeko\n" +
            "3. Amategeko mashya\n" +
            "4. Ubufasha\n" +
            "0. Sohoka",

        search:
            "CON SHAKA ITEGEKO\n" +
            "Andika ijambo ushaka.\n" +
            "Urugero: umurimo",

        categories:
            "CON IBYICIRO BY'AMATEGEKO",

        recent:
            "CON AMATEGEKO MASHYA",

        help:
            "END Rwanda Laws Platform 🇷🇼\n" +
            "Shakisha itegeko ukoresheje ijambo " +
            "cyangwa icyiciro.",

        exit:
            "END Murakoze gukoresha " +
            "Rwanda Laws Platform 🇷🇼",

        noResults:
            "END Nta tegeko ribonetse.",

        choose:
            "CON HITAMO ITEGEKO",

        info:
            "Amakuru",

        pdf:
            "PDF",

        sms:
            "Ohereza SMS",

        back:
            "Subira",

        noPdf:
            "END PDF y'iri tegeko ntibonetse.",

        smsReceived:
            "END Ubusabe bwo kohereza SMS bwakiriwe."

    },

    en: {

        welcome:
            "CON 🇷🇼 RWANDA LAWS PLATFORM\n" +
            "Choose your language:\n" +
            "1. Kinyarwanda\n" +
            "2. English\n" +
            "3. Français",

        menu:
            "CON 🇷🇼 RWANDA LAWS\n" +
            "1. Search for a law\n" +
            "2. Browse law categories\n" +
            "3. Recent laws\n" +
            "4. Help\n" +
            "0. Exit",

        search:
            "CON SEARCH FOR A LAW\n" +
            "Enter a word to search.\n" +
            "Example: labour",

        categories:
            "CON LAW CATEGORIES",

        recent:
            "CON RECENT LAWS",

        help:
            "END Rwanda Laws Platform 🇷🇼\n" +
            "Search for a law using a keyword " +
            "or browse categories.",

        exit:
            "END Thank you for using " +
            "Rwanda Laws Platform 🇷🇼",

        noResults:
            "END No law was found.",

        choose:
            "CON SELECT A LAW",

        info:
            "Information",

        pdf:
            "PDF",

        sms:
            "Send SMS",

        back:
            "Back",

        noPdf:
            "END PDF for this law was not found.",

        smsReceived:
            "END SMS request received."

    },

    fr: {

        welcome:
            "CON 🇷🇼 RWANDA LAWS PLATFORM\n" +
            "Choisissez votre langue:\n" +
            "1. Kinyarwanda\n" +
            "2. English\n" +
            "3. Français",

        menu:
            "CON 🇷🇼 LOIS DU RWANDA\n" +
            "1. Rechercher une loi\n" +
            "2. Catégories des lois\n" +
            "3. Lois récentes\n" +
            "4. Aide\n" +
            "0. Quitter",

        search:
            "CON RECHERCHER UNE LOI\n" +
            "Entrez un mot à rechercher.\n" +
            "Exemple: travail",

        categories:
            "CON CATÉGORIES DES LOIS",

        recent:
            "CON LOIS RÉCENTES",

        help:
            "END Rwanda Laws Platform 🇷🇼\n" +
            "Recherchez une loi avec un mot-clé " +
            "ou parcourez les catégories.",

        exit:
            "END Merci d'utiliser " +
            "Rwanda Laws Platform 🇷🇼",

        noResults:
            "END Aucune loi trouvée.",

        choose:
            "CON CHOISISSEZ UNE LOI",

        info:
            "Informations",

        pdf:
            "PDF",

        sms:
            "Envoyer par SMS",

        back:
            "Retour",

        noPdf:
            "END Le PDF de cette loi est introuvable.",

        smsReceived:
            "END Demande d'envoi SMS reçue."

    }

};

// ======================================================
// SESSION LANGUAGE MEMORY
// ======================================================

const sessions = new Map();

// ======================================================
// USSD
// ======================================================

app.post(
    "/api/ussd",
    (req, res) => {

        try {

            const sessionId =
                req.body.sessionId || "";

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
            // NEW SESSION
            // ==================================================

            if (!sessions.has(sessionId)) {

                sessions.set(
                    sessionId,
                    {
                        language: null
                    }
                );

            }

            const session =
                sessions.get(sessionId);

            // ==================================================
            // LANGUAGE SELECTION
            // ==================================================

            if (
                session.language === null
            ) {

                if (text === "") {

                    return res
                        .type("text/plain")
                        .send(
                            languageText.rw.welcome
                        );

                }

                if (text === "1") {

                    session.language =
                        "rw";

                } else if (
                    text === "2"
                ) {

                    session.language =
                        "en";

                } else if (
                    text === "3"
                ) {

                    session.language =
                        "fr";

                } else {

                    return res
                        .type("text/plain")
                        .send(
                            languageText.rw.welcome
                        );

                }

                return res
                    .type("text/plain")
                    .send(
                        languageText[
                            session.language
                        ].menu
                    );

            }

            const lang =
                languageText[
                    session.language
                ];

            // ==================================================
            // MAIN MENU
            // ==================================================

            if (text === "") {

                return res
                    .type("text/plain")
                    .send(
                        lang.menu
                    );

            }

            // ==================================================
            // SEARCH
            // ==================================================

            if (text === "1") {

                return res
                    .type("text/plain")
                    .send(
                        lang.search
                    );

            }

            // ==================================================
            // CATEGORIES
            // ==================================================

            if (text === "2") {

                const categories =
                    getCategories();

                if (
                    categories.length === 0
                ) {

                    return res
                        .type("text/plain")
                        .send(
                            lang.noResults
                        );

                }

                const page =
                    categories.slice(
                        0,
                        7
                    );

                let message =
                    lang.categories +
                    "\n";

                page.forEach(
                    (category, index) => {

                        message +=
                            `${index + 1}. ${category.display.substring(0, 35)}\n`;

                    }
                );

                message +=
                    `0. ${lang.back}`;

                return res
                    .type("text/plain")
                    .send(message);

            }

            // ==================================================
            // RECENT LAWS
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
                            lang.noResults
                        );

                }

                const recent =
                    laws.slice(
                        0,
                        5
                    );

                let message =
                    lang.recent +
                    "\n";

                recent.forEach(
                    (law, index) => {

                        message +=
                            `${index + 1}. ${getTitle(law).substring(0, 45)}\n`;

                    }
                );

                message +=
                    `0. ${lang.back}`;

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
                        lang.help
                    );

            }

            // ==================================================
            // EXIT
            // ==================================================

            if (text === "0") {

                sessions.delete(
                    sessionId
                );

                return res
                    .type("text/plain")
                    .send(
                        lang.exit
                    );

            }

            // ==================================================
            // SEARCH QUERY
            //
            // 1*keyword
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
                            lang.noResults
                        );

                }

                const page =
                    results.slice(
                        0,
                        5
                    );

                let message =
                    lang.choose +
                    "\n";

                page.forEach(
                    (law, index) => {

                        message +=
                            `${index + 1}. ${getTitle(law).substring(0, 45)}\n`;

                    }
                );

                message +=
                    `0. ${lang.back}`;

                return res
                    .type("text/plain")
                    .send(message);

            }

            // ==================================================
            // SEARCH RESULT SELECTION
            //
            // 1*keyword*number
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
                            lang.noResults
                        );

                }

                const law =
                    results[
                        selected - 1
                    ];

                return showLawMenu(
                    law,
                    session.language,
                    res
                );

            }

            // ==================================================
            // CATEGORY SELECTION
            //
            // 2*number
            // ==================================================

            if (
                text.startsWith("2*") &&
                text.split("*").length === 2
            ) {

                const selected =
                    parseInt(
                        text.split("*")[1],
                        10
                    );

                const categories =
                    getCategories();

                if (
                    !selected ||
                    selected < 1 ||
                    selected > categories.length
                ) {

                    return res
                        .type("text/plain")
                        .send(
                            lang.noResults
                        );

                }

                const category =
                    categories[
                        selected - 1
                    ];

                const results =
                    lawsByCategory(
                        category.raw
                    );

                if (
                    results.length === 0
                ) {

                    return res
                        .type("text/plain")
                        .send(
                            lang.noResults
                        );

                }

                let message =
                    "CON " +
                    category.display +
                    "\n";

                results
                    .slice(0, 5)
                    .forEach(
                        (law, index) => {

                            message +=
                                `${index + 1}. ${getTitle(law).substring(0, 45)}\n`;

                        }
                    );

                message +=
                    `0. ${lang.back}`;

                return res
                    .type("text/plain")
                    .send(message);

            }

            // ==================================================
            // CATEGORY LAW SELECTION
            //
            // 2*category*law
            // ==================================================

            if (
                text.startsWith("2*") &&
                text.split("*").length === 3
            ) {

                const parts =
                    text.split("*");

                const categoryNumber =
                    parseInt(
                        parts[1],
                        10
                    );

                const lawNumber =
                    parseInt(
                        parts[2],
                        10
                    );

                const categories =
                    getCategories();

                if (
                    !categoryNumber ||
                    categoryNumber < 1 ||
                    categoryNumber > categories.length
                ) {

                    return res
                        .type("text/plain")
                        .send(
                            lang.noResults
                        );

                }

                const category =
                    categories[
                        categoryNumber - 1
                    ];

                const results =
                    lawsByCategory(
                        category.raw
                    );

                if (
                    !lawNumber ||
                    lawNumber < 1 ||
                    lawNumber > results.length
                ) {

                    return res
                        .type("text/plain")
                        .send(
                            lang.noResults
                        );

                }

                const law =
                    results[
                        lawNumber - 1
                    ];

                return showLawMenu(
                    law,
                    session.language,
                    res
                );

            }

            // ==================================================
            // LAW ACTION
            //
            // LAW*ID*ACTION
            // ==================================================

            if (
                text.startsWith("LAW*")
            ) {

                const parts =
                    text.split("*");

                const lawId =
                    parts[1];

                const action =
                    parts[2];

                const laws =
                    loadLaws();

                const law =
                    laws.find(
                        item =>
                            String(item.id) ===
                            String(lawId)
                    );

                if (!law) {

                    return res
                        .type("text/plain")
                        .send(
                            lang.noResults
                        );

                }

                // ------------------------------------------
                // INFORMATION
                // ------------------------------------------

                if (
                    action === "INFO"
                ) {

                    const title =
                        getTitle(law);

                    const category =
                        displayCategory(
                            getCategory(law)
                        );

                    const status =
                        cleanText(
                            law.status ||
                            "unknown"
                        );

                    const source =
                        getSource(law);

                    return res
                        .type("text/plain")
                        .send(
                            "CON " +
                            title.substring(0, 55) +
                            "\n" +
                            "Category: " +
                            category.substring(0, 25) +
                            "\n" +
                            "Status: " +
                            status.substring(0, 20) +
                            "\n" +
                            "Source: " +
                            source.substring(0, 25) +
                            "\n1. PDF\n" +
                            "2. SMS\n" +
                            "0. " +
                            lang.back
                        );

                }

                // ------------------------------------------
                // PDF
                // ------------------------------------------

                if (
                    action === "PDF"
                ) {

                    const pdf =
                        getPdf(law);

                    if (!pdf) {

                        return res
                            .type("text/plain")
                            .send(
                                lang.noPdf
                            );

                    }

                    return res
                        .type("text/plain")
                        .send(
                            "END PDF:\n" +
                            pdf
                        );

                }

                // ------------------------------------------
                // SMS
                // ------------------------------------------

                if (
                    action === "SMS"
                ) {

                    console.log(
                        "📩 SMS REQUEST"
                    );

                    console.log(
                        "Phone:",
                        phoneNumber
                    );

                    console.log(
                        "Law:",
                        getTitle(law)
                    );

                    return res
                        .type("text/plain")
                        .send(
                            lang.smsReceived
                        );

                }

            }

            return res
                .type("text/plain")
                .send(
                    lang.menu
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
// LAW MENU
// ======================================================

function showLawMenu(
    law,
    language,
    res
) {

    const title =
        getTitle(law);

    const category =
        displayCategory(
            getCategory(law)
        );

    let menu;

    if (language === "en") {

        menu =
            "CON " +
            title.substring(0, 65) +
            "\nCategory: " +
            category.substring(0, 25) +
            "\n1. Information\n" +
            "2. PDF\n" +
            "3. Send SMS\n" +
            "0. Back";

    } else if (
        language === "fr"
    ) {

        menu =
            "CON " +
            title.substring(0, 65) +
            "\nCatégorie: " +
            category.substring(0, 25) +
            "\n1. Informations\n" +
            "2. PDF\n" +
            "3. Envoyer SMS\n" +
            "0. Retour";

    } else {

        menu =
            "CON " +
            title.substring(0, 65) +
            "\nIcyiciro: " +
            category.substring(0, 25) +
            "\n1. Amakuru\n" +
            "2. PDF\n" +
            "3. Ohereza SMS\n" +
            "0. Subira";

    }

    return res
        .type("text/plain")
        .send(menu);

}

// ======================================================
// INCOMING SMS
// ======================================================

app.post(
    "/api/sms/incoming",
    (req, res) => {

        try {

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
// SMS DELIVERY CALLBACK
// ======================================================

app.post(
    "/api/sms/delivery",
    (req, res) => {

        console.log(
            "📩 SMS DELIVERY"
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

        console.log(
            `📂 Categories loaded: ${getCategories().length}`
        );

    }
);