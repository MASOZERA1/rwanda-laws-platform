// ======================================================
// 🇷🇼 RWANDA LAWS PLATFORM
// Main Frontend Application
// ======================================================

const API_URL = "/api/laws";

let allLaws = [];
let currentLanguage = "rw";

// ======================================================
// TRANSLATIONS
// ======================================================

const translations = {
  rw: {
    searchPlaceholder: "Shakisha itegeko, ingingo cyangwa ijambo...",
    searchButton: "Shakisha",
    loading: "Turimo gushaka amategeko...",
    noResults: "Nta tegeko ribonetse",
    noResultsText: "Gerageza irindi jambo cyangwa uhitemo ikindi cyiciro.",
    readLaw: "Soma itegeko",
    officialPDF: "Fungura PDF yemewe",
    officialSource: "Inkomoko yemewe",
    back: "Subira ku mategeko",
    general: "Rusange",
    inForce: "Ririho",
    category: "Icyiciro",
    source: "Inkomoko",
    officialTitle: "Umutwe w'itegeko"
  },

  en: {
    searchPlaceholder: "Search for a law, article or keyword...",
    searchButton: "Search",
    loading: "Loading laws...",
    noResults: "No law found",
    noResultsText: "Try another keyword or choose another category.",
    readLaw: "Read law",
    officialPDF: "Open official PDF",
    officialSource: "Official source",
    back: "Back to laws",
    general: "General",
    inForce: "In force",
    category: "Category",
    source: "Source",
    officialTitle: "Official title"
  },

  fr: {
    searchPlaceholder: "Rechercher une loi, un article ou un mot-clé...",
    searchButton: "Rechercher",
    loading: "Chargement des lois...",
    noResults: "Aucune loi trouvée",
    noResultsText: "Essayez un autre mot-clé ou une autre catégorie.",
    readLaw: "Lire la loi",
    officialPDF: "Ouvrir le PDF officiel",
    officialSource: "Source officielle",
    back: "Retour aux lois",
    general: "Général",
    inForce: "En vigueur",
    category: "Catégorie",
    source: "Source",
    officialTitle: "Titre officiel"
  }
};

// ======================================================
// CATEGORY SYSTEM
// ======================================================

const categoryMap = {
  "1._Fundamental": {
    rw: "Itegeko Nshinga n'Amategeko Shingiro",
    en: "Fundamental Laws",
    fr: "Lois fondamentales"
  },

  "2._Human_Rights": {
    rw: "Uburenganzira bwa Muntu",
    en: "Human Rights",
    fr: "Droits humains"
  },

  "3._Diplomatic": {
    rw: "Diplomasi n'Amasezerano Mpuzamahanga",
    en: "Diplomatic Affairs",
    fr: "Affaires diplomatiques"
  },

  "4._Criminal": {
    rw: "Amategeko Mpanabyaha",
    en: "Criminal Law",
    fr: "Droit pénal"
  },

  "5._Security": {
    rw: "Umutekano",
    en: "Security",
    fr: "Sécurité"
  },

  "6._Judicial": {
    rw: "Ubucamanza",
    en: "Judicial Affairs",
    fr: "Affaires judiciaires"
  },

  "7._Administrative": {
    rw: "Imiyoborere n'Ubutegetsi",
    en: "Administrative Law",
    fr: "Droit administratif"
  },

  "8._Taxation": {
    rw: "Imisoro n'Amakori",
    en: "Taxation",
    fr: "Fiscalité"
  },

  "9._Civil": {
    rw: "Amategeko Mbonezamubano",
    en: "Civil Law",
    fr: "Droit civil"
  },

  "10._Business": {
    rw: "Ubucuruzi n'Ubucuruzi bw'Ibigo",
    en: "Business Law",
    fr: "Droit des affaires"
  }
};

// ======================================================
// ELEMENTS
// ======================================================

const lawsGrid = document.getElementById("lawsGrid");
const noResults = document.getElementById("noResults");
const lawSearch = document.getElementById("lawSearch");
const searchBtn = document.getElementById("searchBtn");
const categoryFilter = document.getElementById("categoryFilter");
const lawCount = document.getElementById("lawCount");
const lawDetails = document.getElementById("law-details");

// ======================================================
// CATEGORY NAME
// ======================================================

