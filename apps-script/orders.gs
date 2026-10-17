/**
 * UNDER — קבלת הזמנות מהאתר
 *
 * מה הסקריפט עושה בכל הזמנה:
 *   1. יוצר תיקייה ב-Google Drive:  UNDER orders / <מספר הזמנה>
 *   2. שומר כל מטפחת מעוצבת כקובץ SVG וקטורי בגודל הדפסה מלא (70×182 ס"מ)
 *      + קובץ JSON עם כל הבחירות מהשאלון + תמונה קטנה לתצוגה
 *   3. מוסיף שורה לגיליון "UNDER orders" (מעקב הזמנות)
 *   4. שולח לך מייל עם סיכום, תמונות, פרטי הלקוחה וקישור לתיקייה
 *      (ה-SVG מצורף למייל אם הוא קטן מ-20MB)
 *
 * התקנה (פעם אחת):
 *   1. היכנסי ל-script.google.com → New project
 *   2. מחקי את התוכן והדביקי את הקובץ הזה. שמרי.
 *   3. הריצי פעם אחת את הפונקציה setup (Run) ואשרי הרשאות
 *   4. Deploy → New deployment → סוג: Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *      → Deploy → העתיקי את ה-Web app URL (נגמר ב-/exec)
 *   5. הדביקי את הכתובת ב-js/orderSubmit.js בשורה ORDER_ENDPOINT
 *
 * שינוי בקוד הזה אחרי ההתקנה: Deploy → Manage deployments → ✏️ → Version: New version
 * (כך הכתובת נשארת אותה כתובת).
 */

// לאן לשלוח את המייל. ריק = לחשבון שמריץ את הסקריפט (את).
var NOTIFY_EMAIL = "";

// שליחת מייל אישור ללקוחה. כבוי כברירת מחדל: הכתובת של הסקריפט ציבורית,
// ומישהו יכול לנצל אותה כדי לשלוח מיילים בשמך. עדיף לענות ללקוחות ידנית.
var SEND_CUSTOMER_CONFIRMATION = false;

var ROOT_FOLDER_NAME = "UNDER orders";
var SHEET_NAME = "UNDER orders";
var MAX_ITEMS = 20;
var MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

function setup() {
  getRootFolder_();
  getSheet_();
  Logger.log("Ready. Now: Deploy → New deployment → Web app.");
}

