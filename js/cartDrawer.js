(function () {
  "use strict";

  var page2 = document.getElementById("page2");
  var trigger = document.querySelector(".page2-cart-trigger");
  var drawer = document.getElementById("page2-cart-drawer");
  var scrim = document.querySelector(".page2-cart-scrim");
  var closeBtn = drawer && drawer.querySelector(".page2-cart-drawer__close");

  if (!page2 || !trigger || !drawer || !scrim || !closeBtn) return;

  var isOpen = false;
  var closeTimer = null;
  var DRAWER_TRANSITION_MS = 450;
  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function setAriaOpen(open) {
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    scrim.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function clearCloseTimer() {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
  }

  function openCart() {
    if (isOpen) return;
    clearCloseTimer();
    isOpen = true;
    drawer.hidden = false;
    scrim.hidden = false;
    setAriaOpen(true);
    window.requestAnimationFrame(function () {
      page2.classList.add("page2--cart-open");
      closeBtn.focus();
    });
  }

  function closeCart() {
    if (!isOpen) return;
    isOpen = false;
    page2.classList.remove("page2--cart-open");
    setAriaOpen(false);
    trigger.focus();

    clearCloseTimer();
    if (prefersReducedMotion) {
      drawer.hidden = true;
      scrim.hidden = true;
      return;
    }

    closeTimer = window.setTimeout(function () {
      closeTimer = null;
      if (!isOpen) {
        drawer.hidden = true;
        scrim.hidden = true;
      }
    }, DRAWER_TRANSITION_MS);
  }

  trigger.addEventListener("click", function (event) {
    event.stopPropagation();
    if (isOpen) {
      closeCart();
    } else {
      openCart();
    }
  });

  closeBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    closeCart();
  });

  scrim.addEventListener("click", function () {
    closeCart();
  });

  document.addEventListener("keydown", function (event) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeCart();
    }
  });

  page2.addEventListener("page2:hide", function () {
    closeCart();
  });

  window.Page2Cart = {
    open: openCart,
    close: closeCart,
    isOpen: function () {
      return isOpen;
    },
  };
})();