function getCategoryName(category) {
  if (!category) {
    return translations[currentLanguage].general;
  }

  const cleanCategory = String(category).trim();

  if (categoryMap[cleanCategory]) {
    return categoryMap[cleanCategory][currentLanguage];
  }

  return cleanCategory
    .replace(/^\d+\._/, "")
    .replace(/_/g, " ");
}

// ======================================================
// CATEGORY KEY
// ======================================================

function getCategoryKey(law) {
  const raw = String(law.category || "").trim();

  if (categoryMap[raw]) {
    return raw;
  }

  // Backup: inspect file name/path
  const text = [
    law.title || "",
    law.fileName || "",
    law.pdfUrl || "",
    law.sourcePage || ""
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("criminal")) return "4._Criminal";
  if (text.includes("human_right")) return "2._Human_Rights";
  if (text.includes("security")) return "5._Security";
  if (text.includes("judicial")) return "6._Judicial";
  if (text.includes("administrative")) return "7._Administrative";
  if (text.includes("tax")) return "8._Taxation";
  if (text.includes("civil")) return "9._Civil";
  if (text.includes("business")) return "10._Business";
  if (text.includes("diplomatic")) return "3._Diplomatic";
  if (text.includes("fundamental")) return "1._Fundamental";

  return raw;
}

// ======================================================
// TITLE CLEANING
// ======================================================

function cleanTitle(title) {
  if (!title) {
    return translations[currentLanguage].officialTitle;
  }

  return String(title)
    .replace(/\.pdf$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ======================================================
// GET TITLE
// ======================================================

function getTitle(law) {
  if (currentLanguage === "rw" && law.titleRw) {
    return law.titleRw;
  }

  if (currentLanguage === "fr" && law.titleFr) {
    return law.titleFr;
  }

  if (law.title) {
    return cleanTitle(law.title);
  }

  if (law.fileName) {
    return cleanTitle(law.fileName);
  }

  return translations[currentLanguage].officialTitle;
}

// ======================================================
// GET PDF
// ======================================================

function getPdf(law) {
  return (
    law.pdfUrl ||
    law.pdf ||
    law.url ||
    ""
  );
}

// ======================================================
// SIMPLE EXPLANATION
// ======================================================

function getSimpleExplanation(law) {

  if (currentLanguage === "rw") {
    return (
      law.descriptionRw ||
      "Iri ni tegeko riri mu bubiko bw'amategeko y'u Rwanda. Fungura PDF yemewe kugira ngo usome ibikubiyemo byose."
    );
  }

  if (currentLanguage === "fr") {
    return (
      law.descriptionFr ||
      "Cette loi fait partie de la collection des lois du Rwanda. Ouvrez le PDF officiel pour consulter son contenu."
    );
  }

  return (
    law.descriptionEn ||
    "This law is part of the Rwanda legal collection. Open the official PDF to read its full content."
  );
}

// ======================================================
// LOAD LAWS
// ======================================================

async function loadLaws() {

  try {

    showLoading();

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.laws)) {
      throw new Error("API returned an invalid response.");
    }

    allLaws = data.laws;

    console.log("🇷🇼 Rwanda Laws Platform");
    console.log(`Total laws loaded: ${allLaws.length}`);

    if (lawCount) {
      lawCount.textContent = allLaws.length;
    }

    populateCategoryFilter();

    renderLaws(getFilteredLaws());

  } catch (error) {

    console.error("Law loading error:", error);

    if (lawsGrid) {
      lawsGrid.innerHTML = `
        <div class="loading-card">
          <p>⚠️ ${escapeHTML(error.message)}</p>
          <p>Reba niba server iri gukora.</p>
        </div>
      `;
    }

  }
}

// ======================================================
// LOADING
// ======================================================

function showLoading() {

  if (!lawsGrid) return;

  lawsGrid.innerHTML = `
    <div class="loading-card">
      <div class="loading-spinner"></div>
      <p>${translations[currentLanguage].loading}</p>
    </div>
  `;

  noResults?.classList.add("hidden");
}

// ======================================================
// CATEGORY FILTER
// ======================================================

