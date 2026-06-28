/**
 * Renders the home-scroll Signs accordion (section list) and legacy card helpers for phase 2.
 */
(function () {
  "use strict";

  var built = false;
  var activeSectionId = null;
  var entriesBySection = {};
  var folderButtons = [];
  var accordionItems = [];

  /** Project browns that disappear on the brown sign-card background */
  var SIGN_BROWN_HEX = {
    "685450": true,
    "8b7355": true,
    "5c4033": true,
  };

  function normalizeHexColor(value) {
    if (!value) return "";
    var s = String(value).trim().toLowerCase();
    if (s === "none" || s === "transparent" || s === "currentcolor") return "";
    var rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgb) {
      var r = parseInt(rgb[1], 10);
      var g = parseInt(rgb[2], 10);
      var b = parseInt(rgb[3], 10);
      return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    if (s.charAt(0) === "#") s = s.slice(1);
    if (s.length === 3) {
      s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2);
    }
    return s.length >= 6 ? s.slice(0, 6) : "";
  }

  function isSignBrownColor(value) {
    var hex = normalizeHexColor(value);
    return !!hex && !!SIGN_BROWN_HEX[hex];
  }

  function remapBrownPaintAttribute(el, attr) {
    if (!el || !el.getAttribute) return;
    var value = el.getAttribute(attr);
    if (isSignBrownColor(value)) {
      el.setAttribute(attr, "#fff");
    }
  }

  function remapBrownInInlineStyle(el) {
    if (!el || !el.getAttribute) return;
    var style = el.getAttribute("style");
    if (!style || style.indexOf("685450") < 0 && style.indexOf("8B7355") < 0 && style.indexOf("8b7355") < 0 && style.indexOf("5C4033") < 0 && style.indexOf("5c4033") < 0) {
      return;
    }
    el.setAttribute(
      "style",
      style
        .replace(/#685450/gi, "#fff")
        .replace(/#8[bB]7355/gi, "#fff")
        .replace(/#5[cC]4033/gi, "#fff")
    );
  }

  function remapBrownToWhiteInSvg(root) {
    if (!root) return;
    var nodes = root.querySelectorAll ? root.querySelectorAll("*") : [];
    var i;
    var el;

    remapBrownPaintAttribute(root, "fill");
    remapBrownPaintAttribute(root, "stroke");
    remapBrownInInlineStyle(root);

    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      remapBrownPaintAttribute(el, "fill");
      remapBrownPaintAttribute(el, "stroke");
      remapBrownInInlineStyle(el);
    }

    var styles = root.querySelectorAll ? root.querySelectorAll("style") : [];
    for (i = 0; i < styles.length; i++) {
      var cssText = styles[i].textContent || "";
      if (!cssText) continue;
      styles[i].textContent = cssText
        .replace(/#685450/gi, "#fff")
        .replace(/#8[bB]7355/gi, "#fff")
        .replace(/#5[cC]4033/gi, "#fff");
    }
  }

  function applyCircleOutlinePreviewStyle(svg, previewId) {
    if (previewId !== "grief" && previewId !== "longing") return;
    var markerG = svg.querySelector(".sign-card__single-marker");
    if (!markerG) return;
    markerG.setAttribute("fill", "none");
    markerG.setAttribute("stroke", "#fff");
  }

  function applyPainHelplessnessPreviewStyle(svg, previewId) {
    if (previewId !== "pain" && previewId !== "helplessness") return;
    var markerG = svg.querySelector(".sign-card__single-marker");
    if (!markerG) return;
    if (previewId === "pain") {
      markerG.setAttribute("fill", "#fff");
      markerG.setAttribute("stroke", "#fff");
      var shapes = markerG.querySelectorAll("polygon, path");
      var i;
      for (i = 0; i < shapes.length; i++) {
        shapes[i].setAttribute("fill", "#fff");
        shapes[i].setAttribute("stroke", "#fff");
      }
      return;
    }
    markerG.setAttribute("fill", "none");
    markerG.setAttribute("stroke", "#fff");
    var lines = markerG.querySelectorAll("line");
    var j;
    for (j = 0; j < lines.length; j++) {
      lines[j].setAttribute("stroke", "#fff");
    }
  }

  function applyFanLeavesPreviewStyle(svg, previewId) {
    if (previewId !== "fanLeaves" || !svg) return;
    var bgFills = svg.querySelectorAll('[id^="radial-fan-background-"]');
    var i;
    for (i = 0; i < bgFills.length; i++) {
      bgFills[i].setAttribute("fill", "none");
      bgFills[i].setAttribute("stroke", "none");
    }
  }

  function applySignIconColors(iconWrap, previewId) {
    if (!iconWrap) return;
    var svg = iconWrap.querySelector("svg");
    if (!svg) return;
    remapBrownToWhiteInSvg(svg);
    applyCircleOutlinePreviewStyle(svg, previewId);
    applyPainHelplessnessPreviewStyle(svg, previewId);
    applyFanLeavesPreviewStyle(svg, previewId);
  }

  function resolveEmbeddedKey(filename) {
    var embedded =
      typeof window !== "undefined" ? window.LABEL_BAR_SVG_EMBEDDED : null;
    if (!filename || !embedded) return null;
    if (embedded[filename]) return filename;
    var slash = filename.lastIndexOf("/");
    if (slash >= 0) {
      var dir = filename.slice(0, slash);
      var base = filename.slice(slash + 1);
      if (dir !== "home" && embedded[base]) return base;
    }
    return null;
  }

  function getIconInnerMarkup(filename) {
    var key = resolveEmbeddedKey(filename);
    if (!key) return "";
    var embedded = window.LABEL_BAR_SVG_EMBEDDED;
    return embedded && embedded[key] ? embedded[key] : "";
  }

  function getIconDimensions(filename) {
    if (
      typeof LABEL_BAR_SVG_DIMENSIONS !== "undefined" &&
      LABEL_BAR_SVG_DIMENSIONS[filename]
    ) {
      return LABEL_BAR_SVG_DIMENSIONS[filename];
    }
    var key = resolveEmbeddedKey(filename);
    if (
      key &&
      typeof LABEL_BAR_SVG_DIMENSIONS !== "undefined" &&
      LABEL_BAR_SVG_DIMENSIONS[key]
    ) {
      return LABEL_BAR_SVG_DIMENSIONS[key];
    }
    return { width: 1, height: 1 };
  }

  function createSvgFileIcon(filename) {
    var innerMarkup = getIconInnerMarkup(filename);
    if (!innerMarkup) return null;

    var dims = getIconDimensions(filename);
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute(
      "viewBox",
      "0 0 " + String(dims.width) + " " + String(dims.height)
    );
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = innerMarkup;
    return svg;
  }

  function createPlaceholderSvg() {
    var placeholder = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    placeholder.setAttribute("viewBox", "0 0 100 100");
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.setAttribute("class", "sign-card__icon-placeholder");
    return placeholder;
  }

  function appendBilingualBlock(container, enText, faText, baseClass) {
    var en = enText != null ? String(enText) : "";
    var fa = faText != null ? String(faText) : "";
    if (!en && !fa) return container;

    if (en) {
      var enEl = document.createElement("span");
      enEl.className = baseClass + "-en";
      enEl.textContent = en;
      container.appendChild(enEl);
    }

    if (fa) {
      var faEl = document.createElement("span");
      faEl.className = baseClass + "-fa";
      faEl.setAttribute("lang", "fa");
      faEl.setAttribute("dir", "rtl");
      faEl.textContent = fa;
      container.appendChild(faEl);
    }

    return container;
  }

  function createBilingualBlock(enText, faText, baseClass) {
    var block = document.createElement("span");
    block.className = baseClass;
    appendBilingualBlock(block, enText, faText, baseClass);
    return block;
  }

  function createVisualNode(entry) {
    var visual = entry.visual || {};
    var node = null;

    if (visual.type === "svgFile" && visual.file) {
      node = createSvgFileIcon(visual.file);
    } else if (visual.type === "gridIcon" && visual.gridType) {
      if (window.GridUnitIcons && window.GridUnitIcons.createIcon) {
        node = window.GridUnitIcons.createIcon(visual.gridType);
      }
    } else if (visual.type === "canvasPreview" && visual.previewId) {
      node = createPlaceholderSvg();
      node.setAttribute("data-preview-id", visual.previewId);
    }

    if (!node) {
      node = createPlaceholderSvg();
    }

    return node;
  }

  function createSignCard(entry, index) {
    var catalog = window.SignsCatalog;
    var bgColor =
      entry.bgColor ||
      (catalog && catalog.getCardBgColor
        ? catalog.getCardBgColor()
        : "#442c28");

    var card = document.createElement("article");
    card.className = "sign-card";
    card.setAttribute("data-sign-id", entry.id);
    card.setAttribute("data-sign-section", entry.section || "");
    if (entry.visual && entry.visual.previewId) {
      card.setAttribute("data-preview-id", entry.visual.previewId);
    }

    var visual = document.createElement("div");
    visual.className = "sign-card__visual";
    visual.style.setProperty("--sign-card-bg", bgColor);

    var iconWrap = document.createElement("div");
    iconWrap.className = "sign-card__icon";
    iconWrap.appendChild(createVisualNode(entry));
    applySignIconColors(
      iconWrap,
      entry.visual && entry.visual.previewId ? entry.visual.previewId : ""
    );
    visual.appendChild(iconWrap);

    var label = createBilingualBlock(
      entry.label || "",
      "",
      "sign-card__label"
    );

    card.appendChild(visual);
    card.appendChild(label);
    return card;
  }

  function createSignListRow(entry) {
    var previewId =
      entry.visual && entry.visual.previewId ? entry.visual.previewId : "";

    var row = document.createElement("article");
    row.className = "page2-home-signs__sign-row";
    row.setAttribute("data-sign-id", entry.id);
    row.setAttribute("data-sign-section", entry.section || "");
    if (previewId) {
      row.setAttribute("data-preview-id", previewId);
    }
    if (previewId === "fanLeaves") {
      row.classList.add("page2-home-signs__sign-row--fan");
    }

    var iconWrap = document.createElement("div");
    iconWrap.className = "page2-home-signs__sign-icon";
    if (entry.visual && entry.visual.type === "gridIcon" && entry.visual.gridType) {
      iconWrap.setAttribute("data-grid-type", entry.visual.gridType);
    }
    if (previewId === "fanLeaves") {
      iconWrap.classList.add("page2-home-signs__sign-icon--fan");
    }
    iconWrap.appendChild(createVisualNode(entry));
    applySignIconColors(iconWrap, previewId);

    row.appendChild(iconWrap);

    if (previewId !== "fanLeaves") {
      row.appendChild(
        createBilingualBlock(
          entry.label || "",
          "",
          "page2-home-signs__sign-label"
        )
      );
    }

    return row;
  }

  var GRID_INNER_SCALE_DEFAULT = 4;

  function getGridInnerScaleConfig() {
    var catalog = getCatalog();
    if (catalog && catalog.gridInnerScaleConfig) {
      return catalog.gridInnerScaleConfig;
    }
    return {
      label:
        "How much do you feel that Iranian identity is a central part of your life today?",
      labelFa:
        "تا چه حد احساس می‌کنید هویت ایرانی بخش مرکزی زندگی‌تان امروز است؟",
      ariaLabel:
        "How much do you feel that Iranian identity is a central part of your life today? Very much in the background to at the center of my life.",
      ariaLabelFa:
        "تا چه حد احساس می‌کنید هویت ایرانی بخش مرکزی زندگی‌تان امروز است؟ از بسیار در پس‌زمینه تا در مرکز زندگی من.",
      min: 1,
      max: 10,
      step: 1,
      rangeLabels: ["Very much in the background", "At the center of my life"],
      rangeLabelsFa: ["بسیار در پس‌زمینه", "در مرکز زندگی من"],
    };
  }

  function syncSignsSliderBarFill(slider) {
    var min = Number(slider.min);
    var max = Number(slider.max);
    var val = Number(slider.value);
    var pct = max <= min ? 0 : ((val - min) / (max - min)) * 100;
    var fill = pct + "%";
    slider.style.setProperty("--bar-fill", fill);
    var track = slider.closest(".questionnaire-slider-track");
    if (track) {
      track.style.setProperty("--bar-fill", fill);
      track.classList.toggle("is-at-min", val <= min);
      track.classList.toggle("is-at-max", val >= max);
    }
  }

  function createSignsSliderTrack(slider) {
    var track = document.createElement("div");
    track.className = "questionnaire-slider-track";

    var handle = document.createElement("div");
    handle.className = "questionnaire-slider-handle";
    handle.setAttribute("aria-hidden", "true");

    var leftArrow = document.createElement("span");
    leftArrow.className =
      "questionnaire-slider-handle__arrow questionnaire-slider-handle__arrow--left";
    var rightArrow = document.createElement("span");
    rightArrow.className =
      "questionnaire-slider-handle__arrow questionnaire-slider-handle__arrow--right";

    handle.appendChild(leftArrow);
    handle.appendChild(rightArrow);
    track.appendChild(slider);
    track.appendChild(handle);
    return track;
  }

  function updateGridIconsInnerScale(panel, stepNumber) {
    var icons = panel.querySelectorAll(".page2-home-signs__sign-icon[data-grid-type]");
    if (!icons.length || !window.GridUnitIcons) return;
    var innerScale =
      typeof innerScaleValueFromStep === "function"
        ? innerScaleValueFromStep(stepNumber)
        : stepNumber / 10;
    var i;
    var iconWrap;
    var gridType;
    var svg;
    for (i = 0; i < icons.length; i++) {
      iconWrap = icons[i];
      gridType = iconWrap.getAttribute("data-grid-type");
      if (!gridType) continue;
      svg = iconWrap.querySelector("svg.grid-unit-icon");
      if (!svg) continue;
      if (window.GridUnitIcons.updateIconInnerScale) {
        window.GridUnitIcons.updateIconInnerScale(svg, gridType, innerScale);
      }
    }
  }

  var FAN_LEAVES_DEFAULT = 4;
  var FAN_LEAVES_CONFIG = {
    ariaLabel:
      "When you lived in Iran, how free did you feel to choose how to dress in public spaces? Fan leaves. Step 0 fully open, step 9 four ribs, step 10 closed.",
    min:
      typeof WEAR_CONTROL_OPENING_STEP_MIN !== "undefined"
        ? WEAR_CONTROL_OPENING_STEP_MIN
        : 0,
    max:
      typeof WEAR_CONTROL_OPENING_STEP_MAX !== "undefined"
        ? WEAR_CONTROL_OPENING_STEP_MAX
        : 10,
    step: 1,
  };

  function appendSignsPanelSlider(
    panel,
    config,
    defaultValue,
    sliderId,
    onInput,
    layoutOptions
  ) {
    layoutOptions = layoutOptions || {};
    var controlsWrap = document.createElement("div");
    controlsWrap.className = "page2-home-signs__panel-controls";
    if (layoutOptions.modifierClass) {
      controlsWrap.classList.add(layoutOptions.modifierClass);
    }

    if (!layoutOptions.hideHeading && config.label) {
      var heading = document.createElement("p");
      heading.className = "page2-home-signs__control-heading";
      appendBilingualBlock(
        heading,
        config.label,
        config.labelFa || "",
        "page2-home-signs__control-heading"
      );
      controlsWrap.appendChild(heading);
    }

    var sliderWrap = document.createElement("div");
    sliderWrap.className = "questionnaire-slider-wrap";

    if (
      !layoutOptions.hideRangeLabels &&
      config.rangeLabels &&
      config.rangeLabels.length
    ) {
      var rangeLabels = document.createElement("div");
      rangeLabels.className = "questionnaire-slider-range-labels";
      rangeLabels.setAttribute("aria-hidden", "true");
      config.rangeLabels.forEach(function (label, index) {
        var span = document.createElement("span");
        span.className = "questionnaire-slider-range-label";
        if (index === config.rangeLabels.length - 1) {
          span.classList.add("questionnaire-slider-range-label--end");
        }
        var faLabel =
          config.rangeLabelsFa && config.rangeLabelsFa[index]
            ? config.rangeLabelsFa[index]
            : "";
        appendBilingualBlock(span, label, faLabel, "questionnaire-slider-range-label");
        rangeLabels.appendChild(span);
      });
      sliderWrap.appendChild(rangeLabels);
    }

    var control = document.createElement("div");
    control.className = "questionnaire-slider-control";

    var slider = document.createElement("input");
    slider.type = "range";
    slider.className = "questionnaire-slider";
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step || 1);
    slider.value = String(defaultValue);
    slider.setAttribute(
      "aria-label",
      config.ariaLabelFa
        ? config.ariaLabel + " / " + config.ariaLabelFa
        : config.ariaLabel
    );
    slider.id = sliderId;

    slider.addEventListener("input", function () {
      syncSignsSliderBarFill(slider);
      if (onInput) onInput(Number(slider.value));
    });

    control.appendChild(createSignsSliderTrack(slider));
    syncSignsSliderBarFill(slider);

    if (!layoutOptions.hideOutput) {
      var output = document.createElement("output");
      output.className = "questionnaire-slider-output";
      output.setAttribute("for", slider.id);
      output.textContent = String(defaultValue);
      slider.addEventListener("input", function () {
        output.textContent = slider.value;
      });
      control.appendChild(output);
    }

    sliderWrap.appendChild(control);
    controlsWrap.appendChild(sliderWrap);
    panel.appendChild(controlsWrap);

    return slider;
  }

  function appendGridInnerScaleSlider(panel) {
    appendSignsPanelSlider(
      panel,
      getGridInnerScaleConfig(),
      GRID_INNER_SCALE_DEFAULT,
      "page2-home-signs-grid-inner-scale",
      function (stepNumber) {
        updateGridIconsInnerScale(panel, stepNumber);
      },
      {
        modifierClass: "page2-home-signs__panel-controls--compact",
        hideHeading: true,
        hideRangeLabels: true,
        hideOutput: true,
      }
    );
    updateGridIconsInnerScale(panel, GRID_INNER_SCALE_DEFAULT);
  }

  function updateFanPreview(panel, step) {
    var row = panel.querySelector('[data-preview-id="fanLeaves"]');
    if (
      !row ||
      !window.UnderCoverSignPreviews ||
      typeof window.UnderCoverSignPreviews.renderPreview !== "function"
    ) {
      return;
    }

    var iconWrap = row.querySelector(".page2-home-signs__sign-icon");
    if (!iconWrap) return;

    var previewSvg = window.UnderCoverSignPreviews.renderPreview("fanLeaves", {
      fanLeavesStep: step,
      signsFanTightCrop: true,
      signsFanPreserveClip: true,
    });
    if (!previewSvg) return;

    iconWrap.innerHTML = "";
    iconWrap.appendChild(previewSvg);
    applySignIconColors(iconWrap, "fanLeaves");
    row.setAttribute("data-preview-hydrated", "true");
  }

  function appendFanLeavesSlider(panel) {
    appendSignsPanelSlider(
      panel,
      FAN_LEAVES_CONFIG,
      FAN_LEAVES_DEFAULT,
      "page2-home-signs-fan-leaves",
      function (step) {
        updateFanPreview(panel, step);
      },
      {
        modifierClass: "page2-home-signs__panel-controls--compact",
        hideHeading: true,
        hideRangeLabels: true,
        hideOutput: true,
      }
    );
    if (
      window.UnderCoverSignPreviews &&
      window.UnderCoverSignPreviews.isReady &&
      window.UnderCoverSignPreviews.isReady()
    ) {
      updateFanPreview(panel, FAN_LEAVES_DEFAULT);
    }
  }

  function populateBodyAutonomyAccordionPanel(panel) {
    var entries = entriesBySection.bodyAutonomy || [];
    if (!entries.length) return;

    var listWrap = document.createElement("div");
    listWrap.className =
      "page2-home-signs__panel-list page2-home-signs__panel-list--fan";
    listWrap.setAttribute("data-sign-count", String(entries.length));

    var fragment = document.createDocumentFragment();
    var i;
    for (i = 0; i < entries.length; i++) {
      fragment.appendChild(createSignListRow(entries[i]));
    }
    listWrap.appendChild(fragment);
    panel.appendChild(listWrap);
    appendFanLeavesSlider(panel);
    panel.setAttribute("data-populated", "true");
  }

  function populateGridAccordionPanel(panel) {
    var entries = entriesBySection.grid || [];
    if (!entries.length) return;

    var listWrap = document.createElement("div");
    listWrap.className = "page2-home-signs__panel-list";
    listWrap.setAttribute("data-sign-count", String(entries.length));

    var fragment = document.createDocumentFragment();
    var i;
    for (i = 0; i < entries.length; i++) {
      fragment.appendChild(createSignListRow(entries[i]));
    }
    listWrap.appendChild(fragment);
    panel.appendChild(listWrap);
    appendGridInnerScaleSlider(panel);
    panel.setAttribute("data-populated", "true");
  }

  function populateAccordionPanel(sectionId) {
    var panel = document.getElementById("page2-home-signs-panel-" + sectionId);
    if (!panel || panel.getAttribute("data-populated") === "true") {
      return;
    }

    if (sectionId === "grid") {
      populateGridAccordionPanel(panel);
      return;
    }

    if (sectionId === "bodyAutonomy") {
      populateBodyAutonomyAccordionPanel(panel);
      return;
    }

    var entries = entriesBySection[sectionId] || [];
    if (!entries.length) return;

    var listWrap = document.createElement("div");
    listWrap.className = "page2-home-signs__panel-list";
    listWrap.setAttribute("data-sign-count", String(entries.length));

    var fragment = document.createDocumentFragment();
    var i;
    for (i = 0; i < entries.length; i++) {
      fragment.appendChild(createSignListRow(entries[i]));
    }
    listWrap.appendChild(fragment);
    panel.appendChild(listWrap);
    panel.setAttribute("data-populated", "true");
  }

  function afterAccordionSectionOpened(sectionId) {
    if (!sectionId) return;
    populateAccordionPanel(sectionId);
    hydrateCanvasPreviewsForSection(sectionId);
    updateScrollability();
  }

  function getCatalog() {
    return window.SignsCatalog || null;
  }

  function indexEntriesBySection(catalog) {
    entriesBySection = {};
    var entries = catalog.entries || [];
    var i;
    var entry;
    var sectionId;

    for (i = 0; i < entries.length; i++) {
      entry = entries[i];
      sectionId = entry.section || "";
      if (!sectionId) continue;
      if (!entriesBySection[sectionId]) {
        entriesBySection[sectionId] = [];
      }
      entriesBySection[sectionId].push(entry);
    }
  }

  function createFolderCard(sectionMeta, index) {
    var catalog = getCatalog();
    var bgColor =
      catalog && catalog.getCardBgColor ? catalog.getCardBgColor() : "#442c28";

    var button = document.createElement("button");
    button.type = "button";
    button.className = "sign-folder-card";
    button.setAttribute("role", "tab");
    button.id = "signs-folder-" + sectionMeta.id;
    button.setAttribute("data-sign-section", sectionMeta.id);
    button.setAttribute("aria-controls", "signs-panel-" + sectionMeta.id);
    button.setAttribute("aria-selected", "false");
    button.setAttribute("tabindex", index === 0 ? "0" : "-1");

    var visual = document.createElement("div");
    visual.className = "sign-folder-card__visual";
    visual.style.setProperty("--sign-card-bg", bgColor);

    var label = document.createElement("div");
    label.className = "sign-folder-card__label";
    label.textContent = sectionMeta.label || sectionMeta.id;

    button.appendChild(visual);
    button.appendChild(label);
    return button;
  }

  function createSectionGroup(sectionMeta) {
    var group = document.createElement("div");
    group.className = "signs-section-group";
    group.setAttribute("data-sign-section", sectionMeta.id);
    group.setAttribute("role", "tabpanel");
    group.id = "signs-panel-" + sectionMeta.id;
    group.setAttribute("aria-labelledby", "signs-folder-" + sectionMeta.id);
    group.setAttribute("aria-hidden", "true");

    var cardsWrap = document.createElement("div");
    cardsWrap.className = "signs-section-group__cards";
    group.appendChild(cardsWrap);
    return group;
  }

  function populateSectionCards(sectionId) {
    var group = document.querySelector(
      '#signs-grid .signs-section-group[data-sign-section="' +
        sectionId +
        '"]'
    );
    if (!group) return;

    var cardsWrap = group.querySelector(".signs-section-group__cards");
    if (!cardsWrap || cardsWrap.getAttribute("data-populated") === "true") {
      return;
    }

    var entries = entriesBySection[sectionId] || [];
    if (!entries.length) return;

    var fragment = document.createDocumentFragment();
    var i;
    for (i = 0; i < entries.length; i++) {
      fragment.appendChild(createSignCard(entries[i], i));
    }
    cardsWrap.appendChild(fragment);
    cardsWrap.setAttribute("data-populated", "true");
  }

  function updateFolderTabState(sectionId) {
    var i;
    var btn;
    var hasSelection = !!sectionId;
    for (i = 0; i < folderButtons.length; i++) {
      btn = folderButtons[i];
      var isActive = btn.getAttribute("data-sign-section") === sectionId;
      btn.classList.toggle("is-active", isActive);
      btn.classList.toggle("is-dimmed", hasSelection && !isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.setAttribute("tabindex", isActive ? "0" : "-1");
    }
  }

  function updateSectionGroupState(sectionId) {
    var groups = document.querySelectorAll(
      "#signs-grid .signs-section-group"
    );
    var i;
    var group;
    var groupId;

    for (i = 0; i < groups.length; i++) {
      group = groups[i];
      groupId = group.getAttribute("data-sign-section");
      var isActive = groupId === sectionId;

      group.classList.toggle("is-expanded", isActive);
      group.classList.toggle("is-active", isActive);
      group.setAttribute("aria-hidden", isActive ? "false" : "true");
    }
  }

  function scrollToSectionGroup(sectionId) {
    var group = document.getElementById("signs-panel-" + sectionId);
    if (!group) return;
    group.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateAccordionItemState(sectionId) {
    var i;
    var item;
    for (i = 0; i < accordionItems.length; i++) {
      item = accordionItems[i];
      var itemSectionId = item.getAttribute("data-sign-section");
      var isExpanded = !!sectionId && itemSectionId === sectionId;
      item.classList.toggle("is-expanded", isExpanded);
      var trigger = item.querySelector(".page2-home-signs__trigger");
      var panel = item.querySelector(".page2-home-signs__panel");
      if (trigger) {
        trigger.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      }
      if (panel) {
        panel.hidden = !isExpanded;
      }
    }
  }

  function createAccordionItem(sectionMeta, index) {
    var item = document.createElement("article");
    item.className = "page2-home-signs__item";
    item.setAttribute("data-sign-section", sectionMeta.id);
    item.setAttribute("role", "listitem");
    item.id = "page2-home-signs-item-" + sectionMeta.id;

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "page2-home-signs__trigger";
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute(
      "aria-controls",
      "page2-home-signs-panel-" + sectionMeta.id
    );
    trigger.id = "page2-home-signs-trigger-" + sectionMeta.id;

    var num = document.createElement("span");
    num.className = "page2-home-signs__num";
    num.textContent = String(index + 1);

    var title = createBilingualBlock(
      sectionMeta.label || sectionMeta.id,
      sectionMeta.labelFa || "",
      "page2-home-signs__title"
    );

    var desc = createBilingualBlock(
      sectionMeta.description || "",
      sectionMeta.descriptionFa || "",
      "page2-home-signs__desc"
    );
    if (!sectionMeta.description && !sectionMeta.descriptionFa) {
      desc.classList.add("page2-home-signs__desc--empty");
    }

    trigger.appendChild(num);
    trigger.appendChild(title);
    trigger.appendChild(desc);

    var panel = document.createElement("div");
    panel.className = "page2-home-signs__panel";
    panel.id = "page2-home-signs-panel-" + sectionMeta.id;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", trigger.id);
    panel.hidden = true;

    trigger.addEventListener("click", onAccordionTriggerClick);
    trigger.addEventListener("keydown", onAccordionTriggerKeydown);

    item.appendChild(trigger);
    item.appendChild(panel);
    return item;
  }

  function getAccordionIndex(sectionId) {
    var i;
    for (i = 0; i < accordionItems.length; i++) {
      if (accordionItems[i].getAttribute("data-sign-section") === sectionId) {
        return i;
      }
    }
    return -1;
  }

  function focusAccordionAtIndex(index) {
    if (index < 0 || index >= accordionItems.length) return;
    var trigger = accordionItems[index].querySelector(
      ".page2-home-signs__trigger"
    );
    if (trigger) trigger.focus();
  }

  function toggleAccordionSection(sectionId) {
    if (!sectionId || !entriesBySection[sectionId]) return;

    if (activeSectionId === sectionId) {
      activeSectionId = null;
      updateAccordionItemState(null);
      updateScrollability();
      return;
    }

    activeSectionId = sectionId;
    updateAccordionItemState(sectionId);
    afterAccordionSectionOpened(sectionId);
  }

  function onAccordionTriggerClick(event) {
    event.preventDefault();
    event.stopPropagation();
    var trigger = event.currentTarget;
    var item = trigger.closest(".page2-home-signs__item");
    if (!item) return;
    toggleAccordionSection(item.getAttribute("data-sign-section"));
  }

  function onAccordionTriggerKeydown(event) {
    var trigger = event.currentTarget;
    var item = trigger.closest(".page2-home-signs__item");
    if (!item) return;
    var sectionId = item.getAttribute("data-sign-section");
    var index = getAccordionIndex(sectionId);

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      focusAccordionAtIndex((index + 1) % accordionItems.length);
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      focusAccordionAtIndex(
        (index - 1 + accordionItems.length) % accordionItems.length
      );
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleAccordionSection(sectionId);
    }
  }

  function buildHomeSignsAccordion() {
    if (built) return;

    var listEl = document.getElementById("page2-home-signs-list");
    if (!listEl) return;

    var catalog = getCatalog();
    if (
      !catalog ||
      !Array.isArray(catalog.entries) ||
      !catalog.entries.length ||
      !Array.isArray(catalog.sections) ||
      !catalog.sections.length
    ) {
      return;
    }

    indexEntriesBySection(catalog);

    var fragment = document.createDocumentFragment();
    accordionItems = [];

    var i;
    var sectionMeta;
    var item;
    for (i = 0; i < catalog.sections.length; i++) {
      sectionMeta = catalog.sections[i];
      if (!entriesBySection[sectionMeta.id]) continue;

      item = createAccordionItem(sectionMeta, accordionItems.length);
      accordionItems.push(item);
      fragment.appendChild(item);
    }

    listEl.appendChild(fragment);
    built = true;
    updateScrollability();
  }

  function openSection(sectionId) {
    if (!sectionId || !entriesBySection[sectionId]) return;

    activeSectionId = sectionId;
    updateAccordionItemState(sectionId);
    afterAccordionSectionOpened(sectionId);

    var item = document.getElementById("page2-home-signs-item-" + sectionId);
    if (item) {
      window.requestAnimationFrame(function () {
        item.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function getFolderIndex(sectionId) {
    var i;
    for (i = 0; i < folderButtons.length; i++) {
      if (folderButtons[i].getAttribute("data-sign-section") === sectionId) {
        return i;
      }
    }
    return -1;
  }

  function focusFolderAtIndex(index) {
    if (index < 0 || index >= folderButtons.length) return;
    folderButtons[index].focus();
  }

  function onFolderClick(event) {
    var button = event.currentTarget;
    var sectionId = button.getAttribute("data-sign-section");
    openSection(sectionId);
  }

  function onFolderKeydown(event) {
    var button = event.currentTarget;
    var sectionId = button.getAttribute("data-sign-section");
    var index = getFolderIndex(sectionId);
    var nextIndex = index;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      nextIndex = (index + 1) % folderButtons.length;
      focusFolderAtIndex(nextIndex);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      nextIndex = (index - 1 + folderButtons.length) % folderButtons.length;
      focusFolderAtIndex(nextIndex);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSection(sectionId);
    }
  }

  function updateScrollability() {
    if (
      window.Page2Navigation &&
      typeof window.Page2Navigation.updateScrollability === "function"
    ) {
      window.Page2Navigation.updateScrollability();
    }
  }

  function getFanLeavesStepFromPanel(row) {
    var panel = row.closest(".page2-home-signs__panel");
    if (!panel) return null;
    var slider = panel.querySelector("#page2-home-signs-fan-leaves");
    if (!slider) return null;
    return Number(slider.value);
  }

  function hydrateCanvasPreviewRow(row) {
    var previewId = row.getAttribute("data-preview-id");
    if (!previewId) return;
    if (
      !window.UnderCoverSignPreviews ||
      typeof window.UnderCoverSignPreviews.renderPreview !== "function"
    ) {
      return;
    }

    var iconWrap = row.querySelector(".page2-home-signs__sign-icon");
    if (!iconWrap || row.getAttribute("data-preview-hydrated") === "true") {
      return;
    }

    var previewOptions = null;
    if (previewId === "fanLeaves") {
      var fanStep = getFanLeavesStepFromPanel(row);
      if (fanStep !== null && isFinite(fanStep)) {
        previewOptions = {
          fanLeavesStep: fanStep,
          signsFanTightCrop: true,
          signsFanPreserveClip: true,
        };
      } else {
        previewOptions = {
          signsFanTightCrop: true,
          signsFanPreserveClip: true,
        };
      }
    }

    var previewSvg = window.UnderCoverSignPreviews.renderPreview(
      previewId,
      previewOptions
    );
    if (!previewSvg) return;

    iconWrap.innerHTML = "";
    iconWrap.appendChild(previewSvg);
    applySignIconColors(iconWrap, previewId);
    row.setAttribute("data-preview-hydrated", "true");
  }

  function getAccordionPreviewRows(sectionId) {
    var selector =
      "#page2-home-signs .page2-home-signs__sign-row[data-preview-id]";
    if (sectionId) {
      selector +=
        '[data-sign-section="' + sectionId + '"]';
    }
    return document.querySelectorAll(selector);
  }

  function hydrateCanvasPreviewsForSection(sectionId) {
    if (
      !window.UnderCoverSignPreviews ||
      !window.UnderCoverSignPreviews.isReady ||
      !window.UnderCoverSignPreviews.isReady()
    ) {
      return;
    }

    if (sectionId === "bodyAutonomy") {
      var fanPanel = document.getElementById(
        "page2-home-signs-panel-bodyAutonomy"
      );
      if (fanPanel && fanPanel.getAttribute("data-populated") === "true") {
        var fanSlider = fanPanel.querySelector("#page2-home-signs-fan-leaves");
        var fanStep = fanSlider
          ? Number(fanSlider.value)
          : FAN_LEAVES_DEFAULT;
        updateFanPreview(fanPanel, fanStep);
      }
      return;
    }

    var rows = getAccordionPreviewRows(sectionId);
    var i;
    for (i = 0; i < rows.length; i++) {
      hydrateCanvasPreviewRow(rows[i]);
    }
  }

  function hydrateCanvasPreviews() {
    if (
      !window.UnderCoverSignPreviews ||
      !window.UnderCoverSignPreviews.isReady ||
      !window.UnderCoverSignPreviews.isReady()
    ) {
      return;
    }

    var rows = getAccordionPreviewRows("");
    var i;
    for (i = 0; i < rows.length; i++) {
      hydrateCanvasPreviewRow(rows[i]);
    }
    updateScrollability();
  }

  function hydrateCanvasPreviewCard(card) {
    hydrateCanvasPreviewRow(card);
  }

  function buildSignsLayout() {
    buildHomeSignsAccordion();
  }

  function onSignPreviewsReady() {
    var rows = getAccordionPreviewRows("");
    var i;
    for (i = 0; i < rows.length; i++) {
      rows[i].removeAttribute("data-preview-hydrated");
    }
    if (activeSectionId) {
      hydrateCanvasPreviewsForSection(activeSectionId);
    } else {
      hydrateCanvasPreviews();
    }
  }

  function init() {
    buildSignsLayout();
    window.addEventListener(
      "undercover:sign-previews-ready",
      onSignPreviewsReady
    );
    if (
      window.UnderCoverSignPreviews &&
      window.UnderCoverSignPreviews.isReady &&
      window.UnderCoverSignPreviews.isReady()
    ) {
      onSignPreviewsReady();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.SignsPage = {
    build: buildSignsLayout,
    openSection: openSection,
    toggleSection: toggleAccordionSection,
    hydrateCanvasPreviews: hydrateCanvasPreviews,
  };
})();
