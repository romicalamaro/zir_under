/**
 * Exhibition kiosk: reload the site after 2 minutes with no pointer movement.
 * Returns visitors to home; handkerchief archive (IndexedDB) survives the reload.
 */
(function () {
  "use strict";

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