function populateCategoryFilter() {

  if (!categoryFilter) return;

  const categories = [
    "1._Fundamental",
    "2._Human_Rights",
    "3._Diplomatic",
    "4._Criminal",
    "5._Security",
    "6._Judicial",
    "7._Administrative",
    "8._Taxation",
    "9._Civil",
    "10._Business"
  ];

  categoryFilter.innerHTML = "";

  const allOption = document.createElement("option");

  allOption.value = "all";
  allOption.textContent =
    currentLanguage === "rw"
      ? "Ibyiciro byose"
      : currentLanguage === "fr"
      ? "Toutes les catégories"
      : "All categories";

  categoryFilter.appendChild(allOption);

  categories.forEach(category => {

    const option = document.createElement("option");

    option.value = category;
    option.textContent = getCategoryName(category);

    categoryFilter.appendChild(option);
  });
}

// ======================================================
// FILTER LAWS
// ======================================================

function getFilteredLaws() {

  const searchTerm =
    lawSearch?.value.trim().toLowerCase() || "";

  const selectedCategory =
    categoryFilter?.value || "all";

  return allLaws.filter(law => {

    const categoryKey = getCategoryKey(law);

    const searchableText = [
      law.title || "",
      law.fileName || "",
      law.number || "",
      law.lawNumber || "",
      law.description || "",
      law.category || ""
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !searchTerm ||
      searchableText.includes(searchTerm);

    const matchesCategory =
      selectedCategory === "all" ||
      categoryKey === selectedCategory;

    return matchesSearch && matchesCategory;
  });
}

// ======================================================
// RENDER LAWS
// ======================================================

function renderLaws(laws) {

  if (!lawsGrid) return;

  lawsGrid.innerHTML = "";

  if (!laws.length) {

    noResults?.classList.remove("hidden");

    return;
  }

  noResults?.classList.add("hidden");

  const fragment = document.createDocumentFragment();

  laws.forEach((law, index) => {

    const card = document.createElement("article");

    card.className = "law-card";

    const title = getTitle(law);
    const category = getCategoryName(getCategoryKey(law));

    const number =
      law.number ||
      law.lawNumber ||
      "";

    const pdf = getPdf(law);

    card.innerHTML = `

      <div class="law-card-top">

        <span class="law-category">
          ${escapeHTML(category)}
        </span>

        ${
          number
            ? `
              <span class="law-number">
                ${escapeHTML(number)}
              </span>
            `
            : ""
        }

      </div>

      <h3>
        ${escapeHTML(title)}
      </h3>

      <p class="law-description">
        ${escapeHTML(getSimpleExplanation(law))}
      </p>

      <div class="law-card-footer">

        <span class="official-source">
          🇷🇼 ${escapeHTML(
            law.officialSource ||
            law.source ||
            "RLRC"
          )}
        </span>

        <button
          type="button"
          class="read-law-btn"
        >
          ${translations[currentLanguage].readLaw} →
        </button>

      </div>
    `;

    const button =
      card.querySelector(".read-law-btn");

    button?.addEventListener("click", () => {
      showLawDetails(law);
    });

    fragment.appendChild(card);
  });

  lawsGrid.appendChild(fragment);
}

// ======================================================
// LAW DETAILS
// ======================================================

function showLawDetails(law) {

  if (!lawDetails) return;

  const title = getTitle(law);
  const category = getCategoryName(getCategoryKey(law));
  const pdf = getPdf(law);

  lawDetails.innerHTML = `

    <div class="law-details-card">

      <button
        type="button"
        class="back-laws-btn"
        id="backToLaws"
      >
        ← ${translations[currentLanguage].back}
      </button>

      <span class="law-category">
        ${escapeHTML(category)}
      </span>

      <h2>
        ${escapeHTML(title)}
      </h2>

      <p>
        ${escapeHTML(getSimpleExplanation(law))}
      </p>

      <div class="law-details-info">

        <div>
          <strong>
            ${translations[currentLanguage].category}
          </strong>

          <span>
            ${escapeHTML(category)}
          </span>
        </div>

        <div>
          <strong>
            ${translations[currentLanguage].source}
          </strong>

          <span>
            🇷🇼 ${
              escapeHTML(
                law.officialSource ||
                law.source ||
                "RLRC"
              )
            }
          </span>
        </div>

        <div>
          <strong>
            ${translations[currentLanguage].inForce}
          </strong>

          <span>
            ${escapeHTML(
              law.status || "in_force"
            )}
          </span>
        </div>

      </div>

      ${
        pdf
          ? `
            <a
              href="${escapeAttribute(pdf)}"
              target="_blank"
              rel="noopener noreferrer"
              class="official-pdf-button"
            >
              📄 ${translations[currentLanguage].officialPDF}
              →
            </a>
          `
          : `
            <p>
              PDF ntiboneka kuri iyi record.
            </p>
          `
      }

    </div>
  `;

  const backButton =
    document.getElementById("backToLaws");

  backButton?.addEventListener("click", () => {

    lawDetails.innerHTML = "";

    renderLaws(getFilteredLaws());

    document
      .getElementById("laws")
      ?.scrollIntoView({
        behavior: "smooth"
      });

  });

  lawDetails.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// ======================================================
// SEARCH
// ======================================================

function performSearch() {

  renderLaws(getFilteredLaws());

  document
    .getElementById("laws")
    ?.scrollIntoView({
      behavior: "smooth"
    });
}

searchBtn?.addEventListener(
  "click",
  performSearch
);

lawSearch?.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {
      performSearch();
    }

  }
);

