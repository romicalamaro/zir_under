(function () {
  "use strict";

  var NOWHERE_PLACEHOLDER = "XX.XXXX° N, XX.XXXX° E";
  var DEFAULT_IRAN_FROM = "Tehran";

  /**
   * Verified via Open-Meteo Geocoding API (2026-06-07).
   * Keys are normalized uppercase (see normalizeLocationKey).
   */
  var KNOWN_LOCATIONS = {
    TEHRAN: { lat: 35.69439, lon: 51.42151 },
    SHIRAZ: { lat: 29.61031, lon: 52.53113 },
    ISFAHAN: { lat: 32.65246, lon: 51.67462 },
    MAINZ: { lat: 49.98185, lon: 8.28008 },
    GERMANY: { lat: 51.5, lon: 10.5 },
    DEUTSCHLAND: { lat: 51.5, lon: 10.5 },
    JERUSALEM: { lat: 31.76904, lon: 35.21633 },
    "BE'ER SHEVA": { lat: 31.25181, lon: 34.7913 },
    BEERSHEBA: { lat: 31.25181, lon: 34.7913 },
  };

  /** Map alternate spellings from the combinations table to KNOWN_LOCATIONS keys. */
  var LOCATION_ALIASES = {
    "BEER SHEVA": "BE'ER SHEVA",
    BEERSHEBA: "BE'ER SHEVA",
    "BE'ER SHEVA": "BE'ER SHEVA",
    TEHERAN: "TEHRAN",
  };

  var ISRAEL_TERMS = [
    "ISRAEL",
    "TEL AVIV",
    "JERUSALEM",
    "HAIFA",
    "BEER SHEVA",
    "BE'ER SHEVA",
    "BEERSHEBA",
    "EILAT",
    "NETANYA",
    "ASHDOD",
    "ASHKELON",
    "TIBERIAS",
    "ACRE",
    "AKKO",
    "NAZARETH",
    "RAMAT GAN",
    "HOLON",
    "BAT YAM",
    "HERZLIYA",
    "RAANANA",
    "KFAR SABA",
    "MODIIN",
    "LOD",
    "RAMLA",
    "SAFED",
    "TZFAT",
    "KIRYAT SHMONA",
    "AFULA",
    "HADERA",
    "REHOVOT",
    "PETAH TIKVA",
    "BNEI BRAK",
    "JUDEA",
    "SAMARIA",
    "GALILEE",
    "NEGEV",
  ];

  var GERMANY_TERMS = [
    "GERMANY",
    "DEUTSCHLAND",
    "MAINZ",
    "BERLIN",
    "MUNICH",
    "MUENCHEN",
    "HAMBURG",
    "FRANKFURT",
    "COLOGNE",
    "KOELN",
    "STUTTGART",
    "DUSSELDORF",
    "DORTMUND",
    "LEIPZIG",
    "BREMEN",
    "DRESDEN",
    "HANOVER",
    "NUREMBERG",
    "BONN",
    "HEIDELBERG",
    "FREIBURG",
    "AACHEN",
    "KARLSRUHE",
    "WIESBADEN",
    "HANAU",
    "DARMSTADT",
    "MANNHEIM",
    "WUPPERTAL",
    "BIELEFELD",
    "ESSEN",
    "COLOGNE",
  ];

  var IRAN_TERMS = ["TEHRAN", "TEHERAN", "SHIRAZ", "ISFAHAN", "IRAN"];

  var cachedContextKey = "";
  var cachedFormatted = "";
  var lookupToken = 0;
  var debounceTimer = null;
  /** @type {((formatted: string) => void) | null} */
  var onUpdate = null;

  /**
   * @param {number} lat
   * @param {number} lon
   * @returns {string}
   */
  function formatCoordinates(lat, lon) {
    var latAbs = Math.abs(lat).toFixed(4);
    var lonAbs = Math.abs(lon).toFixed(4);
    var latDir = lat >= 0 ? "N" : "S";
    var lonDir = lon >= 0 ? "E" : "W";
    return latAbs + "° " + latDir + ", " + lonAbs + "° " + lonDir;
  }

  /**
   * @param {string} text
   * @returns {string}
   */
  function normalizeLocationKey(text) {
    var key = String(text || "").trim().toUpperCase();
    if (!key) return "";
    key = key.replace(/\u2019/g, "'");
    return LOCATION_ALIASES[key] || key;
  }

  /**
   * @param {string} locationText
   * @returns {{ lat: number, lon: number } | null}
   */
  function lookupKnownCoordinates(locationText) {
    var key = normalizeLocationKey(locationText);
    if (!key) return null;
    return KNOWN_LOCATIONS[key] || null;
  }

  /**
   * @param {string} location
   * @returns {"IL" | "DE" | "IR" | "OTHER"}
   */
  function detectRegion(location) {
    var upper = normalizeLocationKey(location);
    var i;
    if (!upper) return "OTHER";
    for (i = 0; i < IRAN_TERMS.length; i++) {
      if (upper.indexOf(IRAN_TERMS[i]) >= 0) return "IR";
    }
    for (i = 0; i < ISRAEL_TERMS.length; i++) {
      if (upper.indexOf(ISRAEL_TERMS[i]) >= 0) return "IL";
    }
    for (i = 0; i < GERMANY_TERMS.length; i++) {
      if (upper.indexOf(GERMANY_TERMS[i]) >= 0) return "DE";
    }
    return "OTHER";
  }

  /**
   * @param {string} location
   * @param {string} countryCode
   * @returns {Promise<{ lat: number, lon: number } | null>}
   */
  function geocodeReal(location, countryCode) {
    var geocodeQuery = location;
    var key = normalizeLocationKey(location);
    if (key === "BE'ER SHEVA") {
      geocodeQuery = "Beersheba";
    }

    var url =
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(geocodeQuery) +
      "&count=1&language=en&format=json&countryCode=" +
      countryCode;
    return fetch(url)
      .then(function (response) {
        if (!response.ok) return null;
        return response.json();
      })
      .then(function (data) {
        if (!data || !data.results || !data.results.length) return null;
        return {
          lat: data.results[0].latitude,
          lon: data.results[0].longitude,
        };
      })
      .catch(function () {
        return null;
      });
  }

  /**
   * @param {string} locationText
   * @param {string} [countryHint]
   * @returns {Promise<{ lat: number, lon: number } | null>}
   */
  function resolveLocationCoordinates(locationText, countryHint) {
    var loc = String(locationText || "").trim();
    var known;
    var region;
    if (!loc) return Promise.resolve(null);

    known = lookupKnownCoordinates(loc);
    if (known) return Promise.resolve(known);

    region = countryHint || detectRegion(loc);
    if (region === "IL" || region === "DE" || region === "IR") {
      return geocodeReal(loc, region);
    }
    return Promise.resolve(null);
  }

  /**
   * @param {{ homeAt?: string, from?: string, nowIn?: string }} context
   * @returns {string}
   */
  function getContextKey(context) {
    var homeAt = context && context.homeAt ? context.homeAt : "inIran";
    var from = context && context.from ? String(context.from).trim() : "";
    var nowIn = context && context.nowIn ? String(context.nowIn).trim() : "";
    if (homeAt === "inIran") return homeAt + "|" + from;
    if (homeAt === "whereILive") return homeAt + "|" + nowIn;
    return homeAt;
  }

  /**
   * @param {{ homeAt?: string, from?: string, nowIn?: string }} context
   * @returns {Promise<string>}
   */
  function resolveFormattedCoordinates(context) {
    var homeAt = context && context.homeAt ? context.homeAt : "inIran";
    var from = context && context.from ? String(context.from).trim() : "";
    var nowIn = context && context.nowIn ? String(context.nowIn).trim() : "";

    if (homeAt === "nowhere") {
      return Promise.resolve(NOWHERE_PLACEHOLDER);
    }

    if (homeAt === "inIran") {
      return resolveLocationCoordinates(from || DEFAULT_IRAN_FROM, "IR").then(
        function (coords) {
          if (!coords) {
            var fallback = lookupKnownCoordinates(DEFAULT_IRAN_FROM);
            if (!fallback) return "";
            return formatCoordinates(fallback.lat, fallback.lon);
          }
          return formatCoordinates(coords.lat, coords.lon);
        }
      );
    }

    if (homeAt === "whereILive") {
      return resolveLocationCoordinates(nowIn).then(function (coords) {
        if (!coords) return "";
        return formatCoordinates(coords.lat, coords.lon);
      });
    }

    return Promise.resolve("");
  }

  function applyFormatted(formatted, contextKey) {
    cachedFormatted = formatted;
    cachedContextKey = contextKey;
    if (onUpdate) onUpdate(cachedFormatted);
  }

  /**
   * @param {{ homeAt?: string, from?: string, nowIn?: string }} context
   * @returns {Promise<void>}
   */
  function updateFromContext(context) {
    var contextKey = getContextKey(context);
    var token = ++lookupToken;

    if (contextKey === cachedContextKey && cachedFormatted) {
      return Promise.resolve();
    }

    return resolveFormattedCoordinates(context).then(function (formatted) {
      if (token !== lookupToken) return;
      applyFormatted(formatted || "", contextKey);
    });
  }

  /**
   * @param {{ homeAt?: string, from?: string, nowIn?: string }} context
   */
  function scheduleUpdateFromContext(context) {
    var homeAt = context && context.homeAt ? context.homeAt : "inIran";
    var from = context && context.from ? String(context.from).trim() : "";
    var nowIn = context && context.nowIn ? String(context.nowIn).trim() : "";
    var contextKey = getContextKey(context);
    var known;
    var locationText;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (homeAt === "nowhere") {
      applyFormatted(NOWHERE_PLACEHOLDER, contextKey);
      return;
    }

    if (homeAt === "inIran") {
      known = lookupKnownCoordinates(from || DEFAULT_IRAN_FROM);
      if (known) {
        applyFormatted(formatCoordinates(known.lat, known.lon), contextKey);
        return;
      }
      updateFromContext(context);
      return;
    }

    if (homeAt === "whereILive") {
      if (!nowIn) {
        updateFromContext(context);
        return;
      }
      known = lookupKnownCoordinates(nowIn);
      if (known) {
        applyFormatted(formatCoordinates(known.lat, known.lon), contextKey);
        return;
      }
      locationText = nowIn;
      debounceTimer = setTimeout(function () {
        debounceTimer = null;
        updateFromContext(context);
      }, 400);
      return;
    }

    updateFromContext(context);
  }

  window.LocationCoordinates = {
    getFormatted: function () {
      return cachedFormatted;
    },
    scheduleUpdateFromContext: scheduleUpdateFromContext,
    updateFromContext: updateFromContext,
    setOnUpdate: function (fn) {
      onUpdate = fn;
    },
    formatCoordinates: formatCoordinates,
    detectRegion: detectRegion,
    lookupKnownCoordinates: lookupKnownCoordinates,
    NOWHERE_PLACEHOLDER: NOWHERE_PLACEHOLDER,
  };
})();
