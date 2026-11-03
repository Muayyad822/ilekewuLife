import * as THREE from 'three';

export type CapStyle = 'kofia' | 'turban' | 'hijab' | 'fila' | 'none';
export type Prop = 'slate' | 'cane' | 'kettle' | 'tesbih' | 'none';
export type Pose = 'idle' | 'walk' | 'run' | 'sit' | 'recite' | 'wave' | 'alfa';

export interface CharacterOptions {
  robe: number;
  trim?: number;
  skin: number;
  cap: CapStyle;
  capColor?: number;
  beard?: number; // beard colour; omit for none
  female?: boolean;
  scale?: number;
  prop?: Prop;
  phase?: number;
}

export interface Character {
  group: THREE.Group;
  headHeight: number;
  setPose: (pose: Pose) => void;
  update: (time: number, dt: number) => void;
  dispose: () => void;
}

/**
 * Articulated low-poly humanoid. Front of the character faces +Z.
 * Hierarchy: root > body (torso, head, arms) + legs. Arms/legs pivot at joints
 * so walking, sitting, reciting, waving and cane strikes are real skeletal motion.
 */
export function buildCharacter(o: CharacterOptions): Character {
  const root = new THREE.Group();
  const scale = o.scale ?? 1;
  root.scale.setScalar(scale);

  const M = (color: number, rough = 0.8) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true });
  const skin = M(o.skin, 0.65);
  const robe = M(o.robe, 0.85);
  const trim = M(o.trim ?? 0xf5b335, 0.5);
  const dark = M(0x111111, 0.4);

  const body = new THREE.Group();
  root.add(body);

  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  // ---- Torso / robe (jalabiya, agbada or long dress) ----
  const bottomR = o.female ? 0.38 : 0.31;
  add(body, new THREE.CylinderGeometry(0.19, bottomR, 0.97, 14), robe, 0, 0.82, 0);
  add(body, new THREE.CylinderGeometry(bottomR + 0.01, bottomR + 0.01, 0.06, 14), trim, 0, 0.37, 0); // hem band
  add(body, new THREE.CylinderGeometry(0.2, 0.2, 0.07, 14), trim, 0, 1.24, 0); // embroidered collar
  add(body, new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skin, 0, 1.34, 0); // neck

  // ---- Head ----
  const head = new THREE.Group();
  head.position.set(0, 1.5, 0);
  body.add(head);
  const skull = add(head, new THREE.SphereGeometry(0.16, 16, 14), skin);
  skull.scale.set(1, 1.1, 1);
  add(head, new THREE.SphereGeometry(0.02, 8, 8), dark, -0.06, 0.02, 0.145);
  add(head, new THREE.SphereGeometry(0.02, 8, 8), dark, 0.06, 0.02, 0.145);
  add(head, new THREE.BoxGeometry(0.07, 0.015, 0.02), dark, -0.06, 0.06, 0.15);
  add(head, new THREE.BoxGeometry(0.07, 0.015, 0.02), dark, 0.06, 0.06, 0.15);
  add(head, new THREE.SphereGeometry(0.025, 8, 8), M(o.skin - 0x0a0a0a, 0.7), 0, -0.02, 0.16);
  add(head, new THREE.BoxGeometry(0.05, 0.012, 0.02), M(0x7a2a2a, 0.6), 0, -0.07, 0.15);
  if (o.beard !== undefined) {
    const b = add(head, new THREE.SphereGeometry(0.11, 12, 10), M(o.beard, 0.9), 0, -0.1, 0.06);
    b.scale.set(1, 0.9, 0.8);
  }

  // ---- Headgear ----
  const capMat = M(o.capColor ?? 0xffffff, 0.7);
  if (o.cap === 'kofia') {
    add(head, new THREE.CylinderGeometry(0.15, 0.165, 0.12, 18), capMat, 0, 0.15, 0);
    add(head, new THREE.CylinderGeometry(0.166, 0.166, 0.025, 18), trim, 0, 0.1, 0);
  } else if (o.cap === 'turban') {
    const t = add(head, new THREE.TorusGeometry(0.15, 0.055, 10, 22), capMat, 0, 0.13, 0);
    t.rotation.x = Math.PI / 2;
    const top = add(head, new THREE.SphereGeometry(0.15, 14, 10), capMat, 0, 0.17, 0);
    top.scale.set(1, 0.6, 1);
  } else if (o.cap === 'fila') {
    const f = add(head, new THREE.CylinderGeometry(0.1, 0.16, 0.22, 14), capMat, 0.02, 0.2, 0);
    f.rotation.z = -0.25;
  } else if (o.cap === 'hijab') {
    const hood = add(head, new THREE.SphereGeometry(0.2, 16, 14), capMat, 0, 0.01, -0.05);
    hood.scale.set(1.02, 1.12, 1);
    const drape = add(body, new THREE.ConeGeometry(0.28, 0.75, 14), capMat, 0, 1.0, -0.1);
    drape.scale.set(1, 1, 0.7);
  }

  // ---- Arms (shoulder pivots) ----
  const makeArm = (side: 1 | -1) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.25 * side, 1.24, 0);
    body.add(pivot);
    add(pivot, new THREE.CylinderGeometry(0.055, 0.085, 0.5, 10), robe, 0, -0.25, 0);
    add(pivot, new THREE.SphereGeometry(0.055, 10, 10), skin, 0, -0.55, 0);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // ---- Props (held in right hand, tesbih in left) ----
  const prop = o.prop ?? 'none';
  if (prop === 'slate') {
    const s = add(armR, new THREE.BoxGeometry(0.24, 0.32, 0.03), M(0x8d5a2b, 0.9), 0.04, -0.55, 0.13);
    s.rotation.x = -0.25;
    add(s, new THREE.PlaneGeometry(0.18, 0.04), M(0x111111), 0, 0.04, 0.02);
  } else if (prop === 'cane') {
    const c = add(armR, new THREE.CylinderGeometry(0.014, 0.02, 1.0, 6), M(0x3e2723, 0.7), 0, -0.55, 0.3);
    c.rotation.x = Math.PI / 2.4;
  } else if (prop === 'kettle') {
    add(armR, new THREE.CylinderGeometry(0.075, 0.085, 0.18, 12), M(0xfacc15, 0.4), 0, -0.68, 0.02);
    const spout = add(armR, new THREE.CylinderGeometry(0.012, 0.02, 0.14, 6), M(0xfacc15, 0.4), 0, -0.66, 0.1);
    spout.rotation.x = Math.PI / 3;
  } else if (prop === 'tesbih') {
    const t = add(armL, new THREE.TorusGeometry(0.05, 0.012, 6, 12), M(0x3b2f1e, 0.6), 0, -0.6, 0.02);
    t.rotation.y = Math.PI / 2;
  }

  // ---- Legs (hip pivots) ----
  const makeLeg = (side: 1 | -1) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.1 * side, 0.36, 0);
    root.add(pivot);
    add(pivot, new THREE.CylinderGeometry(0.06, 0.055, 0.3, 8), skin, 0, -0.15, 0);
    add(pivot, new THREE.BoxGeometry(0.11, 0.06, 0.22), M(0x2b2b2b, 0.6), 0, -0.33, 0.05);
    return pivot;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // Seated skirt (robe pooled on the floor)
  const skirt = add(root, new THREE.CylinderGeometry(0.3, 0.52, 0.24, 18), robe, 0, 0.12, 0.05);
  skirt.visible = false;

  // ---- Animation state ----
  let pose: Pose = 'idle';
  const phase = o.phase ?? Math.random() * 10;
  const cur = { lx: 0, lz: 0, rx: 0, rz: 0, legL: 0, legR: 0, bodyY: 0, lean: 0, sit: 0, headY: 0 };
  const holdsRight = prop === 'slate' || prop === 'kettle' || prop === 'cane';

  const update = (t: number, dt: number) => {
    const k = 1 - Math.exp(-dt * 10);
    const tg = { lx: 0, lz: -0.06, rx: 0, rz: 0.06, legL: 0, legR: 0, bodyY: 0, lean: 0, sit: 0, headY: 0 };
    const tt = t + phase;

    switch (pose) {
      case 'walk':
      case 'run': {
        const run = pose === 'run';
        const S = Math.sin(tt * (run ? 14 : 9));
        const a = run ? 0.9 : 0.55;
        tg.legL = -S * a;
        tg.legR = S * a;
        tg.lx = S * a * 0.8;
        tg.rx = holdsRight ? -0.6 : -S * a * 0.8;
        tg.bodyY = Math.abs(S) * (run ? 0.06 : 0.03);
        tg.lean = run ? 0.2 : 0.07;
        break;
      }
      case 'sit':
        tg.sit = 1;
        tg.lx = -0.5;
        tg.rx = -0.5;
        break;
      case 'recite':
        tg.sit = 1;
        tg.lx = -0.7;
        tg.rx = -0.8;
        tg.lean = Math.sin(tt * 3) * 0.14;
        break;
      case 'alfa': {
        tg.sit = 1;
        tg.lx = -0.5;
        const strike = Math.pow(Math.max(0, Math.sin(tt * 0.9)), 8);
        tg.rx = -0.5 - strike * 1.5;
        tg.headY = Math.sin(tt * 0.5) * 0.5;
        break;
      }
      case 'wave':
        tg.rz = 2.4 + Math.sin(tt * 8) * 0.3;
        tg.bodyY = Math.sin(tt * 2) * 0.005;
        break;
      default:
        tg.bodyY = Math.sin(tt * 2) * 0.006;
        tg.headY = Math.sin(tt * 0.6) * 0.35;
    }

    (Object.keys(cur) as (keyof typeof cur)[]).forEach((key) => {
      cur[key] += (tg[key] - cur[key]) * k;
    });

    armL.rotation.set(cur.lx, 0, cur.lz);
    armR.rotation.set(cur.rx, 0, cur.rz);
    legL.rotation.x = cur.legL;
    legR.rotation.x = cur.legR;
    body.position.y = -0.55 * cur.sit + cur.bodyY;
    body.rotation.x = cur.lean;
    head.rotation.y = cur.headY;

    const sitting = cur.sit > 0.5;
    skirt.visible = sitting;
    legL.visible = !sitting;
    legR.visible = !sitting;
  };

  return {
    group: root,
    headHeight: 1.95 * scale,
    setPose: (p) => {
      pose = p;
    },
    update,
    dispose: () => {
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          const m = mesh.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
    },
  };
}

