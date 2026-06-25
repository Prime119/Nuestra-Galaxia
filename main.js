import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { buildAstros } from "./astros.js";
import { buildEffects } from "./effects.js";

/* ============================================================
   NUESTRA GALAXIA — base visual
   Galaxia espiral en movimiento, núcleo brillante,
   estrellas suavizadas y exploración con zoom/desplazamiento.
   ============================================================ */

const canvas = document.getElementById("galaxy-canvas");

// --- Escena, cámara, render -------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color("#03030a");
scene.fog = new THREE.FogExp2("#03030a", 0.012);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 9, 14);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;

// --- Controles de exploración (zoom + desplazamiento) -----------------------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.6;
controls.minDistance = 3;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI * 0.92; // evita cruzar por debajo del todo
controls.autoRotate = false;
controls.target.set(0, 0, 0);

// --- Textura suave y redonda para cada estrella -----------------------------
function makeStarTexture() {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.85)");
  g.addColorStop(0.5, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const starTexture = makeStarTexture();

// --- Generación de la galaxia espiral ---------------------------------------
const galaxyGroup = new THREE.Group();
scene.add(galaxyGroup);

const params = {
  count: 96000,
  radius: 11,
  branches: 4,
  spin: 1.15,
  randomness: 0.32,
  randomnessPower: 2.6,
  insideColor: "#ffd9a0", // núcleo cálido
  midColor: "#c77bd8", // brazos púrpura
  outsideColor: "#3a7bff", // bordes azules
  height: 0.55, // grosor del disco
};

function buildGalaxy() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(params.count * 3);
  const colors = new Float32Array(params.count * 3);
  const scales = new Float32Array(params.count);

  const cInside = new THREE.Color(params.insideColor);
  const cMid = new THREE.Color(params.midColor);
  const cOutside = new THREE.Color(params.outsideColor);

  for (let i = 0; i < params.count; i++) {
    const i3 = i * 3;
    const radius = Math.pow(Math.random(), 1.4) * params.radius;
    const branchAngle = ((i % params.branches) / params.branches) * Math.PI * 2;
    const spinAngle = radius * params.spin;

    const rand = () =>
      Math.pow(Math.random(), params.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      params.randomness *
      radius;

    const rx = rand();
    const ry = rand() * params.height;
    const rz = rand();

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius + rx;
    positions[i3 + 1] = ry;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + rz;

    // Color: del cálido (centro) al púrpura y luego azul (borde)
    const mixed = new THREE.Color();
    const t = radius / params.radius;
    if (t < 0.5) {
      mixed.copy(cInside).lerp(cMid, t / 0.5);
    } else {
      mixed.copy(cMid).lerp(cOutside, (t - 0.5) / 0.5);
    }
    // Suavizamos el brillo hacia afuera y bajamos más por densidad
    const dim = (0.5 + 0.4 * (1 - t)) * 0.68;
    colors[i3] = mixed.r * dim;
    colors[i3 + 1] = mixed.g * dim;
    colors[i3 + 2] = mixed.b * dim;

    scales[i] = (0.6 + Math.random() * 0.8) * (1 - t * 0.4);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

  const material = new THREE.PointsMaterial({
    size: 0.085,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    map: starTexture,
    transparent: true,
    opacity: 0.9,
  });

  const points = new THREE.Points(geometry, material);
  galaxyGroup.add(points);
}
buildGalaxy();

// --- Nubes estelares (nebulosas) -------------------------------------------
function makeCloudTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.4, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const cloudTex = makeCloudTexture();

function buildNebulae() {
  const cols = ["#7a3aa0", "#3a5ab0", "#2a8a9a", "#a03a7a", "#5a3a9a"];
  for (let i = 0; i < 24; i++) {
    const radius = 2.5 + Math.random() * 8;
    const branch = (Math.floor(Math.random() * params.branches) / params.branches) * Math.PI * 2;
    const ang = branch + radius * params.spin + (Math.random() - 0.5) * 0.6;
    const x = Math.cos(ang) * radius + (Math.random() - 0.5) * 1.2;
    const z = Math.sin(ang) * radius + (Math.random() - 0.5) * 1.2;
    const y = (Math.random() - 0.5) * 0.5;
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: cloudTex,
        color: new THREE.Color(cols[i % cols.length]),
        transparent: true,
        opacity: 0.09 + Math.random() * 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const sc = 2.5 + Math.random() * 4;
    s.scale.set(sc, sc * 0.7, 1);
    s.position.set(x, y, z);
    galaxyGroup.add(s);
  }
}
buildNebulae();

// --- Núcleo brillante central -----------------------------------------------
function makeCoreGlow() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,250,235,0.3)");
  g.addColorStop(0.2, "rgba(255,225,170,0.22)");
  g.addColorStop(0.45, "rgba(255,170,200,0.1)");
  g.addColorStop(0.75, "rgba(160,90,200,0.03)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
  );
  sprite.scale.set(4.5, 4.5, 1);
  return sprite;
}
const coreGlow = makeCoreGlow();
galaxyGroup.add(coreGlow);

