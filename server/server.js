const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Bwira Express aho static files ziri (Dosiye ya public)
app.use(express.static(path.join(__dirname, "../public")));

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

// KOSORA "NOT FOUND": Iyi "route" niyo ifungura index.html iyo umuntu aje ku rubuga
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Rwanda Laws Platform API is running",
        platform: "Rwanda Laws Platform",
        version: "1.0.0"
    });
});

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
    res.json({ success: true, law });
});

app.listen(PORT, () => {
    console.log("====================================");
    console.log("🇷🇼 RWANDA LAWS PLATFORM");
    console.log("====================================");
    console.log(`Server running on port ${PORT}`);
    console.log(`Laws file: ${lawsFile}`);

    const laws = loadLaws();
    console.log(`📚 Laws loaded: ${laws.length}`);
});
