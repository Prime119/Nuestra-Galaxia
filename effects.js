import * as THREE from "three";

/* ============================================================
   EFECTOS del espacio (decorativos, no clickeables):
   - Cometas con cola que apunta lejos del centro
   - Sistemas de asteroides vagando por la galaxia
   - Meteoros (estrellas fugaces) que cruzan de vez en cuando
   ============================================================ */

const TWO_PI = Math.PI * 2;

function glowTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.5)");
  g.addColorStop(0.7, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildEffects(scene) {
  const glowTex = glowTexture();
  const group = new THREE.Group();
  scene.add(group);

  // ---------------- COMETAS ----------------
  const comets = [];
  function makeComet() {
    const node = new THREE.Group();
    group.add(node);
    const head = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color("#cfe6ff"),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    head.scale.set(0.3, 0.3, 1);
    node.add(head);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    node.add(core);

    const N = 70;
    const tpos = new Float32Array(N * 3);
    const tcol = new Float32Array(N * 3);
    const tgeo = new THREE.BufferGeometry();
    tgeo.setAttribute("position", new THREE.BufferAttribute(tpos, 3));
    tgeo.setAttribute("color", new THREE.BufferAttribute(tcol, 3));
    const tail = new THREE.Points(
      tgeo,
      new THREE.PointsMaterial({
        size: 0.1,
        map: glowTex,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        opacity: 0.9,
      })
    );
    group.add(tail);

    comets.push({
      node,
      tail,
      tpos,
      tcol,
      N,
      a: 6 + Math.random() * 4,
      e: 0.5 + Math.random() * 0.28,
      rot: Math.random() * TWO_PI,
      speed: (0.18 + Math.random() * 0.16) * (Math.random() < 0.5 ? 1 : -1),
      tilt: (Math.random() - 0.5) * 0.4,
      theta: Math.random() * TWO_PI,
    });
  }
  for (let i = 0; i < 3; i++) makeComet();

  const _v = new THREE.Vector3();
  function updateComets(delta) {
    for (const c of comets) {
      c.theta += c.speed * delta;
      const r = (c.a * (1 - c.e * c.e)) / (1 + c.e * Math.cos(c.theta));
      const x = Math.cos(c.theta + c.rot) * r;
      const z = Math.sin(c.theta + c.rot) * r;
      const y = Math.sin(c.theta + c.rot) * r * c.tilt;
      c.node.position.set(x, y, z);

      _v.set(x, y, z);
      const len = _v.length() || 1;
      const ax = x / len, ay = y / len, az = z / len; // dirección lejos del centro
      const tailLen = 0.8 + 2.6 * Math.max(0, (c.a - r) / c.a);
      for (let i = 0; i < c.N; i++) {
        const f = i / (c.N - 1);
        const i3 = i * 3;
        c.tpos[i3] = x + ax * f * tailLen + (Math.random() - 0.5) * 0.04;
        c.tpos[i3 + 1] = y + ay * f * tailLen + (Math.random() - 0.5) * 0.04;
        c.tpos[i3 + 2] = z + az * f * tailLen + (Math.random() - 0.5) * 0.04;
        const b = (1 - f) * 0.9;
        c.tcol[i3] = 0.8 * b;
        c.tcol[i3 + 1] = 0.9 * b;
        c.tcol[i3 + 2] = b;
      }
      c.tail.geometry.attributes.position.needsUpdate = true;
      c.tail.geometry.attributes.color.needsUpdate = true;
    }
  }

  // ---------------- SISTEMAS DE ASTEROIDES (vagando) ----------------
  const clusters = [];
  function makeCluster() {
    const N = 45;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const rr = Math.pow(Math.random(), 0.6) * 0.5;
      const a = Math.random() * TWO_PI;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = rr * Math.sin(ph) * Math.cos(a);
      pos[i * 3 + 1] = rr * Math.sin(ph) * Math.sin(a) * 0.5;
      pos[i * 3 + 2] = rr * Math.cos(ph);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xb6a487,
        size: 0.05,
        map: glowTex,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
    const node = new THREE.Group();
    node.add(points);
    group.add(node);
    const ang = Math.random() * TWO_PI;
    const rad = 4 + Math.random() * 5;
    node.position.set(Math.cos(ang) * rad, (Math.random() - 0.5) * 0.8, Math.sin(ang) * rad);
    clusters.push({
      node,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.25),
      spin: (Math.random() - 0.5) * 0.3,
    });
  }
  for (let i = 0; i < 3; i++) makeCluster();

  function updateClusters(delta) {
    for (const cl of clusters) {
      cl.node.position.addScaledVector(cl.vel, delta);
      const p = cl.node.position;
      const distC = Math.hypot(p.x, p.z);
      if (distC > 10) {
        // rebote suave hacia adentro
        cl.vel.x -= (p.x / distC) * 0.1;
        cl.vel.z -= (p.z / distC) * 0.1;
      }
      p.y *= 0.999;
      cl.node.rotation.y += cl.spin * delta;
    }
  }

  // ---------------- METEOROS (estrellas fugaces) ----------------
  const meteors = [];
  let nextMeteor = 1.5 + Math.random() * 2.5;
  function spawnMeteor() {
    const N = 16;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const obj = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.14,
        map: glowTex,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
    group.add(obj);
    // empieza en un borde y cruza
    const ang = Math.random() * TWO_PI;
    const start = new THREE.Vector3(Math.cos(ang) * 11, 3 + Math.random() * 5, Math.sin(ang) * 11);
    const vel = new THREE.Vector3(-start.x, -1 - Math.random(), -start.z).normalize().multiplyScalar(9 + Math.random() * 6);
    meteors.push({ obj, pos, col, N, p: start, vel, life: 0, max: 0.9 + Math.random() * 0.6 });
  }

  function updateMeteors(delta) {
    nextMeteor -= delta;
    if (nextMeteor <= 0) {
      spawnMeteor();
      nextMeteor = 2 + Math.random() * 4;
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.life += delta;
      m.p.addScaledVector(m.vel, delta);
      const dirN = m.vel.clone().normalize();
      const fade = Math.max(0, 1 - m.life / m.max);
      for (let j = 0; j < m.N; j++) {
        const f = j / (m.N - 1);
        const j3 = j * 3;
        m.pos[j3] = m.p.x - dirN.x * f * 1.2;
        m.pos[j3 + 1] = m.p.y - dirN.y * f * 1.2;
        m.pos[j3 + 2] = m.p.z - dirN.z * f * 1.2;
        const b = (1 - f) * fade;
        m.col[j3] = b;
        m.col[j3 + 1] = b;
        m.col[j3 + 2] = b;
      }
      m.obj.geometry.attributes.position.needsUpdate = true;
      m.obj.geometry.attributes.color.needsUpdate = true;
      if (m.life > m.max) {
        group.remove(m.obj);
        m.obj.geometry.dispose();
        m.obj.material.dispose();
        meteors.splice(i, 1);
      }
    }
  }

  function update(elapsed, delta) {
    const dt = Math.min(delta, 0.05);
    updateComets(dt);
    updateClusters(dt);
    updateMeteors(dt);
  }

  return { group, update };
}
