import * as THREE from "three";
import { CONTENT } from "./content.js";

/* ============================================================
   ASTROS: planetas, estrellas, agujeros negros y sistemas.
   - Los astros con "orbita" giran alrededor del centro.
   - Los astros "errante" vagan y ESQUIVAN al resto (sin chocar).
   - Devuelve la lista de mallas clickeables y un update().
   ============================================================ */

const MAX_R = 10.5; // límite para que los errantes no se salgan
const TWO_PI = Math.PI * 2;

// Textura de resplandor suave reutilizable
function makeGlowTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.55)");
  g.addColorStop(0.7, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const glowTex = makeGlowTexture();

function glowSprite(color, scale) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: new THREE.Color(color),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
  );
  s.scale.set(scale, scale, 1);
  return s;
}

// Esfera invisible para facilitar el toque (área de click amplia)
function hitSphere(radius, astroData) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  m.userData.astro = astroData;
  return m;
}

export function buildAstros(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const clickables = [];
  const instances = []; // para animar

  // --- construir cada astro ---
  for (const a of CONTENT.astros) {
    const node = new THREE.Group();
    group.add(node);

    const inst = { data: a, node, type: a.tipo, radius: a.tamano || 0.4 };

    if (a.tipo === "estrella" || a.tipo === "sistema") {
      // núcleo brillante (sol/estrella)
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(a.tamano * 0.6, 20, 20),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(a.color || "#ffe6a0") })
      );
      node.add(core);
      node.add(glowSprite(a.color || "#ffe6a0", a.tamano * 3.2));
    } else if (a.tipo === "agujero") {
      // esfera negra + anillo de acreción brillante
      const hole = new THREE.Mesh(
        new THREE.SphereGeometry(a.tamano * 0.6, 20, 20),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      node.add(hole);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(a.tamano * 1.0, a.tamano * 0.16, 16, 60),
        new THREE.MeshBasicMaterial({ color: 0xffa64d, transparent: true, opacity: 0.9 })
      );
      ring.rotation.x = Math.PI * 0.5 - 0.5;
      node.add(ring);
      const g = glowSprite("#ff9a3c", a.tamano * 2.6);
      g.material.opacity = 0.5;
      node.add(g);
      inst.ring = ring;
    } else {
      // planeta
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(a.tamano, 24, 24),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(a.color || "#7fb0ff"),
          roughness: 0.75,
          metalness: 0.1,
          emissive: new THREE.Color(a.color || "#7fb0ff"),
          emissiveIntensity: 0.18,
        })
      );
      node.add(planet);
    }

    // área de toque
    const hit = hitSphere(Math.max(a.tamano * 1.7, 0.7), a.contenido ? a : null);
    if (a.contenido) {
      hit.userData.titulo = a.titulo;
      node.add(hit);
      clickables.push(hit);
    }

    // sistema solar: planetas hijos que orbitan el sol
    if (a.tipo === "sistema" && Array.isArray(a.planetas)) {
      inst.planetas = [];
      for (const pl of a.planetas) {
        const pnode = new THREE.Group();
        node.add(pnode);
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(pl.tamano, 20, 20),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(pl.color || "#9fc0ff"),
            roughness: 0.8,
            metalness: 0.1,
            emissive: new THREE.Color(pl.color || "#9fc0ff"),
            emissiveIntensity: 0.15,
          })
        );
        pnode.add(mesh);
        // anillo de órbita tenue
        const orbit = new THREE.Mesh(
          new THREE.RingGeometry(pl.radio - 0.012, pl.radio + 0.012, 64),
          new THREE.MeshBasicMaterial({
            color: 0x9fb6ff,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
          })
        );
        orbit.rotation.x = Math.PI / 2;
        node.add(orbit);

        const phit = hitSphere(Math.max(pl.tamano * 2.0, 0.55), pl);
        phit.userData.titulo = pl.titulo;
        pnode.add(phit);
        clickables.push(phit);

        inst.planetas.push({ data: pl, pnode });
      }
    }

    // estado de movimiento
    if (a.errante) {
      const ang = a.inicio?.fase ?? Math.random() * TWO_PI;
      const rad = a.inicio?.radio ?? 6;
      inst.pos = new THREE.Vector3(Math.cos(ang) * rad, (Math.random() - 0.5) * 0.6, Math.sin(ang) * rad);
      const v = 0.35;
      inst.vel = new THREE.Vector3(Math.cos(ang + 1.6) * v, 0, Math.sin(ang + 1.6) * v);
      node.position.copy(inst.pos);
    } else if (a.orbita) {
      inst.orbita = a.orbita;
    }

    instances.push(inst);
  }

  // Lista de obstáculos para los errantes (todos menos ellos mismos) + centro
  function obstacles(self) {
    const list = [{ pos: new THREE.Vector3(0, 0, 0), r: 1.8 }]; // centro de la galaxia
    for (const inst of instances) {
      if (inst === self) continue;
      list.push({ pos: inst.node.position, r: (inst.radius || 0.4) + 0.4 });
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
        // --- esquiva (separación tipo boids) ---
        const steer = new THREE.Vector3();
        for (const ob of obstacles(inst)) {
          const d = new THREE.Vector3().subVectors(inst.pos, ob.pos);
          const dist = d.length();
          const minDist = inst.radius + ob.r + 0.6;
          if (dist < minDist && dist > 0.0001) {
            steer.add(d.normalize().multiplyScalar((minDist - dist) * 3.0));
          }
        }
        // mantener dentro de la galaxia
        const flat = new THREE.Vector3(inst.pos.x, 0, inst.pos.z);
        const distC = flat.length();
        if (distC > MAX_R) steer.add(flat.normalize().multiplyScalar(-(distC - MAX_R) * 2.0));
        // suave atracción al plano del disco
        steer.y += -inst.pos.y * 0.8;

        inst.vel.add(steer.multiplyScalar(dt));
        // limitar velocidad
        const sp = inst.vel.length();
        const MAXV = 0.7;
        if (sp > MAXV) inst.vel.multiplyScalar(MAXV / sp);
        if (sp < 0.15) inst.vel.multiplyScalar(0.15 / (sp || 1)); // que no se detenga
        inst.pos.addScaledVector(inst.vel, dt);
        inst.node.position.copy(inst.pos);
      }

      // rotación propia y anillos
      if (inst.ring) inst.ring.rotation.z = elapsed * 0.4;
      inst.node.rotation.y = elapsed * 0.2;

      // planetas de sistemas
      if (inst.planetas) {
        for (const p of inst.planetas) {
          const ang = p.data.fase + elapsed * p.data.velocidad;
          p.pnode.position.set(Math.cos(ang) * p.data.radio, 0, Math.sin(ang) * p.data.radio);
          p.pnode.rotation.y = elapsed * 0.5;
        }
      }
    }
  }

  return { group, clickables, update };
}
