
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
app.use(express.urlencoded({ extended: true }));

// ======================================================
// STATIC WEBSITE
// ======================================================

app.use(express.static(path.join(__dirname, "../public")));

// ======================================================
// LAWS DATABASE
// ======================================================

const lawsFile = path.join(__dirname, "../data/laws.json");

function loadLaws() {
    try {
        if (!fs.existsSync(lawsFile)) {
            console.log("❌ laws.json not found:", lawsFile);
            return [];
        }

        const raw = fs.readFileSync(lawsFile, "utf8");
        const data = JSON.parse(raw);

        if (Array.isArray(data)) return data;
        if (Array.isArray(data.laws)) return data.laws;
        if (Array.isArray(data.data)) return data.data;

        return [];
    } catch (error) {
        console.error("❌ Error reading laws.json:", error.message);
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
    return cleanText(law.number || law.lawNumber || "");
}

function getLawCategory(law) {
    return cleanText(law.category || "");
}

function getLawSource(law) {
    return cleanText(
        law.officialSource ||
        law.source ||
        "RLRC"
    );
}

function getLawPdf(law) {
    return law.pdfUrl || law.pdf || law.url || "";
}

// ======================================================
// MULTILINGUAL SEARCH
// ======================================================

const SEARCH_SYNONYMS = {
    "umuryango": ["family", "persons family"],
    "imiryango": ["family", "persons family"],
    "family": ["umuryango", "persons family"],
    "famille": ["family", "persons family"],

    "ubutaka": ["land", "property", "real estate"],
    "isambu": ["land", "property"],
    "land": ["ubutaka", "isambu", "property"],
    "terre": ["land", "property"],

    "umurimo": ["labour", "labor", "employment", "work"],
    "abakozi": ["labour", "labor", "employment", "workers"],
    "akazi": ["labour", "labor", "employment", "work"],
    "labour": ["umurimo", "abakozi", "employment"],
    "labor": ["umurimo", "abakozi", "employment"],
    "travail": ["labour", "labor", "employment"],

    "ubucuruzi": ["business", "commercial", "trade"],
    "business": ["ubucuruzi", "commercial", "trade"],
    "commerce": ["business", "commercial", "trade"],

    "ibyaha": ["criminal", "offences", "offenses", "penalties"],
    "icyaha": ["criminal", "offence", "offense", "penalty"],
    "criminal": ["ibyaha", "offences", "offenses"],
    "penal": ["criminal", "offences", "offenses"],

    "uburenganzira": ["human rights", "rights"],
    "uburenganzira bwa muntu": ["human rights", "rights"],
    "human rights": ["uburenganzira bwa muntu", "rights"],
    "droits humains": ["human rights", "rights"],

    "imisoro": ["tax", "taxation", "revenue"],
    "umusoro": ["tax", "taxation", "revenue"],
    "tax": ["imisoro", "taxation", "revenue"],
    "taxation": ["imisoro", "tax", "revenue"],
    "impots": ["tax", "taxation", "revenue"],

    "amategeko nshinga": ["constitution", "fundamental"],
    "itegeko nshinga": ["constitution", "fundamental"],
    "constitution": ["amategeko nshinga", "fundamental"],

    "ibidukikije": ["environment", "environmental"],
    "environment": ["ibidukikije", "environmental"]
};

function getExpandedSearchTerms(query) {
    const normalized = normalizeText(query);

    if (!normalized) return [];

    const terms = new Set([normalized]);

    (SEARCH_SYNONYMS[normalized] || []).forEach(term => {
        terms.add(normalizeText(term));
    });

    normalized.split(/\s+/).forEach(word => {
        terms.add(word);

        (SEARCH_SYNONYMS[word] || []).forEach(term => {
            terms.add(normalizeText(term));
        });
    });

    return [...terms].filter(Boolean);
}

function searchLaws(query) {
    const laws = loadLaws();
    const search = normalizeText(query);

    if (!search) return [];

    const terms = getExpandedSearchTerms(query);

    return laws
        .map(law => {
            const searchableText = normalizeText([
                law.title,
                law.titleRw,
                law.titleFr,
                law.fileName,
                law.category,
                law.source,
                law.officialSource,
                law.number,
                law.lawNumber,
                law.description,
                law.descriptionRw,
                law.descriptionEn,
                law.descriptionFr
            ].filter(Boolean).join(" "));

            let score = searchableText.includes(search) ? 20 : 0;

            terms.forEach(term => {
                if (searchableText.includes(term)) {
                    score += term === search ? 10 : 3;
                }
            });

            return { law, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.law);
}

// ======================================================
// WEBSITE HOME
// ======================================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../public/index.html")
    );
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Rwanda Laws Platform API is running",
        platform: "Rwanda Laws Platform",
        version: "1.0.0"
    });
});

