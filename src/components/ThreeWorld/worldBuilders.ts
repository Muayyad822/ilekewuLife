import * as THREE from 'three';
import { buildCharacter, Character, CharacterOptions, Pose } from './characterBuilder';
import { FurnitureTransform, MountVehicle } from '@/types/game';
import { HOUSING_TIERS } from '@/data/shop';
import { HIGHWAY, HOUSES, HouseLayout, Spot, doorZ } from './houseLayout';

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
  width?: number;
  depth?: number;
  type?: 'danfo' | 'keke' | 'car' | 'okada';
  /** Inner-lane vehicles that shuttle between two median breaks, U-turning at each end. */
  shuttle?: Shuttle;
}

export interface Shuttle {
  /** X of the median break where eastbound vehicles turn back. */
  east: number;
  /** X of the median break where westbound vehicles turn back. */
  west: number;
  zEast: number;
  zWest: number;
  phase: 'lane' | 'turn';
  theta: number;
  cx: number;
  radius: number;
}

/** Moves one traffic vehicle for dt seconds (lane driving, wrap-around, or a U-turn through the median). */
export function advanceVehicle(v: Vehicle, dt: number) {
  const s = v.shuttle;
  if (s && s.phase === 'turn') {
    const cz = (s.zEast + s.zWest) / 2;
    s.theta += (v.speed * 0.7 * dt) / s.radius;
    const atEast = s.cx === s.east;
    if (s.theta >= (atEast ? Math.PI / 2 : (3 * Math.PI) / 2)) {
      s.phase = 'lane';
      v.dir = atEast ? -1 : 1;
      v.group.position.set(s.cx, 0, atEast ? s.zWest : s.zEast);
      v.group.rotation.y = atEast ? Math.PI : 0;
    } else {
      v.group.position.set(s.cx + s.radius * Math.cos(s.theta), 0, cz + s.radius * Math.sin(s.theta));
      v.group.rotation.y = Math.atan2(-Math.cos(s.theta), -Math.sin(s.theta));
    }
  } else {
    v.group.position.x += v.dir * v.speed * dt;
    if (s) {
      if (v.dir === 1 && v.group.position.x >= s.east) {
        s.phase = 'turn';
        s.cx = s.east;
        s.theta = -Math.PI / 2;
      } else if (v.dir === -1 && v.group.position.x <= s.west) {
        s.phase = 'turn';
        s.cx = s.west;
        s.theta = Math.PI / 2;
      }
    } else if (v.dir === 1 && v.group.position.x > v.maxX) {
      v.group.position.x = v.minX;
    } else if (v.dir === -1 && v.group.position.x < v.minX) {
      v.group.position.x = v.maxX;
    }
  }
  const spin = (v.speed * dt) / v.wheelR;
  v.wheels.forEach((w) => (w.rotation.z -= spin));
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
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1360, 160), mat(0xb89560, 1));
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
  strip(0, 7.3, 1360, 3.0, 0xbab5a8); // north pedestrian pavement & bus shelters (z = 5.8 to 8.8)
  strip(0, 17.2, 1360, 16.8, 0x22242a); // wide 4-lane two-way highway asphalt (8.0m each side, z = 8.8 to 25.6)
  strip(0, 29.55, 1360, 7.9, 0xbab5a8); // south commercial sidewalk & shops (z = 25.6 to 33.5)
  strip(0, -1.2, 12, 8, 0x14664a, 0.02); // prayer mat
  strip(0, -1.2, 11, 7, 0x1b8a64, 0.025);

  // Walkway branches from North Pavement to off-campus residential zones
  strip(180, -3.5, 5.2, 19, 0xd6c7b2, 0.018); // Ejigbo Tenement walkway
  strip(380, -3.5, 5.8, 19, 0xe2e8f0, 0.018); // Oke-Afa Mini-Flat driveway
  strip(540, -3.5, 6.8, 19, 0xd1fae5, 0.018); // Isolo Sheikh Villa avenue

  // Highway dashed lane markings:
  // North carriageway (Eastbound): Lane 1 at z = 10.8, Lane 2 at z = 14.8, divider at z = 12.8
  // South carriageway (Westbound): Lane 3 at z = 19.6, Lane 4 at z = 23.6, divider at z = 21.6
  for (let x = -640; x < 640; x += 6) {
    box(scene, 3.2, 0.01, 0.16, 0xf2f2f2, x, 0.03, 12.8, { cast: false });
    box(scene, 3.2, 0.01, 0.16, 0xf2f2f2, x, 0.03, 21.6, { cast: false });
  }

  // Outer Yellow & Black Curbs
  for (let x = -640; x < 640; x += 4) {
    const c = ((x + 640) / 4) % 2 === 0 ? 0xffc61a : 0x1a1a1a;
    box(scene, 4, 0.18, 0.35, c, x + 2, 0.09, 8.8);
    box(scene, 4, 0.18, 0.35, c, x + 2, 0.09, 25.6);
  }

  // Raised Center Median Divider with Solid Physical Curbs & Official U-Turn Breaks
  // 10 Strategic U-Turn gaps distributed along the 1.28km Highway:
  // -500 (Idimu West), -380 (Bucknor Outer), -240 (Bucknor Junction), -100 (Chemist / West Strip),
  // 0 (Madrasah Central), 110 (Suya / Provisions), 200 (Ejigbo Junction), 290 (Solar / Tailor),
  // 400 (Oke-Afa Canal), 520 (Isolo Estate)
  const U_TURN_CENTERS: readonly number[] = HIGHWAY.uTurnCenters;
  const isUTurnGap = (x: number) => {
    return U_TURN_CENTERS.some((c) => Math.abs(x - c) < HIGHWAY.uTurnHalfGap);
  };
  for (let x = -636; x <= 636; x += 4) {
    if (!isUTurnGap(x)) {
      const c = ((x + 636) / 4) % 2 === 0 ? 0xffc61a : 0x27272a;
      box(scene, 4, 0.32, 0.8, c, x + 2, 0.16, 17.2);
      solid(x + 2, 17.2, 2.0, 0.4); // Solid physical collision barrier for median curb!
    } else {
      // Median break: the highway asphalt runs straight through, no curb here.
    }
  }
  // U-turn bays: dashed turning circle + advance signs for each carriageway
  {
    const R = (HIGHWAY.lanes.westInner - HIGHWAY.lanes.eastInner) / 2;
    U_TURN_CENTERS.forEach((c) => {
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const dash = box(scene, 0.5, 0.01, 0.12, 0xf2f2f2, c + R * Math.cos(a), 0.028, HIGHWAY.median + R * Math.sin(a), { cast: false });
        dash.rotation.y = -(a + Math.PI / 2);
      }
      // Eastbound drivers see the sign facing -x, westbound drivers see it facing +x
      for (const side of [-1, 1]) {
        const sx = c + side * (HIGHWAY.uTurnHalfGap + 9);
        cyl(scene, 0.05, 0.05, 2.5, 0x475569, sx, 1.25, HIGHWAY.median, 6);
        sign(scene, 'U-TURN ↻', 1.7, 0.5, '#1d4ed8', '#ffffff', sx, 2.6, HIGHWAY.median, side === -1 ? -Math.PI / 2 : Math.PI / 2);
      }
    });
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
  // Paved Scholars Avenue connecting Compound -> Classroom Hall -> Ruwaq -> Student Room -> Mini-Flat -> Villa.
  // Every anchor (beds, desks, vehicle bays, doors) comes from ./houseLayout so the 3D scene and
  // the interaction hotspots in LagosWorld.tsx can never drift apart.
  // Paved Scholars Walkway connecting Compound Archway (x=16) -> Classroom Hall (x=31) -> Ruwaq Boarding Dorm (x=51)
  strip(38, -3.0, 48, 4.2, 0xd6c7b2, 0.018);

  const frame = (h: HouseLayout) => ({
    x: (lx: number) => h.cx + lx,
    z: (lz: number) => h.cz + lz,
    p: (lx: number, lz: number): Spot => ({ x: h.cx + lx, z: h.cz + lz }),
  });

  // ---------- shell, partitions, labels ----------
  // Cutaway open-top room shell with a front doorway at (cx, cz + d/2)
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

  // Low interior partition wall (axis aligned) with door gaps. Gaps are given in world coords along the wall axis.
  const partition = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    gaps: [number, number][] = [],
    color = 0xf1e7d6,
    trim = 0x8b5e34,
    h = 1.5,
  ) => {
    const horizontal = Math.abs(z2 - z1) < 1e-6;
    const a = horizontal ? Math.min(x1, x2) : Math.min(z1, z2);
    const b = horizontal ? Math.max(x1, x2) : Math.max(z1, z2);
    const fixed = horizontal ? z1 : x1;
    const sorted = [...gaps].sort((p, q) => p[0] - q[0]);
    const segs: [number, number][] = [];
    let cur = a;
    for (const [g0, g1] of sorted) {
      if (g0 > cur) segs.push([cur, g0]);
      cur = Math.max(cur, g1);
    }
    if (cur < b) segs.push([cur, b]);
    const t = 0.22;
    const wMat = mat(color, 0.9);
    const tMat = mat(trim, 0.7);
    segs.forEach(([s0, s1]) => {
      const len = s1 - s0;
      const mid = (s0 + s1) / 2;
      if (horizontal) {
        box(scene, len, h, t, 0, mid, h / 2, fixed, { material: wMat });
        box(scene, len + 0.04, 0.08, t + 0.06, 0, mid, h + 0.04, fixed, { material: tMat });
        solid(mid, fixed, len / 2, t / 2);
      } else {
        box(scene, t, h, len, 0, fixed, h / 2, mid, { material: wMat });
        box(scene, t + 0.06, 0.08, len + 0.04, 0, fixed, h + 0.04, mid, { material: tMat });
        solid(fixed, mid, t / 2, len / 2);
      }
    });
  };

  // Room caption painted on the floor (reads upright from the usual south-looking camera)
  const roomLabel = (text: string, x: number, z: number, w = 2.6, bg = '#1f2937', fg = '#fde68a') => {
    const s = sign(scene, text, w, 0.38, bg, fg, x, 0.06, z);
    s.rotation.x = -Math.PI / 2;
    return s;
  };

  // Checkered tile floor
  const tileFloor = (x0: number, z0: number, x1: number, z1: number, size: number, a: number, b: number, y = 0.03) => {
    strip((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, a, y);
    const nx = Math.max(1, Math.round((x1 - x0) / size));
    const nz = Math.max(1, Math.round((z1 - z0) / size));
    const sx = (x1 - x0) / nx;
    const sz = (z1 - z0) / nz;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        if ((i + j) % 2 === 0) strip(x0 + sx * (i + 0.5), z0 + sz * (j + 0.5), sx, sz, b, y + 0.003);
      }
    }
  };

  // Glass screen (shower stalls)
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.28,
    roughness: 0.1,
    metalness: 0.3,
    depthWrite: false,
  });
  const glassPane = (x: number, z: number, w: number, d: number, h = 1.9) => {
    const m = box(scene, w, h, d, 0, x, h / 2, z, { material: glassMat, cast: false });
    box(scene, w, 0.05, d, 0xd4d4d8, x, h, z, { metal: 0.7 });
    solid(x, z, w / 2, d / 2);
    return m;
  };

  // ---------- bedroom furniture ----------
  const buildPrayerRug = (tierId: string, p: Spot, color = 0x0d6b4c, border = 0xf5b335) => {
    const g = new THREE.Group();
    box(g, 1.35, 0.02, 2.1, border, 0, 0.015, 0, { cast: false });
    box(g, 1.15, 0.024, 1.85, color, 0, 0.019, 0, { cast: false });
    const arch = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.38, 12, 1, 0, Math.PI), mat(border, 0.8));
    arch.rotation.x = -Math.PI / 2;
    arch.position.set(0, 0.026, -0.55);
    g.add(arch);
    place(g, p.x, 0, p.z);
    registerFurniture({ tierId, furnitureKey: 'rug', group: g, baseX: p.x, baseY: 0, baseZ: p.z, baseRotY: 0 });
    return g;
  };

  const buildWardrobe = (tierId: string, p: Spot, isTrunk = false) => {
    const g = new THREE.Group();
    if (isTrunk) {
      // Classic boarding school metal trunk box (Apoti Irin)
      box(g, 1.3, 0.55, 0.75, 0x1d4ed8, 0, 0.28, 0, { metal: 0.5, rough: 0.4 });
      box(g, 1.34, 0.08, 0.79, 0xfacc15, 0, 0.54, 0, { metal: 0.6 });
      box(g, 0.18, 0.14, 0.06, 0xfacc15, 0, 0.38, 0.39);
      for (const sx of [-0.6, 0.6]) box(g, 0.06, 0.58, 0.8, 0xfacc15, sx, 0.28, 0, { metal: 0.6 });
    } else {
      // Tall wooden 2-door wardrobe with cornice
      box(g, 1.4, 2.1, 0.7, 0x5d3a1a, 0, 1.05, 0);
      box(g, 1.5, 0.08, 0.76, 0x3b1d0e, 0, 2.14, 0);
      box(g, 0.64, 1.9, 0.05, 0x7c4d25, -0.34, 1.05, 0.36);
      box(g, 0.64, 1.9, 0.05, 0x7c4d25, 0.34, 1.05, 0.36);
      cyl(g, 0.03, 0.03, 0.18, 0xfacc15, -0.08, 1.05, 0.4, 6);
      cyl(g, 0.03, 0.03, 0.18, 0xfacc15, 0.08, 1.05, 0.4, 6);
    }
    place(g, p.x, 0, p.z);
    registerFurniture({ tierId, furnitureKey: 'wardrobe', group: g, baseX: p.x, baseY: 0, baseZ: p.z, baseRotY: 0 });
    solid(p.x, p.z, 0.7, 0.4);
    return g;
  };

  // Default Study Desk & Chair set (replaced by the Mahogany desk when asset_desk is bought)
  const buildStudyDeskUnit = (tierId: string, p: Spot, tableColor = 0x78350f, chairColor = 0x5c2e14) => {
    const g = new THREE.Group();
    box(g, 1.3, 0.72, 0.75, tableColor, 0, 0.36, 0);
    box(g, 0.36, 0.03, 0.25, 0xfef3c7, 0, 0.74, -0.05); // open notebook
    box(g, 0.03, 0.02, 0.22, 0x1e3a8a, 0.22, 0.75, -0.05); // pen
    box(g, 0.55, 0.07, 0.5, chairColor, 0, 0.46, 0.55);
    box(g, 0.55, 0.48, 0.07, chairColor, 0, 0.72, 0.78);
    for (const [cx, cz] of [[-0.22, 0.35], [0.22, 0.35], [-0.22, 0.75], [0.22, 0.75]]) {
      cyl(g, 0.035, 0.03, 0.45, 0x3b1d0e, cx, 0.22, cz, 6);
    }
    place(g, p.x, 0, p.z);
    registerFurniture({
      tierId, furnitureKey: 'desk', group: g, baseX: p.x, baseY: 0, baseZ: p.z, baseRotY: 0, defaultFor: 'asset_desk',
    });
    return g;
  };

  // ---------- bathroom fixtures ----------
  const buildToilet = (p: Spot, ry = 0) => {
    const g = new THREE.Group();
    cyl(g, 0.22, 0.25, 0.44, 0xf8fafc, 0, 0.22, 0.05, 12);
    box(g, 0.38, 0.05, 0.44, 0xf1f5f9, 0, 0.45, 0.08);
    box(g, 0.42, 0.46, 0.22, 0xf8fafc, 0, 0.69, -0.16);
    cyl(g, 0.04, 0.04, 0.03, 0xd4d4d8, 0, 0.93, -0.16, 8); // dual-flush button
    g.rotation.y = ry;
    place(g, p.x, 0, p.z);
    solid(p.x, p.z, 0.35, 0.35);
    return g;
  };

  const buildWashBasin = (p: Spot, ry = 0) => {
    const g = new THREE.Group();
    box(g, 0.52, 0.82, 0.44, 0xf8fafc, 0, 0.41, 0);
    box(g, 0.46, 0.1, 0.38, 0xe2e8f0, 0, 0.84, 0);
    cyl(g, 0.02, 0.02, 0.16, 0xd4d4d8, 0, 0.96, -0.15, 6);
    box(g, 0.52, 0.72, 0.04, 0x93c5fd, 0, 1.48, -0.22, { metal: 0.85, rough: 0.1 }); // mirror
    box(g, 0.56, 0.76, 0.02, 0xd4d4d8, 0, 1.48, -0.235, { metal: 0.7 }); // frame
    g.rotation.y = ry;
    place(g, p.x, 0, p.z);
    solid(p.x, p.z, 0.35, 0.35);
    return g;
  };

  const buildShower = (p: Spot, rustic = false) => {
    const g = new THREE.Group();
    box(g, 0.95, 0.02, 0.95, rustic ? 0x64748b : 0xe2e8f0, 0, 0.015, 0, { cast: false }); // tray / floor drain
    cyl(g, 0.02, 0.02, 1.3, 0xd4d4d8, 0, 1.45, -0.38, 6); // riser pipe
    cyl(g, 0.14, 0.04, 0.06, 0xd4d4d8, 0, 2.08, -0.22, 10); // rainfall head
    box(g, 0.04, 0.04, 0.2, 0xd4d4d8, 0, 2.1, -0.32, { metal: 0.7 });
    if (rustic) {
      // Blue plastic bucket under the borehole tap
      cyl(g, 0.22, 0.18, 0.42, 0x0284c7, 0.32, 0.21, 0.2, 10);
      cyl(g, 0.02, 0.02, 0.12, 0xd4d4d8, 0.32, 0.52, -0.38, 6);
    } else {
      cyl(g, 0.03, 0.03, 0.08, 0xd4d4d8, 0.3, 1.1, -0.42, 8); // thermostat dial
    }
    place(g, p.x, 0, p.z);
    return g;
  };

  // Tiled Wudu bench (raised, with two bronze taps and a drainage trough)
  const buildWuduBench = (p: Spot) => {
    const g = new THREE.Group();
    box(g, 1.6, 0.38, 0.48, 0x0284c7, 0, 0.19, 0);
    box(g, 1.6, 0.04, 0.42, 0x0369a1, 0, 0.02, 0.48);
    box(g, 1.7, 0.04, 0.54, 0xe0f2fe, 0, 0.4, 0, { cast: false });
    for (const bx of [-0.45, 0.45]) {
      cyl(g, 0.025, 0.025, 0.18, 0xd97706, bx, 0.72, -0.15, 6);
      cyl(g, 0.06, 0.02, 0.04, 0xd97706, bx, 0.68, -0.05, 6);
      box(g, 0.05, 0.9, 0.04, 0xd97706, bx, 0.55, -0.22, { metal: 0.6 });
    }
    sign(g, '💧 WUDU (ABLUTION) STATION', 1.8, 0.32, '#0369a1', '#f0f9ff', 0, 1.25, -0.22);
    place(g, p.x, 0, p.z);
    solid(p.x, p.z, 0.9, 0.45);
    return g;
  };

  // Tenement bucket-bath kit: 200L drum + bailer + wash bowl + bucket
  const buildWaterDrum = (p: Spot) => {
    const g = new THREE.Group();
    cyl(g, 0.34, 0.34, 0.96, 0x1d4ed8, 0, 0.48, 0, 14);
    for (const ry of [0.2, 0.5, 0.8]) cyl(g, 0.355, 0.355, 0.05, 0x1e40af, 0, ry, 0, 14);
    cyl(g, 0.3, 0.3, 0.05, 0x2563eb, 0, 0.99, 0, 14); // lid
    // Yellow plastic bailer scoop hooked on the rim
    cyl(g, 0.09, 0.07, 0.11, 0xfacc15, 0.26, 1.05, 0.2, 8);
    const handle = box(g, 0.04, 0.04, 0.26, 0xfacc15, 0.2, 1.1, 0.3);
    handle.rotation.x = 0.3;
    // Spigot
    cyl(g, 0.02, 0.02, 0.14, 0xd4d4d8, 0, 0.2, 0.38, 6).rotation.x = Math.PI / 2;
    place(g, p.x, 0, p.z);
    solid(p.x, p.z, 0.36, 0.36);
    return g;
  };

  const buildWashBowl = (p: Spot) => {
    const g = new THREE.Group();
    cyl(g, 0.34, 0.24, 0.16, 0xdc2626, 0, 0.08, 0, 14); // red plastic basin
    cyl(g, 0.3, 0.3, 0.02, 0x7dd3fc, 0, 0.13, 0, 14); // water
    cyl(g, 0.17, 0.14, 0.34, 0xfacc15, 0.55, 0.17, 0.1, 10); // yellow bucket
    place(g, p.x, 0, p.z);
    return g;
  };

  // Pit latrine: concrete slab + keyhole + plank cover leaning aside
  const buildLatrine = (p: Spot) => {
    const g = new THREE.Group();
    box(g, 1.1, 0.14, 1.1, 0x9ca3af, 0, 0.07, 0);
    cyl(g, 0.15, 0.15, 0.02, 0x0f172a, 0, 0.145, 0.02, 12);
    box(g, 0.16, 0.02, 0.3, 0x0f172a, 0, 0.145, 0.2);
    for (const sx of [-0.28, 0.28]) box(g, 0.2, 0.05, 0.34, 0x6b7280, sx, 0.165, -0.1);
    const cover = box(g, 0.5, 0.04, 0.5, 0x92400e, 0.78, 0.25, -0.1);
    cover.rotation.z = -0.9;
    cyl(g, 0.12, 0.1, 0.24, 0x0284c7, -0.6, 0.12, 0.5, 8); // flushing can
    place(g, p.x, 0, p.z);
    return g;
  };

  // ---------- kitchen ----------
  const buildFridge = (p: Spot, color = 0xcbd5e1, ry = 0) => {
    const g = new THREE.Group();
    box(g, 0.85, 1.85, 0.8, color, 0, 0.93, 0, { metal: 0.5, rough: 0.3 });
    box(g, 0.83, 0.03, 0.02, 0x64748b, 0, 1.2, 0.41); // door seam
    box(g, 0.04, 0.4, 0.04, 0x475569, 0.32, 1.5, 0.43);
    box(g, 0.04, 0.5, 0.04, 0x475569, 0.32, 0.8, 0.43);
    g.rotation.y = ry;
    place(g, p.x, 0, p.z);
    solid(p.x, p.z, 0.45, 0.45);
    return g;
  };

  // Counter run: sink + double gas cooker + 12.5kg LPG cylinder (with regulator & hose) + dish rack
  const buildKitchenUnit = (p: Spot, executive = false) => {
    const g = new THREE.Group();
    const counterColor = executive ? 0x1e293b : 0x78350f;
    const topColor = executive ? 0xf8fafc : 0x334155;
    box(g, 2.4, 0.85, 0.72, counterColor, 0, 0.42, 0);
    box(g, 2.45, 0.06, 0.76, topColor, 0, 0.86, 0);
    box(g, 2.45, 0.5, 0.04, executive ? 0xe2e8f0 : 0xf1f5f9, 0, 1.14, -0.37, { cast: false }); // tiled splashback
    // Stainless sink with mixer tap
    box(g, 0.65, 0.08, 0.52, 0x94a3b8, -0.65, 0.85, 0, { metal: 0.6, rough: 0.3 });
    cyl(g, 0.02, 0.02, 0.22, 0xd4d4d8, -0.65, 0.99, -0.26, 6);
    box(g, 0.02, 0.02, 0.16, 0xd4d4d8, -0.65, 1.1, -0.18, { metal: 0.7 });
    // Gas cooker
    box(g, 0.78, 0.05, 0.54, 0x18181b, 0.45, 0.89, 0);
    const burners: [number, number][] = executive
      ? [[0.28, -0.1], [0.62, -0.1], [0.28, 0.12], [0.62, 0.12]]
      : [[0.3, -0.05], [0.6, -0.05]];
    burners.forEach(([bx, bz]) => {
      cyl(g, 0.12, 0.12, 0.04, 0x27272a, bx, 0.93, bz, 10);
      cyl(g, 0.05, 0.05, 0.03, 0x71717a, bx, 0.96, bz, 8);
    });
    for (const kx of [0.25, 0.45, 0.65]) cyl(g, 0.025, 0.025, 0.04, 0xd4d4d8, kx, 0.84, 0.37, 6).rotation.x = Math.PI / 2;
    // Kettle on the burner
    cyl(g, 0.1, 0.13, 0.16, 0x94a3b8, burners[0][0], 1.04, burners[0][1], 10);
    if (executive) {
      box(g, 0.9, 0.35, 0.6, 0x94a3b8, 0.45, 1.85, 0, { metal: 0.6, rough: 0.3 }); // extractor hood
      box(g, 0.3, 0.5, 0.3, 0x94a3b8, 0.45, 2.2, -0.15, { metal: 0.6 });
    }
    // Lagos 12.5kg gas cylinder (yellow) + regulator + hose
    cyl(g, 0.22, 0.22, 0.68, 0xfacc15, 1.35, 0.34, 0.0, 12);
    cyl(g, 0.22, 0.12, 0.1, 0xfacc15, 1.35, 0.72, 0.0, 12);
    cyl(g, 0.05, 0.05, 0.1, 0xdc2626, 1.35, 0.82, 0.0, 8); // regulator
    const hose = cyl(g, 0.014, 0.014, 0.82, 0x111827, 1.0, 0.88, 0.0, 6);
    hose.rotation.z = Math.PI / 2 - 0.12;
    // Wall dish rack with plates
    box(g, 1.2, 0.05, 0.28, 0x64748b, -0.4, 1.52, -0.3);
    box(g, 1.2, 0.05, 0.28, 0x64748b, -0.4, 1.28, -0.3);
    for (let i = -2; i <= 2; i++) box(g, 0.02, 0.22, 0.22, 0xf8fafc, -0.4 + i * 0.12, 1.4, -0.3);
    place(g, p.x, 0, p.z);
    solid(p.x, p.z, 1.4, 0.45);
    return g;
  };

  // Kerosene cooking bench for the shared tenement passage
  const buildKeroseneBench = (p: Spot) => {
    const g = new THREE.Group();
    box(g, 3.2, 0.1, 0.8, 0x78350f, 0, 0.62, 0); // table top
    for (const lx of [-1.5, 1.5]) for (const lz of [-0.32, 0.32]) box(g, 0.08, 0.6, 0.08, 0x451a03, lx, 0.3, lz);
    box(g, 3.0, 0.05, 0.7, 0x57534e, 0, 0.2, 0); // lower plank
    // Twin kerosene stoves (squat brass drums with burner ring)
    for (const sx of [-0.9, -0.2]) {
      cyl(g, 0.2, 0.22, 0.22, 0xb45309, sx, 0.78, 0, 12, 0.5);
      cyl(g, 0.12, 0.12, 0.04, 0x27272a, sx, 0.92, 0, 10);
      cyl(g, 0.02, 0.02, 0.1, 0xd4d4d8, sx + 0.18, 0.76, 0.2, 6); // wick knob
    }
    // Aluminium cooking pots with lids
    cyl(g, 0.22, 0.2, 0.26, 0xcbd5e1, -0.9, 1.08, 0, 14, 0.4);
    cyl(g, 0.23, 0.23, 0.04, 0x94a3b8, -0.9, 1.23, 0, 14);
    cyl(g, 0.17, 0.15, 0.2, 0xe2e8f0, -0.2, 1.04, 0, 14, 0.4);
    cyl(g, 0.02, 0.02, 0.08, 0x18181b, -0.2, 1.17, 0, 6);
    // Provision tins (tomato, milk, sardine) lined up
    const tins = [0xdc2626, 0xfacc15, 0x16a34a, 0xdc2626, 0xf97316];
    tins.forEach((c, i) => cyl(g, 0.065, 0.065, 0.11, c, 0.55 + i * 0.17, 0.72, 0.18, 8));
    box(g, 0.3, 0.2, 0.25, 0xf5f5f4, 1.3, 0.78, 0.0); // salt/seasoning crate
    cyl(g, 0.15, 0.13, 0.22, 0x7c2d12, 0.8, 0.78, -0.18, 10); // clay pot
    place(g, p.x, 0, p.z);
    solid(p.x, p.z, 1.65, 0.45);
    return g;
  };

  const buildProvisionShelf = (p: Spot) => {
    const g = new THREE.Group();
    box(g, 0.9, 1.5, 0.36, 0x451a03, 0, 0.75, 0);
    for (let s = 0; s < 3; s++) {
      const sy = 0.3 + s * 0.45;
      box(g, 0.84, 0.04, 0.34, 0x78350f, 0, sy, 0.02);
      for (let k = -2; k <= 2; k++) {
        cyl(g, 0.055, 0.055, 0.14, [0xdc2626, 0xfacc15, 0x16a34a, 0x2563eb, 0xf97316][(k + 2 + s) % 5], k * 0.16, sy + 0.09, 0.04, 8);
      }
    }
    place(g, p.x, 0, p.z);
    solid(p.x, p.z, 0.46, 0.2);
    return g;
  };

  // Marble kitchen island with bar stools
  const buildKitchenIsland = (p: Spot) => {
    const g = new THREE.Group();
    box(g, 2.4, 0.86, 1.0, 0x1e293b, 0, 0.43, 0);
    box(g, 2.5, 0.06, 1.1, 0xf8fafc, 0, 0.89, 0, { rough: 0.2 });
    for (const sx of [-0.7, 0, 0.7]) {
      cyl(g, 0.17, 0.17, 0.06, 0x7c2d12, sx, 0.62, 0.9, 10);
      cyl(g, 0.03, 0.03, 0.6, 0xd4d4d8, sx, 0.3, 0.9, 6);
    }
    place(g, p.x, 0, p.z);
    solid(p.x, p.z, 1.25, 0.55);
    return g;
  };

  // ---------- living areas ----------
  const buildSofa = (p: Spot, ry: number, len = 2.8, color = 0x0f766e, backColor = 0x115e59) => {
    const g = new THREE.Group();
    box(g, len, 0.45, 0.85, color, 0, 0.24, 0);
    box(g, len, 0.5, 0.22, backColor, 0, 0.7, -0.32);
    for (const sx of [-1, 1]) box(g, 0.2, 0.32, 0.85, backColor, sx * (len / 2 - 0.1), 0.52, 0);
    for (const sx of [-len / 4, len / 4]) box(g, len / 2 - 0.15, 0.12, 0.62, color, sx, 0.5, 0.05); // seat cushions
    g.rotation.y = ry;
    place(g, p.x, 0, p.z);
    const sw = Math.abs(Math.cos(ry)) > 0.5 ? len / 2 : 0.5;
    const sd = Math.abs(Math.cos(ry)) > 0.5 ? 0.5 : len / 2;
    solid(p.x, p.z, sw, sd);
    return g;
  };

  const buildLowTable = (p: Spot, w: number, d: number, color = 0x451a03) => {
    const g = new THREE.Group();
    box(g, w, 0.06, d, color, 0, 0.4, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.08, 0.38, 0.08, 0x2a1205, sx * (w / 2 - 0.08), 0.19, sz * (d / 2 - 0.08));
    cyl(g, 0.12, 0.1, 0.1, 0xfde047, 0, 0.48, 0, 8); // brass tray
    place(g, p.x, 0, p.z);
    return g;
  };

  const buildPouf = (p: Spot, color = 0x92400e) => {
    const g = new THREE.Group();
    cyl(g, 0.3, 0.32, 0.32, color, 0, 0.17, 0, 12);
    cyl(g, 0.22, 0.28, 0.06, 0xfde68a, 0, 0.35, 0, 12);
    place(g, p.x, 0, p.z);
    return g;
  };

  const buildTvUnit = (p: Spot, ry: number) => {
    const g = new THREE.Group();
    box(g, 1.7, 0.5, 0.46, 0x451a03, 0, 0.25, 0);
    box(g, 1.2, 0.7, 0.06, 0x111827, 0, 0.95, 0);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.12, 0.62),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x38bdf8, emissiveIntensity: 0.35 }),
    );
    screen.position.set(0, 0.95, 0.035);
    g.add(screen);
    cyl(g, 0.03, 0.03, 0.1, 0x27272a, 0, 0.55, 0, 6);
    g.rotation.y = ry;
    place(g, p.x, 0, p.z);
    solid(p.x, p.z, ry === 0 ? 0.9 : 0.3, ry === 0 ? 0.3 : 0.9);
    return g;
  };

  const buildBench = (p: Spot, ry: number, len = 1.8) => {
    const g = new THREE.Group();
    box(g, len, 0.07, 0.4, 0x78350f, 0, 0.42, 0);
    for (const sx of [-1, 1]) box(g, 0.07, 0.4, 0.34, 0x451a03, sx * (len / 2 - 0.1), 0.2, 0);
    box(g, len - 0.1, 0.03, 0.26, 0xfef3c7, 0, 0.47, 0.0); // open Mushaf strip
    g.rotation.y = ry;
    place(g, p.x, 0, p.z);
    return g;
  };

  const buildBlackboard = (p: Spot, ry: number, w = 3.0) => {
    const g = new THREE.Group();
    box(g, w + 0.2, 1.3, 0.1, 0x5c2e14, 0, 1.4, 0);
    box(g, w, 1.1, 0.12, 0x0f2e22, 0, 1.4, 0.01);
    box(g, w, 0.06, 0.16, 0x78350f, 0, 0.8, 0.06); // chalk ledge
    box(g, 0.3, 0.025, 0.04, 0xffffff, -w / 4, 0.84, 0.08); // chalk
    for (const sx of [-1, 1]) box(g, 0.08, 1.0, 0.08, 0x451a03, sx * (w / 2), 0.5, -0.05);
    sign(g, 'HALAQAH · COURTYARD MADRASAH', Math.min(2.8, w - 0.2), 0.34, '#065f46', '#fde047', 0, 2.2, 0.07);
    g.rotation.y = ry;
    place(g, p.x, 0, p.z);
    return g;
  };

  const buildPlanter = (p: Spot, plant = 0x15803d) => {
    const g = new THREE.Group();
    cyl(g, 0.38, 0.3, 0.45, 0xb45309, 0, 0.23, 0, 10);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mat(plant));
    leaf.position.y = 0.85;
    leaf.castShadow = true;
    g.add(leaf);
    place(g, p.x, 0, p.z);
    solid(p.x, p.z, 0.4, 0.4);
    return g;
  };

  const buildClothesline = (a: Spot, b: Spot) => {
    for (const s of [a, b]) {
      cyl(scene, 0.05, 0.06, 2.1, 0x57534e, s.x, 1.05, s.z, 6);
      solid(s.x, s.z, 0.1, 0.1);
    }
    const len = Math.abs(b.x - a.x);
    box(scene, len, 0.015, 0.015, 0xe5e7eb, (a.x + b.x) / 2, 2.05, a.z, { cast: false });
    const cloths = [0xf97316, 0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a];
    cloths.forEach((c, i) => box(scene, 0.5, 0.7, 0.02, c, a.x + 0.7 + i * (len - 1.2) / 4, 1.68, a.z, { cast: false }));
  };

  // ---------- carports & parked vehicles (all built facing +z, towards the avenue) ----------
  const carportRoofMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    transparent: true,
    opacity: 0.62,
    roughness: 0.5,
    metalness: 0.4,
    side: THREE.DoubleSide,
  });
  const ROOF_TILT = -0.06; // front (+z) higher than back so rain drains away from the avenue

  const buildCarport = (h: HouseLayout, trim: number) => {
    const c = h.carport;
    const len = Math.abs(c.zFront - c.zBack);
    const zMid = (c.zFront + c.zBack) / 2;
    // Concrete slab + dropped kerb at the mouth
    strip(c.cx, zMid, c.w, len, 0x9ca3af, 0.026);
    strip(c.cx, c.zFront - 0.2, c.w, 0.5, 0xd1d5db, 0.03);
    // Parking bay lines
    for (const lx of [-c.w / 2 + 0.1, 0, c.w / 2 - 0.1]) {
      box(scene, 0.07, 0.01, len - 0.4, 0xf8fafc, c.cx + lx, 0.034, zMid, { cast: false });
    }
    // Steel posts (3 pairs) + side rails
    const postZ = [c.zFront - 0.2, zMid, c.zBack + 0.2];
    for (const sx of [-1, 1]) {
      const px = c.cx + sx * (c.w / 2 - 0.08);
      postZ.forEach((pz) => {
        box(scene, 0.12, 2.6, 0.12, 0x475569, px, 1.3, pz, { metal: 0.6, rough: 0.4 });
        solid(px, pz, 0.08, 0.08);
      });
      box(scene, 0.1, 0.12, len, trim, px, 2.52, zMid);
    }
    // Back wall of the bay: low block wall so vehicles never clip the neighbour
    box(scene, c.w, 1.0, 0.2, 0xe5e7eb, c.cx, 0.5, c.zBack, {});
    solid(c.cx, c.zBack, c.w / 2, 0.12);
    // Sloped corrugated roof + ribs
    const roof = new THREE.Group();
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(c.w + 0.5, 0.06, len + 0.5), carportRoofMat);
    sheet.castShadow = true;
    roof.add(sheet);
    for (let r = -Math.floor(c.w / 0.5 / 2); r <= Math.floor(c.w / 0.5 / 2); r++) {
      box(roof, 0.05, 0.07, len + 0.5, 0x334155, r * 0.5, 0.05, 0, { cast: false });
    }
    box(roof, c.w + 0.55, 0.18, 0.1, trim, 0, 0, (len + 0.5) / 2); // fascia board
    roof.rotation.x = ROOF_TILT;
    place(roof, c.cx, 2.78, zMid);
    // Hanging garage sign on the front beam
    box(scene, c.w, 0.14, 0.12, trim, c.cx, 2.5, c.zFront - 0.2);
    sign(scene, `🅿 ${h.label.split(' (')[0].toUpperCase()} GARAGE`, Math.min(3.4, c.w - 0.5), 0.36, '#1f2937', '#fde68a', c.cx, 2.28, c.zFront - 0.12);
  };

  const parkedBicycle = () => {
    const g = new THREE.Group();
    const tire = mat(0x1e293b, 0.8);
    for (const z of [-0.55, 0.55]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 8, 22), tire);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.36, z);
      wheel.castShadow = true;
      g.add(wheel);
      cyl(g, 0.04, 0.04, 0.1, 0xcbd5e1, 0, 0.36, z, 8).rotation.z = Math.PI / 2;
      const spokes = cyl(g, 0.006, 0.006, 0.66, 0xcbd5e1, 0, 0.36, z, 4);
      spokes.rotation.x = Math.PI / 2;
    }
    const frame = 0x059669;
    box(g, 0.05, 0.05, 0.86, frame, 0, 0.68, -0.02); // top tube
    const down = box(g, 0.05, 0.05, 0.78, frame, 0, 0.5, 0.12);
    down.rotation.x = 0.55;
    box(g, 0.05, 0.5, 0.05, frame, 0, 0.62, -0.38); // seat tube
    const fork = box(g, 0.04, 0.62, 0.04, 0xcbd5e1, 0, 0.62, 0.5);
    fork.rotation.x = -0.2;
    box(g, 0.14, 0.06, 0.3, 0x18181b, 0, 0.93, -0.4); // saddle
    box(g, 0.52, 0.04, 0.04, 0xcbd5e1, 0, 1.0, 0.43); // handlebar
    for (const sx of [-0.26, 0.26]) cyl(g, 0.02, 0.02, 0.1, 0x18181b, sx, 1.0, 0.43, 6).rotation.z = Math.PI / 2;
    box(g, 0.28, 0.03, 0.42, 0x374151, 0, 0.76, -0.66); // carrier rack
    cyl(g, 0.06, 0.06, 0.04, 0xcbd5e1, 0, 0.3, -0.05, 8).rotation.z = Math.PI / 2; // crank
    box(g, 0.02, 0.3, 0.02, 0x64748b, 0.12, 0.2, -0.05).rotation.x = 0.3; // kickstand
    return g;
  };

  const parkedOkada = () => {
    const g = new THREE.Group();
    const tire = mat(0x18181b, 0.85);
    for (const z of [-0.78, 0.78]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.09, 10, 20), tire);
      t.rotation.y = Math.PI / 2;
      t.position.set(0, 0.4, z);
      t.castShadow = true;
      g.add(t);
      cyl(g, 0.17, 0.17, 0.14, 0x94a3b8, 0, 0.4, z, 10).rotation.z = Math.PI / 2;
    }
    box(g, 0.36, 0.3, 0.62, 0xdc2626, 0, 0.9, 0.2, { metal: 0.4, rough: 0.3 }); // fuel tank
    box(g, 0.34, 0.14, 0.9, 0x18181b, 0, 0.8, -0.42); // dual seat
    box(g, 0.3, 0.34, 0.5, 0x52525b, 0, 0.5, 0.0, { metal: 0.5 }); // engine block
    const exhaust = cyl(g, 0.045, 0.04, 0.9, 0xd4d4d8, 0.2, 0.36, -0.45, 8);
    exhaust.rotation.x = Math.PI / 2 - 0.08;
    const fork = cyl(g, 0.04, 0.04, 0.8, 0xd4d4d8, 0, 0.7, 0.62, 8);
    fork.rotation.x = -0.2;
    box(g, 0.74, 0.06, 0.07, 0xd4d4d8, 0, 1.12, 0.55); // handlebar
    box(g, 0.36, 0.04, 0.5, 0xdc2626, 0, 0.62, 0.74); // front mudguard
    box(g, 0.34, 0.04, 0.52, 0xdc2626, 0, 0.64, -0.82); // rear mudguard
    box(g, 0.4, 0.04, 0.5, 0x374151, 0, 0.9, -1.0); // luggage carrier
    const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), headMat);
    headlight.position.set(0, 0.98, 0.74);
    g.add(headlight);
    box(g, 0.1, 0.07, 0.04, 0xef4444, 0, 0.8, -1.04, { cast: false }); // tail light
    for (const sx of [-0.4, 0.4]) {
      box(g, 0.02, 0.02, 0.2, 0xd4d4d8, sx, 1.2, 0.55).rotation.x = -0.4; // mirror stalks
      box(g, 0.1, 0.07, 0.02, 0x93c5fd, sx, 1.26, 0.45, { metal: 0.8 });
    }
    return g;
  };

  const parkedScooter = () => {
    const g = new THREE.Group();
    const tire = mat(0x18181b, 0.9);
    for (const z of [-0.42, 0.42]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 14), tire);
      w.rotation.z = Math.PI / 2;
      w.position.set(0, 0.14, z);
      w.castShadow = true;
      g.add(w);
    }
    box(g, 0.24, 0.07, 0.95, 0x18181b, 0, 0.18, 0);
    box(g, 0.2, 0.05, 0.4, 0x0891b2, 0, 0.23, -0.2); // grip tape
    cyl(g, 0.025, 0.025, 1.05, 0xd4d4d8, 0, 0.7, 0.42, 8);
    box(g, 0.58, 0.05, 0.06, 0xd4d4d8, 0, 1.2, 0.42);
    box(g, 0.14, 0.1, 0.08, 0x0f172a, 0, 1.12, 0.42); // display
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xfff1a0, emissiveIntensity: 1.2 }),
    );
    head.position.set(0, 1.12, 0.5);
    g.add(head);
    box(g, 0.28, 0.03, 0.3, 0x0891b2, 0, 0.3, -0.5); // rear fender
    return g;
  };

  const parkedKeke = () => {
    const g = new THREE.Group();
    const tire = mat(0x18181b, 0.9);
    box(g, 1.4, 0.55, 2.0, 0xffc61a, 0, 0.66, -0.1); // lower body
    box(g, 1.44, 0.14, 2.04, 0x1a1a1a, 0, 0.42, -0.1, { cast: false }); // skirt
    box(g, 1.2, 0.5, 0.9, 0x1f2937, 0, 1.02, -0.62); // passenger bench
    box(g, 1.2, 0.5, 0.1, 0x1f2937, 0, 1.28, -1.02);
    // Front cowl + windscreen
    box(g, 1.0, 0.7, 0.6, 0xffc61a, 0, 0.8, 0.9);
    const ws = box(g, 1.2, 0.6, 0.05, 0x93c5fd, 0, 1.3, 0.62, { metal: 0.6, rough: 0.1 });
    ws.rotation.x = -0.25;
    ws.material = glassMat;
    // Green canopy on 4 posts
    box(g, 1.55, 0.09, 2.2, 0x15803d, 0, 1.82, -0.2);
    for (const [px, pz] of [[-0.7, 0.5], [0.7, 0.5], [-0.7, -1.05], [0.7, -1.05]]) {
      cyl(g, 0.03, 0.03, 1.0, 0x18181b, px, 1.33, pz, 6);
    }
    box(g, 1.4, 0.4, 0.03, 0x111827, 0, 1.52, -1.06); // rear curtain
    for (const [wx, wz] of [[0, 1.05], [-0.72, -0.85], [0.72, -0.85]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.16, 14), tire);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.31, wz);
      w.castShadow = true;
      g.add(w);
      cyl(g, 0.14, 0.14, 0.18, 0x94a3b8, wx, 0.31, wz, 8).rotation.z = Math.PI / 2;
    }
    box(g, 0.4, 0.04, 0.7, 0xffc61a, 0, 0.62, 1.05); // front fender
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), headMat);
    lamp.position.set(0, 0.95, 1.22);
    g.add(lamp);
    box(g, 0.5, 0.22, 0.03, 0xfef08a, 0, 0.5, -1.12, { cast: false }); // plate
    return g;
  };

  const parkedCar = () => {
    const g = new THREE.Group();
    const paint = 0x1e3a8a;
    const glass = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.85 });
    box(g, 1.85, 0.5, 4.4, paint, 0, 0.62, 0, { metal: 0.55, rough: 0.28 }); // body
    box(g, 1.8, 0.14, 1.3, paint, 0, 0.92, 1.45, { metal: 0.55, rough: 0.28 }); // bonnet
    box(g, 1.8, 0.14, 0.9, paint, 0, 0.92, -1.75, { metal: 0.55, rough: 0.28 }); // boot
    box(g, 1.62, 0.5, 2.1, paint, 0, 1.2, -0.2, { metal: 0.5, rough: 0.3 }); // cabin
    box(g, 1.68, 0.06, 2.0, 0x172554, 0, 1.47, -0.2, { metal: 0.5 }); // roof
    const wsF = box(g, 1.54, 0.46, 0.06, 0x0f172a, 0, 1.2, 0.88, { metal: 0.8, rough: 0.1 });
    wsF.rotation.x = 0.5;
    wsF.material = glass;
    const wsR = box(g, 1.54, 0.46, 0.06, 0x0f172a, 0, 1.2, -1.3, { metal: 0.8, rough: 0.1 });
    wsR.rotation.x = -0.5;
    wsR.material = glass;
    for (const sx of [-0.82, 0.82]) {
      box(g, 0.04, 0.38, 1.9, 0x0f172a, sx, 1.22, -0.2, { metal: 0.8, rough: 0.1 }).material = glass;
      box(g, 0.1, 0.1, 0.16, paint, sx * 1.1, 1.05, 0.6); // wing mirror
    }
    for (const [wx, wz] of [[-0.92, -1.3], [0.92, -1.3], [-0.92, 1.3], [0.92, 1.3]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.22, 16), mat(0x18181b, 0.9));
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.36, wz);
      w.castShadow = true;
      g.add(w);
      cyl(g, 0.2, 0.2, 0.24, 0xcbd5e1, wx, 0.36, wz, 8, 0.3).rotation.z = Math.PI / 2;
    }
    for (const sx of [-0.68, 0.68]) {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), headMat);
      hl.position.set(sx, 0.7, 2.2);
      g.add(hl);
      box(g, 0.34, 0.12, 0.05, 0xdc2626, sx, 0.78, -2.2, { cast: false }); // tail lamp
    }
    box(g, 1.0, 0.16, 0.05, 0x111827, 0, 0.55, 2.2); // grille
    box(g, 1.86, 0.14, 0.2, 0x111827, 0, 0.36, 2.15); // bumpers
    box(g, 1.86, 0.14, 0.2, 0x111827, 0, 0.36, -2.15);
    box(g, 0.5, 0.14, 0.03, 0xf8fafc, 0, 0.5, -2.24, { cast: false }); // plate
    return g;
  };

  const parkedSolarRoof = (h: HouseLayout) => {
    const c = h.carport;
    const g = new THREE.Group();
    const panelMat = mat(0x1d4ed8, 0.2, 0.6);
    const len = Math.abs(c.zFront - c.zBack);
    const rows = Math.max(2, Math.floor((len - 1) / 1.8));
    for (let r = 0; r < rows; r++) {
      const pz = -len / 2 + 1.1 + r * 1.8;
      for (const sx of [-1, 1]) {
        const pane = box(g, 1.0, 0.05, 1.6, 0x1d4ed8, sx * (c.w / 4 + 0.05), 0.09, pz, { material: panelMat });
        pane.castShadow = true;
        box(g, 0.02, 0.055, 1.6, 0xe2e8f0, sx * (c.w / 4 + 0.05), 0.092, pz, { cast: false });
        box(g, 1.0, 0.055, 0.02, 0xe2e8f0, sx * (c.w / 4 + 0.05), 0.092, pz, { cast: false });
      }
    }
    return g;
  };

  // Attach upgrade pieces (bed, desk, fan, shelf, solar, AC, rehal, whiteboard, vehicles) for one house
  const attachHouseUpgrades = (h: HouseLayout) => {
    const tierId = h.id;
    const reg = (
      key: string,
      group: THREE.Object3D,
      spot: Spot,
      upgradeId: string,
      baseY = 0,
      baseRotY = 0,
    ) => {
      place(group, spot.x, baseY, spot.z);
      registerFurniture({
        tierId, furnitureKey: key, group, baseX: spot.x, baseY, baseZ: spot.z, baseRotY, upgradeId,
      });
    };

    // 1. Orthopedic Foam Mattress & Mosquito Net Canopy (asset_mattress)
    const mattG = new THREE.Group();
    box(mattG, 1.75, 0.34, 2.35, 0x1e40af, 0, 0.22, 0);
    box(mattG, 1.68, 0.08, 2.25, 0xf8fafc, 0, 0.41, 0);
    box(mattG, 1.2, 0.16, 0.45, 0xffffff, 0, 0.5, -0.82);
    box(mattG, 1.7, 0.09, 1.1, 0x10b981, 0, 0.46, 0.45);
    for (const [px, pz] of [[-0.82, -1.1], [0.82, -1.1], [-0.82, 1.1], [0.82, 1.1]]) {
      cyl(mattG, 0.025, 0.025, 1.85, 0xe2e8f0, px, 0.95, pz, 6);
    }
    box(mattG, 1.7, 0.04, 2.25, 0xe0f2fe, 0, 1.88, 0);
    reg('bed', mattG, h.bed, 'asset_mattress');

    // 2. Mahogany Study Desk, Chair & glowing LED Lantern (asset_desk)
    const deskG = new THREE.Group();
    box(deskG, 1.5, 0.1, 0.85, 0x4a2511, 0, 0.78, 0);
    for (const [lx, lz] of [[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]]) {
      cyl(deskG, 0.05, 0.04, 0.76, 0x3b1d0e, lx, 0.38, lz, 6);
    }
    box(deskG, 0.42, 0.04, 0.3, 0x059669, 0, 0.85, -0.05);
    box(deskG, 0.38, 0.05, 0.26, 0xfef3c7, 0, 0.87, -0.05);
    cyl(deskG, 0.09, 0.11, 0.12, 0xd97706, -0.55, 0.89, -0.15, 8);
    const lanternBulb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfde047, emissiveIntensity: 1.6 }),
    );
    lanternBulb.position.set(-0.55, 1.05, -0.15);
    deskG.add(lanternBulb);
    box(deskG, 0.55, 0.07, 0.52, 0x5c2e14, 0, 0.46, 0.55);
    box(deskG, 0.55, 0.52, 0.07, 0x5c2e14, 0, 0.75, 0.78);
    for (const [cx, cz] of [[-0.22, 0.35], [0.22, 0.35], [-0.22, 0.75], [0.22, 0.75]]) {
      cyl(deskG, 0.035, 0.03, 0.45, 0x3b1d0e, cx, 0.22, cz, 6);
    }
    reg('desk', deskG, h.desk, 'asset_desk');

    // 3. Standing OX Fan with spinning blades (asset_fan)
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
    reg('fan', fanG, h.fan, 'asset_fan');

    // 4. Private Home Maktabah Bookshelf (asset_maktabah)
    const shelfG = new THREE.Group();
    box(shelfG, 1.65, 2.15, 0.42, 0x451a03, 0, 1.08, 0);
    const bookColors = [0x059669, 0xb91c1c, 0x1d4ed8, 0xd97706, 0x7c3aed, 0x0f766e];
    for (let s = 0; s < 4; s++) {
      const sy = 0.35 + s * 0.48;
      box(shelfG, 1.52, 0.05, 0.38, 0x78350f, 0, sy, 0.02);
      for (let k = -5; k <= 5; k++) {
        box(shelfG, 0.1, 0.34, 0.28, bookColors[Math.abs(k + s) % bookColors.length], k * 0.12, sy + 0.19, 0.04);
      }
    }
    reg('maktabah', shelfG, h.shelf, 'asset_maktabah');

    // 5. Solar system (asset_solar): inverter + battery bank indoors, PV array on the carport roof
    const solarG = new THREE.Group();
    box(solarG, 0.55, 0.72, 0.25, 0xf8fafc, 0, 1.25, 0);
    box(solarG, 0.14, 0.08, 0.27, 0x10b981, 0, 1.38, 0.01);
    box(solarG, 0.75, 0.48, 0.42, 0x1e293b, 0, 0.24, 0.1);
    box(solarG, 0.5, 0.03, 0.02, 0xfacc15, 0, 1.0, 0.13); // cable gland strip
    reg('solar', solarG, h.solar, 'asset_solar');
    const roofSolar = parkedSolarRoof(h);
    roofSolar.rotation.x = ROOF_TILT;
    place(roofSolar, h.carport.cx, 2.78, (h.carport.zFront + h.carport.zBack) / 2);
    registerFurniture({
      tierId, furnitureKey: 'solar_roof', group: roofSolar, baseX: h.carport.cx, baseY: 2.78,
      baseZ: (h.carport.zFront + h.carport.zBack) / 2, baseRotY: 0, upgradeId: 'asset_solar',
    });

    // 6. Wall-hung inverter AC on the back wall (asset_ac)
    const acG = new THREE.Group();
    box(acG, 1.0, 0.3, 0.22, 0xf8fafc, 0, 0, 0);
    box(acG, 0.92, 0.04, 0.2, 0xcbd5e1, 0, -0.1, 0.02);
    box(acG, 0.1, 0.03, 0.02, 0x38bdf8, 0.34, 0.06, 0.115, { cast: false });
    box(acG, 0.12, 0.12, 0.05, 0xe2e8f0, -0.3, -0.22, 0.02);
    reg('ac', acG, h.ac, 'asset_ac', 2.3);

    // 7. Rehal (hardwood folding Quran stand, asset_rehal)
    const rehalG = new THREE.Group();
    box(rehalG, 0.56, 0.04, 0.34, 0x78350f, 0, 0.72, 0);
    const rBoard = box(rehalG, 0.56, 0.04, 0.4, 0x92400e, 0, 0.8, 0);
    rBoard.rotation.x = -0.35;
    const rMushaf = box(rehalG, 0.4, 0.03, 0.3, 0x059669, 0, 0.84, -0.01);
    rMushaf.rotation.x = -0.35;
    const rBook = box(rehalG, 0.36, 0.035, 0.26, 0xfef3c7, 0, 0.86, -0.01);
    rBook.rotation.x = -0.35;
    for (const sx of [-1, 1]) {
      const leg = box(rehalG, 0.05, 0.72, 0.05, 0x451a03, sx * 0.22, 0.36, 0);
      leg.rotation.z = sx * 0.08;
    }
    reg('rehal', rehalG, h.rehal, 'asset_rehal');

    // 8. Rolling whiteboard easel (asset_whiteboard)
    const wbG = new THREE.Group();
    box(wbG, 1.3, 0.9, 0.05, 0xf8fafc, 0, 1.2, 0, { rough: 0.2 });
    box(wbG, 1.38, 0.06, 0.07, 0x64748b, 0, 1.68, 0, { metal: 0.6 });
    box(wbG, 1.38, 0.06, 0.07, 0x64748b, 0, 0.72, 0, { metal: 0.6 });
    box(wbG, 0.5, 0.03, 0.02, 0x2563eb, -0.2, 1.4, 0.03, { cast: false });
    box(wbG, 0.4, 0.03, 0.02, 0xdc2626, -0.25, 1.25, 0.03, { cast: false });
    box(wbG, 0.3, 0.03, 0.02, 0x16a34a, -0.3, 1.1, 0.03, { cast: false });
    box(wbG, 0.5, 0.04, 0.1, 0x94a3b8, 0, 0.68, 0.06); // marker tray
    for (const sx of [-0.55, 0.55]) {
      box(wbG, 0.05, 0.7, 0.05, 0x64748b, sx, 0.35, 0, { metal: 0.6 });
      cyl(wbG, 0.05, 0.05, 0.04, 0x18181b, sx, 0.05, 0, 8);
    }
    reg('whiteboard', wbG, h.whiteboard, 'asset_whiteboard');

    // 9-13. Vehicles parked nose-out in the covered carport bay
    const slots = h.carport.slots;
    reg('bicycle', parkedBicycle(), slots.bicycle, 'asset_bicycle');
    reg('scooter', parkedScooter(), slots.scooter, 'asset_scooter');
    reg('okada', parkedOkada(), slots.okada, 'asset_okada');
    reg('keke', parkedKeke(), slots.keke, 'asset_keke');
    reg('car', parkedCar(), slots.car, 'asset_car');
  };

  // ---------- 1. 3D DAILY CLASSROOM HALL (cx = 31, cz = -12, 18m x 13m) ----------
  buildRoomShell(31, -12, 18, 13, 0xe0f2fe, 0x047857, 0xfef3c7, 4.2, 2.2);
  sign(scene, 'MADRASAH DAILY CLASSROOM HALL (6 SUBJECTS)', 6.8, 0.68, '#047857', '#fde68a', 31, 3.45, -5.45);
  strip(31, -12, 15.5, 10.2, 0x065f46, 0.026);
  strip(31, -12, 14.5, 9.2, 0x047857, 0.03);

  const subjectStations: {
    x: number; z: number; label: string; bg: string; rug: number; faceSouth: boolean;
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
    box(scene, 3.4, 1.35, 0.1, 0x5c2e14, st.x, 1.45, st.z - 0.5);
    box(scene, 3.2, 1.15, 0.12, 0x0f2e22, st.x, 1.45, st.z - 0.49);
    sign(scene, st.label, 3.1, 0.42, st.bg, '#fffbeb', st.x, 2.32, st.z - 0.45);
    for (const dx of [-0.95, 0.95]) {
      box(scene, 0.75, 0.32, 0.45, 0x78350f, st.x + dx, 0.16, st.z + 1.45);
      box(scene, 0.42, 0.05, 0.3, 0xfef3c7, st.x + dx, 0.35, st.z + 1.45);
    }
  });

  // ---------- 2. HOUSE TIER 1: RUWAQ MADRASAH BOARDING DORM ----------
  {
    const h = HOUSES.ruwaq;
    const F = frame(h);
    buildRoomShell(h.cx, h.cz, h.w, h.d, 0xfef3c7, 0x92400e, 0xe7d8c1, h.doorW, 2.0);
    sign(scene, '1. RUWAQ BOARDING DORM (STARTER HOME)', 5.6, 0.62, '#78350f', '#fde68a', h.cx, 3.35, doorZ(h));
    // Default straw sleeping mat
    const ruwaqBed = new THREE.Group();
    box(ruwaqBed, 1.8, 0.04, 2.5, 0xd4a373, 0, 0.02, 0, { cast: false });
    box(ruwaqBed, 1.1, 0.1, 0.38, 0x92400e, 0, 0.06, -0.9);
    place(ruwaqBed, h.bed.x, 0, h.bed.z);
    registerFurniture({
      tierId: h.id, furnitureKey: 'bed', group: ruwaqBed, baseX: h.bed.x, baseY: 0, baseZ: h.bed.z, baseRotY: 0,
      defaultFor: 'asset_mattress',
    });
    // Roommates' mats on the east wall (Moruf, Bilal & Abdul) with trunk boxes
    for (const lz of [-3.8, -0.6, 2.6]) {
      strip(F.x(4.2), F.z(lz), 1.7, 2.2, 0xcab388, 0.03);
      box(scene, 0.95, 0.42, 0.55, 0x334155, F.x(5.3), 0.21, F.z(lz));
    }
    buildStudyDeskUnit(h.id, h.desk, 0x8d5a2b, 0x78350f);
    buildPrayerRug(h.id, h.rug, 0x14532d, 0xfacc15);
    buildWardrobe(h.id, h.wardrobe, true);
    box(scene, 1.3, 0.75, 0.7, 0x78350f, h.ledger.x, 0.38, h.ledger.z);
    sign(scene, 'FURNISH & UPGRADE HOME', 1.8, 0.35, '#92400e', '#fde68a', h.ledger.x, 1.15, h.ledger.z);
    roomLabel('SLEEPING QUARTERS', F.x(-1.0), F.z(2.4), 3.2, '#78350f');
    buildCarport(h, 0x92400e);
    attachHouseUpgrades(h);
  }

  // ---------- 3. HOUSE TIER 2: OFF-CAMPUS ROOM, EJIGBO "FACE-ME-I-FACE-YOU" TENEMENT ----------
  {
    const h = HOUSES.shared_room;
    const F = frame(h);
    buildRoomShell(h.cx, h.cz, h.w, h.d, 0xe0f2fe, 0x0369a1, 0xf1f5f9, h.doorW, 2.1);
    sign(scene, '2. OFF-CAMPUS STUDENT ROOM (EJIGBO)', 5.6, 0.62, '#0369a1', '#f0f9ff', h.cx, 3.35, doorZ(h));

    // Floors: wooden private room / cement passage / concrete backyard
    strip(F.x(-3.0), F.z(-2.75), 6.6, 6.2, 0xd9c3a0, 0.03);
    strip(F.x(0), F.z(3.25), 12.6, 5.2, 0xcbd5e1, 0.03);
    strip(F.x(3.5), F.z(-2.75), 5.8, 6.2, 0xa8a29e, 0.03);

    // Walls: one cross wall (private-room door + backyard door) and the backyard cubicles
    partition(F.x(-6.5), F.z(0.5), F.x(6.5), F.z(0.5), [[F.x(-3.4), F.x(-1.8)], [F.x(3.0), F.x(4.6)]], 0xe7e5e4, 0x0369a1);
    partition(F.x(0.5), F.z(-6), F.x(0.5), F.z(0.5), [], 0xe7e5e4, 0x0369a1);
    // Bucket-bath cubicle
    partition(F.x(0.5), F.z(-3.0), F.x(4.3), F.z(-3.0), [[F.x(1.2), F.x(2.4)]], 0xbfdbfe, 0x1d4ed8);
    // Latrine cubicle
    partition(F.x(4.3), F.z(-6), F.x(4.3), F.z(-3.0), [], 0xd6d3d1, 0x57534e);
    partition(F.x(4.3), F.z(-3.0), F.x(6.5), F.z(-3.0), [[F.x(4.8), F.x(5.8)]], 0xd6d3d1, 0x57534e);

    // Private room
    strip(F.x(-3.0), F.z(-2.9), 4.4, 4.0, 0x0284c7, 0.034); // decorative rug
    const sharedBed = new THREE.Group();
    box(sharedBed, 1.85, 0.32, 2.45, 0x5c2e14, 0, 0.16, 0);
    box(sharedBed, 1.7, 0.16, 2.3, 0x93c5fd, 0, 0.38, 0);
    box(sharedBed, 1.2, 0.12, 0.4, 0xffffff, 0, 0.52, -0.85);
    place(sharedBed, h.bed.x, 0, h.bed.z);
    registerFurniture({
      tierId: h.id, furnitureKey: 'bed', group: sharedBed, baseX: h.bed.x, baseY: 0, baseZ: h.bed.z, baseRotY: 0,
      defaultFor: 'asset_mattress',
    });
    buildStudyDeskUnit(h.id, h.desk, 0x78350f, 0x5c2e14);
    buildPrayerRug(h.id, h.rug, 0x1e3a8a, 0xfde047);
    buildWardrobe(h.id, h.wardrobe, false);
    roomLabel('PRIVATE ROOM', F.x(-1.9), F.z(-0.15), 2.2, '#0369a1', '#f0f9ff');

    // Shared cooking passage
    buildKeroseneBench(F.p(-4.4, 5.3));
    buildProvisionShelf(F.p(-2.3, 5.55));
    roomLabel('SHARED COOKING PASSAGE', F.x(3.0), F.z(2.0), 4.6, '#334155', '#fde68a');
    box(scene, 1.3, 0.75, 0.7, 0x0369a1, h.ledger.x, 0.38, h.ledger.z);
    sign(scene, 'LEASE & FURNISHINGS', 1.8, 0.35, '#0369a1', '#ffffff', h.ledger.x, 1.15, h.ledger.z);

    // Backyard tenement bathroom, latrine & washing line
    buildWaterDrum(F.p(3.35, -5.25));
    buildWashBowl(F.p(1.7, -5.15));
    box(scene, 0.95, 0.02, 0.95, 0x64748b, F.x(2.2), 0.04, F.z(-4.4), { cast: false }); // drain plate
    roomLabel('BACKYARD BATH', F.x(2.4), F.z(-3.55), 2.2, '#1d4ed8', '#e0f2fe');
    buildLatrine(F.p(5.4, -4.9));
    roomLabel('LATRINE', F.x(5.3), F.z(-3.55), 1.5, '#57534e', '#f5f5f4');
    buildClothesline(F.p(1.2, -1.2), F.p(5.8, -1.2));
    roomLabel('BACKYARD', F.x(3.5), F.z(-0.3), 2.0, '#a16207', '#fef9c3');

    buildCarport(h, 0x0369a1);
    attachHouseUpgrades(h);
  }

  // ---------- 4. HOUSE TIER 3: SELF-CONTAINED MINI-FLAT, OKE-AFA ----------
  {
    const h = HOUSES.mini_flat;
    const F = frame(h);
    buildRoomShell(h.cx, h.cz, h.w, h.d, 0xffedd5, 0xc2410c, 0xfef3c7, h.doorW, 2.2);
    sign(scene, '3. SELF-CONTAINED MINI-FLAT (OKE-AFA)', 6.0, 0.62, '#c2410c', '#fff7ed', h.cx, 3.35, doorZ(h));

    // Floors
    strip(F.x(-4.75), F.z(-3.75), 6.2, 5.2, 0xd6b98c, 0.03); // master bedroom wood
    tileFloor(F.x(-1.32), F.z(-6.32), F.x(3.32), F.z(-1.18), 0.95, 0xf5f5f4, 0xd6d3d1); // kitchen
    tileFloor(F.x(3.68), F.z(-6.32), F.x(7.82), F.z(-1.18), 0.9, 0xe0f2fe, 0xbae6fd); // bathroom
    tileFloor(F.x(-7.82), F.z(-0.82), F.x(7.82), F.z(6.32), 1.3, 0xfaf0dc, 0xf1e0bf, 0.03); // parlour

    // Walls: parlour cross-wall + two dividers (bedroom | kitchen | bathroom)
    partition(F.x(-8), F.z(-1), F.x(8), F.z(-1), [[F.x(-3.8), F.x(-2.4)], [F.x(0.0), F.x(2.2)], [F.x(5.0), F.x(6.2)]], 0xfff7ed, 0xc2410c);
    partition(F.x(-1.5), F.z(-6.5), F.x(-1.5), F.z(-1), [], 0xfff7ed, 0xc2410c);
    partition(F.x(3.5), F.z(-6.5), F.x(3.5), F.z(-1), [], 0xe0f2fe, 0x0369a1);

    // Master bedroom
    const flatBed = new THREE.Group();
    box(flatBed, 2.1, 0.38, 2.5, 0x451a03, 0, 0.19, 0);
    box(flatBed, 2.1, 1.1, 0.18, 0x451a03, 0, 0.55, -1.2);
    box(flatBed, 1.95, 0.22, 2.35, 0xfef08a, 0, 0.45, 0.1);
    box(flatBed, 0.7, 0.14, 0.4, 0xffffff, -0.5, 0.64, -0.85);
    box(flatBed, 0.7, 0.14, 0.4, 0xffffff, 0.5, 0.64, -0.85);
    place(flatBed, h.bed.x, 0, h.bed.z);
    registerFurniture({
      tierId: h.id, furnitureKey: 'bed', group: flatBed, baseX: h.bed.x, baseY: 0, baseZ: h.bed.z, baseRotY: 0,
      defaultFor: 'asset_mattress',
    });
    buildStudyDeskUnit(h.id, h.desk, 0x5c2e14, 0x451a03);
    buildPrayerRug(h.id, h.rug, 0x065f46, 0xf59e0b);
    buildWardrobe(h.id, h.wardrobe, false);
    roomLabel('MASTER BEDROOM', F.x(-4.75), F.z(-1.7), 2.8, '#c2410c', '#fff7ed');

    // Private indoor kitchen
    buildKitchenUnit(F.p(0.4, -5.9), false);
    buildFridge(F.p(2.8, -5.8));
    box(scene, 1.0, 0.8, 0.5, 0x78350f, F.x(-0.5), 0.4, F.z(-2.3)); // prep table
    box(scene, 1.06, 0.05, 0.56, 0x334155, F.x(-0.5), 0.82, F.z(-2.3));
    solid(F.x(-0.5), F.z(-2.3), 0.55, 0.3);
    roomLabel('KITCHEN', F.x(1.1), F.z(-1.7), 1.9, '#334155', '#fde68a');

    // Private bathroom & toilet (borehole water)
    buildShower(F.p(4.6, -5.85), true);
    glassPane(F.x(5.2), F.z(-5.7), 0.05, 1.3, 2.0);
    glassPane(F.x(4.9), F.z(-5.0), 0.6, 0.05, 2.0);
    buildWashBasin(F.p(6.0, -5.9));
    buildToilet(F.p(7.15, -5.9));
    roomLabel('BATHROOM & WC', F.x(5.6), F.z(-1.7), 2.6, '#0369a1', '#f0f9ff');

    // Parlour: L-sofa facing a TV console, rug, low table
    strip(F.x(3.9), F.z(2.2), 5.6, 4.4, 0x9a3412, 0.034);
    strip(F.x(3.9), F.z(2.2), 5.0, 3.8, 0xc2410c, 0.036);
    buildSofa(F.p(7.1, 2.2), -Math.PI / 2, 3.2, 0x0f766e, 0x115e59);
    buildSofa(F.p(2.5, 4.6), Math.PI, 2.2, 0x0f766e, 0x115e59);
    buildLowTable(F.p(4.7, 2.2), 1.4, 0.8);
    buildTvUnit(F.p(1.0, 2.2), Math.PI / 2);
    roomLabel('PARLOUR', F.x(3.9), F.z(0.0), 2.0, '#9a3412', '#ffedd5');
    // Muraaja'ah study circle for fellow scholars
    strip(F.x(-4.6), F.z(2.9), 3.8, 3.8, 0x14532d, 0.034);
    strip(F.x(-4.6), F.z(2.9), 3.3, 3.3, 0x15803d, 0.036);
    for (const [lx, lz] of [[-5.8, 2.2], [-3.4, 2.2], [-5.8, 3.8], [-3.4, 3.8]]) buildPouf(F.p(lx, lz), 0x92400e);
    roomLabel("MURAAJA'AH CIRCLE", F.x(-4.6), F.z(5.4), 3.0, '#14532d', '#fde68a');
    box(scene, 1.4, 0.75, 0.75, 0xc2410c, h.ledger.x, 0.38, h.ledger.z);
    sign(scene, 'FLAT & ASSET MANAGER', 1.9, 0.35, '#c2410c', '#ffffff', h.ledger.x, 1.15, h.ledger.z);

    buildCarport(h, 0xc2410c);
    attachHouseUpgrades(h);
  }

  // ---------- 5. HOUSE TIER 4: SHEIKH'S PERSONAL VILLA / DUPLEX & COURTYARD MADRASAH ----------
  {
    const h = HOUSES.personal_villa;
    const F = frame(h);
    buildRoomShell(h.cx, h.cz, h.w, h.d, 0xecfdf5, 0x047857, 0xfef9c3, h.doorW, 2.4);
    sign(scene, '4. DAR ASH-SHEIKH (PERSONAL VILLA · +₦2,500/DAY)', 7.2, 0.68, '#065f46', '#fde047', h.cx, 3.45, doorZ(h));

    // Floors
    strip(F.x(-7.25), F.z(-4.5), 5.3, 5.8, 0xd6b98c, 0.03); // master bedroom
    tileFloor(F.x(-4.32), F.z(-7.32), F.x(-1.38), F.z(-1.68), 0.94, 0xe0f2fe, 0xbae6fd); // ensuite
    tileFloor(F.x(-1.02), F.z(-7.32), F.x(4.02), F.z(-1.68), 1.0, 0xf5f5f4, 0xcbd5e1); // kitchen & pantry
    strip(F.x(7.1), F.z(-4.5), 5.6, 5.8, 0x8b6b4a, 0.03); // study
    strip(F.x(-6.2), F.z(3.0), 7.4, 8.2, 0x7f1d1d, 0.03); // royal majlis carpet
    strip(F.x(-6.2), F.z(3.0), 6.6, 7.4, 0x991b1b, 0.034);
    strip(F.x(-6.2), F.z(3.0), 5.8, 6.6, 0xfacc15, 0.036);
    strip(F.x(-6.2), F.z(3.0), 5.5, 6.3, 0x7f1d1d, 0.038);
    tileFloor(F.x(2.6), F.z(-1.3), F.x(9.82), F.z(7.32), 1.2, 0xe7d7b0, 0xd6c28f); // courtyard paving
    strip(F.x(0), F.z(4.0), 4.0, 6.6, 0xd6d3d1, 0.032); // entrance hall

    // Walls: master | ensuite | kitchen | study along the north band, one long cross-wall
    partition(F.x(-10), F.z(-1.5), F.x(10), F.z(-1.5), [[F.x(-8.0), F.x(-6.6)], [F.x(0.4), F.x(2.6)], [F.x(8.2), F.x(9.6)]], 0xf0fdf4, 0x047857);
    partition(F.x(-4.5), F.z(-7.5), F.x(-4.5), F.z(-1.5), [[F.z(-4.4), F.z(-3.2)]], 0xf0fdf4, 0x047857);
    partition(F.x(-1.2), F.z(-7.5), F.x(-1.2), F.z(-1.5), [], 0xe0f2fe, 0x0369a1);
    partition(F.x(4.2), F.z(-7.5), F.x(4.2), F.z(-1.5), [[F.z(-3.4), F.z(-2.2)]], 0xf0fdf4, 0x047857);

    // Master bedroom: royal four-poster
    const villaBed = new THREE.Group();
    box(villaBed, 2.4, 0.45, 2.7, 0x451a03, 0, 0.22, 0);
    box(villaBed, 2.25, 0.25, 2.55, 0x10b981, 0, 0.52, 0);
    box(villaBed, 2.4, 1.3, 0.16, 0x451a03, 0, 0.9, -1.3);
    for (const sx of [-0.55, 0.55]) box(villaBed, 0.8, 0.16, 0.45, 0xffffff, sx, 0.74, -0.95);
    for (const [px, pz] of [[-1.1, -1.25], [1.1, -1.25], [-1.1, 1.25], [1.1, 1.25]]) {
      cyl(villaBed, 0.05, 0.05, 2.2, 0xd97706, px, 1.1, pz, 8);
    }
    place(villaBed, h.bed.x, 0, h.bed.z);
    registerFurniture({
      tierId: h.id, furnitureKey: 'bed', group: villaBed, baseX: h.bed.x, baseY: 0, baseZ: h.bed.z, baseRotY: 0,
      defaultFor: 'asset_mattress',
    });
    buildWardrobe(h.id, h.wardrobe, false);
    roomLabel('MASTER SUITE', F.x(-7.25), F.z(-2.0), 2.6, '#065f46', '#fde047');

    // Ensuite royal bathroom
    buildShower(F.p(-3.8, -6.85), false);
    glassPane(F.x(-3.2), F.z(-6.4), 0.05, 1.7, 2.0);
    glassPane(F.x(-3.45), F.z(-5.55), 0.6, 0.05, 2.0);
    buildWashBasin(F.p(-2.7, -6.95));
    buildToilet(F.p(-1.85, -6.9));
    roomLabel('ENSUITE', F.x(-2.85), F.z(-2.0), 1.9, '#0369a1', '#f0f9ff');

    // Executive kitchen & pantry
    buildKitchenUnit(F.p(0.4, -6.95), true);
    buildFridge(F.p(3.35, -6.8), 0xe2e8f0);
    buildKitchenIsland(F.p(1.1, -4.0));
    // Pantry cupboard bank on the east wall (faces west)
    const pantry = new THREE.Group();
    box(pantry, 1.7, 2.0, 0.5, 0x451a03, 0, 1.0, 0);
    for (let s = 0; s < 4; s++) {
      box(pantry, 1.6, 0.04, 0.46, 0x78350f, 0, 0.35 + s * 0.45, 0.02);
      for (let k = -3; k <= 3; k++) {
        cyl(pantry, 0.07, 0.07, 0.2, [0xf59e0b, 0xdc2626, 0x16a34a, 0xf8fafc][(k + 3 + s) % 4], k * 0.22, 0.47 + s * 0.45, 0.05, 8);
      }
    }
    pantry.rotation.y = -Math.PI / 2;
    place(pantry, F.x(3.8), 0, F.z(-4.75));
    solid(F.x(3.8), F.z(-4.75), 0.3, 0.9);
    roomLabel('KITCHEN & PANTRY', F.x(1.5), F.z(-2.0), 3.0, '#334155', '#fde68a');

    // Scholar's study
    buildStudyDeskUnit(h.id, h.desk, 0x451a03, 0x3b1d0e);
    buildPrayerRug(h.id, h.rug, 0x064e3b, 0xfacc15);
    roomLabel("SCHOLAR'S STUDY", F.x(7.1), F.z(-2.0), 2.8, '#451a03', '#fde68a');

    // Royal majlis reception
    buildSofa(F.p(-3.3, -0.75), 0, 3.8, 0x1e3a8a, 0x172554);
    buildSofa(F.p(-9.0, 2.8), Math.PI / 2, 3.8, 0x1e3a8a, 0x172554);
    buildLowTable(F.p(-6.2, 2.8), 1.8, 1.1, 0x451a03);
    for (const [lx, lz] of [[-6.8, 5.6], [-5.6, 5.6]]) buildPouf(F.p(lx, lz), 0xb45309);
    roomLabel('ROYAL MAJLIS', F.x(-6.2), F.z(0.4), 2.6, '#7f1d1d', '#fde047');

    // Courtyard madrasah: benches facing the teaching board, wudu station, planters
    buildBlackboard(F.p(9.6, 3.4), -Math.PI / 2, 3.0);
    for (const bx of [3.8, 5.3, 6.8]) for (const bz of [2.2, 4.6]) buildBench(F.p(bx, bz), Math.PI / 2, 1.8);
    buildPouf(F.p(8.4, 3.4), 0x15803d);
    buildWuduBench(F.p(5.6, -1.0));
    buildPlanter(F.p(3.0, 6.6));
    buildPlanter(F.p(9.2, 6.6));
    buildPlanter(F.p(9.2, -0.6), 0x16a34a);
    roomLabel('COURTYARD MADRASAH', F.x(6.4), F.z(0.4), 3.4, '#065f46', '#fde047');

    box(scene, 1.5, 0.78, 0.8, 0x047857, h.ledger.x, 0.39, h.ledger.z);
    sign(scene, 'VILLA ESTATE & ASSETS', 2.0, 0.38, '#065f46', '#fde047', h.ledger.x, 1.2, h.ledger.z);

    buildCarport(h, 0x047857);
    attachHouseUpgrades(h);
  }

  // ---------- PHYSICAL LOCKED DOORS FOR UNOWNED HOUSES ----------
  interface HouseGate {
    tierId: string;
    doorGroup: THREE.Group;
    collider: Collider;
    savedBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  }
  const houseGates: HouseGate[] = [];
  const kLabel = (n: number) => `₦${n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : n}`;
  const addHouseGate = (h: HouseLayout) => {
    const tier = HOUSING_TIERS.find((t) => t.id === h.id);
    const priceLabel = tier
      ? `RENT ${kLabel(tier.rentPrice)}${tier.buyPrice ? ` / BUY ${kLabel(tier.buyPrice)}` : ''}`
      : '';
    const doorW = h.doorW;
    const gz = doorZ(h);
    const g = new THREE.Group();
    box(g, doorW, 2.2, 0.22, 0x3e2723, 0, 1.1, 0);
    box(g, doorW * 0.8, 0.1, 0.28, 0xd97706, 0, 1.1, 0);
    sign(g, `🔒 LOCKED · ${priceLabel}`, Math.min(3.2, doorW * 0.9), 0.42, '#7f1d1d', '#fde68a', 0, 1.65, 0.14);
    place(g, h.cx, 0, gz);
    const savedBounds = {
      minX: h.cx - doorW / 2 - 0.3,
      maxX: h.cx + doorW / 2 + 0.3,
      minZ: gz - 0.45,
      maxZ: gz + 0.45,
    };
    const collider: Collider = { ...savedBounds };
    colliders.push(collider);
    houseGates.push({ tierId: h.id, doorGroup: g, collider, savedBounds });
  };
  addHouseGate(HOUSES.shared_room);
  addHouseGate(HOUSES.mini_flat);
  addHouseGate(HOUSES.personal_villa);


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
    // Madrasah school compound courtyard trees
    [-13, -9], [13, -9], [-14, 4.5], [14.5, 1], [-3.5, 4.4], [4, 4.6],
    // North pedestrian sidewalk trees (z = 6.4, safely behind the north curb at z = 8.8)
    [-30, 6.4], [30, 6.4], [38, 6.4], [115, 6.4], [195, 6.4], [-75, 6.4], [-155, 6.4],
    // South commercial sidewalk shade trees (z = 31.5, safely behind the south curb at z = 25.6)
    [-22, 31.5], [26, 31.5], [-38, 31.5], [-115, 31.5], [-195, 31.5],
    [75, 31.5], [155, 31.5],
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
    if ((x < -36 || x > 135) && Math.abs(x - 225) > 22 && Math.abs(x + 225) > 22 && Math.abs(x - 180) > 14 && Math.abs(x - 380) > 14 && Math.abs(x - 540) > 16) {
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
    const v: Vehicle = { group: g, speed, dir, wheels, wheelR: 0.42, minX: -620, maxX: 620, width: 5.4, depth: 2.3, type: 'danfo' };
    vehicles.push(v);
    return v;
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
    const v: Vehicle = { group: g, speed, dir, wheels, wheelR: 0.3, minX: -620, maxX: 620, width: 2.8, depth: 1.8, type: 'keke' };
    vehicles.push(v);
    return v;
  };

  // Civilian saloon (faces +x like the other traffic)
  const makeSedan = (z: number, dir: 1 | -1, speed: number, x0: number, color: number) => {
    const g = new THREE.Group();
    const wheels: THREE.Group[] = [];
    box(g, 4.2, 0.55, 1.8, color, 0, 0.7, 0, { metal: 0.5, rough: 0.3 });
    box(g, 2.1, 0.55, 1.6, color, -0.3, 1.2, 0, { metal: 0.5, rough: 0.3 });
    box(g, 2.0, 0.42, 1.64, 0x0f172a, -0.3, 1.22, 0, { cast: false, metal: 0.8, rough: 0.1 });
    box(g, 1.9, 0.06, 1.7, color, -0.3, 1.5, 0);
    for (const hz of [-0.62, 0.62]) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), headMat);
      h.position.set(2.1, 0.82, hz);
      g.add(h);
      box(g, 0.05, 0.12, 0.34, 0xdc2626, -2.1, 0.82, hz, { cast: false });
    }
    box(g, 0.2, 0.14, 1.84, 0x111827, 2.1, 0.46, 0);
    box(g, 0.2, 0.14, 1.84, 0x111827, -2.1, 0.46, 0);
    for (const wx of [-1.3, 1.3]) for (const wz of [-0.82, 0.82]) addWheel(g, wheels, wx, wz, 0.36);
    g.position.set(x0, 0, z);
    g.rotation.y = dir === 1 ? 0 : Math.PI;
    scene.add(g);
    const v: Vehicle = { group: g, speed, dir, wheels, wheelR: 0.36, minX: -620, maxX: 620, width: 4.8, depth: 2.1, type: 'car' };
    vehicles.push(v);
    return v;
  };

  // Okada taxi bike (faces +x)
  const makeOkadaBike = (z: number, dir: 1 | -1, speed: number, x0: number, tank: number) => {
    const g = new THREE.Group();
    const wheels: THREE.Group[] = [];
    box(g, 0.7, 0.3, 0.34, tank, 0.25, 0.9, 0, { metal: 0.4, rough: 0.3 });
    box(g, 0.9, 0.14, 0.32, 0x18181b, -0.45, 0.82, 0);
    box(g, 0.5, 0.34, 0.3, 0x52525b, 0.0, 0.52, 0);
    box(g, 0.1, 0.08, 0.7, 0xd4d4d8, 0.65, 1.12, 0);
    const fork = cyl(g, 0.04, 0.04, 0.8, 0xd4d4d8, 0.65, 0.72, 0, 8);
    fork.rotation.z = 0.2;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), headMat);
    lamp.position.set(0.82, 0.98, 0);
    g.add(lamp);
    addWheel(g, wheels, 0.75, 0, 0.36);
    addWheel(g, wheels, -0.75, 0, 0.36);
    g.position.set(x0, 0, z);
    g.rotation.y = dir === 1 ? 0 : Math.PI;
    scene.add(g);
    const v: Vehicle = { group: g, speed, dir, wheels, wheelR: 0.36, minX: -620, maxX: 620, width: 2.4, depth: 1.0, type: 'okada' };
    vehicles.push(v);
    return v;
  };

  // --- Two-way 4-lane traffic. North carriageway drives EAST (+x), south carriageway drives WEST (-x).
  // Outer lanes carry through-traffic at one speed per lane (no clipping through each other);
  // inner lanes carry shuttle vehicles that U-turn at the median breaks.
  const trafficRng = (() => {
    let s = 41;
    return () => (s = (s * 9301 + 49297) % 233280) / 233280;
  })();
  const ROUTES = ['IDIMU-EJIGBO', 'OJUELEGBA-YABA', 'MUSHIN-OSHODI', 'ISOLO-IKOTUN', 'IKEJA-CMS', 'AGEGE-OBALENDE', 'OSHODI-APAPA', 'IYANA-IBA'];
  const carColors = [0x1e3a8a, 0xb91c1c, 0xf8fafc, 0x334155, 0x15803d, 0xa16207];
  const laneTraffic = (z: number, dir: 1 | -1, speed: number, phase: number) => {
    for (let i = 0; i < 9; i++) {
      const x0 = -600 + i * 135 + phase + (trafficRng() - 0.5) * 24;
      const kind = (i + (dir === 1 ? 0 : 2)) % 4;
      if (kind === 0 || kind === 2) makeDanfo(z, dir, speed, x0, ROUTES[(i * 3 + (dir === 1 ? 0 : 1)) % ROUTES.length]);
      else if (kind === 1) makeSedan(z, dir, speed, x0, carColors[Math.floor(trafficRng() * carColors.length)]);
      else makeKeke(z, dir, speed, x0);
    }
  };
  laneTraffic(HIGHWAY.lanes.eastOuter, 1, 7.5, 0);
  laneTraffic(HIGHWAY.lanes.westOuter, -1, 7.0, 60);

  const addShuttle = (v: Vehicle, west: number, east: number, startX: number, dir: 1 | -1) => {
    const zE = HIGHWAY.lanes.eastInner;
    const zW = HIGHWAY.lanes.westInner;
    v.shuttle = { east, west, zEast: zE, zWest: zW, phase: 'lane', theta: 0, cx: east, radius: (zW - zE) / 2 };
    v.dir = dir;
    v.speed = 6;
    v.group.position.set(startX, 0, dir === 1 ? zE : zW);
    v.group.rotation.y = dir === 1 ? 0 : Math.PI;
  };
  const zIn = HIGHWAY.lanes.eastInner;
  // Shuttle routes (disjoint median breaks so turning vehicles never meet)
  addShuttle(makeKeke(zIn, 1, 6, 0), -100, 110, -80, 1);
  addShuttle(makeOkadaBike(zIn, 1, 6, 0, 0xdc2626), -100, 110, -20, 1);
  addShuttle(makeOkadaBike(zIn, 1, 6, 0, 0x2563eb), 200, 290, 215, 1);
  addShuttle(makeKeke(zIn, 1, 6, 0), 200, 290, 250, 1);
  addShuttle(makeSedan(zIn, 1, 6, 0, 0xb91c1c), -380, -240, -360, 1);
  addShuttle(makeKeke(zIn, 1, 6, 0), -380, -240, -300, 1);
  addShuttle(makeKeke(zIn, 1, 6, 0), 400, 520, 415, 1);
  addShuttle(makeSedan(zIn, 1, 6, 0, 0xf8fafc), 400, 520, 470, 1);

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
  addNPC('basira', 'Iya Basira', 'Amala Queen', -15, 27.2, Math.PI, 'wave',
    { robe: 0xd32f2f, trim: 0xfff6e0, cap: 'hijab', capColor: 0xffffff, female: true, skin: 0x4a2c17 },
    ['Amala and gbegiri hot!', 'Ewedu don sweet!', 'Customer, come buy!']);
  addNPC('mallam', 'Mallam Idris', 'Book Seller', 12, 27.2, Math.PI, 'idle',
    { robe: 0xf5f5dc, trim: 0x1b8a64, cap: 'kofia', capColor: 0xffffff, beard: 0x333333, prop: 'tesbih', skin: 0x7a4a24 },
    ['Attar and Qurans here!', 'Knowledge is light.', 'Quality kofia, fair price.']);
  addNPC('waiter', 'Tunde', 'Danfo Passenger', 23, 8.2, 0, 'idle',
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

  // Roadside Shop Merchants (South Sidewalk, z = 27.2, facing North towards road)
  addNPC('aboki', 'Haruna', 'Suya Master', 85, 27.2, Math.PI, 'wave',
    { robe: 0x7f1d1d, trim: 0xfef08a, cap: 'kofia', capColor: 0xffffff, skin: 0x3b2314 },
    ['Hot beef suya and dry kilishi!', 'Spicy and fresh off the grill, Ustadh!', 'Taste small sample first!']);
  addNPC('chidinma', 'Mummy Chidinma', 'Provision Merchant', 140, 27.2, Math.PI, 'wave',
    { robe: 0x0284c7, trim: 0xffffff, cap: 'hijab', capColor: 0xbae6fd, female: true, skin: 0x5d3a1a },
    ['Cold pure water, Malt, and biscuits!', 'Recharge your energy here!', 'Welcome customer!']);
  addNPC('chuks', 'Bro Chuks', 'Electronics & Inverter Dealer', 260, 27.2, Math.PI, 'wave',
    { robe: 0x334155, trim: 0x38bdf8, cap: 'fila', capColor: 0x38bdf8, skin: 0x4a2c17 },
    ['Solar panels, tubular batteries, OX standing fans!', 'Say no to darkness and heat!', 'Quality guarantee!']);
  addNPC('chemist', 'Pharmacist Tolu', 'Licensed Chemist', -120, 27.2, Math.PI, 'idle',
    { robe: 0x166534, trim: 0xbbf7d0, cap: 'hijab', capColor: 0xffffff, female: true, skin: 0x5d3a1a },
    ['Vitamins, paracetamol, and herbal remedies for study fatigue!', 'Stay healthy for your exams!']);
  addNPC('mechanic', 'Master Ganiyu', 'Head Auto Mechanic', -200, 27.2, Math.PI, 'idle',
    { robe: 0x475569, trim: 0xfde047, cap: 'fila', capColor: 0xca8a04, beard: 0x333333, skin: 0x3b2314 },
    ['Okada tune-up, Keke engine service, tyre pumping!', 'Keep your machine running smoothly!']);
  addNPC('tailor', 'Alhaja Kudirat', 'Modest Fashion Designer', 320, 27.2, Math.PI, 'wave',
    { robe: 0x831843, trim: 0xfbcfe8, cap: 'hijab', capColor: 0xf472b6, female: true, skin: 0x4a2c17 },
    ['Crisp starched Jalabiyas, Aso-Oke caps, and gold-trimmed Abayas!', 'Look sharp for Friday Khutbah!']);

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
        if (item.furnitureKey === 'scooter' && mountVehicle === 'scooter') {
          item.group.visible = false;
          return;
        }
        if (item.furnitureKey === 'keke' && mountVehicle === 'keke') {
          item.group.visible = false;
          return;
        }
        if (item.furnitureKey === 'car' && mountVehicle === 'car') {
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
