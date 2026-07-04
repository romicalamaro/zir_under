/**
 * 3D floating headscarf — cloth simulation from Brik export.
 * initHeadscarf3d(root, options) → { destroy, play, pause }
 */
import * as THREE from 'https://esm.sh/three@0.170.0';

const DEFAULT_CONFIG = {
  playing: true,
  flagPreset: "banner",
  renderMode: "3D",
  texture: null,
  bgMode: "Transparent",
  bgColor: "#FFBA00",
  bgImage: null,
  windStrength: 40,
  windDirection: { x: 0, y: 0 },
  enablePointerWind: true,
  pointerWindMode: "full",
  pointerWindInfluence: 1,
  pointerTurbulenceBoost: 0.04,
  turbulence: 100,
  turbulenceScale: 42,
  gustFrequency: 25,
  stiffness: 65,
  damping: 2,
  weight: 3,
  resolution: "High 60x42",
  anchorPreset: "Four Corners",
  softAnchorStrength: 0.15,
  flagWidth: 9.5,
  flagHeight: 3.2,
  baseColor: "#0065FF",
  accentColor: "#1a1a2e",
  designPattern: "Diamond",
  patternScale: 13,
  material: "Satin",
  flagText: "",
  customFont: null,
  fontFamily: "Inter",
  fontWeight: 900,
  textSize: 178,
  textColor: "#000000",
  textAlign: "Center",
  leading: 80,
  showSeams: true,
  seamStyle: "Overlock",
  camX: 0,
  camY: 0.5,
  camZ: 7,
  cameraFov: 50,
  meshScale: 1,
  fitToWidth: false,
  fitToWidthScale: 1,
  lightAngle: 145,
  lightIntensity: 100,
  ambientIntensity: 200,
  doubleSided: true,
  showWireframe: false,
  textureRotation: 0,
  textureFill: false,
  colorFidelity: false,
  enableShadows: true,
};

const DEFAULT_TEXTURE_URL = "website/design/headscarf-3d-texture.png";

function capMobileDpr() {
  if (window.innerWidth <= 768) {
    const nativeDpr = window.devicePixelRatio || 1;
    const cappedDpr = Math.min(1.5, nativeDpr);
    try {
      Object.defineProperty(window, "devicePixelRatio", {
        get: function () {
          return cappedDpr;
        },
      });
    } catch (e) {}
  }
}

