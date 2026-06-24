(function () {
  "use strict";

  /**
   * Maps shop folder → combo index (0-based).
   * Update when gallery ↔ combination assignments are finalized.
   */
  var SHOP_FOLDER_TO_COMBO = {
    "name 01": 3,
    "name 02": 2,
    "name 03": 4,
    "name 04": 3,
    "name 05": 4,
    "name 06": 5,
    "name 07": 6,
    "name 08": 7,
    "name 09": 0,
    "name 10": 1,
    "name 11": 2,
    "name 12": 3,
  };

  var DISPLAY_SECTIONS = [
    {
      id: "profile",
      title: "Profile",
      keys: [
        "livingInIran",
        "livingDuration",
        "leavingYear",
        "from",
        "nowIn",
        "name",
        "nameDisplayMode",
        "age",
        "homeAt",
        "labelBarTagIndex",
      ],
    },
    {
      id: "family",
      title: "Family",
      keys: ["borderFrameDivisions", "borderSideWhiteFill"],
    },
    {
      id: "bodyAutonomy",
      title: "Body autonomy",
      keys: ["fanLeaves"],
    },
  ];

  var LABELS = {
    livingInIran: "Did you ever live in Iran?",
    livingDuration: "How much of your life did you live in Iran?",
    leavingYear: "Year of leaving",
    from: "From",
    nowIn: "Now in",
    name: "Name",
    nameDisplayMode: "How name appears on the label",
    age: "Age",
    homeAt: 'Where do you feel most "at home" today?',
    labelBarTagIndex: "Side sign (0–5)",
    borderFrameDivisions: "Frame divisions",
    borderSideWhiteFill: "Margin empty cells",
    fanLeaves:
      "When you lived in Iran, how free did you feel to choose how to dress in public spaces?",
  };

  var ENUM_LABELS = {
    livingInIran: { yes: "Yes", no: "No" },
    livingDuration: {
      smallPart: "Small part of my life",
      partOfLife: "Yes, part of my life",
      mostAll: "Yes, most / all of my life",
    },
    nameDisplayMode: {
      anonymous: "Anonymous",
      initials: "Initials",
      name: "Name",
    },
    homeAt: {
      inIran: "In Iran",
      whereILive: "Outside Iran / where I live now",
      nowhere: "Nowhere / in between",
      "in betweeen": "Nowhere / in between",
    },
  };

  var SLIDER_MAX = {
    borderFrameDivisions: 3,
    fanLeaves: 10,
  };

  var specEl = document.getElementById("product-spec");

  function isEmptyValue(raw) {
    if (raw === undefined || raw === null) return true;
    var s = String(raw).trim();
    return s === "" || s === "-";
  }

  function formatValue(key, raw) {
    if (isEmptyValue(raw)) return "—";

    var str = String(raw).trim();

    if (key === "livingInIran") {
      var yn = ENUM_LABELS.livingInIran[str.toLowerCase()];
      return yn || str;
    }

    if (ENUM_LABELS[key] && ENUM_LABELS[key][str]) {
      return ENUM_LABELS[key][str];
    }

    if (key === "borderSideWhiteFill") {
      var pct = parseInt(str, 10);
      return isFinite(pct) ? String(pct) + "%" : str;
    }

    if (key === "borderFrameDivisions" || key === "fanLeaves") {
      var num = parseInt(str, 10);
      var max = SLIDER_MAX[key];
      if (isFinite(num) && max) return String(num) + " / " + String(max);
      return str;
    }

    if (key === "labelBarTagIndex") {
      var tag = parseInt(str, 10);
      return isFinite(tag) ? String(tag) : str;
    }

    return str;
  }

  function getComboRow(folderName) {
    if (!folderName || SHOP_FOLDER_TO_COMBO[folderName] === undefined) return null;
    var index = SHOP_FOLDER_TO_COMBO[folderName];
    if (
      !window.HandkerchiefCombinations ||
      typeof window.HandkerchiefCombinations.getCombinations !== "function"
    ) {
      return null;
    }
    var combos = window.HandkerchiefCombinations.getCombinations();
    if (!combos || !combos[index]) return null;
    return combos[index];
  }

  function renderProductSpec(folderName) {
    if (!specEl) return;

    var row = getComboRow(folderName);
    if (
      !row &&
      window.HandkerchiefCombinations &&
      typeof window.HandkerchiefCombinations.loadCombinationsFromCsv === "function" &&
      typeof window.HandkerchiefCombinations.getCombinations === "function" &&
      !window.HandkerchiefCombinations.getCombinations().length
    ) {
      window.HandkerchiefCombinations.loadCombinationsFromCsv().then(function () {
        renderProductSpec(folderName);
      });
      return;
    }

    specEl.textContent = "";
    specEl.hidden = false;

    row = getComboRow(folderName);
    if (!row) {
      var unavailable = document.createElement("p");
      unavailable.className = "product-spec__unavailable";
      unavailable.textContent = "Profile unavailable.";
      specEl.appendChild(unavailable);
      return;
    }

    var sectionIdx;
    for (sectionIdx = 0; sectionIdx < DISPLAY_SECTIONS.length; sectionIdx++) {
      var section = DISPLAY_SECTIONS[sectionIdx];
      var sectionEl = document.createElement("section");
      sectionEl.className = "product-spec__section";

      var heading = document.createElement("h3");
      heading.className = "product-spec__heading";
      heading.textContent = section.title;
      sectionEl.appendChild(heading);

      var dl = document.createElement("dl");
      dl.className = "product-spec__list";

      var keyIdx;
      for (keyIdx = 0; keyIdx < section.keys.length; keyIdx++) {
        var key = section.keys[keyIdx];
        var dt = document.createElement("dt");
        dt.className = "product-spec__label";
        dt.textContent = LABELS[key] || key;

        var dd = document.createElement("dd");
        dd.className = "product-spec__value";
        dd.textContent = formatValue(key, row[key]);

        dl.appendChild(dt);
        dl.appendChild(dd);
      }

      sectionEl.appendChild(dl);
      specEl.appendChild(sectionEl);
    }
  }

  function clearProductSpec() {
    if (!specEl) return;
    specEl.textContent = "";
    specEl.hidden = true;
  }

  window.ProductComboSpec = {
    render: renderProductSpec,
    clear: clearProductSpec,
    SHOP_FOLDER_TO_COMBO: SHOP_FOLDER_TO_COMBO,
  };
})();