// --- Fondo de estrellas lejanas (atenuadas) ---------------------------------
function buildBackgroundStars() {
  const count = 1800;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    // Distribución en una esfera grande alrededor de la galaxia
    const r = 40 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    positions[i3 + 2] = r * Math.cos(phi);

    // Estrellas tenues: brillo bajo para no deslumbrar
    const b = 0.35 + Math.random() * 0.35;
    const tint = Math.random();
    colors[i3] = b * (0.85 + tint * 0.15);
    colors[i3 + 1] = b * 0.9;
    colors[i3 + 2] = b * (0.95 + (1 - tint) * 0.05);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.28,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    map: starTexture,
    transparent: true,
    opacity: 0.7,
  });

  scene.add(new THREE.Points(geometry, material));
}
buildBackgroundStars();

// --- Luces (para que los planetas tengan volumen) ---------------------------
scene.add(new THREE.AmbientLight(0x556088, 0.7));
const sunLight = new THREE.PointLight(0xfff0d8, 1.2, 0, 0.9);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);
const keyLight = new THREE.DirectionalLight(0xbcd0ff, 0.6);
keyLight.position.set(6, 10, 8);
scene.add(keyLight);

// --- Astros clickeables -----------------------------------------------------
const astros = buildAstros(scene);

// --- Efectos: cometas, asteroides errantes y meteoros -----------------------
const effects = buildEffects(scene);

// --- Toque en el CENTRO de la galaxia (corazón rosa) ------------------------
const coreHit = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 16, 16),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
);
coreHit.userData.isCore = true;
scene.add(coreHit);

// --- Interacción: raycaster + detección de toque/click ----------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let downX = 0,
  downY = 0,
  downT = 0;

canvas.addEventListener("pointerdown", (e) => {
  downX = e.clientX;
  downY = e.clientY;
  downT = performance.now();
});

canvas.addEventListener("pointerup", (e) => {
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
  const elapsed = performance.now() - downT;
  if (moved < 9 && elapsed < 600) handleTap(e.clientX, e.clientY);
});

