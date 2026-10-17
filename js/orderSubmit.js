/**
 * UNDER — sending an order to Romi
 *
 * When a visitor presses "Buy" in the cart, this module shows a short form
 * (name, email, note) and sends the whole order to a Google Apps Script web
 * app (see apps-script/orders.gs). The script saves each custom design as a
 * full-size, print-ready SVG in Google Drive and emails Romi a summary.
 *
 * Setup: paste the web-app URL you get when deploying apps-script/orders.gs
 * into ORDER_ENDPOINT below. While it is empty, "Send order" downloads the
 * order as a .json file instead, so the flow can be tested locally.
 */
(function () {
  "use strict";

  // ← paste the Apps Script web-app URL here (ends with /exec)
  var ORDER_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbwpkyErRC-z7Qqk5enQ2VLOcWFz57-W8S1cmWMgOSwh0KNQ2PPW-I4907cawRfBXW7i/exec";

  // Preview image for the email and Drive (the SVG is the print file).
  var PREVIEW_EMAIL_WIDTH = 1600;
  var PREVIEW_JPEG_QUALITY = 0.92;
  var STYLE_ID = "order-submit-styles";

  /** entryId → { svg, profile, answers, previewDataUrl } for this visit. */
  var designs = {};

  // --- Designs ---------------------------------------------------------------

  function safeClone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      return null;
    }
  }

  function getQuestionnaireAnswers() {
    if (
      window.Questionnaire &&
      typeof window.Questionnaire.getAnswers === "function"
    ) {
      return safeClone(window.Questionnaire.getAnswers());
    }
    return null;
  }

  function rememberDesign(entryId, data) {
    if (!entryId || !data) return;
    designs[String(entryId)] = {
      svg: data.svg || null,
      profile: data.profile || null,
      // Every choice made in the questionnaire, as a record of the order.
      answers: getQuestionnaireAnswers(),
      previewDataUrl: data.previewDataUrl || null,
    };
  }

  function getDesignForCartItem(item) {
    if (!item || typeof item.id !== "string") return null;
    if (item.id.indexOf("archive:") !== 0) return null;
    return designs[item.id.slice("archive:".length)] || null;
  }

  /** Small JPEG of the design for the email body (the SVG is the print file). */
  function shrinkPreview(dataUrl) {
    if (!dataUrl) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, PREVIEW_EMAIL_WIDTH / img.width);
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        var ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", PREVIEW_JPEG_QUALITY));
      };
      img.onerror = function () {
        resolve(null);
      };
      img.src = dataUrl;
    });
  }

  // --- Order payload -----------------------------------------------------------

  function makeOrderId() {
    var d = new Date();
    function pad(n) {
      return (n < 10 ? "0" : "") + n;
    }
    return (
      "UNDER-" +
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      "-" +
      Math.random().toString(36).slice(2, 7).toUpperCase()
    );
  }

  function buildPayload(cartItems, customer) {
    var orderId = makeOrderId();
    return Promise.all(
      cartItems.map(function (item) {
        var design = getDesignForCartItem(item);
        var base = {
          cartId: item.id,
          type: design || item.id.indexOf("archive:") === 0 ? "custom" : "shop",
          name: item.name || "",
          nameParts: item.nameParts || [],
          folder: item.folder || "",
          imageIndex: item.imageIndex || 0,
          color: item.color || "",
          quantity: item.quantity || 1,
        };
        if (!design) return base;
        return shrinkPreview(design.previewDataUrl).then(function (preview) {
          base.design = {
            profile: design.profile,
            answers: design.answers,
            svg: design.svg,
            previewJpeg: preview,
          };
          return base;
        });
      })
    ).then(function (items) {
      return {
        orderId: orderId,
        createdAt: new Date().toISOString(),
        customer: customer,
        items: items,
        page: window.location.href,
      };
    });
  }

  function downloadJson(payload) {
    var blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = payload.orderId + ".json";
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 1000);
  }

  function sendPayload(payload) {
    if (!ORDER_ENDPOINT) {
      console.warn(
        "[OrderSubmit] ORDER_ENDPOINT is empty — downloading the order instead."
      );
      downloadJson(payload);
      return Promise.resolve({ ok: true, orderId: payload.orderId, local: true });
    }
    // text/plain keeps this a "simple" request, which Apps Script accepts
    // from another site without a CORS preflight.
    return fetch(ORDER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.ok) {
          throw new Error((data && data.error) || "Order was not accepted");
        }
        return data;
      });
  }

  // --- Checkout form inside the cart drawer ------------------------------------

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "#page2 .order-form { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; font-family: 'Suisse Intl Light', sans-serif; }",
      "#page2 .order-form[hidden] { display: none; }",
      "#page2 .order-form__label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; }",
      "#page2 .order-form__input { font: inherit; font-size: 0.95rem; padding: 0.45rem 0.5rem; border: 1px solid currentColor; background: transparent; color: inherit; border-radius: 0; }",
      "#page2 .order-form__input:focus-visible { outline: 2px solid var(--page2-header-shop-banner-surface, #000); outline-offset: 1px; }",
      "#page2 .order-form__textarea { min-height: 4.5rem; resize: vertical; }",
      "#page2 .order-form__status { font-size: 0.85rem; margin: 0; }",
      "#page2 .order-form__status--error { color: #b00020; }",
      "#page2 .order-form__back { font: inherit; font-size: 0.8rem; background: none; border: 0; padding: 0; text-decoration: underline; cursor: pointer; color: inherit; align-self: flex-start; }",
    ].join("\n");
    document.head.appendChild(style);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function field(labelText, input) {
    var label = el("label", "order-form__label");
    label.appendChild(document.createTextNode(labelText));
    label.appendChild(input);
    return label;
  }

  var form = null;
  var refs = {};

  function ensureForm(drawerBody, buyBtn) {
    if (form) return form;
    injectStyles();

    form = el("form", "order-form");
    form.hidden = true;
    form.noValidate = false;

    refs.name = el("input", "order-form__input");
    refs.name.type = "text";
    refs.name.name = "name";
    refs.name.autocomplete = "name";

    refs.email = el("input", "order-form__input");
    refs.email.type = "email";
    refs.email.name = "email";
    refs.email.required = true;
    refs.email.autocomplete = "email";

    refs.note = el("textarea", "order-form__input order-form__textarea");
    refs.note.name = "note";

    refs.submit = el("button", "page2-cart-drawer__buy", "Send order & pay");
    refs.submit.type = "submit";

    refs.back = el("button", "order-form__back", "Back to cart / بازگشت");
    refs.back.type = "button";

    refs.status = el("p", "order-form__status");
    refs.status.setAttribute("role", "status");
    refs.status.hidden = true;

    form.appendChild(field("Name / نام", refs.name));
    form.appendChild(field("Email / ایمیل *", refs.email));
    form.appendChild(field("Note / یادداشت", refs.note));
    form.appendChild(refs.submit);
    form.appendChild(refs.back);
    form.appendChild(refs.status);

    // Clicks inside the form must not count as "outside the cart".
    form.addEventListener("click", function (event) {
      event.stopPropagation();
    });

    drawerBody.insertBefore(form, buyBtn.nextSibling);
    return form;
  }

  function setStatus(text, isError) {
    refs.status.textContent = text || "";
    refs.status.hidden = !text;
    refs.status.classList.toggle("order-form__status--error", !!isError);
  }

  /**
   * Called by the cart's "Buy" button.
   * @param {object} ctx { items, drawerBody, buyBtn, listEl, clearCart }
   */
  function startCheckout(ctx) {
    if (!ctx || !ctx.items || !ctx.items.length) return;
    ensureForm(ctx.drawerBody, ctx.buyBtn);

    function showForm(show) {
      form.hidden = !show;
      ctx.buyBtn.hidden = show;
      if (show) {
        setStatus("");
        refs.submit.disabled = false;
        refs.email.focus();
      }
    }

    refs.back.onclick = function () {
      showForm(false);
    };

    form.onsubmit = function (event) {
      event.preventDefault();
      if (!refs.email.checkValidity()) {
        refs.email.reportValidity();
        return;
      }
      var customer = {
        name: refs.name.value.trim(),
        email: refs.email.value.trim(),
        note: refs.note.value.trim(),
      };
      refs.submit.disabled = true;
      setStatus("Sending… / در حال ارسال…");

      buildPayload(ctx.getItems(), customer)
        .then(sendPayload)
        .then(function (result) {
          form.reset();
          form.hidden = true;
          ctx.clearCart();
          setStatus("");
          if (ctx.onSent) ctx.onSent(result.orderId);
        })
        .catch(function (err) {
          console.error("[OrderSubmit]", err);
          refs.submit.disabled = false;
          setStatus(
            "Something went wrong — please try again. / خطایی رخ داد، لطفاً دوباره تلاش کنید.",
            true
          );
        });
    };

    showForm(true);
  }

  window.OrderSubmit = {
    rememberDesign: rememberDesign,
    startCheckout: startCheckout,
    hideForm: function () {
      if (form) form.hidden = true;
    },
    // Exposed for testing in the browser console.
    _buildPayload: buildPayload,
  };
})();