// ======================================================
// ALL LAWS
// ======================================================

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

// ======================================================
// ONE LAW
// ======================================================

app.get("/api/laws/:id", (req, res) => {
    const laws = loadLaws();

    const law = laws.find(
        item => String(item.id) === String(req.params.id)
    );

    if (!law) {
        return res.status(404).json({
            success: false,
            message: "Law not found"
        });
    }

    res.json({
        success: true,
        law
    });
});

// ======================================================
// USSD LANGUAGE SETTINGS
// ======================================================

const USSD_LANGUAGES = {
    "1": "en",
    "2": "rw",
    "3": "fr"
};

const USSD_TEXT = {
    en: {
        choose: "CON RWANDA LAWS PLATFORM\nChoose language:\n1. English\n2. Kinyarwanda\n3. Francais",
        menu: "CON RWANDA LAWS PLATFORM\n1. Search for a law\n2. Browse categories\n3. Recent laws\n4. Help\n0. Exit",
        search: "CON SEARCH FOR A LAW\nEnter a keyword.\nExample: labour, land, family",
        categories: "CON LAW CATEGORIES\n1. Fundamental\n2. Human Rights\n3. Criminal\n4. Security\n5. Judicial\n6. Administrative\n7. Taxation\n8. Civil / Family\n9. Business\n0. Back",
        noResults: "END No laws found for:",
        results: "CON SEARCH RESULTS:\n",
        details: "CON LAW DETAILS\n",
        actions: "\n1. More information\n2. PDF link\n3. SMS request\n0. Back",
        noSelection: "END Invalid selection. Please try again.",
        noPdf: "END The PDF link is not available for this record.",
        sms: "END Your SMS information request has been received for ",
        recent: "END RECENT LAWS:\n",
        help: "END Search using a keyword such as labour, land, business or family. Choose a result number to view its details.",
        exit: "END Thank you for using Rwanda Laws Platform.",
        info: "END LAW INFORMATION\n",
        category: "Category: ",
        status: "Status: ",
        source: "Source: ",
        pdf: "PDF link: ",
        unavailable: "END No laws are currently available."
    },

    rw: {
        choose: "CON RWANDA LAWS PLATFORM\nHitamo ururimi:\n1. English\n2. Kinyarwanda\n3. Francais",
        menu: "CON RWANDA LAWS PLATFORM\n1. Shaka itegeko\n2. Reba ibyiciro\n3. Amategeko aheruka\n4. Ubufasha\n0. Sohoka",
        search: "CON SHAKA ITEGEKO\nAndika ijambo ushaka.\nUrugero: umurimo, ubutaka, umuryango",
        categories: "CON IBYICIRO BY'AMATEGEKO\n1. Shingiro\n2. Uburenganzira bwa muntu\n3. Mpanabyaha\n4. Umutekano\n5. Ubucamanza\n6. Ubuyobozi\n7. Imisoro\n8. Mbonezamubano / Umuryango\n9. Ubucuruzi\n0. Subira",
        noResults: "END Nta tegeko ribonetse kuri:",
        results: "CON AMATEGEKO YABONETSE:\n",
        details: "CON AMAKURU Y'ITEGEKO\n",
        actions: "\n1. Andi makuru\n2. PDF\n3. Saba SMS\n0. Subira",
        noSelection: "END Ihitamo ntabwo ribonetse. Ongera ugerageze.",
        noPdf: "END PDF y'iri tegeko ntibonetse.",
        sms: "END Ubusabe bwo koherezwa amakuru kuri SMS bwakiriwe kuri ",
        recent: "END AMATEGEKO AHERUKA:\n",
        help: "END Shakisha ukoresheje ijambo nka umurimo, ubutaka, ubucuruzi cyangwa umuryango. Hitamo nimero y'itegeko ushaka kureba.",
        exit: "END Murakoze gukoresha Rwanda Laws Platform.",
        info: "END AMAKURU Y'ITEGEKO\n",
        category: "Icyiciro: ",
        status: "Imimerere: ",
        source: "Inkomoko: ",
        pdf: "PDF: ",
        unavailable: "END Nta mategeko ahari muri aka kanya."
    },

    fr: {
        choose: "CON RWANDA LAWS PLATFORM\nChoisissez la langue:\n1. English\n2. Kinyarwanda\n3. Francais",
        menu: "CON RWANDA LAWS PLATFORM\n1. Rechercher une loi\n2. Categories\n3. Lois recentes\n4. Aide\n0. Quitter",
        search: "CON RECHERCHER UNE LOI\nEntrez un mot-cle.\nExemple: travail, terre, famille",
        categories: "CON CATEGORIES\n1. Fondamentales\n2. Droits humains\n3. Penal\n4. Securite\n5. Judiciaire\n6. Administratif\n7. Fiscalite\n8. Civil / Famille\n9. Affaires\n0. Retour",
        noResults: "END Aucune loi trouvee pour:",
        results: "CON RESULTATS:\n",
        details: "CON DETAILS DE LA LOI\n",
        actions: "\n1. Plus d'informations\n2. Lien PDF\n3. Demande SMS\n0. Retour",
        noSelection: "END Choix invalide. Veuillez reessayer.",
        noPdf: "END Le PDF n'est pas disponible pour cette loi.",
        sms: "END Votre demande d'informations par SMS a ete recue pour ",
        recent: "END LOIS RECENTES:\n",
        help: "END Recherchez avec un mot-cle comme travail, terre, affaires ou famille. Choisissez le numero d'un resultat pour voir les details.",
        exit: "END Merci d'utiliser Rwanda Laws Platform.",
        info: "END INFORMATIONS SUR LA LOI\n",
        category: "Categorie: ",
        status: "Statut: ",
        source: "Source: ",
        pdf: "Lien PDF: ",
        unavailable: "END Aucune loi disponible actuellement."
    }
};

