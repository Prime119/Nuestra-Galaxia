import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/* ============================================================
   NUESTRA GALAXIA — base visual
   Galaxia espiral barrada con cuerpo de disco completo:
   bulbo/barra cremoso, varios brazos azules poblados de
   estrellas, cúmulos y regiones rosas. En movimiento y
   explorable con zoom/desplazamiento.
   ============================================================ */

const canvas = document.getElementById("galaxy-canvas");

// --- Escena, cámara, render -------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color("#03030a");
scene.fog = new THREE.FogExp2("#03030a", 0.009);

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
renderer.toneMappingExposure = 0.8; // exposición más baja = menos brillo

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
  g.addColorStop(0.25, "rgba(255,255,255,0.8)");
  g.addColorStop(0.5, "rgba(255,255,255,0.3)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const starTexture = makeStarTexture();

// --- Generación de la galaxia -----------------------------------------------
const galaxyGroup = new THREE.Group();
scene.add(galaxyGroup);

const params = {
  radius: 11,
  // Bulbo/barra central cremoso
  bar: { count: 9000, length: 2.8, width: 1.0, thickness: 0.32 },
  // Disco con varios brazos (el cuerpo de la galaxia, MUCHAS estrellas)
  disk: {
    count: 46000,
    branches: 3,
    spin: 0.55,
    randomness: 0.28,
    randomnessPower: 2.4,
    thickness: 0.16,
  },
};

// Aproximación a una distribución gaussiana en el rango [-1, 1] aprox.
function gauss() {
  return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
}

function buildGalaxy() {
  const total = params.bar.count + params.disk.count;
  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  const scales = new Float32Array(total);

  // Paleta inspirada en NGC 1300
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

  // 1) BULBO + BARRA (cremoso, elongado en X, brillo contenido)
  for (let i = 0; i < params.bar.count; i++) {
    const x = gauss() * params.bar.length;
    const z = gauss() * params.bar.width;
    const y = gauss() * params.bar.thickness;
    const d = Math.min(
      1,
      Math.sqrt((x / params.bar.length) ** 2 + (z / params.bar.width) ** 2)
    );
    tmp.copy(colCreamCenter).lerp(colCreamEdge, d);
    if (Math.random() < 0.05) tmp.copy(colDust);
    const bright = 0.5 * (1 - 0.4 * d); // mucho más tenue que antes
    const scale = (0.55 + Math.random() * 0.5) * (1 - 0.2 * d);
    set(x, y, z, tmp, bright, scale);
  }

  // 2) DISCO CON VARIOS BRAZOS (cuerpo de la galaxia)
  const dk = params.disk;
  const barEnd = params.bar.length * 0.6;
  for (let i = 0; i < dk.count; i++) {
    // radio: empieza cerca del bulbo y llega al borde, denso en el medio
    const radius = barEnd + Math.pow(Math.random(), 0.85) * (params.radius - barEnd);
    const branchAngle = ((i % dk.branches) / dk.branches) * Math.PI * 2;
    const spinAngle = radius * dk.spin;

    const rnd = () =>
      Math.pow(Math.random(), dk.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      dk.randomness *
      radius;

    const ox = rnd();
    const oz = rnd();
    const angle = branchAngle + spinAngle;
    const x = Math.cos(angle) * radius + ox;
    const z = Math.sin(angle) * radius + oz;
    const y = gauss() * dk.thickness * (1 + radius * 0.05);

    const tr = radius / params.radius; // 0..1
    const roll = Math.random();
    let bright, scale;

    if (roll < 0.035) {
      // cúmulo azul-blanco brillante (pocos y no tan intensos)
      tmp.copy(colBlueLight).lerp(colWhite, Math.random() * 0.5);
      bright = 0.7;
      scale = 1.1 + Math.random() * 0.9;
    } else if (roll < 0.075) {
      // región HII rosa/roja
      tmp.copy(colPink).lerp(colRed, Math.random());
      bright = 0.6;
      scale = 0.8 + Math.random() * 0.7;
    } else {
      // estrellas de fondo del disco: muchas y tenues
      // interior cremoso -> exterior azulado
      tmp.copy(colCreamEdge).lerp(colBlueDeep, Math.min(1, tr * 1.4));
      tmp.lerp(colBlue, tr * 0.5);
      bright = 0.22 + Math.random() * 0.22; // tenues
      scale = 0.45 + Math.random() * 0.5;
    }
    set(x, y, z, tmp, bright, scale);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: 42 * Math.min(window.devicePixelRatio, 2) },
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

// --- Núcleo: resplandor cremoso MUY suave -----------------------------------
function makeCoreGlow() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,248,230,0.38)");
  g.addColorStop(0.3, "rgba(255,234,195,0.18)");
  g.addColorStop(0.6, "rgba(255,215,150,0.06)");
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
  sprite.scale.set(3.4, 3.4, 1);
  return sprite;
}
const coreGlow = makeCoreGlow();
galaxyGroup.add(coreGlow);

// --- Fondo de estrellas y galaxias lejanas (colores variados, tenues) -------
function buildBackgroundStars() {
  const count = 2600;
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

// --- Post-procesado: bloom MUY contenido ------------------------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.3, // strength (intensidad) — baja
  0.6, // radius
  0.5 // threshold alto = casi nada se "quema"
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
  const pulse = 3.4 + Math.sin(elapsed * 1.2) * 0.12;
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