function doPost(e) {
  try {
    var order = JSON.parse(e.postData.contents);
    validate_(order);

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var result = saveOrder_(order);
      return json_({ ok: true, orderId: order.orderId, folderUrl: result.folderUrl });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// דף קטן כדי לבדוק בדפדפן שהכתובת עובדת.
function doGet() {
  return ContentService.createTextOutput("UNDER orders endpoint is running.");
}

// ---------------------------------------------------------------------------

function validate_(order) {
  if (!order || typeof order !== "object") throw new Error("Empty order");
  if (!/^UNDER-\d{8}-[A-Z0-9]{3,8}$/.test(String(order.orderId || ""))) {
    throw new Error("Bad order id");
  }
  var email = order.customer && String(order.customer.email || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Bad email");
  if (!Array.isArray(order.items) || !order.items.length) throw new Error("No items");
  if (order.items.length > MAX_ITEMS) throw new Error("Too many items");
}

function saveOrder_(order) {
  var root = getRootFolder_();
  var folder = root.createFolder(order.orderId);
  var attachments = [];
  var attachmentBytes = 0;
  var inlineImages = {};
  var rowsHtml = [];
  var customCount = 0;

  order.items.forEach(function (item, i) {
    var n = i + 1;
    var title = safeName_(item.name || ("item-" + n));
    var line = "<b>" + n + ". " + esc_(item.name || "(no name)") + "</b> — " +
      (item.type === "custom" ? "custom design" : "shop item") +
      " × " + (item.quantity || 1);

    if (item.design) {
      customCount++;
      var base = order.orderId + "-" + n + "-" + title;

      if (item.design.svg) {
        var svgBlob = Utilities.newBlob(item.design.svg, "image/svg+xml", base + ".svg");
        folder.createFile(svgBlob);
        var size = svgBlob.getBytes().length;
        if (attachmentBytes + size <= MAX_ATTACHMENT_BYTES) {
          attachments.push(svgBlob);
          attachmentBytes += size;
        }
        line += "<br>SVG: " + Math.round(size / 1024) + " KB";
      } else {
        line += "<br><span style='color:#b00020'>⚠ No print file was received — ask the customer to design it again.</span>";
      }

      folder.createFile(
        Utilities.newBlob(
          JSON.stringify({ profile: item.design.profile, answers: item.design.answers }, null, 2),
          "application/json",
          base + "-choices.json"
        )
      );

      var preview = dataUrlToBlob_(item.design.previewJpeg, base + "-preview.jpg");
      if (preview) {
        var previewFile = folder.createFile(preview);
        var cid = "preview" + n;
        inlineImages[cid] = preview;
        line += "<br><a href='" + previewFile.getUrl() + "'>" +
          "<img src='cid:" + cid + "' style='width:420px;max-width:100%;border:1px solid #ddd'></a>" +
          "<br><small>Click the image for full size. The print file is the attached SVG.</small>";
      }

      if (item.design.profile) {
        line += "<br><small>" + esc_(JSON.stringify(item.design.profile)) + "</small>";
      }
    }
    rowsHtml.push("<p>" + line + "</p>");
  });

  // סיכום ההזמנה בלי ה-SVG הכבדים
  var summary = JSON.parse(JSON.stringify(order));
  summary.items.forEach(function (item) {
    if (item.design) {
      delete item.design.svg;
      delete item.design.previewJpeg;
    }
  });
  folder.createFile(
    Utilities.newBlob(JSON.stringify(summary, null, 2), "application/json", order.orderId + "-order.json")
  );

  var c = order.customer || {};
  getSheet_().appendRow([
    new Date(order.createdAt || Date.now()),
    order.orderId,
    c.name || "",
    c.email || "",
    c.note || "",
    order.items.length,
    customCount,
    "new",
    folder.getUrl(),
    c.phone || "",
    c.address || "",
    c.shipping ? "Shipping ₪" + (c.shippingPrice || 25) : "Pickup",
  ]);

  var to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
  var html =
    "<h2>New UNDER order " + esc_(order.orderId) + "</h2>" +
    "<p><b>Name:</b> " + esc_(c.name || "-") + "<br>" +
    "<b>Email:</b> " + esc_(c.email) + "<br>" +
    "<b>Phone:</b> " + esc_(c.phone || "-") + "<br>" +
    "<b>Delivery:</b> " + (c.shipping ? "Registered mail (₪" + (c.shippingPrice || 25) + ")" : "Pickup (no shipping)") + "<br>" +
    "<b>Address:</b> " + esc_(c.address || "-").replace(/\n/g, "<br>") + "<br>" +
    "<b>Note:</b> " + esc_(c.note || "-") + "</p>" +
    rowsHtml.join("") +
    "<p><a href='" + folder.getUrl() + "'>Open the order folder in Drive</a></p>" +
    (attachments.length < customCount
      ? "<p>Some SVG files were too large to attach — they are in the Drive folder.</p>"
      : "");

  MailApp.sendEmail({
    to: to,
    replyTo: c.email,
    subject: "UNDER order " + order.orderId + (c.name ? " — " + c.name : ""),
    htmlBody: html,
    attachments: attachments,
    inlineImages: inlineImages,
  });

  if (SEND_CUSTOMER_CONFIRMATION) {
    MailApp.sendEmail({
      to: c.email,
      subject: "Your UNDER order " + order.orderId,
      htmlBody:
        "<p>Thank you" + (c.name ? ", " + esc_(c.name) : "") + "!</p>" +
        "<p>We received your order <b>" + esc_(order.orderId) + "</b> and will be in touch soon.</p>",
    });
  }

  return { folderUrl: folder.getUrl() };
}

// ---------------------------------------------------------------------------

function getRootFolder_() {
  var it = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_FOLDER_NAME);
}

function getSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("SHEET_ID");
  var ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    props.setProperty("SHEET_ID", ss.getId());
    var sheet = ss.getSheets()[0];
    sheet.appendRow(["Date", "Order", "Name", "Email", "Note", "Items", "Custom designs", "Status", "Drive folder"]);
    sheet.setFrozenRows(1);
    DriveApp.getFileById(ss.getId()).moveTo(getRootFolder_());
  }
  var sh = ss.getSheets()[0];
  // Columns added later (Israel shipping): keep older sheets in step.
  if (!sh.getRange(1, 10).getValue()) sh.getRange(1, 10, 1, 2).setValues([["Phone", "Address"]]);
  if (!sh.getRange(1, 12).getValue()) sh.getRange(1, 12).setValue("Delivery");
  return sh;
}

function dataUrlToBlob_(dataUrl, name) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  var m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name);
}

function safeName_(s) {
  return String(s).replace(/[\\\/:*?"<>|\s]+/g, "_").slice(0, 40) || "design";
}

function esc_(s) {
  return String(s).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
