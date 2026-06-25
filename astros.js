import * as THREE from "three";
import { CONTENT } from "./content.js";

/* ============================================================
   ASTROS pequeños (tamaño de estrella):
   estrella / planeta / agujero (Interstellar) / sistema solar.
   - planetas: algunos con 1-5 lunas y/o anillos (aleatorio)
   - agujeros negros de tamaños variados (algunos diminutos)
   - se colocan solos; los "errante" vagan esquivando al resto
   ============================================================ */

const MAX_R = 10.5;
const TWO_PI = Math.PI * 2;
const ESC = CONTENT.escala || 1.0;
const SYS_ORBIT = 0.5; // achica las órbitas de los sistemas solares (~80% más pequeños)
const SYS_PSIZE = 0.45; // tamaño de los planetas de un sistema (siempre menor que su sol)

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

function makeBlackHole(size) {
  const group = new THREE.Group();
  const hole = new THREE.Mesh(
    new THREE.SphereGeometry(size, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  group.add(hole);

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
  const moons = []; // lunas a animar

  function autoOrbit() {
    const radio = 2.6 + Math.random() * 7.2;
    const fase = Math.random() * TWO_PI;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const velocidad = (0.012 + Math.random() * 0.02) * dir;
    const inclinacion = 0.04 + Math.random() * 0.18;
    return { radio, velocidad, fase, inclinacion };
  }

  // Añade anillos y/o lunas a un planeta (o planeta de sistema)
  function decorate(parent, r, def) {
    // --- anillo ---
    const wantRing = def && def.anillo != null ? def.anillo : Math.random() < 0.28;
    if (wantRing) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r * 1.5, r * 2.5, 48),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(def?.anilloColor || "#dcc9a0"),
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = Math.PI / 2 - (0.3 + Math.random() * 0.5);
      ring.rotation.y = Math.random() * Math.PI;
      parent.add(ring);
    }
    // --- lunas (1 a 5) ---
    let n = def && def.lunas != null ? def.lunas : Math.random() < 0.45 ? 1 + Math.floor(Math.random() * 5) : 0;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Group();
      parent.add(m);
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(r * (0.28 + Math.random() * 0.18), 10, 10),
        new THREE.MeshStandardMaterial({
          color: 0xc9ccd6,
          roughness: 0.95,
          metalness: 0.0,
          emissive: 0x222233,
          emissiveIntensity: 0.25,
        })
      );
      m.add(moon);
      moons.push({
        g: m,
        r: r * (2.0 + i * 0.7 + Math.random() * 0.5),
        v: (0.6 + Math.random() * 1.2) * (Math.random() < 0.5 ? 1 : -1),
        ph: Math.random() * TWO_PI,
        incl: (Math.random() - 0.5) * 0.7,
      });
    }
  }

  // Cinturón de asteroides (anillo de pequeñas rocas) para un sistema
  function addBelt(parent, desde, hasta) {
    const count = 240;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const rr = (desde + Math.random() * (hasta - desde)) * SYS_ORBIT * ESC;
      const aa = Math.random() * TWO_PI;
      pos[i * 3] = Math.cos(aa) * rr;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.012;
      pos[i * 3 + 2] = Math.sin(aa) * rr;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xbfae90,
      size: 0.02,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      map: glowTex,
      blending: THREE.AdditiveBlending,
    });
    parent.add(new THREE.Points(geo, mat));
  }

  for (const a of CONTENT.astros) {
    const node = new THREE.Group();
    root.add(node);

    const inst = { data: a, node, type: a.tipo, radius: 0.1 * ESC, glows: [] };

    if (a.tipo === "estrella" || a.tipo === "sistema") {
      const r = (a.solTamano || 0.085) * ESC; // estrellas y soles: los astros más grandes
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(r, 18, 18),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(a.color || "#ffe6a0") })
      );
      node.add(core);
      const g = glowSprite(a.color || "#ffe6a0", r * 7); // halo proporcional al tamaño
      node.add(g);
      inst.glows.push({ s: g, base: g.scale.x, ph: Math.random() * TWO_PI, sp: 1.5 + Math.random() });
      inst.radius = r;
    } else if (a.tipo === "agujero") {
      // tamaño variado: desde diminuto (como una luna) hasta mediano
      const size = (a.tamano != null ? a.tamano : 0.04 + Math.random() * 0.1) * ESC;
      const bh = makeBlackHole(size);
      node.add(bh.group);
      inst.disk = bh.disk;
      inst.radius = size;
    } else {
      const r = 0.04 * ESC; // planetas: SIEMPRE más pequeños que las estrellas
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
      const g = glowSprite(a.color || "#7fb0ff", 0.16 * ESC, 0.45);
      node.add(g);
      inst.glows.push({ s: g, base: g.scale.x, ph: Math.random() * TWO_PI, sp: 1.5 + Math.random() });
      inst.radius = r;
      decorate(node, r, a); // lunas y/o anillo
    }

    // área de toque (amplia para que sea fácil pulsar)
    if (a.contenido) {
      const hit = hitSphere(Math.max(0.42, 0.6 * ESC), a, a.titulo);
      node.add(hit);
      clickables.push(hit);
    }

    // sistema solar: planetas hijos
    if (a.tipo === "sistema" && Array.isArray(a.planetas)) {
      inst.planetas = [];
      a.planetas.forEach((pl, idx) => {
        const radio = (pl.radio || 0.45 + idx * 0.35) * SYS_ORBIT * ESC;
        const velocidad = (pl.velocidad || Math.max(0.12, 0.7 - idx * 0.08)) * 0.8; // 20% más lento
        const fase = pl.fase ?? Math.random() * TWO_PI;
        const childR = (pl.tamano || 0.06) * SYS_PSIZE * ESC; // siempre menor que el sol

        const pnode = new THREE.Group();
        node.add(pnode);
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(childR, 16, 16),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(pl.color || "#9fc0ff"),
            roughness: 0.8,
            metalness: 0.1,
            emissive: new THREE.Color(pl.color || "#9fc0ff"),
            emissiveIntensity: 0.28,
          })
        );
        pnode.add(mesh);
        decorate(pnode, childR, pl); // lunas/anillos de los planetas del sistema

        const orbit = new THREE.Mesh(
          new THREE.RingGeometry(radio - 0.006, radio + 0.006, 80),
          new THREE.MeshBasicMaterial({ color: 0x9fb6ff, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
        );
        orbit.rotation.x = Math.PI / 2;
        node.add(orbit);

        const phit = hitSphere(0.1, pl, pl.titulo);
        pnode.add(phit);
        clickables.push(phit);

        inst.planetas.push({ data: { radio, velocidad, fase }, pnode });
      });
      if (a.cinturon) addBelt(node, a.cinturon.desde, a.cinturon.hasta);
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

      if (inst.disk) inst.disk.rotation.z = elapsed * 0.6;

      for (const g of inst.glows) {
        const k = 1 + 0.18 * Math.sin(elapsed * g.sp + g.ph);
        g.s.scale.set(g.base * k, g.base * k, 1);
      }

      if (inst.planetas) {
        for (const p of inst.planetas) {
          const ang = p.data.fase + elapsed * p.data.velocidad;
          p.pnode.position.set(Math.cos(ang) * p.data.radio, 0, Math.sin(ang) * p.data.radio);
        }
      }
    }

    // lunas
    for (const m of moons) {
      const ang = m.ph + elapsed * m.v;
      m.g.position.set(Math.cos(ang) * m.r, Math.sin(ang) * m.r * m.incl, Math.sin(ang) * m.r);
    }
  }

  return { group: root, clickables, update };
}
