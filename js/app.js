(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var designSvg = null;
  var lastOctagonsN = OCTAGONS_N_DEFAULT;
  var lastTileSize = CANVAS_W / (OCTAGONS_N_DEFAULT + 1);
  var cachedAllSegments = [];
  var cachedVerticalGridLines = [];
  var lastVerticalGridLayoutSignature = "";

  var interactionMode = "view";
  var removedEdges = new Set();
  var dragPath = [];
  var isDragging = false;

  var circleSelectedIds = new Set();
  var lastCircleLayoutSignature = "";
  var diamondFilledIds = new Set();
  var lastDiamondLayoutSignature = "";
  var bgDirection = BG_DIRECTION_DEFAULT;
  var bgGradientEnabled = false;

  var GRADIENT_OFFSETS = ["0%", "25%", "50%", "75%", "100%"];

  /**
   * Symmetric border thickness (px) so the white ring area = CANVAS_BORDER_AREA_RATIO × canvas.
   * Solves 2b(W+H) − 4b² = ratio·W·H for the smaller root.
   * @returns {number}
   */
  function getCanvasBorderPx() {
    var target = CANVAS_BORDER_AREA_RATIO * CANVAS_W * CANVAS_H;
    var halfPerimeter = CANVAS_W + CANVAS_H;
    var disc = halfPerimeter * halfPerimeter - 4 * target;
    if (disc < 0) disc = 0;
    return Math.max(0, (halfPerimeter - Math.sqrt(disc)) / 4);
  }

  /** Uniform scale so circles/octagons keep correct proportions (never stretch X vs Y). */
  function getInnerContentScale() {
    var border = getCanvasBorderPx();
    return Math.min(
      (CANVAS_W - 2 * border) / CANVAS_W,
      (CANVAS_H - 2 * border) / CANVAS_H
    );
  }

  /** Top-left of scaled content inside the symmetric border inset (centers when letterboxing). */
  function getInnerContentOffset() {
    var border = getCanvasBorderPx();
    var s = getInnerContentScale();
    var innerW = CANVAS_W - 2 * border;
    var innerH = CANVAS_H - 2 * border;
    return {
      x: border + (innerW - CANVAS_W * s) / 2,
      y: border + (innerH - CANVAS_H * s) / 2,
    };
  }

  function getInnerContentTransformAttr() {
    var off = getInnerContentOffset();
    var s = getInnerContentScale();
    return "translate(" + off.x + "," + off.y + ") scale(" + s + ")";
  }

  function elSvg(name) {
    return document.createElementNS(NS, name);
  }

  function getOctagonsN() {
    var slider = document.getElementById("octagons-n");
    var v = slider ? Number(slider.value) : OCTAGONS_N_DEFAULT;
    return Math.min(OCTAGONS_N_MAX, Math.max(OCTAGONS_N_MIN, Math.round(v)));
  }

  function getInnerScale() {
    var slider = document.getElementById("inner-scale");
    var v = slider ? Number(slider.value) : INNER_SCALE_DEFAULT;
    return Math.min(
      INNER_SCALE_MAX,
      Math.max(INNER_SCALE_MIN, Math.round(v * 100) / 100)
    );
  }

  function getCircleDensity() {
    var slider = document.getElementById("circle-density");
    var v = slider ? Number(slider.value) : CIRCLE_DENSITY_DEFAULT;
    return Math.min(
      CIRCLE_DENSITY_MAX,
      Math.max(CIRCLE_DENSITY_MIN, Math.round(v))
    );
  }

  function getGridStrokeWidth() {
    var slider = document.getElementById("grid-stroke-width");
    var v = slider ? Number(slider.value) : GRID_STROKE_WIDTH_DEFAULT;
    return Math.min(
      GRID_STROKE_WIDTH_MAX,
      Math.max(GRID_STROKE_WIDTH_MIN, Math.round(v))
    );
  }

  function getCircleStrokeWidth() {
    return getGridStrokeWidth() * 2;
  }

  function getPatternStrokeColor() {
    var input = document.getElementById("pattern-stroke-color");
    return normalizeHexColor(
      input ? input.value : null,
      PATTERN_STROKE_COLOR_DEFAULT
    );
  }

  function getDiamondFillColor() {
    return DIAMOND_FILL_COLOR_DEFAULT;
  }

  function normalizeHexColor(value, fallback) {
    if (!value || typeof value !== "string") return fallback;
    var v = value.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(v)) return v;
    return fallback;
  }

  function isBgGradientEnabled() {
    return bgGradientEnabled;
  }

  function getBgDirection() {
    return bgDirection === "horizontal" ? "horizontal" : "vertical";
  }

  function clearBgGradients(defs) {
    var existing = defs.querySelectorAll("#bg-grad-normal, #bg-grad-mirror");
    for (var e = 0; e < existing.length; e++) {
      defs.removeChild(existing[e]);
    }
  }

  function getBgColors() {
    var c1 = document.getElementById("bg-color-1");
    var c2 = document.getElementById("bg-color-2");
    var c3 = document.getElementById("bg-color-3");
    return [
      normalizeHexColor(c1 ? c1.value : null, BG_COLOR_1_DEFAULT),
      normalizeHexColor(c2 ? c2.value : null, BG_COLOR_2_DEFAULT),
      normalizeHexColor(c3 ? c3.value : null, BG_COLOR_3_DEFAULT),
    ];
  }

  /**
   * @param {boolean} mirrored
   * @returns {string[]}
   */
  function getGradientStopColors(mirrored) {
    var colors = getBgColors();
    if (mirrored) {
      return [colors[2], colors[1], colors[0], colors[1], colors[2]];
    }
    return [colors[0], colors[1], colors[2], colors[1], colors[0]];
  }

  /**
   * @param {string} direction
   * @returns {{ x1: string, y1: string, x2: string, y2: string }}
   */
  function getGradientAxisAttrs(direction) {
    if (direction === "horizontal") {
      return { x1: "0%", y1: "0%", x2: "0%", y2: "100%" };
    }
    return { x1: "0%", y1: "0%", x2: "100%", y2: "0%" };
  }

  /**
   * @param {string} direction
   * @returns {{ x: number, y: number, w: number, h: number }[]}
   */
  function getBackgroundSections(direction) {
    var ratios = BG_SECTION_RATIOS;
    var sections = [];
    var i;
    if (direction === "horizontal") {
      var y = 0;
      for (i = 0; i < ratios.length; i++) {
        var h =
          i === ratios.length - 1
            ? CANVAS_H - y
            : CANVAS_H * ratios[i];
        sections.push({ x: 0, y: y, w: CANVAS_W, h: h });
        y += h;
      }
    } else {
      var x = 0;
      for (i = 0; i < ratios.length; i++) {
        var w =
          i === ratios.length - 1
            ? CANVAS_W - x
            : CANVAS_W * ratios[i];
        sections.push({ x: x, y: 0, w: w, h: CANVAS_H });
        x += w;
      }
    }
    return sections;
  }

  /**
   * @param {string[]} lines
   * @param {string} id
   * @param {boolean} mirrored
   * @param {string} direction
   */
  function pushGradientExportLines(lines, id, mirrored, direction) {
    var axis = getGradientAxisAttrs(direction);
    var stops = getGradientStopColors(mirrored);
    lines.push(
      '<linearGradient id="' +
        id +
        '" gradientUnits="objectBoundingBox" x1="' +
        axis.x1 +
        '" y1="' +
        axis.y1 +
        '" x2="' +
        axis.x2 +
        '" y2="' +
        axis.y2 +
        '">'
    );
    for (var s = 0; s < stops.length; s++) {
      lines.push(
        '<stop offset="' +
          GRADIENT_OFFSETS[s] +
          '" stop-color="' +
          stops[s] +
          '"/>'
      );
    }
    lines.push("</linearGradient>");
  }

  /**
   * @param {string[]} lines
   */
  function pushBackgroundExportLines(lines) {
    if (!isBgGradientEnabled()) {
      lines.push(
        '<rect x="0" y="0" width="' +
          CANVAS_W +
          '" height="' +
          CANVAS_H +
          '" fill="' +
          BG_COLOR +
          '"/>'
      );
      return;
    }
    var direction = getBgDirection();
    lines.push("<defs>");
    pushGradientExportLines(lines, "bg-grad-normal", false, direction);
    pushGradientExportLines(lines, "bg-grad-mirror", true, direction);
    lines.push("</defs>");
    var sections = getBackgroundSections(direction);
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      var fill = i % 2 === 0 ? "url(#bg-grad-normal)" : "url(#bg-grad-mirror)";
      lines.push(
        '<rect x="' +
          sec.x +
          '" y="' +
          sec.y +
          '" width="' +
          sec.w +
          '" height="' +
          sec.h +
          '" fill="' +
          fill +
          '"/>'
      );
    }
  }

  /**
   * @param {SVGElement} defs
   * @param {string} direction
   */
  function updateDefsGradients(defs, direction) {
    clearBgGradients(defs);

    function appendGradient(id, mirrored) {
      var grad = elSvg("linearGradient");
      grad.setAttribute("id", id);
      grad.setAttribute("gradientUnits", "objectBoundingBox");
      var axis = getGradientAxisAttrs(direction);
      grad.setAttribute("x1", axis.x1);
      grad.setAttribute("y1", axis.y1);
      grad.setAttribute("x2", axis.x2);
      grad.setAttribute("y2", axis.y2);
      var stops = getGradientStopColors(mirrored);
      for (var s = 0; s < stops.length; s++) {
        var stop = elSvg("stop");
        stop.setAttribute("offset", GRADIENT_OFFSETS[s]);
        stop.setAttribute("stop-color", stops[s]);
        grad.appendChild(stop);
      }
      defs.appendChild(grad);
    }

    appendGradient("bg-grad-normal", false);
    appendGradient("bg-grad-mirror", true);
  }

  function renderBackgroundLayer() {
    if (!designSvg) return;
    var defs = designSvg.querySelector("defs");
    var layer = designSvg.querySelector("#layer-background");
    if (!defs || !layer) return;

    while (layer.firstChild) layer.removeChild(layer.firstChild);

    if (!isBgGradientEnabled()) {
      clearBgGradients(defs);
      var whiteRect = elSvg("rect");
      whiteRect.setAttribute("x", "0");
      whiteRect.setAttribute("y", "0");
      whiteRect.setAttribute("width", String(CANVAS_W));
      whiteRect.setAttribute("height", String(CANVAS_H));
      whiteRect.setAttribute("fill", BG_COLOR);
      layer.appendChild(whiteRect);
      return;
    }

    var direction = getBgDirection();
    updateDefsGradients(defs, direction);
    var sections = getBackgroundSections(direction);
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      var rect = elSvg("rect");
      rect.setAttribute("x", String(sec.x));
      rect.setAttribute("y", String(sec.y));
      rect.setAttribute("width", String(sec.w));
      rect.setAttribute("height", String(sec.h));
      rect.setAttribute(
        "fill",
        i % 2 === 0 ? "url(#bg-grad-normal)" : "url(#bg-grad-mirror)"
      );
      layer.appendChild(rect);
    }
  }

  function updateBgWhiteToggleUi() {
    var btn = document.getElementById("bg-white-toggle-btn");
    var controls = document.getElementById("bg-gradient-controls");
    var isWhite = !isBgGradientEnabled();
    if (btn) {
      btn.classList.toggle("is-active", isWhite);
      btn.setAttribute("aria-pressed", String(isWhite));
      btn.textContent = isWhite ? "Show gradient" : "White background";
    }
    if (controls) {
      controls.classList.toggle("is-disabled", isWhite);
    }
  }

  function setBgGradientEnabled(enabled) {
    bgGradientEnabled = !!enabled;
    updateBgWhiteToggleUi();
    renderBackgroundLayer();
  }

  function toggleBgWhite() {
    setBgGradientEnabled(!bgGradientEnabled);
  }

  function updateBgDirectionUi() {
    var verticalBtn = document.getElementById("bg-direction-vertical-btn");
    var horizontalBtn = document.getElementById("bg-direction-horizontal-btn");
    var isVertical = getBgDirection() === "vertical";
    if (verticalBtn) {
      verticalBtn.classList.toggle("is-active", isVertical);
      verticalBtn.setAttribute("aria-pressed", String(isVertical));
    }
    if (horizontalBtn) {
      horizontalBtn.classList.toggle("is-active", !isVertical);
      horizontalBtn.setAttribute("aria-pressed", String(!isVertical));
    }
  }

  function setBgDirection(direction) {
    bgDirection = direction === "horizontal" ? "horizontal" : "vertical";
    updateBgDirectionUi();
    renderBackgroundLayer();
  }

  function buildLayoutSignature() {
    return lastOctagonsN + "|" + CANVAS_W + "|" + CANVAS_H;
  }

  function getUprightSquareCatalog() {
    return TopkapiGeometry.buildUprightSquareCatalog(
      lastOctagonsN,
      CANVAS_W,
      CANVAS_H
    );
  }

  function getDiamondCatalog() {
    return TopkapiGeometry.buildDiamondCatalog(
      lastOctagonsN,
      CANVAS_W,
      CANVAS_H,
      getInnerScale()
    );
  }

  function buildDiamondLayoutSignature() {
    return (
      lastOctagonsN +
      "|" +
      getInnerScale() +
      "|" +
      CANVAS_W +
      "|" +
      CANVAS_H
    );
  }

  /**
   * @param {{ id: string }[]} catalog
   * @param {number} count
   * @returns {string[]}
   */
  function shufflePickIds(catalog, count) {
    var ids = catalog.map(function (item) {
      return item.id;
    });
    for (var i = ids.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = ids[i];
      ids[i] = ids[j];
      ids[j] = tmp;
    }
    return ids.slice(0, count);
  }

  /**
   * @param {boolean} forceReshuffle
   */
  function syncCircleSelection(forceReshuffle) {
    var catalog = getUprightSquareCatalog();
    var validIds = new Set();
    for (var i = 0; i < catalog.length; i++) {
      validIds.add(catalog[i].id);
    }

    if (!forceReshuffle) {
      circleSelectedIds.forEach(function (id) {
        if (!validIds.has(id)) circleSelectedIds.delete(id);
      });
    }

    var density = getCircleDensity();
    var target = Math.round((catalog.length * density) / 100);
    if (target < 0) target = 0;
    if (target > catalog.length) target = catalog.length;

    if (forceReshuffle || circleSelectedIds.size !== target) {
      circleSelectedIds.clear();
      var picked = shufflePickIds(catalog, target);
      for (var p = 0; p < picked.length; p++) {
        circleSelectedIds.add(picked[p]);
      }
    }
  }

  /**
   * @param {boolean} forceReshuffle
   */
  function syncDiamondFill(forceReshuffle) {
    var catalog = getDiamondCatalog();
    var validIds = new Set();
    for (var i = 0; i < catalog.length; i++) {
      validIds.add(catalog[i].id);
    }

    if (!forceReshuffle) {
      diamondFilledIds.forEach(function (id) {
        if (!validIds.has(id)) diamondFilledIds.delete(id);
      });
    }

    var target = Math.round((catalog.length * DIAMOND_FILL_PERCENT) / 100);
    if (target < 0) target = 0;
    if (target > catalog.length) target = catalog.length;

    if (forceReshuffle || diamondFilledIds.size !== target) {
      diamondFilledIds.clear();
      var picked = shufflePickIds(catalog, target);
      for (var p = 0; p < picked.length; p++) {
        diamondFilledIds.add(picked[p]);
      }
    }
  }

  /**
   * @returns {{ id: string, points: { x: number, y: number }[] }[]}
   */
  function getFilledDiamonds() {
    var catalog = getDiamondCatalog();
    var filled = [];
    for (var i = 0; i < catalog.length; i++) {
      var dm = catalog[i];
      if (diamondFilledIds.has(dm.id)) filled.push(dm);
    }
    return filled;
  }

  /**
   * @param {{ id: string, points: { x: number, y: number }[] }[]} diamonds
   * @returns {SVGElement}
   */
  function diamondsToGroup(diamonds) {
    var g = elSvg("g");
    var fillColor = getDiamondFillColor();
    for (var i = 0; i < diamonds.length; i++) {
      var dm = diamonds[i];
      var pts = dm.points;
      var pointsAttr = "";
      for (var p = 0; p < pts.length; p++) {
        if (p) pointsAttr += " ";
        pointsAttr += pts[p].x + "," + pts[p].y;
      }
      var poly = elSvg("polygon");
      poly.setAttribute("points", pointsAttr);
      poly.setAttribute("fill", fillColor);
      poly.setAttribute("stroke", "none");
      g.appendChild(poly);
    }
    return g;
  }

  /**
   * @returns {{ cx: number, cy: number, r: number }[]}
   */
  function getActiveCircles() {
    var catalog = getUprightSquareCatalog();
    var circles = [];
    for (var i = 0; i < catalog.length; i++) {
      var sq = catalog[i];
      if (circleSelectedIds.has(sq.id)) {
        circles.push({ cx: sq.cx, cy: sq.cy, r: sq.r });
      }
    }
    return circles;
  }

  /**
   * @param {{ cx: number, cy: number, r: number }[]} circles
   * @returns {SVGElement}
   */
  function circlesToGroup(circles) {
    var g = elSvg("g");
    g.setAttribute("id", "layer-circles");
    g.setAttribute("fill", "none");
    var circleStroke = getCircleStrokeWidth();
    g.setAttribute("stroke", getPatternStrokeColor());
    g.setAttribute("stroke-width", String(circleStroke));

    var strokeInset = circleStroke / 2;
    for (var i = 0; i < circles.length; i++) {
      var c = circles[i];
      var circle = elSvg("circle");
      circle.setAttribute("cx", String(c.cx));
      circle.setAttribute("cy", String(c.cy));
      circle.setAttribute("r", String(Math.max(0, c.r - strokeInset)));
      g.appendChild(circle);
    }
    return g;
  }

  function updateLayoutState() {
    lastOctagonsN = getOctagonsN();
    lastTileSize = TopkapiGeometry.tileSizeFromN(lastOctagonsN, CANVAS_W);
  }

  function buildAllSegments() {
    return TopkapiGeometry.buildPatternSegments(
      lastTileSize,
      CANVAS_W,
      CANVAS_H,
      lastOctagonsN,
      getInnerScale()
    );
  }

  function getVisibleSegments(segments) {
    var visible = [];
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      var key = TopkapiGeometry.segmentKey(s.x1, s.y1, s.x2, s.y2);
      if (!removedEdges.has(key)) visible.push(s);
    }
    return visible;
  }

  function isDragInteractionMode() {
    return interactionMode === "merge" || interactionMode === "restore";
  }

  function clearMergeState() {
    removedEdges.clear();
    updateResetButton();
  }

  function updateResetButton() {
    var resetBtn = document.getElementById("reset-grid-btn");
    if (resetBtn) resetBtn.disabled = removedEdges.size === 0;
  }

  /**
   * @param {{x1:number,y1:number,x2:number,y2:number}[]} segments
   * @returns {SVGElement}
   */
  function segmentsToGroup(segments) {
    var g = elSvg("g");
    g.setAttribute("fill", "none");
    g.setAttribute("stroke", getPatternStrokeColor());
    g.setAttribute("stroke-width", String(getGridStrokeWidth()));
    g.setAttribute("stroke-linecap", "square");
    g.setAttribute("stroke-linejoin", "miter");

    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      var key = TopkapiGeometry.segmentKey(s.x1, s.y1, s.x2, s.y2);
      var line = elSvg("line");
      line.setAttribute("x1", String(s.x1));
      line.setAttribute("y1", String(s.y1));
      line.setAttribute("x2", String(s.x2));
      line.setAttribute("y2", String(s.y2));
      line.setAttribute("data-key", key);
      g.appendChild(line);
    }
    return g;
  }

  function getGridContentBounds() {
    return TopkapiGeometry.getGridContentBounds(
      lastOctagonsN,
      CANVAS_W,
      CANVAS_H
    );
  }

  function getVerticalGridStrokeWidth() {
    return getGridStrokeWidth() * 2;
  }

  function buildVerticalGridLayoutSignature() {
    var removedKeys = [];
    removedEdges.forEach(function (key) {
      removedKeys.push(key);
    });
    removedKeys.sort();
    return (
      lastOctagonsN +
      "|" +
      getInnerScale() +
      "|" +
      CANVAS_W +
      "|" +
      CANVAS_H +
      "|" +
      removedKeys.join(",")
    );
  }

  function pickVerticalShortenMode() {
    var r = Math.random();
    if (r < 0.2) return "full";
    if (r < 0.45) return "top";
    if (r < 0.7) return "bottom";
    return "both";
  }

  function randomVerticalTrimAmount() {
    return CANVAS_H * (0.05 + Math.random() * 0.35);
  }

  /**
   * @param {number} x
   * @param {number} yTop
   * @param {number} yBottom
   * @returns {{ x: number, y1: number, y2: number } | null}
   */
  function buildRandomizedVerticalLine(x, yTop, yBottom) {
    var mode = pickVerticalShortenMode();
    var y1 = yTop;
    var y2 = yBottom;

    if (mode === "top" || mode === "both") {
      y1 = yTop + randomVerticalTrimAmount();
    }
    if (mode === "bottom" || mode === "both") {
      y2 = yBottom - randomVerticalTrimAmount();
    }

    y1 = Math.max(yTop, Math.min(y1, yBottom));
    y2 = Math.max(yTop, Math.min(y2, yBottom));
    if (y2 <= y1) return null;

    return { x: x, y1: y1, y2: y2 };
  }

  /**
   * Left third of the grid content area (inner frame), inclusive.
   * @param {number} x
   * @param {{ x: number, width: number }} bounds
   * @returns {boolean}
   */
  function isVerticalLineXInLeftThird(x, bounds) {
    var left = bounds.x;
    var right = bounds.x + bounds.width / 3;
    return x >= left && x <= right;
  }

  /** Half octagon side: ((√2 - 1) × tileSize) / 2 — follows octagons-per-row slider. */
  function getVerticalLineMinDistance() {
    return ((Math.SQRT2 - 1) * lastTileSize) / 2;
  }

  /**
   * @param {number} x
   * @param {number} otherX
   * @param {number} minDist
   * @returns {boolean}
   */
  function isVerticalLineTooClose(x, otherX, minDist) {
    return Math.abs(x - otherX) < minDist;
  }

  /**
   * @param {boolean} force
   */
  function syncVerticalGridLines(force) {
    var sig = buildVerticalGridLayoutSignature();
    if (!force && sig === lastVerticalGridLayoutSignature) return;
    lastVerticalGridLayoutSignature = sig;

    var visible = getVisibleSegments(cachedAllSegments);
    var xs = TopkapiGeometry.collectUniqueGridXCoords(visible);
    var bounds = getGridContentBounds();
    var yTop = bounds.y;
    var yBottom = bounds.y + bounds.height;
    var minDist = getVerticalLineMinDistance();
    var lines = [];
    var lastPlacedX = null;
    var i;
    var line;

    for (i = 0; i < xs.length; i++) {
      if (!isVerticalLineXInLeftThird(xs[i], bounds)) continue;
      if (
        lastPlacedX !== null &&
        isVerticalLineTooClose(xs[i], lastPlacedX, minDist)
      ) {
        continue;
      }
      line = buildRandomizedVerticalLine(xs[i], yTop, yBottom);
      if (line) {
        lines.push(line);
        lastPlacedX = xs[i];
      }
    }

    cachedVerticalGridLines = lines;
  }

  function renderVerticalGridLayer() {
    if (!designSvg) return;
    var layer = designSvg.querySelector("#layer-vertical-grid");
    if (!layer) return;
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    layer.setAttribute("fill", "none");
    layer.setAttribute("stroke", getPatternStrokeColor());
    layer.setAttribute("stroke-width", String(getVerticalGridStrokeWidth()));
    for (var i = 0; i < cachedVerticalGridLines.length; i++) {
      var vl = cachedVerticalGridLines[i];
      var line = elSvg("line");
      line.setAttribute("x1", String(vl.x));
      line.setAttribute("y1", String(vl.y1));
      line.setAttribute("x2", String(vl.x));
      line.setAttribute("y2", String(vl.y2));
      layer.appendChild(line);
    }
  }

  /**
   * @param {string[]} lines
   */
  function pushVerticalGridExportLines(lines) {
    if (!cachedVerticalGridLines.length) return;
    lines.push('<g clip-path="url(#inner-content-clip)">');
    lines.push(
      '<g id="layer-vertical-grid" fill="none" stroke="' +
        getPatternStrokeColor() +
        '" stroke-width="' +
        getVerticalGridStrokeWidth() +
        '">'
    );
    for (var i = 0; i < cachedVerticalGridLines.length; i++) {
      var vl = cachedVerticalGridLines[i];
      lines.push(
        '<line x1="' +
          vl.x +
          '" y1="' +
          vl.y1 +
          '" x2="' +
          vl.x +
          '" y2="' +
          vl.y2 +
          '"/>'
      );
    }
    lines.push("</g>");
    lines.push("</g>");
  }

  function renderPatternAndVerticalLayers() {
    syncVerticalGridLines(false);
    renderVerticalGridLayer();
    renderPatternLayer();
  }

  function applyGridBoundaryAttrs(rect, bounds) {
    rect.setAttribute("x", String(bounds.x));
    rect.setAttribute("y", String(bounds.y));
    rect.setAttribute("width", String(bounds.width));
    rect.setAttribute("height", String(bounds.height));
  }

  function applyGridBoundaryStyle(rect) {
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", getPatternStrokeColor());
    rect.setAttribute("stroke-width", String(GRID_BOUNDARY_STROKE_WIDTH));
    rect.setAttribute("vector-effect", "non-scaling-stroke");
  }

  function createGridBoundaryRect() {
    var rect = elSvg("rect");
    rect.setAttribute("id", "grid-boundary");
    applyGridBoundaryAttrs(rect, getGridContentBounds());
    applyGridBoundaryStyle(rect);
    return rect;
  }

  function updateGridBoundaryRect() {
    if (!designSvg) return;
    var rect = designSvg.querySelector("#grid-boundary");
    if (!rect) return;
    applyGridBoundaryAttrs(rect, getGridContentBounds());
    applyGridBoundaryStyle(rect);
  }

  function pushGridBoundaryExportLine(lines, bounds) {
    lines.push(
      '<rect x="' +
        bounds.x +
        '" y="' +
        bounds.y +
        '" width="' +
        bounds.width +
        '" height="' +
        bounds.height +
        '" fill="none" stroke="' +
        getPatternStrokeColor() +
        '" stroke-width="' +
        GRID_BOUNDARY_STROKE_WIDTH +
        '" vector-effect="non-scaling-stroke"/>'
    );
  }

  var BORDER_DIVISION_STROKE_WIDTH = 1;
  var BORDER_LEFT_RIGHT_SEGMENTS = 12;
  var BORDER_TOP_BOTTOM_SEGMENTS = 8;

  /**
   * ViewBox Y of the grid-boundary stroke (outer edge) on top and bottom.
   * @returns {{ top: number, bottom: number }}
   */
  function getBorderDivisionFrameY() {
    var bounds = getGridContentBounds();
    var off = getInnerContentOffset();
    var s = getInnerContentScale();
    var halfStroke = GRID_BOUNDARY_STROKE_WIDTH / 2;
    return {
      top: off.y + (bounds.y - halfStroke) * s,
      bottom: off.y + (bounds.y + bounds.height + halfStroke) * s,
    };
  }

  /**
   * 1px dividers in the white margin strips only (corners stay blank).
   * Top/bottom vertical ticks extend to the grid-boundary separating line.
   * @param {SVGElement} container
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   */
  function appendBorderDivisionLine(container, x1, y1, x2, y2) {
    var line = elSvg("line");
    line.setAttribute("x1", String(x1));
    line.setAttribute("y1", String(y1));
    line.setAttribute("x2", String(x2));
    line.setAttribute("y2", String(y2));
    container.appendChild(line);
  }

  /**
   * Y of horizontal dividers in left/right strips (between corners, not at corners).
   * Diagonal cells lie only between consecutive entries.
   * @returns {number[]}
   */
  function getLeftRightBorderCellYBounds() {
    var b = getCanvasBorderPx();
    var bounds = [];
    var i;
    var y;
    for (i = 1; i < BORDER_LEFT_RIGHT_SEGMENTS; i++) {
      y = (CANVAS_H * i) / BORDER_LEFT_RIGHT_SEGMENTS;
      if (y > b && y < CANVAS_H - b) bounds.push(y);
    }
    return bounds;
  }

  /**
   * Corner-to-corner X in each left/right strip cell between horizontal dividers.
   * @param {SVGElement} g
   */
  function appendLeftRightBorderCellDiagonalsToGroup(g) {
    var b = getCanvasBorderPx();
    var yBounds = getLeftRightBorderCellYBounds();
    var j;
    var yTop;
    var yBottom;
    var rightX = CANVAS_W - b;

    for (j = 0; j < yBounds.length - 1; j++) {
      yTop = yBounds[j];
      yBottom = yBounds[j + 1];
      appendBorderDivisionLine(g, 0, yTop, b, yBottom);
      appendBorderDivisionLine(g, b, yTop, 0, yBottom);
      appendBorderDivisionLine(g, rightX, yTop, CANVAS_W, yBottom);
      appendBorderDivisionLine(g, CANVAS_W, yTop, rightX, yBottom);
    }
  }

  /**
   * @param {SVGElement} g
   */
  function appendBorderDivisionLinesToGroup(g) {
    var b = getCanvasBorderPx();
    var frameY = getBorderDivisionFrameY();
    var i;
    var y;
    var x;

    for (i = 1; i < BORDER_LEFT_RIGHT_SEGMENTS; i++) {
      y = (CANVAS_H * i) / BORDER_LEFT_RIGHT_SEGMENTS;
      if (y <= b || y >= CANVAS_H - b) continue;
      appendBorderDivisionLine(g, 0, y, b, y);
      appendBorderDivisionLine(g, CANVAS_W - b, y, CANVAS_W, y);
    }

    for (i = 1; i < BORDER_TOP_BOTTOM_SEGMENTS; i++) {
      x = (CANVAS_W * i) / BORDER_TOP_BOTTOM_SEGMENTS;
      if (x <= b || x >= CANVAS_W - b) continue;
      appendBorderDivisionLine(g, x, 0, x, frameY.top);
      appendBorderDivisionLine(g, x, frameY.bottom, x, CANVAS_H);
    }
  }

  /**
   * Margin division ticks + X diagonals (pattern color) on #layer-border-divisions.
   * @param {SVGElement} g
   */
  function appendBorderDivisionLayersToGroup(g) {
    g.setAttribute("fill", "none");
    g.setAttribute("stroke", getPatternStrokeColor());
    g.setAttribute("stroke-width", String(BORDER_DIVISION_STROKE_WIDTH));
    appendBorderDivisionLinesToGroup(g);
    appendLeftRightBorderCellDiagonalsToGroup(g);
  }

  function createBorderDivisionLinesGroup() {
    var g = elSvg("g");
    g.setAttribute("id", "layer-border-divisions");
    appendBorderDivisionLayersToGroup(g);
    return g;
  }

  function updateBorderDivisionLines() {
    if (!designSvg) return;
    var g = designSvg.querySelector("#layer-border-divisions");
    if (!g) return;
    while (g.firstChild) g.removeChild(g.firstChild);
    appendBorderDivisionLayersToGroup(g);
  }

  /**
   * @param {string[]} lines
   */
  function pushBorderDivisionExportLines(lines) {
    var b = getCanvasBorderPx();
    var frameY = getBorderDivisionFrameY();
    var i;
    var y;
    var x;

    lines.push(
      '<g id="layer-border-divisions" fill="none" stroke="' +
        getPatternStrokeColor() +
        '" stroke-width="' +
        BORDER_DIVISION_STROKE_WIDTH +
        '">'
    );

    for (i = 1; i < BORDER_LEFT_RIGHT_SEGMENTS; i++) {
      y = (CANVAS_H * i) / BORDER_LEFT_RIGHT_SEGMENTS;
      if (y <= b || y >= CANVAS_H - b) continue;
      lines.push(
        '<line x1="0" y1="' +
          y +
          '" x2="' +
          b +
          '" y2="' +
          y +
          '"/>'
      );
      lines.push(
        '<line x1="' +
          (CANVAS_W - b) +
          '" y1="' +
          y +
          '" x2="' +
          CANVAS_W +
          '" y2="' +
          y +
          '"/>'
      );
    }

    for (i = 1; i < BORDER_TOP_BOTTOM_SEGMENTS; i++) {
      x = (CANVAS_W * i) / BORDER_TOP_BOTTOM_SEGMENTS;
      if (x <= b || x >= CANVAS_W - b) continue;
      lines.push(
        '<line x1="' +
          x +
          '" y1="0" x2="' +
          x +
          '" y2="' +
          frameY.top +
          '"/>'
      );
      lines.push(
        '<line x1="' +
          x +
          '" y1="' +
          frameY.bottom +
          '" x2="' +
          x +
          '" y2="' +
          CANVAS_H +
          '"/>'
      );
    }

    var yBounds = getLeftRightBorderCellYBounds();
    var j;
    var yTop;
    var yBottom;
    var rightX = CANVAS_W - b;
    for (j = 0; j < yBounds.length - 1; j++) {
      yTop = yBounds[j];
      yBottom = yBounds[j + 1];
      lines.push(
        '<line x1="0" y1="' +
          yTop +
          '" x2="' +
          b +
          '" y2="' +
          yBottom +
          '"/>'
      );
      lines.push(
        '<line x1="' +
          b +
          '" y1="' +
          yTop +
          '" x2="0" y2="' +
          yBottom +
          '"/>'
      );
      lines.push(
        '<line x1="' +
          rightX +
          '" y1="' +
          yTop +
          '" x2="' +
          CANVAS_W +
          '" y2="' +
          yBottom +
          '"/>'
      );
      lines.push(
        '<line x1="' +
          CANVAS_W +
          '" y1="' +
          yTop +
          '" x2="' +
          rightX +
          '" y2="' +
          yBottom +
          '"/>'
      );
    }

    lines.push("</g>");
  }

  function createInnerContentClipGroup(id) {
    var g = elSvg("g");
    g.setAttribute("id", id);
    g.setAttribute("clip-path", "url(#inner-content-clip)");
    return g;
  }

  function appendInnerContentClipPath(defs) {
    var innerClip = elSvg("clipPath");
    innerClip.setAttribute("id", "inner-content-clip");
    var innerClipRect = elSvg("rect");
    innerClipRect.setAttribute("x", "0");
    innerClipRect.setAttribute("y", "0");
    innerClipRect.setAttribute("width", String(CANVAS_W));
    innerClipRect.setAttribute("height", String(CANVAS_H));
    innerClip.appendChild(innerClipRect);
    defs.appendChild(innerClip);
  }

  function createDesignSvg() {
    var svg = elSvg("svg");
    svg.setAttribute("id", "design-svg");
    svg.setAttribute("viewBox", "0 0 " + CANVAS_W + " " + CANVAS_H);
    svg.setAttribute("xmlns", NS);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Topkapi geometric grid");

    var defs = elSvg("defs");
    var clip = elSvg("clipPath");
    clip.setAttribute("id", "canvas-clip");
    var clipRect = elSvg("rect");
    clipRect.setAttribute("x", "0");
    clipRect.setAttribute("y", "0");
    clipRect.setAttribute("width", String(CANVAS_W));
    clipRect.setAttribute("height", String(CANVAS_H));
    clip.appendChild(clipRect);
    defs.appendChild(clip);
    appendInnerContentClipPath(defs);
    svg.appendChild(defs);

    var borderFill = elSvg("rect");
    borderFill.setAttribute("x", "0");
    borderFill.setAttribute("y", "0");
    borderFill.setAttribute("width", String(CANVAS_W));
    borderFill.setAttribute("height", String(CANVAS_H));
    borderFill.setAttribute("fill", BG_COLOR);
    svg.appendChild(borderFill);
    svg.appendChild(createBorderDivisionLinesGroup());

    var innerContent = elSvg("g");
    innerContent.setAttribute("id", "inner-content");
    innerContent.setAttribute("transform", getInnerContentTransformAttr());

    var clippedBackground = createInnerContentClipGroup("inner-clipped-background");
    var background = elSvg("g");
    background.setAttribute("id", "layer-background");
    clippedBackground.appendChild(background);
    innerContent.appendChild(clippedBackground);

    var clippedVertical = createInnerContentClipGroup("inner-clipped-vertical-grid");
    var verticalLayer = elSvg("g");
    verticalLayer.setAttribute("id", "layer-vertical-grid");
    verticalLayer.setAttribute("clip-path", "url(#canvas-clip)");
    clippedVertical.appendChild(verticalLayer);
    innerContent.appendChild(clippedVertical);

    var clippedDiamonds = createInnerContentClipGroup("inner-clipped-diamond-fills");
    var diamondLayer = elSvg("g");
    diamondLayer.setAttribute("id", "layer-diamond-fills");
    diamondLayer.setAttribute("clip-path", "url(#canvas-clip)");
    clippedDiamonds.appendChild(diamondLayer);
    innerContent.appendChild(clippedDiamonds);

    innerContent.appendChild(createGridBoundaryRect());

    var clippedPattern = createInnerContentClipGroup("inner-clipped-pattern");
    var pattern = elSvg("g");
    pattern.setAttribute("id", "layer-pattern");
    pattern.setAttribute("clip-path", "url(#canvas-clip)");
    clippedPattern.appendChild(pattern);
    innerContent.appendChild(clippedPattern);

    svg.appendChild(innerContent);

    return svg;
  }

  function renderPatternLayer() {
    if (!designSvg) return;
    var diamondLayer = designSvg.querySelector("#layer-diamond-fills");
    var patternLayer = designSvg.querySelector("#layer-pattern");
    if (!diamondLayer || !patternLayer) return;

    while (diamondLayer.firstChild) diamondLayer.removeChild(diamondLayer.firstChild);
    while (patternLayer.firstChild) patternLayer.removeChild(patternLayer.firstChild);

    var filled = getFilledDiamonds();
    if (filled.length) diamondLayer.appendChild(diamondsToGroup(filled));
    patternLayer.appendChild(segmentsToGroup(getVisibleSegments(cachedAllSegments)));
    patternLayer.appendChild(circlesToGroup(getActiveCircles()));
  }

  function render() {
    updateLayoutState();

    var outN = document.getElementById("octagons-n-out");
    if (outN) outN.textContent = String(lastOctagonsN);

    var innerScale = getInnerScale();
    var outInner = document.getElementById("inner-scale-out");
    if (outInner) outInner.textContent = String(innerScale);

    var layout = TopkapiGeometry.computeLayout(
      lastOctagonsN,
      CANVAS_W,
      CANVAS_H
    );
    var info = document.getElementById("tile-info");
    if (info) {
      info.textContent =
        "Tile " +
        Math.round(layout.tileSize * 100) / 100 +
        " px · " +
        (lastOctagonsN + 1) +
        " across · " +
        (layout.m + 1) +
        " down (symmetric clip)";
    }

    if (!designSvg) {
      designSvg = createDesignSvg();
      var wrap = document.getElementById("stage-wrap");
      if (wrap) wrap.appendChild(designSvg);
    }

    cachedAllSegments = buildAllSegments();

    var layoutSig = buildLayoutSignature();
    if (layoutSig !== lastCircleLayoutSignature) {
      lastCircleLayoutSignature = layoutSig;
      syncCircleSelection(true);
    }

    var diamondSig = buildDiamondLayoutSignature();
    if (diamondSig !== lastDiamondLayoutSignature) {
      lastDiamondLayoutSignature = diamondSig;
      syncDiamondFill(true);
    }

    var densityOut = document.getElementById("circle-density-out");
    if (densityOut) densityOut.textContent = String(getCircleDensity()) + "%";

    var strokeOut = document.getElementById("grid-stroke-width-out");
    if (strokeOut) strokeOut.textContent = String(getGridStrokeWidth()) + " px";

    renderBackgroundLayer();
    syncVerticalGridLines(false);
    renderVerticalGridLayer();
    updateGridBoundaryRect();
    updateBorderDivisionLines();
    renderPatternLayer();
    layoutStage();
    updateResetButton();
  }

  function renderAfterSliderChange() {
    clearMergeState();
    render();
  }

  function layoutStage() {
    var wrap = document.getElementById("stage-wrap");
    var svg = document.getElementById("design-svg");
    if (!wrap || !svg) return;
    var rect = wrap.getBoundingClientRect();
    var availW = Math.max(60, rect.width - VIEW_MARGIN * 2);
    var availH = Math.max(60, rect.height - VIEW_MARGIN * 2);
    var scale = Math.min(availW / CANVAS_W, availH / CANVAS_H);
    svg.style.width = CANVAS_W * scale + "px";
    svg.style.height = CANVAS_H * scale + "px";
  }

  /**
   * @param {{x1:number,y1:number,x2:number,y2:number}[]} segments
   * @param {{ cx: number, cy: number, r: number }[]} circles
   * @returns {string}
   */
  function buildExportSvgString(segments, circles, diamonds) {
    var lines = [];
    var gridBounds = getGridContentBounds();
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      '<svg xmlns="' +
        NS +
        '" width="70cm" height="180cm" viewBox="0 0 ' +
        CANVAS_W +
        " " +
        CANVAS_H +
        '">'
    );
    lines.push("<defs>");
    lines.push(
      '<clipPath id="inner-content-clip"><rect x="0" y="0" width="' +
        CANVAS_W +
        '" height="' +
        CANVAS_H +
        '"/></clipPath>'
    );
    lines.push("</defs>");
    lines.push(
      '<rect x="0" y="0" width="' +
        CANVAS_W +
        '" height="' +
        CANVAS_H +
        '" fill="' +
        BG_COLOR +
        '"/>'
    );
    pushBorderDivisionExportLines(lines);
    lines.push('<g transform="' + getInnerContentTransformAttr() + '">');
    lines.push('<g clip-path="url(#inner-content-clip)">');
    pushBackgroundExportLines(lines);
    lines.push("</g>");

    pushVerticalGridExportLines(lines);

    if (diamonds.length) {
      var fillColor = getDiamondFillColor();
      lines.push('<g clip-path="url(#inner-content-clip)">');
      lines.push('<g id="layer-diamond-fills">');
      for (var d = 0; d < diamonds.length; d++) {
        var dm = diamonds[d];
        var pts = dm.points;
        var pointsAttr = "";
        for (var p = 0; p < pts.length; p++) {
          if (p) pointsAttr += " ";
          pointsAttr += pts[p].x + "," + pts[p].y;
        }
        lines.push(
          '<polygon points="' +
            pointsAttr +
            '" fill="' +
            fillColor +
            '" stroke="none"/>'
        );
      }
      lines.push("</g>");
      lines.push("</g>");
    }

    pushGridBoundaryExportLine(lines, gridBounds);
    var gridStroke = getGridStrokeWidth();
    var circleStroke = getCircleStrokeWidth();
    lines.push('<g clip-path="url(#inner-content-clip)">');

    lines.push(
      '<g fill="none" stroke="' +
        getPatternStrokeColor() +
        '" stroke-width="' +
        gridStroke +
        '" stroke-linecap="square" stroke-linejoin="miter">'
    );

    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      lines.push(
        '<line x1="' +
          s.x1 +
          '" y1="' +
          s.y1 +
          '" x2="' +
          s.x2 +
          '" y2="' +
          s.y2 +
          '"/>'
      );
    }

    lines.push("</g>");

    if (circles.length) {
      lines.push(
        '<g id="layer-circles" fill="none" stroke="' +
          getPatternStrokeColor() +
          '" stroke-width="' +
          circleStroke +
          '">'
      );
      var strokeInset = circleStroke / 2;
      for (var c = 0; c < circles.length; c++) {
        var circ = circles[c];
        var drawR = Math.max(0, circ.r - strokeInset);
        lines.push(
          '<circle cx="' +
            circ.cx +
            '" cy="' +
            circ.cy +
            '" r="' +
            drawR +
            '"/>'
        );
      }
      lines.push("</g>");
    }

    lines.push("</g>");
    lines.push("</g>");
    lines.push("</svg>");
    return lines.join("\n");
  }

  function downloadBlob(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function onExportSvg() {
    var btn = document.getElementById("export-svg-btn");
    if (btn) btn.disabled = true;

    try {
      syncVerticalGridLines(false);
      var segments = getVisibleSegments(cachedAllSegments);
      var markup = buildExportSvgString(
        segments,
        getActiveCircles(),
        getFilledDiamonds()
      );
      var blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
      downloadBlob(blob, "topkapi-export-70x180cm.svg");
    } catch (e) {
      console.error(e);
      alert("SVG export failed.");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function clientToViewBox(svg, clientX, clientY) {
    var pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    var ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }

  /** Map screen/viewBox coords to untransformed content space (geometry). */
  function viewBoxToContentCoords(pt) {
    var off = getInnerContentOffset();
    var s = getInnerContentScale();
    return {
      x: (pt.x - off.x) / s,
      y: (pt.y - off.y) / s,
    };
  }

  function isInsideInnerContentViewBox(pt) {
    var b = getCanvasBorderPx();
    return (
      pt.x >= b &&
      pt.y >= b &&
      pt.x <= CANVAS_W - b &&
      pt.y <= CANVAS_H - b
    );
  }

  function getHitThreshold(svg) {
    var rect = svg.getBoundingClientRect();
    var scale = rect.width / CANVAS_W;
    if (!scale || scale <= 0) scale = 1;
    var contentScale = getInnerContentScale();
    return EDGE_HIT_THRESHOLD_PX / scale / contentScale;
  }

  function appendDragPoint(svg, clientX, clientY) {
    var viewPt = clientToViewBox(svg, clientX, clientY);
    if (!viewPt || !isInsideInnerContentViewBox(viewPt)) return;
    var pt = viewBoxToContentCoords(viewPt);
    var last = dragPath[dragPath.length - 1];
    if (last) {
      var dx = pt.x - last.x;
      var dy = pt.y - last.y;
      if (dx * dx + dy * dy < 1) return;
    }
    dragPath.push({ x: pt.x, y: pt.y });
  }

  function applyDanglingPrune() {
    var changed = false;
    var pruneKeys = TopkapiGeometry.findDanglingPruneKeys(
      cachedAllSegments,
      removedEdges
    );
    for (var j = 0; j < pruneKeys.length; j++) {
      var pk = pruneKeys[j];
      if (removedEdges.has(pk)) continue;
      removedEdges.add(pk);
      changed = true;
    }
    return changed;
  }

  function removeEdgesByKeys(keys) {
    var changed = false;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (removedEdges.has(key)) continue;
      removedEdges.add(key);
      changed = true;
    }

    if (applyDanglingPrune()) changed = true;

    if (changed) {
      renderPatternAndVerticalLayers();
      updateResetButton();
    }
  }

  function restoreEdgesByKeys(keys) {
    var validKeys = TopkapiGeometry.filterValidRestoreKeys(
      cachedAllSegments,
      removedEdges,
      keys
    );
    var changed = false;
    for (var i = 0; i < validKeys.length; i++) {
      var key = validKeys[i];
      if (!removedEdges.has(key)) continue;
      removedEdges.delete(key);
      changed = true;
    }

    if (changed) {
      renderPatternAndVerticalLayers();
      updateResetButton();
    }
  }

  function processDragHitTest() {
    if (!designSvg || dragPath.length === 0) return;
    var threshold = getHitThreshold(designSvg);

    if (interactionMode === "merge") {
      var visible = getVisibleSegments(cachedAllSegments);
      var keys = TopkapiGeometry.findSegmentsNearPolyline(
        visible,
        dragPath,
        threshold,
        removedEdges
      );
      removeEdgesByKeys(keys);
    } else if (interactionMode === "restore") {
      if (!removedEdges.size) return;
      var visible = getVisibleSegments(cachedAllSegments);
      var restoreKeys = TopkapiGeometry.findRestoreCandidateKeys(
        cachedAllSegments,
        visible,
        removedEdges,
        dragPath,
        threshold
      );
      restoreEdgesByKeys(restoreKeys);
    }
  }

  function onPointerDown(e) {
    if (!isDragInteractionMode() || !designSvg) return;
    if (e.button !== 0) return;
    isDragging = true;
    dragPath = [];
    designSvg.setPointerCapture(e.pointerId);
    appendDragPoint(designSvg, e.clientX, e.clientY);
    processDragHitTest();
    var wrap = document.getElementById("stage-wrap");
    if (wrap) wrap.classList.add("is-dragging");
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDragging || !designSvg) return;
    appendDragPoint(designSvg, e.clientX, e.clientY);
    processDragHitTest();
    e.preventDefault();
  }

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    dragPath = [];
    if (designSvg && designSvg.hasPointerCapture(e.pointerId)) {
      designSvg.releasePointerCapture(e.pointerId);
    }
    var wrap = document.getElementById("stage-wrap");
    if (wrap) wrap.classList.remove("is-dragging");
  }

  function onPointerUp(e) {
    endDrag(e);
  }

  function onPointerCancel(e) {
    endDrag(e);
  }

  var interactionListenersBound = false;

  function bindInteractionPointerListeners() {
    if (!designSvg || interactionListenersBound) return;
    designSvg.addEventListener("pointerdown", onPointerDown);
    designSvg.addEventListener("pointermove", onPointerMove);
    designSvg.addEventListener("pointerup", onPointerUp);
    designSvg.addEventListener("pointercancel", onPointerCancel);
    interactionListenersBound = true;
  }

  function unbindInteractionPointerListeners() {
    if (!designSvg || !interactionListenersBound) return;
    designSvg.removeEventListener("pointerdown", onPointerDown);
    designSvg.removeEventListener("pointermove", onPointerMove);
    designSvg.removeEventListener("pointerup", onPointerUp);
    designSvg.removeEventListener("pointercancel", onPointerCancel);
    interactionListenersBound = false;
    isDragging = false;
    dragPath = [];
    var wrap = document.getElementById("stage-wrap");
    if (wrap) wrap.classList.remove("is-dragging");
  }

  function updateModeUi() {
    var viewBtn = document.getElementById("mode-view-btn");
    var mergeBtn = document.getElementById("mode-merge-btn");
    var restoreBtn = document.getElementById("mode-restore-btn");
    var mergeHint = document.getElementById("merge-hint");
    var restoreHint = document.getElementById("restore-hint");

    if (viewBtn) {
      viewBtn.classList.toggle("is-active", interactionMode === "view");
      viewBtn.setAttribute("aria-pressed", String(interactionMode === "view"));
    }
    if (mergeBtn) {
      mergeBtn.classList.toggle("is-active", interactionMode === "merge");
      mergeBtn.setAttribute("aria-pressed", String(interactionMode === "merge"));
    }
    if (restoreBtn) {
      restoreBtn.classList.toggle("is-active", interactionMode === "restore");
      restoreBtn.setAttribute(
        "aria-pressed",
        String(interactionMode === "restore")
      );
    }
    if (mergeHint) mergeHint.hidden = interactionMode !== "merge";
    if (restoreHint) restoreHint.hidden = interactionMode !== "restore";
    if (designSvg) {
      designSvg.classList.toggle("is-merge-mode", interactionMode === "merge");
      designSvg.classList.toggle(
        "is-restore-mode",
        interactionMode === "restore"
      );
    }
  }

  function setMode(mode) {
    if (mode !== "view" && mode !== "merge" && mode !== "restore") return;
    interactionMode = mode;
    updateModeUi();
    if (isDragInteractionMode()) {
      bindInteractionPointerListeners();
    } else {
      unbindInteractionPointerListeners();
    }
  }

  function onResetGrid() {
    clearMergeState();
    renderPatternAndVerticalLayers();
  }

  function init() {
    var slider = document.getElementById("octagons-n");
    if (slider) {
      slider.min = String(OCTAGONS_N_MIN);
      slider.max = String(OCTAGONS_N_MAX);
      slider.value = String(OCTAGONS_N_DEFAULT);
      slider.addEventListener("input", renderAfterSliderChange);
    }

    var innerSlider = document.getElementById("inner-scale");
    if (innerSlider) {
      innerSlider.min = String(INNER_SCALE_MIN);
      innerSlider.max = String(INNER_SCALE_MAX);
      innerSlider.value = String(INNER_SCALE_DEFAULT);
      innerSlider.addEventListener("input", renderAfterSliderChange);
    }

    var patternColorInput = document.getElementById("pattern-stroke-color");
    if (patternColorInput) {
      patternColorInput.value = PATTERN_STROKE_COLOR_DEFAULT;
      patternColorInput.addEventListener("input", function () {
        updateGridBoundaryRect();
        renderVerticalGridLayer();
        renderPatternLayer();
        var borderDivisions =
          designSvg && designSvg.querySelector("#layer-border-divisions");
        if (borderDivisions) {
          borderDivisions.setAttribute("stroke", getPatternStrokeColor());
        }
      });
    }

    var gridStrokeSlider = document.getElementById("grid-stroke-width");
    if (gridStrokeSlider) {
      gridStrokeSlider.min = String(GRID_STROKE_WIDTH_MIN);
      gridStrokeSlider.max = String(GRID_STROKE_WIDTH_MAX);
      gridStrokeSlider.value = String(GRID_STROKE_WIDTH_DEFAULT);
      gridStrokeSlider.addEventListener("input", function () {
        var strokeOut = document.getElementById("grid-stroke-width-out");
        if (strokeOut) strokeOut.textContent = String(getGridStrokeWidth()) + " px";
        renderVerticalGridLayer();
        renderPatternLayer();
      });
    }

    var circleDensitySlider = document.getElementById("circle-density");
    if (circleDensitySlider) {
      circleDensitySlider.min = String(CIRCLE_DENSITY_MIN);
      circleDensitySlider.max = String(CIRCLE_DENSITY_MAX);
      circleDensitySlider.value = String(CIRCLE_DENSITY_DEFAULT);
      circleDensitySlider.addEventListener("input", function () {
        syncCircleSelection(true);
        var densityOut = document.getElementById("circle-density-out");
        if (densityOut) densityOut.textContent = String(getCircleDensity()) + "%";
        renderPatternLayer();
      });
    }

    var randomizeCirclesBtn = document.getElementById("randomize-circles-btn");
    if (randomizeCirclesBtn) {
      randomizeCirclesBtn.addEventListener("click", function () {
        syncCircleSelection(true);
        syncDiamondFill(true);
        renderPatternLayer();
      });
    }

    var exportBtn = document.getElementById("export-svg-btn");
    if (exportBtn) exportBtn.addEventListener("click", onExportSvg);

    var viewBtn = document.getElementById("mode-view-btn");
    if (viewBtn) viewBtn.addEventListener("click", function () {
      setMode("view");
    });

    var mergeBtn = document.getElementById("mode-merge-btn");
    if (mergeBtn) mergeBtn.addEventListener("click", function () {
      setMode("merge");
    });

    var restoreBtn = document.getElementById("mode-restore-btn");
    if (restoreBtn) restoreBtn.addEventListener("click", function () {
      setMode("restore");
    });

    var resetBtn = document.getElementById("reset-grid-btn");
    if (resetBtn) resetBtn.addEventListener("click", onResetGrid);

    var bgColor1 = document.getElementById("bg-color-1");
    var bgColor2 = document.getElementById("bg-color-2");
    var bgColor3 = document.getElementById("bg-color-3");
    if (bgColor1) {
      bgColor1.value = BG_COLOR_1_DEFAULT;
      bgColor1.addEventListener("input", renderBackgroundLayer);
    }
    if (bgColor2) {
      bgColor2.value = BG_COLOR_2_DEFAULT;
      bgColor2.addEventListener("input", renderBackgroundLayer);
    }
    if (bgColor3) {
      bgColor3.value = BG_COLOR_3_DEFAULT;
      bgColor3.addEventListener("input", renderBackgroundLayer);
    }

    var bgDirVertical = document.getElementById("bg-direction-vertical-btn");
    if (bgDirVertical) {
      bgDirVertical.addEventListener("click", function () {
        setBgDirection("vertical");
      });
    }
    var bgDirHorizontal = document.getElementById("bg-direction-horizontal-btn");
    if (bgDirHorizontal) {
      bgDirHorizontal.addEventListener("click", function () {
        setBgDirection("horizontal");
      });
    }

    var bgWhiteToggle = document.getElementById("bg-white-toggle-btn");
    if (bgWhiteToggle) {
      bgWhiteToggle.addEventListener("click", toggleBgWhite);
    }

    window.addEventListener("resize", layoutStage);
    lastCircleLayoutSignature = "";
    lastDiamondLayoutSignature = "";
    updateBgDirectionUi();
    updateBgWhiteToggleUi();
    render();
    setMode("view");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
