/** Logical print canvas: 70cm × 180cm at 300 DPI */
var CANVAS_W = 827;
var CANVAS_H = 2126;

/** White margin ring area as a fraction of full canvas area (symmetric sides) */
var CANVAS_BORDER_AREA_RATIO = 0.15;

/** Outline between grid and white margin (stroke color = pattern color) */
var GRID_BOUNDARY_STROKE_WIDTH = 5;

/** Layout margins (CSS px) around scaled canvas */
var VIEW_MARGIN = 24;

/** Grid + circle stroke (shared color picker) — RGB(104, 84, 80) */
var PATTERN_STROKE_COLOR_DEFAULT = "#685450";
var GRID_STROKE_WIDTH_MIN = 1;
var GRID_STROKE_WIDTH_MAX = 5;
var GRID_STROKE_WIDTH_DEFAULT = 1;
var BG_COLOR = "#ffffff";

/** Full octagons per row/column (n); half-octagon on each edge → (n+1) tile widths */
var OCTAGONS_N_MIN = 3;
var OCTAGONS_N_MAX = 15;
var OCTAGONS_N_DEFAULT = 7;

/** Corner cut: t = side / (2 + sqrt(2)) */
var CUT_RATIO = 1 / (2 + Math.SQRT2);

/** Inner diamond + connector unit scale (8-fold grid only) */
var INNER_SCALE_MIN = 0.3;
var INNER_SCALE_MAX = 1.0;
var INNER_SCALE_DEFAULT = 1.0;

/** Merge mode: cursor must pass within this many screen px of an edge */
var EDGE_HIT_THRESHOLD_PX = 5;

/** Random circles in upright squares (% of all upright squares on canvas) */
var CIRCLE_DENSITY_MIN = 10;
var CIRCLE_DENSITY_MAX = 40;
var CIRCLE_DENSITY_DEFAULT = 25;

/** Random solid fill on inner diamonds (% of all diamonds on canvas) */
var DIAMOND_FILL_PERCENT = 5;

/** Default fill for randomly filled diamonds — #FF3C3C */
var DIAMOND_FILL_COLOR_DEFAULT = "#ff3c3c";

/** Gradient background: 3 bands — 40%, 40%, 20% of canvas (along division axis) */
var BG_SECTION_RATIOS = [0.4, 0.4, 0.2];
var BG_DIRECTION_DEFAULT = "vertical";
var BG_COLOR_1_DEFAULT = "#e8d96a";
var BG_COLOR_2_DEFAULT = "#8b6057";
var BG_COLOR_3_DEFAULT = "#d4d0d0";