const USSD_CATEGORY_SEARCH = {
    "1": "constitution",
    "2": "human rights",
    "3": "criminal",
    "4": "security",
    "5": "judicial",
    "6": "administrative",
    "7": "taxation",
    "8": "civil",
    "9": "business"
};

function ussdReply(res, message) {
    return res.type("text/plain").send(message);
}

function getUssdLawTitle(law) {
    return getLawTitle(law)
        .replace(/[_]+/g, " ")
        .substring(0, 62);
}

// ======================================================
// USSD MAIN ROUTE
// ======================================================

app.post("/api/ussd", (req, res) => {
    try {
        const phoneNumber = req.body.phoneNumber || "";
        const text = String(req.body.text || "").trim();

        console.log("📱 USSD REQUEST", {
            sessionId: req.body.sessionId || "",
            serviceCode: req.body.serviceCode || "",
            phoneNumber,
            text
        });

        // First interaction: language selection
        if (!text) {
            return ussdReply(res, USSD_TEXT.en.choose);
        }

        const parts = text.split("*");
        const language = USSD_LANGUAGES[parts[0]];

        if (!language) {
            return ussdReply(res, USSD_TEXT.en.choose);
        }

        const t = USSD_TEXT[language];

        // Language selected: show main menu
        if (parts.length === 1) {
            return ussdReply(res, t.menu);
        }

        const option = parts[1];

        // Exit
        if (option === "0") {
            return ussdReply(res, t.exit);
        }

        // Help
        if (option === "4" && parts.length === 2) {
            return ussdReply(res, t.help);
        }

        // Search prompt
        if (option === "1" && parts.length === 2) {
            return ussdReply(res, t.search);
        }

        // Search results: language*1*keyword
        if (option === "1" && parts.length === 3) {
            const query = parts[2].trim();
            const results = searchLaws(query).slice(0, 5);

            if (!results.length) {
                return ussdReply(
                    res,
                    `${t.noResults}\n${query}`
                );
            }

            let message = t.results;

            results.forEach((law, index) => {
                message += `${index + 1}. ${getUssdLawTitle(law)}\n`;
            });

            message +=
                "0. " +
                (language === "rw"
                    ? "Subira"
                    : language === "fr"
                    ? "Retour"
                    : "Back");

            return ussdReply(res, message);
        }

        // Search result selected:
        // language*1*keyword*result-number
        if (option === "1" && parts.length === 4) {
            const query = parts[2].trim();
            const selected = Number.parseInt(parts[3], 10);
            const results = searchLaws(query).slice(0, 5);

            if (
                !Number.isInteger(selected) ||
                selected < 1 ||
                selected > results.length
            ) {
                return ussdReply(res, t.noSelection);
            }

            const law = results[selected - 1];
            const number = getLawNumber(law);
            const category = getLawCategory(law);

            return ussdReply(
                res,
                `${t.details}${getUssdLawTitle(law)}\n` +
                (number ? `No: ${number.substring(0, 28)}\n` : "") +
                (category
                    ? `${t.category}${category.substring(0, 28)}\n`
                    : "") +
                t.actions
            );
        }

        // Selected law action:
        // language*1*keyword*result-number*action
        if (option === "1" && parts.length === 5) {
            const query = parts[2].trim();
            const selected = Number.parseInt(parts[3], 10);
            const action = parts[4];

            const results = searchLaws(query).slice(0, 5);

            if (
                !Number.isInteger(selected) ||
                selected < 1 ||
                selected > results.length
            ) {
                return ussdReply(res, t.noSelection);
            }

            const law = results[selected - 1];

            // More information
            if (action === "1") {
                return ussdReply(
                    res,
                    `${t.info}${getUssdLawTitle(law)}\n` +
                    `${t.category}${getLawCategory(law) || "-"}\n` +
                    `${t.status}${cleanText(law.status || "unknown")}\n` +
                    `${t.source}${getLawSource(law)}`
                );
            }

            // PDF link
            if (action === "2") {
                const pdf = getLawPdf(law);

                return ussdReply(
                    res,
                    pdf
                        ? `END ${t.pdf}${pdf}`
                        : t.noPdf
                );
            }

            // SMS request confirmation
            if (action === "3") {
                // This confirms the request only.
                // It does not send an SMS yet.
                return ussdReply(
                    res,
                    `${t.sms}${phoneNumber}.`
                );
            }

            return ussdReply(res, t.noSelection);
        }

        // Categories menu
        if (option === "2" && parts.length === 2) {
            return ussdReply(res, t.categories);
        }

        // Category selected
        if (option === "2" && parts.length === 3) {
            const categoryQuery =
                USSD_CATEGORY_SEARCH[parts[2]];

            if (!categoryQuery) {
                return ussdReply(res, t.noSelection);
            }

            const results =
                searchLaws(categoryQuery).slice(0, 5);

            if (!results.length) {
                return ussdReply(res, t.noResults);
            }

            let message = t.results;

            results.forEach((law, index) => {
                message +=
                    `${index + 1}. ${getUssdLawTitle(law)}\n`;
            });

            return ussdReply(res, message);
        }

        // Recent laws
        if (option === "3" && parts.length === 2) {
            const laws = loadLaws();

            if (!laws.length) {
                return ussdReply(res, t.unavailable);
            }

            let message = t.recent;

            laws.slice(0, 5).forEach((law, index) => {
                message +=
                    `${index + 1}. ${getUssdLawTitle(law)}\n`;
            });

            return ussdReply(res, message);
        }

        return ussdReply(res, t.noSelection);

    } catch (error) {
        console.error("❌ USSD ERROR:", error);

        return ussdReply(
            res,
            "END A temporary error occurred. Please try again."
        );
    }
});

