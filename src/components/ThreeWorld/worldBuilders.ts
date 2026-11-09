import * as THREE from 'three';
import { buildCharacter, Character, CharacterOptions, Pose } from './characterBuilder';
import { FurnitureTransform, MountVehicle } from '@/types/game';

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

export interface FurnitureItem {
  tierId: string;
  furnitureKey: string;
  group: THREE.Object3D;
  baseX: number;
  baseY: number;
  baseZ: number;
  baseRotY: number;
  upgradeId?: string;
  defaultFor?: string;
}

export interface WorldHandles {
  colliders: Collider[];
  vehicles: Vehicle[];
  rideBus: { group: THREE.Group; wheels: THREE.Group[]; wheelR: number };
  lampMats: THREE.MeshStandardMaterial[];
  windowMats: THREE.MeshStandardMaterial[];
  headMats: THREE.MeshStandardMaterial[];
  npcs: NPC[];
  fanRotors: THREE.Object3D[];
  syncUpgrades: (
    upgrades: string[],
    activeTier: string,
    furnitureLayout?: Record<string, FurnitureTransform>,
    mountVehicle?: MountVehicle,
  ) => void;
  syncHouseAccess: (activeTier: string) => void;
  furnitureRegistry: FurnitureItem[];
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
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xfff1a0, emissiveIntensity: 0.2 });
  headMats.push(headMat);
  const npcs: NPC[] = [];
  const extras: THREE.Object3D[] = [];
  const fanRotors: THREE.Object3D[] = [];
  const furnitureRegistry: FurnitureItem[] = [];
  const registerFurniture = (item: FurnitureItem) => {
    if (item.upgradeId) {
      item.group.visible = false;
    }
    furnitureRegistry.push(item);
  };

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
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 140), mat(0xb89560, 1));
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
  strip(0, 8.25, 600, 4.5, 0xbab5a8); // north pavement
  strip(0, 14, 600, 7, 0x2a2c32); // asphalt
  strip(0, 21.75, 600, 8.5, 0xbab5a8); // south pavement
  strip(0, -1.2, 12, 8, 0x14664a, 0.02); // prayer mat
  strip(0, -1.2, 11, 7, 0x1b8a64, 0.025);

  for (let x = -270; x < 270; x += 5) box(scene, 2.4, 0.01, 0.18, 0xf2f2f2, x, 0.03, 14, { cast: false });
  for (let x = -260; x < 260; x += 4) {
    const c = ((x + 260) / 4) % 2 === 0 ? 0xffc61a : 0x1a1a1a;
    box(scene, 4, 0.18, 0.35, c, x + 2, 0.09, 10.5);
    box(scene, 4, 0.18, 0.35, c, x + 2, 0.09, 17.5);
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
  // East wall with a wide scholar archway leading to the 3D Classroom Hall & Residential Quarters
  wall(16, -7.25, 0.5, 9.5);
  wall(16, 3.75, 0.5, 4.5);
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

  // ===================== WALKABLE 3D CLASSROOM HALL & 4 RESIDENTIAL HOUSES =====================
  // Paved Scholars Avenue connecting Compound -> Classroom Hall -> Ruwaq -> Student Room -> Mini-Flat -> Villa
  strip(74, -2.5, 116, 4.2, 0xd6c7b2, 0.018);

  // Helper to build a cutaway open-top room shell with a front doorway at (cx, cz + d/2)
  const buildRoomShell = (
    cx: number,
    cz: number,
    w: number,
    d: number,
    wallColor: number,
    trimColor: number,
    floorColor: number,
    doorWidth = 3.2,
    wallH = 2.1,
  ) => {
    strip(cx, cz, w - 0.3, d - 0.3, floorColor, 0.022);
    const wMat = mat(wallColor, 0.88);
    const tMat = mat(trimColor, 0.7);
    const wallSeg = (wx: number, wz: number, ww: number, wd: number, h = wallH) => {
      box(scene, ww, h, wd, 0, wx, h / 2, wz, { material: wMat });
      box(scene, ww + 0.06, 0.14, wd + 0.06, 0, wx, h + 0.07, wz, { material: tMat });
      solid(wx, wz, ww / 2, wd / 2);
    };
    // Back wall (North, z = cz - d/2)
    wallSeg(cx, cz - d / 2, w, 0.36, wallH + 0.4);
    // Left & Right cutaway walls (height 1.55m so orbit camera never gets blocked)
    wallSeg(cx - w / 2, cz, 0.36, d, 1.55);
    wallSeg(cx + w / 2, cz, 0.36, d, 1.55);
    // Front wall with doorway gap
    const sideW = (w - doorWidth) / 2;
    wallSeg(cx - w / 2 + sideW / 2, cz + d / 2, sideW, 0.36, 1.45);
    wallSeg(cx + w / 2 - sideW / 2, cz + d / 2, sideW, 0.36, 1.45);
    // Doorway pillars & overhead sign arch
    for (const s of [-1, 1]) {
      cyl(scene, 0.16, 0.18, 2.9, trimColor, cx + s * (doorWidth / 2), 1.45, cz + d / 2, 10);
    }
    box(scene, doorWidth + 0.6, 0.28, 0.45, trimColor, cx, 2.95, cz + d / 2);
  };

  // Helper to build a 3D Prayer Rug (Sajjadah)
  const buildPrayerRug = (tierId: string, x: number, z: number, color = 0x0d6b4c, border = 0xf5b335) => {
    const g = new THREE.Group();
    box(g, 1.35, 0.02, 2.1, border, 0, 0.015, 0, { cast: false });
    box(g, 1.15, 0.024, 1.85, color, 0, 0.019, 0, { cast: false });
    // Mihrab arch pattern pointing North/East
    const arch = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.38, 12, 1, 0, Math.PI), mat(border, 0.8));
    arch.rotation.x = -Math.PI / 2;
    arch.position.set(0, 0.024, -0.55);
    g.add(arch);
    place(g, x, 0, z);
    registerFurniture({
      tierId,
      furnitureKey: 'rug',
      group: g,
      baseX: x,
      baseY: 0,
      baseZ: z,
      baseRotY: 0,
    });
    return g;
  };

  // Helper to build a 3D Wardrobe / Trunk Box station
  const buildWardrobe = (tierId: string, x: number, z: number, isTrunk = false) => {
    const g = new THREE.Group();
    if (isTrunk) {
      // Classic boarding school metal trunk box (Apoti Irin) + hanging peg rack
      box(g, 1.3, 0.55, 0.75, 0x1d4ed8, 0, 0.28, 0, { metal: 0.5, rough: 0.4 });
      box(g, 1.34, 0.08, 0.79, 0xfacc15, 0, 0.54, 0, { metal: 0.6 });
      box(g, 0.18, 0.14, 0.06, 0xfacc15, 0, 0.38, 0.39);
    } else {
      // Tall wooden 2-door wardrobe
      box(g, 1.4, 2.1, 0.7, 0x5d3a1a, 0, 1.05, 0);
      box(g, 0.64, 1.9, 0.05, 0x7c4d25, -0.34, 1.05, 0.36);
      box(g, 0.64, 1.9, 0.05, 0x7c4d25, 0.34, 1.05, 0.36);
      cyl(g, 0.03, 0.03, 0.18, 0xfacc15, -0.08, 1.05, 0.4, 6);
      cyl(g, 0.03, 0.03, 0.18, 0xfacc15, 0.08, 1.05, 0.4, 6);
    }
    place(g, x, 0, z);
    registerFurniture({
      tierId,
      furnitureKey: 'wardrobe',
      group: g,
      baseX: x,
      baseY: 0,
      baseZ: z,
      baseRotY: 0,
    });
    solid(x, z, 0.7, 0.4);
    return g;
  };

  // Helper to build a complete default Study Desk & Chair set before asset_desk upgrade
  const buildStudyDeskUnit = (tierId: string, x: number, z: number, tableColor = 0x78350f, chairColor = 0x5c2e14) => {
    const g = new THREE.Group();
    // Desk table
    box(g, 1.3, 0.72, 0.75, tableColor, 0, 0.36, 0);
    // Open notebook & pen right in front of student
    box(g, 0.36, 0.03, 0.25, 0xfef3c7, 0, 0.74, -0.05);
    box(g, 0.03, 0.02, 0.22, 0x1e3a8a, 0.22, 0.75, -0.05); // Pen
    // Wooden Study Chair (seat top surface at y = 0.46, center at z = 0.55)
    box(g, 0.55, 0.07, 0.5, chairColor, 0, 0.46, 0.55);
    box(g, 0.55, 0.48, 0.07, chairColor, 0, 0.72, 0.78);
    for (const [cx, cz] of [[-0.22, 0.35], [0.22, 0.35], [-0.22, 0.75], [0.22, 0.75]]) {
      cyl(g, 0.035, 0.03, 0.45, 0x3b1d0e, cx, 0.22, cz, 6);
    }
    place(g, x, 0, z);
    registerFurniture({
      tierId,
      furnitureKey: 'desk',
      group: g,
      baseX: x,
      baseY: 0,
      baseZ: z,
      baseRotY: 0,
      defaultFor: 'asset_desk',
    });
    return g;
  };

  // Helper to build dynamic 3D Lifestyle Assets inside a house so purchased items physically appear in 3D!
  const attachHouseUpgrades = (
    tierId: string,
    bedX: number,
    bedZ: number,
    deskX: number,
    deskZ: number,
    fanX: number,
    fanZ: number,
    shelfX: number,
    shelfZ: number,
    solarX: number,
    solarZ: number,
    bikeX: number,
    bikeZ: number,
  ) => {
    // 1. Orthopedic Foam Mattress & Mosquito Net Canopy (asset_mattress)
    const mattG = new THREE.Group();
    box(mattG, 1.75, 0.34, 2.35, 0x1e40af, 0, 0.22, 0); // Thick blue Mouka foam base
    box(mattG, 1.68, 0.08, 2.25, 0xf8fafc, 0, 0.41, 0); // Quilted white sheet
    box(mattG, 1.2, 0.16, 0.45, 0xffffff, 0, 0.5, -0.82); // Fluffy pillow
    box(mattG, 1.7, 0.09, 1.1, 0x10b981, 0, 0.46, 0.45); // Emerald duvet
    for (const [px, pz] of [[-0.82, -1.1], [0.82, -1.1], [-0.82, 1.1], [0.82, 1.1]]) {
      cyl(mattG, 0.025, 0.025, 1.85, 0xe2e8f0, px, 0.95, pz, 6);
    }
    box(mattG, 1.7, 0.04, 2.25, 0xe0f2fe, 0, 1.88, 0);
    place(mattG, bedX, 0, bedZ);
    registerFurniture({
      tierId,
      furnitureKey: 'bed',
      group: mattG,
      baseX: bedX,
      baseY: 0,
      baseZ: bedZ,
      baseRotY: 0,
      upgradeId: 'asset_mattress',
    });

    // 2. Mahogany Study Desk, Chair & Glowing LED Lantern (asset_desk)
    const deskG = new THREE.Group();
    box(deskG, 1.5, 0.1, 0.85, 0x4a2511, 0, 0.78, 0);
    for (const [lx, lz] of [[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]]) {
      cyl(deskG, 0.05, 0.04, 0.76, 0x3b1d0e, lx, 0.38, lz, 6);
    }
    // Open Mushaf & notebook on desk
    box(deskG, 0.42, 0.04, 0.3, 0x059669, 0, 0.85, -0.05);
    box(deskG, 0.38, 0.05, 0.26, 0xfef3c7, 0, 0.87, -0.05);
    // Rechargeable LED Lantern on side of desk
    cyl(deskG, 0.09, 0.11, 0.12, 0xd97706, -0.55, 0.89, -0.15, 8);
    const lanternBulb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfde047, emissiveIntensity: 1.6 }),
    );
    lanternBulb.position.set(-0.55, 1.05, -0.15);
    deskG.add(lanternBulb);
    // Wooden Study Chair (facing desk, seat top at y = 0.46, center at z = 0.55)
    box(deskG, 0.55, 0.07, 0.52, 0x5c2e14, 0, 0.46, 0.55);
    box(deskG, 0.55, 0.52, 0.07, 0x5c2e14, 0, 0.75, 0.78);
    for (const [cx, cz] of [[-0.22, 0.35], [0.22, 0.35], [-0.22, 0.75], [0.22, 0.75]]) {
      cyl(deskG, 0.035, 0.03, 0.45, 0x3b1d0e, cx, 0.22, cz, 6);
    }
    place(deskG, deskX, 0, deskZ);
    registerFurniture({
      tierId,
      furnitureKey: 'desk',
      group: deskG,
      baseX: deskX,
      baseY: 0,
      baseZ: deskZ,
      baseRotY: 0,
      upgradeId: 'asset_desk',
    });

    // 3. Standing OX Fan with Spinning Blades (asset_fan)
    const fanG = new THREE.Group();
    cyl(fanG, 0.28, 0.32, 0.08, 0x1e293b, 0, 0.04, 0, 14);
    cyl(fanG, 0.035, 0.04, 1.35, 0x94a3b8, 0, 0.72, 0, 8);
    box(fanG, 0.2, 0.2, 0.26, 0x0284c7, 0, 1.42, -0.04);
    const rotor = new THREE.Group();
    rotor.position.set(0, 1.42, 0.12);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.36, 0.02), mat(0x38bdf8, 0.4));
      blade.position.y = 0.16;
      const pivot = new THREE.Group();
      pivot.rotation.z = (b * Math.PI * 2) / 3;
      pivot.add(blade);
      rotor.add(pivot);
    }
    fanG.add(rotor);
    fanRotors.push(rotor);
    place(fanG, fanX, 0, fanZ);
    registerFurniture({
      tierId,
      furnitureKey: 'fan',
      group: fanG,
      baseX: fanX,
      baseY: 0,
      baseZ: fanZ,
      baseRotY: 0,
      upgradeId: 'asset_fan',
    });

    // 4. Private Home Maktabah Bookshelf (asset_maktabah)
    const shelfG = new THREE.Group();
    box(shelfG, 1.65, 2.15, 0.42, 0x451a03, 0, 1.08, 0);
    for (let s = 0; s < 4; s++) {
      const sy = 0.35 + s * 0.48;
      box(shelfG, 1.52, 0.05, 0.38, 0x78350f, 0, sy, 0.02);
      const bookColors = [0x059669, 0xb91c1c, 0x1d4ed8, 0xd97706, 0x7c3aed, 0x0f766e];
      for (let k = -5; k <= 5; k++) {
        box(
          shelfG,
          0.1,
          0.34,
          0.28,
          bookColors[Math.abs(k + s) % bookColors.length],
          k * 0.12,
          sy + 0.19,
          0.04,
        );
      }
    }
    place(shelfG, shelfX, 0, shelfZ);
    registerFurniture({
      tierId,
      furnitureKey: 'maktabah',
      group: shelfG,
      baseX: shelfX,
      baseY: 0,
      baseZ: shelfZ,
      baseRotY: 0,
      upgradeId: 'asset_maktabah',
    });

    // 5. Solar Panel & Inverter System (asset_solar)
    const solarG = new THREE.Group();
    // Wall-mounted white inverter + tubular battery bank
    box(solarG, 0.55, 0.72, 0.25, 0xf8fafc, 0, 1.25, 0);
    box(solarG, 0.14, 0.08, 0.27, 0x10b981, 0, 1.38, 0.01); // Glowing green LED screen
    box(solarG, 0.75, 0.48, 0.42, 0x1e293b, 0, 0.24, 0.1); // Deep-cycle battery
    // Angled blue rooftop solar panel above back wall
    const panel = box(solarG, 2.2, 0.08, 1.3, 0x1d4ed8, 0, 2.65, -0.3, { metal: 0.6, rough: 0.2 });
    panel.rotation.x = 0.32;
    place(solarG, solarX, 0, solarZ);
    registerFurniture({
      tierId,
      furnitureKey: 'solar',
      group: solarG,
      baseX: solarX,
      baseY: 0,
      baseZ: solarZ,
      baseRotY: 0,
      upgradeId: 'asset_solar',
    });

    // 6. Raleigh Scholar Bicycle (asset_bicycle) parked outside front door
    const bikeG = new THREE.Group();
    for (const wx of [-0.55, 0.55]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 18), mat(0x1e293b, 0.8));
      wheel.position.set(wx, 0.34, 0);
      bikeG.add(wheel);
    }
    box(bikeG, 0.95, 0.05, 0.05, 0x059669, 0, 0.56, 0); // Frame top bar
    cyl(bikeG, 0.03, 0.03, 0.65, 0x059669, -0.45, 0.55, 0, 6);
    cyl(bikeG, 0.03, 0.03, 0.75, 0x059669, 0.45, 0.62, 0, 6);
    box(bikeG, 0.12, 0.06, 0.48, 0xcbd5e1, 0.45, 0.96, 0); // Handlebars
    box(bikeG, 0.28, 0.07, 0.18, 0x27272a, -0.38, 0.84, 0); // Saddle
    place(bikeG, bikeX, 0, bikeZ);
    registerFurniture({
      tierId,
      furnitureKey: 'bicycle',
      group: bikeG,
      baseX: bikeX,
      baseY: 0,
      baseZ: bikeZ,
      baseRotY: 0,
      upgradeId: 'asset_bicycle',
    });

    // 7. Bajaj Boxer Motorcycle (asset_okada) parked outside front door
    const motoG = new THREE.Group();
    for (const wx of [-0.72, 0.72]) {
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.09, 10, 18), mat(0x18181b, 0.85));
      tire.position.set(wx, 0.38, 0);
      motoG.add(tire);
      cyl(motoG, 0.16, 0.16, 0.12, 0x94a3b8, wx, 0.38, 0, 10);
    }
    box(motoG, 0.68, 0.34, 0.38, 0xdc2626, 0.15, 0.82, 0, { metal: 0.4, rough: 0.3 }); // Red fuel tank
    box(motoG, 0.78, 0.16, 0.34, 0x18181b, -0.42, 0.76, 0); // Black dual seat
    box(motoG, 0.45, 0.32, 0.3, 0x52525b, 0.05, 0.48, 0); // Engine block
    cyl(motoG, 0.04, 0.04, 0.75, 0xd4d4d8, 0.55, 0.72, 0, 8); // Front fork
    box(motoG, 0.12, 0.07, 0.68, 0xd4d4d8, 0.52, 1.12, 0); // Handlebars
    const mLight = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), headMat);
    mLight.position.set(0.68, 0.94, 0);
    motoG.add(mLight);
    place(motoG, bikeX + 2.4, 0, bikeZ);
    registerFurniture({
      tierId,
      furnitureKey: 'okada',
      group: motoG,
      baseX: bikeX + 2.4,
      baseY: 0,
      baseZ: bikeZ,
      baseRotY: 0,
      upgradeId: 'asset_okada',
    });
  };

  // ---------- 1. 3D DAILY CLASSROOM HALL (cx = 31, cz = -12, 18m x 13m) ----------
  buildRoomShell(31, -12, 18, 13, 0xe0f2fe, 0x047857, 0xfef3c7, 4.2, 2.2);
  sign(scene, 'MADRASAH DAILY CLASSROOM HALL (6 SUBJECTS)', 6.8, 0.68, '#047857', '#fde68a', 31, 3.45, -5.45);
  // Central emerald classroom carpet
  strip(31, -12, 15.5, 10.2, 0x065f46, 0.026);
  strip(31, -12, 14.5, 9.2, 0x047857, 0.03);

  // 6 Subject Stations inside the 3D Classroom Hall
  const subjectStations: {
    x: number;
    z: number;
    label: string;
    bg: string;
    rug: number;
    faceSouth: boolean;
  }[] = [
    { x: 25.2, z: -16.8, label: '1. NAHW & SARF (GRAMMAR)', bg: '#0284c7', rug: 0x0369a1, faceSouth: true },
    { x: 31.0, z: -16.8, label: '2. FIQH & IBADAH', bg: '#d97706', rug: 0xb45309, faceSouth: true },
    { x: 36.8, z: -16.8, label: '3. QUR’AN & TAJWEED', bg: '#059669', rug: 0x047857, faceSouth: true },
    { x: 25.2, z: -9.8, label: '4. HADITH & SUNNAH', bg: '#7c3aed', rug: 0x6d28d9, faceSouth: true },
    { x: 31.0, z: -9.8, label: '5. SEERAH & TARIKH', bg: '#be185d', rug: 0x9d174d, faceSouth: true },
    { x: 36.8, z: -9.8, label: '6. ADAB & AKHLAQ', bg: '#0d9488', rug: 0x0f766e, faceSouth: true },
  ];
  subjectStations.forEach((st) => {
    strip(st.x, st.z + 1.2, 4.4, 2.8, st.rug, 0.035);
    // Standing Blackboard & Wooden Easel
    box(scene, 3.4, 1.35, 0.1, 0x5c2e14, st.x, 1.45, st.z - 0.5);
    box(scene, 3.2, 1.15, 0.12, 0x0f2e22, st.x, 1.45, st.z - 0.49);
    sign(scene, st.label, 3.1, 0.42, st.bg, '#fffbeb', st.x, 2.32, st.z - 0.45);
    // Low wooden Rehal student desks in front of the board
    for (const dx of [-0.95, 0.95]) {
      box(scene, 0.75, 0.32, 0.45, 0x78350f, st.x + dx, 0.16, st.z + 1.45);
      box(scene, 0.42, 0.05, 0.3, 0xfef3c7, st.x + dx, 0.35, st.z + 1.45);
    }
  });

  // ---------- 2. HOUSE TIER 1: RUWAQ MADRASAH BOARDING DORM (cx = 51, cz = -12, 13m x 12m) ----------
  buildRoomShell(51, -12, 13, 12, 0xfef3c7, 0x92400e, 0xe7d8c1, 3.4, 2.0);
  sign(scene, '1. RUWAQ BOARDING DORM (STARTER HOME)', 5.6, 0.62, '#78350f', '#fde68a', 51, 3.35, -6.0);
  // Default straw sleeping mat in your corner (x = 46.8, z = -15.5)
  const ruwaqBed = new THREE.Group();
  box(ruwaqBed, 1.8, 0.04, 2.5, 0xd4a373, 0, 0.02, 0, { cast: false });
  box(ruwaqBed, 1.1, 0.1, 0.38, 0x92400e, 0, 0.06, -0.9); // Wooden pillow rest
  place(ruwaqBed, 46.8, 0, -15.5);
  registerFurniture({
    tierId: 'ruwaq',
    furnitureKey: 'bed',
    group: ruwaqBed,
    baseX: 46.8,
    baseY: 0,
    baseZ: -15.5,
    baseRotY: 0,
    defaultFor: 'asset_mattress',
  });
  // Roommates' mats on the east wall (Moruf & Bilal)
  for (const rz of [-15.8, -12.6, -9.4]) {
    strip(55.2, rz, 1.7, 2.2, 0xcab388, 0.03);
    box(scene, 0.95, 0.42, 0.55, 0x334155, 56.3, 0.21, rz); // Roommate trunk box
  }
  // Your basic study desk & wooden chair (upgraded when asset_desk is bought)
  buildStudyDeskUnit('ruwaq', 46.8, -11.5, 0x8d5a2b, 0x78350f);
  // Your Sajjadah Prayer Rug (x = 51.0, z = -15.6)
  buildPrayerRug('ruwaq', 51.0, -15.6, 0x14532d, 0xfacc15);
  // Your Metal Trunk Box Wardrobe (x = 46.6, z = -8.0)
  buildWardrobe('ruwaq', 46.6, -8.0, true);
  // Caretaker / Housing Upgrade Ledger Table by door (x = 54.8, z = -7.2)
  box(scene, 1.3, 0.75, 0.7, 0x78350f, 54.8, 0.38, -7.2);
  sign(scene, 'FURNISH & UPGRADE HOME', 1.8, 0.35, '#92400e', '#fde68a', 54.8, 1.15, -7.2);
  attachHouseUpgrades('ruwaq', 46.8, -15.5, 46.8, -11.5, 48.5, -16.8, 45.2, -11.5, 49.0, -17.5, 47.2, -4.5);

  // ---------- 3. HOUSE TIER 2: OFF-CAMPUS STUDENT ROOM, EJIGBO (cx = 69, cz = -12, 13m x 12m) ----------
  buildRoomShell(69, -12, 13, 12, 0xe0f2fe, 0x0369a1, 0xf1f5f9, 3.4, 2.1);
  sign(scene, '2. OFF-CAMPUS STUDENT ROOM (EJIGBO)', 5.6, 0.62, '#0369a1', '#f0f9ff', 69, 3.35, -6.0);
  // Decorative center rug
  strip(69, -12, 4.5, 4.5, 0x0284c7, 0.028);
  // Wooden Bed Frame in corner (x = 64.8, z = -15.5)
  const sharedBed = new THREE.Group();
  box(sharedBed, 1.85, 0.32, 2.45, 0x5c2e14, 0, 0.16, 0);
  box(sharedBed, 1.7, 0.16, 2.3, 0x93c5fd, 0, 0.38, 0);
  place(sharedBed, 64.8, 0, -15.5);
  registerFurniture({
    tierId: 'shared_room',
    furnitureKey: 'bed',
    group: sharedBed,
    baseX: 64.8,
    baseY: 0,
    baseZ: -15.5,
    baseRotY: 0,
    defaultFor: 'asset_mattress',
  });
  // Study Table & Chair spot (x = 64.8, z = -11.5)
  buildStudyDeskUnit('shared_room', 64.8, -11.5, 0x78350f, 0x5c2e14);
  // Sajjadah Prayer Rug (x = 73.2, z = -15.5)
  buildPrayerRug('shared_room', 73.2, -15.5, 0x1e3a8a, 0xfde047);
  // Tall Wooden Wardrobe (x = 64.6, z = -8.0)
  buildWardrobe('shared_room', 64.6, -8.0, false);
  // Housing & Lease Table (x = 73.0, z = -7.5)
  box(scene, 1.3, 0.75, 0.7, 0x0369a1, 73.0, 0.38, -7.5);
  sign(scene, 'LEASE & FURNISHINGS', 1.8, 0.35, '#0369a1', '#ffffff', 73.0, 1.15, -7.5);
  attachHouseUpgrades('shared_room', 64.8, -15.5, 64.8, -11.5, 66.6, -16.8, 63.2, -11.5, 67.2, -17.5, 65.2, -4.5);

  // ---------- 4. HOUSE TIER 3: SELF-CONTAINED MINI-FLAT, OKE-AFA (cx = 89, cz = -12, 16m x 13m) ----------
  buildRoomShell(89, -12, 16, 13, 0xffedd5, 0xc2410c, 0xfef3c7, 3.8, 2.2);
  sign(scene, '3. SELF-CONTAINED MINI-FLAT (OKE-AFA)', 6.0, 0.62, '#c2410c', '#fff7ed', 89, 3.35, -5.5);
  // Living Parlour L-Sofa & Rug (Right side of Mini-Flat, x = 93.2, z = -12.5)
  strip(93.0, -12.5, 5.2, 5.2, 0x9a3412, 0.028);
  box(scene, 2.8, 0.55, 0.85, 0x0f766e, 93.2, 0.28, -14.2);
  box(scene, 2.8, 0.45, 0.22, 0x115e59, 93.2, 0.72, -14.52);
  box(scene, 0.85, 0.55, 2.2, 0x0f766e, 95.2, 0.28, -12.8);
  box(scene, 1.4, 0.4, 0.8, 0x451a03, 93.0, 0.2, -12.5); // Coffee table
  // Kitchenette Counter & Silver Fridge (x = 94.8, z = -17.2)
  box(scene, 2.6, 0.9, 0.75, 0x78350f, 93.2, 0.45, -17.6);
  box(scene, 0.85, 1.85, 0.8, 0xcbd5e1, 95.4, 0.92, -17.5, { metal: 0.5, rough: 0.3 });
  // Master Bed (x = 83.8, z = -15.8)
  const flatBed = new THREE.Group();
  box(flatBed, 2.1, 0.38, 2.5, 0x451a03, 0, 0.19, 0);
  box(flatBed, 2.1, 1.1, 0.18, 0x451a03, 0, 0.55, -1.2);
  box(flatBed, 1.95, 0.22, 2.35, 0xfef08a, 0, 0.45, 0.1);
  place(flatBed, 83.8, 0, -15.8);
  registerFurniture({
    tierId: 'mini_flat',
    furnitureKey: 'bed',
    group: flatBed,
    baseX: 83.8,
    baseY: 0,
    baseZ: -15.8,
    baseRotY: 0,
    defaultFor: 'asset_mattress',
  });
  // Study Corner & Chair (x = 83.8, z = -11.5)
  buildStudyDeskUnit('mini_flat', 83.8, -11.5, 0x5c2e14, 0x451a03);
  // Prayer Rug (x = 88.2, z = -16.2)
  buildPrayerRug('mini_flat', 88.2, -16.2, 0x065f46, 0xf59e0b);
  // Tall Wardrobe (x = 83.5, z = -7.8)
  buildWardrobe('mini_flat', 83.5, -7.8, false);
  // Real Estate & Flat Management Table (x = 94.2, z = -7.2)
  box(scene, 1.4, 0.75, 0.75, 0xc2410c, 94.2, 0.38, -7.2);
  sign(scene, 'FLAT & ASSET MANAGER', 1.9, 0.35, '#c2410c', '#ffffff', 94.2, 1.15, -7.2);
  attachHouseUpgrades('mini_flat', 83.8, -15.8, 83.8, -11.5, 86.0, -17.2, 82.0, -11.5, 86.8, -17.8, 85.0, -4.0);

  // ---------- 5. HOUSE TIER 4: SHEIKH'S PERSONAL VILLA / DUPLEX (cx = 113, cz = -12, 20m x 15m) ----------
  buildRoomShell(113, -12, 20, 15, 0xecfdf5, 0x047857, 0xfef9c3, 4.6, 2.4);
  sign(scene, "4. DAR ASH-SHEIKH (PERSONAL VILLA · +₦2,500/DAY)", 7.2, 0.68, '#065f46', '#fde047', 113, 3.45, -4.5);
  // Royal Majlis Reception & Courtyard Halqah (Right Wing, x = 118.2, z = -12.5)
  strip(118.2, -12.5, 7.2, 8.5, 0x064e3b, 0.028);
  strip(118.2, -12.5, 6.4, 7.6, 0x047857, 0.032);
  box(scene, 3.8, 0.6, 0.9, 0x1e3a8a, 118.2, 0.3, -16.8);
  box(scene, 3.8, 0.35, 0.2, 0xfacc15, 118.2, 0.72, -17.15);
  // Royal Master Four-Poster Bed (Left Wing, x = 106.2, z = -16.2)
  const villaBed = new THREE.Group();
  box(villaBed, 2.4, 0.45, 2.7, 0x451a03, 0, 0.22, 0);
  box(villaBed, 2.25, 0.25, 2.55, 0x10b981, 0, 0.52, 0);
  for (const [px, pz] of [[-1.1, -1.25], [1.1, -1.25], [-1.1, 1.25], [1.1, 1.25]]) {
    cyl(villaBed, 0.05, 0.05, 2.2, 0xd97706, px, 1.1, pz, 8);
  }
  place(villaBed, 106.2, 0, -16.2);
  registerFurniture({
    tierId: 'personal_villa',
    furnitureKey: 'bed',
    group: villaBed,
    baseX: 106.2,
    baseY: 0,
    baseZ: -16.2,
    baseRotY: 0,
    defaultFor: 'asset_mattress',
  });
  // Executive Scholar's Study & Maktabah with Chair (x = 106.2, z = -11.5)
  buildStudyDeskUnit('personal_villa', 106.2, -11.5, 0x451a03, 0x3b1d0e);
  // Grand Mihrab Prayer Chamber (x = 112.5, z = -16.5)
  buildPrayerRug('personal_villa', 112.5, -16.5, 0x064e3b, 0xfacc15);
  // Walk-in Royal Wardrobe (x = 105.8, z = -6.8)
  buildWardrobe('personal_villa', 105.8, -6.8, false);
  // Villa Estate Ledger Table (x = 119.5, z = -6.5)
  box(scene, 1.5, 0.78, 0.8, 0x047857, 119.5, 0.39, -6.5);
  sign(scene, 'VILLA ESTATE & ASSETS', 2.0, 0.38, '#065f46', '#fde047', 119.5, 1.2, -6.5);
  attachHouseUpgrades('personal_villa', 106.2, -16.2, 106.2, -11.5, 108.5, -17.8, 104.0, -11.5, 110.0, -18.5, 108.5, -3.2);

  // ---------- PHYSICAL LOCKED DOORS FOR UNOWNED HOUSES ----------
  interface HouseGate {
    tierId: string;
    doorGroup: THREE.Group;
    collider: Collider;
    savedBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  }
  const houseGates: HouseGate[] = [];
  const addHouseGate = (tierId: string, cx: number, doorZ: number, doorW: number, priceLabel: string) => {
    const g = new THREE.Group();
    // Solid mahogany security door blocking the entrance when locked
    box(g, doorW, 2.2, 0.22, 0x3e2723, 0, 1.1, 0);
    // Gold padlock & handle bar
    box(g, doorW * 0.8, 0.1, 0.28, 0xd97706, 0, 1.1, 0);
    sign(g, `🔒 LOCKED · ${priceLabel}`, Math.min(3.2, doorW * 0.9), 0.42, '#7f1d1d', '#fde68a', 0, 1.65, 0.14);
    place(g, cx, 0, doorZ);

    const savedBounds = {
      minX: cx - doorW / 2 - 0.3,
      maxX: cx + doorW / 2 + 0.3,
      minZ: doorZ - 0.45,
      maxZ: doorZ + 0.45,
    };
    const collider: Collider = { ...savedBounds };
    colliders.push(collider);
    houseGates.push({ tierId, doorGroup: g, collider, savedBounds });
  };

  addHouseGate('shared_room', 69, -6.0, 3.4, 'RENT ₦3.5k / BUY ₦25k');
  addHouseGate('mini_flat', 89, -5.5, 3.8, 'RENT ₦12k / BUY ₦95k');
  addHouseGate('personal_villa', 113, -4.5, 4.6, 'RENT ₦35k / BUY ₦350k');

  // ===================== KEWU F.C. PING-PONG SOCCER PITCH (WEST LOT BESIDE COMPOUND) =====================
  const pitchX = -24.5;
  const pitchZ = -2.0;
  strip(pitchX, pitchZ, 11.4, 13.6, 0x15803d, 0.02); // outer pitch turf
  // Alternating grass stripes
  for (let i = -2; i <= 2; i++) {
    strip(pitchX, pitchZ + i * 2.4, 10.4, 1.2, i % 2 === 0 ? 0x16a34a : 0x15803d, 0.026);
  }
  // White touchlines & halfway line
  box(scene, 10.6, 0.02, 0.12, 0xffffff, pitchX, 0.03, pitchZ - 6.2, { cast: false });
  box(scene, 10.6, 0.02, 0.12, 0xffffff, pitchX, 0.03, pitchZ + 6.2, { cast: false });
  box(scene, 0.12, 0.02, 12.4, 0xffffff, pitchX - 5.3, 0.03, pitchZ, { cast: false });
  box(scene, 0.12, 0.02, 12.4, 0xffffff, pitchX + 5.3, 0.03, pitchZ, { cast: false });
  box(scene, 10.6, 0.02, 0.1, 0xffffff, pitchX, 0.03, pitchZ, { cast: false });
  // Center circle & spot
  const centerRing = new THREE.Mesh(
    new THREE.RingGeometry(1.45, 1.58, 24),
    mat(0xffffff, 0.9),
  );
  centerRing.rotation.x = -Math.PI / 2;
  centerRing.position.set(pitchX, 0.032, pitchZ);
  scene.add(centerRing);
  // Ping-pong table soccer side-boards (low rebound barriers along left & right touchlines)
  box(scene, 0.25, 0.55, 12.8, 0x0284c7, pitchX - 5.55, 0.28, pitchZ);
  box(scene, 0.25, 0.55, 12.8, 0x0284c7, pitchX + 5.55, 0.28, pitchZ);
  box(scene, 0.3, 0.08, 12.85, 0xffc61a, pitchX - 5.55, 0.58, pitchZ);
  box(scene, 0.3, 0.08, 12.85, 0xffc61a, pitchX + 5.55, 0.58, pitchZ);

  // North & South Goalposts (Monkey-Post style with crossbar)
  for (const dir of [-1, 1]) {
    const gz = pitchZ + dir * 6.2;
    cyl(scene, 0.08, 0.08, 1.9, 0xffffff, pitchX - 1.9, 0.95, gz, 8);
    cyl(scene, 0.08, 0.08, 1.9, 0xffffff, pitchX + 1.9, 0.95, gz, 8);
    box(scene, 3.96, 0.12, 0.12, 0xffffff, pitchX, 1.9, gz);
    // Back net support frame
    cyl(scene, 0.05, 0.05, 1.9, 0xcbd5e1, pitchX - 1.9, 0.95, gz + dir * 0.9, 6);
    cyl(scene, 0.05, 0.05, 1.9, 0xcbd5e1, pitchX + 1.9, 0.95, gz + dir * 0.9, 6);
    box(scene, 3.9, 0.08, 0.08, 0xcbd5e1, pitchX, 1.88, gz + dir * 0.9);
  }
  // 3D Soccer Ball at the center spot
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), mat(0xffffff, 0.4));
  ball.position.set(pitchX, 0.3, pitchZ);
  ball.castShadow = true;
  scene.add(ball);
  sign(scene, 'KEWU F.C. - TABLE SOCCER', 4.4, 0.58, '#15803d', '#ffd978', pitchX, 2.75, pitchZ + 6.2);

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
  [
    [-13, -9], [13, -9], [-14, 4.5], [14.5, 1], [-3.5, 4.4], [4, 4.6],
    [-30, 8.3], [30, 8.3], [-22, 23], [26, 23], [-38, 23], [38, 8.3],
    [-75, 8.3], [-115, 23], [-155, 8.3], [-195, 23],
    [75, 23], [115, 8.3], [155, 23], [195, 8.3],
  ].forEach(([x, z]) => tree(x, z));

  // ===================== RECREATION GROUND: TRADITIONAL PLAYGROUND GAMES =====================
  // Swept earth patch north of the pitch where all the chalked games are laid out
  strip(-27.5, -18.5, 24, 15, 0xd8b07a, 0.015);

  const chalk = (cx: number, cz: number, w: number, d: number) => box(scene, w, 0.02, d, 0xffffff, cx, 0.035, cz, { cast: false });
  const chalkRect = (cx: number, cz: number, w: number, d: number, t = 0.08) => {
    chalk(cx, cz - d / 2, w, t);
    chalk(cx, cz + d / 2, w, t);
    chalk(cx - w / 2, cz, t, d);
    chalk(cx + w / 2, cz, t, d);
  };
  const signPost = (x: number, z: number, text: string, bg: string, fg = '#fff6e0') => {
    cyl(scene, 0.06, 0.06, 1.7, 0x6d4c41, x - 1.0, 0.85, z, 6);
    cyl(scene, 0.06, 0.06, 1.7, 0x6d4c41, x + 1.0, 0.85, z, 6);
    sign(scene, text, 2.3, 0.45, bg, fg, x, 1.5, z + 0.05);
  };
  const floorLabel = (text: string, x: number, z: number, w = 0.7) => {
    const s = makeSign(text, w, w, '#d8b07a', '#7c2d12');
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, 0.045, z);
    scene.add(s);
    extras.push(s);
  };

  // --- Tinko-Tinko court ---
  chalkRect(-34, -13.5, 6, 4);
  chalk(-34, -13.5, 0.08, 4);
  for (const fx of [-35.6, -32.4]) {
    box(scene, 0.22, 0.02, 0.5, 0xffffff, fx, 0.036, -13.5, { cast: false });
    box(scene, 0.22, 0.02, 0.5, 0xffffff, fx + (fx < -34 ? 0.4 : -0.4), 0.036, -13.5, { cast: false });
  }
  signPost(-34, -11.3, 'TINKO-TINKO', '#be185d');

  // --- Suwe (hopscotch) grid ---
  for (let i = 0; i < 6; i++) {
    const bx = -27.0 + i * 1.0;
    chalkRect(bx, -13, 1.0, 1.0, 0.07);
    floorLabel(String(i + 1), bx, -13);
  }
  const homeArc = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.18, 20, 1, 0, Math.PI), mat(0xffffff, 0.9));
  homeArc.rotation.x = -Math.PI / 2;
  homeArc.rotation.z = -Math.PI / 2;
  homeArc.position.set(-21.5, 0.036, -13);
  scene.add(homeArc);
  box(scene, 0.3, 0.12, 0.26, 0x78716c, -24.0, 0.07, -13);
  signPost(-24.5, -11.4, 'SUWE', '#c2410c');

  // --- Ayo Olopon bench under a shade tree ---
  const ayoBench = new THREE.Group();
  box(ayoBench, 2.4, 0.14, 0.8, 0x6d4c41, 0, 0.5, 0);
  for (const lx of [-1.0, 1.0]) for (const lz of [-0.3, 0.3]) cyl(ayoBench, 0.06, 0.06, 0.5, 0x4e342e, lx, 0.25, lz, 6);
  box(ayoBench, 1.7, 0.16, 0.66, 0x8d5a2b, 0, 0.66, 0);
  for (let c = 0; c < 6; c++) {
    for (const rz of [-0.14, 0.14]) cyl(ayoBench, 0.1, 0.1, 0.03, 0x2b1a0e, -0.67 + c * 0.27, 0.75, rz, 10);
  }
  place(ayoBench, -34, 0, -20);
  solid(-34, -20, 1.25, 0.5);
  tree(-37.4, -21, 1.15);
  signPost(-34, -18.4, 'AYO OLOPON', '#78350f');

  // --- Skipping rope ---
  const ropeCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-28.2, 0.9, -19.5),
    new THREE.Vector3(-26, -0.5, -19.5),
    new THREE.Vector3(-23.8, 0.9, -19.5),
  );
  const ropeLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(ropeCurve.getPoints(18)),
    new THREE.LineBasicMaterial({ color: 0xdc2626 }),
  );
  scene.add(ropeLine);
  extras.push(ropeLine);
  const jumpMark = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 18), mat(0xffffff, 0.9));
  jumpMark.rotation.x = -Math.PI / 2;
  jumpMark.position.set(-26, 0.036, -19.5);
  scene.add(jumpMark);
  signPost(-26, -17.7, 'SKIPPING ROPE', '#7c3aed');

  // --- Boju-Boju dodge arena ---
  const arenaRing = new THREE.Mesh(new THREE.RingGeometry(2.9, 3.05, 32), mat(0xffffff, 0.9));
  arenaRing.rotation.x = -Math.PI / 2;
  arenaRing.position.set(-22, 0.036, -23.5);
  scene.add(arenaRing);
  for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 8), mat(0xf97316, 0.7));
    cone.position.set(-22 + dx, 0.25, -23.5 + dz);
    cone.castShadow = true;
    scene.add(cone);
  }
  const dodgeBall = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), mat(0xdc2626, 0.5));
  dodgeBall.position.set(-22.6, 0.27, -23.2);
  dodgeBall.castShadow = true;
  scene.add(dodgeBall);
  signPost(-18.4, -21.4, 'BOJU-BOJU', '#15803d');

  // --- Throw / Snowball Duel arena ---
  const snowPatch = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.75, 24), mat(0xffffff, 0.95));
  snowPatch.rotation.x = -Math.PI / 2;
  snowPatch.position.set(-19.5, 0.036, -15.0);
  scene.add(snowPatch);

  // Frosted snow barriers
  for (const bx of [-20.8, -18.2]) {
    box(scene, 0.35, 0.55, 0.85, 0xe0f2fe, bx, 0.27, -15.0);
    box(scene, 0.42, 0.08, 0.92, 0xffffff, bx, 0.58, -15.0, { cast: false });
  }

  // Piles of snowballs
  for (const [sx, sz] of [[-20.8, -15.2], [-20.8, -14.8], [-20.8, -15.0], [-18.2, -15.1], [-18.2, -14.9]]) {
    const sb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), mat(0xffffff, 0.8));
    sb.position.set(sx, 0.68, sz);
    sb.castShadow = true;
    scene.add(sb);
  }

  // Bullseye Target Stand
  const targetPole = new THREE.Group();
  cyl(targetPole, 0.04, 0.04, 1.4, 0x6d4c41, 0, 0.7, 0, 6);
  const outerTarget = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16), mat(0xdc2626, 0.8));
  outerTarget.rotation.x = Math.PI / 2;
  outerTarget.position.set(0, 1.25, 0);
  targetPole.add(outerTarget);
  const innerTarget = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), mat(0xffffff, 0.9));
  innerTarget.rotation.x = Math.PI / 2;
  innerTarget.position.set(0, 1.25, 0);
  targetPole.add(innerTarget);
  const bullseye = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.07, 16), mat(0x0284c7, 0.9));
  bullseye.rotation.x = Math.PI / 2;
  bullseye.position.set(0, 1.25, 0);
  targetPole.add(bullseye);
  place(targetPole, -19.5, 0, -16.6);

  signPost(-19.5, -13.2, 'THROW', '#0284c7');

  // ===================== NEPA POLES, CABLES & LAMPS =====================
  const poleTops: THREE.Vector3[] = [];
  for (let x = -240; x <= 240; x += 16) {
    if (x === 0) continue;
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
  makeBusStop(220, 8.6, 'BUS STOP - ISOLO');
  makeBusStop(-220, 8.6, 'BUS STOP - IDIMU');

  // Roadside Milestone Signs along the highway so the journey feels real
  const makeMilestone = (x: number, text: string) => {
    const m = new THREE.Group();
    cyl(m, 0.06, 0.06, 2.4, 0x333333, -1.2, 1.2, 0, 6);
    cyl(m, 0.06, 0.06, 2.4, 0x333333, 1.2, 1.2, 0, 6);
    sign(m, text, 3.2, 0.55, '#0d4a37', '#fff6e0', 0, 2.1, 0.06);
    place(m, x, 0, 8.2);
  };
  makeMilestone(90, 'OKE-AFA BRIDGE → ISOLO');
  makeMilestone(155, 'JAKANDE ESTATE GATE');
  makeMilestone(-90, '← BUCKNOR JUNCTION');
  makeMilestone(-155, '← COUNCIL / IDIMU RD');

  // East Hub: Isolo Estate Duplex (Home Lesson destination, ~200m east)
  const duplex = new THREE.Group();
  box(duplex, 8, 5.2, 6, 0xfff8e7, 0, 2.6, 0);
  box(duplex, 8.4, 0.35, 6.4, 0x0284c7, 0, 5.35, 0);
  box(duplex, 5, 0.2, 1.6, 0xe2e8f0, 0, 2.8, 3.6);
  for (const px of [-2, 2]) cyl(duplex, 0.15, 0.18, 2.8, 0xffffff, px, 1.4, 4.1, 10);
  box(duplex, 1.6, 2.4, 0.12, 0x3e2723, 0, 1.2, 3.02, { cast: false });
  sign(duplex, 'ISOLO ESTATE - HOME LESSON', 4.6, 0.6, '#0284c7', '#fff6e0', 0, 4.4, 3.06);
  place(duplex, 230, 0, 2.5);
  solid(230, 2.5, 4.2, 3.2);

  // West Hub: Idimu Central Mosque Pavilion (Friday Khutbah destination, ~245m west)
  const idimu = new THREE.Group();
  box(idimu, 9, 4.6, 6.5, 0xe0f2fe, 0, 2.3, 0);
  box(idimu, 9.4, 0.35, 6.9, 0x0d6b4c, 0, 4.75, 0);
  const iDome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x1a8f64, 0.3, 0.2));
  iDome.position.set(0, 4.9, 0);
  iDome.castShadow = true;
  idimu.add(iDome);
  sign(idimu, 'IDIMU CENTRAL MOSQUE', 4.8, 0.6, '#0d6b4c', '#ffd978', 0, 3.9, 3.3);
  place(idimu, -230, 0, 2.5);
  solid(-230, 2.5, 4.6, 3.3);

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
  for (let x = -252; x <= 252; x += 14) {
    building(x, 32, 9, 6 + rnd() * 7, 6, palette[Math.floor(rnd() * palette.length)], -1);
    building(x, -30, 9, 6 + rnd() * 9, 6, palette[Math.floor(rnd() * palette.length)], 1);
    // Roadside shops/houses along the north side between the compound/residential strip and far hubs
    if ((x < -36 || x > 135) && Math.abs(x - 225) > 22 && Math.abs(x + 225) > 22) {
      building(x, 1, 8, 4.5 + rnd() * 4, 5, palette[Math.floor(rnd() * palette.length)], 1);
    }
  }
  for (let z = -22; z <= 26; z += 9) {
    building(-268, z, 6, 6 + rnd() * 6, 8, palette[Math.floor(rnd() * palette.length)], 0);
    building(268, z, 6, 6 + rnd() * 6, 8, palette[Math.floor(rnd() * palette.length)], 0);
  }

  // ===================== VEHICLES =====================
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
    vehicles.push({ group: g, speed, dir, wheels, wheelR: 0.42, minX: -270, maxX: 270 });
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
    vehicles.push({ group: g, speed, dir, wheels, wheelR: 0.3, minX: -270, maxX: 270 });
  };

  makeDanfo(11.6, 1, 7, -180, 'IDIMU-EJIGBO');
  makeDanfo(11.6, 1, 7.5, -40, 'OJUELEGBA-YABA');
  makeDanfo(11.6, 1, 7, 90, 'MUSHIN-OSHODI');
  makeDanfo(16.4, -1, 6.5, 180, 'ISOLO-IKOTUN');
  makeDanfo(16.4, -1, 7, 40, 'IKEJA-CMS');
  makeDanfo(16.4, -1, 6.5, -90, 'AGEGE-OBALENDE');
  makeKeke(13.3, 1, 8.5, -110);
  makeKeke(13.3, 1, 8, 60);
  makeKeke(14.7, -1, 8.5, -20);
  makeKeke(14.7, -1, 8, 140);

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
    ['Ta la\'a! Read it out loud!', 'Open your Mushaf to today\'s Surah!', 'Ilm without adab is nothing.', 'Moruf! Stop sleeping!']);

  const students: [string, string, number, number, number][] = [
    ['moruf', 'Moruf', -2.2, -0.5, 0xffffff], ['bilal', 'Bilal', -1.0, 0.9, 0x90caf9],
    ['abdul', 'Abdul', 1.0, 0.9, 0xa5d6a7], ['luqman', 'Luqman', 2.2, -0.5, 0xffcc80],
  ];
  students.forEach(([id, name, x, z, c]) =>
    addNPC(id, name, 'Omo Kewu', x, z, Math.PI + (x > 0 ? 0.3 : -0.3), 'recite',
      { robe: c, cap: 'kofia', capColor: 0xffffff, prop: 'book', scale: 0.78, trim: 0x14805c },
      ['Alif, Ba, Ta...', 'Subhanallah, let me revise this ayah!', 'Bismillah ir-Rahman ir-Rahim...', 'Today\'s Classroom topic is so clear!']));

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
  addNPC('alhaji', 'Alhaji Musa', 'Isolo Patron', 230, 6.8, 0, 'wave',
    { robe: 0x1e3a8a, trim: 0xffd700, cap: 'fila', capColor: 0xffd700, beard: 0x444444, skin: 0x5d3a1a },
    ['Welcome, Ustadh! The children are ready for Home Lesson!', 'Teach them Quran and good character!']);
  addNPC('imam', 'Sheikh Sulaiman', 'Idimu Chief Imam', -230, 6.8, 0, 'idle',
    { robe: 0x0d6b4c, trim: 0xffd700, cap: 'turban', capColor: 0xffffff, beard: 0xdddddd, prop: 'cane', skin: 0x3b2314 },
    ['Welcome to Idimu Central Mosque!', 'Ascend the minbar when you are ready for the Khutbah.']);
  addNPC('ridwan', 'Ridwan', 'Kewu FC Captain', -21.2, 5.2, 0, 'wave',
    { robe: 0x16a34a, trim: 0xffc61a, cap: 'kofia', capColor: 0xffffff, skin: 0x4a2c17 },
    ['Oya! 1-on-1 Ping-Pong Football!', 'First to 3 goals wins the street cup!', 'No hands o, test your reflexes!']);
  addNPC('zainab', 'Zainab', 'Tinko-Tinko Champ', -35.2, -13.5, Math.PI / 2, 'wave',
    { robe: 0xec4899, trim: 0xffffff, cap: 'hijab', capColor: 0xfbcfe8, female: true, skin: 0x5d3a1a, scale: 0.85 },
    ['Tinko, Tinko, Tinko-Tinko!', 'Left foot or right foot? Come and play!']);
  addNPC('halimah', 'Halimah', 'Classmate', -32.8, -13.5, -Math.PI / 2, 'wave',
    { robe: 0x14b8a6, trim: 0xffffff, cap: 'hijab', capColor: 0xccfbf1, female: true, skin: 0x7a4a24, scale: 0.85 },
    ['Clap! Clap!']);
  addNPC('rope1', 'Maryam', 'Rope Holder', -28.2, -19.5, Math.PI / 2, 'idle',
    { robe: 0x8b5cf6, trim: 0xffffff, cap: 'hijab', capColor: 0xede9fe, female: true, skin: 0x4a2c17, scale: 0.85 },
    ['Jump, jump!']);
  addNPC('rope2', 'Khadijah', 'Rope Holder', -23.8, -19.5, -Math.PI / 2, 'idle',
    { robe: 0xf59e0b, trim: 0xffffff, cap: 'hijab', capColor: 0xfef3c7, female: true, skin: 0x7a4a24, scale: 0.85 },
    ['Faster!']);
  addNPC('baba_ayo', 'Baba Ayo', 'Ayo Master', -32.4, -20, -Math.PI / 2, 'idle',
    { robe: 0xf5f5dc, trim: 0x92400e, cap: 'fila', capColor: 0x7c2d12, beard: 0xdddddd, skin: 0x4a2c17 },
    ['Ayo is the game of wisdom. Sit and play!', 'Count your seeds well, my child.']);
  addNPC('faruq', 'Faruq', 'Snowball Duelist', -17.5, -15.0, -Math.PI / 2, 'wave',
    { robe: 0x0284c7, trim: 0xffffff, cap: 'kofia', capColor: 0xbae6fd, skin: 0x4a2c17, scale: 0.88 },
    ['Snowball duel! Pull back to aim, release to throw!', 'First to reduce health to zero wins. Come and challenge me!']);

  // Classroom Hall Instructors & Students (inside the 3D Classroom Hall at x = 31, z = -12)
  addNPC('ustadh_nahw', 'Ustadh Qasim', 'Nahw & Sarf Master', 25.2, -16.8, 0, 'alfa',
    { robe: 0xffffff, trim: 0xd97706, cap: 'turban', capColor: 0xfef3c7, beard: 0x222222, prop: 'book', skin: 0x4a2c17 },
    ['Al-Kalimah is divided into Ism, Fi\'l, and Harf!', 'Approach the Nahw board to begin today\'s grammar lesson!']);
  addNPC('ustadh_fiqh', 'Mufti Zubair', 'Fiqh & Ibadah Teacher', 31.0, -16.8, 0, 'idle',
    { robe: 0x065f46, trim: 0x10b981, cap: 'turban', capColor: 0xffffff, beard: 0x444444, prop: 'tesbih', skin: 0x5d3a1a },
    ['Validity of Salah begins with pure Wudu.', 'Step up to the Fiqh board for today\'s ruling!']);
  addNPC('ustadh_quran', 'Qari Ibrahim', 'Tajweed & Hifz Master', 36.8, -16.8, 0, 'recite',
    { robe: 0x0c4a6e, trim: 0x38bdf8, cap: 'kofia', capColor: 0xffffff, beard: 0x111111, prop: 'book', skin: 0x3b2314 },
    ['Observe the Ghunnah and Madd carefully!', 'Check the Qur\'an & Tajweed board for today\'s recitation lesson!']);

  // Ruwaq Dormitory Roommates (inside the 3D Ruwaq Boarding House at x = 51, z = -12)
  addNPC('dorm_mate1', 'Yusuf', 'Ruwaq Senior Prefect', 53.8, -14.8, -Math.PI / 2, 'recite',
    { robe: 0xe0f2fe, trim: 0x0284c7, cap: 'kofia', capColor: 0xffffff, prop: 'book', scale: 0.9, skin: 0x5d3a1a },
    ['Welcome to Ruwaq Dormitory!', 'Use your bed to rest, the desk to revise, or the Sajjadah to pray Tahajjud!', 'When you save enough Naira, check the Real Estate table to rent your own room!']);

  // Real estate agent near the residential walkway
  addNPC('estate_agent', 'Alhaji Mutiu', 'Caretaker & Landlord', 60.0, -4.5, 0, 'wave',
    { robe: 0x1e293b, trim: 0xfbbf24, cap: 'fila', capColor: 0xfbbf24, beard: 0x555555, skin: 0x4a2c17 },
    ['Looking for a self-con or personal duplex?', 'Inspect every house along this street — from Ruwaq to the Sheikh\'s Villa!', 'Buy a mattress, standing fan, or solar inverter and see it inside your room!']);

  const syncUpgrades = (
    upgrades: string[],
    activeTier: string,
    furnitureLayout?: Record<string, FurnitureTransform>,
    mountVehicle?: MountVehicle,
  ) => {
    const owned = new Set(upgrades);
    const layout = furnitureLayout || {};

    furnitureRegistry.forEach((item) => {
      const isCurrentHouse = item.tierId === activeTier;

      if (item.upgradeId) {
        // Upgrade asset (only in active house, and only if owned)
        if (!isCurrentHouse || !owned.has(item.upgradeId)) {
          item.group.visible = false;
          return;
        }
        // If riding the vehicle, hide the parked version outside the house
        if (item.furnitureKey === 'bicycle' && mountVehicle === 'bicycle') {
          item.group.visible = false;
          return;
        }
        if (item.furnitureKey === 'okada' && mountVehicle === 'okada') {
          item.group.visible = false;
          return;
        }
        item.group.visible = true;
      } else if (item.defaultFor) {
        // Default piece (e.g. basic desk or sleeping mat)
        const replaced = isCurrentHouse && owned.has(item.defaultFor);
        item.group.visible = !replaced;
      } else {
        item.group.visible = true;
      }

      // Apply movable & turnable offsets for the active house
      if (isCurrentHouse && layout[item.furnitureKey]) {
        const tf = layout[item.furnitureKey];
        item.group.position.x = item.baseX + (tf.dx || 0);
        item.group.position.y = item.baseY;
        item.group.position.z = item.baseZ + (tf.dz || 0);
        item.group.rotation.y = item.baseRotY + (tf.rot || 0);
      } else {
        item.group.position.x = item.baseX;
        item.group.position.y = item.baseY;
        item.group.position.z = item.baseZ;
        item.group.rotation.y = item.baseRotY;
      }
    });
  };

  const syncHouseAccess = (activeTier: string) => {
    houseGates.forEach((gate) => {
      const unlocked = gate.tierId === activeTier;
      gate.doorGroup.visible = !unlocked;
      if (unlocked) {
        // Move collider far off-map so the doorway is completely open
        gate.collider.minX = 9999;
        gate.collider.maxX = 9999;
        gate.collider.minZ = 9999;
        gate.collider.maxZ = 9999;
      } else {
        gate.collider.minX = gate.savedBounds.minX;
        gate.collider.maxX = gate.savedBounds.maxX;
        gate.collider.minZ = gate.savedBounds.minZ;
        gate.collider.maxZ = gate.savedBounds.maxZ;
      }
    });
  };

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
      };
    });
  };

  return { colliders, vehicles, rideBus, lampMats, windowMats, headMats, npcs, fanRotors, syncUpgrades, syncHouseAccess, furnitureRegistry, dispose };
}