function handleTap(cx, cy) {
  pointer.x = (cx / window.innerWidth) * 2 - 1;
  pointer.y = -(cy / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const targets = [coreHit, ...astros.clickables, ...effects.clickables];
  const hits = raycaster.intersectObjects(targets, false);
  if (!hits.length) return;
  const obj = hits[0].object;
  if (obj.userData.isCore) {
    spawnHeart();
  } else if (obj.userData.astro) {
    openModal(obj.userData.astro);
  }
}

// --- Ventana de contenido ---------------------------------------------------
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
document.getElementById("modal-close").addEventListener("click", closeModal);
modal.querySelector(".modal-backdrop").addEventListener("click", closeModal);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

// Convierte enlaces de Google Drive a formato directo/incrustable
function driveId(url) {
  const m = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  return m ? m[1] : null;
}
function imageUrl(url) {
  const id = url.includes("drive.google") ? driveId(url) : null;
  return id ? `https://drive.google.com/uc?export=view&id=${id}` : url;
}
function videoEmbed(url) {
  // YouTube
  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  if (yt) {
    return `<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${yt[1]}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  // Google Drive
  if (url.includes("drive.google")) {
    const id = driveId(url);
    if (id) return `<div class="video-wrap"><iframe src="https://drive.google.com/file/d/${id}/preview" allowfullscreen></iframe></div>`;
  }
  // Archivo de video directo
  return `<video controls playsinline src="${url}"></video>`;
}

function openModal(astro) {
  const c = astro.contenido || {};
  modalTitle.textContent = astro.titulo || "";
  let html = "";
  if (c.tipo === "poema") {
    html = `<div class="poema">${escapeHtml(c.texto || "")}</div>`;
  } else if (c.tipo === "imagen") {
    html = c.url
      ? `<img src="${imageUrl(c.url)}" alt="${escapeHtml(astro.titulo || "")}">`
      : `<div class="empty">Aún no has puesto una imagen aquí.</div>`;
  } else if (c.tipo === "video") {
    html = c.url ? videoEmbed(c.url) : `<div class="empty">Aún no has puesto un video aquí.</div>`;
  }
  modalBody.innerHTML = html;
  modal.classList.add("open");
}

function closeModal() {
  modal.classList.remove("open");
  modalBody.innerHTML = "";
}

// --- Corazón de estrellas rosa (al tocar el centro) -------------------------
// Las estrellas salen del centro y forman un corazón; se mantiene ~1s y luego
// se desvanece con una explosión tipo supernova (NO afecta a la galaxia).
const hearts = [];
const HEART = { form: 3.2, hold: 2.0, boom: 2.6, y: 6.0, scale: 0.16 };

function easeOut(x) {
  return 1 - Math.pow(1 - x, 3);
}

function spawnHeart() {
  const n = 750;
  const cur = new Float32Array(n * 3);
  const start = new Float32Array(n * 3);
  const target = new Float32Array(n * 3);
  const dir = new Float32Array(n * 3);
  const delay = new Float32Array(n);
  const colors = new Float32Array(n * 3);
  const pinkA = new THREE.Color("#ff9ec4");
  const pinkB = new THREE.Color("#ff3d86");
  const tmp = new THREE.Color();

  // Corazón SIEMPRE vertical (eje Y del mundo), mirando de frente a la cámara
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up, forward);
  if (right.lengthSq() < 1e-4) right.set(1, 0, 0);
  right.normalize();
  const normal = new THREE.Vector3().crossVectors(right, up).normalize();
  const center = new THREE.Vector3(0, HEART.y, 0);
  const v = new THREE.Vector3();

  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    const t = Math.random() * Math.PI * 2;
    const fill = Math.sqrt(Math.random());
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const lx = hx * fill * HEART.scale;
    const ly = hy * fill * HEART.scale;
    // grosor 3D: abombado en el centro, fino en los bordes
    const depth = HEART.scale * 4.5 * (1 - fill) * (Math.random() * 2 - 1);
    v.copy(center).addScaledVector(right, lx).addScaledVector(up, ly).addScaledVector(normal, depth);
    target[i3] = v.x;
    target[i3 + 1] = v.y;
    target[i3 + 2] = v.z;

    // empiezan en el CENTRO de la galaxia y suben formando el corazón
    start[i3] = (Math.random() - 0.5) * 0.5;
    start[i3 + 1] = (Math.random() - 0.5) * 0.5;
    start[i3 + 2] = (Math.random() - 0.5) * 0.5;
    cur[i3] = start[i3];
    cur[i3 + 1] = start[i3 + 1];
    cur[i3 + 2] = start[i3 + 2];

    // dirección de la explosión: esfera 3D (eyección de supernova)
    let ex = Math.random() * 2 - 1, ey = Math.random() * 2 - 1, ez = Math.random() * 2 - 1;
    const elen = Math.hypot(ex, ey, ez) || 1;
    dir[i3] = ex / elen;
    dir[i3 + 1] = ey / elen;
    dir[i3 + 2] = ez / elen;

    delay[i] = Math.random() * 1.0;

    tmp.copy(pinkA).lerp(pinkB, Math.random());
    colors[i3] = tmp.r;
    colors[i3 + 1] = tmp.g;
    colors[i3 + 2] = tmp.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(cur, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.18,
    sizeAttenuation: true,
    vertexColors: true,
    map: starTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 1,
  });
  const obj = new THREE.Points(geo, mat);
  scene.add(obj);
  hearts.push({ obj, born: elapsedTime, start, target, dir, delay, n, boomed: false, center });
}

// --- Supernova realista (al terminar el corazón) ----------------------------
const supernovas = [];
function makeNovaRingTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.55, "rgba(0,0,0,0)");
  g.addColorStop(0.72, "rgba(180,210,255,0.5)");
  g.addColorStop(0.85, "rgba(255,255,255,0.95)");
  g.addColorStop(0.95, "rgba(255,190,120,0.4)");
  g.addColorStop(1, "rgba(255,140,80,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const novaRingTex = makeNovaRingTexture();

function spawnSupernova(center) {
  const flash = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: starTexture,
      color: new THREE.Color("#eaf2ff"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 1,
    })
  );
  flash.position.copy(center);
  flash.scale.set(0.4, 0.4, 1);
  scene.add(flash);

  const ring = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: novaRingTex,
      color: new THREE.Color("#dfeaff"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 1,
    })
  );
  ring.position.copy(center);
  ring.scale.set(0.5, 0.5, 1);
  scene.add(ring);

  supernovas.push({ flash, ring, born: elapsedTime });
}

function recolorSupernova(h) {
  const col = h.obj.geometry.attributes.color.array;
  const white = new THREE.Color("#eaf2ff");
  const blue = new THREE.Color("#9fc4ff");
  const orange = new THREE.Color("#ff8a3c");
  const tmp = new THREE.Color();
  for (let j = 0; j < h.n; j++) {
    const r = Math.random();
    if (r < 0.55) tmp.copy(white).lerp(blue, Math.random());
    else if (r < 0.8) tmp.copy(white);
    else tmp.copy(orange);
    const j3 = j * 3;
    col[j3] = tmp.r;
    col[j3 + 1] = tmp.g;
    col[j3 + 2] = tmp.b;
  }
  h.obj.geometry.attributes.color.needsUpdate = true;
}

function updateSupernovas(elapsed) {
  for (let i = supernovas.length - 1; i >= 0; i--) {
    const s = supernovas[i];
    const age = elapsed - s.born;
    // destello central: crece muy rápido y se apaga
    const fs = 0.4 + easeOut(Math.min(1, age / 0.25)) * 7;
    s.flash.scale.set(fs, fs, 1);
    s.flash.material.opacity = Math.max(0, 1 - age / 1.6);
    // onda expansiva (shockwave)
    const rs = easeOut(Math.min(1, age / 2.6)) * 22;
    s.ring.scale.set(rs, rs, 1);
    s.ring.material.opacity = Math.max(0, 0.9 * (1 - age / 2.6));
    if (age > 2.7) {
      scene.remove(s.flash);
      scene.remove(s.ring);
      s.flash.material.dispose();
      s.ring.material.dispose();
      supernovas.splice(i, 1);
    }
  }
}

function updateHearts(elapsed) {
  const boomStart = HEART.form + HEART.hold;
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    const age = elapsed - h.born;
    const pos = h.obj.geometry.attributes.position.array;

    if (age < boomStart) {
      // formación: suben del centro y forman el corazón arriba; luego se mantiene
      for (let j = 0; j < h.n; j++) {
        const j3 = j * 3;
        const f = easeOut(Math.min(1, Math.max(0, (age - h.delay[j]) / (HEART.form * 0.75))));
        pos[j3] = h.start[j3] + (h.target[j3] - h.start[j3]) * f;
        pos[j3 + 1] = h.start[j3 + 1] + (h.target[j3 + 1] - h.start[j3 + 1]) * f;
        pos[j3 + 2] = h.start[j3 + 2] + (h.target[j3 + 2] - h.start[j3 + 2]) * f;
      }
      h.obj.material.opacity = 1;
    } else {
      // EXPLOTA en una supernova realista (eyección 3D + destello + onda)
      if (!h.boomed) {
        h.boomed = true;
        spawnSupernova(h.center);
        recolorSupernova(h);
      }
      const k = (age - boomStart) / HEART.boom;
      const push = easeOut(Math.min(1, k)) * 16;
      for (let j = 0; j < h.n; j++) {
        const j3 = j * 3;
        pos[j3] = h.target[j3] + h.dir[j3] * push;
        pos[j3 + 1] = h.target[j3 + 1] + h.dir[j3 + 1] * push;
        pos[j3 + 2] = h.target[j3 + 2] + h.dir[j3 + 2] * push;
      }
      h.obj.material.opacity = Math.max(0, 1 - k);
    }
    h.obj.geometry.attributes.position.needsUpdate = true;

    if (age > boomStart + HEART.boom) {
      scene.remove(h.obj);
      h.obj.geometry.dispose();
      h.obj.material.dispose();
      hearts.splice(i, 1);
    }
  }
}


// --- Post-procesado: bloom suave (sin quemar la imagen) ---------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.55, // strength (intensidad) — más contenida
  0.7, // radius
  0.3 // threshold (umbral alto = solo lo muy brillante brilla)
);
composer.addPass(bloom);

// --- Animación --------------------------------------------------------------
const clock = new THREE.Clock();
let elapsedTime = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  elapsedTime += delta;
  const elapsed = elapsedTime;

  // La galaxia gira lentamente (otro 20% más lento)
  galaxyGroup.rotation.y = elapsed * 0.0176256;

  // Latido suave del núcleo (más tenue)
  const pulse = 4.5 + Math.sin(elapsed * 1.2) * 0.18;
  coreGlow.scale.set(pulse, pulse, 1);

  // Astros y corazones
  astros.update(elapsed, delta);
  effects.update(elapsed, delta);
  updateHearts(elapsed);
  updateSupernovas(elapsed);

  controls.update();
  composer.render();
}
animate();

// --- Responsive -------------------------------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- Ocultar loader y mostrar pista -----------------------------------------
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("loader").classList.add("hidden");
    const hint = document.getElementById("hint");
    hint.classList.add("show");
    setTimeout(() => hint.classList.add("fade"), 6000);
  }, 600);
});
