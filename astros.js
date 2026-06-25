import * as THREE from "three";
import { CONTENT } from "./content.js";

/* ============================================================
   ASTROS: pequeños (tamaño de las estrellas de la galaxia).
   - estrella / planeta / agujero (Interstellar) / sistema solar
   - se colocan SOLOS (órbitas automáticas) si no tienen "orbita"
   - los "errante" vagan y esquivan al resto (sin chocar)
   - área de toque amplia para poder pulsarlos en el móvil
   ============================================================ */

const MAX_R = 10.5;
const TWO_PI = Math.PI * 2;
const ESC = CONTENT.escala || 1.0;

// ---------- texturas ----------
function radialTexture(stops) {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const glowTex = radialTexture([
  [0, "rgba(255,255,255,1)"],
  [0.3, "rgba(255,255,255,0.55)"],
  [0.7, "rgba(255,255,255,0.12)"],
  [1, "rgba(255,255,255,0)"],
]);

// anillo de luz (photon ring) para el agujero negro
function ringTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, "rgba(0,0,0,0)");
  g.addColorStop(0.62, "rgba(0,0,0,0)");
  g.addColorStop(0.72, "rgba(255,240,220,0.25)");
  g.addColorStop(0.82, "rgba(255,255,255,1)");
  g.addColorStop(0.9, "rgba(255,230,190,0.5)");
  g.addColorStop(1.0, "rgba(255,200,150,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const photonRingTex = ringTexture();

// disco de acreción con vetas (para que se note el giro)
function diskTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.14, size / 2, size / 2, size * 0.5);
  g.addColorStop(0.0, "rgba(255,245,225,0.95)");
  g.addColorStop(0.2, "rgba(255,200,120,0.85)");
  g.addColorStop(0.5, "rgba(255,140,60,0.45)");
  g.addColorStop(0.8, "rgba(150,70,30,0.12)");
  g.addColorStop(1.0, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, TWO_PI);
  ctx.fill();
  // vetas radiales tenues
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TWO_PI + Math.random() * 0.1;
    ctx.strokeStyle = `rgba(255,235,200,${0.05 + Math.random() * 0.08})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(size / 2 + Math.cos(a) * size * 0.16, size / 2 + Math.sin(a) * size * 0.16);
    ctx.lineTo(size / 2 + Math.cos(a) * size * 0.49, size / 2 + Math.sin(a) * size * 0.49);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const accretionTex = diskTexture();

// ---------- helpers ----------
function glowSprite(color, scale, opacity = 1) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: new THREE.Color(color),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity,
    })
  );
  s.scale.set(scale, scale, 1);
  return s;
}

function hitSphere(radius, astroData, titulo) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 10, 10),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  m.userData.astro = astroData;
  m.userData.titulo = titulo;
  return m;
}

// agujero negro estilo Interstellar
function makeBlackHole(size) {
  const group = new THREE.Group();

  // horizonte de sucesos (esfera negra)
  const hole = new THREE.Mesh(
    new THREE.SphereGeometry(size, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  group.add(hole);

  // disco de acreción (girando), ligeramente inclinado
  const diskHolder = new THREE.Group();
  diskHolder.rotation.x = Math.PI / 2 - 0.22;
  const disk = new THREE.Mesh(
    new THREE.RingGeometry(size * 1.25, size * 3.4, 96),
    new THREE.MeshBasicMaterial({
      map: accretionTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  diskHolder.add(disk);
  group.add(diskHolder);

  // anillo de luz que SIEMPRE mira a la cámara (la luz lensada)
  const photon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: photonRingTex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
  );
  photon.scale.set(size * 3.0, size * 3.0, 1);
  group.add(photon);

  return { group, disk };
}

export function buildAstros(scene) {
  const root = new THREE.Group();
  scene.add(root);

  const clickables = [];
  const instances = [];

  // colocación automática (deja todo bien repartido por el disco)
  function autoOrbit() {
    const radio = 2.6 + Math.random() * 7.2;
    const fase = Math.random() * TWO_PI;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const velocidad = (0.012 + Math.random() * 0.02) * dir;
    const inclinacion = 0.04 + Math.random() * 0.18;
    return { radio, velocidad, fase, inclinacion };
  }

  for (const a of CONTENT.astros) {
    const node = new THREE.Group();
    root.add(node);

    const baseSize = (a.tamano || tipoSize(a.tipo)) * ESC;
    const inst = { data: a, node, type: a.tipo, radius: baseSize, glows: [] };

    if (a.tipo === "estrella" || a.tipo === "sistema") {
      const r = (a.tipo === "sistema" ? 0.12 : 0.07) * ESC;
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 16),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(a.color || "#ffe6a0") })
      );
      node.add(core);
      const g = glowSprite(a.color || "#ffe6a0", (a.tipo === "sistema" ? 0.8 : 0.6) * ESC);
      node.add(g);
      inst.glows.push({ s: g, base: g.scale.x, ph: Math.random() * TWO_PI, sp: 1.5 + Math.random() });
      inst.radius = r;
    } else if (a.tipo === "agujero") {
      const bh = makeBlackHole(0.16 * ESC);
      node.add(bh.group);
      inst.disk = bh.disk;
      inst.radius = 0.16 * ESC;
    } else {
      // planeta pequeño
      const r = 0.1 * ESC;
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(r, 18, 18),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(a.color || "#7fb0ff"),
          roughness: 0.75,
          metalness: 0.1,
          emissive: new THREE.Color(a.color || "#7fb0ff"),
          emissiveIntensity: 0.25,
        })
      );
      node.add(planet);
      const g = glowSprite(a.color || "#7fb0ff", 0.34 * ESC, 0.5);
      node.add(g);
      inst.glows.push({ s: g, base: g.scale.x, ph: Math.random() * TWO_PI, sp: 1.5 + Math.random() });
      inst.radius = r;
    }

    // área de toque (amplia aunque el astro sea pequeño)
    if (a.contenido) {
      const hit = hitSphere(0.55 * ESC, a, a.titulo);
      node.add(hit);
      clickables.push(hit);
    }

    // sistema solar: planetas hijos
    if (a.tipo === "sistema" && Array.isArray(a.planetas)) {
      inst.planetas = [];
      a.planetas.forEach((pl, idx) => {
        const radio = pl.radio || 0.4 + idx * 0.32;
        const velocidad = pl.velocidad || 0.5 - idx * 0.12;
        const fase = pl.fase ?? Math.random() * TWO_PI;

        const pnode = new THREE.Group();
        node.add(pnode);
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.05 * ESC, 14, 14),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(pl.color || "#9fc0ff"),
            roughness: 0.8,
            metalness: 0.1,
            emissive: new THREE.Color(pl.color || "#9fc0ff"),
            emissiveIntensity: 0.3,
          })
        );
        pnode.add(mesh);

        const orbit = new THREE.Mesh(
          new THREE.RingGeometry(radio - 0.006, radio + 0.006, 64),
          new THREE.MeshBasicMaterial({ color: 0x9fb6ff, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
        );
        orbit.rotation.x = Math.PI / 2;
        node.add(orbit);

        const phit = hitSphere(0.32 * ESC, pl, pl.titulo);
        pnode.add(phit);
        clickables.push(phit);

        inst.planetas.push({ data: { radio, velocidad, fase }, pnode });
      });
    }

    // movimiento
    if (a.errante) {
      const ang = Math.random() * TWO_PI;
      const rad = 4 + Math.random() * 5;
      inst.pos = new THREE.Vector3(Math.cos(ang) * rad, (Math.random() - 0.5) * 0.6, Math.sin(ang) * rad);
      const v = 0.35;
      inst.vel = new THREE.Vector3(Math.cos(ang + 1.6) * v, 0, Math.sin(ang + 1.6) * v);
      node.position.copy(inst.pos);
    } else {
      inst.orbita = a.orbita || autoOrbit();
    }

    instances.push(inst);
  }

  function tipoSize(tipo) {
    return tipo === "agujero" ? 0.16 : tipo === "sistema" ? 0.12 : 0.1;
  }

  function obstacles(self) {
    const list = [{ pos: new THREE.Vector3(0, 0, 0), r: 1.8 }];
    for (const inst of instances) {
      if (inst === self) continue;
      list.push({ pos: inst.node.position, r: (inst.radius || 0.1) + 0.45 });
    }
    return list;
  }

  function update(elapsed, delta) {
    const dt = Math.min(delta, 0.05);
    for (const inst of instances) {
      const a = inst.data;

      if (inst.orbita) {
        const o = inst.orbita;
        const ang = o.fase + elapsed * o.velocidad;
        inst.node.position.set(
          Math.cos(ang) * o.radio,
          Math.sin(ang) * o.radio * o.inclinacion,
          Math.sin(ang) * o.radio
        );
      } else if (a.errante) {
        const steer = new THREE.Vector3();
        for (const ob of obstacles(inst)) {
          const d = new THREE.Vector3().subVectors(inst.pos, ob.pos);
          const dist = d.length();
          const minDist = inst.radius + ob.r + 0.5;
          if (dist < minDist && dist > 0.0001) {
            steer.add(d.normalize().multiplyScalar((minDist - dist) * 3.0));
          }
        }
        const flat = new THREE.Vector3(inst.pos.x, 0, inst.pos.z);
        const distC = flat.length();
        if (distC > MAX_R) steer.add(flat.normalize().multiplyScalar(-(distC - MAX_R) * 2.0));
        steer.y += -inst.pos.y * 0.8;

        inst.vel.add(steer.multiplyScalar(dt));
        const sp = inst.vel.length();
        const MAXV = 0.6;
        if (sp > MAXV) inst.vel.multiplyScalar(MAXV / sp);
        if (sp < 0.12) inst.vel.multiplyScalar(0.12 / (sp || 1));
        inst.pos.addScaledVector(inst.vel, dt);
        inst.node.position.copy(inst.pos);
      }

      // disco de acreción del agujero negro: giro tipo Interstellar
      if (inst.disk) inst.disk.rotation.z = elapsed * 0.6;

      // parpadeo suave de estrellas/planetas
      for (const g of inst.glows) {
        const k = 1 + 0.18 * Math.sin(elapsed * g.sp + g.ph);
        g.s.scale.set(g.base * k, g.base * k, 1);
      }

      // planetas de sistemas
      if (inst.planetas) {
        for (const p of inst.planetas) {
          const ang = p.data.fase + elapsed * p.data.velocidad;
          p.pnode.position.set(Math.cos(ang) * p.data.radio, 0, Math.sin(ang) * p.data.radio);
        }
      }
    }
  }

  return { group: root, clickables, update };
}
