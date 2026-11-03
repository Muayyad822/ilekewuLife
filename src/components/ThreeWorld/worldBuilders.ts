import * as THREE from 'three';
import { buildCharacter, Character, CharacterOptions, Pose } from './characterBuilder';

export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Vehicle {
  group: THREE.Group;
  speed: number;
  dir: 1 | -1;
  wheels: THREE.Group[];
  wheelR: number;
  minX: number;
  maxX: number;
}

export interface NPC {
  id: string;
  name: string;
  title: string;
  char: Character;
  lines: string[];
  patrol?: { ax: number; az: number; bx: number; bz: number; speed: number; t: number; dir: 1 | -1 };
  idlePose: Pose;
}

export interface WorldHandles {
  colliders: Collider[];
  vehicles: Vehicle[];
  rideBus: { group: THREE.Group; wheels: THREE.Group[]; wheelR: number };
  lampMats: THREE.MeshStandardMaterial[];
  windowMats: THREE.MeshStandardMaterial[];
  headMats: THREE.MeshStandardMaterial[];
  npcs: NPC[];
  dispose: () => void;
}

const SKIN = [0x3b2314, 0x5d3a1a, 0x7a4a24, 0x4a2c17];

function makeSign(text: string, w: number, h: number, bg: string, fg: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.max(64, Math.round((512 * h) / w));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, c.width - 12, c.height - 12);
  let size = Math.floor(c.height * 0.5);
  ctx.font = `900 ${size}px sans-serif`;
  while (ctx.measureText(text).width > c.width - 40 && size > 10) {
    size -= 2;
    ctx.font = `900 ${size}px sans-serif`;
  }
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  return mesh;
}