// ======================================================
// INCOMING SMS
// ======================================================

app.post("/api/sms/incoming", (req, res) => {
    try {
        console.log("====================================");
        console.log("📩 INCOMING SMS");
        console.log("From:", req.body.from);
        console.log("To:", req.body.to);
        console.log("Text:", req.body.text);
        console.log("LinkId:", req.body.linkId);
        console.log("====================================");

        return res.status(200).send("OK");

    } catch (error) {
        console.error("❌ SMS ERROR:", error);
        return res.status(500).send("ERROR");
    }
});

// ======================================================
// SMS DELIVERY CALLBACK
// ======================================================

app.post("/api/sms/delivery", (req, res) => {
    console.log("📩 SMS DELIVERY:");
    console.log(req.body);

    return res.status(200).send("OK");
});

// ======================================================
// API 404
// ======================================================

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {
    console.log("====================================");
    console.log("🇷🇼 RWANDA LAWS PLATFORM");
    console.log("====================================");

    console.log(`Server running on port ${PORT}`);
    console.log(`Laws file: ${lawsFile}`);
    console.log("USSD endpoint: /api/ussd");
    console.log("SMS incoming endpoint: /api/sms/incoming");
    console.log("SMS delivery endpoint: /api/sms/delivery");

    const laws = loadLaws();

    console.log(`📚 Laws loaded: ${laws.length}`);
});
