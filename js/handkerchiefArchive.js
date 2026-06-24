(function () {
  "use strict";

  var STORAGE_KEY = "undercover.handkerchiefArchive";

  /** Columns per row from archive grid CSS (span 2 => 6). */
  function getArchiveColumnsPerRow() {
    var grid = document.querySelector(".archive-grid");
    if (!grid) {
      return 6;
    }
    var card = grid.querySelector(".archive-card");
    if (!card) {
      return 6;
    }
    var gridColumn = window.getComputedStyle(card).gridColumn || "";
    var spanMatch = gridColumn.match(/span\s+(\d+)/);
    var spanCols = spanMatch ? parseInt(spanMatch[1], 10) : 2;
    return Math.max(1, Math.floor(12 / spanCols));
  }

  /** Match archive card CSS width × device pixel ratio for sharp thumbnails. */
  function getArchiveThumbWidth() {
    var dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2.5);
    var viewportW = window.innerWidth || 1728;
    var archiveSection = document.querySelector(
      "#section-archive .archive-section, .archive-section"
    );
    var marginInline = archiveSection
      ? parseFloat(window.getComputedStyle(archiveSection).paddingLeft) * 2
      : 40;
    var grid = document.querySelector(".archive-grid");
    var gridGap = grid
      ? parseFloat(window.getComputedStyle(grid).gap) ||
        parseFloat(window.getComputedStyle(grid).columnGap) ||
        16
      : 16;
    var cols = getArchiveColumnsPerRow();
    var contentW = Math.max(viewportW - marginInline, 320);
    var cardCssW = (contentW - gridGap * (cols - 1)) / cols;
    return Math.round(Math.max(cardCssW * dpr, 560));
  }

  function readEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeEntries(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (e) {
      console.warn("[HandkerchiefArchive] Could not save:", e);
      return false;
    }
  }

  function getEntryTitle() {
    if (window.Questionnaire && window.Questionnaire.getNameLabelText) {
      var label = String(window.Questionnaire.getNameLabelText() || "").trim();
      if (label) return label;
    }
    return "Untitled";
  }

  function ensureDesignReadyForCapture() {
    return new Promise(function (resolve) {
      var page2 = document.getElementById("page2");
      if (page2) page2.classList.add("page2--design-active");
      var svg = document.getElementById("design-svg");
      if (svg) svg.style.display = "block";
      if (typeof window.render === "function") window.render();
      if (typeof window.layoutStage === "function") window.layoutStage();
      requestAnimationFrame(function () {
        requestAnimationFrame(resolve);
      });
    });
  }

  function measurePngDataUrl(dataUrl) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ uniqueColors: 0, width: img.width, height: img.height });
          return;
        }
        ctx.drawImage(img, 0, 0);
        var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        var colors = {};
        var px;
        for (px = 0; px < data.length; px += 16) {
          colors[data[px] + "," + data[px + 1] + "," + data[px + 2]] = true;
        }
        resolve({
          uniqueColors: Object.keys(colors).length,
          width: img.width,
          height: img.height,
        });
      };
      img.onerror = function () {
        resolve({ uniqueColors: 0, width: 0, height: 0 });
      };
      img.src = dataUrl;
    });
  }

  function captureDesignPng() {
    return ensureDesignReadyForCapture().then(function () {
      if (typeof window.captureArchiveDesignPng !== "function") {
        return Promise.reject(new Error("Export capture unavailable"));
      }

      return window
        .captureArchiveDesignPng(getArchiveThumbWidth())
        .then(function (dataUrl) {
          return measurePngDataUrl(dataUrl).then(function (stats) {
            if (stats.uniqueColors <= 2) {
              throw new Error("Captured image appears blank");
            }
            return dataUrl;
          });
        });
    });
  }

  function formatSavedDate(isoString) {
    var date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function renderArchiveGrid(entriesOverride) {
    var grid = document.getElementById("handkerchief-archive-grid");
    var emptyEl = document.getElementById("archive-empty");
    if (!grid) return;

    var entries = (entriesOverride || readEntries()).filter(function (entry) {
      return entry && entry.imagePng;
    });
    grid.innerHTML = "";

    if (emptyEl) {
      emptyEl.hidden = entries.length > 0;
    }

    var i;
    for (i = entries.length - 1; i >= 0; i--) {
      (function (entry) {
        var card = document.createElement("article");
        card.className = "archive-card";
        card.setAttribute("role", "listitem");
        card.setAttribute("data-archive-id", entry.id);

        var thumb = document.createElement("div");
        thumb.className = "archive-card__thumbnail";
        var figure = document.createElement("div");
        figure.className = "archive-card__figure";
        var img = document.createElement("img");
        img.className = "archive-card__image";
        img.src = entry.imagePng;
        img.alt = entry.title || "Saved handkerchief";
        img.decoding = "async";
        figure.appendChild(img);

        var deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "archive-card__delete";
        deleteBtn.setAttribute("aria-label", "Delete handkerchief");
        deleteBtn.textContent = "\u00D7";
        deleteBtn.addEventListener("click", function (event) {
          event.stopPropagation();
          deleteEntry(entry.id);
        });
        figure.appendChild(deleteBtn);
        thumb.appendChild(figure);

        var title = document.createElement("h3");
        title.className = "archive-card__title";
        title.textContent = entry.title || "Untitled";

        var date = document.createElement("p");
        date.className = "archive-card__date";
        date.textContent = formatSavedDate(entry.savedAt);

        card.appendChild(thumb);
        card.appendChild(title);
        card.appendChild(date);
        grid.appendChild(card);
      })(entries[i]);
    }

    if (
      window.Page2Navigation &&
      typeof window.Page2Navigation.updateScrollability === "function"
    ) {
      window.requestAnimationFrame(function () {
        window.Page2Navigation.updateScrollability();
      });
    }
  }

  function saveCurrentDesign() {
    return captureDesignPng().then(function (imagePng) {
      var entry = {
        id: Date.now() + "-" + Math.random().toString(36).slice(2, 9),
        savedAt: new Date().toISOString(),
        title: getEntryTitle(),
        imagePng: imagePng,
      };
      var entries = readEntries();
      entries.push(entry);
      var saved = writeEntries(entries);
      renderArchiveGrid(saved ? null : entries);
      return entry;
    });
  }

  function deleteEntry(id) {
    var entries = readEntries().filter(function (entry) {
      return entry.id !== id;
    });
    writeEntries(entries);
    renderArchiveGrid();
  }

  function revealDesignArchive() {
    renderArchiveGrid();
    if (
      window.Page2Navigation &&
      typeof window.Page2Navigation.showSection === "function"
    ) {
      window.Page2Navigation.showSection(5);
      return;
    }
    var archiveSection = document.getElementById("section-archive");
    if (archiveSection) {
      archiveSection.classList.add("is-active");
      document.querySelectorAll(".page2-section").forEach(function (section) {
        if (section !== archiveSection) {
          section.classList.remove("is-active");
        }
      });
    }
  }

  function init() {
    renderArchiveGrid();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.HandkerchiefArchive = {
    saveCurrentDesign: saveCurrentDesign,
    deleteEntry: deleteEntry,
    renderArchiveGrid: renderArchiveGrid,
    revealDesignArchive: revealDesignArchive,
    getEntries: readEntries,
  };
})();