export function initHeadscarf3d(root, options) {
  if (!root) return null;
  if (root.clientWidth <= 0 || root.clientHeight <= 0) return null;
  options = options || {};
  capMobileDpr();

  const state = Object.assign({}, DEFAULT_CONFIG, options.config || {});
  state.texture = options.textureUrl || state.texture || DEFAULT_TEXTURE_URL;

  const controls = {
    get: function (k) {
      return state[k];
    },
    set: function (k, v) {
      state[k] = v;
    },
  };

  root.classList.add("headscarf-3d-root");
  if (!root.style.position || root.style.position === "static") {
    root.style.position = "relative";
  }
  root.style.overflow = options.overflow != null ? options.overflow : "hidden";
  if (!root.style.width) root.style.width = "100%";
  if (!root.style.height) root.style.height = "100%";

  let destroyed = false;
  let rafId = 0;
  let resizeObserver = null;
  let onPointerMove = null;
  let onResize = null;
  let sceneReady = false;

  // ============================================================
  // FLAG ENGINE — Cloth Simulation + Surface Design + Multi-Render
  // ============================================================

  const area = root;

  function getEffectiveFlagWidth() {
    return controls.get("flagWidth") * (controls.get("meshScale") || 1);
  }

  function getEffectiveFlagHeight() {
    return controls.get("flagHeight") * (controls.get("meshScale") || 1);
  }

  function applyFitToWidth() {
    if (!controls.get("fitToWidth")) return;
    const aspect = getAreaAspect();
    const fovRad = ((controls.get("cameraFov") || 50) * Math.PI) / 180;
    const scale = controls.get("fitToWidthScale") || 1;
    const halfTan = Math.tan(fovRad / 2);
    const camZForWidth =
      getEffectiveFlagWidth() / (2 * halfTan * aspect);
    const camZForHeight = getEffectiveFlagHeight() / (2 * halfTan);
    const camZ = Math.max(camZForWidth, camZForHeight) * scale;
    controls.set("camZ", camZ);
    camera.position.set(controls.get("camX"), controls.get("camY"), camZ);
  }

  function bootSceneIfReady() {
    if (destroyed || sceneReady) return;
    const w = area.clientWidth;
    const h = area.clientHeight;
    if (w <= 0 || h <= 0) return;
    sceneReady = true;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    applyFitToWidth();
    if (!controls.get("fitToWidth")) {
      camera.position.set(controls.get("camX"), controls.get("camY"), controls.get("camZ"));
    }
    buildFlag();
    loadTextureImage();
  }

  function getAreaAspect() {
    const w = area.clientWidth;
    const h = area.clientHeight;
    if (w > 0 && h > 0) return w / h;
    return 1;
  }

  // --- Three.js Setup ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(state.cameraFov || 50, getAreaAspect(), 0.1, 200);
  camera.position.set(0, 0.5, 7);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(area.clientWidth, area.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (controls.get("colorFidelity")) {
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
  }
  renderer.shadowMap.enabled = controls.get("enableShadows") !== false && !controls.get("colorFidelity");
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  if (state.texture) {
    renderer.domElement.style.opacity = "0";
    renderer.domElement.style.transition = "opacity 0.4s ease";
  }
  area.appendChild(renderer.domElement);

  // --- Lighting ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(3, 4, 5);
  dirLight.castShadow = controls.get("enableShadows") !== false && !controls.get("colorFidelity");
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(dirLight);

  // Fill light to soften the "sharp line"
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-3, -2, -3);
  scene.add(fillLight);

  // Rim light for better definition
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(0, 5, -5);
  scene.add(rimLight);

  // --- Simplex Noise (compact implementation) ---
  class SimplexNoise {
    constructor(seed = Math.random()) {
      this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
      this.perm = new Uint8Array(512);
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;
      let s = seed * 2147483647;
      if (s <= 0) s += 2147483646;
      for (let i = 255; i > 0; i--) {
        s = (s * 16807) % 2147483647;
        const j = s % (i + 1);
        [p[i], p[j]] = [p[j], p[i]];
      }
      for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    }
    noise3D(x, y, z) {
      const F3 = 1/3, G3 = 1/6;
      const s = (x+y+z)*F3;
      const i = Math.floor(x+s), j = Math.floor(y+s), k = Math.floor(z+s);
      const t = (i+j+k)*G3;
      const X0 = i-t, Y0 = j-t, Z0 = k-t;
      const x0 = x-X0, y0 = y-Y0, z0 = z-Z0;
      let i1,j1,k1,i2,j2,k2;
      if(x0>=y0){if(y0>=z0){i1=1;j1=0;k1=0;i2=1;j2=1;k2=0}else if(x0>=z0){i1=1;j1=0;k1=0;i2=1;j2=0;k2=1}else{i1=0;j1=0;k1=1;i2=1;j2=0;k2=1}}else{if(y0<z0){i1=0;j1=0;k1=1;i2=0;j2=1;k2=1}else if(x0<z0){i1=0;j1=1;k1=0;i2=0;j2=1;k2=1}else{i1=0;j1=1;k1=0;i2=1;j2=1;k2=0}}
      const x1=x0-i1+G3,y1=y0-j1+G3,z1=z0-k1+G3;
      const x2=x0-i2+2*G3,y2=y0-j2+2*G3,z2=z0-k2+2*G3;
      const x3=x0-1+3*G3,y3=y0-1+3*G3,z3=z0-1+3*G3;
      const ii=i&255,jj=j&255,kk=k&255;
      const dot=(gi,x,y,z)=>{const g=this.grad3[gi%12];return g[0]*x+g[1]*y+g[2]*z};
      let n0=0,n1=0,n2=0,n3=0;
      let t0=0.6-x0*x0-y0*y0-z0*z0;if(t0>0){t0*=t0;n0=t0*t0*dot(this.perm[ii+this.perm[jj+this.perm[kk]]],x0,y0,z0)}
      let t1=0.6-x1*x1-y1*y1-z1*z1;if(t1>0){t1*=t1;n1=t1*t1*dot(this.perm[ii+i1+this.perm[jj+j1+this.perm[kk+k1]]],x1,y1,z1)}
      let t2=0.6-x2*x2-y2*y2-z2*z2;if(t2>0){t2*=t2;n2=t2*t2*dot(this.perm[ii+i2+this.perm[jj+j2+this.perm[kk+k2]]],x2,y2,z2)}
      let t3=0.6-x3*x3-y3*y3-z3*z3;if(t3>0){t3*=t3;n3=t3*t3*dot(this.perm[ii+1+this.perm[jj+1+this.perm[kk+1]]],x3,y3,z3)}
      return 32*(n0+n1+n2+n3);
    }
  }
  const noise = new SimplexNoise(42);

  // ============================================================
  // CLOTH SIMULATION — Verlet Integration
  // ============================================================

  class ClothSim {
    constructor(segsX, segsY, width, height) {
      this.segsX = segsX;
      this.segsY = segsY;
      this.width = width;
      this.height = height;
      this.count = (segsX + 1) * (segsY + 1);
    
      // Position buffers
      this.pos = new Float32Array(this.count * 3);
      this.prev = new Float32Array(this.count * 3);
      this.accel = new Float32Array(this.count * 3);
      this.pinned = new Uint8Array(this.count);
      this.active = new Uint8Array(this.count); // for shape masking
    
      // UV coords
      this.uvs = new Float32Array(this.count * 2);
    
      // Springs
      this.springs = [];
      this.rest = null;
      this.softAnchorStrength = 0;

      this.init();
    }
  
    init() {
      const { segsX, segsY, width, height } = this;
      const cols = segsX + 1;
    
      // Initialize positions — flag centered at origin, hanging in XY plane
      for (let j = 0; j <= segsY; j++) {
        for (let i = 0; i <= segsX; i++) {
          const idx = j * cols + i;
          const i3 = idx * 3;
          const u = i / segsX;
          const v = j / segsY;
        
          this.pos[i3]     = (u - 0.5) * width;
          this.pos[i3 + 1] = (0.5 - v) * height; // top = positive Y
          this.pos[i3 + 2] = 0;
        
          this.prev[i3]     = this.pos[i3];
          this.prev[i3 + 1] = this.pos[i3 + 1];
          this.prev[i3 + 2] = this.pos[i3 + 2];
        
          this.uvs[idx * 2]     = u;
          this.uvs[idx * 2 + 1] = v;
        
          this.active[idx] = 1;
        }
      }
    
      // Build springs: structural, shear, bend
      this.springs = [];
      for (let j = 0; j <= segsY; j++) {
        for (let i = 0; i <= segsX; i++) {
          const idx = j * cols + i;
          // Structural
          if (i < segsX) this.addSpring(idx, idx + 1, 1.0);
          if (j < segsY) this.addSpring(idx, idx + cols, 1.0);
          // Shear
          if (i < segsX && j < segsY) {
            this.addSpring(idx, idx + cols + 1, 1.0);
            this.addSpring(idx + 1, idx + cols, 1.0);
          }
          // Bend
          if (i < segsX - 1) this.addSpring(idx, idx + 2, 0.3);
          if (j < segsY - 1) this.addSpring(idx, idx + cols * 2, 0.3);
        }
      }

      this.rest = new Float32Array(this.pos.length);
      this.rest.set(this.pos);
    }
  
    addSpring(a, b, stiffnessMul) {
      const i3a = a * 3, i3b = b * 3;
      const dx = this.pos[i3a] - this.pos[i3b];
      const dy = this.pos[i3a+1] - this.pos[i3b+1];
      const dz = this.pos[i3a+2] - this.pos[i3b+2];
      const restLen = Math.sqrt(dx*dx + dy*dy + dz*dz);
      this.springs.push({ a, b, restLen, stiffMul: stiffnessMul });
    }
  
    applyShape(shape) {
      const cols = this.segsX + 1;
      for (let j = 0; j <= this.segsY; j++) {
        for (let i = 0; i <= this.segsX; i++) {
          const idx = j * cols + i;
          const u = i / this.segsX;
          const v = j / this.segsY;
          this.active[idx] = this.isInsideShape(u, v, shape) ? 1 : 0;
        }
      }
    }
  
    isInsideShape(u, v, shape) {
      switch (shape) {
        case 'pennant': return u <= 1.0 - v; // triangle tapering to bottom-right
        case 'swallowtail': {
          if (v < 0.85) return true;
          const notch = Math.abs(u - 0.5);
          return notch > (v - 0.85) * 3.3;
        }
        case 'gonfalon': {
          if (v < 0.7) return true;
          const t = (v - 0.7) / 0.3;
          return u >= 0.2 * t && u <= 1.0 - 0.2 * t;
        }
        case 'guidon': {
          if (v < 0.9) return true;
          const t = (v - 0.9) / 0.1;
          const notch = Math.abs(u - 0.5);
          return notch > t * 0.3;
        }
        case 'rounded': {
          const cx = 0.5, cy = 0.5;
          const rx = 0.5, ry = 0.5;
          const dx = (u - cx) / rx, dy = (v - cy) / ry;
          return Math.pow(Math.abs(dx), 2.5) + Math.pow(Math.abs(dy), 2.5) <= 1.0;
        }
        default: return true; // banner = rectangle
      }
    }
  
    setAnchors(preset) {
      this.pinned.fill(0);
      this.softAnchorStrength = 0;
      const cols = this.segsX + 1;
      const rows = this.segsY + 1;
    
      switch (preset) {
        case 'Top Edge':
          for (let i = 0; i <= this.segsX; i++) {
            if (this.active[i]) this.pinned[i] = 1;
          }
          break;
        case 'Left Edge':
          for (let j = 0; j <= this.segsY; j++) {
            const idx = j * cols;
            if (this.active[idx]) this.pinned[idx] = 1;
          }
          break;
        case 'Right Edge':
          for (let j = 0; j <= this.segsY; j++) {
            const idx = j * cols + this.segsX;
            if (this.active[idx]) this.pinned[idx] = 1;
          }
          break;
        case 'Top-Left Corner':
          if (this.active[0]) this.pinned[0] = 1;
          break;
        case 'Two Corners':
          if (this.active[0]) this.pinned[0] = 1;
          if (this.active[this.segsX]) this.pinned[this.segsX] = 1;
          break;
        case 'Four Corners': {
          const topRight = this.segsX;
          const bottomLeft = this.segsY * cols;
          const bottomRight = bottomLeft + this.segsX;
          if (this.active[0]) this.pinned[0] = 1;
          if (this.active[topRight]) this.pinned[topRight] = 1;
          if (this.active[bottomLeft]) this.pinned[bottomLeft] = 1;
          if (this.active[bottomRight]) this.pinned[bottomRight] = 1;
          break;
        }
        case 'Center Point': {
          const ci = Math.floor(this.segsX / 2);
          const cj = Math.floor(this.segsY / 2);
          const idx = cj * cols + ci;
          if (this.active[idx]) this.pinned[idx] = 1;
          break;
        }
        case 'Free Float':
          // No anchors — fully free
          break;
        case 'Soft Float':
          // No hard pins — gentle spring to rest pose (set in buildFlag)
          break;
      }
    }
  
    step(dt, gravity, windForce, stiffness, damping, turbTime, turbIntensity, turbScale) {
      const count = this.count;
      const cols = this.segsX + 1;
    
      // Reset acceleration
      this.accel.fill(0);
    
      // Apply gravity + wind to each active particle
      for (let i = 0; i < count; i++) {
        if (!this.active[i] || this.pinned[i]) continue;
        const i3 = i * 3;
      
        // Gravity — strong enough to drape
        this.accel[i3 + 1] += gravity;
      
        // Per-vertex position for noise sampling
        const px = this.pos[i3], py = this.pos[i3+1], pz = this.pos[i3+2];
        const tScale = turbScale * 0.04;
      
        // Multi-octave turbulence for organic motion
        const n1x = noise.noise3D(px * tScale, py * tScale, turbTime * 0.8);
        const n2x = noise.noise3D(px * tScale * 2.0 + 50, py * tScale * 2.0, turbTime * 1.3) * 0.5;
        const n1y = noise.noise3D(px * tScale + 100, py * tScale + 100, turbTime * 0.6);
        const n1z = noise.noise3D(px * tScale + 200, py * tScale + 200, turbTime * 0.9);
        const n2z = noise.noise3D(px * tScale * 2.0 + 250, py * tScale * 2.0 + 250, turbTime * 1.5) * 0.5;
      
        // Distance from anchor — particles further from anchor get more wind effect
        const col = i % cols;
        const row = Math.floor(i / cols);
        const distFactor = Math.max(col / this.segsX, row / this.segsY);
        const windMul = 0.5 + distFactor * 0.5;
      
        this.accel[i3]     += (windForce.x + (n1x + n2x) * turbIntensity) * windMul;
        this.accel[i3 + 1] += (windForce.y + n1y * turbIntensity * 0.4) * windMul;
        this.accel[i3 + 2] += (windForce.z + (n1z + n2z) * turbIntensity * 0.8) * windMul;

        if (this.softAnchorStrength > 0 && this.rest) {
          const pull = this.softAnchorStrength;
          this.accel[i3]     += (this.rest[i3]     - this.pos[i3])     * pull;
          this.accel[i3 + 1] += (this.rest[i3 + 1] - this.pos[i3 + 1]) * pull;
          this.accel[i3 + 2] += (this.rest[i3 + 2] - this.pos[i3 + 2]) * pull;
        }
      }
    
      // Verlet integration with velocity damping
      const dampFactor = Math.max(0.9, 1.0 - damping);
      for (let i = 0; i < count; i++) {
        if (!this.active[i] || this.pinned[i]) continue;
        const i3 = i * 3;
      
        const vx = (this.pos[i3]   - this.prev[i3])   * dampFactor;
        const vy = (this.pos[i3+1] - this.prev[i3+1]) * dampFactor;
        const vz = (this.pos[i3+2] - this.prev[i3+2]) * dampFactor;
      
        this.prev[i3]   = this.pos[i3];
        this.prev[i3+1] = this.pos[i3+1];
        this.prev[i3+2] = this.pos[i3+2];
      
        this.pos[i3]   += vx + this.accel[i3]   * dt * dt;
        this.pos[i3+1] += vy + this.accel[i3+1] * dt * dt;
        this.pos[i3+2] += vz + this.accel[i3+2] * dt * dt;
      }
    
      // Constraint solving — multiple iterations for stiffness
      const iterations = Math.max(3, Math.floor(stiffness * 0.15));
      for (let iter = 0; iter < iterations; iter++) {
        for (const spring of this.springs) {
          const { a, b, restLen, stiffMul } = spring;
          if (!this.active[a] || !this.active[b]) continue;
        
          const i3a = a * 3, i3b = b * 3;
          let dx = this.pos[i3a] - this.pos[i3b];
          let dy = this.pos[i3a+1] - this.pos[i3b+1];
          let dz = this.pos[i3a+2] - this.pos[i3b+2];
        
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (dist < 0.0001) continue;
        
          const diff = (dist - restLen) / dist;
          const stiffFactor = 0.5 * Math.min(stiffMul * (stiffness / 100), 1.0);
        
          dx *= diff * stiffFactor;
          dy *= diff * stiffFactor;
          dz *= diff * stiffFactor;
        
          if (!this.pinned[a]) {
            this.pos[i3a]   -= dx;
            this.pos[i3a+1] -= dy;
            this.pos[i3a+2] -= dz;
          }
          if (!this.pinned[b]) {
            this.pos[i3b]   += dx;
            this.pos[i3b+1] += dy;
            this.pos[i3b+2] += dz;
          }
        }
      
        // Self-collision (simple thickness-based)
        if (iter === 0) {
          this.selfCollision(0.04);
        }
      }
    }
  
    selfCollision(thickness) {
      const cols = this.segsX + 1;
      const thickSq = thickness * thickness;
      // Check every 3rd particle for performance
      for (let i = 0; i < this.count; i += 3) {
        if (!this.active[i] || this.pinned[i]) continue;
        const i3 = i * 3;
        for (let j = i + 6; j < this.count; j += 3) {
          if (!this.active[j] || this.pinned[j]) continue;
          // Skip adjacent vertices
          const di = Math.abs((i % cols) - (j % cols));
          const dj = Math.abs(Math.floor(i / cols) - Math.floor(j / cols));
          if (di <= 2 && dj <= 2) continue;
        
          const j3 = j * 3;
          const dx = this.pos[i3] - this.pos[j3];
          const dy = this.pos[i3+1] - this.pos[j3+1];
          const dz = this.pos[i3+2] - this.pos[j3+2];
          const distSq = dx*dx + dy*dy + dz*dz;
        
          if (distSq < thickSq && distSq > 0.00001) {
            const dist = Math.sqrt(distSq);
            const push = (thickness - dist) * 0.5 / dist;
            const px = dx * push, py = dy * push, pz = dz * push;
          
            if (!this.pinned[i]) {
              this.pos[i3]   += px;
              this.pos[i3+1] += py;
              this.pos[i3+2] += pz;
            }
            if (!this.pinned[j]) {
              this.pos[j3]   -= px;
              this.pos[j3+1] -= py;
              this.pos[j3+2] -= pz;
            }
          }
        }
      }
    }
  }

  // ============================================================
  // DESIGN ENGINE — 2D Canvas Texture Compositing
  // ============================================================

  const TEX_SIZE = 1024;
  const designCanvas = document.createElement('canvas');
  designCanvas.width = TEX_SIZE;
  designCanvas.height = TEX_SIZE;
  const dctx = designCanvas.getContext('2d');

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return { r, g, b };
  }

  function drawExternalTextureImage(ctx, img, canvasW, canvasH) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const rotation = Number(controls.get("textureRotation")) || 0;
    const normalized = ((rotation % 360) + 360) % 360;
    const fill = controls.get("textureFill") === true;

    ctx.save();
    ctx.translate(canvasW / 2, canvasH / 2);

    if (normalized === 90) {
      ctx.rotate(Math.PI / 2);
      if (fill) {
        ctx.drawImage(img, -canvasH / 2, -canvasW / 2, canvasH, canvasW);
      } else {
        const scale = Math.min(canvasW / ih, canvasH / iw);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      }
    } else if (normalized === 180) {
      ctx.rotate(Math.PI);
      if (fill) {
        ctx.drawImage(img, -canvasW / 2, -canvasH / 2, canvasW, canvasH);
      } else {
        const scale = Math.min(canvasW / iw, canvasH / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      }
    } else if (normalized === 270) {
      ctx.rotate(-Math.PI / 2);
      if (fill) {
        ctx.drawImage(img, -canvasH / 2, -canvasW / 2, canvasH, canvasW);
      } else {
        const scale = Math.min(canvasW / ih, canvasH / iw);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      }
    } else if (fill) {
      ctx.drawImage(img, -canvasW / 2, -canvasH / 2, canvasW, canvasH);
    } else {
      const scale = Math.min(canvasW / iw, canvasH / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    }

    ctx.restore();
  }

  function prepareExternalTextureCanvas(img) {
    const rotation = Number(controls.get("textureRotation")) || 0;
    const normalized = ((rotation % 360) + 360) % 360;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    let canvasW = iw;
    let canvasH = ih;

    if (normalized === 90 || normalized === 270) {
      canvasW = ih;
      canvasH = iw;
    }

    const maxDim = TEX_SIZE;
    const scale = maxDim / Math.max(canvasW, canvasH);
    canvasW = Math.max(1, Math.round(canvasW * scale));
    canvasH = Math.max(1, Math.round(canvasH * scale));
    designCanvas.width = canvasW;
    designCanvas.height = canvasH;
    return { width: canvasW, height: canvasH };
  }

  function renderDesignTexture() {
    const textureImg = controls.get('texture');

    // External texture only — skip Brik procedural fallback (blue + diamond flash)
    if (textureImg) {
      if (uploadedImage && uploadedImage.complete && uploadedImage.naturalWidth > 0) {
        const size = prepareExternalTextureCanvas(uploadedImage);
        dctx.clearRect(0, 0, size.width, size.height);
        drawExternalTextureImage(dctx, uploadedImage, size.width, size.height);
      } else {
        designCanvas.width = TEX_SIZE;
        designCanvas.height = TEX_SIZE;
        dctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
      }
      return designCanvas;
    }

    const w = TEX_SIZE, h = TEX_SIZE;
    designCanvas.width = w;
    designCanvas.height = h;

    const baseColor = controls.get('baseColor');
    const accentColor = controls.get('accentColor');
    const pattern = controls.get('designPattern');
    const pScale = controls.get('patternScale');
    const flagText = controls.get('flagText');
    const textSize = controls.get('textSize');
    const textColor = controls.get('textColor');
    const showSeams = controls.get('showSeams');
    const seamStyle = controls.get('seamStyle');
  
    // Base fill
    dctx.fillStyle = baseColor;
    dctx.fillRect(0, 0, w, h);
  
    // Pattern
    dctx.fillStyle = accentColor;
    const stripeCount = Math.max(2, pScale);
  
    switch (pattern) {
      case 'Horizontal Stripes': {
        const sh = h / stripeCount;
        for (let i = 1; i < stripeCount; i += 2) {
          dctx.fillRect(0, i * sh, w, sh);
        }
        break;
      }
      case 'Vertical Stripes': {
        const sw = w / stripeCount;
        for (let i = 1; i < stripeCount; i += 2) {
          dctx.fillRect(i * sw, 0, sw, h);
        }
        break;
      }
      case 'Diagonal': {
        dctx.save();
        dctx.translate(w/2, h/2);
        dctx.rotate(Math.PI / 4);
        const sw = w * 2 / stripeCount;
        for (let i = -stripeCount; i < stripeCount * 2; i += 2) {
          dctx.fillRect(-w, i * sw, w * 3, sw);
        }
        dctx.restore();
        break;
      }
      case 'Cross': {
        const thickness = w / (stripeCount * 2);
        dctx.fillRect(w/2 - thickness/2, 0, thickness, h);
        dctx.fillRect(0, h/2 - thickness/2, w, thickness);
        break;
      }
      case 'Chevron': {
        const chevH = h / stripeCount;
        for (let i = 0; i < stripeCount; i += 2) {
          dctx.beginPath();
          dctx.moveTo(0, i * chevH);
          dctx.lineTo(w/2, i * chevH + chevH * 0.5);
          dctx.lineTo(w, i * chevH);
          dctx.lineTo(w, i * chevH + chevH);
          dctx.lineTo(w/2, i * chevH + chevH * 1.5);
          dctx.lineTo(0, i * chevH + chevH);
          dctx.closePath();
          dctx.fill();
        }
        break;
      }
      case 'Circle Emblem': {
        const radius = Math.min(w, h) * 0.2 * (pScale / 10);
        dctx.beginPath();
        dctx.arc(w/2, h/2, radius, 0, Math.PI * 2);
        dctx.fill();
        // Inner ring
        dctx.strokeStyle = baseColor;
        dctx.lineWidth = radius * 0.15;
        dctx.beginPath();
        dctx.arc(w/2, h/2, radius * 0.6, 0, Math.PI * 2);
        dctx.stroke();
        break;
      }
      case 'Diamond': {
        const size = Math.min(w, h) * 0.3 * (pScale / 10);
        dctx.beginPath();
        dctx.moveTo(w/2, h/2 - size);
        dctx.lineTo(w/2 + size, h/2);
        dctx.lineTo(w/2, h/2 + size);
        dctx.lineTo(w/2 - size, h/2);
        dctx.closePath();
        dctx.fill();
        break;
      }
    }
  
    // Typography — Paragraph text engine with word wrapping, alignment, and leading
    if (flagText && flagText.trim()) {
      dctx.save();
      const fontSize = textSize * (TEX_SIZE / 512);
      const fontFamily = controls.get('fontFamily');
      const fontWeight = controls.get('fontWeight');
      const fontStr = customFontName ? `"${customFontName}"` : `"${fontFamily}", sans-serif`;
      dctx.font = `${fontWeight} ${fontSize}px ${fontStr}`;
      dctx.fillStyle = textColor;
      dctx.shadowColor = 'rgba(0,0,0,0.4)';
      dctx.shadowBlur = 6;
    
      // Detect RTL (Hebrew, Arabic, etc.)
      const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\uFB50-\uFDFF\uFE70-\uFEFF]/;
      const isRTL = rtlRegex.test(flagText);
      dctx.direction = isRTL ? 'rtl' : 'ltr';
      dctx.textBaseline = 'top';
    
      // Alignment — user control, with RTL-aware default
      const userAlign = controls.get('textAlign') || 'Center';
      let canvasAlign;
      if (userAlign === 'Left') canvasAlign = isRTL ? 'right' : 'left';
      else if (userAlign === 'Right') canvasAlign = isRTL ? 'left' : 'right';
      else canvasAlign = 'center';
      dctx.textAlign = canvasAlign;
    
      // Leading (line height) from control — percentage of font size
      const leadingPct = controls.get('leading') || 130;
      const lineHeight = fontSize * (leadingPct / 100);
    
      // Text box bounded by flag edges with padding
      const padding = w * 0.08;
      const boxLeft = padding;
      const boxRight = w - padding;
      const boxTop = padding;
      const boxBottom = h - padding;
      const boxWidth = boxRight - boxLeft;
      const boxCenterX = (boxLeft + boxRight) / 2;
    
      // Word-wrap the text into lines
      const lines = [];
      const paragraphs = flagText.split('\n');
    
      for (const para of paragraphs) {
        const words = para.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) {
          lines.push('');
          continue;
        }
      
        let currentLine = words[0];
        for (let i = 1; i < words.length; i++) {
          const testLine = currentLine + ' ' + words[i];
          const metrics = dctx.measureText(testLine);
          if (metrics.width > boxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);
      }
    
      // If a single word is wider than the box, break it character by character
      const finalLines = [];
      for (const line of lines) {
        if (dctx.measureText(line).width <= boxWidth) {
          finalLines.push(line);
        } else {
          let current = '';
          for (const char of line) {
            const test = current + char;
            if (dctx.measureText(test).width > boxWidth && current.length > 0) {
              finalLines.push(current);
              current = char;
            } else {
              current = test;
            }
          }
          if (current) finalLines.push(current);
        }
      }
    
      // Calculate total text block height and vertically center it
      const totalTextHeight = finalLines.length * lineHeight;
      const startY = Math.max(boxTop, boxTop + (boxBottom - boxTop - totalTextHeight) / 2);
    
      // Determine X anchor based on alignment
      let anchorX;
      if (canvasAlign === 'left') anchorX = boxLeft;
      else if (canvasAlign === 'right') anchorX = boxRight;
      else anchorX = boxCenterX;
    
      // Draw each line
      for (let i = 0; i < finalLines.length; i++) {
        const y = startY + i * lineHeight;
        if (y + lineHeight > boxBottom + lineHeight * 0.5) break; // clip overflow
        dctx.fillText(finalLines[i], anchorX, y);
      }
    
      dctx.restore();
    }
  
    // Seam/stitch overlay
    if (showSeams) {
      renderSeams(dctx, w, h, seamStyle, accentColor);
    }
  
    return designCanvas;
  }

  function renderSeams(ctx, w, h, style, color) {
    ctx.save();
    const rgb = hexToRgb(color);
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
    ctx.lineWidth = 2;
  
    const margin = 20;
    const dashLen = 8;
  
    switch (style) {
      case 'Straight Stitch':
        ctx.setLineDash([dashLen, dashLen * 0.6]);
        ctx.strokeRect(margin, margin, w - margin*2, h - margin*2);
        // Center seam
        ctx.beginPath();
        ctx.moveTo(w/2, margin);
        ctx.lineTo(w/2, h - margin);
        ctx.stroke();
        break;
      case 'Zigzag': {
        ctx.setLineDash([]);
        const amp = 5, freq = dashLen;
        // Top edge
        ctx.beginPath();
        for (let x = margin; x < w - margin; x += freq) {
          const y = margin + ((x / freq) % 2 === 0 ? -amp : amp);
          if (x === margin) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Bottom edge
        ctx.beginPath();
        for (let x = margin; x < w - margin; x += freq) {
          const y = h - margin + ((x / freq) % 2 === 0 ? -amp : amp);
          if (x === margin) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Left edge
        ctx.beginPath();
        for (let y = margin; y < h - margin; y += freq) {
          const x = margin + ((y / freq) % 2 === 0 ? -amp : amp);
          if (y === margin) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Right edge
        ctx.beginPath();
        for (let y = margin; y < h - margin; y += freq) {
          const x = w - margin + ((y / freq) % 2 === 0 ? -amp : amp);
          if (y === margin) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        break;
      }
      case 'Overlock': {
        ctx.setLineDash([2, 4]);
        ctx.lineWidth = 3;
        ctx.strokeRect(margin, margin, w - margin*2, h - margin*2);
        ctx.lineWidth = 1;
        ctx.setLineDash([1, 3]);
        ctx.strokeRect(margin + 4, margin + 4, w - (margin+4)*2, h - (margin+4)*2);
        break;
      }
      case 'Cross Stitch': {
        ctx.setLineDash([]);
        ctx.lineWidth = 1.5;
        const step = 12;
        // Border cross stitches
        for (let x = margin; x < w - margin; x += step) {
          // Top
          ctx.beginPath(); ctx.moveTo(x, margin - 3); ctx.lineTo(x + step*0.5, margin + 3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + step*0.5, margin - 3); ctx.lineTo(x, margin + 3); ctx.stroke();
          // Bottom
          ctx.beginPath(); ctx.moveTo(x, h - margin - 3); ctx.lineTo(x + step*0.5, h - margin + 3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + step*0.5, h - margin - 3); ctx.lineTo(x, h - margin + 3); ctx.stroke();
        }
        for (let y = margin; y < h - margin; y += step) {
          // Left
          ctx.beginPath(); ctx.moveTo(margin - 3, y); ctx.lineTo(margin + 3, y + step*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(margin + 3, y); ctx.lineTo(margin - 3, y + step*0.5); ctx.stroke();
          // Right
          ctx.beginPath(); ctx.moveTo(w - margin - 3, y); ctx.lineTo(w - margin + 3, y + step*0.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(w - margin + 3, y); ctx.lineTo(w - margin - 3, y + step*0.5); ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }

  // ============================================================
  // THREE.JS MESH + MATERIALS
  // ============================================================

  let cloth = null;
  let flagMesh = null;
  let flagGeo = null;
  let flagMat = null;
  let wireframeMesh = null;
  let canvasTexture = null;
  let uploadedImage = null;
  let graphicOutlineMesh = null;
  let sceneBackgroundTexture = null;

  // Orthographic camera for 2D mode
  const orthoCamera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 100);
  orthoCamera.position.set(0, 0, 10);
  orthoCamera.lookAt(0, 0, 0);

  function parseResolution(resStr) {
    if (resStr.startsWith('Low')) return { x: 20, y: 14 };
    if (resStr.startsWith('High')) return { x: 60, y: 42 };
    return { x: 40, y: 28 }; // Medium
  }

  function buildFlag() {
    // Clean up old mesh
    if (flagMesh) {
      scene.remove(flagMesh);
      flagGeo.dispose();
      flagMat.dispose();
    }
    if (wireframeMesh) {
      scene.remove(wireframeMesh);
      wireframeMesh.geometry.dispose();
      wireframeMesh.material.dispose();
      wireframeMesh = null;
    }
    if (graphicOutlineMesh) {
      scene.remove(graphicOutlineMesh);
      graphicOutlineMesh.geometry.dispose();
      graphicOutlineMesh.material.dispose();
      graphicOutlineMesh = null;
    }
    if (canvasTexture) canvasTexture.dispose();
  
    const res = parseResolution(controls.get('resolution'));
    const fw = controls.get('flagWidth');
    const fh = controls.get('flagHeight');
    const preset = controls.get('flagPreset') || 'banner';
    const anchor = controls.get('anchorPreset');
  
    // Create cloth simulation
    cloth = new ClothSim(res.x, res.y, fw, fh);
    cloth.applyShape(preset);
    cloth.setAnchors(anchor);
    if (anchor === "Soft Float") {
      cloth.softAnchorStrength = controls.get("softAnchorStrength") || 0.15;
    }
  
    // Build Three.js geometry
    const cols = res.x + 1;
    const rows = res.y + 1;
  
    flagGeo = new THREE.BufferGeometry();
  
    const positions = new Float32Array(cloth.count * 3);
    const uvs = new Float32Array(cloth.count * 2);
    const normals = new Float32Array(cloth.count * 3);
  
    // Copy initial positions and UVs
    positions.set(cloth.pos);
    uvs.set(cloth.uvs);
  
    // Build index buffer (triangles), skipping inactive vertices
    const indices = [];
    for (let j = 0; j < res.y; j++) {
      for (let i = 0; i < res.x; i++) {
        const a = j * cols + i;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
      
        if (cloth.active[a] && cloth.active[b] && cloth.active[c]) {
          indices.push(a, c, b);
        }
        if (cloth.active[b] && cloth.active[c] && cloth.active[d]) {
          indices.push(b, c, d);
        }
      }
    }
  
    flagGeo.setIndex(indices);
    flagGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    flagGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    flagGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  
    // Render design texture
    const texCanvas = renderDesignTexture();
    canvasTexture = new THREE.CanvasTexture(texCanvas);
    canvasTexture.flipY = false;
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    canvasTexture.wrapS = THREE.ClampToEdgeWrapping;
    canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
    canvasTexture.minFilter = THREE.LinearFilter;
    canvasTexture.magFilter = THREE.LinearFilter;
  
    // Material based on selection
    flagMat = createMaterial(canvasTexture);
  
    flagMesh = new THREE.Mesh(flagGeo, flagMat);
    const useShadows = controls.get("enableShadows") !== false && !controls.get("colorFidelity");
    flagMesh.castShadow = useShadows;
    flagMesh.receiveShadow = useShadows;
    const meshScale = controls.get("meshScale") || 1;
    if (meshScale !== 1) flagMesh.scale.set(meshScale, meshScale, meshScale);
    scene.add(flagMesh);
  
    // Wireframe overlay
    updateWireframe();
  
    // Compute initial normals
    flagGeo.computeVertexNormals();
  }

  function createMaterial(texture) {
    const matType = controls.get('material');
    const doubleSided = controls.get('doubleSided');
    const mode = controls.get('renderMode');
  
    const side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
  
    if (mode === 'Graphic') {
      return new THREE.MeshBasicMaterial({
        map: texture,
        side,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
    }
  
    if (mode === '2D' || controls.get('colorFidelity')) {
      return new THREE.MeshLambertMaterial({
        map: texture,
        side,
      });
    }
  
    // 3D mode — PBR-ish material
    let roughness = 0.8, metalness = 0.0, clearcoat = 0;
    switch (matType) {
      case 'Satin': roughness = 0.4; metalness = 0.05; break;
      case 'Glossy': roughness = 0.15; metalness = 0.1; clearcoat = 0.5; break;
      case 'Metallic': roughness = 0.3; metalness = 0.8; break;
      default: roughness = 0.85; metalness = 0.0; break;
    }
  
    return new THREE.MeshPhysicalMaterial({
      map: texture,
      side,
      roughness,
      metalness,
      clearcoat,
      clearcoatRoughness: 0.4,
    });
  }

  function updateWireframe() {
    if (wireframeMesh) {
      scene.remove(wireframeMesh);
      wireframeMesh.geometry.dispose();
      wireframeMesh.material.dispose();
      wireframeMesh = null;
    }
  
    if (controls.get('showWireframe') && flagGeo) {
      const wfGeo = new THREE.WireframeGeometry(flagGeo);
      const wfMat = new THREE.LineBasicMaterial({ color: 0x00ffaa, opacity: 0.4, transparent: true });
      wireframeMesh = new THREE.LineSegments(wfGeo, wfMat);
      scene.add(wireframeMesh);
    }
  }

  function updateGraphicOutline() {
    if (graphicOutlineMesh) {
      scene.remove(graphicOutlineMesh);
      graphicOutlineMesh.geometry.dispose();
      graphicOutlineMesh.material.dispose();
      graphicOutlineMesh = null;
    }
  
    if (controls.get('renderMode') === 'Graphic' && flagGeo) {
      const edgeGeo = new THREE.EdgesGeometry(flagGeo, 15);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 });
      graphicOutlineMesh = new THREE.LineSegments(edgeGeo, edgeMat);
      scene.add(graphicOutlineMesh);
    }
  }

  // ============================================================
  // TEXTURE IMAGE & FONT LOADING
  // ============================================================

  let customFontName = null;

  function revealCanvas() {
    if (destroyed || !renderer.domElement) return;
    renderer.domElement.style.opacity = "1";
    if (typeof options.onReady === "function") {
      options.onReady();
    }
    root.dispatchEvent(
      new CustomEvent("headscarf3d:ready", { bubbles: false })
    );
  }

  function loadTextureImage() {
    const src = controls.get('texture');
    if (!src) {
      uploadedImage = null;
      updateDesignTexture();
      revealCanvas();
    } else {
      const img = new Image();
      if (
        src &&
        src.indexOf("blob:") !== 0 &&
        src.indexOf("data:") !== 0
      ) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        if (destroyed) return;
        uploadedImage = img;
        updateDesignTexture();
        revealCanvas();
      };
      img.onerror = () => {
        if (destroyed) return;
        uploadedImage = null;
        updateDesignTexture();
        revealCanvas();
      };
      img.src = src;
      if (img.complete && img.naturalWidth > 0) {
        uploadedImage = img;
        updateDesignTexture();
        revealCanvas();
      }
    }
    updateSceneBackground();
  }

  function updateSceneBackground() {
    const mode = controls.get('bgMode');
    const color = controls.get('bgColor');
    const bgSrc = controls.get('bgImage');

    if (mode === 'Transparent') {
      scene.background = null;
    } else if (mode === 'Solid Color') {
      scene.background = new THREE.Color(color);
    } else if (mode === 'Image') {
      if (bgSrc) {
        // Only reload if the URL actually changed
        if (!sceneBackgroundTexture || sceneBackgroundTexture.userData.url !== bgSrc) {
          new THREE.TextureLoader().load(bgSrc, (tex) => {
            if (sceneBackgroundTexture) sceneBackgroundTexture.dispose();
            tex.userData.url = bgSrc;
            sceneBackgroundTexture = tex;
            if (controls.get('bgMode') === 'Image') {
              scene.background = tex;
            }
          });
        } else {
          scene.background = sceneBackgroundTexture;
        }
      } else {
        scene.background = new THREE.Color(color);
      }
    }
  }

  function updateDesignTexture() {
    if (!canvasTexture) return;
    renderDesignTexture();
    canvasTexture.needsUpdate = true;
  }

  // ============================================================
  // SIMULATION LOOP
  // ============================================================

  let simTime = 0;
  const FIXED_DT = 1 / 120;
  let accumulator = 0;
  const clock = new THREE.Clock();

  function updateLighting() {
    const angle = controls.get('lightAngle') * Math.PI / 180;
    const intensity = controls.get('lightIntensity') / 100;
    const ambientStr = controls.get('ambientIntensity') / 100;
  
    // Main light
    dirLight.position.set(Math.cos(angle) * 5, 4, Math.sin(angle) * 5);
    if (controls.get('colorFidelity')) {
      dirLight.intensity = intensity * 0.55;
      fillLight.position.set(Math.cos(angle + Math.PI) * 5, 2, Math.sin(angle + Math.PI) * 5);
      fillLight.intensity = intensity * 0.55;
      rimLight.intensity = intensity * 0.15;
      ambientLight.intensity = ambientStr * 1.15;
    } else {
      dirLight.intensity = intensity * 1.5;
      fillLight.position.set(Math.cos(angle + Math.PI) * 5, -2, Math.sin(angle + Math.PI) * 5);
      fillLight.intensity = intensity * 0.5;
      rimLight.intensity = intensity * 0.3;
      ambientLight.intensity = ambientStr;
    }
  
    // Rim light (top-back)
    rimLight.position.set(0, 5, -5);
  }

  function animate() {
    if (destroyed) return;
    rafId = requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);
    const playing = controls.get('playing');
    const mode = controls.get('renderMode');
  
    if (playing && cloth) {
      accumulator += delta;
      while (accumulator >= FIXED_DT) {
        const windLerp = controls.get('pointerWindMode') === 'flutter' ? 0.1 : 0.35;
        const wd = controls.get('windDirection');
        controls.set('windDirection', {
          x: wd.x + (targetWind.x - wd.x) * windLerp,
          y: wd.y + (targetWind.y - wd.y) * windLerp,
        });

        const windDir = controls.get('windDirection');
        const windStr = controls.get('windStrength');
        const flutterMode = controls.get('pointerWindMode') === 'flutter';
        let windForce;
        if (flutterMode) {
          const activity = Math.min(1, Math.abs(windDir.x) + Math.abs(windDir.y));
          windForce = new THREE.Vector3(
            windDir.x * windStr * 0.035,
            windDir.y * windStr * 0.025,
            activity * windStr * 0.28
          );
        } else {
          windForce = new THREE.Vector3(
            windDir.x * windStr * 0.5,
            windDir.y * windStr * 0.15,
            -Math.abs(windDir.x + windDir.y) * windStr * 0.3
          );
        }
      
        // Add gust variation over time
        const gustFreq = controls.get('gustFrequency') / 100;
        const gustMod = 1.0 + 0.5 * Math.sin(simTime * gustFreq * 5) * Math.sin(simTime * gustFreq * 3.1);
        windForce.multiplyScalar(gustMod);

        let turbIntensity = controls.get('turbulence') * 0.05;
        if (flutterMode) {
          const activity = Math.min(1, Math.abs(windDir.x) + Math.abs(windDir.y));
          turbIntensity += activity * (controls.get('pointerTurbulenceBoost') || 0.04);
        }
      
        cloth.step(
          FIXED_DT, 
          -0.98 * (controls.get('weight') / 5), 
          windForce, 
          controls.get('stiffness'), 
          controls.get('damping') / 500,
          simTime,
          turbIntensity,
          controls.get('turbulenceScale')
        );
      
        simTime += FIXED_DT;
        accumulator -= FIXED_DT;
      }
    
      // Update geometry
      flagGeo.attributes.position.array.set(cloth.pos);
      flagGeo.attributes.position.needsUpdate = true;
      flagGeo.computeVertexNormals();
    
      // Rebuild wireframe/outline from updated geometry (can't reuse old vertex arrays)
      if (wireframeMesh) {
        scene.remove(wireframeMesh);
        wireframeMesh.geometry.dispose();
        wireframeMesh.material.dispose();
        const wfGeo = new THREE.WireframeGeometry(flagGeo);
        const wfMat = new THREE.LineBasicMaterial({ color: 0x00ffaa, opacity: 0.4, transparent: true });
        wireframeMesh = new THREE.LineSegments(wfGeo, wfMat);
        scene.add(wireframeMesh);
      }
      if (graphicOutlineMesh) {
        scene.remove(graphicOutlineMesh);
        graphicOutlineMesh.geometry.dispose();
        graphicOutlineMesh.material.dispose();
        const edgeGeo = new THREE.EdgesGeometry(flagGeo, 15);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 });
        graphicOutlineMesh = new THREE.LineSegments(edgeGeo, edgeMat);
        scene.add(graphicOutlineMesh);
      }
    }
  
    // Camera mode
    const activeCamera = mode === '2D' ? orthoCamera : camera;
  
    if (mode === '2D') {
      // Update ortho camera to fit flag
      const fw = controls.get('flagWidth');
      const fh = controls.get('flagHeight');
      const aspect = area.clientWidth / area.clientHeight;
      const halfH = Math.max(fw, fh) * 0.7;
      orthoCamera.left = -halfH * aspect;
      orthoCamera.right = halfH * aspect;
      orthoCamera.top = halfH;
      orthoCamera.bottom = -halfH;
      orthoCamera.updateProjectionMatrix();
    } else {
    }
  
    updateLighting();
    renderer.render(scene, activeCamera);
  }


  const targetWind = { x: 0, y: 0 };

  function updateWindFromPointer(clientX, clientY) {
    const rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const influence = controls.get('pointerWindInfluence') || 1;
    targetWind.x = nx * influence;
    targetWind.y = ny * influence;
  }

  onPointerMove = function (event) {
    if (destroyed) return;
    updateWindFromPointer(event.clientX, event.clientY);
  };
  if (controls.get("enablePointerWind") !== false) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
  }

  onResize = function () {
    if (destroyed) return;
    const w = area.clientWidth;
    const h = area.clientHeight;
    if (w <= 0 || h <= 0) return;
    if (!sceneReady) {
      bootSceneIfReady();
      return;
    }
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyFitToWidth();
    renderer.setSize(w, h);
  };

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(root);
  }
  window.addEventListener("resize", onResize);
  onResize();
  if (!sceneReady) {
    var bootTries = 0;
    (function waitForBoot() {
      if (destroyed || sceneReady || bootTries++ > 40) return;
      onResize();
      if (!sceneReady) window.requestAnimationFrame(waitForBoot);
    })();
  }

  animate();

  return {
    play: function () {
      controls.set("playing", true);
    },
    pause: function () {
      controls.set("playing", false);
    },
    destroy: function () {
      if (destroyed) return;
      destroyed = true;
      controls.set("playing", false);
      if (rafId) cancelAnimationFrame(rafId);
      if (onPointerMove) window.removeEventListener("pointermove", onPointerMove);
      if (onResize) window.removeEventListener("resize", onResize);
      if (resizeObserver) resizeObserver.disconnect();

      if (flagMesh) {
        scene.remove(flagMesh);
        flagGeo.dispose();
        flagMat.dispose();
      }
      if (wireframeMesh) {
        scene.remove(wireframeMesh);
        wireframeMesh.geometry.dispose();
        wireframeMesh.material.dispose();
      }
      if (graphicOutlineMesh) {
        scene.remove(graphicOutlineMesh);
        graphicOutlineMesh.geometry.dispose();
        graphicOutlineMesh.material.dispose();
      }
      if (canvasTexture) canvasTexture.dispose();
      if (sceneBackgroundTexture) sceneBackgroundTexture.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === root) {
        root.removeChild(renderer.domElement);
      }
    },
  };
}
