(function () {
  "use strict";

  var PAGE2_REF_WIDTH = 1728;

  function page2PxToVw(px) {
    return (px / PAGE2_REF_WIDTH) * 100;
  }

  function page2PxToRem(px) {
    return px / 16;
  }

  function page2FluidPx(px, minPx, maxPx) {
    var vw = page2PxToVw(px).toFixed(3) + "vw";
    var min = page2PxToRem(minPx != null ? minPx : px * 0.75).toFixed(3) + "rem";
    var max = page2PxToRem(maxPx != null ? maxPx : px * 1.25).toFixed(3) + "rem";
    return "clamp(" + min + ", " + vw + ", " + max + ")";
  }

  /** Read a #page2 custom property as computed CSS pixels (for layout JS). */
  function readPage2CssLengthPx(customPropertyName) {
    var page2 = document.getElementById("page2");
    if (!page2) return 0;
    var probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.width = "var(" + customPropertyName + ")";
    page2.appendChild(probe);
    var px = probe.getBoundingClientRect().width;
    page2.removeChild(probe);
    return px;
  }

  /** Scale screen-layout px from 1728 reference (cap 1.5×) — questionnaire zoom only. */
  function scalePage2Px(px) {
    var w = window.innerWidth || PAGE2_REF_WIDTH;
    return px * Math.min(w / PAGE2_REF_WIDTH, 1.5);
  }

  window.Page2Units = {
    PAGE2_REF_WIDTH: PAGE2_REF_WIDTH,
    page2PxToVw: page2PxToVw,
    page2PxToRem: page2PxToRem,
    page2FluidPx: page2FluidPx,
    readPage2CssLengthPx: readPage2CssLengthPx,
    scalePage2Px: scalePage2Px,
  };
})();
