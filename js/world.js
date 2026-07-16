// world.js
// Builds "The High-Voltage Core": a dark maze of walls, humming transformers,
// three task consoles, and an exit gate that lights up once the grid is charged.

import * as THREE from 'three';

const WALL_COLOR = 0x0a1218;
const FLOOR_COLOR = 0x060a0d;

export function buildWorld(scene) {
  const wallBoxes = []; // { minX, maxX, minZ, maxZ } for simple AABB collision
  const pulsingLights = []; // materials to pulse with ambient hum
  const group = new THREE.Group();

  // ---- Floor ----
  const floorGeo = new THREE.PlaneGeometry(80, 80);
  const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.9, metalness: 0.1 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // Neon floor grid lines (purely visual, glowing cable look)
  const grid = new THREE.GridHelper(80, 40, 0x14e0ff, 0x0a2a33);
  grid.position.y = 0.01;
  group.add(grid);

  // ---- Perimeter walls ----
  const perimeter = [
    { x: 0, z: -40, w: 80, d: 1 },
    { x: 0, z: 40, w: 80, d: 1 },
    { x: -40, z: 0, w: 1, d: 80 },
    { x: 40, z: 0, w: 1, d: 80 },
  ];

  // ---- Interior maze walls (hand-laid corridors around 4 rough zones) ----
  const interior = [
    { x: -18, z: -10, w: 1, d: 26 },
    { x: -18, z: 18, w: 20, d: 1 },
    { x: 0, z: -6, w: 1, d: 30 },
    { x: 10, z: 10, w: 26, d: 1 },
    { x: 20, z: -14, w: 1, d: 20 },
    { x: -8, z: 30, w: 30, d: 1 },
    { x: 26, z: 20, w: 1, d: 24 },
  ];

  const wallMat = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.6, metalness: 0.4 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x0d3944, emissive: 0x14e0ff, emissiveIntensity: 0.6, roughness: 0.4,
  });

  [...perimeter, ...interior].forEach(({ x, z, w, d }) => {
    const h = 4;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(x, h / 2, z);
    group.add(mesh);

    // thin glowing trim strip along the base of each wall
    const trimGeo = new THREE.BoxGeometry(w + 0.05, 0.15, d + 0.05);
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(x, 0.1, z);
    group.add(trim);

    wallBoxes.push({
      minX: x - w / 2 - 0.4, maxX: x + w / 2 + 0.4,
      minZ: z - d / 2 - 0.4, maxZ: z + d / 2 + 0.4,
    });
  });

  // ---- Humming transformers (decorative, pulse with the ambient hum) ----
  const transformerPositions = [
    [-28, -28], [28, -28], [-28, 28], [30, 30], [0, -30], [-30, 0],
  ];
  transformerPositions.forEach(([x, z]) => {
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x102028, emissive: 0xff8a2f, emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.3,
    });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 3.2, 12), coreMat);
    core.position.set(x, 1.6, z);
    group.add(core);
    pulsingLights.push(coreMat);

    const light = new THREE.PointLight(0xff8a2f, 1.2, 10);
    light.position.set(x, 3.5, z);
    group.add(light);
  });

  // ---- Task consoles (broken machines to physically repair) ----
  // Alternates between two repair types so a match uses both minigames.
  const taskConsoleData = [
    { id: 0, x: -25, z: -5, type: 'rewire' },
    { id: 1, x: 15, z: -20, type: 'repack' },
    { id: 2, x: 5, z: 25, type: 'rewire' },
    { id: 3, x: -12, z: 32, type: 'repack' },
  ];
  const consoleColors = { rewire: 0x33e6ff, repack: 0xffb347 };
  const taskConsoles = taskConsoleData.map(({ id, x, z, type }) => {
    const color = consoleColors[type];
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0d1a22, metalness: 0.5, roughness: 0.4 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x0d1a22, emissive: color, emissiveIntensity: 0.9,
    });

    let base, panel;
    if (type === 'rewire') {
      // sparking transformer junction — rewire minigame
      base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 1.2, 10), baseMat);
      base.position.set(x, 0.6, z);
      panel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 8, 16), glowMat);
      panel.position.set(x, 1.1, z);
      panel.rotation.x = Math.PI / 2;
    } else {
      // stacked transformer core plates — repack (rhythm) minigame
      base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 1.3), baseMat);
      base.position.set(x, 0.5, z);
      panel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 1.0), glowMat);
      panel.position.set(x, 1.05, z);
    }
    group.add(base, panel);

    const light = new THREE.PointLight(color, 0.8, 6);
    light.position.set(x, 1.4, z);
    group.add(light);

    return { id, x, z, type, mesh: panel, material: glowMat, baseColor: color, done: false };
  });

  // ---- Drain Chairs (Propnight-style capture stations) ----
  const chairData = [
    { id: 0, x: 10, z: -10 },
    { id: 1, x: -20, z: 25 },
  ];
  const chairMat = new THREE.MeshStandardMaterial({
    color: 0x1a0d10, emissive: 0xff2fd1, emissiveIntensity: 0.5, metalness: 0.5, roughness: 0.4,
  });
  const drainChairs = chairData.map(({ id, x, z }) => {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 1.0), chairMat);
    seat.position.set(x, 0.55, z);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.15), chairMat);
    back.position.set(x, 1.1, z - 0.45);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 16), chairMat);
    ring.position.set(x, 0.9, z);
    ring.rotation.x = Math.PI / 2;
    group.add(seat, back, ring);

    const light = new THREE.PointLight(0xff2fd1, 0.6, 6);
    light.position.set(x, 1.6, z);
    group.add(light);

    return { id, x, z, material: chairMat };
  });

  // ---- Escape gate ----
  const gateMat = new THREE.MeshStandardMaterial({
    color: 0x1a0d10, emissive: 0xff2fd1, emissiveIntensity: 0.15,
  });
  const gateFrameGeo = new THREE.TorusGeometry(2.6, 0.2, 8, 24, Math.PI);
  const gate = new THREE.Mesh(gateFrameGeo, gateMat);
  gate.position.set(-30, 0, 35);
  gate.rotation.x = Math.PI / 2;
  group.add(gate);
  const gateLight = new THREE.PointLight(0xff2fd1, 0.4, 8);
  gateLight.position.set(-30, 2, 35);
  group.add(gateLight);

  scene.add(group);

  return {
    wallBoxes,
    taskConsoles,
    drainChairs,
    escapeGate: { x: -30, z: 35, mesh: gate, material: gateMat, light: gateLight, active: false },
    pulsingLights,
  };
}

export function collides(x, z, wallBoxes, radius = 0.4) {
  for (const b of wallBoxes) {
    if (x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ) {
      return true;
    }
  }
  return false;
}
