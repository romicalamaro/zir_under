(function () {
  "use strict";

  var page2 = document.getElementById("page2");
  var root = document.getElementById("page2-buy-preview");
  var stage = document.getElementById("page2-buy-preview-3d");
  var previewImg = document.getElementById("page2-buy-preview-image");
  var copyEl = document.getElementById("page2-buy-preview-copy");
  var closeBtn = root && root.querySelector(".page2-buy-preview__close");
  var scrim = root && root.querySelector("[data-buy-preview-dismiss]");
  var goToArchiveBtn = document.getElementById("page2-buy-preview-go-archive");

  if (!page2 || !root || !stage || !previewImg || !closeBtn) return;

  var CART_OPEN_AFTER_ARCHIVE_MS = 450;

  var HEADSCARF_3D_BUY_CONFIG = {
    camY: 0,
    fitToWidth: true,
    fitToWidthScale: 1.12,
    cameraFov: 50,
    flagWidth: 6.35,
    flagHeight: 2.4,
    meshScale: 1,
    anchorPreset: "Four Corners",
    softAnchorStrength: 0.15,
    enablePointerWind: true,
    pointerWindMode: "flutter",
    pointerWindInfluence: 0.25,
    pointerTurbulenceBoost: 0.02,
    windStrength: 8,
    windDirection: { x: 0, y: 0 },
    turbulence: 25,
    stiffness: 70,
    weight: 0.15,
    damping: 5,
    gustFrequency: 12,
    textureRotation: 90,
    textureFill: true,
    colorFidelity: true,
    enableShadows: false,
    ambientIntensity: 300,
    lightIntensity: 55,
  };

  function buildBuy3dConfig(imageWidth, imageHeight) {
    var config = Object.assign({}, HEADSCARF_3D_BUY_CONFIG);
    var iw = Number(imageWidth) || 803;
    var ih = Number(imageHeight) || 2126;
    if (iw > 0 && ih > 0) {
      config.flagWidth = config.flagHeight * (ih / iw);
    }
    return config;
  }

  var READY_TIMEOUT_MS = 12000;

  var isOpen = false;
  var headscarf3dInstance = null;
  var headscarf3dInitPromise = null;
  var initRetryCount = 0;
  var lastFocusedEl = null;
  var activeTextureUrl = "";
  var readyTimeoutId = null;
  var readyListener = null;
  var postSubmitPreview = false;
  var pendingOnClose = null;

  function getQuestionnaireLocale() {
    var scroll = document.getElementById("questionnaire-scroll");
    return scroll && scroll.lang === "fa" ? "fa" : "en";
  }

  function getGoToArchiveLabel() {
    var locale = getQuestionnaireLocale();
    var strings = window.QuestionnaireStrings;
    if (
      strings &&
      strings[locale] &&
      strings[locale].ui &&
      strings[locale].ui.goToArchive
    ) {
      return strings[locale].ui.goToArchive;
    }
    return "Buy";
  }

  function getCompletionPreviewCopy() {
    var locale = getQuestionnaireLocale();
    var strings = window.QuestionnaireStrings || {};
    var ui = strings[locale] && strings[locale].ui ? strings[locale].ui : {};
    var fallbackHeading = locale === "fa" ? "ممنون!" : "Thank you!";
    var fallbackCopy =
      locale === "fa"
        ? "پرسشنامه را تکمیل کردی و منسوج خودت را خلق کردی. انتخاب‌های تو به صدای زنانی می‌پیوندد که در ایران برای خودمختاری بر بدن خود مبارزه می‌کنند."
        : "You've completed the questionnaire and created your own textile. Your choices join the voices of women fighting for bodily autonomy in Iran.";

    return {
      lang: locale,
      dir: locale === "fa" ? "rtl" : "ltr",
      heading: ui.completionPreviewHeading || fallbackHeading,
      text: ui.completionPreviewCopy || fallbackCopy,
    };
  }

  function setCompletionPreviewCopyVisible(visible) {
    if (!copyEl) return;
    copyEl.hidden = !visible;
    copyEl.textContent = "";

    if (!visible) return;

    var copy = getCompletionPreviewCopy();
    var langClass = "page2-buy-preview__copy-line--" + copy.lang;

    var heading = document.createElement("p");
    heading.className =
      "page2-buy-preview__copy-line page2-buy-preview__copy-line--heading " +
      langClass;
    heading.lang = copy.lang;
    heading.dir = copy.dir;
    heading.textContent = copy.heading;
    copyEl.appendChild(heading);

    var paragraph = document.createElement("p");
    paragraph.className =
      "page2-buy-preview__copy-line page2-buy-preview__copy-line--secondary " +
      langClass;
    paragraph.lang = copy.lang;
    paragraph.dir = copy.dir;
    paragraph.textContent = copy.text;
    copyEl.appendChild(paragraph);
  }

  function setGoToArchiveVisible(visible) {
    if (!goToArchiveBtn) return;
    goToArchiveBtn.hidden = !visible;
    if (visible) {
      goToArchiveBtn.textContent = getGoToArchiveLabel();
    }
  }

  function navigateToArchiveAndOpenCart() {
    if (
      window.HandkerchiefArchive &&
      typeof window.HandkerchiefArchive.revealDesignArchive === "function"
    ) {
      window.HandkerchiefArchive.revealDesignArchive();
    } else if (
      window.Page2Navigation &&
      typeof window.Page2Navigation.showSection === "function"
    ) {
      window.Page2Navigation.showSection(5);
    }

    window.setTimeout(function () {
      if (window.Page2Cart && typeof window.Page2Cart.open === "function") {
        window.Page2Cart.open();
      }
    }, CART_OPEN_AFTER_ARCHIVE_MS);
  }

  function getHeadscarf3dModuleUrl() {
    var scriptEl = document.querySelector('script[src*="buyPreview3d.js"]');
    var version = "headscarf3d.js?v=20260704-color-fidelity";
    if (!scriptEl || !scriptEl.src) {
      return new URL("js/" + version, window.location.href).href;
    }
    return new URL(version, scriptEl.src).href;
  }

  function clearReadyTimeout() {
    if (readyTimeoutId) {
      window.clearTimeout(readyTimeoutId);
      readyTimeoutId = null;
    }
  }

  function clearReadyListener() {
    if (readyListener) {
      stage.removeEventListener("headscarf3d:ready", readyListener);
      readyListener = null;
    }
  }

  function prefersReducedMotionNow() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function shouldUse3dPreview() {
    if (prefersReducedMotionNow()) return false;
    if (window.location.protocol === "file:") return false;
    return true;
  }

  function setFlatImageMode(flat) {
    root.classList.toggle("page2-buy-preview--flat-image", !!flat);
  }

  function setCompletionPreviewMode(active) {
    root.classList.toggle("page2-buy-preview--completion", !!active);
  }

  function getPreviewArtInnerSize() {
    var art = stage.parentElement;
    if (!art) return null;

    var artStyle = window.getComputedStyle(art);
    var padL = parseFloat(artStyle.paddingLeft) || 0;
    var padR = parseFloat(artStyle.paddingRight) || 0;
    var padT = parseFloat(artStyle.paddingTop) || 0;
    var padB = parseFloat(artStyle.paddingBottom) || 0;

    return {
      width: Math.max(0, art.clientWidth - padL - padR),
      height: Math.max(0, art.clientHeight - padT - padB),
    };
  }

  function compute3dScreenFlagSize(containerWidth, containerHeight, imageWidth, imageHeight) {
    var config = buildBuy3dConfig(imageWidth, imageHeight);
    var fovRad = ((config.cameraFov || 50) * Math.PI) / 180;
    var halfTan = Math.tan(fovRad / 2);
    var aspect = containerWidth / containerHeight;
    if (!(aspect > 0)) aspect = 1;

    var flagWidth = config.flagWidth;
    var flagHeight = config.flagHeight;
    var camZForWidth = flagWidth / (2 * halfTan * aspect);
    var camZForHeight = flagHeight / (2 * halfTan);
    var scale = config.fitToWidthScale || 1;
    var camZ = Math.max(camZForWidth, camZForHeight) * scale;

    return {
      width: Math.max(
        1,
        (flagWidth / (2 * camZ * halfTan * aspect)) * containerWidth
      ),
      height: Math.max(
        1,
        (flagHeight / (2 * camZ * halfTan)) * containerHeight
      ),
    };
  }

  function shouldRotateCompletionFlatImage() {
    if (!postSubmitPreview) return false;
    if (!shouldUse3dPreview()) return true;
    if (root.classList.contains("page2-buy-preview--loading-3d")) return false;
    if (headscarf3dInstance && !stage.hidden) return false;
    return true;
  }

  function clearCompletionFlatImageLayout() {
    previewImg.style.removeProperty("position");
    previewImg.style.removeProperty("left");
    previewImg.style.removeProperty("top");
    previewImg.style.removeProperty("width");
    previewImg.style.removeProperty("height");
    previewImg.style.removeProperty("max-width");
    previewImg.style.removeProperty("max-height");
    previewImg.style.removeProperty("transform");
    previewImg.style.removeProperty("transform-origin");
  }

  function syncCompletionFlatImageLayout() {
    if (!shouldRotateCompletionFlatImage()) {
      clearCompletionFlatImageLayout();
      return false;
    }

    var inner = getPreviewArtInnerSize();
    var iw = previewImg.naturalWidth;
    var ih = previewImg.naturalHeight;
    if (!inner || inner.width <= 0 || inner.height <= 0 || iw <= 0 || ih <= 0) {
      return false;
    }

    var screen = compute3dScreenFlagSize(inner.width, inner.height, iw, ih);

    previewImg.style.position = "absolute";
    previewImg.style.left = "50%";
    previewImg.style.top = "50%";
    previewImg.style.maxWidth = "none";
    previewImg.style.maxHeight = "none";
    previewImg.style.width = "auto";
    previewImg.style.height = screen.width + "px";
    previewImg.style.transform = "translate(-50%, -50%) rotate(90deg)";
    previewImg.style.transformOrigin = "center center";
    previewImg.hidden = false;
    return true;
  }

  var flatLayoutRetryCount = 0;
  var FLAT_LAYOUT_MAX_RETRIES = 16;

  function tryCompleteFlatImageLayout() {
    if (!isOpen) {
      flatLayoutRetryCount = 0;
      return;
    }
    if (!shouldRotateCompletionFlatImage()) {
      flatLayoutRetryCount = 0;
      return;
    }
    if (syncCompletionFlatImageLayout()) {
      flatLayoutRetryCount = 0;
      return;
    }
    flatLayoutRetryCount += 1;
    if (flatLayoutRetryCount >= FLAT_LAYOUT_MAX_RETRIES) {
      flatLayoutRetryCount = 0;
      previewImg.style.position = "absolute";
      previewImg.style.left = "50%";
      previewImg.style.top = "50%";
      previewImg.style.transform = "translate(-50%, -50%) rotate(90deg)";
      previewImg.style.transformOrigin = "center center";
      previewImg.hidden = false;
      return;
    }
    window.requestAnimationFrame(tryCompleteFlatImageLayout);
  }

  function scheduleCompletionFlatImageLayout() {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(tryCompleteFlatImageLayout);
    });
  }

  function prepareStageForInit() {
    var art = stage.parentElement;
    if (!art) return false;

    stage.hidden = false;
    stage.removeAttribute("hidden");
    // Stage is inset inside art padding — never size it to art.clientWidth/Height
    // or the canvas overflows and gets clipped by overflow:hidden on __art.
    stage.style.width = "";
    stage.style.height = "";

    void art.offsetHeight;
    void stage.offsetHeight;

    if (stage.clientWidth > 0 && stage.clientHeight > 0) return true;

    var artStyle = window.getComputedStyle(art);
    var padL = parseFloat(artStyle.paddingLeft) || 0;
    var padR = parseFloat(artStyle.paddingRight) || 0;
    var padT = parseFloat(artStyle.paddingTop) || 0;
    var padB = parseFloat(artStyle.paddingBottom) || 0;
    var innerW = Math.max(0, art.clientWidth - padL - padR);
    var innerH = Math.max(0, art.clientHeight - padT - padB);
    if (innerW <= 0 || innerH <= 0) return false;

    stage.style.width = innerW + "px";
    stage.style.height = innerH + "px";
    return stage.clientWidth > 0 && stage.clientHeight > 0;
  }

  function hideStage() {
    stage.hidden = true;
    stage.setAttribute("hidden", "");
    stage.style.width = "";
    stage.style.height = "";
    stage.setAttribute("aria-hidden", "true");
  }

  function destroyHeadscarf3d() {
    clearReadyTimeout();
    clearReadyListener();
    if (
      headscarf3dInstance &&
      typeof headscarf3dInstance.destroy === "function"
    ) {
      headscarf3dInstance.destroy();
    }
    headscarf3dInstance = null;
    headscarf3dInitPromise = null;
    initRetryCount = 0;
    stage.innerHTML = "";
    hideStage();
  }

  function resetPreview() {
    destroyHeadscarf3d();
    previewImg.hidden = false;
    previewImg.removeAttribute("src");
    previewImg.alt = "";
    activeTextureUrl = "";
    root.classList.remove("page2-buy-preview--loading-3d");
    setFlatImageMode(false);
    setCompletionPreviewMode(false);
    setGoToArchiveVisible(false);
    setCompletionPreviewCopyVisible(false);
    clearCompletionFlatImageLayout();
  }

  function showFlatImage(textureUrl, title) {
    previewImg.alt = title || "Designed handkerchief";
    hideStage();
    setFlatImageMode(true);
    if (postSubmitPreview) {
      setCompletionPreviewMode(true);
      previewImg.hidden = true;
    } else {
      previewImg.hidden = false;
    }

    function finishLayout() {
      tryCompleteFlatImageLayout();
    }

    previewImg.addEventListener("load", finishLayout, { once: true });
    previewImg.src = textureUrl;

    if (previewImg.complete && previewImg.naturalWidth > 0) {
      finishLayout();
    } else {
      scheduleCompletionFlatImageLayout();
    }
  }

  function show3dStage() {
    clearReadyTimeout();
    clearReadyListener();
    root.classList.remove("page2-buy-preview--loading-3d");
    setFlatImageMode(false);
    previewImg.hidden = true;
    stage.hidden = false;
    stage.removeAttribute("hidden");
    stage.style.width = "";
    stage.style.height = "";
    stage.setAttribute("aria-hidden", "false");
    clearCompletionFlatImageLayout();
    window.requestAnimationFrame(function () {
      window.dispatchEvent(new Event("resize"));
    });
  }

  function keepFlatImageFallback() {
    clearReadyTimeout();
    clearReadyListener();
    root.classList.remove("page2-buy-preview--loading-3d");
    destroyHeadscarf3d();
    previewImg.hidden = true;
    setFlatImageMode(true);
    if (postSubmitPreview) {
      setCompletionPreviewMode(true);
    }
    tryCompleteFlatImageLayout();
  }

  function scheduleReadyTimeout(textureUrl) {
    clearReadyTimeout();
    readyTimeoutId = window.setTimeout(function () {
      if (!isOpen || activeTextureUrl !== textureUrl) return;
      if (previewImg.hidden) {
        console.warn("buyPreview3d: 3D timed out — keeping flat image");
        keepFlatImageFallback();
      }
    }, READY_TIMEOUT_MS);
  }

  function watchFor3dReady(textureUrl) {
    clearReadyListener();
    readyListener = function () {
      if (!isOpen || activeTextureUrl !== textureUrl) return;
      show3dStage();
    };
    stage.addEventListener("headscarf3d:ready", readyListener);
    scheduleReadyTimeout(textureUrl);
  }

  function scheduleInitRetry(textureUrl) {
    if (initRetryCount >= 6 || headscarf3dInstance || !isOpen) {
      if (initRetryCount >= 6 && isOpen && !headscarf3dInstance) {
        console.warn(
          "buyPreview3d: 3D preview unavailable — showing flat image"
        );
        keepFlatImageFallback();
      }
      return;
    }
    initRetryCount += 1;
    window.setTimeout(function () {
      if (!isOpen) return;
      headscarf3dInitPromise = null;
      ensureHeadscarf3d(textureUrl);
    }, 350 * initRetryCount);
  }

  function preloadTexture(textureUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve({
          url: textureUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = function () {
        reject(new Error("Could not preload handkerchief texture"));
      };
      img.src = textureUrl;
    });
  }

  function ensureHeadscarf3d(textureUrl) {
    if (!isOpen || !shouldUse3dPreview()) return Promise.resolve(null);
    if (headscarf3dInstance) return Promise.resolve(headscarf3dInstance);

    if (!prepareStageForInit()) {
      scheduleInitRetry(textureUrl);
      return Promise.resolve(null);
    }

    if (!headscarf3dInitPromise) {
      root.classList.add("page2-buy-preview--loading-3d");
      headscarf3dInitPromise = preloadTexture(textureUrl)
        .then(function (textureInfo) {
          return import(getHeadscarf3dModuleUrl()).then(function (mod) {
            return { mod: mod, textureInfo: textureInfo };
          });
        })
        .then(function (payload) {
          var mod = payload.mod;
          var textureInfo = payload.textureInfo;
          if (!isOpen || headscarf3dInstance) return headscarf3dInstance;
          if (!mod || typeof mod.initHeadscarf3d !== "function") {
            headscarf3dInitPromise = null;
            keepFlatImageFallback();
            return null;
          }

          if (!prepareStageForInit()) {
            headscarf3dInitPromise = null;
            scheduleInitRetry(textureUrl);
            return null;
          }

          headscarf3dInstance = mod.initHeadscarf3d(stage, {
            textureUrl: textureInfo.url,
            config: buildBuy3dConfig(textureInfo.width, textureInfo.height),
            onReady: function () {
              if (!isOpen || activeTextureUrl !== textureUrl) return;
              show3dStage();
            },
          });

          if (!headscarf3dInstance) {
            headscarf3dInitPromise = null;
            keepFlatImageFallback();
            scheduleInitRetry(textureUrl);
            return null;
          }

          watchFor3dReady(textureUrl);
          window.requestAnimationFrame(function () {
            window.dispatchEvent(new Event("resize"));
          });
          if (typeof headscarf3dInstance.play === "function") {
            headscarf3dInstance.play();
          }
          return headscarf3dInstance;
        })
        .catch(function (err) {
          console.error("buyPreview3d init failed:", err);
          headscarf3dInitPromise = null;
          keepFlatImageFallback();
          scheduleInitRetry(textureUrl);
          return null;
        });
    }

    return headscarf3dInitPromise;
  }

  function mountPreview(textureUrl, title) {
    resetPreview();
    activeTextureUrl = textureUrl;
    showFlatImage(textureUrl, title);

    if (!shouldUse3dPreview()) return;

    function tryInit3d() {
      if (!isOpen || activeTextureUrl !== textureUrl) return;
      ensureHeadscarf3d(textureUrl);
    }

    if (previewImg.complete && previewImg.naturalWidth > 0) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(tryInit3d);
      });
      return;
    }

    previewImg.addEventListener("load", tryInit3d, { once: true });
    previewImg.addEventListener("error", tryInit3d, { once: true });
  }

  function setAriaOpen(open) {
    root.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function openPreview(options) {
    options = options || {};
    var textureUrl = String(options.textureUrl || options.imageUrl || "").trim();
    if (!textureUrl) return false;

    if (isOpen) {
      closePreview();
    }

    if (
      window.Page2Cart &&
      typeof window.Page2Cart.isOpen === "function" &&
      window.Page2Cart.isOpen() &&
      typeof window.Page2Cart.close === "function"
    ) {
      window.Page2Cart.close();
    }

    lastFocusedEl = document.activeElement;
    isOpen = true;
    page2.classList.add("page2--buy-preview-open");
    root.hidden = false;
    setAriaOpen(true);
    postSubmitPreview = !!options.showGoToArchive;
    pendingOnClose =
      typeof options.onClose === "function" ? options.onClose : null;
    mountPreview(textureUrl, options.title || "");
    setCompletionPreviewMode(postSubmitPreview);
    scheduleCompletionFlatImageLayout();
    setGoToArchiveVisible(postSubmitPreview);
    setCompletionPreviewCopyVisible(postSubmitPreview);
    closeBtn.focus();
    return true;
  }

  function runPostSubmitCloseHandlers() {
    var onClose = pendingOnClose;
    pendingOnClose = null;
    if (typeof onClose === "function") {
      onClose();
      return;
    }
    if (
      window.Questionnaire &&
      typeof window.Questionnaire.resumeAfterPreviewClose === "function"
    ) {
      window.Questionnaire.resumeAfterPreviewClose();
      return;
    }
    root.dispatchEvent(
      new CustomEvent("buyPreview3d:postSubmitClosed", { bubbles: true })
    );
  }

  function closePreview() {
    if (!isOpen) return;
    var wasPostSubmitPreview = postSubmitPreview;
    isOpen = false;
    postSubmitPreview = false;
    resetPreview();
    root.hidden = true;
    page2.classList.remove("page2--buy-preview-open");
    setAriaOpen(false);

    if (wasPostSubmitPreview) {
      runPostSubmitCloseHandlers();
    } else {
      pendingOnClose = null;
    }

    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      lastFocusedEl.focus();
    } else {
      var buyBtn = document.querySelector(".page2-cart-drawer__buy");
      if (buyBtn && typeof buyBtn.focus === "function") {
        buyBtn.focus();
      }
    }
    lastFocusedEl = null;
  }

  closeBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    closePreview();
  });

  if (scrim) {
    scrim.addEventListener("click", function () {
      closePreview();
    });
  }

  if (goToArchiveBtn) {
    goToArchiveBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      closePreview();
      navigateToArchiveAndOpenCart();
    });
  }

  document.addEventListener("keydown", function (event) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closePreview();
    }
  });

  page2.addEventListener("page2:hide", function () {
    closePreview();
  });

  window.addEventListener("resize", function () {
    if (!isOpen) return;
    scheduleCompletionFlatImageLayout();
  });

  window.BuyPreview3d = {
    open: openPreview,
    close: closePreview,
    isOpen: function () {
      return isOpen;
    },
  };
})();
