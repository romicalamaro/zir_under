// Girih 5-tile tessellation — adapted from girihjs (Public Domain)
// https://github.com/jankovicsandras/girihjs
(function (global) {
  "use strict";

  var TILE_ANGLES = [
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [2, 4, 4, 2, 4, 4],
    [2, 2, 6, 2, 2, 6],
    [2, 3, 2, 3],
    [3, 3, 3, 3, 3],
  ];

  var GIRIH_DLENS = [
    [
      [0.96, 0.96],
      [0.96, 0.96],
      [0.96, 0.96],
      [0.96, 0.96],
      [0.96, 0.96],
      [0.96, 0.96],
      [0.96, 0.96],
      [0.96, 0.96],
      [0.96, 0.96],
      [0.96, 0.96],
    ],
    [
      [0.61, 0.61],
      [0.61, 0.61],
      [0.61, 0.61],
      [0.61, 0.61],
      [0.61, 0.61],
      [0.61, 0.61],
    ],
    [
      [0.38, 0.38],
      [0.38, 0.38],
      [0.38, 0.38],
      [0.38, 0.38],
      [0.38, 0.38],
      [0.38, 0.38],
    ],
    [
      [0.44, 0.44],
      [0.44, 0.44],
      [0.44, 0.44],
      [0.44, 0.44],
    ],
    [
      [0.44, 0.44],
      [0.44, 0.44],
      [0.44, 0.44],
      [0.44, 0.44],
      [0.44, 0.44],
    ],
  ];

  var EPSILON = 0.1;
  var FILL_RETRIES = 10;
  /** Canvas-space cluster tolerance for girih junctions (px) */
  function junctionTolerancePx(edgeLength) {
    return Math.max(8, edgeLength * 0.055);
  }

  /** Build one canvas coordinate per girih vertex index. */
  function buildCanvasVertexMap(points, tiles, canvasW, canvasH) {
    var map = new Map();
    var ti;
    var tile;
    var i;
    var pidx;
    var c;

    for (ti = 0; ti < tiles.length; ti++) {
      tile = tiles[ti];
      for (i = 0; i < tile.pointindexes.length; i++) {
        pidx = tile.pointindexes[i];
        if (map.has(pidx)) continue;
        map.set(
          pidx,
          toCanvas(
            points[pidx].coords[0],
            points[pidx].coords[1],
            canvasW,
            canvasH
          )
        );
      }
    }
    return map;
  }

  /**
   * Union-find merge of segment endpoints that should coincide.
   * @param {{x1:number,y1:number,x2:number,y2:number}[]} segments
   * @param {number} tolerance
   */
  function mergeNearbyEndpoints(segments, tolerance) {
    var m = segments.length * 2;
    if (!m) return segments;

    var coords = [];
    var parent = new Array(m);
    var i;
    var j;
    var grid;
    var cellSize;
    var ci;
    var cj;
    var key;
    var bucket;
    var bi;
    var o;
    var ddx;
    var ddy;
    var root;
    var sums;
    var counts;
    var canonical;
    var out;
    var map;
    var c;

    for (i = 0; i < segments.length; i++) {
      coords.push({ x: segments[i].x1, y: segments[i].y1, seg: i, end: 1 });
      coords.push({ x: segments[i].x2, y: segments[i].y2, seg: i, end: 2 });
    }

    for (i = 0; i < m; i++) parent[i] = i;

    function find(idx) {
      while (parent[idx] !== idx) {
        parent[idx] = parent[parent[idx]];
        idx = parent[idx];
      }
      return idx;
    }

    function unite(a, b) {
      var ra = find(a);
      var rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    }

    cellSize = tolerance;
    grid = new Map();
    for (i = 0; i < m; i++) {
      ci = Math.floor(coords[i].x / cellSize);
      cj = Math.floor(coords[i].y / cellSize);
      for (var ox = -1; ox <= 1; ox++) {
        for (var oy = -1; oy <= 1; oy++) {
          key = ci + ox + "," + (cj + oy);
          bucket = grid.get(key);
          if (!bucket) continue;
          for (bi = 0; bi < bucket.length; bi++) {
            o = bucket[bi];
            ddx = coords[i].x - coords[o].x;
            ddy = coords[i].y - coords[o].y;
            if (ddx * ddx + ddy * ddy <= tolerance * tolerance) unite(i, o);
          }
        }
      }
      key = ci + "," + cj;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(i);
    }

    sums = {};
    counts = {};
    for (i = 0; i < m; i++) {
      root = String(find(i));
      if (!sums[root]) {
        sums[root] = { x: 0, y: 0 };
        counts[root] = 0;
      }
      sums[root].x += coords[i].x;
      sums[root].y += coords[i].y;
      counts[root]++;
    }

    canonical = {};
    for (root in sums) {
      canonical[root] = {
        x: sums[root].x / counts[root],
        y: sums[root].y / counts[root],
      };
    }

    out = segments.map(function (s) {
      return { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 };
    });

    for (i = 0; i < m; i++) {
      c = canonical[String(find(i))];
      if (coords[i].end === 1) {
        out[coords[i].seg].x1 = c.x;
        out[coords[i].seg].y1 = c.y;
      } else {
        out[coords[i].seg].x2 = c.x;
        out[coords[i].seg].y2 = c.y;
      }
    }

    map = new Map();
    for (i = 0; i < out.length; i++) {
      addSegment(map, out[i].x1, out[i].y1, out[i].x2, out[i].y2);
    }
    return Array.from(map.values());
  }

  function roundCoord(v) {
    return Math.round(v * 100000) / 100000;
  }

  function edgePointKey(pidxA, pidxB) {
    return pidxA < pidxB ? pidxA + "," + pidxB : pidxB + "," + pidxA;
  }

  /**
   * Canonical edge midpoints keyed by shared vertex pair — computed once per edge.
   * @param {{ coords: number[] }[]} points
   * @param {object[]} tiles
   * @returns {Map<string, { mx: number, my: number, betaFwd: number, gammaFwd: number, betaRev: number, gammaRev: number }>}
   */
  function buildSharedEdgeCache(points, tiles) {
    var cache = new Map();
    var ti;
    var tile;
    var n;
    var ei;
    var prevIdx;
    var currIdx;
    var key;
    var pLo;
    var pHi;
    var x1;
    var y1;
    var x2;
    var y2;
    var alf;
    var bet;
    var gam;

    for (ti = 0; ti < tiles.length; ti++) {
      tile = tiles[ti];
      n = tile.pointindexes.length;
      for (ei = 0; ei < n; ei++) {
        prevIdx = tile.pointindexes[(ei + n - tile.offset - 1) % n];
        currIdx = tile.pointindexes[(ei + n - tile.offset) % n];
        key = edgePointKey(prevIdx, currIdx);
        if (cache.has(key)) continue;

        pLo = prevIdx < currIdx ? prevIdx : currIdx;
        pHi = prevIdx < currIdx ? currIdx : prevIdx;
        x1 = points[pLo].coords[0];
        y1 = points[pLo].coords[1];
        x2 = points[pHi].coords[0];
        y2 = points[pHi].coords[1];
        alf = Math.atan2(x2 - x1, y2 - y1);
        bet = Math.PI / 2 - alf + (Math.PI * 54) / 180;
        gam = Math.PI / 2 - alf + (Math.PI * 126) / 180;
        cache.set(key, {
          mx: (x1 + x2) / 2,
          my: (y1 + y2) / 2,
          betaFwd: bet,
          gammaFwd: gam,
          betaRev: bet + Math.PI,
          gammaRev: gam + Math.PI,
        });
      }
    }
    return cache;
  }

  function getTileEdgeIndices(tile, ei) {
    var n = tile.pointindexes.length;
    return {
      prevIdx: tile.pointindexes[(ei + n - tile.offset - 1) % n],
      currIdx: tile.pointindexes[(ei + n - tile.offset) % n],
    };
  }

  /** @type {{ tiles: object[], canvasPoints: {x:number,y:number}[], edgeLength: number, densityN: number, canvasW: number, canvasH: number } | null} */
  var lastBuild = null;

  function segmentKey(x1, y1, x2, y2) {
    var ax = roundCoord(x1);
    var ay = roundCoord(y1);
    var bx = roundCoord(x2);
    var by = roundCoord(y2);
    if (ax > bx || (ax === bx && ay > by)) {
      return bx + "," + by + "," + ax + "," + ay;
    }
    return ax + "," + ay + "," + bx + "," + by;
  }

  function addSegment(map, x1, y1, x2, y2) {
    if (x1 === x2 && y1 === y2) return;
    var key = segmentKey(x1, y1, x2, y2);
    if (!map.has(key)) {
      map.set(key, {
        x1: roundCoord(x1),
        y1: roundCoord(y1),
        x2: roundCoord(x2),
        y2: roundCoord(y2),
      });
    }
  }

  function createSeededRandom(seed) {
    var state = (seed >>> 0) || 1;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function edgeLengthFromDensity(n, canvasW) {
    var densityN = Math.max(1, Math.round(n));
    return canvasW / (densityN + 1);
  }

  function computeLayout(n, canvasW, canvasH) {
    return {
      densityN: Math.max(1, Math.round(n)),
      edgeLength: edgeLengthFromDensity(n, canvasW),
      canvasW: canvasW,
      canvasH: canvasH,
    };
  }

  function segmentIntersectsCanvas(x1, y1, x2, y2, w, h) {
    if (x1 < 0 && x2 < 0) return false;
    if (x1 > w && x2 > w) return false;
    if (y1 < 0 && y2 < 0) return false;
    if (y1 > h && y2 > h) return false;
    return true;
  }

  function toCanvas(localX, localY, canvasW, canvasH) {
    return {
      x: canvasW / 2 + localX,
      y: canvasH / 2 + localY,
    };
  }

  /**
   * @param {number} canvasW
   * @param {number} canvasH
   * @param {number} edgeLength
   * @param {() => number} rng
   */
  function generateTiling(canvasW, canvasH, edgeLength, rng) {
    var points = [];
    var pointdistances = [];
    var tiles = [];

    function checkmasks(m1, m2) {
      var cnt = 0;
      var i;
      for (i = 0; i < 10; i++) {
        if (m1[i] + m2[i] > 1) return false;
        if (m1[i] + m2[i] === 1) cnt++;
      }
      return cnt !== 9;
    }

    function addmasks(m1, m2) {
      var i;
      for (i = 0; i < 10; i++) m1[i] += m2[i];
      return m1;
    }

    function testtilepoints(idxs, len) {
      var j;
      var i;
      var k;
      for (j = 0; j < idxs.length; j++) {
        for (i = 0; i < points.length; i++) {
          if (
            Math.hypot(
              points[i].coords[0] - points[idxs[j]].coords[0],
              points[i].coords[1] - points[idxs[j]].coords[1]
            ) <
            (1 - EPSILON) * len
          ) {
            var issametile = false;
            for (k = 0; k < idxs.length; k++) {
              if (i === idxs[k]) issametile = true;
            }
            if (!issametile) return false;
          }
        }
      }
      return true;
    }

    function registerpointdistance(idx, dist) {
      var i;
      for (i = 0; i < pointdistances.length; i++) {
        if (pointdistances[i][0] === idx) return;
      }
      for (i = 0; i < pointdistances.length; i++) {
        if (pointdistances[i][1] > dist) {
          pointdistances.splice(i, 0, [idx, dist, 0]);
          return;
        }
      }
      pointdistances.push([idx, dist, 0]);
    }

    function removemask(id, m) {
      var i;
      for (i = 0; i < 10; i++) {
        if (m[i] === 1) points[id].mask[i] = 0;
      }
    }

    function addpoint(len, cs, msk) {
      var i;
      for (i = 0; i < points.length; i++) {
        if (
          Math.abs(points[i].coords[0] - cs[0]) < EPSILON * len &&
          Math.abs(points[i].coords[1] - cs[1]) < EPSILON * len
        ) {
          if (checkmasks(points[i].mask, msk)) {
            points[i].mask = addmasks(points[i].mask, msk);
            return i;
          }
          return -1;
        }
      }
      points.push({ coords: cs, mask: msk });
      registerpointdistance(points.length - 1, Math.hypot(cs[0], cs[1]));
      return points.length - 1;
    }

    function addtile(mtype, ofs, len, x, y, alfa) {
      var idxs = [];
      var rollback = points.length;
      var maskrollbacks = {};
      var i;
      var angle;
      var thisangle;
      var beta;
      var mask;
      var j;
      var pidx;
      var k;
      var newidxs;

      for (i = 0; i < TILE_ANGLES[mtype].length; i++) {
        angle = TILE_ANGLES[mtype][(i + ofs) % TILE_ANGLES[mtype].length];
        thisangle =
          TILE_ANGLES[mtype][
            (i + ofs + TILE_ANGLES[mtype].length - 1) % TILE_ANGLES[mtype].length
          ];
        beta = alfa / 36;
        mask = [];
        for (j = 0; j < 10; j++) mask[j] = 0;
        for (j = 0; j < thisangle; j++) mask[(j + beta + 10) % 10] = 1;

        pidx = addpoint(len, [x, y], mask);
        if (pidx > -1) {
          maskrollbacks[pidx] = mask;
          idxs.push(pidx);
        } else {
          for (k in maskrollbacks) removemask(k, maskrollbacks[k]);
          if (points.length - rollback > 0) {
            points.splice(rollback, points.length - rollback);
          }
          return -1;
        }

        x += Math.cos((alfa * Math.PI) / 180) * len;
        y += Math.sin((alfa * Math.PI) / 180) * len;
        alfa += 180 - angle * 36;
      }

      newidxs = [];
      for (i = rollback; i < points.length; i++) newidxs.push(i);

      if (testtilepoints(newidxs, len)) {
        tiles.push({
          type: mtype,
          pointindexes: idxs,
          offset: ofs,
          sidelength: len,
          rotation: alfa,
          masks: maskrollbacks,
        });
        return tiles.length - 1;
      }

      for (k in maskrollbacks) removemask(k, maskrollbacks[k]);
      if (points.length - rollback > 0) {
        points.splice(rollback, points.length - rollback);
      }
      return -1;
    }

    function fillslot(len, x, y, ff, n) {
      if (n < 2 || n > 8) return -1;
      var r;
      var vertices;

      if (n === 2) {
        vertices = [
          [1, 1],
          [1, 4],
          [2, 1],
          [2, 2],
          [3, 1],
        ];
        r = Math.floor(rng() * vertices.length);
        addtile(vertices[r][0], vertices[r][1], len, x, y, ff * 36);
      }

      if (n === 3) {
        vertices = [
          [3, 2],
          [4, 1],
        ];
        r = Math.floor(rng() * vertices.length);
        addtile(vertices[r][0], vertices[r][1], len, x, y, ff * 36);
      }

      if (n === 4) {
        if (rng() > 0.5) {
          vertices = [
            [0, 1],
            [1, 2],
            [1, 3],
          ];
          r = Math.floor(rng() * vertices.length);
          addtile(vertices[r][0], vertices[r][1], len, x, y, ff * 36);
        } else {
          fillslot(len, x, y, ff, 2);
          fillslot(len, x, y, ff + 2, 2);
        }
      }

      if (n === 5) {
        if (rng() > 0.5) {
          fillslot(len, x, y, ff, 2);
          fillslot(len, x, y, ff + 2, 3);
        } else {
          fillslot(len, x, y, ff, 3);
          fillslot(len, x, y, ff + 3, 2);
        }
      }

      if (n === 6) {
        r = Math.floor(rng() * 5);
        if (r === 0) addtile(2, 3, len, x, y, (ff + 3) * 36);
        if (r === 1) {
          fillslot(len, x, y, ff, 2);
          fillslot(len, x, y, ff + 2, 2);
          fillslot(len, x, y, ff + 4, 2);
        }
        if (r === 2) {
          fillslot(len, x, y, ff, 3);
          fillslot(len, x, y, ff + 3, 3);
        }
        if (r === 3) {
          fillslot(len, x, y, ff, 2);
          fillslot(len, x, y, ff + 2, 4);
        }
        if (r === 4) {
          fillslot(len, x, y, ff, 4);
          fillslot(len, x, y, ff + 4, 2);
        }
      }

      if (n === 7) {
        r = Math.floor(rng() * 5);
        if (r === 0) {
          fillslot(len, x, y, ff, 2);
          fillslot(len, x, y, ff + 2, 2);
          fillslot(len, x, y, ff + 4, 3);
        }
        if (r === 1) {
          fillslot(len, x, y, ff, 2);
          fillslot(len, x, y, ff + 2, 3);
          fillslot(len, x, y, ff + 5, 2);
        }
        if (r === 2) {
          fillslot(len, x, y, ff, 3);
          fillslot(len, x, y, ff + 3, 2);
          fillslot(len, x, y, ff + 5, 2);
        }
        if (r === 3) {
          fillslot(len, x, y, ff, 3);
          fillslot(len, x, y, ff + 3, 4);
        }
        if (r === 4) {
          fillslot(len, x, y, ff, 4);
          fillslot(len, x, y, ff + 4, 3);
        }
      }

      if (n === 8) {
        r = Math.floor(rng() * 10);
        if (r === 0) {
          fillslot(len, x, y, ff, 2);
          fillslot(len, x, y, ff + 2, 2);
          fillslot(len, x, y, ff + 4, 2);
          fillslot(len, x, y, ff + 6, 2);
        }
        if (r === 1) {
          fillslot(len, x, y, ff, 2);
          fillslot(len, x, y, ff + 2, 2);
          fillslot(len, x, y, ff + 4, 4);
        }
        if (r === 2) {
          fillslot(len, x, y, ff, 2);
          fillslot(len, x, y, ff + 2, 4);
          fillslot(len, x, y, ff + 6, 2);
        }
        if (r === 3) {
          fillslot(len, x, y, ff, 4);
          fillslot(len, x, y, ff + 4, 2);
          fillslot(len, x, y, ff + 6, 2);
        }
        if (r === 4) {
          fillslot(len, x, y, ff, 2);
          fillslot(len, x, y, ff + 2, 3);
          fillslot(len, x, y, ff + 5, 3);
        }
        if (r === 5) {
          fillslot(len, x, y, ff, 3);
          fillslot(len, x, y, ff + 3, 2);
          fillslot(len, x, y, ff + 5, 3);
        }
        if (r === 6) {
          fillslot(len, x, y, ff, 3);
          fillslot(len, x, y, ff + 3, 3);
          fillslot(len, x, y, ff + 6, 2);
        }
        if (r === 7) {
          fillslot(len, x, y, ff, 4);
          fillslot(len, x, y, ff + 4, 4);
        }
        if (r === 8) {
          fillslot(len, x, y, ff, 2);
          fillslot(len, x, y, ff + 2, 6);
        }
        if (r === 9) {
          fillslot(len, x, y, ff, 6);
          fillslot(len, x, y, ff + 6, 2);
        }
      }

      return 0;
    }

    function fillpoint(idx, len) {
      var firstfree = -2;
      var freecnt = 0;
      var i;

      for (i = 0; i < 11; i++) {
        if (points[idx]) {
          if (points[idx].mask[i % 10] === 1 && firstfree === -2) firstfree = -1;
          if (points[idx].mask[i % 10] === 0 && firstfree === -1) firstfree = i % 10;
        }
      }
      if (firstfree < 0) return -1;

      while (points[idx].mask[firstfree % 10] === 0 && freecnt < 12) {
        freecnt++;
        firstfree++;
      }
      firstfree -= freecnt;
      if (freecnt > 10) return -1;

      return fillslot(len, points[idx].coords[0], points[idx].coords[1], firstfree, freecnt);
    }

    function pointCanGrow(idx) {
      var i;
      if (!points[idx]) return false;
      for (i = 0; i < 10; i++) {
        if (points[idx].mask[i] === 0) return true;
      }
      return false;
    }

    function isvisiblepoint(i, w, h) {
      if (!points[i]) return false;
      return (
        points[i].coords[0] >= -w / 2 &&
        points[i].coords[0] <= w / 2 &&
        points[i].coords[1] >= -h / 2 &&
        points[i].coords[1] <= h / 2
      );
    }

    addtile(0, 0, edgeLength, -edgeLength / 2, -1.5388 * edgeLength, 0);

    // gen1 index sweep (girihjs): grow by point index, widening sweep each pass.
    var baseIter = Math.ceil(Math.max(canvasW, canvasH) / edgeLength);
    var growthPasses = Math.min(
      90,
      Math.max(14, baseIter + Math.ceil(baseIter * 0.35))
    );
    var pass;
    var iter;
    var j;
    var k;
    var pointCount;
    var sweepLimit;

    for (pass = 0; pass < growthPasses; pass++) {
      pointCount = points.length;
      sweepLimit = Math.min(pointCount, baseIter * (pass + 2));
      for (iter = 0; iter < sweepLimit; iter++) {
        if (!isvisiblepoint(iter, canvasW, canvasH)) continue;
        for (j = 0; j < FILL_RETRIES; j++) fillpoint(iter, edgeLength);
      }
    }

    for (iter = 0; iter < points.length; iter++) {
      if (!isvisiblepoint(iter, canvasW, canvasH) || !pointCanGrow(iter)) continue;
      for (j = 0; j < FILL_RETRIES; j++) fillpoint(iter, edgeLength);
    }

    return { points: points, tiles: tiles };
  }

  function tileHasCanvasOverlap(tile, points, canvasW, canvasH) {
    var i;
    var c;
    for (i = 0; i < tile.pointindexes.length; i++) {
      c = toCanvas(
        points[tile.pointindexes[i]].coords[0],
        points[tile.pointindexes[i]].coords[1],
        canvasW,
        canvasH
      );
      if (c.x >= 0 && c.x <= canvasW && c.y >= 0 && c.y <= canvasH) return true;
    }
    return false;
  }

  function extractSegments(points, tiles, canvasW, canvasH) {
    var map = new Map();
    var edgeCache = buildSharedEdgeCache(points, tiles);
    var vertexCanvas = buildCanvasVertexMap(points, tiles, canvasW, canvasH);
    var edgeLength = tiles.length ? tiles[0].sidelength : 100;
    var mergeTol = junctionTolerancePx(edgeLength);
    var ti;
    var tile;
    var ei;
    var n;
    var edge;
    var prevIdx;
    var currIdx;
    var edgeEntry;
    var edgeKey;
    var isForward;
    var beta;
    var gamma;
    var dl;
    var va;
    var vb;
    var midX;
    var midY;
    var tip2X;
    var tip2Y;
    var tip3X;
    var tip3Y;

    for (ti = 0; ti < tiles.length; ti++) {
      tile = tiles[ti];
      if (!tileHasCanvasOverlap(tile, points, canvasW, canvasH)) continue;
      edgeLength = tile.sidelength;

      n = tile.pointindexes.length;
      for (ei = 0; ei < n; ei++) {
        edge = getTileEdgeIndices(tile, ei);
        prevIdx = edge.prevIdx;
        currIdx = edge.currIdx;
        edgeKey = edgePointKey(prevIdx, currIdx);
        edgeEntry = edgeCache.get(edgeKey);
        if (!edgeEntry) continue;

        va = vertexCanvas.get(prevIdx);
        vb = vertexCanvas.get(currIdx);
        if (!va || !vb) continue;

        if (segmentIntersectsCanvas(va.x, va.y, vb.x, vb.y, canvasW, canvasH)) {
          addSegment(map, va.x, va.y, vb.x, vb.y);
        }

        midX = (va.x + vb.x) / 2;
        midY = (va.y + vb.y) / 2;

        isForward = prevIdx < currIdx;
        beta = isForward ? edgeEntry.betaFwd : edgeEntry.betaRev;
        gamma = isForward ? edgeEntry.gammaFwd : edgeEntry.gammaRev;
        dl =
          GIRIH_DLENS[tile.type][(ei + tile.offset) % tile.pointindexes.length];

        tip2X =
          canvasW / 2 +
          edgeEntry.mx +
          Math.cos(beta) * tile.sidelength * dl[0];
        tip2Y =
          canvasH / 2 +
          edgeEntry.my +
          Math.sin(beta) * tile.sidelength * dl[0];
        tip3X =
          canvasW / 2 +
          edgeEntry.mx +
          Math.cos(gamma) * tile.sidelength * dl[1];
        tip3Y =
          canvasH / 2 +
          edgeEntry.my +
          Math.sin(gamma) * tile.sidelength * dl[1];

        if (
          segmentIntersectsCanvas(midX, midY, tip2X, tip2Y, canvasW, canvasH)
        ) {
          addSegment(map, midX, midY, tip2X, tip2Y);
        }
        if (
          segmentIntersectsCanvas(midX, midY, tip3X, tip3Y, canvasW, canvasH)
        ) {
          addSegment(map, midX, midY, tip3X, tip3Y);
        }
      }
    }

    return mergeNearbyEndpoints(Array.from(map.values()), mergeTol);
  }

  function collectTileCentroids(points, tiles, canvasW, canvasH) {
    var out = [];
    var ti;
    var tile;
    var i;
    var sumX = 0;
    var sumY = 0;
    var n;
    var c;

    for (ti = 0; ti < tiles.length; ti++) {
      tile = tiles[ti];
      if (!tileHasCanvasOverlap(tile, points, canvasW, canvasH)) continue;
      n = tile.pointindexes.length;
      sumX = 0;
      sumY = 0;
      for (i = 0; i < n; i++) {
        c = toCanvas(
          points[tile.pointindexes[i]].coords[0],
          points[tile.pointindexes[i]].coords[1],
          canvasW,
          canvasH
        );
        sumX += c.x;
        sumY += c.y;
      }
      out.push({
        type: tile.type,
        cx: sumX / n,
        cy: sumY / n,
        sidelength: tile.sidelength,
      });
    }
    return out;
  }

  function collectCanvasVertices(points, canvasW, canvasH) {
    var seen = new Set();
    var out = [];
    var i;
    var c;
    var key;

    for (i = 0; i < points.length; i++) {
      if (!points[i] || points[i].coords[0] < -1e8) continue;
      c = toCanvas(points[i].coords[0], points[i].coords[1], canvasW, canvasH);
      if (c.x < 0 || c.x > canvasW || c.y < 0 || c.y > canvasH) continue;
      key = roundCoord(c.x) + "," + roundCoord(c.y);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }

  /**
   * @param {{ canvasW: number, canvasH: number, densityN: number, seed?: number }} options
   * @returns {{ segments: {x1:number,y1:number,x2:number,y2:number}[], edgeLength: number, tileCount: number }}
   */
  function buildPattern(options) {
    var canvasW = options.canvasW;
    var canvasH = options.canvasH;
    var densityN = Math.max(1, Math.round(options.densityN));
    var seed =
      typeof options.seed === "number" ? options.seed : densityN * 9973 + 42;
    var edgeLength = edgeLengthFromDensity(densityN, canvasW);
    var rng = createSeededRandom(seed);
    var result = generateTiling(canvasW, canvasH, edgeLength, rng);
    var segments = extractSegments(
      result.points,
      result.tiles,
      canvasW,
      canvasH
    );

    lastBuild = {
      points: result.points,
      tiles: result.tiles,
      edgeLength: edgeLength,
      densityN: densityN,
      canvasW: canvasW,
      canvasH: canvasH,
      centroids: collectTileCentroids(
        result.points,
        result.tiles,
        canvasW,
        canvasH
      ),
      vertices: collectCanvasVertices(result.points, canvasW, canvasH),
    };

    return {
      segments: segments,
      edgeLength: edgeLength,
      tileCount: result.tiles.length,
    };
  }

  function mergeUniqueSortedXCoords(lists) {
    var seen = new Set();
    var out = [];
    var li;
    var i;
    for (li = 0; li < lists.length; li++) {
      for (i = 0; i < lists[li].length; i++) {
        var x = roundCoord(lists[li][i]);
        if (seen.has(x)) continue;
        seen.add(x);
        out.push(x);
      }
    }
    out.sort(function (a, b) {
      return a - b;
    });
    return out;
  }

  function collectVerticalAnchorXCoords(layout) {
    if (!lastBuild || lastBuild.densityN !== layout.densityN) return [];
    var xs = [];
    var i;
    for (i = 0; i < lastBuild.centroids.length; i++) {
      xs.push(lastBuild.centroids[i].cx);
    }
    for (i = 0; i < lastBuild.vertices.length; i++) {
      xs.push(lastBuild.vertices[i].x);
    }
    return mergeUniqueSortedXCoords([xs]);
  }

  /**
   * @param {{ densityN: number, edgeLength: number }} layout
   * @param {number} canvasW
   * @param {number} canvasH
   * @returns {{ id: string, cx: number, cy: number, r: number, halfSide: number }[]}
   */
  function buildJunctionCircleCatalog(layout, canvasW, canvasH) {
    if (!lastBuild || lastBuild.densityN !== layout.densityN) return [];
    var edgeLength = layout.edgeLength;
    var r = edgeLength * 0.22;
    var cutRatio =
      typeof CUT_RATIO !== "undefined" ? CUT_RATIO : 1 / (2 + Math.SQRT2);
    /** Upright junction square (covers inner diamond; parallels octagon cut module). */
    var halfSide = roundCoord(edgeLength * cutRatio);
    var catalog = [];
    var i;
    var c;

    for (i = 0; i < lastBuild.centroids.length; i++) {
      c = lastBuild.centroids[i];
      if (c.type !== 0 && c.type !== 1) continue;
      if (c.cx + r <= 0 || c.cx - r >= canvasW || c.cy + r <= 0 || c.cy - r >= canvasH) {
        continue;
      }
      catalog.push({
        id: "girih-sq-" + i,
        cx: roundCoord(c.cx),
        cy: roundCoord(c.cy),
        r: roundCoord(r),
        halfSide: halfSide,
      });
    }
    return catalog;
  }

  /**
   * @param {{ densityN: number, edgeLength: number }} layout
   * @param {number} canvasW
   * @param {number} canvasH
   * @returns {{ id: string, cx: number, cy: number, halfW: number, halfH: number }[]}
   */
  function buildHelplessnessJunctionCatalog(layout, canvasW, canvasH) {
    if (!lastBuild || lastBuild.densityN !== layout.densityN) return [];
    var half = layout.edgeLength * 0.15;
    var catalog = [];
    var i;
    var v;

    for (i = 0; i < lastBuild.vertices.length; i++) {
      v = lastBuild.vertices[i];
      if (
        v.x + half <= 0 ||
        v.x - half >= canvasW ||
        v.y + half <= 0 ||
        v.y - half >= canvasH
      ) {
        continue;
      }
      catalog.push({
        id: "girih-hp-" + i,
        cx: roundCoord(v.x),
        cy: roundCoord(v.y),
        halfW: roundCoord(half),
        halfH: roundCoord(half),
      });
    }
    return catalog;
  }

  /**
   * @param {{ densityN: number, edgeLength: number }} layout
   * @param {number} canvasW
   * @param {number} canvasH
   * @returns {{ id: string, points: {x:number,y:number}[] }[]}
   */
  function buildDiamondCatalog(layout, canvasW, canvasH) {
    if (!lastBuild || lastBuild.densityN !== layout.densityN) return [];
    var h = layout.edgeLength * 0.18;
    var catalog = [];
    var i;
    var c;

    for (i = 0; i < lastBuild.centroids.length; i++) {
      c = lastBuild.centroids[i];
      if (c.type !== 3 && c.type !== 4) continue;
      if (
        c.cx + h <= 0 ||
        c.cx - h >= canvasW ||
        c.cy + h <= 0 ||
        c.cy - h >= canvasH
      ) {
        continue;
      }
      catalog.push({
        id: "girih-dm-" + i,
        points: [
          { x: roundCoord(c.cx), y: roundCoord(c.cy - h) },
          { x: roundCoord(c.cx + h), y: roundCoord(c.cy) },
          { x: roundCoord(c.cx), y: roundCoord(c.cy + h) },
          { x: roundCoord(c.cx - h), y: roundCoord(c.cy) },
        ],
      });
    }
    return catalog;
  }

  global.GirihGeometry = {
    roundCoord: roundCoord,
    segmentKey: segmentKey,
    edgeLengthFromDensity: edgeLengthFromDensity,
    computeLayout: computeLayout,
    buildPattern: buildPattern,
    collectVerticalAnchorXCoords: collectVerticalAnchorXCoords,
    buildJunctionCircleCatalog: buildJunctionCircleCatalog,
    buildHelplessnessJunctionCatalog: buildHelplessnessJunctionCatalog,
    buildDiamondCatalog: buildDiamondCatalog,
  };
})(typeof window !== "undefined" ? window : this);
