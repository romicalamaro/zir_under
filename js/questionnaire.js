(function () {
  "use strict";

  var TRANSITION_MS = 300;

  /** @type {HTMLElement | null} */
  var viewport = null;

  /** @type {HTMLElement | null} */
  var sectionLabelEl = null;

  /** @type {HTMLElement | null} */
  var progressEl = null;

  /** @type {HTMLElement | null} */
  var activeStepEl = null;

  /** @type {string | null} */
  var currentStepId = null;

  /** @type {string | null} */
  var displayStepId = null;

  /** @type {HTMLElement | null} */
  var activePalettePickerGroup = null;

  var palettesLoadedHookRegistered = false;

  function focusWithoutScroll(el) {
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch (err) {
      el.focus();
    }
  }

  var answers = {
    livingInIran: null,
    livingDuration: null,
    leavingYear: "",
    from: "",
    nowIn: "",
    name: "",
    nameDisplayMode: null,
    age: "",
    homeAt: null,
    gridType: null,
    octagonsN: 5,
    innerScale: 10,
    palette: 1,
    borderSideSegments: 1,
    borderFrameDivisions: 2,
    borderSideWhiteFill: 0,
    fanLeaves: 0,
    angerVerticalLength: 0,
    anxietyVerticalStroke: 0,
    angerTriangleDensity: 0,
    hopeMode: "view",
    circleDensity: 0,
    longingCircleDensity: 0,
    griefCircleDensity: 0,
    strengthDensity: 0,
    autoMergeIntensity: 0,
    prideFillPercent: 0,
    guiltShameFillPercent: 0,
    helplessnessPercent: 0,
  };

  var PROFILE_STEP_ORDER = [
    "livingInIran",
    "livingDuration",
    "leavingYear",
    "from",
    "nowIn",
    "name",
    "age",
    "homeAt",
  ];

  var GRID_STEP_ORDER = ["gridType", "octagonsN", "innerScale"];

  var COLORS_STEP_ORDER = ["palette"];

  var FAMILY_STEP_ORDER = [
    "borderSideSegments",
    "borderFrameDivisions",
    "borderSideWhiteFill",
  ];

  var BODY_AUTONOMY_STEP_ORDER = ["fanLeaves"];

  var FEELINGS_STEP_ORDER = [
    "angerVerticalLength",
    "anxietyVerticalStroke",
    "angerTriangleDensity",
    "hopeMode",
    "circleDensity",
    "longingCircleDensity",
    "griefCircleDensity",
    "strengthDensity",
    "autoMergeIntensity",
    "prideFillPercent",
    "guiltShameFillPercent",
    "helplessnessPercent",
  ];

  var FEELINGS_SLIDER_BOUNDS = {
    angerVerticalLength: [0, 30],
    anxietyVerticalStroke: [0, 100],
    angerTriangleDensity: [0, 30],
    circleDensity: [0, 30],
    longingCircleDensity: [0, 30],
    griefCircleDensity: [0, 30],
    strengthDensity: [0, 30],
    autoMergeIntensity: [0, 7],
    prideFillPercent: [0, 30],
    guiltShameFillPercent: [0, 30],
    helplessnessPercent: [0, 30],
  };

  var GRID_BTN_IDS = {
    octagon: "grid-choose-octagon-btn",
    star: "grid-choose-star-btn",
    circles: "grid-choose-circles-btn",
    diamonds: "grid-choose-diamonds-btn",
  };

  var PANEL_SLIDER_DOM = {
    octagonsN: ["octagons-n", "octagons-n-out"],
    innerScale: ["inner-scale", "inner-scale-out"],
    borderSideSegments: ["border-side-segments", "border-side-segments-out"],
    borderFrameDivisions: [
      "border-frame-divisions",
      "border-frame-divisions-out",
    ],
    borderSideWhiteFill: [
      "border-side-white-fill",
      "border-side-white-fill-out",
    ],
    fanLeaves: ["fan-leaves", null],
    angerVerticalLength: ["anger-vertical-length", "anger-vertical-length-out"],
    anxietyVerticalStroke: [
      "anxiety-vertical-stroke",
      "anxiety-vertical-stroke-out",
    ],
    angerTriangleDensity: [
      "anger-triangle-density",
      "anger-triangle-density-out",
    ],
    circleDensity: ["circle-density", "circle-density-out"],
    longingCircleDensity: [
      "longing-circle-density",
      "longing-circle-density-out",
    ],
    griefCircleDensity: ["grief-circle-density", "grief-circle-density-out"],
    strengthDensity: ["strength-density", "strength-density-out"],
    autoMergeIntensity: ["auto-merge-intensity", "auto-merge-intensity-out"],
    prideFillPercent: ["pride-fill-percent", "pride-fill-percent-out"],
    guiltShameFillPercent: [
      "guilt-shame-fill-percent",
      "guilt-shame-fill-percent-out",
    ],
    helplessnessPercent: ["helplessness-percent", "helplessness-percent-out"],
  };

  /** @type {Record<string, boolean>} */
  var profileStepsReached = {
    livingInIran: false,
    livingDuration: false,
    leavingYear: false,
    from: false,
    nowIn: false,
    name: false,
    age: false,
    homeAt: false,
  };

  /** @type {Record<string, boolean>} */
  var gridStepsReached = {
    gridType: false,
    octagonsN: false,
    innerScale: false,
  };

  /** @type {Record<string, boolean>} */
  var colorStepsReached = {
    palette: false,
  };

  /** @type {Record<string, boolean>} */
  var familyStepsReached = {
    borderSideSegments: false,
    borderFrameDivisions: false,
    borderSideWhiteFill: false,
  };

  /** @type {Record<string, boolean>} */
  var bodyAutonomyStepsReached = {
    fanLeaves: false,
  };

  /** @type {Record<string, boolean>} */
  var feelingsStepsReached = {
    angerVerticalLength: false,
    anxietyVerticalStroke: false,
    angerTriangleDensity: false,
    hopeMode: false,
    circleDensity: false,
    longingCircleDensity: false,
    griefCircleDensity: false,
    strengthDensity: false,
    autoMergeIntensity: false,
    prideFillPercent: false,
    guiltShameFillPercent: false,
    helplessnessPercent: false,
  };

  var STEPS = {
    livingInIran: {
      letter: "A",
      label: "Did you ever live in Iran?",
      type: "yesno",
      ariaLabel: "Did you ever live in Iran? Yes or no",
    },
    livingDuration: {
      letter: "B",
      label: "How much of your life did you live in Iran?",
      type: "choice",
      ariaLabel: "How much of your life did you live in Iran?",
      wrap: true,
      options: [
        { value: "smallPart", label: "Small part of my life" },
        { value: "partOfLife", label: "Yes, part of my life" },
        { value: "mostAll", label: "Yes, most / all of my life" },
      ],
    },
    leavingYear: {
      letter: "C",
      label: "Year of leaving",
      type: "text",
      inputMode: "numeric",
      maxLength: 4,
      placeholder: "Year you left Iran",
      ariaLabel: "Year of leaving",
    },
    from: {
      letter: "D",
      label: "From",
      type: "text",
      english: true,
      placeholder: "Where you are originally from",
      ariaLabel: "From",
    },
    nowIn: {
      letter: "E",
      label: "Now in",
      type: "text",
      english: true,
      placeholder: "Where you live now",
      ariaLabel: "Now in",
    },
    name: {
      letter: "F",
      label: "Name",
      type: "name",
      placeholder: "Full name",
      ariaLabel: "Name",
      modeAriaLabel: "How name appears on the label",
      modes: [
        { value: "anonymous", label: "Anonymous" },
        { value: "initials", label: "Initials" },
        { value: "name", label: "Name" },
      ],
    },
    age: {
      letter: "G",
      label: "Age",
      type: "text",
      inputMode: "numeric",
      maxLength: 2,
      ariaLabel: "Age",
    },
    homeAt: {
      letter: "H",
      label: 'where do you feel most "at home" today?',
      type: "choice",
      ariaLabel: 'where do you feel most "at home" today?',
      wrap: true,
      options: [
        { value: "inIran", label: "In Iran" },
        { value: "whereILive", label: "Outside Iran / where I live now" },
        { value: "nowhere", label: "Nowhere / in between" },
      ],
    },
    gridType: {
      letter: "",
      hideHeading: true,
      type: "choice",
      ariaLabel: "Grid type",
      options: [
        { value: "octagon", label: "Octagon" },
        { value: "star", label: "Star grid" },
        { value: "circles", label: "Circles" },
        { value: "diamonds", label: "Diamonds" },
      ],
    },
    octagonsN: {
      letter: "",
      label: "How much do I feel part of the Iranian community?",
      type: "slider",
      ariaLabel:
        "How much do I feel part of the Iranian community? Not part at all to very much part.",
      min: 1,
      max: 10,
      step: 1,
      rangeLabels: ["Not part at all", "Very much part"],
      wrap: true,
    },
    innerScale: {
      letter: "",
      label: "How much is my Iranian identity at the center of my life?",
      type: "slider",
      ariaLabel: "How much is my Iranian identity at the center of my life?",
      min: 1,
      max: 10,
      step: 1,
      wrap: true,
    },
    palette: {
      letter: "",
      label: "Palette",
      type: "palette-picker",
      ariaLabel: "החלף בין פלטות 1 עד 12",
    },
    borderSideSegments: {
      letter: "",
      label: "Family and friends in Iran",
      type: "slider",
      ariaLabel: "Family and friends in Iran. None to a lot.",
      min: 1,
      max: 3,
      step: 1,
      rangeLabels: ["None", "A lot"],
      wrap: true,
    },
    borderFrameDivisions: {
      letter: "",
      label: "Frame divisions",
      type: "slider",
      ariaLabel: "Frame divisions. Minimum to maximum.",
      min: 1,
      max: 3,
      step: 1,
      rangeLabels: ["Minimum", "Maximum"],
    },
    borderSideWhiteFill: {
      letter: "",
      label: "Color fade",
      type: "slider",
      ariaLabel:
        "Family and friends in Iran color fade. Full color to 50 percent white.",
      min: 0,
      max: 100,
      step: 25,
      rangeLabels: ["Full color", "50% white"],
      outputSuffix: "%",
    },
    fanLeaves: {
      letter: "",
      label: "How much were you able to control what you wear?",
      type: "slider",
      ariaLabel:
        "Fan leaves. Step 0 fully open, step 9 four ribs, step 10 closed.",
      min: 0,
      max: 10,
      step: 1,
      rangeLabels: ["Fully open", "Closed"],
      wrap: true,
    },
    angerVerticalLength: {
      letter: "",
      label: "Fear — Vertical line length",
      type: "slider",
      ariaLabel: "Vertical line length",
      min: 0,
      max: 30,
      step: 7.5,
      wrap: true,
    },
    anxietyVerticalStroke: {
      letter: "",
      label: "Fear — Anxiety / Tension",
      type: "slider",
      ariaLabel: "Anxiety / Tension — vertical line thickness",
      min: 0,
      max: 100,
      step: 25,
      wrap: true,
    },
    angerTriangleDensity: {
      letter: "",
      label: "Anger",
      type: "slider",
      ariaLabel: "Anger triangle density",
      min: 0,
      max: 30,
      step: 7.5,
    },
    hopeMode: {
      letter: "",
      label: "Hope",
      type: "choice",
      ariaLabel: "Hope interaction mode",
      options: [
        { value: "view", label: "View" },
        { value: "merge", label: "Merge" },
      ],
    },
    circleDensity: {
      letter: "",
      label: "Sadness",
      type: "slider",
      ariaLabel: "Circle density",
      min: 0,
      max: 30,
      step: 7.5,
    },
    longingCircleDensity: {
      letter: "",
      label: "Longing",
      type: "slider",
      ariaLabel: "Longing circle density",
      min: 0,
      max: 30,
      step: 7.5,
    },
    griefCircleDensity: {
      letter: "",
      label: "Grief",
      type: "slider",
      ariaLabel: "Grief circle density",
      min: 0,
      max: 30,
      step: 7.5,
    },
    strengthDensity: {
      letter: "",
      label: "Strength / Power",
      type: "slider",
      ariaLabel: "Strength / Power circle-in-square density",
      min: 0,
      max: 30,
      step: 7.5,
      wrap: true,
    },
    autoMergeIntensity: {
      letter: "",
      label: "Pride",
      type: "slider",
      ariaLabel: "Pride merged area amount and size",
      min: 0,
      max: 7,
      step: 1.75,
    },
    prideFillPercent: {
      letter: "",
      label: "Pain",
      type: "slider",
      ariaLabel: "Pain diamond fill amount",
      min: 0,
      max: 30,
      step: 7.5,
    },
    guiltShameFillPercent: {
      letter: "",
      label: "Guilt / Shame",
      type: "slider",
      ariaLabel: "Guilt / Shame hollow diamond fill amount",
      min: 0,
      max: 30,
      step: 7.5,
      wrap: true,
    },
    helplessnessPercent: {
      letter: "",
      label: "Helplessness",
      type: "slider",
      ariaLabel: "Helplessness junction X mark density",
      min: 0,
      max: 30,
      step: 7.5,
    },
  };

  function isLivingInIranYes() {
    return answers.livingInIran === true;
  }

  function isStepSkipped(stepId) {
    if (stepId === "livingDuration" || stepId === "leavingYear") {
      return !isLivingInIranYes();
    }
    return false;
  }

  function isProfileStep(stepId) {
    return PROFILE_STEP_ORDER.indexOf(stepId) >= 0;
  }

  function isGridStep(stepId) {
    return GRID_STEP_ORDER.indexOf(stepId) >= 0;
  }

  function isColorStep(stepId) {
    return COLORS_STEP_ORDER.indexOf(stepId) >= 0;
  }

  function isFamilyStep(stepId) {
    return FAMILY_STEP_ORDER.indexOf(stepId) >= 0;
  }

  function isBodyAutonomyStep(stepId) {
    return BODY_AUTONOMY_STEP_ORDER.indexOf(stepId) >= 0;
  }

  function isFeelingsStep(stepId) {
    return FEELINGS_STEP_ORDER.indexOf(stepId) >= 0;
  }

  function isNumericInRange(value, min, max) {
    return (
      Number.isFinite(Number(value)) &&
      Number(value) >= min &&
      Number(value) <= max
    );
  }

  function getNextStepId(fromId) {
    if (!fromId) return "livingInIran";

    if (isProfileStep(fromId)) {
      var startIndex = PROFILE_STEP_ORDER.indexOf(fromId) + 1;
      for (var i = startIndex; i < PROFILE_STEP_ORDER.length; i++) {
        var id = PROFILE_STEP_ORDER[i];
        if (!isStepSkipped(id)) return id;
      }
      return "gridType";
    }

    if (isGridStep(fromId)) {
      var gridIndex = GRID_STEP_ORDER.indexOf(fromId) + 1;
      if (gridIndex < GRID_STEP_ORDER.length) {
        return GRID_STEP_ORDER[gridIndex];
      }
      return "palette";
    }

    if (isColorStep(fromId)) {
      var colorIndex = COLORS_STEP_ORDER.indexOf(fromId) + 1;
      if (colorIndex < COLORS_STEP_ORDER.length) {
        return COLORS_STEP_ORDER[colorIndex];
      }
      return "borderSideSegments";
    }

    if (isFamilyStep(fromId)) {
      var familyIndex = FAMILY_STEP_ORDER.indexOf(fromId) + 1;
      if (familyIndex < FAMILY_STEP_ORDER.length) {
        return FAMILY_STEP_ORDER[familyIndex];
      }
      return "fanLeaves";
    }

    if (isBodyAutonomyStep(fromId)) {
      var bodyIndex = BODY_AUTONOMY_STEP_ORDER.indexOf(fromId) + 1;
      if (bodyIndex < BODY_AUTONOMY_STEP_ORDER.length) {
        return BODY_AUTONOMY_STEP_ORDER[bodyIndex];
      }
      return "angerVerticalLength";
    }

    if (isFeelingsStep(fromId)) {
      var feelingsIndex = FEELINGS_STEP_ORDER.indexOf(fromId) + 1;
      if (feelingsIndex < FEELINGS_STEP_ORDER.length) {
        return FEELINGS_STEP_ORDER[feelingsIndex];
      }
      return "__feelings_complete__";
    }

    return null;
  }

  function isStepComplete(stepId) {
    switch (stepId) {
      case "livingInIran":
        return answers.livingInIran === true || answers.livingInIran === false;
      case "livingDuration":
        return (
          answers.livingDuration === "smallPart" ||
          answers.livingDuration === "partOfLife" ||
          answers.livingDuration === "mostAll"
        );
      case "leavingYear":
        return String(answers.leavingYear || "").length === 4;
      case "from":
        return String(answers.from || "").trim().length > 0;
      case "nowIn":
        return String(answers.nowIn || "").trim().length > 0;
      case "name":
        if (answers.nameDisplayMode === "anonymous") return true;
        if (
          answers.nameDisplayMode === "initials" ||
          answers.nameDisplayMode === "name"
        ) {
          return String(answers.name || "").trim().length > 0;
        }
        return false;
      case "age":
        return String(answers.age || "").trim().length > 0;
      case "homeAt":
        return (
          answers.homeAt === "inIran" ||
          answers.homeAt === "whereILive" ||
          answers.homeAt === "nowhere"
        );
      case "gridType":
        return (
          answers.gridType === "octagon" ||
          answers.gridType === "star" ||
          answers.gridType === "circles" ||
          answers.gridType === "diamonds"
        );
      case "octagonsN":
        return (
          Number.isFinite(Number(answers.octagonsN)) &&
          Number(answers.octagonsN) >= 1 &&
          Number(answers.octagonsN) <= 10
        );
      case "innerScale":
        return (
          Number.isFinite(Number(answers.innerScale)) &&
          Number(answers.innerScale) >= 1 &&
          Number(answers.innerScale) <= 10
        );
      case "palette":
        return (
          Number.isFinite(Number(answers.palette)) &&
          Number(answers.palette) >= 1 &&
          Number(answers.palette) <= 12
        );
      case "borderSideSegments":
        return (
          Number.isFinite(Number(answers.borderSideSegments)) &&
          Number(answers.borderSideSegments) >= 1 &&
          Number(answers.borderSideSegments) <= 3
        );
      case "borderFrameDivisions":
        return (
          Number.isFinite(Number(answers.borderFrameDivisions)) &&
          Number(answers.borderFrameDivisions) >= 1 &&
          Number(answers.borderFrameDivisions) <= 3
        );
      case "borderSideWhiteFill":
        return (
          Number.isFinite(Number(answers.borderSideWhiteFill)) &&
          Number(answers.borderSideWhiteFill) >= 0 &&
          Number(answers.borderSideWhiteFill) <= 100
        );
      case "fanLeaves":
        return isNumericInRange(answers.fanLeaves, 0, 10);
      case "hopeMode":
        return answers.hopeMode === "view" || answers.hopeMode === "merge";
      default:
        if (FEELINGS_SLIDER_BOUNDS[stepId]) {
          var bounds = FEELINGS_SLIDER_BOUNDS[stepId];
          return isNumericInRange(answers[stepId], bounds[0], bounds[1]);
        }
        return false;
    }
  }

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function buildProfileRow() {
    var row = {};

    if (answers.livingInIran === true || answers.livingInIran === false) {
      row.livingInIran = answers.livingInIran;
      if (answers.livingInIran === false) {
        row.livingDuration = "";
        row.leavingYear = "";
      }
    }

    if (isLivingInIranYes()) {
      if (answers.livingDuration) {
        row.livingDuration = answers.livingDuration;
      }
      if (answers.leavingYear) {
        row.leavingYear = answers.leavingYear;
      }
    }

    if (answers.from) row.from = answers.from;
    if (answers.nowIn) row.nowIn = answers.nowIn;
    if (answers.name) row.name = answers.name;
    if (answers.nameDisplayMode) row.nameDisplayMode = answers.nameDisplayMode;
    if (answers.age) row.age = answers.age;
    if (answers.homeAt) row.homeAt = answers.homeAt;

    return row;
  }

  function triggerCanvasRender() {
    if (typeof window.render === "function") {
      window.render();
      return;
    }
    if (
      typeof window.SectionProgression !== "undefined" &&
      window.SectionProgression.notifySectionProgressChange
    ) {
      window.SectionProgression.notifySectionProgressChange();
    }
  }

  function isFeelingsSliderStep(stepId) {
    return Object.prototype.hasOwnProperty.call(FEELINGS_SLIDER_BOUNDS, stepId);
  }

  function hasFeelingsProgress() {
    var stepId;
    for (stepId in feelingsStepsReached) {
      if (
        Object.prototype.hasOwnProperty.call(feelingsStepsReached, stepId) &&
        feelingsStepsReached[stepId]
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Feelings markers need applyFeelingsControlState (not render alone) when
   * slider values change without a grid layout change — same path as combos.
   */
  function ensureQuestionnaireGridReady() {
    if (!answers.gridType || !window.SectionProgression) return;
    if (window.SectionProgression.isGridTypeChosen()) return;
    syncGridTypeToPanel();
  }

  function triggerFeelingsCanvasUpdate() {
    if (
      window.UnderCoverComboBridge &&
      window.UnderCoverComboBridge.refreshQuestionnaireCanvas
    ) {
      window.UnderCoverComboBridge.refreshQuestionnaireCanvas();
      return;
    }
    if (
      window.UnderCoverComboBridge &&
      window.UnderCoverComboBridge.finalizeApply
    ) {
      window.UnderCoverComboBridge.finalizeApply();
      return;
    }
    triggerCanvasRender();
  }

  function triggerCanvasUpdateAfterSync(stepId) {
    ensureQuestionnaireGridReady();
    ensureQuestionnaireCanvasUnlock(stepId);
    if (isFeelingsSliderStep(stepId) || isFeelingsStep(stepId)) {
      triggerFeelingsCanvasUpdate();
      return;
    }
    if (hasFeelingsProgress()) {
      triggerFeelingsCanvasUpdate();
      return;
    }
    triggerCanvasRender();
  }

  function ensureQuestionnaireCanvasUnlock(stepId) {
    if (!window.SectionProgression) return;
    if (
      isFamilyStep(stepId) ||
      isBodyAutonomyStep(stepId) ||
      isFeelingsStep(stepId)
    ) {
      if (window.SectionProgression.markFrameSectionEngaged) {
        window.SectionProgression.markFrameSectionEngaged();
      }
    }
    if (isBodyAutonomyStep(stepId) || isFeelingsStep(stepId)) {
      if (window.SectionProgression.markFanSectionEngaged) {
        window.SectionProgression.markFanSectionEngaged();
      }
    }
  }

  function markQuestionnaireProfileComplete() {
    if (
      typeof window.SectionProgression === "undefined" ||
      !window.SectionProgression.markQuestionnaireProfileComplete
    ) {
      return;
    }
    window.SectionProgression.markQuestionnaireProfileComplete();
  }

  function syncPanelSliderDom(sliderId, outputId, value, commit) {
    if (value === undefined || value === null || value === "") return;
    var slider = document.getElementById(sliderId);
    if (!slider) return;
    slider.value = String(value);
    if (outputId) {
      var output = document.getElementById(outputId);
      if (output) output.textContent = String(value);
    }
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    if (commit) {
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function syncGridTypeToPanel() {
    if (!answers.gridType) return;
    var btnId = GRID_BTN_IDS[answers.gridType];
    var btn = btnId ? document.getElementById(btnId) : null;
    if (btn) btn.click();
  }

  function syncGridToPanel() {
    if (gridStepsReached.gridType) {
      syncGridTypeToPanel();
    }
    if (gridStepsReached.octagonsN) {
      syncPanelSliderDom(
        "octagons-n",
        "octagons-n-out",
        answers.octagonsN,
        true
      );
    }
    if (gridStepsReached.innerScale) {
      syncPanelSliderDom(
        "inner-scale",
        "inner-scale-out",
        answers.innerScale,
        true
      );
    }
  }

  function syncPaletteToPanel(paletteNum) {
    var num = Number(paletteNum);
    if (!Number.isFinite(num) || num < 1 || num > 12) return;
    var key = "palette" + num;
    var btn = document.querySelector('[data-palette-key="' + key + '"]');
    if (btn) {
      btn.click();
      return;
    }
    if (
      typeof window.SheetPalettes !== "undefined" &&
      window.SheetPalettes.setActivePalette &&
      window.SheetPalettes.setActivePalette(key)
    ) {
      triggerCanvasRender();
    }
  }

  function syncColorsToPanel() {
    if (colorStepsReached.palette) {
      syncPaletteToPanel(answers.palette);
    }
  }

  function syncFamilyToPanel() {
    var stepId;
    for (stepId in familyStepsReached) {
      if (
        Object.prototype.hasOwnProperty.call(familyStepsReached, stepId) &&
        familyStepsReached[stepId]
      ) {
        var domIds = PANEL_SLIDER_DOM[stepId];
        if (domIds) {
          syncPanelSliderDom(
            domIds[0],
            domIds[1],
            answers[stepId],
            true
          );
        }
      }
    }
  }

  function syncBodyAutonomyToPanel() {
    if (bodyAutonomyStepsReached.fanLeaves) {
      var fanDom = PANEL_SLIDER_DOM.fanLeaves;
      syncPanelSliderDom(
        fanDom[0],
        fanDom[1],
        answers.fanLeaves,
        true
      );
    }
  }

  function syncHopeModeToPanel(mode) {
    var btnId =
      mode === "merge" ? "hope-mode-merge-btn" : "hope-mode-view-btn";
    var btn = document.getElementById(btnId);
    if (btn) btn.click();
  }

  function syncFeelingsToPanel() {
    var stepId;
    for (stepId in feelingsStepsReached) {
      if (
        !Object.prototype.hasOwnProperty.call(feelingsStepsReached, stepId) ||
        !feelingsStepsReached[stepId]
      ) {
        continue;
      }
      if (stepId === "hopeMode") {
        syncHopeModeToPanel(answers.hopeMode);
        continue;
      }
      var domIds = PANEL_SLIDER_DOM[stepId];
      if (domIds) {
        syncPanelSliderDom(domIds[0], domIds[1], answers[stepId], true);
      }
    }
  }

  function syncProfileToPanel() {
    if (
      typeof window.IdentityControls === "undefined" ||
      !window.IdentityControls.applyProfileState
    ) {
      return;
    }
    window.IdentityControls.applyProfileState(buildProfileRow());
  }

  function syncToPanel() {
    syncProfileToPanel();
    syncGridToPanel();
    syncColorsToPanel();
    syncFamilyToPanel();
    syncBodyAutonomyToPanel();
    syncFeelingsToPanel();
  }

  function markStepReached(stepId) {
    if (isProfileStep(stepId)) {
      profileStepsReached[stepId] = true;
    }
    if (isGridStep(stepId)) {
      gridStepsReached[stepId] = true;
    }
    if (isColorStep(stepId)) {
      colorStepsReached[stepId] = true;
    }
    if (isFamilyStep(stepId)) {
      familyStepsReached[stepId] = true;
    }
    if (isBodyAutonomyStep(stepId)) {
      bodyAutonomyStepsReached[stepId] = true;
    }
    if (isFeelingsStep(stepId)) {
      feelingsStepsReached[stepId] = true;
    }
  }

  var SECTION_LABELS = {
    profile: { num: 1, name: "Profile" },
    grid: { num: 2, name: "Grid" },
    colors: { num: 3, name: "Colors" },
    family: { num: 4, name: "Family and friends in Iran" },
    bodyAutonomy: { num: 5, name: "Body autonomy" },
    feelings: { num: 6, name: "Feelings" },
  };

  function formatSectionLabel(sectionKey) {
    var section = SECTION_LABELS[sectionKey];
    return section.num + "/ " + section.name;
  }

  function updateSectionLabel(stepId) {
    if (!sectionLabelEl) return;
    if (stepId === "__feelings_complete__" || isFeelingsStep(stepId)) {
      sectionLabelEl.textContent = formatSectionLabel("feelings");
      return;
    }
    if (isBodyAutonomyStep(stepId)) {
      sectionLabelEl.textContent = formatSectionLabel("bodyAutonomy");
      return;
    }
    if (isFamilyStep(stepId)) {
      sectionLabelEl.textContent = formatSectionLabel("family");
      return;
    }
    if (isColorStep(stepId)) {
      sectionLabelEl.textContent = formatSectionLabel("colors");
      return;
    }
    if (isGridStep(stepId)) {
      sectionLabelEl.textContent = formatSectionLabel("grid");
      return;
    }
    sectionLabelEl.textContent = formatSectionLabel("profile");
  }

  function filterSkippedSteps(steps) {
    return steps.filter(function (id) {
      return !isStepSkipped(id);
    });
  }

  function getSectionStepOrder(stepId) {
    if (stepId === "__feelings_complete__" || isFeelingsStep(stepId)) {
      return FEELINGS_STEP_ORDER.slice();
    }
    if (isBodyAutonomyStep(stepId)) {
      return BODY_AUTONOMY_STEP_ORDER.slice();
    }
    if (isFamilyStep(stepId)) {
      return FAMILY_STEP_ORDER.slice();
    }
    if (isColorStep(stepId)) {
      return COLORS_STEP_ORDER.slice();
    }
    if (isGridStep(stepId)) {
      return GRID_STEP_ORDER.slice();
    }
    return filterSkippedSteps(PROFILE_STEP_ORDER);
  }

  function isStepReached(stepId) {
    if (isProfileStep(stepId)) {
      return profileStepsReached[stepId] === true;
    }
    if (isGridStep(stepId)) {
      return gridStepsReached[stepId] === true;
    }
    if (isColorStep(stepId)) {
      return colorStepsReached[stepId] === true;
    }
    if (isFamilyStep(stepId)) {
      return familyStepsReached[stepId] === true;
    }
    if (isBodyAutonomyStep(stepId)) {
      return bodyAutonomyStepsReached[stepId] === true;
    }
    if (isFeelingsStep(stepId)) {
      return feelingsStepsReached[stepId] === true;
    }
    return false;
  }

  function getProgressIndex(stepId) {
    var orderedSteps = getSectionStepOrder(stepId);
    if (stepId === "__feelings_complete__") {
      return orderedSteps.length;
    }
    var index = orderedSteps.indexOf(stepId);
    return index < 0 ? 0 : index;
  }

  function canNavigateToStep(displayStepId, targetStepId) {
    if (!targetStepId || targetStepId === "__feelings_complete__") return false;
    if (targetStepId === displayStepId) return false;

    var orderedSteps = getSectionStepOrder(displayStepId);
    var currentIndex = getProgressIndex(displayStepId);
    var targetIndex = orderedSteps.indexOf(targetStepId);
    if (targetIndex < 0) return false;
    if (targetIndex < currentIndex) return true;
    return targetIndex > currentIndex && isStepReached(targetStepId);
  }

  function navigateToStep(targetStepId) {
    if (!displayStepId || !canNavigateToStep(displayStepId, targetStepId)) {
      return;
    }

    if (!activeStepEl || !viewport || prefersReducedMotion()) {
      goToStep(targetStepId);
      return;
    }

    activeStepEl.classList.remove("is-active");
    activeStepEl.classList.add("is-exiting");

    var exited = false;
    function onExitEnd(event) {
      if (exited) return;
      if (event.propertyName !== "opacity") return;
      exited = true;
      activeStepEl.removeEventListener("transitionend", onExitEnd);
      goToStep(targetStepId);
    }

    activeStepEl.addEventListener("transitionend", onExitEnd);
    window.setTimeout(function () {
      if (!exited) {
        exited = true;
        activeStepEl.removeEventListener("transitionend", onExitEnd);
        goToStep(targetStepId);
      }
    }, TRANSITION_MS + 50);
  }

  function updateProgressDots(stepId) {
    if (!progressEl) return;

    var orderedSteps = getSectionStepOrder(stepId);
    var currentIndex = getProgressIndex(stepId);

    progressEl.innerHTML = "";

    for (var i = 0; i < orderedSteps.length; i++) {
      var stepKey = orderedSteps[i];
      var isFilled = isStepReached(stepKey);
      var isCurrent = i === currentIndex && stepId !== "__feelings_complete__";
      var isClickable = canNavigateToStep(stepId, stepKey);
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "questionnaire-panel__progress-dot";
      dot.setAttribute("data-step-id", stepKey);
      if (isFilled) {
        dot.classList.add("is-filled");
      }
      if (isCurrent) {
        dot.classList.add("is-current");
      }
      if (isClickable) {
        dot.classList.add("is-clickable");
        dot.setAttribute(
          "aria-label",
          (i < currentIndex ? "Back to question " : "Skip to question ") +
            (i + 1) +
            " of " +
            orderedSteps.length
        );
        dot.addEventListener("click", function (event) {
          var targetId = event.currentTarget.getAttribute("data-step-id");
          navigateToStep(targetId);
        });
      } else {
        dot.disabled = true;
        dot.setAttribute(
          "aria-label",
          isCurrent
            ? "Current question " + (i + 1) + " of " + orderedSteps.length
            : "Question " + (i + 1) + " of " + orderedSteps.length
        );
      }
      progressEl.appendChild(dot);
    }
  }

  function clearViewport() {
    if (!viewport) return;
    viewport.innerHTML = "";
    activeStepEl = null;
  }

  function createHeading(step) {
    if (!step.label || step.hideHeading) return null;
    var heading = document.createElement("h3");
    heading.className = "questionnaire-step__heading";
    if (step.wrap) {
      heading.classList.add("questionnaire-step__heading--wrap");
    }
    if (step.letter) {
      heading.setAttribute("data-letter", step.letter);
    }
    heading.textContent = step.label;
    return heading;
  }

  function bindImmediateAdvance() {
    window.setTimeout(function () {
      advance();
    }, prefersReducedMotion() ? 0 : 120);
  }

  function appendContinueIfComplete(answersWrap, stepId) {
    if (!isStepComplete(stepId)) return;
    var continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.className = "questionnaire-continue";
    continueBtn.textContent = "Continue";
    continueBtn.addEventListener("click", function () {
      advance();
    });
    answersWrap.appendChild(continueBtn);
  }

  function renderYesNo(stepConfig, stepId) {
    var answersWrap = document.createElement("div");
    answersWrap.className = "questionnaire-step__answers";

    var group = document.createElement("div");
    group.className = "questionnaire-options questionnaire-options--row";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", stepConfig.ariaLabel);

    function makeBtn(label, value) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "questionnaire-option";
      btn.textContent = label;
      if (answers[stepId] === value) {
        btn.classList.add("is-selected");
      }
      btn.addEventListener("click", function () {
        answers[stepId] = value;
        group.querySelectorAll(".questionnaire-option").forEach(function (el) {
          el.classList.remove("is-selected");
        });
        btn.classList.add("is-selected");
        bindImmediateAdvance();
      });
      return btn;
    }

    group.appendChild(makeBtn("Yes", true));
    group.appendChild(makeBtn("No", false));
    answersWrap.appendChild(group);
    appendContinueIfComplete(answersWrap, stepId);
    return answersWrap;
  }

  function renderChoice(stepConfig, stepId) {
    var answersWrap = document.createElement("div");
    answersWrap.className = "questionnaire-step__answers";

    var group = document.createElement("div");
    group.className = "questionnaire-options questionnaire-options--multi";
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", stepConfig.ariaLabel);

    stepConfig.options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "questionnaire-option";
      btn.textContent = opt.label;
      btn.setAttribute("data-value", opt.value);
      if (answers[stepId] === opt.value) {
        btn.classList.add("is-selected");
      }
      btn.addEventListener("click", function () {
        answers[stepId] = opt.value;
        group.querySelectorAll(".questionnaire-option").forEach(function (el) {
          el.classList.remove("is-selected");
        });
        btn.classList.add("is-selected");
        if (stepId === "gridType") {
          gridStepsReached.gridType = true;
          syncGridTypeToPanel();
          triggerCanvasRender();
        }
        if (stepId === "hopeMode") {
          syncHopeModeToPanel(opt.value);
        }
        bindImmediateAdvance();
      });
      group.appendChild(btn);
    });

    answersWrap.appendChild(group);
    appendContinueIfComplete(answersWrap, stepId);
    return answersWrap;
  }

  function renderTextInput(stepConfig, stepId) {
    var answersWrap = document.createElement("div");
    answersWrap.className = "questionnaire-step__answers";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "questionnaire-input";
    if (stepConfig.english) {
      input.classList.add("questionnaire-input--english");
      input.lang = "en";
    }
    input.value = String(answers[stepId] || "");
    input.setAttribute("aria-label", stepConfig.ariaLabel);
    if (stepConfig.placeholder) {
      input.placeholder = stepConfig.placeholder;
    }
    if (stepConfig.inputMode) {
      input.inputMode = stepConfig.inputMode;
    }
    if (stepConfig.maxLength) {
      input.maxLength = stepConfig.maxLength;
    }
    input.autocomplete = "off";
    input.spellcheck = false;

    var continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.className = "questionnaire-continue";
    continueBtn.textContent = "Continue";
    continueBtn.disabled = !isStepComplete(stepId);

    function syncValue() {
      answers[stepId] = input.value;
      continueBtn.disabled = !isStepComplete(stepId);
    }

    input.addEventListener("input", syncValue);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && isStepComplete(stepId)) {
        event.preventDefault();
        advance();
      }
    });

    continueBtn.addEventListener("click", function () {
      if (isStepComplete(stepId)) advance();
    });

    answersWrap.appendChild(input);
    answersWrap.appendChild(continueBtn);
    return answersWrap;
  }

  function renderName(stepConfig) {
    var answersWrap = document.createElement("div");
    answersWrap.className = "questionnaire-step__answers";

    var input = document.createElement("input");
    input.type = "text";
    input.className =
      "questionnaire-input questionnaire-input--english";
    input.lang = "en";
    input.value = String(answers.name || "");
    input.placeholder = stepConfig.placeholder;
    input.setAttribute("aria-label", stepConfig.ariaLabel);
    input.autocomplete = "off";
    input.spellcheck = false;

    var modeGroup = document.createElement("div");
    modeGroup.className = "questionnaire-options questionnaire-options--row";
    modeGroup.setAttribute("role", "group");
    modeGroup.setAttribute("aria-label", stepConfig.modeAriaLabel);

    var continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.className = "questionnaire-continue";
    continueBtn.textContent = "Continue";
    continueBtn.disabled = !isStepComplete("name");

    function syncContinue() {
      continueBtn.disabled = !isStepComplete("name");
    }

    input.addEventListener("input", function () {
      answers.name = input.value;
      syncContinue();
    });

    stepConfig.modes.forEach(function (mode) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "questionnaire-option";
      btn.textContent = mode.label;
      if (answers.nameDisplayMode === mode.value) {
        btn.classList.add("is-selected");
      }
      btn.addEventListener("click", function () {
        answers.nameDisplayMode = mode.value;
        modeGroup.querySelectorAll(".questionnaire-option").forEach(function (el) {
          el.classList.remove("is-selected");
        });
        btn.classList.add("is-selected");
        syncContinue();
      });
      modeGroup.appendChild(btn);
    });

    continueBtn.addEventListener("click", function () {
      if (isStepComplete("name")) advance();
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && isStepComplete("name")) {
        event.preventDefault();
        advance();
      }
    });

    answersWrap.appendChild(input);
    answersWrap.appendChild(modeGroup);
    answersWrap.appendChild(continueBtn);
    return answersWrap;
  }

  function renderSlider(stepConfig, stepId) {
    var answersWrap = document.createElement("div");
    answersWrap.className = "questionnaire-step__answers";

    var sliderWrap = document.createElement("div");
    sliderWrap.className = "questionnaire-slider-wrap";

    if (stepConfig.rangeLabels && stepConfig.rangeLabels.length) {
      var rangeLabels = document.createElement("div");
      rangeLabels.className = "questionnaire-slider-range-labels";
      rangeLabels.setAttribute("aria-hidden", "true");
      stepConfig.rangeLabels.forEach(function (label, index) {
        var span = document.createElement("span");
        span.className = "questionnaire-slider-range-label";
        if (index === stepConfig.rangeLabels.length - 1) {
          span.classList.add("questionnaire-slider-range-label--end");
        }
        span.textContent = label;
        rangeLabels.appendChild(span);
      });
      sliderWrap.appendChild(rangeLabels);
    }

    var control = document.createElement("div");
    control.className = "questionnaire-slider-control";

    var slider = document.createElement("input");
    slider.type = "range";
    slider.className = "questionnaire-slider";
    slider.min = String(stepConfig.min);
    slider.max = String(stepConfig.max);
    slider.step = String(stepConfig.step || 1);
    slider.value = String(answers[stepId]);
    slider.setAttribute("aria-label", stepConfig.ariaLabel);

    var output = document.createElement("output");
    output.className = "questionnaire-slider-output";
    output.textContent =
      String(answers[stepId]) + (stepConfig.outputSuffix || "");

    var continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.className = "questionnaire-continue";
    continueBtn.textContent = "Continue";
    continueBtn.disabled = !isStepComplete(stepId);

    slider.addEventListener("input", function () {
      answers[stepId] = Number(slider.value);
      output.textContent = slider.value + (stepConfig.outputSuffix || "");
      continueBtn.disabled = !isStepComplete(stepId);
      if (stepConfig.sync === "palette") {
        syncPaletteToPanel(answers[stepId]);
        return;
      }
      var domIds = PANEL_SLIDER_DOM[stepId];
      if (domIds) {
        syncPanelSliderDom(domIds[0], domIds[1], answers[stepId], false);
        triggerCanvasUpdateAfterSync(stepId);
      }
    });

    continueBtn.addEventListener("click", function () {
      if (isStepComplete(stepId)) advance();
    });

    control.appendChild(slider);
    control.appendChild(output);
    sliderWrap.appendChild(control);
    answersWrap.appendChild(sliderWrap);
    answersWrap.appendChild(continueBtn);
    return answersWrap;
  }

  function stylePaletteDotFill(fill, paletteNum) {
    if (!fill) return;
    var key = "palette" + paletteNum;
    var sheetPalettes = window.SheetPalettes;
    if (
      !sheetPalettes ||
      !sheetPalettes.getProminentPaletteColors ||
      !sheetPalettes.getPaletteMeshGradient
    ) {
      fill.style.background = "#cccccc";
      fill.style.backgroundColor = "#cccccc";
      fill.classList.remove("questionnaire-palette-dot__fill--mesh");
      return;
    }

    var colors = sheetPalettes.getProminentPaletteColors(key);
    if (!colors.length) {
      fill.style.background = "#cccccc";
      fill.style.backgroundColor = "#cccccc";
      fill.classList.remove("questionnaire-palette-dot__fill--mesh");
      return;
    }

    fill.style.backgroundColor = colors[0];
    if (colors.length === 1) {
      fill.style.background = colors[0];
      fill.classList.remove("questionnaire-palette-dot__fill--mesh");
      return;
    }

    fill.style.background = sheetPalettes.getPaletteMeshGradient(key);
    fill.classList.add("questionnaire-palette-dot__fill--mesh");
  }

  function applyPaletteDotBackgrounds(group) {
    if (!group) return;
    var dots = group.querySelectorAll("[data-palette-num]");
    var i;
    for (i = 0; i < dots.length; i++) {
      var btn = dots[i];
      var num = Number(btn.getAttribute("data-palette-num"));
      if (!Number.isFinite(num)) continue;
      var fill = btn.querySelector(".questionnaire-palette-dot__fill");
      stylePaletteDotFill(fill, num);
    }
  }

  function refreshPalettePickerGradients() {
    if (currentStepId !== "palette" || !activePalettePickerGroup) return;
    applyPaletteDotBackgrounds(activePalettePickerGroup);
  }

  function ensurePaletteLoadedRefreshHook() {
    if (
      palettesLoadedHookRegistered ||
      typeof window.SheetPalettes === "undefined" ||
      !window.SheetPalettes.onPalettesLoaded
    ) {
      return;
    }
    palettesLoadedHookRegistered = true;
    window.SheetPalettes.onPalettesLoaded(function () {
      refreshPalettePickerGradients();
    });
  }

  function renderPalettePicker(stepConfig, stepId) {
    var answersWrap = document.createElement("div");
    answersWrap.className = "questionnaire-step__answers";

    var group = document.createElement("div");
    group.className = "questionnaire-palette-picker";
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", stepConfig.ariaLabel);

    var continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.className = "questionnaire-continue";
    continueBtn.textContent = "Continue";
    continueBtn.disabled = !isStepComplete(stepId);

    var n;
    for (n = 1; n <= 12; n++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "questionnaire-palette-dot";
      btn.setAttribute("data-palette-num", String(n));
      btn.setAttribute("aria-label", "Palette " + n);
      btn.setAttribute("aria-pressed", answers.palette === n ? "true" : "false");
      if (answers.palette === n) {
        btn.classList.add("is-selected");
      }
      var fill = document.createElement("span");
      fill.className = "questionnaire-palette-dot__fill";
      fill.setAttribute("aria-hidden", "true");
      stylePaletteDotFill(fill, n);
      btn.appendChild(fill);
      (function (paletteNum, button) {
        button.addEventListener("click", function () {
          answers[stepId] = paletteNum;
          group.querySelectorAll(".questionnaire-palette-dot").forEach(function (el) {
            el.classList.remove("is-selected");
            el.setAttribute("aria-pressed", "false");
          });
          button.classList.add("is-selected");
          button.setAttribute("aria-pressed", "true");
          syncPaletteToPanel(paletteNum);
          continueBtn.disabled = !isStepComplete(stepId);
        });
      })(n, btn);
      group.appendChild(btn);
    }

    activePalettePickerGroup = group;
    ensurePaletteLoadedRefreshHook();
    refreshPalettePickerGradients();

    continueBtn.addEventListener("click", function () {
      if (isStepComplete(stepId)) advance();
    });

    answersWrap.appendChild(group);
    answersWrap.appendChild(continueBtn);
    return answersWrap;
  }

  function renderComplete(title, message) {
    var stepEl = document.createElement("div");
    stepEl.className =
      "questionnaire-step questionnaire-step--complete is-active";

    var heading = document.createElement("h3");
    heading.className = "questionnaire-step__heading";
    heading.textContent = title;

    var text = document.createElement("p");
    text.className = "questionnaire-step__complete-text";
    text.textContent = message;

    stepEl.appendChild(heading);
    stepEl.appendChild(text);
    return stepEl;
  }

  function buildStepElement(stepId) {
    if (stepId === "__feelings_complete__") {
      return renderComplete(
        "Feelings complete",
        "Thank you. Your feeling choices are applied to the handkerchief."
      );
    }

    var stepConfig = STEPS[stepId];
    if (!stepConfig) return null;

    var stepEl = document.createElement("div");
    stepEl.className = "questionnaire-step";
    stepEl.setAttribute("data-step-id", stepId);

    var heading = createHeading(stepConfig);
    if (heading) stepEl.appendChild(heading);

    var answersEl;
    switch (stepConfig.type) {
      case "yesno":
        answersEl = renderYesNo(stepConfig, stepId);
        break;
      case "choice":
        answersEl = renderChoice(stepConfig, stepId);
        break;
      case "text":
        answersEl = renderTextInput(stepConfig, stepId);
        break;
      case "name":
        answersEl = renderName(stepConfig);
        break;
      case "slider":
        answersEl = renderSlider(stepConfig, stepId);
        break;
      case "palette-picker":
        answersEl = renderPalettePicker(stepConfig, stepId);
        break;
      default:
        return null;
    }

    stepEl.appendChild(answersEl);
    return stepEl;
  }

  function syncCanvasLayoutForStep() {
    if (typeof window.layoutStage !== "function") return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        window.layoutStage();
      });
    });
  }

  function showStep(stepId) {
    if (!viewport) return;

    if (currentStepId === "palette" && stepId !== "palette") {
      activePalettePickerGroup = null;
    }

    var stepEl = buildStepElement(stepId);
    if (!stepEl) return;

    clearViewport();
    displayStepId = stepId;
    currentStepId =
      stepId === "__feelings_complete__" ? null : stepId;
    activeStepEl = stepEl;
    updateSectionLabel(stepId);
    updateProgressDots(stepId);
    ensureQuestionnaireCanvasUnlock(stepId);
    syncCanvasLayoutForStep();

    if (prefersReducedMotion()) {
      stepEl.classList.add("is-active");
      viewport.appendChild(stepEl);
      var focusTarget = stepEl.querySelector(
        "input, button.questionnaire-option, button.questionnaire-continue, input.questionnaire-slider"
      );
      if (focusTarget) focusWithoutScroll(focusTarget);
      return;
    }

    viewport.appendChild(stepEl);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        stepEl.classList.add("is-active");
        var focusTarget = stepEl.querySelector(
          "input, button.questionnaire-option, button.questionnaire-continue, input.questionnaire-slider"
        );
        if (focusTarget) focusWithoutScroll(focusTarget);
      });
    });
  }

  function goToStep(nextId) {
    if (nextId) {
      showStep(nextId);
      return;
    }
    showStep("__feelings_complete__");
  }

  function advance() {
    if (!currentStepId) return;

    if (currentStepId === "homeAt") {
      markQuestionnaireProfileComplete();
    }

    markStepReached(currentStepId);
    syncToPanel();
    triggerCanvasUpdateAfterSync(currentStepId);

    var nextId = getNextStepId(currentStepId);

    if (!activeStepEl || !viewport) {
      goToStep(nextId);
      return;
    }

    if (prefersReducedMotion()) {
      goToStep(nextId);
      return;
    }

    activeStepEl.classList.remove("is-active");
    activeStepEl.classList.add("is-exiting");

    var exited = false;
    function onExitEnd(event) {
      if (exited) return;
      if (event.propertyName !== "opacity") return;
      exited = true;
      activeStepEl.removeEventListener("transitionend", onExitEnd);
      goToStep(nextId);
    }

    activeStepEl.addEventListener("transitionend", onExitEnd);
    window.setTimeout(function () {
      if (!exited) {
        exited = true;
        activeStepEl.removeEventListener("transitionend", onExitEnd);
        goToStep(nextId);
      }
    }, TRANSITION_MS + 50);
  }

  function init() {
    viewport = document.getElementById("questionnaire-viewport");
    sectionLabelEl = document.getElementById("questionnaire-section-label");
    progressEl = document.getElementById("questionnaire-progress");
    if (!viewport) return;
    showStep("livingInIran");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.Questionnaire = {
    getAnswers: function () {
      return Object.assign({}, answers);
    },
    getCurrentStepId: function () {
      return currentStepId;
    },
    isProfileStep: isProfileStep,
  };
})();
