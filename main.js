import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/* ============================================================
   NUESTRA GALAXIA — base visual
   Espiral de varios brazos (forma de la 1ª versión) con la
   paleta realista (crema, azules, rosas, blancos) y brillo
   contenido. En movimiento y explorable con zoom.
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
renderer.toneMappingExposure = 0.82; // brillo contenido

// --- Controles de exploración (zoom + desplazamiento) -----------------------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.6;
controls.minDistance = 3;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI * 0.92;
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

// --- Generación de la galaxia espiral (estilo 1ª versión) -------------------
const galaxyGroup = new THREE.Group();
scene.add(galaxyGroup);

const params = {
  count: 36000,
  radius: 11,
  branches: 4,
  spin: 1.15,
  randomness: 0.32,
  randomnessPower: 2.6,
  height: 0.5,
};

function buildGalaxy() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(params.count * 3);
  const colors = new Float32Array(params.count * 3);

  // Paleta realista (NGC 1300): crema en el centro, azules en los
  // brazos, regiones rosas/rojas y destellos blancos.
  const colCreamCenter = new THREE.Color("#fff2dc");
  const colCreamEdge = new THREE.Color("#ffdca0");
  const colDust = new THREE.Color("#9c6a3f");
  const colBlueDeep = new THREE.Color("#274f9e");
  const colBlue = new THREE.Color("#5f9bf0");
  const colBlueLight = new THREE.Color("#cfe2ff");
  const colPink = new THREE.Color("#ff5d86");
  const colRed = new THREE.Color("#ff3a52");
  const colWhite = new THREE.Color("#ffffff");
  const tmp = new THREE.Color();

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

    // --- Color realista + brillo contenido ---
    const t = radius / params.radius;
    const roll = Math.random();
    let bright;

    if (t < 0.22) {
      // Centro cremoso
      tmp.copy(colCreamCenter).lerp(colCreamEdge, t / 0.22);
      if (Math.random() < 0.04) tmp.copy(colDust); // vetas de polvo cálido
      bright = 0.55 * (1 - 0.25 * (t / 0.22));
    } else {
      const k = (t - 0.22) / 0.78;
      if (roll < 0.05) {
        // destello blanco / cúmulo
        tmp.copy(colWhite).lerp(colBlueLight, Math.random() * 0.5);
        bright = 0.75;
      } else if (roll < 0.1) {
        // región HII rosa/roja
        tmp.copy(colPink).lerp(colRed, Math.random());
        bright = 0.6;
      } else {
        // azul general: profundo dentro, claro fuera
        tmp.copy(colBlueDeep).lerp(colBlue, k).lerp(colBlueLight, k * 0.4);
        bright = 0.4 + 0.18 * k;
      }
    }

    colors[i3] = tmp.r * bright;
    colors[i3 + 1] = tmp.g * bright;
    colors[i3 + 2] = tmp.b * bright;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.15,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    map: starTexture,
    transparent: true,
    opacity: 0.9,
  });

  galaxyGroup.add(new THREE.Points(geometry, material));
}
buildGalaxy();

// --- Núcleo: resplandor cremoso suave ---------------------------------------
function makeCoreGlow() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,248,230,0.45)");
  g.addColorStop(0.3, "rgba(255,234,195,0.22)");
  g.addColorStop(0.6, "rgba(255,215,150,0.07)");
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
  sprite.scale.set(3.8, 3.8, 1);
  return sprite;
}
const coreGlow = makeCoreGlow();
galaxyGroup.add(coreGlow);

// --- Fondo de estrellas y galaxias lejanas (colores variados, tenues) -------
function buildBackgroundStars() {
  const count = 2400;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const palette = [
    new THREE.Color("#ffffff"),
    new THREE.Color("#cfe0ff"),
    new THREE.Color("#ffd9a0"),
    new THREE.Color("#ff8a5c"),
    new THREE.Color("#ff5a4a"),
    new THREE.Color("#8fd0ff"),
  ];
  const tmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = 38 + Math.random() * 62;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    positions[i3 + 2] = r * Math.cos(phi);

    if (Math.random() < 0.16) {
      tmp.copy(palette[2 + Math.floor(Math.random() * 4)]);
    } else {
      tmp.copy(palette[Math.floor(Math.random() * 2)]);
    }
    const b = 0.28 + Math.random() * 0.35;
    colors[i3] = tmp.r * b;
    colors[i3 + 1] = tmp.g * b;
    colors[i3 + 2] = tmp.b * b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.26,
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

// --- Post-procesado: bloom contenido ----------------------------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.35, // strength (intensidad) — baja
  0.65, // radius
  0.45 // threshold alto = solo lo muy brillante brilla
);
composer.addPass(bloom);

// --- Animación --------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // La galaxia gira lentamente, como una de verdad
  galaxyGroup.rotation.y = elapsed * 0.04455;

  // Latido muy suave del núcleo
  const pulse = 3.8 + Math.sin(elapsed * 1.2) * 0.14;
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
