/**
 * Sign glossary entries for the page-2 Signs section.
 * Each entry maps to one 2:3 card; `section` enables future grouped layouts.
 */
(function (global) {
  "use strict";

  /** Uniform brown card background (matches --color-brown in styles.css) */
  var SIGNS_CARD_BG = "#442c28";

  var SIGNS_SECTIONS = [
    {
      id: "profile",
      label: "profile",
      labelFa: "پروفایل",
      description:
        "This layer holds the personal details: name, age, and the country where the woman currently lives. It is the most neutral layer, forming the basic context of her story.",
      descriptionFa:
        "این قسمت جزئیات شخصی - نام، سن و کشوری که زن در آن زندگی می‌کند - را در بر می‌گیرد. خنثی‌ترین لایه است و زمینهٔ پایهٔ داستان او را می‌سازد.",
    },
    {
      id: "grid",
      label: "Community",
      labelFa: "جامعه",
      description:
        "This layer focuses on her sense of belonging to the Iranian community and how present her Iranian identity is in her everyday life. It maps how strongly Iran still shapes who she is.",
      descriptionFa:
        "این قسمت بر حس تعلق او به جامعهٔ ایرانی و حضور هویت ایرانی‌اش در زندگی روزمره تمرکز دارد. نشان می‌دهد ایران تا چه اندازه همچنان شکل‌دهندهٔ هویت اوست.",
    },
    {
      id: "family",
      label: "Family",
      labelFa: "خانواده",
      description:
        "This layer speaks about the family and friends who remain in Iran, and the loss, distance, or longing she experiences in relation to them. It marks the emotional borders between the life she left and the people who stayed.",
      descriptionFa:
        "این قسمت دربارهٔ خانواده و دوستانی است که در ایران مانده‌اند و فقدان، فاصله یا اشتیاقی که در رابطه با آن‌ها تجربه می‌کنند. مرزهای عاطفی بین زندگی‌ای که رها کرده و کسانی که مانده‌اند را ترسیم می‌کند.",
    },
    {
      id: "bodyAutonomy",
      /* The newline forces the English title to break after "Body" so
         "autonomy" drops to the line below on the Signs page. The Signs title
         renders newlines via `white-space: pre-line`. */
      label: "Body\nautonomy",
      labelFa: "آزادی پوشش",
      description:
        "This layer reflects how much autonomy and ownership she felt over her own body while living in Iran. It captures her experience of control, restriction, or freedom in relation to her physical self.",
      descriptionFa:
        "این قسمت منعکس‌کنندهٔ میزان خودمختاری و مالکیتی است که در ایران بر بدن خود احساس می‌کرد. تجربهٔ کنترل، محدودیت یا آزادی بر پوشش و رابطه با جسم خود را ثبت\u00A0می‌کند.",
    },
    {
      id: "feelings",
      label: "Feelings",
      labelFa: "احساسات",
      description:
        "This final layer holds the most significant feelings that arise when she thinks about Iran. It translates her emotional landscape into visual form - from grief and anger to hope and connection.",
      descriptionFa:
        "قسمت نهایی مهم‌ترین احساساتی را در بر می‌گیرد که با فکر کردن به ایران به وجود می‌آیند. منظر عاطفی او را به فرم بصری ترجمه می‌کند - از سوگ و خشم تا امید\u00A0و\u00A0پیوند.",
    },
  ];

  var GRID_INNER_SCALE_CONFIG = {
    label:
      "How much do you feel that Iranian identity is a central part of your life today?",
    labelFa:
      "تا چه حد هویت ایرانی امروز بخش مرکزی زندگی‌تان است؟",
    ariaLabel:
      "How much do you feel that Iranian identity is a central part of your life today? in the background to very central.",
    ariaLabelFa:
      "تا چه حد هویت ایرانی بخش مرکزی زندگی‌تان است؟ از پس‌زمینه تا بسیار مرکزی.",
    min: 1,
    max: 10,
    step: 1,
    rangeLabels: ["in the background", "very central"],
    rangeLabelsFa: ["در پس‌زمینه", "بسیار مرکزی"],
  };

  var SIGNS_CATALOG = [
    /* —— Profile —— */
    {
      id: "profile-age",
      section: "profile",
      label: "Age",
      labelFa: "سن",
      visual: { type: "svgFile", file: "age.svg" },
    },
    {
      id: "profile-now-in",
      section: "profile",
      label: "Now in",
      labelFa: "اکنون در",
      visual: { type: "svgFile", file: "now in.svg" },
    },
    {
      id: "profile-leaving-year",
      section: "profile",
      label: "Leaving year",
      labelFa: "سال خروج",
      visual: { type: "svgFile", file: "left.svg" },
    },
    {
      id: "profile-home-inIran",
      section: "profile",
      label: "in Iran",
      labelFa: "در ایران",
      visual: { type: "svgFile", file: "home/IN IRAN home.svg" },
    },
    {
      id: "profile-home-whereILive",
      section: "profile",
      label: "where I live",
      labelFa: "جایی که زندگی می‌کنم",
      visual: { type: "svgFile", file: "home/WHERE I LIVE.svg" },
    },
    {
      id: "profile-home-nowhere",
      section: "profile",
      label: "nowhere",
      labelFa: "هیچ‌جا",
      visual: { type: "svgFile", file: "home/NOWHERE.svg" },
    },
    {
      id: "profile-living-smallPart",
      section: "profile",
      label: "small part of my life",
      labelFa: "بخش کوچکی از زندگی‌ام",
      visual: {
        type: "svgFile",
        file: "Did you ever live in Iran?/small part of my life.svg",
      },
    },
    {
      id: "profile-living-partOfLife",
      section: "profile",
      label: "part of my life",
      labelFa: "بخشی از زندگی‌ام",
      visual: {
        type: "svgFile",
        file: "Did you ever live in Iran?/part of my life.svg",
      },
    },
    {
      id: "profile-living-mostAll",
      section: "profile",
      label: "most of my life",
      labelFa: "بیشتر زندگی‌ام",
      visual: {
        type: "svgFile",
        file: "Did you ever live in Iran?/Yes, most : all of my life.svg",
      },
    },

    /* —— Grid —— */
    {
      id: "grid-star",
      section: "grid",
      label: "",
      labelFa: "",
      visual: { type: "gridIcon", gridType: "star" },
    },

    /* —— Feelings —— */
    {
      id: "feelings-fear-anxiety",
      section: "feelings",
      label: "Fear / Anxiety",
      labelFa: "ترس / اضطراب",
      visual: { type: "canvasPreview", previewId: "fear" },
    },
    {
      id: "feelings-anger",
      section: "feelings",
      label: "Anger",
      labelFa: "خشم",
      visual: { type: "canvasPreview", previewId: "anger" },
    },
    {
      id: "feelings-hope",
      section: "feelings",
      label: "Hope",
      labelFa: "امید",
      visual: { type: "canvasPreview", previewId: "hope" },
    },
    {
      id: "feelings-sadness",
      section: "feelings",
      label: "Sadness",
      labelFa: "غم",
      visual: { type: "canvasPreview", previewId: "sadness" },
    },
    {
      id: "feelings-longing",
      section: "feelings",
      label: "Longing",
      labelFa: "اشتیاق",
      visual: { type: "canvasPreview", previewId: "longing" },
    },
    {
      id: "feelings-grief",
      section: "feelings",
      label: "Grief",
      labelFa: "سوگ",
      visual: { type: "canvasPreview", previewId: "grief" },
    },
    {
      id: "feelings-strength",
      section: "feelings",
      label: "Strength",
      labelFa: "قدرت",
      visual: { type: "canvasPreview", previewId: "strength" },
    },
    {
      id: "feelings-pride",
      section: "feelings",
      label: "Pride",
      labelFa: "افتخار",
      visual: { type: "canvasPreview", previewId: "pride" },
    },
    {
      id: "feelings-pain",
      section: "feelings",
      label: "Pain",
      labelFa: "درد",
      visual: { type: "canvasPreview", previewId: "pain" },
    },
    {
      id: "feelings-guiltShame",
      section: "feelings",
      label: "Guilt",
      labelFa: "گناه",
      visual: { type: "canvasPreview", previewId: "guiltShame" },
    },
    {
      id: "feelings-helplessness",
      section: "feelings",
      label: "Helplessness",
      labelFa: "درماندگی",
      visual: { type: "canvasPreview", previewId: "helplessness" },
    },

    /* —— Family ——
       Standalone divided rectangle, drawn locally in signsPage.js. This is
       intentionally NOT a canvasPreview of the handkerchief product engine —
       the family sign is fully separated from the border-frame-divisions
       product system. */
    {
      id: "family-frame-line",
      section: "family",
      label: "",
      labelFa: "",
      visual: { type: "familyDivisions", maxSegments: 5 },
    },

    /* —— Body autonomy —— */
    {
      id: "body-fanLeaves",
      section: "bodyAutonomy",
      label: "Fan leaves",
      labelFa: "برگ‌های بادبزن",
      visual: { type: "canvasPreview", previewId: "fanLeaves" },
    },

  ];

  function getSignsCardBgColor() {
    return SIGNS_CARD_BG;
  }

  global.SignsCatalog = {
    entries: SIGNS_CATALOG,
    sections: SIGNS_SECTIONS,
    gridInnerScaleConfig: GRID_INNER_SCALE_CONFIG,
    cardBg: SIGNS_CARD_BG,
    getCardBgColor: getSignsCardBgColor,
  };
})(typeof window !== "undefined" ? window : this);
