import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/* ============================================================
   NUESTRA GALAXIA — base visual
   Galaxia espiral BARRADA (estilo NGC 1300):
   barra cremosa central, dos brazos azules con cúmulos
   brillantes y regiones rosas, en movimiento y explorable.
   ============================================================ */

const canvas = document.getElementById("galaxy-canvas");

// --- Escena, cámara, render -------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color("#03030a");
scene.fog = new THREE.FogExp2("#03030a", 0.01);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 12, 11);

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

// --- Generación de la galaxia barrada ---------------------------------------
const galaxyGroup = new THREE.Group();
scene.add(galaxyGroup);

const params = {
  radius: 11,
  bar: { count: 11000, length: 3.1, width: 0.95, thickness: 0.3 },
  arms: { count: 21000, number: 2, wind: 2.7, width: 0.75, thickness: 0.22 },
  disk: { count: 6000, thickness: 0.18 },
};

// Aproximación a una distribución gaussiana en el rango [-1, 1] aprox.
function gauss() {
  return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
}

function buildGalaxy() {
  const total = params.bar.count + params.arms.count + params.disk.count;
  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  const scales = new Float32Array(total);

  // Paleta inspirada en NGC 1300
  const colCreamCenter = new THREE.Color("#fff6e6"); // bulbo blanco-crema
  const colCreamEdge = new THREE.Color("#ffe2ad"); // barra dorada suave
  const colDust = new THREE.Color("#b07a4a"); // polvo cálido en la barra
  const colBlueDeep = new THREE.Color("#2f6dd6"); // azul de los brazos
  const colBlue = new THREE.Color("#6fb0ff"); // azul brillante
  const colBlueLight = new THREE.Color("#d3e6ff"); // azul muy claro
  const colPink = new THREE.Color("#ff5d86"); // región HII rosa
  const colRed = new THREE.Color("#ff3a52"); // región HII roja
  const colWhite = new THREE.Color("#ffffff");
  const colDiskFaint = new THREE.Color("#3b4d7a"); // disco difuso tenue
  const tmp = new THREE.Color();

  let p = 0;
  const set = (x, y, z, col, bright, scale) => {
    const i3 = p * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    colors[i3] = col.r * bright;
    colors[i3 + 1] = col.g * bright;
    colors[i3 + 2] = col.b * bright;
    scales[p] = scale;
    p++;
  };

  // 1) BARRA + BULBO (cremoso, elongado en X)
  for (let i = 0; i < params.bar.count; i++) {
    const x = gauss() * params.bar.length;
    const z = gauss() * params.bar.width;
    const y = gauss() * params.bar.thickness;
    const d = Math.min(
      1,
      Math.sqrt((x / params.bar.length) ** 2 + (z / params.bar.width) ** 2)
    );
    tmp.copy(colCreamCenter).lerp(colCreamEdge, d);
    if (Math.random() < 0.05) tmp.copy(colDust); // vetas de polvo cálido
    const bright = 0.9 * (1 - 0.4 * d);
    const scale = (0.7 + Math.random() * 0.6) * (1 - 0.2 * d);
    set(x, y, z, tmp, bright, scale);
  }

  // 2) BRAZOS ESPIRALES (azules, con cúmulos y regiones rosas)
  const r0 = params.bar.length * 0.95;
  const b = Math.log(params.radius / r0) / params.arms.wind;
  for (let i = 0; i < params.arms.count; i++) {
    const arm = i % params.arms.number;
    const startAngle = (arm / params.arms.number) * Math.PI * 2; // 0 y PI -> extremos de la barra
    const tt = Math.pow(Math.random(), 0.7);
    const theta = tt * params.arms.wind;
    const r = r0 * Math.exp(b * theta);
    const angle = startAngle + theta;
    const w = params.arms.width * (0.5 + r / params.radius);
    const x = Math.cos(angle) * r + gauss() * w;
    const z = Math.sin(angle) * r + gauss() * w;
    const y = gauss() * params.arms.thickness;
    const tr = r / params.radius;

    const roll = Math.random();
    let bright, scale;
    if (roll < 0.1) {
      // cúmulo azul brillante
      tmp.copy(colWhite).lerp(colBlueLight, Math.random() * 0.7);
      bright = 1.0;
      scale = 1.3 + Math.random() * 1.1;
    } else if (roll < 0.17) {
      // región HII rosa/roja (nacimiento de estrellas)
      tmp.copy(colPink).lerp(colRed, Math.random());
      bright = 0.95;
      scale = 0.9 + Math.random() * 1.0;
    } else if (roll < 0.21) {
      // destello blanco
      tmp.copy(colWhite);
      bright = 0.9;
      scale = 0.8 + Math.random() * 0.6;
    } else {
      // azul general (más profundo dentro, más claro fuera)
      tmp.copy(colBlueDeep).lerp(colBlue, tr).lerp(colBlueLight, tr * 0.4);
      bright = 0.55 + 0.3 * tr;
      scale = 0.6 + Math.random() * 0.6;
    }
    set(x, y, z, tmp, bright, scale);
  }

  // 3) DISCO DIFUSO TENUE (rellena el espacio entre brazos)
  for (let i = 0; i < params.disk.count; i++) {
    const r = Math.sqrt(Math.random()) * params.radius;
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = gauss() * params.disk.thickness;
    const bright = 0.16 + Math.random() * 0.12;
    set(x, y, z, colDiskFaint, bright, 0.4 + Math.random() * 0.4);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: 60 * Math.min(window.devicePixelRatio, 2) },
      uTex: { value: starTexture },
    },
    vertexShader: `
      attribute float aScale;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uSize;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aScale * uSize / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTex;
      varying vec3 vColor;
      void main() {
        vec4 t = texture2D(uTex, gl_PointCoord);
        if (t.a < 0.02) discard;
        gl_FragColor = vec4(vColor, 1.0) * t;
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  galaxyGroup.add(points);
}
buildGalaxy();

// --- Núcleo: resplandor cremoso suave ---------------------------------------
function makeCoreGlow() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,250,235,0.6)");
  g.addColorStop(0.25, "rgba(255,238,200,0.32)");
  g.addColorStop(0.55, "rgba(255,220,160,0.1)");
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
  sprite.scale.set(4.2, 4.2, 1);
  return sprite;
}
const coreGlow = makeCoreGlow();
galaxyGroup.add(coreGlow);

// --- Fondo de estrellas y galaxias lejanas (colores variados, tenues) -------
function buildBackgroundStars() {
  const count = 1800;
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
    const r = 40 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    positions[i3 + 2] = r * Math.cos(phi);

    // La mayoría blancas/azuladas tenues, unas pocas con color
    if (Math.random() < 0.18) {
      tmp.copy(palette[2 + Math.floor(Math.random() * 4)]);
    } else {
      tmp.copy(palette[Math.floor(Math.random() * 2)]);
    }
    const b = 0.35 + Math.random() * 0.4;
    colors[i3] = tmp.r * b;
    colors[i3 + 1] = tmp.g * b;
    colors[i3 + 2] = tmp.b * b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.3,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    map: starTexture,
    transparent: true,
    opacity: 0.75,
  });

  scene.add(new THREE.Points(geometry, material));
}
buildBackgroundStars();

// --- Post-procesado: bloom suave (sin quemar la imagen) ---------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.55, // strength (intensidad) — contenida
  0.7, // radius
  0.3 // threshold (umbral alto = solo lo muy brillante brilla)
);
composer.addPass(bloom);

// --- Animación --------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // La galaxia gira lentamente, como una de verdad (giro reducido 1%)
  galaxyGroup.rotation.y = elapsed * 0.04455;

  // Latido muy suave del núcleo
  const pulse = 4.2 + Math.sin(elapsed * 1.2) * 0.15;
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
