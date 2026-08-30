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
// HEALTH CHECK
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
// GET ALL LAWS
// ======================================================

app.get("/api/laws", (req, res) => {

    const laws = loadLaws();

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
// GET ONE LAW
// ======================================================

app.get("/api/laws/:id", (req, res) => {

    const laws = loadLaws();

    const law = laws.find(
        item =>
            String(item.id) ===
            String(req.params.id)
    );

    if (!law) {

        return res.status(404).json({

            success: false,

            message:
                "Law not found"

        });

    }

    res.json({

        success: true,

        law

    });

});

// ======================================================
// 🇷🇼 USSD - AFRICA'S TALKING
// ======================================================

app.post("/api/ussd", (req, res) => {

    try {

        const sessionId =
            req.body.sessionId || "";

        const serviceCode =
            req.body.serviceCode || "";

        const phoneNumber =
            req.body.phoneNumber || "";

        const text =
            req.body.text || "";

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

        const input =
            String(text).trim();

        // ==================================================
        // FIRST MENU
        // ==================================================

        if (input === "") {

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
        // SEARCH LAW
        // ==================================================

        if (input === "1") {

            return res
                .type("text/plain")
                .send(
                    "CON SHAKA ITEGEKO\n" +
                    "Andika nimero y'itegeko.\n" +
                    "Urugero: 023/2024"
                );

        }

        // ==================================================
        // CATEGORIES
        // ==================================================

        if (input === "2") {

            return res
                .type("text/plain")
                .send(
                    "CON IBYICIRO\n" +
                    "1. Itegeko Nshinga\n" +
                    "2. Uburenganzira bwa Muntu\n" +
                    "3. Mpanabyaha\n" +
                    "4. Mbonezamubano\n" +
                    "5. Ubucuruzi\n" +
                    "6. Imisoro\n" +
                    "0. Subira"
                );

        }

        // ==================================================
        // NEW LAWS
        // ==================================================

        if (input === "3") {

            const laws =
                loadLaws();

            if (laws.length === 0) {

                return res
                    .type("text/plain")
                    .send(
                        "END Nta mategeko ahari."
                    );

            }

            const recentLaws =
                laws
                    .slice(0, 3);

            let message =
                "END AMATEGEKO:\n";

            recentLaws.forEach(
                (law, index) => {

                    const title =
                        law.title ||
                        law.fileName ||
                        law.number ||
                        "Itegeko";

                    message +=
                        `${index + 1}. ${title.substring(0, 60)}\n`;

                }
            );

            return res
                .type("text/plain")
                .send(message);

        }

        // ==================================================
        // HELP
        // ==================================================

        if (input === "4") {

            return res
                .type("text/plain")
                .send(
                    "END Rwanda Laws Platform 🇷🇼\n" +
                    "Shakisha amategeko ukoresheje USSD. " +
                    "Kuri website ushobora no gufungura PDF yemewe."
                );

        }

        // ==================================================
        // EXIT
        // ==================================================

        if (input === "0") {

            return res
                .type("text/plain")
                .send(
                    "END Murakoze gukoresha Rwanda Laws Platform 🇷🇼"
                );

        }

        // ==================================================
        // LAW NUMBER SEARCH
        // Example:
        // 1*023/2024
        // ==================================================

        if (input.startsWith("1*")) {

            const lawNumber =
                input
                    .substring(2)
                    .trim()
                    .toLowerCase();

            const laws =
                loadLaws();

            const law =
                laws.find(item => {

                    const number =
                        String(
                            item.number ||
                            item.lawNumber ||
                            ""
                        )
                        .toLowerCase();

                    const title =
                        String(
                            item.title ||
                            item.fileName ||
                            ""
                        )
                        .toLowerCase();

                    return (
                        number.includes(
                            lawNumber
                        ) ||
                        title.includes(
                            lawNumber
                        )
                    );

                });

            if (!law) {

                return res
                    .type("text/plain")
                    .send(
                        "END Nta tegeko ribonetse kuri " +
                        lawNumber
                    );

            }

            const title =
                law.title ||
                law.fileName ||
                "Itegeko";

            return res
                .type("text/plain")
                .send(
                    "CON " +
                    title.substring(0, 100) +
                    "\n" +
                    "1. Incamake\n" +
                    "2. PDF\n" +
                    "3. Ohereza SMS\n" +
                    "0. Subira"
                );

        }

        // ==================================================
        // LAW RESULT ACTIONS
        // ==================================================

        if (
            input.startsWith("1*") &&
            (
                input.endsWith("*1") ||
                input.endsWith("*2") ||
                input.endsWith("*3")
            )
        ) {

            return res
                .type("text/plain")
                .send(
                    "END Iki gice kirimo gutegurwa."
                );

        }

        // ==================================================
        // UNKNOWN OPTION
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
                "END Habaye ikibazo kuri Rwanda Laws Platform. Ongera ugerageze."
            );

    }

});

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
                "Text:",
                req.body.text
            );

            console.log(
                "To:",
                req.body.to
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
            "===================================="
        );

        console.log(
            "📩 SMS DELIVERY CALLBACK"
        );

        console.log(
            req.body
        );

        console.log(
            "===================================="
        );

        return res
            .status(200)
            .send("OK");

    }
);

// ======================================================
// 404 API HANDLER
// ======================================================

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "API endpoint not found"

        });

    }
);

// ======================================================
// SERVER START
// ======================================================

app.listen(PORT, () => {

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

});