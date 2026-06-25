import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { buildAstros } from "./astros.js";

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
renderer.toneMappingExposure = 1.0;

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
  count: 32000,
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
    // Suavizamos el brillo hacia afuera para no deslumbrar
    const dim = 0.55 + 0.45 * (1 - t);
    colors[i3] = mixed.r * dim;
    colors[i3 + 1] = mixed.g * dim;
    colors[i3 + 2] = mixed.b * dim;

    scales[i] = (0.6 + Math.random() * 0.8) * (1 - t * 0.4);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

  const material = new THREE.PointsMaterial({
    size: 0.16,
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

// --- Núcleo brillante central -----------------------------------------------
function makeCoreGlow() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,250,235,1)");
  g.addColorStop(0.2, "rgba(255,225,170,0.9)");
  g.addColorStop(0.45, "rgba(255,170,200,0.5)");
  g.addColorStop(0.75, "rgba(160,90,200,0.18)");
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
  sprite.scale.set(7, 7, 1);
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
const clickTargets = [coreHit, ...astros.clickables];

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
  const hits = raycaster.intersectObjects(clickTargets, false);
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
const hearts = [];
function makeHeartPoints() {
  const n = 600;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const pinkA = new THREE.Color("#ff9ec4");
  const pinkB = new THREE.Color("#ff4d94");
  const tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const t = Math.random() * Math.PI * 2;
    const fill = Math.sqrt(Math.random());
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const i3 = i * 3;
    positions[i3] = x * fill * 0.09 + (Math.random() - 0.5) * 0.05;
    positions[i3 + 1] = y * fill * 0.09 + (Math.random() - 0.5) * 0.05;
    positions[i3 + 2] = (Math.random() - 0.5) * 0.1;
    tmp.copy(pinkA).lerp(pinkB, Math.random());
    colors[i3] = tmp.r;
    colors[i3 + 1] = tmp.g;
    colors[i3 + 2] = tmp.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.22,
    sizeAttenuation: true,
    vertexColors: true,
    map: starTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 1,
  });
  return new THREE.Points(geo, mat);
}

function spawnHeart() {
  const h = makeHeartPoints();
  h.position.set(0, 0, 0);
  scene.add(h);
  hearts.push({ obj: h, born: elapsedTime });
}

function updateHearts(elapsed) {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const hrt = hearts[i];
    const age = elapsed - hrt.born;
    // siempre mirando a la cámara
    hrt.obj.quaternion.copy(camera.quaternion);
    // aparece (0-1s), sube y se desvanece (3-6s)
    const grow = Math.min(1, age / 0.9);
    const s = 1.1 + (1 - Math.pow(1 - grow, 3)) * 1.6;
    hrt.obj.scale.setScalar(s);
    hrt.obj.position.y = age * 0.25;
    let op = 1;
    if (age > 3) op = Math.max(0, 1 - (age - 3) / 3);
    hrt.obj.material.opacity = op;
    if (age > 6.2) {
      scene.remove(hrt.obj);
      hrt.obj.geometry.dispose();
      hrt.obj.material.dispose();
      hearts.splice(i, 1);
    }
  }
}


// --- Post-procesado: bloom suave (sin quemar la imagen) ---------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.85, // strength (intensidad)
  0.7, // radius
  0.2 // threshold (umbral alto = solo lo muy brillante brilla)
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

  // La galaxia gira lentamente (20% más lento que antes)
  galaxyGroup.rotation.y = elapsed * 0.02754;

  // Latido suave del núcleo
  const pulse = 7 + Math.sin(elapsed * 1.2) * 0.25;
  coreGlow.scale.set(pulse, pulse, 1);

  // Astros y corazones
  astros.update(elapsed, delta);
  updateHearts(elapsed);

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