export function createWorld(scene: THREE.Scene): WorldHandles {
  const matCache = new Map<string, THREE.MeshStandardMaterial>();
  const colliders: Collider[] = [];
  const vehicles: Vehicle[] = [];
  const lampMats: THREE.MeshStandardMaterial[] = [];
  const windowMats: THREE.MeshStandardMaterial[] = [];
  const headMats: THREE.MeshStandardMaterial[] = [];
  const npcs: NPC[] = [];
  const extras: THREE.Object3D[] = [];

  const mat = (color: number, rough = 0.85, metal = 0) => {
    const key = `${color}-${rough}-${metal}`;
    let m = matCache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: true });
      matCache.set(key, m);
    }
    return m;
  };

  const box = (
    parent: THREE.Object3D, w: number, h: number, d: number, color: number,
    x: number, y: number, z: number, opts: { cast?: boolean; rough?: number; metal?: number; material?: THREE.Material } = {},
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.material ?? mat(color, opts.rough ?? 0.85, opts.metal ?? 0));
    m.position.set(x, y, z);
    m.castShadow = opts.cast ?? true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const cyl = (
    parent: THREE.Object3D, rt: number, rb: number, h: number, color: number,
    x: number, y: number, z: number, seg = 12, rough = 0.85,
  ) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, rough));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const solid = (x: number, z: number, hw: number, hd: number) =>
    colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
  const place = (obj: THREE.Object3D, x: number, y: number, z: number) => {
    obj.position.set(x, y, z);
    scene.add(obj);
    return obj;
  };
  const sign = (parent: THREE.Object3D, text: string, w: number, h: number, bg: string, fg: string, x: number, y: number, z: number, ry = 0) => {
    const s = makeSign(text, w, h, bg, fg);
    s.position.set(x, y, z);
    s.rotation.y = ry;
    parent.add(s);
    extras.push(s);
    return s;
  };

  // ===================== GROUND & STREET =====================
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), mat(0xb89560, 1));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const strip = (cx: number, cz: number, w: number, d: number, color: number, y = 0.01) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color, 1));
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx, y, cz);
    m.receiveShadow = true;
    scene.add(m);
  };
  strip(0, -3, 32, 18, 0xe3c48f); // compound earth
  strip(0, 8.25, 160, 4.5, 0xbab5a8); // north pavement
  strip(0, 14, 160, 7, 0x2a2c32); // asphalt
  strip(0, 21.75, 160, 8.5, 0xbab5a8); // south pavement
  strip(0, -1.2, 12, 8, 0x14664a, 0.02); // prayer mat
  strip(0, -1.2, 11, 7, 0x1b8a64, 0.025);

  for (let x = -70; x < 70; x += 4.5) box(scene, 2.2, 0.01, 0.18, 0xf2f2f2, x, 0.03, 14, { cast: false });
  for (let x = -44; x < 44; x += 2) {
    const c = ((x + 44) / 2) % 2 === 0 ? 0xffc61a : 0x1a1a1a;
    box(scene, 2, 0.18, 0.35, c, x + 1, 0.09, 10.5);
    box(scene, 2, 0.18, 0.35, c, x + 1, 0.09, 17.5);
  }

  // ===================== COMPOUND WALLS =====================
  const wallMat = mat(0xe0f2fe, 0.9);
  const wallCap = mat(0x38bdf8, 0.8);
  const wall = (cx: number, cz: number, w: number, d: number) => {
    box(scene, w, 2.2, d, 0, cx, 1.1, cz, { material: wallMat });
    box(scene, w + 0.1, 0.18, d + 0.1, 0, cx, 2.29, cz, { material: wallCap });
    solid(cx, cz, w / 2, d / 2);
  };
  wall(-9.25, 6, 13.5, 0.5);
  wall(9.25, 6, 13.5, 0.5);
  wall(-16, -3, 0.5, 18.5);
  wall(16, -3, 0.5, 18.5);
  wall(0, -12, 32.5, 0.5);

  const pillar = (x: number) => {
    box(scene, 0.9, 3.4, 0.9, 0xbae6fd, x, 1.7, 6);
    box(scene, 1.05, 0.2, 1.05, 0x0284c7, x, 3.45, 6);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffd36a, emissiveIntensity: 0.2 }),
    );
    lamp.position.set(x, 3.8, 6);
    scene.add(lamp);
    lampMats.push(lamp.material as THREE.MeshStandardMaterial);
    solid(x, 6, 0.45, 0.45);
  };
  pillar(-2.9);
  pillar(2.9);
  sign(scene, 'MAHD IQRA, Ejigbo', 5.4, 0.7, '#0284c7', '#ffd978', 0, 3.75, 6.05);

  // ===================== MOSQUE =====================
  const mosque = new THREE.Group();
  box(mosque, 17, 5.5, 8, 0x7dd3fc, 0, 2.75, -9);
  box(mosque, 17.4, 0.4, 8.4, 0x0284c7, 0, 5.7, -9);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x38bdf8, 0.3, 0.2));
  dome.position.set(0, 5.9, -9);
  dome.castShadow = true;
  mosque.add(dome);
  const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.09, 8, 18, Math.PI * 1.5), mat(0xffd700, 0.2, 0.9));
  crescent.position.set(0, 10.1, -9);
  crescent.rotation.z = Math.PI / 4;
  mosque.add(crescent);
  cyl(mosque, 0.06, 0.06, 1, 0xffd700, 0, 9.6, -9, 6);

  for (const s of [-1, 1]) {
    cyl(mosque, 0.8, 1.0, 11, 0xbae6fd, 7.4 * s, 5.5, -8.4, 14);
    cyl(mosque, 1.15, 1.15, 0.3, 0x0284c7, 7.4 * s, 9.2, -8.4, 14);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.2, 14), mat(0x38bdf8, 0.3, 0.2));
    cap.position.set(7.4 * s, 11.5, -8.4);
    cap.castShadow = true;
    mosque.add(cap);
    box(mosque, 0.5, 0.35, 0.35, 0x444444, 7.4 * s + 0.9, 9.6, -8.4);
    box(mosque, 0.5, 0.35, 0.35, 0x444444, 7.4 * s - 0.9, 9.6, -8.4);
  }

  const winMat = new THREE.MeshStandardMaterial({ color: 0x1b2a4a, emissive: 0xffd36a, emissiveIntensity: 0, roughness: 0.3 });
  windowMats.push(winMat);
  for (const x of [-6.5, -4, 4, 6.5]) {
    box(mosque, 1.1, 1.6, 0.1, 0, x, 3, -4.97, { material: winMat, cast: false });
    const arch = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16, 0, Math.PI), winMat);
    arch.position.set(x, 3.8, -4.97);
    mosque.add(arch);
  }
  box(mosque, 2.2, 3.2, 0.12, 0x2a1a0e, 0, 1.6, -4.96, { cast: false });
  const doorArch = new THREE.Mesh(new THREE.CircleGeometry(1.1, 18, 0, Math.PI), mat(0x2a1a0e));
  doorArch.position.set(0, 3.2, -4.96);
  mosque.add(doorArch);

  box(mosque, 17, 0.25, 1.8, 0x0284c7, 0, 3.7, -4.2);
  for (let x = -7.5; x <= 7.5; x += 2.5) cyl(mosque, 0.16, 0.2, 3.6, 0xe0f2fe, x, 1.8, -3.4, 10);
  scene.add(mosque);
  solid(0, -8.5, 8.5, 4.6);

  // ===================== CLASS SHEDS =====================
  const shed = (x: number, z: number, label: string) => {
    const g = new THREE.Group();
    for (const [px, pz] of [[-2.2, -1.5], [2.2, -1.5], [-2.2, 1.5], [2.2, 1.5]]) cyl(g, 0.1, 0.1, 3, 0x6d4c41, px, 1.5, pz, 8);
    const roof = box(g, 5.4, 0.12, 3.8, 0xb5532a, 0, 3.05, 0, { metal: 0.4, rough: 0.5 });
    roof.rotation.x = 0.08;
    for (let i = -2.5; i <= 2.5; i += 0.5) box(g, 0.08, 0.1, 3.8, 0x8f3f1e, i, 3.15, 0, { cast: false });
    for (const bz of [-0.7, 0.7]) box(g, 3.6, 0.1, 0.45, 0x8d6e63, 0, 0.5, bz);
    box(g, 4, 0.9, 0.08, 0x1c2b24, 0, 1.6, -1.55);
    sign(g, label, 3.6, 0.6, '#0284c7', '#fff6e0', 0, 2.6, -1.5);
    place(g, x, 0, z);
    solid(x, z - 1.5, 2.3, 0.2);
  };
  shed(-11.5, -5, 'IBTIDAI CLASS');
  shed(11.5, -5, 'ADULT CLASS');

  // ===================== WATER TANK & WELL =====================
  const tank = new THREE.Group();
  for (const [px, pz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) cyl(tank, 0.07, 0.07, 3.2, 0x555b60, px, 1.6, pz, 8);
  box(tank, 1.8, 0.1, 1.8, 0x555b60, 0, 3.2, 0);
  cyl(tank, 0.9, 0.9, 1.3, 0x1e88e5, 0, 3.9, 0, 18);
  cyl(tank, 0.92, 0.92, 0.06, 0x0d47a1, 0, 4.58, 0, 18);
  for (const tx of [-0.5, 0, 0.5]) cyl(tank, 0.04, 0.04, 0.3, 0xc0c0c0, tx, 0.9, 0.9, 6);
  for (const kx of [-0.5, 0.1, 0.6]) cyl(tank, 0.1, 0.12, 0.25, 0xfacc15, kx, 0.13, 1.4, 10, 0.4);
  place(tank, -12.5, 0, 2.5);
  solid(-12.5, 2.5, 1.1, 1.1);

  const well = new THREE.Group();
  const wellWall = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 1, 14, 1, true), mat(0x8a8d8f, 0.95));
  wellWall.position.y = 0.5;
  wellWall.castShadow = true;
  well.add(wellWall);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.15, 14), new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.1, metalness: 0.5 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.4;
  well.add(water);
  for (const px of [-1, 1]) cyl(well, 0.08, 0.08, 2.3, 0x6d4c41, px, 1.15, 0, 6);
  const wRoof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.8, 4), mat(0x8d6e63));
  wRoof.position.y = 2.5;
  wRoof.rotation.y = Math.PI / 4;
  wRoof.castShadow = true;
  well.add(wRoof);
  place(well, -7, 0, 1);
  solid(-7, 1, 1.3, 1.3);

  // ===================== FRIDAY SARAA CANOPY =====================
  const saraa = new THREE.Group();
  for (const [px, pz] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) cyl(saraa, 0.07, 0.07, 2.8, 0xb0bec5, px, 1.4, pz, 8);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1, 4), mat(0xfbc02d, 0.7));
  canopy.position.y = 3.2;
  canopy.rotation.y = Math.PI / 4;
  canopy.castShadow = true;
  saraa.add(canopy);
  box(saraa, 2.4, 0.8, 1.2, 0xffffff, 0, 0.4, 0);
  cyl(saraa, 0.38, 0.38, 0.4, 0xd32f2f, -0.65, 1, 0, 12, 0.4);
  cyl(saraa, 0.38, 0.38, 0.4, 0x388e3c, 0.65, 1, 0, 12, 0.4);
  for (let i = -1; i <= 1; i++) {
    box(saraa, 0.5, 0.5, 0.5, 0xe53935, i * 0.9, 0.25, 2.4);
    box(saraa, 0.5, 0.05, 0.5, 0xb71c1c, i * 0.9, 0.52, 2.4);
  }
  place(saraa, 8, 0, 2);
  solid(8, 2, 1.3, 0.7);

  // Generator
  const gen = new THREE.Group();
  box(gen, 1.6, 1.1, 1, 0xd9622b, 0, 0.55, 0);
  box(gen, 1.2, 0.35, 0.8, 0x222222, 0, 1.25, 0);
  cyl(gen, 0.06, 0.06, 0.8, 0x333333, 0.6, 1.6, 0, 6);
  sign(gen, 'I BETTER PASS MY NEIGHBOUR', 1.5, 0.4, '#222', '#ffc61a', 0, 0.7, 0.52);
  place(gen, 13, 0, 3.5);
  solid(13, 3.5, 0.85, 0.55);

  // ===================== TREES =====================
  const tree = (x: number, z: number, s = 1) => {
    const g = new THREE.Group();
    cyl(g, 0.25, 0.35, 2.6, 0x5d4037, 0, 1.3, 0, 8);
    const f1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.7), mat(0x2e7d32));
    f1.position.y = 3.4;
    f1.castShadow = true;
    g.add(f1);
    const f2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1), mat(0x388e3c));
    f2.position.set(0.9, 4.1, 0.3);
    g.add(f2);
    g.scale.setScalar(s);
    place(g, x, 0, z);
    solid(x, z, 0.4 * s, 0.4 * s);
  };
  [[-13, -9], [13, -9], [-14, 4.5], [14.5, 1], [-3.5, 4.4], [4, 4.6], [-30, 8.3], [30, 8.3], [-22, 23], [26, 23], [-38, 23], [38, 8.3]].forEach(([x, z]) => tree(x, z));

  // ===================== NEPA POLES, CABLES & LAMPS =====================
  const poleTops: THREE.Vector3[] = [];
  for (let x = -36; x <= 36; x += 12) {
    const g = new THREE.Group();
    cyl(g, 0.12, 0.18, 7, 0x6b4f3a, 0, 3.5, 0, 8);
    box(g, 1.8, 0.12, 0.12, 0x5a3f2c, 0, 6.6, 0);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffd36a, emissiveIntensity: 0.2 }),
    );
    bulb.position.set(0, 6.4, 1.0);
    g.add(bulb);
    box(g, 0.1, 0.1, 1.0, 0x333333, 0, 6.55, 0.5, { cast: false });
    lampMats.push(bulb.material as THREE.MeshStandardMaterial);
    place(g, x, 0, 9.4);
    solid(x, 9.4, 0.2, 0.2);
    poleTops.push(new THREE.Vector3(x, 6.6, 9.4));
  }
  const cableMat = new THREE.LineBasicMaterial({ color: 0x111111 });
  for (let i = 0; i < poleTops.length - 1; i++) {
    for (const dx of [-0.8, 0, 0.8]) {
      const a = poleTops[i].clone().add(new THREE.Vector3(dx, 0, 0));
      const b = poleTops[i + 1].clone().add(new THREE.Vector3(dx, 0, 0));
      const mid = a.clone().lerp(b, 0.5);
      mid.y -= 0.5;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(12)), cableMat);
      scene.add(line);
      extras.push(line);
    }
  }

  // ===================== STREET VENDORS =====================
  const buka = new THREE.Group();
  box(buka, 3.2, 1, 1.2, 0x8d6e63, 0, 0.5, 0);
  box(buka, 3.3, 0.08, 1.3, 0xefe0c0, 0, 1.02, 0);
  cyl(buka, 0.4, 0.4, 0.45, 0x3e3e3e, -0.9, 1.3, 0, 12, 0.4);
  cyl(buka, 0.4, 0.4, 0.45, 0xd32f2f, 0, 1.3, 0, 12, 0.4);
  cyl(buka, 0.35, 0.35, 0.4, 0x2e7d32, 0.9, 1.3, 0, 12, 0.4);
  cyl(buka, 0.06, 0.06, 3.2, 0xdddddd, 0, 1.6, -0.6, 6);
  const umb = new THREE.Mesh(new THREE.ConeGeometry(2.6, 0.7, 10), mat(0xe53935, 0.7));
  umb.position.set(0, 3.3, -0.6);
  umb.castShadow = true;
  buka.add(umb);
  const umb2 = new THREE.Mesh(new THREE.ConeGeometry(2.62, 0.5, 10, 1, true, 0, Math.PI / 2), mat(0x1e88e5, 0.7));
  umb2.position.set(0, 3.38, -0.6);
  buka.add(umb2);
  box(buka, 3, 0.1, 0.5, 0x6d4c41, 0, 0.45, 1.4);
  sign(buka, 'IYA BASIRA - AMALA & EWEDU', 3.2, 0.55, '#d32f2f', '#fff6e0', 0, 2.25, 0.7);
  place(buka, -10, 0, 21);
  solid(-10, 21, 1.7, 0.7);

  const kiosk = new THREE.Group();
  box(kiosk, 2.8, 2.4, 2.2, 0x1b8a64, 0, 1.2, 0);
  box(kiosk, 3.2, 0.2, 2.6, 0xf5b335, 0, 2.5, 0);
  box(kiosk, 2.2, 0.9, 0.08, 0x111827, 0, 1.4, 1.12, { cast: false });
  box(kiosk, 2.4, 0.08, 0.7, 0x8d6e63, 0, 0.95, 1.4);
  for (let i = -1; i <= 1; i++) box(kiosk, 0.4, 0.28, 0.1, [0xe53935, 0x1e88e5, 0xfacc15][i + 1], i * 0.6, 1.1, 1.4);
  sign(kiosk, 'ISLAMIC BOOKS & ATTAR', 2.8, 0.5, '#10201a', '#ffd978', 0, 2.85, 1.25);
  place(kiosk, 10, 0, 21);
  solid(10, 21, 1.6, 1.3);

  // ===================== BUS STOPS & NEIGHBOURHOOD HUBS =====================
  const makeBusStop = (x: number, z: number, label: string) => {
    const stop = new THREE.Group();
    for (const px of [-1.8, 1.8]) cyl(stop, 0.08, 0.08, 2.8, 0x444444, px, 1.4, 0, 8);
    box(stop, 4, 0.12, 1.8, 0xffc61a, 0, 2.85, 0);
    box(stop, 3.6, 0.08, 0.5, 0x333333, 0, 0.55, -0.4);
    sign(stop, label, 3.6, 0.5, '#111', '#ffc61a', 0, 2.3, 0.92);
    place(stop, x, 0, z);
    solid(x, z - 0.3, 2, 0.4);
  };
  makeBusStop(24, 8.6, 'BUS STOP - EJIGBO');
  makeBusStop(46, 8.6, 'BUS STOP - ISOLO');
  makeBusStop(-46, 8.6, 'BUS STOP - IDIMU');

  // East Hub: Isolo Estate Duplex (Home Lesson destination)
  const duplex = new THREE.Group();
  box(duplex, 8, 5.2, 6, 0xfff8e7, 0, 2.6, 0);
  box(duplex, 8.4, 0.35, 6.4, 0x0284c7, 0, 5.35, 0);
  box(duplex, 5, 0.2, 1.6, 0xe2e8f0, 0, 2.8, 3.6);
  for (const px of [-2, 2]) cyl(duplex, 0.15, 0.18, 2.8, 0xffffff, px, 1.4, 4.1, 10);
  box(duplex, 1.6, 2.4, 0.12, 0x3e2723, 0, 1.2, 3.02, { cast: false });
  sign(duplex, 'ISOLO ESTATE - HOME LESSON', 4.6, 0.6, '#0284c7', '#fff6e0', 0, 4.4, 3.06);
  place(duplex, 55, 0, 2.5);
  solid(55, 2.5, 4.2, 3.2);

  // West Hub: Idimu Central Mosque Pavilion (Friday Khutbah destination)
  const idimu = new THREE.Group();
  box(idimu, 9, 4.6, 6.5, 0xe0f2fe, 0, 2.3, 0);
  box(idimu, 9.4, 0.35, 6.9, 0x0d6b4c, 0, 4.75, 0);
  const iDome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x1a8f64, 0.3, 0.2));
  iDome.position.set(0, 4.9, 0);
  iDome.castShadow = true;
  idimu.add(iDome);
  sign(idimu, 'IDIMU CENTRAL MOSQUE', 4.8, 0.6, '#0d6b4c', '#ffd978', 0, 3.9, 3.3);
  place(idimu, -55, 0, 2.5);
  solid(-55, 2.5, 4.6, 3.3);

  // ===================== BACKDROP TENEMENTS =====================
  const palette = [0xe8c39e, 0xc9d6a3, 0xe7a98f, 0xa9c5d8, 0xf0dc9a, 0xd6b2c9, 0xbfa58a];
  const building = (x: number, z: number, w: number, h: number, d: number, color: number, face: 1 | -1 | 0) => {
    box(scene, w, h, d, color, x, h / 2, z);
    box(scene, w + 0.4, 0.3, d + 0.4, 0x9a4a24, x, h + 0.15, z, { metal: 0.4, rough: 0.5 });
    if (face !== 0) {
      const wm = new THREE.MeshStandardMaterial({ color: 0x2b3a55, emissive: 0xffd36a, emissiveIntensity: 0, roughness: 0.3 });
      windowMats.push(wm);
      const rows = Math.max(1, Math.floor((h - 1) / 2.2));
      const cols = Math.max(1, Math.floor(w / 2.2));
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          box(scene, 0.9, 1.1, 0.08, 0, x - w / 2 + (c + 0.5) * (w / cols), 1.6 + r * 2.2, z + face * (d / 2 + 0.02), { material: wm, cast: false });
        }
    }
  };
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let x = -63; x <= 63; x += 9) {
    building(x, 32, 8, 6 + rnd() * 7, 6, palette[Math.floor(rnd() * palette.length)], -1);
    building(x, -30, 8, 6 + rnd() * 9, 6, palette[Math.floor(rnd() * palette.length)], 1);
  }
  for (let z = -22; z <= 26; z += 9) {
    building(-68, z, 6, 6 + rnd() * 6, 8, palette[Math.floor(rnd() * palette.length)], 0);
    building(68, z, 6, 6 + rnd() * 6, 8, palette[Math.floor(rnd() * palette.length)], 0);
  }

  // ===================== VEHICLES =====================
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xfff1a0, emissiveIntensity: 0.2 });
  headMats.push(headMat);

  const addWheel = (g: THREE.Group, wheels: THREE.Group[], x: number, z: number, r: number) => {
    const p = new THREE.Group();
    p.position.set(x, r, z);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 14), mat(0x161616, 0.9));
    w.rotation.x = Math.PI / 2;
    w.castShadow = true;
    p.add(w);
    box(p, r * 0.9, r * 0.2, 0.34, 0x999999, 0, 0, 0, { cast: false });
    g.add(p);
    wheels.push(p);
  };

  const makeDanfo = (z: number, dir: 1 | -1, speed: number, x0: number, label: string) => {
    const g = new THREE.Group();
    const wheels: THREE.Group[] = [];
    box(g, 5, 1.6, 2, 0xffc61a, 0, 1.1, 0);
    box(g, 5.02, 0.35, 2.02, 0x1a1a1a, 0, 0.75, 0, { cast: false });
    box(g, 4.4, 0.2, 1.9, 0xf0f0f0, 0, 1.98, 0);
    box(g, 4.4, 0.12, 1.5, 0x888888, 0, 2.15, 0);
    box(g, 1.2, 0.9, 2.02, 0x1b2a4a, 1.6, 1.5, 0, { cast: false });
    for (const wx of [-1.7, -0.5, 0.7]) {
      box(g, 0.9, 0.7, 2.06, 0x1b2a4a, wx, 1.55, 0, { cast: false });
    }
    for (const hz of [-0.7, 0.7]) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), headMat);
      h.position.set(2.5, 0.95, hz);
      g.add(h);
    }
    box(g, 0.1, 0.25, 1.9, 0x555555, 2.52, 0.4, 0);
    sign(g, label, 2.4, 0.35, '#111', '#ffc61a', 0.4, 2.35, 1.02);
    const back = makeSign(label, 2.4, 0.35, '#111', '#ffc61a');
    back.position.set(0.4, 2.35, -1.02);
    back.rotation.y = Math.PI;
    g.add(back);
    extras.push(back);
    for (const wx of [-1.6, 1.6]) for (const wz of [-0.95, 0.95]) addWheel(g, wheels, wx, wz, 0.42);
    g.position.set(x0, 0, z);
    g.rotation.y = dir === 1 ? 0 : Math.PI;
    scene.add(g);
    vehicles.push({ group: g, speed, dir, wheels, wheelR: 0.42, minX: -75, maxX: 75 });
  };

  const makeKeke = (z: number, dir: 1 | -1, speed: number, x0: number) => {
    const g = new THREE.Group();
    const wheels: THREE.Group[] = [];
    box(g, 2.4, 1.0, 1.4, 0xffc61a, -0.2, 0.9, 0);
    box(g, 2.45, 0.28, 1.45, 0x1a1a1a, -0.2, 0.55, 0, { cast: false });
    box(g, 2.2, 0.1, 1.5, 0x1b8a64, -0.3, 1.9, 0);
    for (const pz of [-0.65, 0.65]) cyl(g, 0.04, 0.04, 0.9, 0x333333, -1.2, 1.45, pz, 6);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), headMat);
    lamp.position.set(1.0, 0.9, 0);
    g.add(lamp);
    addWheel(g, wheels, 0.9, 0, 0.3);
    addWheel(g, wheels, -1.1, -0.65, 0.3);
    addWheel(g, wheels, -1.1, 0.65, 0.3);
    g.position.set(x0, 0, z);
    g.rotation.y = dir === 1 ? 0 : Math.PI;
    scene.add(g);
    vehicles.push({ group: g, speed, dir, wheels, wheelR: 0.3, minX: -75, maxX: 75 });
  };

  makeDanfo(11.6, 1, 6, -40, 'OJUELEGBA-YABA');
  makeDanfo(11.6, 1, 6, 20, 'MUSHIN-OSHODI');
  makeDanfo(16.4, -1, 5.5, 30, 'IKEJA-CMS');
  makeDanfo(16.4, -1, 5.5, -30, 'AGEGE-OBALENDE');
  makeKeke(13.3, 1, 8, -10);
  makeKeke(14.7, -1, 8.5, 5);

  // Dedicated player-chartered Danfo (used when hopping on a bus)
  makeDanfo(10.8, 1, 0, 24, 'CHARTER - EXPRESS');
  const rideBusVehicle = vehicles.pop()!;
  rideBusVehicle.group.visible = false;
  const rideBus = { group: rideBusVehicle.group, wheels: rideBusVehicle.wheels, wheelR: rideBusVehicle.wheelR };

  // ===================== PEOPLE =====================
  const addNPC = (
    id: string, name: string, title: string, x: number, z: number, rotY: number, idlePose: Pose,
    opts: Omit<CharacterOptions, 'skin'> & { skin?: number }, lines: string[],
    patrol?: { ax: number; az: number; bx: number; bz: number; speed: number },
  ) => {
    const char = buildCharacter({ ...opts, skin: opts.skin ?? SKIN[Math.floor(rnd() * SKIN.length)] });
    char.group.position.set(x, 0, z);
    char.group.rotation.y = rotY;
    char.setPose(idlePose);
    scene.add(char.group);
    npcs.push({ id, name, title, char, lines, idlePose, patrol: patrol ? { ...patrol, t: 0, dir: 1 } : undefined });
  };

  addNPC('alfa', 'Baba Kewu', 'Grand Alfa', 0, -2.6, 0, 'alfa',
    { robe: 0x1b5e20, trim: 0xffd700, cap: 'turban', capColor: 0xffffff, beard: 0xe8e8e8, prop: 'cane', skin: 0x5d3a1a, scale: 1.08 },
    ['Ta la\'a! Read it out loud!', 'Who has not washed his slate?', 'Ilm without adab is nothing.', 'Moruf! Stop sleeping!']);

  const students: [string, string, number, number, number][] = [
    ['moruf', 'Moruf', -2.2, -0.5, 0xffffff], ['bilal', 'Bilal', -1.0, 0.9, 0x90caf9],
    ['abdul', 'Abdul', 1.0, 0.9, 0xa5d6a7], ['luqman', 'Luqman', 2.2, -0.5, 0xffcc80],
  ];
  students.forEach(([id, name, x, z, c]) =>
    addNPC(id, name, 'Omo Kewu', x, z, Math.PI + (x > 0 ? 0.3 : -0.3), 'recite',
      { robe: c, cap: 'kofia', capColor: 0xffffff, prop: 'slate', scale: 0.78, trim: 0x14805c },
      ['Alif, Ba, Ta...', 'Walaah wey dry!', 'Bismillah...', 'Abeg, the verse don vanish!']));

  addNPC('hajia', 'Alhaja Sidikat', 'Saraa Mama', 6.2, 3.6, -0.6, 'wave',
    { robe: 0x7e57c2, trim: 0xffd978, cap: 'hijab', capColor: 0xe1bee7, female: true, skin: 0x5d3a1a },
    ['Come and eat, my child!', 'Barakah for everybody!', 'Rice is ready o!']);
  addNPC('basira', 'Iya Basira', 'Amala Queen', -10, 19.8, 0, 'wave',
    { robe: 0xd32f2f, trim: 0xfff6e0, cap: 'hijab', capColor: 0xffffff, female: true, skin: 0x4a2c17 },
    ['Amala and gbegiri hot!', 'Ewedu don sweet!', 'Customer, come buy!']);
  addNPC('mallam', 'Mallam Idris', 'Book Seller', 10, 19.6, 0, 'idle',
    { robe: 0xf5f5dc, trim: 0x1b8a64, cap: 'kofia', capColor: 0xffffff, beard: 0x333333, prop: 'tesbih', skin: 0x7a4a24 },
    ['Attar and Qurans here!', 'Knowledge is light.', 'Quality kofia, fair price.']);
  addNPC('waiter', 'Tunde', 'Danfo Passenger', 23, 9.4, 0, 'idle',
    { robe: 0x546e7a, trim: 0xffc61a, cap: 'fila', capColor: 0xb71c1c, skin: 0x5d3a1a },
    ['Conductor, wetin dey happen?', 'Ojuelegba! Ojuelegba!', 'This go-slow wan kill me.']);

  addNPC('kettle', 'Fatai', 'Water Carrier', -6, 4, 0, 'walk',
    { robe: 0xb3e5fc, cap: 'kofia', capColor: 0xffffff, prop: 'kettle', scale: 0.82, trim: 0x14805c },
    ['Omi tutu for ablution!', 'Make way, hot water!'], { ax: -6, az: 4, bx: 6, bz: 4, speed: 1.4 });
  addNPC('ped1', 'Mama Ngozi', 'Trader', -30, 8.2, 0, 'walk',
    { robe: 0xf06292, trim: 0xffffff, cap: 'hijab', capColor: 0xfce4ec, female: true, skin: 0x3b2314 },
    ['How market?', 'Everything cost now!'], { ax: -34, az: 8.2, bx: 12, bz: 8.2, speed: 1.6 });
  addNPC('ped2', 'Bro Emeka', 'Hustler', 30, 19, 0, 'walk',
    { robe: 0x2e7d32, trim: 0xffffff, cap: 'fila', capColor: 0x1565c0, skin: 0x5d3a1a },
    ['We move!', 'Lagos no dey sleep.', 'E go better.'], { ax: 34, az: 19, bx: -4, bz: 19, speed: 1.8 });
  addNPC('ped3', 'Aunty Kemi', 'Passer-by', -4, 19.3, 0, 'walk',
    { robe: 0xffb300, trim: 0x6a1b9a, cap: 'hijab', capColor: 0x6a1b9a, female: true, skin: 0x7a4a24 },
    ['Excuse me please!', 'Ah! This sun!'], { ax: -38, az: 19.3, bx: 6, bz: 19.3, speed: 1.4 });
  addNPC('ped4', 'Ustadh Hamza', 'Senior Teacher', 9.5, -3.5, 0, 'idle',
    { robe: 0xffffff, trim: 0x0284c7, cap: 'turban', capColor: 0xeeeeee, beard: 0x222222, prop: 'tesbih', skin: 0x4a2c17 },
    ['As-salamu alaykum!', 'Bring me hot amala from Iya Basira!', 'Al-Ajurrumiyyah class is open in the Adult Shed.']);
  addNPC('alhaji', 'Alhaji Musa', 'Isolo Patron', 55, 6.8, 0, 'wave',
    { robe: 0x1e3a8a, trim: 0xffd700, cap: 'fila', capColor: 0xffd700, beard: 0x444444, skin: 0x5d3a1a },
    ['Welcome, Ustadh! The children are ready for Home Lesson!', 'Teach them Quran and good character!']);
  addNPC('imam', 'Sheikh Sulaiman', 'Idimu Chief Imam', -55, 6.8, 0, 'idle',
    { robe: 0x0d6b4c, trim: 0xffd700, cap: 'turban', capColor: 0xffffff, beard: 0xdddddd, prop: 'cane', skin: 0x3b2314 },
    ['Welcome to Idimu Central Mosque!', 'Ascend the minbar when you are ready for the Khutbah.']);

  const dispose = () => {
    npcs.forEach((n) => n.char.dispose());
    matCache.forEach((m) => m.dispose());
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh || (o as THREE.Line).isLine) {
        (m as THREE.Mesh).geometry?.dispose();
        const mt = (m as THREE.Mesh).material as THREE.Material | THREE.Material[];
        const disposeMat = (x: THREE.Material) => {
          const map = (x as THREE.MeshBasicMaterial).map;
          if (map) map.dispose();
          x.dispose();
        };
        if (Array.isArray(mt)) mt.forEach(disposeMat);
        else if (mt) disposeMat(mt);
      }
    });
  };

  return { colliders, vehicles, rideBus, lampMats, windowMats, headMats, npcs, dispose };
}
