/**
 * Renders the home-scroll Signs accordion (section list) and legacy card helpers for phase 2.
 */
(function () {
  "use strict";

  var built = false;
  var entriesBySection = {};
  var accordionItems = [];

  /**
   * Auto-animation registry: each open Signs section that has a slider gets a
   * looping timer here, keyed by section id, so we can stop it cleanly when the
   * section closes (or another opens). On the Signs page the sliders are not
   * interactive controls anymore — the visuals animate on their own.
   */
  var signsAnimationLoops = {};

  /** Project browns that disappear on the brown sign-card background */
  var SIGN_BROWN_HEX = {
    "685450": true,
    "8b7355": true,
    "5c4033": true,
  };

  /**
   * On the Signs page only, the project purple fill (#3c06a7) should read as a
   * light grey instead — distinct from white. This recolour is scoped to the
   * sign-icon SVGs here and does NOT touch the shared product palette.
   */
  var SIGN_PURPLE_HEX = "3c06a7";
  var SIGN_PURPLE_REPLACEMENT = "#b0b0b0";

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

  function isSignPurpleColor(value) {
    return normalizeHexColor(value) === SIGN_PURPLE_HEX;
  }

  function remapPurplePaintAttribute(el, attr) {
    if (!el || !el.getAttribute) return;
    if (isSignPurpleColor(el.getAttribute(attr))) {
      el.setAttribute(attr, SIGN_PURPLE_REPLACEMENT);
    }
  }

  function remapPurpleInInlineStyle(el) {
    if (!el || !el.getAttribute) return;
    var style = el.getAttribute("style");
    if (!style || style.toLowerCase().indexOf(SIGN_PURPLE_HEX) < 0) return;
    el.setAttribute(
      "style",
      style.replace(/#3c06a7/gi, SIGN_PURPLE_REPLACEMENT)
    );
  }

  function remapPurpleToGrayInSvg(root) {
    if (!root) return;
    var nodes = root.querySelectorAll ? root.querySelectorAll("*") : [];
    var i;
    var el;

    remapPurplePaintAttribute(root, "fill");
    remapPurplePaintAttribute(root, "stroke");
    remapPurpleInInlineStyle(root);

    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      remapPurplePaintAttribute(el, "fill");
      remapPurplePaintAttribute(el, "stroke");
      remapPurpleInInlineStyle(el);
    }

    var styles = root.querySelectorAll ? root.querySelectorAll("style") : [];
    for (i = 0; i < styles.length; i++) {
      var cssText = styles[i].textContent || "";
      if (!cssText) continue;
      styles[i].textContent = cssText.replace(
        /#3c06a7/gi,
        SIGN_PURPLE_REPLACEMENT
      );
    }
  }

  function applyCircleOutlinePreviewStyle(svg, previewId) {
    if (previewId !== "grief" && previewId !== "longing") return;
    var markerG = svg.querySelector(".sign-card__single-marker");
    if (!markerG) return;
    markerG.setAttribute("fill", "none");
    markerG.setAttribute("stroke", "#fff");
  }

  function applySadnessPreviewStyle(svg, previewId) {
    if (previewId !== "sadness" || !svg) return;
    var markerG = svg.querySelector(".sign-card__single-marker");
    if (!markerG) return;
    markerG.setAttribute("fill", "#fff");
    markerG.setAttribute("stroke", "#fff");
    var circle = markerG.querySelector("circle");
    if (circle) {
      circle.setAttribute("fill", "#fff");
      circle.setAttribute("stroke", "#fff");
    }
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

  /** Signs-page Strength / Power only: white square, circle matches brown card bg */
  var SIGN_PAGE_BG_BROWN = "#442c28";

  function applyStrengthPreviewStyle(svg, previewId) {
    if (previewId !== "strength" || !svg) return;
    var markerG = svg.querySelector(".sign-card__single-marker");
    if (!markerG) return;
    var rect = markerG.querySelector("rect");
    var circle = markerG.querySelector("circle");
    if (rect) {
      rect.setAttribute("fill", "#fff");
      rect.setAttribute("stroke", "#fff");
    }
    if (circle) {
      circle.setAttribute("fill", SIGN_PAGE_BG_BROWN);
      circle.setAttribute("stroke", SIGN_PAGE_BG_BROWN);
    }
  }

  function applyHopePreviewStyle(svg, previewId) {
    if (previewId !== "hope" || !svg) return;
    var markerG = svg.querySelector(".sign-card__single-marker");
    if (!markerG) return;
    var outlines = markerG.querySelectorAll("polygon, path");
    var i;
    for (i = 0; i < outlines.length; i++) {
      if (
        outlines[i].parentNode &&
        outlines[i].parentNode.localName === "clipPath"
      ) {
        continue;
      }
      outlines[i].setAttribute("fill", "none");
      outlines[i].setAttribute("stroke", "#fff");
    }
    var dots = markerG.querySelectorAll(".sign-card__hope-dots circle");
    for (i = 0; i < dots.length; i++) {
      dots[i].setAttribute("fill", "#fff");
      dots[i].setAttribute("stroke", "none");
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

  /**
   * The frame-line border side carries red/pink/cream accent fills from the
   * design canvas. On the Signs page the sign glyphs are monochrome
   * (browns -> white, purple -> grey), so we neutralise these accents to white
   * too, keeping the single family frame line consistent with the other signs.
   */
  var SIGN_FRAME_LINE_ACCENT_HEX = {
    ff3c3c: true,
    f7cecd: true,
    fffce9: true,
  };

  function isFrameLineAccentColor(value) {
    var hex = normalizeHexColor(value);
    return !!hex && !!SIGN_FRAME_LINE_ACCENT_HEX[hex];
  }

  function remapFrameLineAccentPaint(el, attr) {
    if (!el || !el.getAttribute) return;
    if (isFrameLineAccentColor(el.getAttribute(attr))) {
      el.setAttribute(attr, "#fff");
    }
  }

  function remapFrameLineAccentsToWhite(root) {
    if (!root) return;
    var nodes = root.querySelectorAll ? root.querySelectorAll("*") : [];
    var i;

    remapFrameLineAccentPaint(root, "fill");
    remapFrameLineAccentPaint(root, "stroke");
    for (i = 0; i < nodes.length; i++) {
      remapFrameLineAccentPaint(nodes[i], "fill");
      remapFrameLineAccentPaint(nodes[i], "stroke");
    }
  }

  function applyFrameLinePreviewStyle(svg, previewId) {
    if (previewId !== "familyFrameLine" || !svg) return;
    remapFrameLineAccentsToWhite(svg);
  }

  function applySignSvgColors(svg, previewId) {
    if (!svg) return;
    remapBrownToWhiteInSvg(svg);
    remapPurpleToGrayInSvg(svg);
    applyCircleOutlinePreviewStyle(svg, previewId);
    applySadnessPreviewStyle(svg, previewId);
    applyPainHelplessnessPreviewStyle(svg, previewId);
    applyStrengthPreviewStyle(svg, previewId);
    applyHopePreviewStyle(svg, previewId);
    applyFanLeavesPreviewStyle(svg, previewId);
    applyFrameLinePreviewStyle(svg, previewId);
  }

  function applySignIconColors(iconWrap, previewId) {
    if (!iconWrap) return;
    applySignSvgColors(iconWrap.querySelector("svg"), previewId);
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
    if (previewId === "familyFrameLine") {
      row.classList.add("page2-home-signs__sign-row--frame-line");
    }

    var iconWrap = document.createElement("div");
    iconWrap.className = "page2-home-signs__sign-icon";
    if (entry.visual && entry.visual.type === "gridIcon" && entry.visual.gridType) {
      iconWrap.setAttribute("data-grid-type", entry.visual.gridType);
    }
    if (previewId === "fanLeaves") {
      iconWrap.classList.add("page2-home-signs__sign-icon--fan");
    }
    if (previewId === "familyFrameLine") {
      iconWrap.classList.add("page2-home-signs__sign-icon--frame-line");
    }
    iconWrap.appendChild(createVisualNode(entry));
    applySignIconColors(iconWrap, previewId);

    row.appendChild(iconWrap);

    if (previewId !== "fanLeaves" && previewId !== "familyFrameLine") {
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

  /**
   * Family section standalone divided rectangle.
   *
   * This sign is drawn locally as its OWN small SVG and is intentionally NOT
   * tied to the handkerchief / border-frame-divisions product engine. It is a
   * plain outlined rectangle (white stroke, no fill) split by evenly spaced
   * vertical divider lines into `segments` equal parts (segments - 1 lines).
   *
   * The drawing uses a fixed viewBox and preserveAspectRatio="none" so the SVG
   * stretches to fill the CSS box (exactly 2 grid columns wide x 50px tall),
   * while `vector-effect: non-scaling-stroke` keeps the line thickness uniform
   * even though x and y scale by different amounts.
   */
  var FAMILY_DIVISIONS_VIEWBOX_W = 200;
  var FAMILY_DIVISIONS_VIEWBOX_H = 50;
  var FAMILY_DIVISIONS_INSET = 2; /* keep the outer stroke inside the viewBox */
  var FAMILY_DIVISIONS_STROKE = "#fff";
  var FAMILY_DIVISIONS_STROKE_WIDTH = 2;
  var FAMILY_DIVISIONS_LINES_CLASS = "page2-home-signs__family-divisions-lines";

  /* Scripted animation: 3→4→5, then cell phase at 5 only, then 4→3. */
  var FAMILY_DIVISIONS_MIN = 3;
  var FAMILY_DIVISIONS_MAX = 5;
  var FAMILY_DIVISIONS_STATIC = 4;
  var FAMILY_ANIMATION_STEP_MS = 1000;
  /* Cell empty/fill steps never change segment count — always at FAMILY_DIVISIONS_MAX. */
  var FAMILY_ANIMATION_SEQUENCE = [
    { action: "divisions", segments: 3 },
    { action: "divisions", segments: 4 },
    { action: "divisions", segments: 5 },
    { action: "emptyCells", emptyCells: [2, 4] },
    { action: "fillCells" },
    { action: "divisions", segments: 4 },
    /* Loop wraps to index 0 (3 divisions) — no duplicate 3 step at end. */
  ];
  /* Empty-cell stipple: same dot size/spacing as handkerchief border frame */
  var FAMILY_EMPTY_CELL_DOT_SIZE = 2;
  var FAMILY_EMPTY_CELL_DOT_SPACING = 2;
  var FAMILY_EMPTY_CELL_STIPPLE_CLASS =
    "page2-home-signs__family-empty-cell-stipple";

  var SVG_NS = "http://www.w3.org/2000/svg";

  function familyEmptyCellHashSeed(str) {
    var h = 2166136261;
    var i;
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function familyEmptyCellSeededRandom(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateFamilyEmptyCellStippleDots(x, y, w, h, seed) {
    var radius = FAMILY_EMPTY_CELL_DOT_SIZE / 2;
    var minDist = FAMILY_EMPTY_CELL_DOT_SIZE + FAMILY_EMPTY_CELL_DOT_SPACING;
    var minDistSq = minDist * minDist;
    var padding = radius + 1;
    var area = Math.max(1, w * h);
    var targetCount = Math.max(2, Math.round(area / (minDist * minDist * 0.65)));
    var rng = familyEmptyCellSeededRandom(seed);
    var dots = [];
    var maxAttempts = targetCount * 50;
    var attempts = 0;
    var dotX;
    var dotY;
    var ok;
    var di;
    var dx;
    var dy;

    while (dots.length < targetCount && attempts < maxAttempts) {
      attempts++;
      dotX = x - padding + rng() * (w + padding * 2);
      dotY = y - padding + rng() * (h + padding * 2);
      ok = true;
      for (di = 0; di < dots.length; di++) {
        dx = dotX - dots[di].x;
        dy = dotY - dots[di].y;
        if (dx * dx + dy * dy < minDistSq) {
          ok = false;
          break;
        }
      }
      if (ok) dots.push({ x: dotX, y: dotY });
    }

    return { dots: dots, radius: radius };
  }

  function appendFamilyEmptyCellStipple(group, x, y, w, h, cellIndex) {
    if (w <= 0 || h <= 0) return;

    var clipId = "family-empty-stipple-clip-" + cellIndex;
    var clip = document.createElementNS(SVG_NS, "clipPath");
    clip.setAttribute("id", clipId);
    var clipRect = document.createElementNS(SVG_NS, "rect");
    clipRect.setAttribute("x", String(x));
    clipRect.setAttribute("y", String(y));
    clipRect.setAttribute("width", String(w));
    clipRect.setAttribute("height", String(h));
    clip.appendChild(clipRect);
    group.appendChild(clip);

    var seed = familyEmptyCellHashSeed("family-sign-empty-" + cellIndex);
    var stipple = generateFamilyEmptyCellStippleDots(x, y, w, h, seed);
    var dotGroup = document.createElementNS(SVG_NS, "g");
    dotGroup.setAttribute("class", FAMILY_EMPTY_CELL_STIPPLE_CLASS);
    dotGroup.setAttribute("clip-path", "url(#" + clipId + ")");
    dotGroup.setAttribute("fill", FAMILY_DIVISIONS_STROKE);
    dotGroup.setAttribute("stroke", "none");

    var ci;
    for (ci = 0; ci < stipple.dots.length; ci++) {
      var circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", String(stipple.dots[ci].x));
      circle.setAttribute("cy", String(stipple.dots[ci].y));
      circle.setAttribute("r", String(stipple.radius));
      dotGroup.appendChild(circle);
    }
    group.appendChild(dotGroup);
  }

  function createFamilyFilledArray(count) {
    var filled = [];
    var i;
    for (i = 0; i < count; i++) filled.push(true);
    return filled;
  }

  function resolveFamilyAnimationFrame(step) {
    if (step.action === "emptyCells") {
      return {
        segments: FAMILY_DIVISIONS_MAX,
        emptyCells: step.emptyCells || [],
      };
    }
    if (step.action === "fillCells") {
      return { segments: FAMILY_DIVISIONS_MAX };
    }
    return { segments: step.segments, emptyCells: null };
  }

  function familyFilledFromFrame(frame) {
    var filled = createFamilyFilledArray(frame.segments);
    if (!frame.emptyCells || frame.segments !== FAMILY_DIVISIONS_MAX) {
      return filled;
    }
    var i;
    for (i = 0; i < frame.emptyCells.length; i++) {
      var n = frame.emptyCells[i];
      if (n >= 1 && n <= frame.segments) filled[n - 1] = false;
    }
    return filled;
  }

  function renderFamilyAnimationStep(svg, step) {
    var frame = resolveFamilyAnimationFrame(step);
    renderFamilyDivisions(svg, frame.segments, familyFilledFromFrame(frame));
  }

  function createFamilyDivisionsSvg() {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute(
      "viewBox",
      "0 0 " + FAMILY_DIVISIONS_VIEWBOX_W + " " + FAMILY_DIVISIONS_VIEWBOX_H
    );
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");
    svg.style.overflow = "visible";

    var rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(FAMILY_DIVISIONS_INSET));
    rect.setAttribute("y", String(FAMILY_DIVISIONS_INSET));
    rect.setAttribute(
      "width",
      String(FAMILY_DIVISIONS_VIEWBOX_W - FAMILY_DIVISIONS_INSET * 2)
    );
    rect.setAttribute(
      "height",
      String(FAMILY_DIVISIONS_VIEWBOX_H - FAMILY_DIVISIONS_INSET * 2)
    );
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", FAMILY_DIVISIONS_STROKE);
    rect.setAttribute("stroke-width", String(FAMILY_DIVISIONS_STROKE_WIDTH));
    rect.setAttribute("vector-effect", "non-scaling-stroke");
    svg.appendChild(rect);

    var linesGroup = document.createElementNS(SVG_NS, "g");
    linesGroup.setAttribute("class", FAMILY_DIVISIONS_LINES_CLASS);
    svg.appendChild(linesGroup);

    return svg;
  }

  /**
   * Redraw only the internal divider lines so the rectangle is split into
   * `segments` equal parts (segments - 1 evenly spaced vertical lines). The
   * outer rectangle is left untouched.
   */
  function appendFamilyLine(group, x1, y1, x2, y2) {
    var line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", String(x1));
    line.setAttribute("y1", String(y1));
    line.setAttribute("x2", String(x2));
    line.setAttribute("y2", String(y2));
    line.setAttribute("stroke", FAMILY_DIVISIONS_STROKE);
    line.setAttribute("stroke-width", String(FAMILY_DIVISIONS_STROKE_WIDTH));
    line.setAttribute("vector-effect", "non-scaling-stroke");
    group.appendChild(line);
  }

  function appendFamilyPolygon(group, pointsStr, fill) {
    var poly = document.createElementNS(SVG_NS, "polygon");
    poly.setAttribute("points", pointsStr);
    poly.setAttribute("fill", fill);
    poly.setAttribute("stroke", FAMILY_DIVISIONS_STROKE);
    poly.setAttribute("stroke-width", String(FAMILY_DIVISIONS_STROKE_WIDTH));
    poly.setAttribute("vector-effect", "non-scaling-stroke");
    poly.setAttribute("stroke-linejoin", "miter");
    group.appendChild(poly);
  }

  function renderFamilyDivisions(svg, segments, filled) {
    if (!svg) return;
    var linesGroup = svg.querySelector("." + FAMILY_DIVISIONS_LINES_CLASS);
    if (!linesGroup) return;

    var count = Math.max(1, Math.round(segments));
    while (linesGroup.firstChild) {
      linesGroup.removeChild(linesGroup.firstChild);
    }

    var step = FAMILY_DIVISIONS_VIEWBOX_W / count;
    var top = FAMILY_DIVISIONS_INSET;
    var bottom = FAMILY_DIVISIONS_VIEWBOX_H - FAMILY_DIVISIONS_INSET;
    var i;

    // Internal divider lines (count - 1 evenly spaced verticals).
    for (i = 1; i < count; i++) {
      var x = step * i;
      appendFamilyLine(linesGroup, x, top, x, bottom);
    }

    // Fill each segment (1-based) with a shape, in an alternating pattern:
    //  - ODD segments (1st, 3rd, 5th ...) get a rhombus whose 4 corners touch
    //    the midpoints of the segment cell's edges.
    //  - EVEN segments (2nd, 4th ...) get an X.
    // `filled` (optional boolean array) controls which cells draw their shape;
    // empty cells show stipple dots instead. When omitted, every cell is drawn.
    var midY = (top + bottom) / 2;
    var innerLeftBound = FAMILY_DIVISIONS_INSET;
    var innerRightBound = FAMILY_DIVISIONS_VIEWBOX_W - FAMILY_DIVISIONS_INSET;
    for (i = 1; i <= count; i++) {
      var cellLeft = (i - 1) * step;
      var cellRight = i * step;

      if (filled && !filled[i - 1]) {
        var emptyLeft = Math.max(cellLeft, innerLeftBound);
        var emptyRight = Math.min(cellRight, innerRightBound);
        appendFamilyEmptyCellStipple(
          linesGroup,
          emptyLeft,
          top,
          emptyRight - emptyLeft,
          bottom - top,
          i
        );
        continue;
      }

      if (i % 2 === 1) {
        // Rhombus: corners touch the cell edges. For the outer cells the cell
        // edge is the viewBox border (0 / W), so clamp to the rectangle's inner
        // frame so no corner pokes past the outline.
        var rLeft = Math.max(cellLeft, innerLeftBound);
        var rRight = Math.min(cellRight, innerRightBound);
        var rMidX = (rLeft + rRight) / 2;
        var rhombus = document.createElementNS(SVG_NS, "polygon");
        rhombus.setAttribute(
          "points",
          rMidX + "," + top + " " +
            rRight + "," + midY + " " +
            rMidX + "," + bottom + " " +
            rLeft + "," + midY
        );
        rhombus.setAttribute("fill", FAMILY_DIVISIONS_STROKE);
        rhombus.setAttribute("stroke", FAMILY_DIVISIONS_STROKE);
        rhombus.setAttribute(
          "stroke-width",
          String(FAMILY_DIVISIONS_STROKE_WIDTH)
        );
        rhombus.setAttribute("vector-effect", "non-scaling-stroke");
        rhombus.setAttribute("stroke-linejoin", "miter");
        linesGroup.appendChild(rhombus);
      } else {
        // X: span the FULL cell width so the white triangles reach the divider
        // lines with no brown sliver in between. Clamp to the rectangle's inner
        // frame so an edge cell's X never pokes past the outline.
        var left = Math.max(cellLeft, innerLeftBound);
        var right = Math.min(cellRight, innerRightBound);
        var cx = (left + right) / 2;

        // Fill the two HORIZONTAL triangles of the X (left one pointing right,
        // right one pointing left) in white. Their apexes meet at the X centre;
        // the top and bottom triangles stay empty. Drawn first so the crisp X
        // lines sit on top.
        appendFamilyPolygon(
          linesGroup,
          left + "," + top + " " + cx + "," + midY + " " + left + "," + bottom,
          FAMILY_DIVISIONS_STROKE
        );
        appendFamilyPolygon(
          linesGroup,
          right + "," + top + " " + cx + "," + midY + " " + right + "," + bottom,
          FAMILY_DIVISIONS_STROKE
        );

        appendFamilyLine(linesGroup, left, top, right, bottom);
        appendFamilyLine(linesGroup, left, bottom, right, top);
      }
    }
  }

  function getFamilyDivisionsSvg(panel) {
    if (!panel) return null;
    return panel.querySelector(
      ".page2-home-signs__sign-icon--frame-line svg"
    );
  }

  function createFamilyDivisionsRow(entry) {
    var row = document.createElement("article");
    row.className =
      "page2-home-signs__sign-row page2-home-signs__sign-row--frame-line";
    row.setAttribute("data-sign-id", entry.id);
    row.setAttribute("data-sign-section", entry.section || "");

    var iconWrap = document.createElement("div");
    iconWrap.className =
      "page2-home-signs__sign-icon page2-home-signs__sign-icon--frame-line";

    var svg = createFamilyDivisionsSvg();
    renderFamilyDivisions(
      svg,
      FAMILY_DIVISIONS_MIN,
      createFamilyFilledArray(FAMILY_DIVISIONS_MIN)
    );
    iconWrap.appendChild(svg);
    row.appendChild(iconWrap);
    return row;
  }

  function populateFamilyAccordionPanel(panel) {
    var entries = entriesBySection.family || [];
    if (!entries.length) return;

    var listWrap = document.createElement("div");
    listWrap.className =
      "page2-home-signs__panel-list page2-home-signs__panel-list--frame-line";
    listWrap.setAttribute("data-sign-count", "1");

    listWrap.appendChild(createFamilyDivisionsRow(entries[0]));
    panel.appendChild(listWrap);
    panel.setAttribute("data-populated", "true");
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

  /**
   * Cycling sections (profile, feelings): build every sign row once, stacked in
   * the same centered cell (the CSS overlaps them), and mark only the first row
   * `is-cycle-active` so it is the one shown. startSignsCycleLoop then advances
   * which row is active over time.
   */
  function populateCyclingAccordionPanel(panel, sectionId) {
    var entries = entriesBySection[sectionId] || [];
    if (!entries.length) return;

    var listWrap = document.createElement("div");
    listWrap.className =
      "page2-home-signs__panel-list page2-home-signs__panel-list--cycle";
    listWrap.setAttribute("data-sign-count", String(entries.length));

    var fragment = document.createDocumentFragment();
    var i;
    var row;
    for (i = 0; i < entries.length; i++) {
      row = createSignListRow(entries[i]);
      if (i === 0) {
        row.classList.add("is-cycle-active");
      }
      fragment.appendChild(row);
    }
    listWrap.appendChild(fragment);
    panel.appendChild(listWrap);
    panel.setAttribute("data-populated", "true");
  }

  function populateAccordionPanel(sectionId) {
    var panel = document.getElementById("page2-home-signs-panel-" + sectionId);
    if (!panel || panel.getAttribute("data-populated") === "true") {
      return;
    }

    if (SIGNS_CYCLE_SECTIONS[sectionId]) {
      populateCyclingAccordionPanel(panel, sectionId);
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

    if (sectionId === "family") {
      populateFamilyAccordionPanel(panel);
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

  /**
   * Per-section auto-animation settings. Instead of dragging a slider, each
   * Signs visual animates on its own with a frame-synced (requestAnimationFrame)
   * loop that sweeps smoothly back and forth between `min` and `max`.
   *
   * - grid (kind "grid"): driven CONTINUOUSLY — the inner scale flows through
   *   every in-between value, so it glides like a dragged slider.
   * - bodyAutonomy (kind "fan"): whole fan steps with smooth eased motion.
   * - family (kind "family"): scripted sequence of division counts and fixed
   *   empty cells (stipple dots), one frame every `stepMs`.
   *
   * `sweepMs` = time for one min->max pass (grid/fan). Family uses `stepMs`.
   * `staticValue` = the single frame shown when the user prefers reduced motion.
   */
  var SIGNS_AUTO_ANIMATIONS = {
    grid: {
      kind: "grid",
      min: 1,
      max: 10,
      sweepMs: 2200,
      staticValue: 7,
    },
    bodyAutonomy: {
      kind: "fan",
      min: 1,
      max: 10,
      sweepMs: 4400,
      staticValue: 4,
    },
    family: {
      kind: "family",
      stepMs: FAMILY_ANIMATION_STEP_MS,
      staticValue: FAMILY_DIVISIONS_STATIC,
    },
  };

  /**
   * Sections whose signs are NOT shown all at once. Instead a single sign is
   * displayed in one fixed (centered) position and the visible sign swaps to the
   * next one every `intervalMs`, looping through the whole list. profile and
   * feelings use this so their many signs read one-at-a-time.
   */
  var SIGNS_CYCLE_SECTIONS = {
    profile: { intervalMs: 1000 },
    feelings: { intervalMs: 1000 },
  };

  function prefersReducedMotionSigns() {
    return !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /**
   * Grid only: feed a CONTINUOUS step value (e.g. 4.37) straight into the grid
   * icon geometry. innerScaleValueFromStep would round to whole steps, so here
   * we interpolate the internal inner-scale (INNER_SCALE_MIN..MAX) ourselves to
   * keep the motion perfectly fluid.
   */
  function setGridIconsInnerScaleContinuous(panel, stepFloat) {
    var icons = panel.querySelectorAll(
      ".page2-home-signs__sign-icon[data-grid-type]"
    );
    if (
      !icons.length ||
      !window.GridUnitIcons ||
      !window.GridUnitIcons.updateIconInnerScale
    ) {
      return;
    }
    var steps =
      typeof INNER_SCALE_STEPS !== "undefined" ? INNER_SCALE_STEPS : 10;
    var minScale =
      typeof INNER_SCALE_MIN !== "undefined" ? INNER_SCALE_MIN : 0.3;
    var maxScale =
      typeof INNER_SCALE_MAX !== "undefined" ? INNER_SCALE_MAX : 1;
    var t = steps > 1 ? (stepFloat - 1) / (steps - 1) : 1;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    var innerScale = minScale + t * (maxScale - minScale);

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
      window.GridUnitIcons.updateIconInnerScale(svg, gridType, innerScale);
    }
  }

  /**
   * Fan only (Signs page): we cannot touch the engine, which only has 11 whole
   * open/close positions. So on the Signs page we render ONE fully-open fan and
   * add our own *continuous* open/close stages with an angular wedge mask
   * anchored at the fan's hinge.
   *
   * The hinge (focal point) sits at the bottom-centre of the cropped fan icon
   * (x = 50%, y ~= 102% of the box, derived from CANVAS + the Signs crop rect).
   * The fan's LEFT rib is the fixed edge: a conic-gradient mask anchors its left
   * boundary at ~ -90deg (pointing left from the hinge) and grows the revealed
   * span clockwise toward the right. A tiny span keeps only the left rib =
   * closed; a ~180deg span reveals the whole fan = open. The left base stays
   * static while the fan unfolds/folds to the right. Masking never distorts the
   * art and is infinitely smooth.
   */
  var FAN_PIVOT_X = "50%";
  var FAN_PIVOT_Y = "102%";
  var FAN_LEFT_ANGLE = -90;
  var FAN_OPEN_SPAN = 180;
  /**
   * On the Signs page the fan should NOT collapse all the way to a single rib.
   * Instead the close phase stops while 3 fan leaves are still open (see the
   * reference image). The full fan has RADIAL_FAN_RIB_COUNT ribs spread evenly
   * across FAN_OPEN_SPAN (180deg), which makes (ribCount - 1) leaves between
   * them. We reveal FAN_CLOSED_LEAVES of those leaves at the most-closed point,
   * so the closed span = open span * (closed leaves / total leaves).
   */
  var FAN_CLOSED_LEAVES = 3;
  var FAN_TOTAL_LEAVES =
    (typeof RADIAL_FAN_RIB_COUNT !== "undefined" ? RADIAL_FAN_RIB_COUNT : 25) -
    1;
  var FAN_CLOSED_SPAN =
    FAN_TOTAL_LEAVES > 0
      ? FAN_OPEN_SPAN * (FAN_CLOSED_LEAVES / FAN_TOTAL_LEAVES)
      : 12;
  var FAN_OPEN_BASE_STEP =
    typeof WEAR_CONTROL_OPENING_STEP_MIN !== "undefined"
      ? WEAR_CONTROL_OPENING_STEP_MIN
      : 0;

  function fanWedgeMask(spanDeg) {
    var span = spanDeg.toFixed(2);
    return (
      "conic-gradient(from " +
      FAN_LEFT_ANGLE +
      "deg at " +
      FAN_PIVOT_X +
      " " +
      FAN_PIVOT_Y +
      ", #000 0deg, #000 " +
      span +
      "deg, transparent " +
      span +
      "deg)"
    );
  }

  function applyFanWedge(svg, spanDeg) {
    var mask = fanWedgeMask(spanDeg);
    svg.style.webkitMaskImage = mask;
    svg.style.maskImage = mask;
  }

  function ensureFanBaseSvg(panel) {
    if (
      !window.UnderCoverSignPreviews ||
      !window.UnderCoverSignPreviews.isReady ||
      !window.UnderCoverSignPreviews.isReady() ||
      typeof window.UnderCoverSignPreviews.renderPreview !== "function"
    ) {
      return null;
    }

    var row = panel.querySelector('[data-preview-id="fanLeaves"]');
    if (!row) return null;
    var iconWrap = row.querySelector(".page2-home-signs__sign-icon");
    if (!iconWrap) return null;

    var existing = iconWrap.querySelector("svg[data-fan-base]");
    if (existing) return existing;

    var svg = window.UnderCoverSignPreviews.renderPreview("fanLeaves", {
      fanLeavesStep: FAN_OPEN_BASE_STEP,
      signsFanTightCrop: true,
      signsFanPreserveClip: true,
    });
    if (!svg) return null;

    svg.setAttribute("data-fan-base", "1");
    iconWrap.innerHTML = "";
    iconWrap.appendChild(svg);
    applySignSvgColors(svg, "fanLeaves");
    row.setAttribute("data-preview-hydrated", "true");
    return svg;
  }

  /**
   * Draw one frame for a section. Grid flows continuously; fan reveals a
   * continuous angular wedge over a single open frame. (Family runs both
   * division ping-pong and cell toggles in startFamilySignAnimationLoop.)
   */
  function renderSignsAnimationFrame(panel, cfg, valueFloat, loopState) {
    if (cfg.kind === "grid") {
      setGridIconsInnerScaleContinuous(panel, valueFloat);
      return;
    }

    if (cfg.kind === "fan") {
      if (!loopState.fanBase || !loopState.fanBase.isConnected) {
        loopState.fanBase = ensureFanBaseSvg(panel);
        if (!loopState.fanBase) return;
      }
      var tNorm = (valueFloat - cfg.min) / (cfg.max - cfg.min);
      if (tNorm < 0) tNorm = 0;
      if (tNorm > 1) tNorm = 1;
      // Loop starts at tNorm 0 = closed; tNorm 1 = fully open. Left edge fixed,
      // right edge sweeps open.
      var span = FAN_CLOSED_SPAN + tNorm * (FAN_OPEN_SPAN - FAN_CLOSED_SPAN);
      applyFanWedge(loopState.fanBase, span);
    }
  }

  /**
   * Family sign: 3→4→5, then empty/fill cells 2+4 (only at 5 divisions), then 4→3.
   */
  function startFamilySignAnimationLoop(sectionId, cfg, panel) {
    if (!cfg || !panel) return;
    stopSignsAnimationLoop(sectionId);

    var svg = getFamilyDivisionsSvg(panel);
    if (!svg) return;

    var sequence = FAMILY_ANIMATION_SEQUENCE;
    var staticValue = cfg.staticValue != null ? cfg.staticValue : FAMILY_DIVISIONS_STATIC;

    if (prefersReducedMotionSigns()) {
      renderFamilyDivisions(
        svg,
        staticValue,
        createFamilyFilledArray(staticValue)
      );
      return;
    }

    var stepMs = cfg.stepMs || FAMILY_ANIMATION_STEP_MS;

    renderFamilyAnimationStep(svg, sequence[0]);

    var loopState = {
      raf: 0,
      startTime: null,
      lastFrameIndex: 0,
    };

    function frame(now) {
      if (loopState.startTime === null) loopState.startTime = now;
      var elapsed = now - loopState.startTime;
      var frameIndex =
        Math.floor(elapsed / stepMs) % sequence.length;

      if (frameIndex !== loopState.lastFrameIndex) {
        loopState.lastFrameIndex = frameIndex;
        renderFamilyAnimationStep(svg, sequence[frameIndex]);
      }

      loopState.raf = window.requestAnimationFrame(frame);
    }

    loopState.raf = window.requestAnimationFrame(frame);
    signsAnimationLoops[sectionId] = loopState;
  }

  function stopSignsAnimationLoop(sectionId) {
    var loop = signsAnimationLoops[sectionId];
    if (loop && loop.raf) {
      window.cancelAnimationFrame(loop.raf);
    }
    delete signsAnimationLoops[sectionId];
  }

  function stopAllSignsAnimationLoops() {
    var key;
    for (key in signsAnimationLoops) {
      if (!signsAnimationLoops.hasOwnProperty(key)) continue;
      if (signsAnimationLoops[key].raf) {
        window.cancelAnimationFrame(signsAnimationLoops[key].raf);
      }
    }
    signsAnimationLoops = {};
  }

  /**
   * Frame-synced ping-pong loop. A sine curve gives a value that eases in and
   * out at both ends (slow near fully open / fully closed, quicker through the
   * middle), so the sweep reads as a smooth, breathing open/close rather than a
   * series of ticks.
   */
  function startSignsAnimationLoop(sectionId, cfg, panel) {
    if (!cfg || !panel) return;

    if (cfg.kind === "family") {
      startFamilySignAnimationLoop(sectionId, cfg, panel);
      return;
    }

    stopSignsAnimationLoop(sectionId);

    var min = cfg.min;
    var max = cfg.max;
    if (!isFinite(min) || !isFinite(max) || max <= min) return;

    var loopState = { raf: 0, lastStep: null, startTime: null };

    if (cfg.static || prefersReducedMotionSigns()) {
      var staticValue =
        cfg.staticValue != null ? cfg.staticValue : (min + max) / 2;
      if (cfg.kind === "grid") {
        setGridIconsInnerScaleContinuous(panel, staticValue);
      } else if (cfg.kind === "fan") {
        updateFanPreview(panel, Math.round(staticValue));
      }
      return;
    }

    var sweepMs = cfg.sweepMs || 2200;
    var periodMs = sweepMs * 2;

    function frame(now) {
      if (loopState.startTime === null) loopState.startTime = now;
      var elapsed = now - loopState.startTime;
      var theta = ((elapsed % periodMs) / periodMs) * 2 * Math.PI;
      var eased = 0.5 - 0.5 * Math.cos(theta);
      var value = min + eased * (max - min);
      renderSignsAnimationFrame(panel, cfg, value, loopState);
      loopState.raf = window.requestAnimationFrame(frame);
    }

    loopState.raf = window.requestAnimationFrame(frame);
    signsAnimationLoops[sectionId] = loopState;
  }

  /**
   * Cycle loop: every `intervalMs` move the `is-cycle-active` class to the next
   * sign row, wrapping back to the first. Frame-synced via requestAnimationFrame
   * and stored in signsAnimationLoops so the existing pause/resume/stop helpers
   * (which cancel `loop.raf`) clean it up too. When the user prefers reduced
   * motion we leave the first sign showing and never loop.
   */
  function startSignsCycleLoop(sectionId, cfg, panel) {
    if (!cfg || !panel) return;
    stopSignsAnimationLoop(sectionId);

    var rows = panel.querySelectorAll(".page2-home-signs__sign-row");
    if (!rows.length) return;

    var activeIndex = 0;
    var i;
    for (i = 0; i < rows.length; i++) {
      rows[i].classList.toggle("is-cycle-active", i === 0);
    }

    if (rows.length < 2 || prefersReducedMotionSigns()) {
      return;
    }

    var intervalMs = cfg.intervalMs || 500;
    var loopState = { raf: 0, startTime: null };

    function frame(now) {
      if (loopState.startTime === null) loopState.startTime = now;
      var elapsed = now - loopState.startTime;
      var nextIndex = Math.floor(elapsed / intervalMs) % rows.length;
      if (nextIndex !== activeIndex) {
        rows[activeIndex].classList.remove("is-cycle-active");
        rows[nextIndex].classList.add("is-cycle-active");
        activeIndex = nextIndex;
      }
      loopState.raf = window.requestAnimationFrame(frame);
    }

    loopState.raf = window.requestAnimationFrame(frame);
    signsAnimationLoops[sectionId] = loopState;
  }

  function startSignsAnimationForSection(sectionId) {
    var panel = document.getElementById("page2-home-signs-panel-" + sectionId);
    if (!panel) return;

    if (SIGNS_CYCLE_SECTIONS[sectionId]) {
      startSignsCycleLoop(sectionId, SIGNS_CYCLE_SECTIONS[sectionId], panel);
      return;
    }

    var cfg = SIGNS_AUTO_ANIMATIONS[sectionId];
    if (!cfg) return;
    startSignsAnimationLoop(sectionId, cfg, panel);
  }

  function pauseSignsAnimations() {
    stopAllSignsAnimationLoops();
  }

  function resumeSignsAnimations() {
    var sectionId;
    for (sectionId in SIGNS_AUTO_ANIMATIONS) {
      if (!SIGNS_AUTO_ANIMATIONS.hasOwnProperty(sectionId)) continue;
      startSignsAnimationForSection(sectionId);
    }
    for (sectionId in SIGNS_CYCLE_SECTIONS) {
      if (!SIGNS_CYCLE_SECTIONS.hasOwnProperty(sectionId)) continue;
      startSignsAnimationForSection(sectionId);
    }
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

    var title = createBilingualBlock(
      sectionMeta.label || sectionMeta.id,
      sectionMeta.labelFa || "",
      "page2-home-signs__title"
    );

    // Small decorative square that sits exactly in the middle between the
    // English title (grid column 2) and the Persian title (grid column 3).
    // It reuses the same square token as the page header separator so the
    // visual language stays consistent, and is hidden from assistive tech.
    var titleSep = document.createElement("span");
    titleSep.className = "page2-home-signs__title-sep";
    titleSep.setAttribute("aria-hidden", "true");
    title.appendChild(titleSep);

    var desc = createBilingualBlock(
      sectionMeta.description || "",
      sectionMeta.descriptionFa || "",
      "page2-home-signs__desc"
    );
    if (!sectionMeta.description && !sectionMeta.descriptionFa) {
      desc.classList.add("page2-home-signs__desc--empty");
    }

    trigger.appendChild(title);
    trigger.appendChild(desc);

    var panel = document.createElement("div");
    panel.className = "page2-home-signs__panel";
    panel.id = "page2-home-signs-panel-" + sectionMeta.id;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", trigger.id);
    panel.hidden = true;

    // Signs page is always-open now: the header is a static label, not a
    // toggle, so we intentionally do not attach click/keydown listeners.

    item.appendChild(trigger);
    item.appendChild(panel);
    return item;
  }

  function buildHomeSignsAccordion() {
    if (built) return;

    var listPrefixEl = document.getElementById("page2-home-signs-list-prefix");
    var listSuffixEl = document.getElementById("page2-home-signs-list-suffix");
    if (!listPrefixEl || !listSuffixEl) return;

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

    var prefixFragment = document.createDocumentFragment();
    var suffixFragment = document.createDocumentFragment();
    accordionItems = [];

    var i;
    var sectionMeta;
    var item;
    var targetFragment;
    for (i = 0; i < catalog.sections.length; i++) {
      sectionMeta = catalog.sections[i];
      if (!entriesBySection[sectionMeta.id]) continue;

      item = createAccordionItem(sectionMeta, accordionItems.length);
      accordionItems.push(item);
      targetFragment =
        sectionMeta.id === "feelings" ? suffixFragment : prefixFragment;
      targetFragment.appendChild(item);
    }

    listPrefixEl.appendChild(prefixFragment);
    listSuffixEl.appendChild(suffixFragment);
    built = true;
    openAllSections();
  }

  /**
   * Signs page now has no closed state: every section is permanently expanded.
   * We mark all items open, populate + hydrate their panels, and start each
   * section's auto-animation loop so all visuals animate at once (the per-loop
   * stop in startSignsAnimationLoop is scoped to its own section id, so the
   * loops coexist instead of cancelling each other).
   */
  function openAllSections() {
    var i;
    var item;
    var sectionId;
    var trigger;
    var panel;
    for (i = 0; i < accordionItems.length; i++) {
      item = accordionItems[i];
      sectionId = item.getAttribute("data-sign-section");
      item.classList.add("is-expanded");
      trigger = item.querySelector(".page2-home-signs__trigger");
      panel = item.querySelector(".page2-home-signs__panel");
      if (trigger) {
        trigger.setAttribute("aria-expanded", "true");
      }
      if (panel) {
        panel.hidden = false;
      }
      populateAccordionPanel(sectionId);
      hydrateCanvasPreviewsForSection(sectionId);
      startSignsAnimationForSection(sectionId);
    }
    updateScrollability();
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

    if (sectionId === "family") {
      // Standalone locally-drawn rectangle; initial state matches loop start (min).
      var familyPanel = document.getElementById(
        "page2-home-signs-panel-family"
      );
      if (familyPanel && familyPanel.getAttribute("data-populated") === "true") {
        renderFamilyDivisions(
          getFamilyDivisionsSvg(familyPanel),
          FAMILY_DIVISIONS_MIN,
          createFamilyFilledArray(FAMILY_DIVISIONS_MIN)
        );
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
    // All sections are open, so re-hydrate every preview row at once.
    hydrateCanvasPreviews();
  }

  function init() {
    buildSignsLayout();

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        pauseSignsAnimations();
      } else {
        resumeSignsAnimations();
      }
    });
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
    hydrateCanvasPreviews: hydrateCanvasPreviews,
  };
})();