lawSearch?.addEventListener(
  "input",
  () => {
    renderLaws(getFilteredLaws());
  }
);

// ======================================================
// CATEGORY FILTER EVENT
// ======================================================

categoryFilter?.addEventListener(
  "change",
  () => {

    renderLaws(
      getFilteredLaws()
    );

  }
);

// ======================================================
// CATEGORY CARDS
// ======================================================

document
  .querySelectorAll(".category-card")
  .forEach(card => {

    card.addEventListener("click", () => {

      const category =
        card.dataset.category;

      if (!categoryFilter) return;

      const categoryConversion = {
        Constitution: "1._Fundamental",
        Criminal: "4._Criminal",
        Civil: "9._Civil",
        Business: "10._Business",
        Family: "9._Civil",
        Land: "9._Civil",
        Labour: "9._Civil",
        Environment: "7._Administrative"
      };

      categoryFilter.value =
        categoryConversion[category] || "all";

      renderLaws(
        getFilteredLaws()
      );

      document
        .getElementById("laws")
        ?.scrollIntoView({
          behavior: "smooth"
        });

    });

  });

// ======================================================
// POPULAR SEARCHES
// ======================================================

document
  .querySelectorAll(".popular-search")
  .forEach(button => {

    button.addEventListener("click", () => {

      const value =
        button.dataset.search || "";

      if (lawSearch) {
        lawSearch.value = value;
      }

      performSearch();

    });

  });

// ======================================================
// LANGUAGE
// ======================================================

function setLanguage(language) {

  if (!translations[language]) {
    language = "rw";
  }

  currentLanguage = language;

  updateLanguage();

  populateCategoryFilter();

  renderLaws(
    getFilteredLaws()
  );

}

// ======================================================
// UPDATE LANGUAGE
// ======================================================

function updateLanguage() {

  const translation =
    translations[currentLanguage];

  if (lawSearch) {
    lawSearch.placeholder =
      translation.searchPlaceholder;
  }

  document
    .querySelectorAll("[data-i18n]")
    .forEach(element => {

      const key =
        element.dataset.i18n;

      const parts =
        key.split(".");

      let value =
        translations[currentLanguage];

      for (const part of parts) {

        if (
          value &&
          Object.prototype.hasOwnProperty.call(
            value,
            part
          )
        ) {
          value = value[part];
        } else {
          value = null;
          break;
        }

      }

      if (typeof value === "string") {
        element.textContent = value;
      }

    });

  const languageBtn =
    document.getElementById("languageBtn");

  if (languageBtn) {

    const labels = {
      rw: "🇷🇼 RW ▾",
      en: "🇬🇧 EN ▾",
      fr: "🇫🇷 FR ▾"
    };

    languageBtn.textContent =
      labels[currentLanguage];
  }

}

// ======================================================
// LANGUAGE MENU
// ======================================================

const languageBtn =
  document.getElementById("languageBtn");

const languageMenu =
  document.getElementById("languageMenu");

languageBtn?.addEventListener(
  "click",
  () => {

    languageMenu?.classList.toggle("open");

  }
);

document
  .querySelectorAll("[data-language]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const language =
          button.dataset.language;

        setLanguage(language);

        languageMenu?.classList.remove(
          "open"
        );

      }
    );

  });

// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ======================================================
// ESCAPE ATTRIBUTE
// ======================================================

function escapeAttribute(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ======================================================
// START APPLICATION
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    updateLanguage();

    loadLaws();

  }
);