import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

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

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // La galaxia gira lentamente, como una de verdad
  galaxyGroup.rotation.y = elapsed * 0.045;

  // Latido suave del núcleo
  const pulse = 7 + Math.sin(elapsed * 1.2) * 0.25;
  coreGlow.scale.set(pulse, pulse, 1);

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
