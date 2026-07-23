/**
 * Completion takeaway: fit scarf into Instagram Stories frame → upload → QR.
 * Stays in-page (no Web Share / mailto / WhatsApp). Download works offline.
 *
 * Default host: Litterbox (catbox) — no API key, links expire after 12h.
 * Optional: set IMGUR_CLIENT_ID to prefer Imgur instead.
 */
(function () {
  "use strict";

  // Optional. Leave empty to use Litterbox (works without signup).
  var IMGUR_CLIENT_ID = "";

  var LITTERBOX_UPLOAD_URL =
    "https://litterbox.catbox.moe/resources/internals/api.php";
  var LITTERBOX_TTL = "12h";

  // Instagram Stories canvas (9:16). Scarf fits inside with a little breathing room.
  var STORY_WIDTH = 1080;
  var STORY_HEIGHT = 1920;
  // Scale under 1 leaves transparent padding above/below (and sides).
  var STORY_FIT_SCALE = 0.88;
  var QR_CELL_SIZE = 4;
  var QR_MARGIN = 8;
  var QR_BROWN = "#442c28"; // --color-brown

  var shareGeneration = 0;
  var activeAbortController = null;
  var lastShareBlob = null;
  var lastShareUrl = "";

  function hasClientId() {
    return String(IMGUR_CLIENT_ID || "").trim().length > 0;
  }

  function getQrcodeFactory() {
    if (typeof window.qrcode === "function") return window.qrcode;
    return null;
  }

  function dataUrlToBlob(dataUrl) {
    return fetch(dataUrl).then(function (res) {
      return res.blob();
    });
  }

  function loadImageFromSource(source) {
    return new Promise(function (resolve, reject) {
      if (!source) {
        reject(new Error("No image source"));
        return;
      }
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error("Could not load scarf image"));
      };
      img.src = source;
    });
  }

  function blobToObjectUrl(blob) {
    return URL.createObjectURL(blob);
  }

  function filenameForBlob(blob, fallbackBase) {
    var base = fallbackBase || "undercover-scarf";
    var type = (blob && blob.type) || "";
    if (type.indexOf("png") !== -1) return base + ".png";
    if (type.indexOf("webp") !== -1) return base + ".webp";
    return base + ".jpg";
  }

  /**
   * Fit the full scarf into a 9:16 Stories frame (contain + center + inset).
   * Transparent padding around the scarf (PNG) so top/bottom margins stay empty.
   */
  function composeStoryImage(source) {
    return loadImageFromSource(source).then(function (img) {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (!(w > 0 && h > 0)) {
        throw new Error("Invalid image size");
      }

      var canvas = document.createElement("canvas");
      canvas.width = STORY_WIDTH;
      canvas.height = STORY_HEIGHT;
      var ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");

      // Transparent story frame — clear, do not fill opaque white.
      ctx.clearRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

      // "Contain" then shrink a bit so margins remain above and below.
      var scale =
        Math.min(STORY_WIDTH / w, STORY_HEIGHT / h) * STORY_FIT_SCALE;
      var drawW = Math.max(1, Math.round(w * scale));
      var drawH = Math.max(1, Math.round(h * scale));
      var dx = Math.round((STORY_WIDTH - drawW) / 2);
      var dy = Math.round((STORY_HEIGHT - drawH) / 2);
      ctx.drawImage(img, dx, dy, drawW, drawH);

      return new Promise(function (resolve, reject) {
        if (canvas.toBlob) {
          canvas.toBlob(
            function (blob) {
              if (!blob) {
                reject(new Error("Could not compose story image"));
                return;
              }
              resolve(blob);
            },
            "image/png"
          );
          return;
        }
        try {
          var dataUrl = canvas.toDataURL("image/png");
          dataUrlToBlob(dataUrl).then(resolve, reject);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || "");
        var comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = function () {
        reject(new Error("Could not read image for upload"));
      };
      reader.readAsDataURL(blob);
    });
  }

  function uploadToLitterbox(blob, signal) {
    var form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("time", LITTERBOX_TTL);
    form.append(
      "fileToUpload",
      blob,
      filenameForBlob(blob, "undercover-scarf")
    );

    return fetch(LITTERBOX_UPLOAD_URL, {
      method: "POST",
      body: form,
      signal: signal || undefined,
    }).then(function (res) {
      return res.text().then(function (text) {
        var url = String(text || "").trim();
        if (!res.ok || !/^https?:\/\//i.test(url)) {
          throw new Error(
            url
              ? "Upload failed: " + url.slice(0, 120)
              : "Upload failed (" + res.status + ")"
          );
        }
        return url;
      });
    });
  }

  function uploadToImgur(blob, signal) {
    return blobToBase64(blob).then(function (base64) {
      var body = new URLSearchParams();
      body.set("image", base64);
      body.set("type", "base64");
      body.set("name", filenameForBlob(blob, "undercover-scarf"));
      body.set("title", "UNDER.COVER scarf");

      return fetch("https://api.imgur.com/3/image", {
        method: "POST",
        headers: {
          Authorization: "Client-ID " + String(IMGUR_CLIENT_ID).trim(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        signal: signal || undefined,
      }).then(function (res) {
        return res.json().then(
          function (json) {
            if (
              !res.ok ||
              !json ||
              !json.success ||
              !json.data ||
              !json.data.link
            ) {
              var msg =
                (json && json.data && json.data.error) ||
                (json && json.error) ||
                "Upload failed (" + res.status + ")";
              throw new Error(String(msg));
            }
            return String(json.data.link);
          },
          function () {
            throw new Error("Upload failed (" + res.status + ")");
          }
        );
      });
    });
  }

  function uploadShareBlob(blob, signal) {
    if (hasClientId()) {
      return uploadToImgur(blob, signal).catch(function (err) {
        console.warn(
          "[DesignShareQr] Imgur upload failed, trying Litterbox:",
          err
        );
        return uploadToLitterbox(blob, signal);
      });
    }
    return uploadToLitterbox(blob, signal);
  }

  function readSiteBrown() {
    try {
      var value = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue("--color-brown")
        .trim();
      if (value) return value;
    } catch (e) {
      /* ignore */
    }
    return QR_BROWN;
  }

  function buildQrDataUrl(url) {
    var factory = getQrcodeFactory();
    if (!factory) {
      throw new Error("QR library not loaded");
    }
    var qr = factory(0, "M");
    qr.addData(url);
    qr.make();

    var moduleCount = qr.getModuleCount();
    var size = moduleCount * QR_CELL_SIZE + QR_MARGIN * 2;
    var canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not draw QR");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = readSiteBrown();

    var row;
    var col;
    for (row = 0; row < moduleCount; row += 1) {
      for (col = 0; col < moduleCount; col += 1) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(
            QR_MARGIN + col * QR_CELL_SIZE,
            QR_MARGIN + row * QR_CELL_SIZE,
            QR_CELL_SIZE,
            QR_CELL_SIZE
          );
        }
      }
    }

    return canvas.toDataURL("image/png");
  }

  function downloadBlob(blob, filename) {
    var objectUrl = blobToObjectUrl(blob);
    var a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || filenameForBlob(blob, "undercover-scarf");
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        /* ignore */
      }
    }, 1500);
  }

  function cancelActiveShare() {
    shareGeneration += 1;
    if (activeAbortController) {
      try {
        activeAbortController.abort();
      } catch (e) {
        /* ignore */
      }
      activeAbortController = null;
    }
  }

  function resetShareState() {
    cancelActiveShare();
    lastShareBlob = null;
    lastShareUrl = "";
  }

  function catchShareError(err, generation) {
    if (generation !== shareGeneration) {
      return { ok: false, cancelled: true };
    }
    activeAbortController = null;
    var message = err && err.message ? String(err.message) : String(err || "");
    if (err && err.name === "AbortError") {
      return { ok: false, cancelled: true };
    }
    return {
      ok: false,
      errorCode: "upload-failed",
      error: message,
      blob: lastShareBlob,
    };
  }

  /**
   * Stories-format PNG (transparent) for QR takeaway (phone opens a 9:16 frame).
   */
  function prepareShareFromImageSource(source) {
    cancelActiveShare();
    var generation = shareGeneration;
    var controller =
      typeof AbortController === "function" ? new AbortController() : null;
    activeAbortController = controller;

    return composeStoryImage(source)
      .then(function (blob) {
        if (generation !== shareGeneration) {
          return { ok: false, cancelled: true };
        }
        lastShareBlob = blob;
        return uploadShareBlob(blob, controller && controller.signal).then(
          function (url) {
            if (generation !== shareGeneration) {
              return { ok: false, cancelled: true };
            }
            lastShareUrl = url;
            var qrDataUrl = buildQrDataUrl(url);
            activeAbortController = null;
            return {
              ok: true,
              url: url,
              qrDataUrl: qrDataUrl,
              blob: blob,
              kind: "story-image",
            };
          }
        );
      })
      .catch(function (err) {
        return catchShareError(err, generation);
      });
  }

  function downloadLastOrSource(source, filename) {
    if (lastShareBlob) {
      downloadBlob(lastShareBlob, filename || "undercover-scarf-story.png");
      return Promise.resolve();
    }
    if (!source) return Promise.reject(new Error("Nothing to download"));
    return composeStoryImage(source).then(function (blob) {
      lastShareBlob = blob;
      downloadBlob(blob, filename || "undercover-scarf-story.png");
    });
  }

  window.DesignShareQr = {
    hasClientId: hasClientId,
    prepareShareFromImageSource: prepareShareFromImageSource,
    downloadLastOrSource: downloadLastOrSource,
    resetShareState: resetShareState,
    cancelActiveShare: cancelActiveShare,
    getLastShareUrl: function () {
      return lastShareUrl;
    },
  };
})();
