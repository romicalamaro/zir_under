(function () {
  "use strict";

  var page2 = document.getElementById("page2");
  var trigger = document.querySelector(".page2-cart-trigger");
  var drawer = document.getElementById("page2-cart-drawer");
  var scrim = document.querySelector(".page2-cart-scrim");
  var closeBtn = drawer && drawer.querySelector(".page2-cart-drawer__close");
  var emptyEl = drawer && drawer.querySelector(".page2-cart-drawer__empty");
  var listEl = drawer && drawer.querySelector(".page2-cart-drawer__list");
  var buyBtn = drawer && drawer.querySelector(".page2-cart-drawer__buy");
  var countEl = trigger && trigger.querySelector(".page2-cart-trigger__count");

  if (!page2 || !trigger || !drawer || !scrim || !closeBtn) return;

  var isOpen = false;
  var closeTimer = null;
  // Callbacks queued by callers who asked to be told when the drawer has
  // FULLY finished sliding closed (used by page navigation so the section
  // swap only happens after the cart is completely gone).
  var closeDoneCallbacks = [];
  var items = [];
  var DRAWER_TRANSITION_MS = 400;
  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // --- Keep the cart from covering the footer -------------------------------
  // The drawer is position:fixed, so on its own it always fills the whole
  // screen (height: 100vh) and ends up sitting on top of the red footer once
  // you scroll down to it. The footer, on the other hand, scrolls with the
  // page. CSS alone can't react to a scrolling element from a fixed one, so
  // this small helper measures where the footer currently is and trims the
  // drawer's height to "screen height minus the part of the footer that is on
  // screen". When the footer isn't visible, the drawer stays full height.
  var heightSyncFrame = null;

  // Returns how many pixels of footer are currently showing at the bottom of
  // the viewport (0 when no footer is on screen).
  function getVisibleFooterHeight() {
    // Only the active section is displayed, so in practice one footer is live.
    var footers = document.querySelectorAll(".page2-footer");
    var viewportH = window.innerHeight || document.documentElement.clientHeight;
    var maxOverlap = 0;

    for (var i = 0; i < footers.length; i++) {
      var footer = footers[i];
      // Skip footers in hidden sections (display:none -> no layout box).
      if (!footer.getClientRects().length) continue;
      var rect = footer.getBoundingClientRect();
      // Overlap between the footer and the bottom of the viewport.
      var overlap = viewportH - Math.max(rect.top, 0);
      // Clamp so we never subtract more than the footer's own height.
      if (overlap > rect.height) overlap = rect.height;
      if (overlap > maxOverlap) maxOverlap = overlap;
    }
    return maxOverlap;
  }

  function applyDrawerHeight() {
    heightSyncFrame = null;
    if (!isOpen) return;
    var footerOnScreen = getVisibleFooterHeight();
    // The panel starts below the header (CSS top), so its height is
    // "screen minus header minus the visible footer".
    drawer.style.height =
      "calc(100vh - var(--page2-header-band-height) - " +
      footerOnScreen +
      "px)";
  }

  // Throttle scroll/resize work to one update per animation frame.
  function scheduleDrawerHeight() {
    if (heightSyncFrame !== null) return;
    heightSyncFrame = window.requestAnimationFrame(applyDrawerHeight);
  }

  function startHeightSync() {
    applyDrawerHeight();
    // Scrolling happens inside inner containers, so listen in the capture
    // phase to catch those scroll events too (not just window scrolling).
    window.addEventListener("scroll", scheduleDrawerHeight, true);
    window.addEventListener("resize", scheduleDrawerHeight);
  }

  function stopHeightSync() {
    window.removeEventListener("scroll", scheduleDrawerHeight, true);
    window.removeEventListener("resize", scheduleDrawerHeight);
    if (heightSyncFrame !== null) {
      window.cancelAnimationFrame(heightSyncFrame);
      heightSyncFrame = null;
    }
    // Leave the last height in place so the slide-out stays smooth; the next
    // openCart() always recomputes a fresh height before showing the drawer.
  }
  // -------------------------------------------------------------------------

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

  // Run (and empty) every "close finished" callback that was queued. Called at
  // the single moment the drawer is truly hidden, so listeners can safely act
  // knowing the cart is no longer on screen.
  function flushCloseDoneCallbacks() {
    if (!closeDoneCallbacks.length) return;
    var pending = closeDoneCallbacks;
    closeDoneCallbacks = [];
    for (var i = 0; i < pending.length; i++) {
      try {
        pending[i]();
      } catch (err) {
        /* A broken callback must not stop the others from running. */
      }
    }
  }

  function getTotalQuantity() {
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      total += items[i].quantity || 1;
    }
    return total;
  }

  function updateCartCount() {
    if (!countEl) return;
    var total = getTotalQuantity();
    if (total > 0) {
      countEl.textContent = String(total);
      countEl.hidden = false;
      countEl.setAttribute("aria-hidden", "false");
      trigger.setAttribute(
        "aria-label",
        "Open cart, " + String(total) + " item" + (total === 1 ? "" : "s")
      );
    } else {
      countEl.textContent = "";
      countEl.hidden = true;
      countEl.setAttribute("aria-hidden", "true");
      trigger.setAttribute("aria-label", "Open cart");
    }
  }

  // Rebuild the person's title inside the cart to match the shop gallery:
  // each part (name / age / city) is its own span, separated by a small square
  // divider instead of a comma. Falls back to the flat text if parts are
  // missing (e.g. older items).
  function renderCartItemName(nameEl, item) {
    nameEl.textContent = "";
    var parts = item.nameParts && item.nameParts.length ? item.nameParts : null;
    if (!parts) {
      nameEl.textContent = item.name || "Handkerchief";
      return;
    }

    parts.forEach(function (part, index) {
      if (index > 0) {
        var sep = document.createElement("span");
        sep.className = "shop-card__name-sep";
        sep.setAttribute("aria-hidden", "true");
        nameEl.appendChild(sep);
      }

      var partEl = document.createElement("span");
      partEl.className = "shop-card__name-part";
      if (/^\d+$/.test(part)) {
        partEl.classList.add("shop-card__num");
      }
      partEl.textContent = part;
      nameEl.appendChild(partEl);
    });
  }

  function isCustomDesignItem(item) {
    return !!(
      item &&
      typeof item.id === "string" &&
      item.id.indexOf("archive:") === 0
    );
  }

  function applyThumbStyle(el, item) {
    if (!el || !item) return;
    // Handkerchiefs designed through the questionnaire are saved to the archive
    // and added to the cart with an id like "archive:<id>". Their artwork is a
    // tall image, so cropping it to fill the little square (the default "cover"
    // behaviour) hides most of the design. We flag those thumbnails so the CSS
    // can show the whole scarf, in proportion, on a white background instead.
    var isCustomDesign = isCustomDesignItem(item);
    el.classList.toggle("page2-cart-drawer__item-thumb--contain", isCustomDesign);
    if (item.imageUrl) {
      el.style.backgroundImage = "url('" + item.imageUrl + "')";
      el.style.backgroundColor = item.color || "#d8d2cc";
    } else {
      el.style.backgroundImage = "";
      el.style.backgroundColor = item.color || "#d8d2cc";
    }
  }

  function renderCart() {
    if (!emptyEl || !listEl) return;

    if (!items.length) {
      emptyEl.hidden = false;
      listEl.hidden = true;
      listEl.innerHTML = "";
      if (buyBtn) buyBtn.hidden = true;
      updateCartCount();
      return;
    }

    emptyEl.hidden = true;
    listEl.hidden = false;
    listEl.innerHTML = "";
    if (buyBtn) buyBtn.hidden = false;

    items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "page2-cart-drawer__item";
      li.dataset.cartId = item.id;

      var thumb = document.createElement("div");
      thumb.className = "page2-cart-drawer__item-thumb";
      thumb.setAttribute("aria-hidden", "true");
      applyThumbStyle(thumb, item);

      var info = document.createElement("div");
      info.className = "page2-cart-drawer__item-info";

      var name = document.createElement("p");
      name.className = "page2-cart-drawer__item-name";
      renderCartItemName(name, item);

      info.appendChild(name);

      // Flat product price shown under the name/age/city title. Rendered via
      // ProductComboSpec so the digits use the same thin style as the shop.
      var price = document.createElement("p");
      price.className = "page2-cart-drawer__item-price";
      if (
        window.ProductComboSpec &&
        typeof window.ProductComboSpec.renderPriceText === "function"
      ) {
        window.ProductComboSpec.renderPriceText(
          price,
          window.ProductComboSpec.CART_PRICE
        );
      } else {
        price.textContent = "$59.00 USD";
      }
      info.appendChild(price);

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "page2-cart-drawer__item-remove";
      removeBtn.setAttribute("aria-label", "Remove " + (item.name || "item") + " from cart");
      removeBtn.textContent = "\u00d7";
      removeBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        removeItem(item.id);
      });

      li.appendChild(thumb);
      li.appendChild(info);
      li.appendChild(removeBtn);
      listEl.appendChild(li);
    });

    updateCartCount();
  }

  function addItem(snapshot) {
    if (!snapshot || !snapshot.id) return false;

    var existing = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === snapshot.id) {
        existing = items[i];
        break;
      }
    }

    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
      existing.imageUrl = snapshot.imageUrl || existing.imageUrl;
      existing.color = snapshot.color || existing.color;
    } else {
      items.push({
        id: snapshot.id,
        folder: snapshot.folder || "",
        name: snapshot.name || "",
        nameParts: snapshot.nameParts || [],
        imageIndex: snapshot.imageIndex || 0,
        imageUrl: snapshot.imageUrl || "",
        color: snapshot.color || "",
        quantity: 1,
      });
    }

    renderCart();
    return true;
  }

  function removeItem(id) {
    items = items.filter(function (item) {
      return item.id !== id;
    });
    renderCart();
  }

  function clearCart() {
    items = [];
    renderCart();
  }

  // Close the cart when the visitor clicks anywhere that is NOT the cart
  // drawer itself and NOT the cart trigger button. This is more reliable than
  // relying on the transparent scrim layer alone, because some page sections
  // sit at the same (or a higher) stacking level and would otherwise "swallow"
  // the click before it reaches the scrim.
  function onDocumentClick(event) {
    if (!isOpen) return;
    var target = event.target;
    if (!target || typeof target.closest !== "function") return;
    // Ignore clicks inside the open drawer or on the trigger (the trigger has
    // its own toggle handler).
    if (target.closest("#page2-cart-drawer")) return;
    if (target.closest(".page2-cart-trigger")) return;
    closeCart();
  }

  function openCart() {
    if (isOpen) return;
    // The cart and the product page must never be open at the same time.
    // Close the product page (if it happens to be open) before revealing the
    // cart.
    if (window.Page2Product && typeof window.Page2Product.close === "function") {
      window.Page2Product.close();
    }
    clearCloseTimer();
    page2.classList.remove("page2--cart-closing");
    isOpen = true;
    drawer.hidden = false;
    scrim.hidden = false;
    setAriaOpen(true);
    startHeightSync();
    window.requestAnimationFrame(function () {
      page2.classList.add("page2--cart-open");
      closeBtn.focus();
      // Attach the outside-click listener only now (inside rAF) so the very
      // click that opened the cart has already finished propagating and can't
      // immediately close it again. Capture phase (the `true` argument) means
      // this runs before any element handler, so other listeners that call
      // stopPropagation (the shop area, the product overlay) can't block it.
      document.addEventListener("click", onDocumentClick, true);
    });
  }

  // The cart is allowed to stay open in the shop AND on the archive page. Any
  // other section should never show the cart.
  function isCartSection() {
    return (
      page2.classList.contains("page2--section-shop") ||
      page2.classList.contains("page2--section-archive")
    );
  }

  function closeCartIfLeavingShop() {
    if (!isCartSection() && isOpen) {
      closeCart();
    }
  }

  function closeCart(onClosed) {
    // Queue the "finished closing" callback (if any) before the early return
    // below, so callers still get notified even when the cart is already shut.
    if (typeof onClosed === "function") {
      closeDoneCallbacks.push(onClosed);
    }

    if (!isOpen) {
      // The cart is not "open", but it might still be mid-close: the outside
      // click handler can start the slide-out a moment before this call. In
      // that case a closeTimer is already ticking and will run the callbacks
      // when the animation truly ends, so we just leave our callback queued.
      if (closeTimer) return;
      // Otherwise the drawer is fully gone and idle, so any waiting caller
      // (e.g. page navigation) can continue right away.
      flushCloseDoneCallbacks();
      return;
    }
    isOpen = false;
    document.removeEventListener("click", onDocumentClick, true);
    page2.classList.add("page2--cart-closing");
    page2.classList.remove("page2--cart-open");
    setAriaOpen(false);
    stopHeightSync();
    if (isCartSection()) {
      trigger.focus();
    }

    clearCloseTimer();
    if (prefersReducedMotion) {
      page2.classList.remove("page2--cart-closing");
      drawer.hidden = true;
      scrim.hidden = true;
      flushCloseDoneCallbacks();
      return;
    }

    closeTimer = window.setTimeout(function () {
      closeTimer = null;
      if (!isOpen) {
        page2.classList.remove("page2--cart-closing");
        drawer.hidden = true;
        scrim.hidden = true;
      }
      // Fire regardless: by now the slide-out animation has run its full
      // duration, so the drawer is visually closed.
      flushCloseDoneCallbacks();
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

  if (buyBtn) {
    buyBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      clearCart();
      closeCart();
    });
  }

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

  new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === "class") {
        closeCartIfLeavingShop();
        break;
      }
    }
  }).observe(page2, { attributes: true, attributeFilter: ["class"] });

  renderCart();

  window.Page2Cart = {
    open: openCart,
    close: closeCart,
    isOpen: function () {
      return isOpen;
    },
    // True while the drawer is on screen in any form: fully open, or still
    // sliding closed (the outside-click handler may have started the close
    // just before a navigation click). Callers that want to wait for the cart
    // to be completely gone should test this, not just isOpen.
    isActive: function () {
      return isOpen || !!closeTimer || !drawer.hidden;
    },
    add: function (snapshot, options) {
      options = options || {};
      var added = addItem(snapshot);
      if (added && options.open !== false) {
        openCart();
      }
      return added;
    },
    remove: removeItem,
    getItems: function () {
      return items.slice();
    },
    getCount: getTotalQuantity,
  };
})();
