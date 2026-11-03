/**
 * Exhibition kiosk: reload the site after 2 minutes with no pointer movement.
 * Returns visitors to home; handkerchief archive (IndexedDB) survives the reload.
 */
(function () {
  "use strict";

  // Phones are not exhibition screens: never reload them (a visitor reading
  // or scrolling on a phone does not move a pointer, so it would reset them).
  if (window.matchMedia && window.matchMedia("(max-width: 767px)").matches) {
    return;
  }

  var IDLE_MS = 2 * 60 * 1000;
  var timerId = null;

  function reloadForNextVisitor() {
    window.location.reload();
  }

  function resetIdleTimer() {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(reloadForNextVisitor, IDLE_MS);
  }

  // pointermove covers mouse and touch / stylus on exhibition screens.
  document.addEventListener("pointermove", resetIdleTimer, { passive: true });
  resetIdleTimer();
})();
