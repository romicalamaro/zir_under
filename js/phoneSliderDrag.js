/**
 * Phones: drag the questionnaire / signs sliders freely with a finger.
 *
 * The sliders are native range inputs whose thumb is hidden (0 × 0, the bar
 * fill is the visual). On iPhone a range input only drags when the finger
 * starts on the thumb, so with no thumb the slider could only jump to a
 * tapped spot. Here a finger anywhere on the bar sets the value and follows
 * the finger. A mostly vertical swipe that starts on a slider still scrolls
 * the page (touch-action: pan-y in CSS) and leaves the value alone.
 */
(function () {
  "use strict";

  var phoneMq = window.matchMedia("(max-width: 767px)");
  var DRAG_START_PX = 6;
  var SCROLL_START_PX = 8;
  var gesture = null;

  function findSlider(target) {
    if (!target || !target.closest) return null;
    var direct = target.closest("input.questionnaire-slider");
    if (direct) return direct;
    var track = target.closest(".questionnaire-slider-track");
    return track ? track.querySelector("input.questionnaire-slider") : null;
  }

  function valueAt(slider, clientX) {
    var rect = slider.getBoundingClientRect();
    if (!(rect.width > 0)) return Number(slider.value);
    var pct = (clientX - rect.left) / rect.width;
    if (window.getComputedStyle(slider).direction === "rtl") pct = 1 - pct;
    pct = Math.min(1, Math.max(0, pct));
    var min = Number(slider.min) || 0;
    var max = Number(slider.max);
    if (!isFinite(max)) max = 100;
    var step = Number(slider.step) || 1;
    var value = min + Math.round((pct * (max - min)) / step) * step;
    return Math.min(max, Math.max(min, value));
  }

  function setValue(slider, value) {
    if (String(value) === slider.value) return false;
    slider.value = String(value);
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  document.addEventListener(
    "pointerdown",
    function (event) {
      if (!phoneMq.matches || event.pointerType === "mouse") return;
      var slider = findSlider(event.target);
      if (!slider || slider.disabled) return;
      gesture = {
        slider: slider,
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        dragging: false,
        changed: false,
      };
    },
    true
  );

  document.addEventListener(
    "pointermove",
    function (event) {
      if (!gesture || event.pointerId !== gesture.id) return;
      var dx = event.clientX - gesture.x;
      var dy = event.clientY - gesture.y;
      if (!gesture.dragging) {
        if (Math.abs(dx) >= DRAG_START_PX && Math.abs(dx) > Math.abs(dy)) {
          gesture.dragging = true;
        } else if (Math.abs(dy) >= SCROLL_START_PX) {
          gesture = null; // a scroll, not a slide
          return;
        } else {
          return;
        }
      }
      if (event.cancelable) event.preventDefault();
      if (setValue(gesture.slider, valueAt(gesture.slider, event.clientX))) {
        gesture.changed = true;
      }
    },
    { capture: true, passive: false }
  );

  function endGesture(event, isTap) {
    if (!gesture || event.pointerId !== gesture.id) return;
    var g = gesture;
    gesture = null;
    if (isTap && !g.dragging) {
      if (setValue(g.slider, valueAt(g.slider, event.clientX))) g.changed = true;
    }
    if (g.changed) {
      g.slider.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  document.addEventListener(
    "pointerup",
    function (event) {
      endGesture(event, true);
    },
    true
  );

  document.addEventListener(
    "pointercancel",
    function (event) {
      endGesture(event, false);
    },
    true
  );
})();
