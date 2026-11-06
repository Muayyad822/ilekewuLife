'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { sound } from '@/lib/audio';
import { realHourNow, fetchLagosWeather, fetchLagosSolatTimings } from '@/lib/time';
import { buildCharacter, Character, Pose } from './characterBuilder';
import { createWorld } from './worldBuilders';
import { Hand, MessageSquare, X } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  arabic: string;
  x: number;
  z: number;
  radius: number;
  action: string;
  isAvailable?: () => boolean;
  getPos?: () => { x: number; z: number };
  onInteract: () => string | void;
}

const SKY: [number, number, number][] = [
  [0, 0x0b1030, 0.05],
  [5, 0x2a2b57, 0.12],
  [6.5, 0xf2a65a, 0.5],
  [9, 0x8ec9ee, 1],
  [13, 0x7cc3f0, 1.1],
  [17, 0xf5b26b, 0.7],
  [18.8, 0xc2557a, 0.3],
  [20, 0x151a3d, 0.1],
  [24, 0x0b1030, 0.05],
];

const sampleSky = (hour: number, outColor: THREE.Color) => {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, c0, i0] = SKY[i];
    const [h1, c1, i1] = SKY[i + 1];
    if (hour >= h0 && hour <= h1) {
      const f = (hour - h0) / (h1 - h0);
      outColor.set(c0).lerp(new THREE.Color(c1), f);
      return i0 + (i1 - i0) * f;
    }
  }
  outColor.set(0x0b1030);
  return 0.05;
};

const shortestAngle = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

const MAP_W = 168;
const MAP_H = 100;
const X_MIN = -255;
const X_MAX = 255;
const Z_MIN = -27;
const Z_MAX = 26;
const STOP_X = { school: 24, east: 220, west: -220 } as const;

export const LagosWorld: React.FC = () => {
  const { ride, errand, updateRide } = useGameStore();
  const mount = useGameStore((s) => s.mount);
  const setMount = useGameStore((s) => s.setMount);
  const housing = useGameStore((s) => s.housing);
  const activeTab = useGameStore((s) => s.activeTab);
  const roomOverlay = useGameStore((s) => s.roomOverlay);
  const setRoomOverlay = useGameStore((s) => s.setRoomOverlay);
  const selectedFurniture = useGameStore((s) => s.selectedFurniture || 'desk');
  const setSelectedFurniture = useGameStore((s) => s.setSelectedFurniture);
  const updateFurnitureTransform = useGameStore((s) => s.updateFurnitureTransform);
  const resetFurnitureLayout = useGameStore((s) => s.resetFurnitureLayout);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const joyRef = useRef({ x: 0, y: 0 });
  const joyKnobRef = useRef<HTMLDivElement>(null);
  const interactRef = useRef<() => void>(() => {});
  const emoteRef = useRef<() => void>(() => {});
  const setPoseActionRef = useRef<(p: Pose) => void>(() => {});

  const [activePose, setActivePose] = useState<Pose>('idle');
  const [nearby, setNearby] = useState<{ name: string; arabic: string; action: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const labelHost = labelsRef.current;
    if (!container || !labelHost) return;

    const say = (text: string) => {
      setToast(text);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3800);
    };

    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    let coarseToast: ReturnType<typeof setTimeout> | null = null;

    // Show walkthrough hint only once for first-time players
    const currentSnapshot = useGameStore.getState().player;
    const isFirstTimer =
      typeof window !== 'undefined' &&
      !localStorage.getItem('ilekewu_tutorial_seen') &&
      currentSnapshot.stage === 'omo_kewu' &&
      currentSnapshot.hifzJuz <= 1 &&
      currentSnapshot.stats.ilm <= 50;

    if (isFirstTimer) {
      setToast(
        coarse
          ? 'Joystick to walk · Drag to look · Tap interact button.'
          : 'Arrow Keys / Joystick to walk · Drag to look · Press E to interact.'
      );
      try {
        localStorage.setItem('ilekewu_tutorial_seen', 'true');
      } catch {}
      coarseToast = setTimeout(() => setToast(null), 5000);
    } else if (typeof window !== 'undefined' && !localStorage.getItem('ilekewu_tutorial_seen')) {
      // Mark as seen for returning players without showing the banner
      try {
        localStorage.setItem('ilekewu_tutorial_seen', 'true');
      } catch {}
    }

    // ---------- Renderer / scene / camera ----------
    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x8ec9ee);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x8ec9ee, 0.011);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 220);
    const renderer = new THREE.WebGLRenderer({ antialias: !coarse, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = coarse ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    // Keep the long-press / context menu from interrupting play on touch devices
    const blockMenu = (e: Event) => e.preventDefault();
    container.addEventListener('contextmenu', blockMenu);

    const resize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      // Portrait phones get a wider FOV so the scene doesn't feel zoomed in
      camera.fov = w / h < 0.8 ? 62 : 50;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    // ---------- Lights ----------
    const hemi = new THREE.HemisphereLight(0xffffff, 0x665544, 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff3d6, 1.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 90;
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    scene.add(sun.target);

    // ---------- World ----------
    const world = createWorld(scene);

    // ---------- 3D Rain Particle System (activates during live Lagos rain/storm) ----------
    const RAIN_COUNT = 900;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 44;
      rainPositions[i * 3 + 1] = Math.random() * 20;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0xcbe4ff,
      size: 0.14,
      transparent: true,
      opacity: 0.72,
    });
    const rainPoints = new THREE.Points(rainGeo, rainMat);
    rainPoints.visible = false;
    scene.add(rainPoints);

    // Sync real-world Lagos weather & Solat timings
    let weatherActive = true;
    const syncRealWorld = () => {
      fetchLagosWeather().then((w) => {
        if (weatherActive) useGameStore.getState().setWeather(w);
      });
      fetchLagosSolatTimings().then((t) => {
        if (weatherActive) useGameStore.getState().setSolatTimings(t);
      });
    };
    syncRealWorld();
    const weatherInterval = setInterval(syncRealWorld, 10 * 60 * 1000);

    // ---------- Player ----------
    const makePlayer = () => {
      const { player, outfit } = useGameStore.getState();
      return buildCharacter({
        robe: outfit.robe,
        trim: outfit.trim,
        cap: outfit.cap,
        capColor: outfit.capColor,
        prop: outfit.prop,
        female: player.gender === 'female',
        skin: 0x5d3a1a,
      });
    };
    let playerChar: Character = makePlayer();
    scene.add(playerChar.group);
    const pos = { x: 0, y: 0, z: 3.8, rot: Math.PI };
    playerChar.group.position.set(pos.x, 0, pos.z);
    let lastOutfitRev = useGameStore.getState().outfitRevision;

    // Ridden Vehicle Mount Models (attached under the player character)
    const riderMountRoot = new THREE.Group();
    playerChar.group.add(riderMountRoot);

    const bChromeMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.25, metalness: 0.7 });
    const bFrameMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.45, metalness: 0.3 });

    // 1. Ridden Raleigh Bicycle (asset_bicycle)
    const riderBike = new THREE.Group();
    riderBike.visible = false;
    const bikeWheels: THREE.Group[] = [];
    for (const wz of [-0.62, 0.62]) {
      const wP = new THREE.Group();
      wP.position.set(0, 0.34, wz);
      const wheel = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.04, 8, 18),
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 })
      );
      wheel.rotation.y = Math.PI / 2;
      wheel.castShadow = true;
      wP.add(wheel);
      riderBike.add(wP);
      bikeWheels.push(wP);
    }
    const bBar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.95), bFrameMat);
    bBar.position.set(0, 0.65, 0);
    riderBike.add(bBar);
    const bDown = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72), bFrameMat);
    bDown.rotation.x = 0.5;
    bDown.position.set(0, 0.5, 0.12);
    riderBike.add(bDown);
    const bFork = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75), bChromeMat);
    bFork.position.set(0, 0.62, 0.52);
    riderBike.add(bFork);
    const bBars = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.06), bChromeMat);
    bBars.position.set(0, 0.98, 0.52);
    riderBike.add(bBars);
    for (const gx of [-0.26, 0.26]) {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12), new THREE.MeshStandardMaterial({ color: 0x18181b }));
      grip.rotation.z = Math.PI / 2;
      grip.position.set(gx, 0.98, 0.52);
      riderBike.add(grip);
    }
    const bSaddle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.28), new THREE.MeshStandardMaterial({ color: 0x27272a }));
    bSaddle.position.set(0, 0.8, -0.36);
    riderBike.add(bSaddle);
    riderMountRoot.add(riderBike);

    // 2. Ridden Bajaj Boxer Motorcycle (asset_okada)
    const riderMoto = new THREE.Group();
    riderMoto.visible = false;
    const motoWheels: THREE.Group[] = [];
    for (const wz of [-0.72, 0.72]) {
      const wP = new THREE.Group();
      wP.position.set(0, 0.38, wz);
      const tire = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.09, 10, 18),
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 })
      );
      tire.rotation.y = Math.PI / 2;
      tire.castShadow = true;
      wP.add(tire);
      riderMoto.add(wP);
      motoWheels.push(wP);
    }
    const mTank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.68), new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.4, roughness: 0.3 }));
    mTank.position.set(0, 0.82, 0.15);
    riderMoto.add(mTank);
    const mSeat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.78), new THREE.MeshStandardMaterial({ color: 0x18181b }));
    mSeat.position.set(0, 0.76, -0.42);
    riderMoto.add(mSeat);
    const mEngine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.45), new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.5 }));
    mEngine.position.set(0, 0.48, 0.05);
    riderMoto.add(mEngine);
    const mExhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85), bChromeMat);
    mExhaust.rotation.x = Math.PI / 2 - 0.1;
    mExhaust.position.set(0.18, 0.32, -0.42);
    riderMoto.add(mExhaust);
    const mFork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75), bChromeMat);
    mFork.position.set(0, 0.72, 0.55);
    riderMoto.add(mFork);
    const mBars = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.08), bChromeMat);
    mBars.position.set(0, 1.05, 0.52);
    riderMoto.add(mBars);
    const mHeadlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xfff1a0, emissiveIntensity: 1.4 })
    );
    mHeadlight.position.set(0, 0.94, 0.68);
    riderMoto.add(mHeadlight);
    riderMountRoot.add(riderMoto);

    // ---------- Name-plates ----------
    interface Label {
      el: HTMLDivElement;
      bubble: HTMLDivElement;
      obj: THREE.Object3D;
      height: number;
      nextSay: number;
      hideAt: number;
      lines: string[];
    }
    const labels: Label[] = [];
    const makeLabel = (name: string, title: string, obj: THREE.Object3D, height: number, lines: string[], isPlayer = false) => {
      const el = document.createElement('div');
      el.className = `kw-nameplate${isPlayer ? ' is-player' : ''}`;
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = name;
      const small = document.createElement('small');
      small.textContent = title;
      tag.appendChild(small);
      el.append(bubble, tag);
      labelHost.appendChild(el);
      const l: Label = { el, bubble, obj, height, nextSay: 3 + Math.random() * 8, hideAt: 0, lines };
      labels.push(l);
      return l;
    };
    const KEY_NPCS = new Set([
      'alfa', 'ped4', 'basira', 'mallam', 'alhaji', 'imam', 'ridwan', 'zainab', 'baba_ayo',
      'ustadh_nahw', 'ustadh_fiqh', 'ustadh_quran', 'dorm_mate1', 'estate_agent',
    ]);
    world.npcs.forEach((n) => {
      if (!KEY_NPCS.has(n.id)) return;
      const sitting = n.idlePose === 'recite' || n.idlePose === 'alfa' || n.idlePose === 'sit';
      const s = n.char.group.scale.x;
      makeLabel(n.name, n.title, n.char.group, (sitting ? 1.35 : 2.0) * s, n.lines);
    });

    // Initial sync of 3D room furniture/upgrades & house locks
    world.syncUpgrades(
      useGameStore.getState().housing.upgrades,
      useGameStore.getState().housing.tier,
      useGameStore.getState().housing.furnitureLayout,
      useGameStore.getState().mount,
    );
    world.syncHouseAccess(useGameStore.getState().housing.tier);

    // ---------- Zones ----------
    const st = () => useGameStore.getState();
    let customPose: Pose = 'idle';
    const applyPose = (p: Pose, elevation?: number) => {
      customPose = p;
      if (elevation !== undefined) {
        pos.y = elevation;
      } else if (p === 'idle' || p === 'walk' || p === 'run') {
        pos.y = 0;
      }
      setActivePose(p);
    };
    setPoseActionRef.current = applyPose;

    const getFurnitureTf = (
      tierId: 'ruwaq' | 'shared_room' | 'mini_flat' | 'personal_villa',
      key: string,
      baseX: number,
      baseZ: number,
      baseRot = 0,
    ) => {
      const housing = st().housing;
      if (housing.tier !== tierId) return { x: baseX, z: baseZ, rot: baseRot };
      const tf = housing.furnitureLayout?.[key];
      if (!tf) return { x: baseX, z: baseZ, rot: baseRot };
      return {
        x: baseX + (tf.dx || 0),
        z: baseZ + (tf.dz || 0),
        rot: baseRot + (tf.rot || 0),
      };
    };

    // Helper to generate 3D interactive furniture hotspots inside each of the 4 3D Houses
    const makeHouseZones = (
      tierId: 'ruwaq' | 'shared_room' | 'mini_flat' | 'personal_villa',
      houseLabel: string,
      bedPos: [number, number],
      deskPos: [number, number],
      rugPos: [number, number],
      wardrobePos: [number, number],
      furnishPos: [number, number],
      bikePos: [number, number],
    ): Zone[] => {
      const canUse = () => st().housing.tier === tierId;
      return [
        {
          id: `bed_${tierId}`,
          name: `${houseLabel} · Bed`,
          arabic: 'فِرَاشُ النَّوْمِ',
          x: bedPos[0],
          z: bedPos[1],
          radius: 2.2,
          action: 'Sleep & Rest',
          isAvailable: canUse,
          getPos: () => getFurnitureTf(tierId, 'bed', bedPos[0], bedPos[1]),
          onInteract: () => {
            const f = getFurnitureTf(tierId, 'bed', bedPos[0], bedPos[1], 0);
            const hasMattress = st().housing.upgrades.includes('asset_mattress');
            const bedY = tierId === 'ruwaq'
              ? (hasMattress ? 0.46 : 0.08)
              : tierId === 'shared_room' ? 0.46
              : tierId === 'mini_flat' ? 0.54
              : 0.60;
            pos.x = f.x;
            pos.z = f.z;
            pos.rot = f.rot;
            applyPose('sleep', bedY);
            const res = st().restAtHome();
            return res.msg;
          },
        },
        {
          id: `desk_${tierId}`,
          name: `${houseLabel} · Study Desk`,
          arabic: 'مَكْتَبُ الْمُطَالَعَةِ',
          x: deskPos[0],
          z: deskPos[1],
          radius: 2.1,
          action: 'Sit & Study',
          isAvailable: canUse,
          getPos: () => {
            const f = getFurnitureTf(tierId, 'desk', deskPos[0], deskPos[1], 0);
            return {
              x: f.x + 0.55 * Math.sin(f.rot),
              z: f.z + 0.55 * Math.cos(f.rot),
            };
          },
          onInteract: () => {
            // Sit squarely on the study chair facing the desk
            const f = getFurnitureTf(tierId, 'desk', deskPos[0], deskPos[1], 0);
            const sinR = Math.sin(f.rot);
            const cosR = Math.cos(f.rot);
            pos.x = f.x + 0.55 * sinR;
            pos.z = f.z + 0.55 * cosR;
            pos.rot = f.rot + Math.PI;
            applyPose('chair_sit', 0.46);
            return st().studyAtDesk();
          },
        },
        {
          id: `rug_${tierId}`,
          name: `${houseLabel} · Sajjadah`,
          arabic: 'سَجَّادَةُ الصَّلَاةِ',
          x: rugPos[0],
          z: rugPos[1],
          radius: 2.0,
          action: 'Pray Salah',
          isAvailable: canUse,
          getPos: () => getFurnitureTf(tierId, 'rug', rugPos[0], rugPos[1]),
          onInteract: () => {
            const f = getFurnitureTf(tierId, 'rug', rugPos[0], rugPos[1], 0);
            pos.x = f.x;
            pos.z = f.z;
            pos.rot = f.rot + Math.PI;
            applyPose('pray', 0);
            return st().prayInRoom();
          },
        },
        {
          id: `wardrobe_${tierId}`,
          name: `${houseLabel} · Wardrobe`,
          arabic: 'خِزَانَةُ الْمَلَابِسِ',
          x: wardrobePos[0],
          z: wardrobePos[1],
          radius: 2.1,
          action: 'Change Robe',
          isAvailable: canUse,
          getPos: () => {
            const f = getFurnitureTf(tierId, 'wardrobe', wardrobePos[0], wardrobePos[1], 0);
            return {
              x: f.x + 0.85 * Math.sin(f.rot),
              z: f.z + 0.85 * Math.cos(f.rot),
            };
          },
          onInteract: () => {
            const f = getFurnitureTf(tierId, 'wardrobe', wardrobePos[0], wardrobePos[1], 0);
            const sinR = Math.sin(f.rot);
            const cosR = Math.cos(f.rot);
            pos.x = f.x + 0.85 * sinR;
            pos.z = f.z + 0.85 * cosR;
            pos.rot = f.rot + Math.PI;
            applyPose('idle', 0);
            st().setActivity('wardrobe');
          },
        },
        {
          id: `bike_${tierId}`,
          name: `${houseLabel} · Bicycle`,
          arabic: 'دَرَّاجَةٌ هَوَائِيَّةٌ',
          x: bikePos[0],
          z: bikePos[1],
          radius: 2.2,
          action: '🚲 Ride Bicycle (Speed 10.5 m/s)',
          isAvailable: () => canUse() && st().housing.upgrades.includes('asset_bicycle') && st().mount !== 'bicycle',
          onInteract: () => {
            st().setMount('bicycle');
            return 'Mounted Raleigh Bicycle! Press F or tap Dismount to get off.';
          },
        },
        {
          id: `okada_${tierId}`,
          name: `${houseLabel} · Okada Motorcycle`,
          arabic: 'دَرَّاجَةٌ نَارِيَّةٌ',
          x: bikePos[0] + 2.4,
          z: bikePos[1],
          radius: 2.2,
          action: '🏍️ Ride Okada (Speed 16 m/s)',
          isAvailable: () => canUse() && st().housing.upgrades.includes('asset_okada') && st().mount !== 'okada',
          onInteract: () => {
            st().setMount('okada');
            return 'Mounted Bajaj Boxer Okada! Press F or tap Dismount to get off.';
          },
        },
        {
          id: `furnish_${tierId}`,
          name: `${houseLabel} · Home Ledger`,
          arabic: 'تَطْوِيرُ السَّكَنِ',
          x: furnishPos[0],
          z: furnishPos[1],
          radius: 2.2,
          action: 'Furnish & Real Estate',
          isAvailable: canUse,
          onInteract: () => {
            pos.x = furnishPos[0];
            pos.z = furnishPos[1] + 1.0;
            pos.rot = Math.PI;
            applyPose('idle', 0);
            st().setRoomOverlay('home_dashboard');
          },
        },
      ];
    };

    const zones: Zone[] = [
      {
        id: 'alfa', name: "Baba Kewu's Seat", arabic: 'مَقْعَدُ الشَّيْخِ', x: 0, z: -2.6, radius: 2.2,
        action: 'Recite Hifz',
        onInteract: () => {
          pos.x = 0;
          pos.z = -1.6;
          pos.rot = Math.PI;
          applyPose('kneel', 0);
          st().setActivity('alfa');
        },
      },
      {
        id: 'ibtida', name: "Ibtida'i Class Shed", arabic: 'فَصْلُ الِابْتِدَائِيِّ', x: -11.5, z: -3.2, radius: 2.8,
        action: 'Huruf & Check Juniors',
        onInteract: () => { st().setActivity('ibtida'); },
      },
      {
        id: 'adult', name: 'Adult / Markaziy Shed', arabic: 'فَصْلُ النَّحْوِ', x: 11.5, z: -3.2, radius: 2.6,
        action: 'Grammar Class',
        onInteract: () => { st().setActivity('nahw'); },
      },
      {
        id: 'ustadh', name: 'Ustadh Hamza', arabic: 'الأُسْتَاذُ حَمْزَة', x: 9.5, z: -3.5, radius: 2.0,
        action: 'Amala Errand (₦)',
        onInteract: () => {
          const e = st().errand;
          if (!e || e.stage === 'fetch') return st().startErrand();
          return st().completeErrand();
        },
      },
      {
        id: 'minaret', name: 'Mosque Minaret', arabic: 'المِئْذَنَة', x: 7.4, z: -5.5, radius: 2.4,
        action: 'Call Adhan',
        onInteract: () => { st().setActivity('adhan'); },
      },
      {
        id: 'halqah', name: 'Daily Study Circle', arabic: 'حَلْقَةُ الدَّرْسِ اليَوْمِيِّ', x: 0, z: 0.9, radius: 1.8,
        action: 'Enter Classroom',
        onInteract: () => { st().setActiveTab('classroom'); },
      },
      {
        id: 'well', name: 'Ablution Well & Taps', arabic: 'بِئْرُ الْوُضُوءِ', x: -7, z: 1, radius: 2.7,
        action: 'Perform Wudu',
        onInteract: () => {
          pos.x = -6.4;
          pos.z = 1.0;
          pos.rot = -Math.PI / 2;
          applyPose('crouch', 0);
          st().setActivity('well');
        },
      },
      // --- 6 Subject Chalkboard Stations inside the 3D Daily Classroom Hall (x = 31, z = -12) ---
      {
        id: 'class_nahw', name: 'Nahw & Sarf', arabic: 'النَّحْوُ وَالصَّرْفُ', x: 25.2, z: -15.0, radius: 2.4,
        action: 'Study Nahw',
        onInteract: () => {
          pos.x = 25.2 - 0.95;
          pos.z = -16.8 + 1.88;
          pos.rot = Math.PI;
          applyPose('recite', 0);
          st().openClassroomSubject('nahw');
        },
      },
      {
        id: 'class_fiqh', name: 'Fiqh & Ibadah', arabic: 'الفِقْهُ وَالعِبَادَاتُ', x: 31.0, z: -15.0, radius: 2.4,
        action: 'Study Fiqh',
        onInteract: () => {
          pos.x = 31.0 - 0.95;
          pos.z = -16.8 + 1.88;
          pos.rot = Math.PI;
          applyPose('recite', 0);
          st().openClassroomSubject('fiqh');
        },
      },
      {
        id: 'class_tajweed', name: 'Qur’an & Tajweed', arabic: 'القُرْآنُ وَالتَّجْوِيدُ', x: 36.8, z: -15.0, radius: 2.4,
        action: 'Study Tajweed',
        onInteract: () => {
          pos.x = 36.8 - 0.95;
          pos.z = -16.8 + 1.88;
          pos.rot = Math.PI;
          applyPose('recite', 0);
          st().openClassroomSubject('tajweed');
        },
      },
      {
        id: 'class_hadith', name: 'Hadith & Sunnah', arabic: 'الحَدِيثُ الشَّرِيفُ', x: 25.2, z: -10.5, radius: 2.4,
        action: 'Study Hadith',
        onInteract: () => {
          pos.x = 25.2 - 0.95;
          pos.z = -9.8 + 1.88;
          pos.rot = Math.PI;
          applyPose('recite', 0);
          st().openClassroomSubject('hadith');
        },
      },
      {
        id: 'class_seerah', name: 'Seerah & Tarikh', arabic: 'السِّيرَةُ النَّبَوِيَّةُ', x: 31.0, z: -10.5, radius: 2.4,
        action: 'Study Seerah',
        onInteract: () => {
          pos.x = 31.0 - 0.95;
          pos.z = -9.8 + 1.88;
          pos.rot = Math.PI;
          applyPose('recite', 0);
          st().openClassroomSubject('seerah');
        },
      },
      {
        id: 'class_adab', name: 'Adab & Akhlaq', arabic: 'الأَدَبُ وَالأَخْلَاقُ', x: 36.8, z: -10.5, radius: 2.4,
        action: 'Study Adab',
        onInteract: () => {
          pos.x = 36.8 - 0.95;
          pos.z = -9.8 + 1.88;
          pos.rot = Math.PI;
          applyPose('recite', 0);
          st().openClassroomSubject('adab');
        },
      },
      // --- Locked Door Gates for Unowned Houses ---
      {
        id: 'gate_shared_room', name: 'Off-Campus Room (Locked)', arabic: 'غُرْفَةٌ مُغْلَقَةٌ', x: 69, z: -5.2, radius: 2.6,
        action: '🔒 Rent (₦3.5k) or Buy (₦25k)',
        isAvailable: () => st().housing.tier !== 'shared_room',
        onInteract: () => {
          st().setRoomOverlay('home_dashboard');
          return 'Rent or buy the Off-Campus Room to unlock this door.';
        },
      },
      {
        id: 'gate_mini_flat', name: 'Self-Con Mini-Flat (Locked)', arabic: 'شَقَّةٌ مُغْلَقَةٌ', x: 89, z: -4.8, radius: 2.8,
        action: '🔒 Rent (₦12k) or Buy (₦95k)',
        isAvailable: () => st().housing.tier !== 'mini_flat',
        onInteract: () => {
          st().setRoomOverlay('home_dashboard');
          return 'Rent or buy the Self-Contained Mini-Flat to unlock this door.';
        },
      },
      {
        id: 'gate_personal_villa', name: "Sheikh's Villa (Locked)", arabic: 'قَصْرٌ مُغْلَقٌ', x: 113, z: -3.8, radius: 3.0,
        action: '🔒 Rent (₦35k) or Buy (₦350k)',
        isAvailable: () => st().housing.tier !== 'personal_villa',
        onInteract: () => {
          st().setRoomOverlay('home_dashboard');
          return "Rent or buy the Sheikh's Villa to unlock this residence.";
        },
      },
      // --- Interactive 3D Furniture inside the 4 Walkable 3D Houses (Gated by Active Tier) ---
      ...makeHouseZones('ruwaq', 'Ruwaq Dorm', [46.8, -15.5], [46.8, -11.5], [51.0, -15.6], [46.6, -8.0], [54.8, -7.2], [47.2, -4.5]),
      ...makeHouseZones('shared_room', 'Off-Campus Room', [64.8, -15.5], [64.8, -11.5], [73.2, -15.5], [64.6, -8.0], [73.0, -7.5], [65.2, -4.5]),
      ...makeHouseZones('mini_flat', 'Mini-Flat', [83.8, -15.8], [83.8, -11.5], [88.2, -16.2], [83.5, -7.8], [94.2, -7.2], [85.0, -4.0]),
      ...makeHouseZones('personal_villa', "Sheikh's Villa", [106.2, -16.2], [106.2, -11.5], [112.5, -16.5], [105.8, -6.8], [119.5, -6.5], [108.5, -3.2]),
      {
        id: 'saraa', name: 'Friday Saraa Canopy', arabic: 'مَائِدَةُ الصَّدَقَةِ', x: 8, z: 3.4, radius: 2.8,
        action: 'Take a free plate of jollof (+Energy)',
        onInteract: () => {
          if (st().player.stats.energy >= 100) return 'Alhaja: "You are full, my child. Alhamdulillah!"';
          st().spend(0, { energy: 12, taqwa: 1, barakah: 1 }, 'Alhaja Sidikat handed you a warm plate of Friday rice and prayed for you.');
          return 'Alhaja Sidikat gave you hot jollof and prayed for your barakah! (+12 Energy)';
        },
      },
      {
        id: 'buka', name: "Iya Basira's Buka", arabic: 'مَطْعَم', x: -10, z: 19.6, radius: 2.8,
        action: 'Buy Amala (₦300) / Pick Up Errand',
        onInteract: () => {
          if (st().errand?.stage === 'fetch') return st().pickUpErrand();
          return st().spend(300, { energy: 30 }, 'Ate hot amala and ewedu at Iya Basira’s buka. -₦300')
            ? 'Iya Basira: "Amala don land! Eat well, my pikin." (-₦300, +30 Energy)'
            : 'Iya Basira: "No money, no amala o!" You need ₦300.';
        },
      },
      {
        id: 'kiosk', name: 'Islamic Books & Wardrobe', arabic: 'مَكْتَبَة', x: 10, z: 19.6, radius: 2.8,
        action: 'Buy Books, Robes, Caps & Attar',
        onInteract: () => { st().setActivity('shop'); },
      },
      {
        id: 'bus_school', name: 'Ejigbo Bus Stop', arabic: 'مَحَطَّة', x: 24, z: 9.4, radius: 3,
        action: 'Hop on a Yellow Danfo Bus',
        onInteract: () => { st().setActivity('bus'); },
      },
      {
        id: 'bus_east', name: 'Isolo Bus Stop', arabic: 'مَحَطَّة إِيسُولُو', x: 220, z: 9.4, radius: 3.2,
        action: 'Hop on a Danfo (Return to School)',
        onInteract: () => { st().setActivity('bus'); },
      },
      {
        id: 'bus_west', name: 'Idimu Bus Stop', arabic: 'مَحَطَّة إِيدِيمُو', x: -220, z: 9.4, radius: 3.2,
        action: 'Hop on a Danfo (Return to School)',
        onInteract: () => { st().setActivity('bus'); },
      },
      {
        id: 'isolo_lesson', name: 'Isolo Estate Duplex', arabic: 'دَرْسٌ خُصُوصِيٌّ', x: 230, z: 6.5, radius: 3.5,
        action: 'Teach Private Home Lesson (Earn ₦3,500)',
        onInteract: () => { st().setActivity('homelesson'); },
      },
      {
        id: 'idimu_mosque', name: 'Idimu Central Mosque', arabic: 'خُطْبَةُ الجُمُعَة', x: -230, z: 6.5, radius: 3.5,
        action: 'Deliver Friday Khutbah (Earn ₦6,000)',
        onInteract: () => { st().setActivity('khutbah'); },
      },
      {
        id: 'football', name: 'Kewu F.C. Table Soccer Pitch', arabic: 'مَلْعَبُ كُرَةِ الْقَدَمِ', x: -24.5, z: 3.5, radius: 5.8,
        action: 'Play Ping-Pong Football (Win ₦500–₦1,200)',
        onInteract: () => { st().setActivity('football'); },
      },
      {
        id: 'tenten', name: 'Tinko-Tinko Court', arabic: 'لُعْبَةُ التَّصْفِيق', x: -34, z: -13.5, radius: 3.4,
        action: 'Play Tinko-Tinko Duel (Win ₦600)',
        onInteract: () => { st().setActivity('tenten'); },
      },
      {
        id: 'suwe', name: 'Suwe Hopscotch Grid', arabic: 'لُعْبَةُ القَفْز', x: -24.5, z: -13, radius: 3.6,
        action: 'Play Suwe Hopscotch (Win up to ₦540)',
        onInteract: () => { st().setActivity('suwe'); },
      },
      {
        id: 'ayo', name: 'Ayo Olopon Bench', arabic: 'لُعْبَةُ الأَيُو', x: -34, z: -20, radius: 2.8,
        action: 'Play Ayo Olopon with Baba Ayo (Win ₦800)',
        onInteract: () => { st().setActivity('ayo'); },
      },
      {
        id: 'skipping', name: 'Skipping Rope Spot', arabic: 'نَطُّ الحَبْل', x: -26, z: -19.5, radius: 2.6,
        action: 'Skip Rope (Win up to ₦700)',
        onInteract: () => { st().setActivity('skipping'); },
      },
      {
        id: 'catcher', name: 'Boju-Boju Arena', arabic: 'لُعْبَةُ المُطَارَدَة', x: -22, z: -23.5, radius: 3.4,
        action: 'Play Boju-Boju Dodge & Collect (Win up to ₦700)',
        onInteract: () => { st().setActivity('catcher'); },
      },
    ];
    let nearZone: Zone | null = null;
    let nearId = '';
    interactRef.current = () => {
      if (!nearZone) return;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(15);
      const msg = nearZone.onInteract();
      if (msg) say(msg);
    };

    // ---------- Input ----------
    const keys: Record<string, boolean> = {};
    let emoteUntil = 0;
    let time = 0;
    emoteRef.current = () => {
      emoteUntil = time + 2.5;
    };
    const unlockAudio = () => {
      sound.startBgNasheed();
      // Only remove listeners if audio actually started playing
      if (sound.isPlaying()) {
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      }
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === 'e' || k === 'enter') interactRef.current();
      if (k === 'g') emoteRef.current();
      if (k === 'f') {
        const curM = st().mount;
        if (curM !== 'none') {
          st().setMount('none');
          say('Dismounted vehicle.');
        } else {
          const up = st().housing.upgrades;
          if (up.includes('asset_okada')) {
            st().setMount('okada');
            say('Mounted Okada (16.5 m/s)! Press F to dismount.');
          } else if (up.includes('asset_bicycle')) {
            st().setMount('bicycle');
            say('Mounted Raleigh Bicycle (10.5 m/s)! Press F to dismount.');
          } else {
            say('You do not own a bicycle or okada yet! Purchase one at the 3D Furnishings store.');
          }
        }
      }
      if (k === '1') applyPose('idle', 0);
      if (k === '2') applyPose('sit', 0);
      if (k === '3') applyPose('crouch', 0);
      if (k === '4') applyPose('kneel', 0);
      if (k === '5') applyPose('pray', 0);
      if (k === '6') applyPose('sleep', 0);
      if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // 3D Selection Ring & Brackets for Arranging Furniture
    const selectionGroup = new THREE.Group();
    selectionGroup.visible = false;
    scene.add(selectionGroup);

    const ringGeo = new THREE.RingGeometry(0.75, 0.9, 36);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const selRing = new THREE.Mesh(ringGeo, ringMat);
    selRing.position.y = 0.03;
    selectionGroup.add(selRing);

    const bracketMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const makeBracket = (bx: number, bz: number, brot: number) => {
      const g = new THREE.Group();
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.07), bracketMat);
      b1.position.set(0.15, 0.035, 0);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.35), bracketMat);
      b2.position.set(0, 0.035, 0.15);
      g.add(b1);
      g.add(b2);
      g.position.set(bx, 0, bz);
      g.rotation.y = brot;
      return g;
    };
    selectionGroup.add(makeBracket(0.75, 0.75, 0));
    selectionGroup.add(makeBracket(-0.75, 0.75, Math.PI / 2));
    selectionGroup.add(makeBracket(-0.75, -0.75, Math.PI));
    selectionGroup.add(makeBracket(0.75, -0.75, -Math.PI / 2));

    // Orbit camera: one finger/mouse rotates, two fingers pinch-zoom
    const cam = { yaw: 0, pitch: 0.55, dist: 11 };
    const target = new THREE.Vector3(pos.x, 1.2, pos.z);
    const pointers = new Map<number, { x: number; y: number }>();
    const downPos = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    const el = renderer.domElement;
    const pinchSpan = () => {
      const [a, b] = Array.from(pointers.values());
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      downPos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) pinchDist = pinchSpan();
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 1) {
        cam.yaw -= dx * 0.006;
        cam.pitch = THREE.MathUtils.clamp(cam.pitch + dy * 0.005, 0.12, 1.25);
      } else if (pointers.size === 2) {
        const span = pinchSpan();
        cam.dist = THREE.MathUtils.clamp(cam.dist - (span - pinchDist) * 0.03, 4.5, 26);
        pinchDist = span;
      }
    };
    const raycaster = new THREE.Raycaster();
    const onUp = (e: PointerEvent) => {
      const orig = downPos.get(e.pointerId);
      downPos.delete(e.pointerId);
      const isTap = orig ? Math.hypot(e.clientX - orig.x, e.clientY - orig.y) < 14 : false;

      pointers.delete(e.pointerId);
      if (pointers.size === 1) pinchDist = 0;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);

      // Tap-to-select furniture directly on 3D Canvas
      if (isTap && pointers.size === 0) {
        const rect = el.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(mouse, camera);

        const curTier = st().housing.tier;
        const activeFurniture = world.furnitureRegistry.filter(
          (f) => f.tierId === curTier && f.group.visible
        );

        const meshes: THREE.Object3D[] = [];
        activeFurniture.forEach((f) => {
          f.group.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              (child as any).__furnitureKey = f.furnitureKey;
              meshes.push(child);
            }
          });
        });

        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length > 0) {
          const hitKey = (hits[0].object as any).__furnitureKey;
          if (hitKey) {
            st().setSelectedFurniture(hitKey);
            if (st().roomOverlay !== 'arrange_furniture') {
              st().setRoomOverlay('arrange_furniture');
            }
            say(`Selected: ${hitKey.toUpperCase()} · Use D-pad to move or Turn 90°`);
          }
        }
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.dist = THREE.MathUtils.clamp(cam.dist + e.deltaY * 0.01, 4.5, 26);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    // ---------- Loop ----------
    const clock = new THREE.Clock();
    let raf = 0;
    let hour = realHourNow();
    let lastStoreWrite = 0;
    let lastMap = 0;
    const tmpColor = new THREE.Color();
    const weatherTint = new THREE.Color();
    const tmpV = new THREE.Vector3();
    const mapCtx = minimapRef.current?.getContext('2d') ?? null;
    const R = 0.4;
    const COLORS = {
      sunNoon: new THREE.Color(0xfff6e0),
      sunLow: new THREE.Color(0xffd0a0),
      moon: new THREE.Color(0x7f93d6),
      rainSky: new THREE.Color(0x4b5d6e),
      stormSky: new THREE.Color(0x2d3846),
      cloudSky: new THREE.Color(0x9fb4c7),
      harmattanSky: new THREE.Color(0xd6c4a8),
    };

    const HOUSE_SPAWN: Record<string, { x: number; z: number; label: string }> = {
      ruwaq: { x: 51, z: -8.2, label: 'Ruwaq Madrasah Dormitory' },
      shared_room: { x: 69, z: -8.8, label: 'Off-Campus Student Room' },
      mini_flat: { x: 89, z: -8.2, label: 'Self-Contained Mini-Flat' },
      personal_villa: { x: 113, z: -7.2, label: "Sheikh's Personal Duplex Villa" },
    };

    const teleportTo = (nx: number, nz: number, nrot = Math.PI, camDist = 9.0) => {
      pos.x = nx;
      pos.y = 0;
      pos.z = nz;
      pos.rot = nrot;
      playerChar.group.position.set(pos.x, pos.y, pos.z);
      playerChar.group.rotation.y = pos.rot;
      target.set(pos.x, 1.3, pos.z);
      cam.yaw = 0;
      cam.pitch = 0.62;
      cam.dist = camDist;
    };

    let lastTab = st().activeTab;
    let lastTier = st().housing.tier;
    let lastUpgradesKey = st().housing.upgrades.join(',');

    // Pause the simulation only when a full modal/drawer covers the world; keep 3D active for School, Classroom, Home & Arrange Mode!
    const isWorldPaused = (s: ReturnType<typeof useGameStore.getState>) =>
      s.activeTab === 'profile' ||
      s.activeTab === 'minbar' ||
      s.activity !== null ||
      s.roomOverlay === 'home_dashboard' ||
      s.roomOverlay === 'classroom_lesson';

    let paused = isWorldPaused(st());
    const unsub = useGameStore.subscribe((s) => {
      paused = isWorldPaused(s);
      if (paused) joyRef.current = { x: 0, y: 0 };

      // Sync 3D room upgrades whenever player buys furniture/assets, changes tier, moves furniture, or mounts
      const nextUpgradesKey = `${s.housing.tier}:${s.housing.upgrades.join(',')}:${JSON.stringify(s.housing.furnitureLayout || {})}:${s.mount}`;
      if (nextUpgradesKey !== lastUpgradesKey) {
        lastUpgradesKey = nextUpgradesKey;
        world.syncUpgrades(s.housing.upgrades, s.housing.tier, s.housing.furnitureLayout, s.mount);
      }

      if (s.housing.tier !== lastTier) {
        world.syncHouseAccess(s.housing.tier);
      }

      // Teleport player into the 3D Classroom Hall, 3D House, or School Compound when tab or house tier changes
      if (s.activeTab !== lastTab || (s.activeTab === 'home' && s.housing.tier !== lastTier)) {
        const tabChanged = s.activeTab !== lastTab;
        const prevTab = lastTab;
        lastTab = s.activeTab;
        const tierChanged = s.housing.tier !== lastTier;
        lastTier = s.housing.tier;

        // Never teleport or reset player position when simply opening or closing overlay panels like 'profile' or 'minbar'
        const isFromOverlay = prevTab === 'profile' || prevTab === 'minbar';
        const isToOverlay = s.activeTab === 'profile' || s.activeTab === 'minbar';

        if (!isToOverlay) {
          if (s.activeTab === 'classroom' && tabChanged && !isFromOverlay) {
            applyPose('idle');
            teleportTo(31, -7.2, Math.PI, 9.2);
          } else if (s.activeTab === 'home') {
            if ((tabChanged && !isFromOverlay) || tierChanged) {
              applyPose('idle');
              const dest = HOUSE_SPAWN[s.housing.tier] || HOUSE_SPAWN.ruwaq;
              teleportTo(dest.x, dest.z, Math.PI, 8.8);
            }
          } else if (s.activeTab === 'compound' && tabChanged) {
            // ONLY teleport back to school center if arriving from another 3D realm (classroom or home),
            // NEVER when returning from profile or minbar!
            if (prevTab === 'classroom' || prevTab === 'home') {
              applyPose('idle');
              teleportTo(0, 3.8, Math.PI, 11);
            }
          }
        }
      }

      if (s.outfitRevision !== lastOutfitRev) {
        lastOutfitRev = s.outfitRevision;
        scene.remove(playerChar.group);
        playerChar.dispose();
        playerChar = makePlayer();
        playerChar.group.position.set(pos.x, 0, pos.z);
        playerChar.group.rotation.y = pos.rot;
        playerChar.group.add(riderMountRoot);
        scene.add(playerChar.group);
      }
    });

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (paused) return;
      time += dt;

      // --- real-world time of day & live Lagos weather ---
      hour = realHourNow();
      if (time - lastStoreWrite > 1.0) {
        lastStoreWrite = time;
        st().setHour(hour);
      }
      const wCond = st().weather.condition;
      let light = sampleSky(hour, tmpColor);
      const fog = scene.fog as THREE.FogExp2;

      if (wCond === 'rain') {
        weatherTint.copy(COLORS.rainSky).multiplyScalar(Math.max(0.25, light));
        tmpColor.lerp(weatherTint, 0.62);
        light *= 0.65;
        fog.density = 0.016;
      } else if (wCond === 'storm') {
        weatherTint.copy(COLORS.stormSky).multiplyScalar(Math.max(0.2, light));
        tmpColor.lerp(weatherTint, 0.78);
        light *= 0.48;
        fog.density = 0.02;
      } else if (wCond === 'harmattan') {
        weatherTint.copy(COLORS.harmattanSky).multiplyScalar(Math.max(0.25, light));
        tmpColor.lerp(weatherTint, 0.55);
        light *= 0.82;
        fog.density = 0.018;
      } else if (wCond === 'clouds') {
        weatherTint.copy(COLORS.cloudSky).multiplyScalar(Math.max(0.25, light));
        tmpColor.lerp(weatherTint, 0.25);
        light *= 0.9;
        fog.density = 0.012;
      } else {
        fog.density = 0.0095;
      }

      skyColor.copy(tmpColor);
      fog.color.copy(tmpColor);
      const night = THREE.MathUtils.clamp((0.6 - light) / 0.4, 0, 1);
      hemi.intensity = 0.28 + 0.65 * light;
      hemi.color.copy(tmpColor).lerp(new THREE.Color(0xffffff), 0.6);
      const angle = ((hour - 6) / 12) * Math.PI;
      const sunUp = Math.sin(angle) > 0.02 && hour > 5.5 && hour < 18.8;
      sun.position.set(pos.x + Math.cos(angle) * 22, Math.max(7, Math.abs(Math.sin(angle)) * 28), pos.z + 10);
      sun.target.position.set(pos.x, 0, pos.z);
      if (sunUp) {
        sun.color.copy(COLORS.sunLow).lerp(COLORS.sunNoon, Math.min(1, light));
        sun.intensity = (0.3 + 1.2 * light) * (wCond === 'rain' || wCond === 'storm' ? 0.45 : 1);
      } else {
        sun.color.copy(COLORS.moon);
        sun.intensity = 0.35;
      }
      world.lampMats.forEach((m) => (m.emissiveIntensity = 0.2 + 2.4 * night));
      world.windowMats.forEach((m) => (m.emissiveIntensity = night * 1.1));
      world.headMats.forEach((m) => (m.emissiveIntensity = 0.2 + 2 * night));

      // Animate 3D rain drops around the player when raining/storming
      const isRaining = wCond === 'rain' || wCond === 'storm';
      rainPoints.visible = isRaining;
      if (isRaining) {
        rainPoints.position.set(pos.x, 0, pos.z);
        const attr = rainGeo.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        const dropSpeed = (wCond === 'storm' ? 22 : 16) * dt;
        const windDrift = (wCond === 'storm' ? 3.5 : 1.2) * dt;
        for (let i = 0; i < RAIN_COUNT; i++) {
          arr[i * 3] += windDrift;
          if (arr[i * 3] > 22) arr[i * 3] -= 44;
          arr[i * 3 + 1] -= dropSpeed;
          if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 18 + Math.random() * 4;
        }
        attr.needsUpdate = true;
      }

      // --- Danfo Transit Ride OR Player Walking ---
      const activeRide = st().ride;
      if (activeRide) {
        const x0 = STOP_X[activeRide.from];
        const x1 = STOP_X[activeRide.to];
        const dir: 1 | -1 = x1 >= x0 ? 1 : -1;
        const laneZ = dir === 1 ? 11.6 : 16.4;
        const dist = Math.abs(x1 - x0);
        const busSpeed = 9.5; // metres per second (~21s to Isolo, ~26s to Idimu)
        const nextP = activeRide.progress + (busSpeed * dt) / Math.max(10, dist);
        if (nextP >= 1) {
          world.rideBus.group.visible = false;
          pos.x = x1;
          pos.z = 9.4;
          pos.rot = Math.PI;
          playerChar.group.position.set(pos.x, 0, pos.z);
          playerChar.setPose('idle');
          st().finishRide();
          say(`Conductor: "${activeRide.label}! Oya drop!" You alighted at the bus stop.`);
        } else {
          st().updateRide(nextP);
          const bx = x0 + (x1 - x0) * nextP;
          world.rideBus.group.visible = true;
          world.rideBus.group.position.set(bx, 0, laneZ);
          world.rideBus.group.rotation.y = dir === 1 ? 0 : Math.PI;
          const spin = (busSpeed * dt) / world.rideBus.wheelR;
          world.rideBus.wheels.forEach((w) => (w.rotation.z -= spin));

          // Seat the student visibly aboard the moving Danfo
          pos.x = bx;
          pos.z = laneZ;
          pos.rot = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
          playerChar.setPose('sit');
          playerChar.group.position.set(bx - dir * 0.4, 0.75, laneZ + (dir === 1 ? -0.55 : 0.55));
          playerChar.group.rotation.y = pos.rot;
        }
        playerChar.update(time, dt);
      } else {
        world.rideBus.group.visible = false;
        const curMount = st().mount;
        riderBike.visible = curMount === 'bicycle';
        riderMoto.visible = curMount === 'okada';

        let ix = (keys['arrowright'] ? 1 : 0) - (keys['arrowleft'] ? 1 : 0) + joyRef.current.x;
        let iz = (keys['arrowdown'] ? 1 : 0) - (keys['arrowup'] ? 1 : 0) + joyRef.current.y;
        const mag = Math.hypot(ix, iz);
        const moving = mag > 0.08;
        const joyMag = Math.hypot(joyRef.current.x, joyRef.current.y);
        // Shift on desktop, or pushing the joystick to its rim on touch
        const sprint = keys['shift'] || joyMag > 0.92;
        if (moving) {
          if (mag > 1) {
            ix /= mag;
            iz /= mag;
          }
          const analog = keys['arrowright'] || keys['arrowleft'] || keys['arrowup'] || keys['arrowdown'] ? 1 : Math.min(1, Math.max(0.45, mag));
          const fwdX = -Math.sin(cam.yaw);
          const fwdZ = -Math.cos(cam.yaw);
          const rightX = Math.cos(cam.yaw);
          const rightZ = -Math.sin(cam.yaw);
          const dx = rightX * ix + fwdX * -iz;
          const dz = rightZ * ix + fwdZ * -iz;
          const baseSpd = curMount === 'okada' ? (sprint ? 21.0 : 16.5) : curMount === 'bicycle' ? (sprint ? 14.0 : 10.5) : (sprint ? 8.5 : 4.8);
          const speed = baseSpd * analog * dt;
          pos.x += dx * speed;
          pos.z += dz * speed;

          if (curMount === 'bicycle') {
            bikeWheels.forEach((w) => (w.rotation.x -= speed * 3.1));
          } else if (curMount === 'okada') {
            motoWheels.forEach((w) => (w.rotation.x -= speed * 2.7));
          }

          for (let pass = 0; pass < 2; pass++) {
            for (const c of world.colliders) {
              const cx = THREE.MathUtils.clamp(pos.x, c.minX, c.maxX);
              const cz = THREE.MathUtils.clamp(pos.z, c.minZ, c.maxZ);
              const ddx = pos.x - cx;
              const ddz = pos.z - cz;
              const d2 = ddx * ddx + ddz * ddz;
              if (d2 < R * R) {
                if (d2 > 1e-6) {
                  const d = Math.sqrt(d2);
                  pos.x = cx + (ddx / d) * R;
                  pos.z = cz + (ddz / d) * R;
                } else {
                  const left = pos.x - c.minX;
                  const right = c.maxX - pos.x;
                  const top = pos.z - c.minZ;
                  const bottom = c.maxZ - pos.z;
                  const m = Math.min(left, right, top, bottom);
                  if (m === left) pos.x = c.minX - R;
                  else if (m === right) pos.x = c.maxX + R;
                  else if (m === top) pos.z = c.minZ - R;
                  else pos.z = c.maxZ + R;
                }
              }
            }
          }
          // Enforce locked house interiors so players cannot enter houses they haven't rented or bought
          const curTier = st().housing.tier;
          if (curTier !== 'shared_room' && pos.x > 62.5 && pos.x < 75.5 && pos.z < -5.8 && pos.z > -18.2) {
            pos.z = -5.2;
          }
          if (curTier !== 'mini_flat' && pos.x > 81.0 && pos.x < 97.0 && pos.z < -5.3 && pos.z > -18.8) {
            pos.z = -4.7;
          }
          if (curTier !== 'personal_villa' && pos.x > 103.0 && pos.x < 123.0 && pos.z < -4.3 && pos.z > -19.8) {
            pos.z = -3.7;
          }

          pos.x = THREE.MathUtils.clamp(pos.x, X_MIN, X_MAX);
          pos.z = THREE.MathUtils.clamp(pos.z, Z_MIN + 0.5, Z_MAX - 0.5);
          pos.rot += shortestAngle(pos.rot, Math.atan2(dx, dz)) * Math.min(1, dt * 12);
          if (curMount === 'bicycle') {
            pos.y = 0.32;
            playerChar.setPose('ride_bike');
          } else if (curMount === 'okada') {
            pos.y = 0.36;
            playerChar.setPose('ride_moto');
          } else {
            pos.y = 0;
            if (customPose !== 'idle') applyPose('idle', 0);
            playerChar.setPose(sprint ? 'run' : 'walk');
          }
        } else {
          if (curMount === 'bicycle') {
            pos.y = 0.32;
            playerChar.setPose('ride_bike');
          } else if (curMount === 'okada') {
            pos.y = 0.36;
            playerChar.setPose('ride_moto');
          } else {
            playerChar.setPose(time < emoteUntil ? 'wave' : customPose);
          }
        }
        playerChar.group.position.set(pos.x, pos.y, pos.z);
        playerChar.group.rotation.y = pos.rot;
        playerChar.update(time, dt);
      }

      // --- NPCs (rally toward the Mosque for 18s when Adhan is called!) ---
      const rallying = Date.now() - st().rally < 18000;
      for (const n of world.npcs) {
        const p = n.patrol;
        if (p) {
          const tx = rallying ? 0 : p.dir === 1 ? p.bx : p.ax;
          const tz = rallying ? 3.5 : p.dir === 1 ? p.bz : p.az;
          const g = n.char.group;
          const dx = tx - g.position.x;
          const dz = tz - g.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.4) {
            if (!rallying) p.dir = p.dir === 1 ? -1 : 1;
          } else {
            g.position.x += (dx / dist) * p.speed * dt;
            g.position.z += (dz / dist) * p.speed * dt;
            g.rotation.y += shortestAngle(g.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * 6);
          }
        }
        n.char.update(time, dt);
      }

      // --- vehicles & room fans ---
      for (const rotor of world.fanRotors) {
        rotor.rotation.y += dt * 11;
      }
      for (const v of world.vehicles) {
        v.group.position.x += v.dir * v.speed * dt;
        if (v.dir === 1 && v.group.position.x > v.maxX) v.group.position.x = v.minX;
        if (v.dir === -1 && v.group.position.x < v.minX) v.group.position.x = v.maxX;
        const spin = (v.speed * dt) / v.wheelR;
        v.wheels.forEach((w) => (w.rotation.z -= spin));
      }

      // --- 3D selection indicator for arranging room ---
      if (st().roomOverlay === 'arrange_furniture') {
        const curTier = st().housing.tier;
        const selKey = st().selectedFurniture || 'desk';
        const curItem = world.furnitureRegistry.find(
          (f) => f.tierId === curTier && f.furnitureKey === selKey && f.group.visible
        );
        if (curItem) {
          selectionGroup.visible = true;
          selectionGroup.position.copy(curItem.group.position);
          selectionGroup.rotation.y = curItem.group.rotation.y;
          const pulse = 1.0 + Math.sin(time * 5) * 0.05;
          selectionGroup.scale.set(pulse, 1, pulse);
        } else {
          selectionGroup.visible = false;
        }
      } else {
        selectionGroup.visible = false;
      }

      // --- camera ---
      if (st().roomOverlay === 'arrange_furniture') {
        const curTier = st().housing.tier;
        const selKey = st().selectedFurniture || 'desk';
        const curItem = world.furnitureRegistry.find(
          (f) => f.tierId === curTier && f.furnitureKey === selKey && f.group.visible
        );
        if (curItem) {
          target.lerp(tmpV.set(curItem.group.position.x, curItem.group.position.y + 0.85, curItem.group.position.z), 1 - Math.exp(-dt * 6));
          cam.dist = THREE.MathUtils.clamp(cam.dist, 3.8, 8.5);
          cam.pitch = THREE.MathUtils.clamp(cam.pitch, 0.42, 1.15);
        } else {
          target.lerp(tmpV.set(pos.x, 1.3 + (pos.y || 0) * 0.4, pos.z), 1 - Math.exp(-dt * 8));
        }
      } else {
        target.lerp(tmpV.set(pos.x, 1.3 + (pos.y || 0) * 0.4, pos.z), 1 - Math.exp(-dt * 8));
      }
      const cp = Math.cos(cam.pitch);
      camera.position.set(
        target.x + Math.sin(cam.yaw) * cp * cam.dist,
        target.y + Math.sin(cam.pitch) * cam.dist,
        target.z + Math.cos(cam.yaw) * cp * cam.dist,
      );
      camera.position.y = Math.max(camera.position.y, 0.6);
      camera.lookAt(target);

      // --- zones ---
      let best: Zone | null = null;
      let bestScore = Infinity;
      for (const z of zones) {
        if (z.isAvailable && !z.isAvailable()) continue;
        const zPos = z.getPos ? z.getPos() : { x: z.x, z: z.z };
        const d = Math.hypot(pos.x - zPos.x, pos.z - zPos.z);
        if (d <= z.radius && d / z.radius < bestScore) {
          best = z;
          bestScore = d / z.radius;
        }
      }
      nearZone = best;
      const id = best?.id ?? '';
      if (id !== nearId) {
        nearId = id;
        setNearby(best ? { name: best.name, arabic: best.arabic, action: best.action } : null);
      }

      // --- name-plates (only key teachers & shop owners, when nearby) ---
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;
      for (const l of labels) {
        const playerDist = Math.hypot(l.obj.position.x - pos.x, l.obj.position.z - pos.z);
        if (l.lines.length && playerDist < 10 && time > l.nextSay) {
          l.bubble.textContent = l.lines[Math.floor(Math.random() * l.lines.length)];
          l.bubble.dataset.show = 'true';
          l.hideAt = time + 3.5;
          l.nextSay = time + 10 + Math.random() * 10;
        }
        if ((l.hideAt && time > l.hideAt) || playerDist >= 10) {
          l.bubble.dataset.show = 'false';
          l.hideAt = 0;
        }
        tmpV.set(l.obj.position.x, l.height + 0.2, l.obj.position.z);
        const dist = tmpV.distanceTo(camera.position);
        tmpV.project(camera);
        if (tmpV.z > 1 || dist > 26 || playerDist > 18) {
          l.el.style.display = 'none';
        } else {
          l.el.style.display = 'flex';
          l.el.style.opacity = String(THREE.MathUtils.clamp(1.3 - playerDist / 18, 0.3, 1));
          l.el.style.transform = `translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
        }
      }

      // --- minimap ---
      if (mapCtx && time - lastMap > 0.1) {
        lastMap = time;
        const mx = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * MAP_W;
        const mz = (z: number) => ((z - Z_MIN) / (Z_MAX - Z_MIN)) * MAP_H;
        mapCtx.clearRect(0, 0, MAP_W, MAP_H);
        mapCtx.fillStyle = '#1c2a22';
        mapCtx.fillRect(0, 0, MAP_W, MAP_H);
        mapCtx.fillStyle = '#6b5a3a';
        mapCtx.fillRect(mx(-16), mz(-12), mx(16) - mx(-16), mz(6) - mz(-12));
        // 3D Classroom Hall & 4 Residential Houses on Minimap
        mapCtx.fillStyle = '#0d9488';
        mapCtx.fillRect(mx(22), mz(-18.5), mx(40) - mx(22), mz(-5.5) - mz(-18.5));
        mapCtx.fillStyle = '#b45309';
        mapCtx.fillRect(mx(44.5), mz(-17.5), mx(57.5) - mx(44.5), mz(-6.5) - mz(-17.5));
        mapCtx.fillStyle = '#0284c7';
        mapCtx.fillRect(mx(63.5), mz(-17), mx(74.5) - mx(63.5), mz(-7) - mz(-17));
        mapCtx.fillStyle = '#7c3aed';
        mapCtx.fillRect(mx(82), mz(-18), mx(96) - mx(82), mz(-6) - mz(-18));
        mapCtx.fillStyle = '#eab308';
        mapCtx.fillRect(mx(104), mz(-19), mx(122) - mx(104), mz(-5) - mz(-19));
        mapCtx.fillStyle = '#16a34a';
        mapCtx.fillRect(mx(-30), mz(-8.5), mx(-19) - mx(-30), mz(4.5) - mz(-8.5));
        mapCtx.fillStyle = '#8a6a3a';
        mapCtx.fillRect(mx(-39.5), mz(-26), mx(-15.5) - mx(-39.5), mz(-11) - mz(-26));
        mapCtx.fillStyle = '#2a2c32';
        mapCtx.fillRect(0, mz(10.5), MAP_W, mz(17.5) - mz(10.5));
        mapCtx.fillStyle = '#38bdf8';
        mapCtx.fillRect(mx(-8), mz(-13), mx(8) - mx(-8), mz(-4.9) - mz(-13));
        mapCtx.fillStyle = '#ffc61a';
        for (const v of world.vehicles) mapCtx.fillRect(mx(v.group.position.x) - 2, mz(v.group.position.z) - 1.5, 4, 3);
        mapCtx.fillStyle = '#9aa3a0';
        for (const n of world.npcs) mapCtx.fillRect(mx(n.char.group.position.x) - 1, mz(n.char.group.position.z) - 1, 2, 2);
        mapCtx.fillStyle = '#f5b335';
        for (const z of zones) {
          mapCtx.beginPath();
          mapCtx.arc(mx(z.x), mz(z.z), 3, 0, Math.PI * 2);
          mapCtx.fill();
        }
        mapCtx.save();
        mapCtx.translate(mx(pos.x), mz(pos.z));
        mapCtx.rotate(-pos.rot + Math.PI);
        mapCtx.fillStyle = '#ffffff';
        mapCtx.strokeStyle = '#05241b';
        mapCtx.lineWidth = 1.5;
        mapCtx.beginPath();
        mapCtx.moveTo(0, -5);
        mapCtx.lineTo(4, 4);
        mapCtx.lineTo(-4, 4);
        mapCtx.closePath();
        mapCtx.fill();
        mapCtx.stroke();
        mapCtx.restore();
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      weatherActive = false;
      if (coarseToast) clearTimeout(coarseToast);
      clearInterval(weatherInterval);
      cancelAnimationFrame(raf);
      unsub();
      container.removeEventListener('contextmenu', blockMenu);
      window.removeEventListener('orientationchange', resize);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      labels.forEach((l) => l.el.remove());
      rainGeo.dispose();
      rainMat.dispose();
      playerChar.dispose();
      world.dispose();
      renderer.dispose();
      if (el.parentElement === container) container.removeChild(el);
    };
  }, []);

  // ---------- Virtual joystick ----------
  const padRef = useRef<HTMLDivElement>(null);
  const handleJoy = (e: React.PointerEvent<HTMLDivElement>, active: boolean) => {
    const pad = padRef.current;
    if (!pad) return;
    if (!active) {
      joyRef.current = { x: 0, y: 0 };
      if (joyKnobRef.current) joyKnobRef.current.style.transform = 'translate(0px, 0px)';
      return;
    }
    const rect = pad.getBoundingClientRect();
    const max = rect.width / 2 - 20;
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > max) {
      dx = (dx / d) * max;
      dy = (dy / d) * max;
    }
    joyRef.current = { x: dx / max, y: dy / max };
    if (joyKnobRef.current) joyKnobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  return (
    <div className="absolute inset-0 select-none" style={{ touchAction: 'none' }}>
      <div ref={containerRef} className="absolute inset-0" />
      <div ref={labelsRef} className="absolute inset-0 overflow-hidden pointer-events-none" />

      {/* Minimap */}
      <div className="kw-glass absolute right-3 top-[88px] p-1.5 pointer-events-none hidden sm:block">
        <div className="kw-label px-1 pb-1">Lagos Mainland</div>
        <canvas ref={minimapRef} width={MAP_W} height={MAP_H} className="rounded-lg block" style={{ width: MAP_W, height: MAP_H }} />
      </div>

      {/* Live Danfo Transit Banner */}
      {ride && (
        <div
          className="kw-glass-strong kw-pop absolute left-1/2 -translate-x-1/2 px-4 py-2.5 flex items-center gap-3 text-xs font-extrabold"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 84px)' }}
        >
          <span>🚌 Riding Danfo to {ride.label}...</span>
          <span className="font-mono text-kw-gold-soft">
            {Math.max(0, Math.round(Math.abs(STOP_X[ride.to] - STOP_X[ride.from]) * (1 - ride.progress)))}m left
          </span>
          <button
            onClick={() => updateRide(1)}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] cursor-pointer"
          >
            Skip Ride
          </button>
        </div>
      )}

      {/* Active Amala Errand Banner */}
      {errand && !ride && (
        <div
          className="kw-glass absolute left-3 px-3 py-1.5 text-[11px] font-bold text-kw-gold-soft pointer-events-none"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 84px)' }}
        >
          {errand.stage === 'fetch'
            ? "🍲 Fetch Amala from Iya Basira's Buka"
            : '🏃‍♂️ Deliver Amala to Ustadh Hamza'}
        </div>
      )}

      {/* Toast / commentary */}
      {toast && (
        <div
          className="kw-glass-strong kw-pop absolute left-1/2 -translate-x-1/2 w-[min(92vw,420px)] px-3.5 py-2.5 flex items-start gap-2.5 text-xs leading-snug"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 88px)' }}
        >
          <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-kw-gold" />
          <p className="flex-1">{toast}</p>
          <button onClick={() => setToast(null)} aria-label="Dismiss" className="p-1 -m-1 text-kw-cream-dim hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interaction prompt (mouse / keyboard) */}
      {nearby && (
        <div className="kw-pointer-only kw-glass-strong kw-pop absolute left-1/2 bottom-24 -translate-x-1/2 px-4 py-2.5 flex-col items-center gap-1.5 text-center max-w-[92vw]">
          <div className="kw-label">
            {nearby.name} · <span dir="rtl" className="font-serif normal-case tracking-normal text-sm">{nearby.arabic}</span>
          </div>
          <button onClick={() => interactRef.current()} className="kw-btn kw-btn-primary kw-pulse">
            <Hand className="w-4 h-4" />
            {nearby.action}
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-black/20 text-[10px]">E</kbd>
          </button>
        </div>
      )}

      {/* Character Posture & Action Bar */}
      <div className="kw-glass absolute left-3 bottom-3 hidden sm:flex items-center gap-1 px-2 py-1.5 text-[11px]">
        {(
          [
            ['idle', '🧍 Stand', '1'],
            ['sit', '🪑 Sit', '2'],
            ['crouch', '🧎 Crouch', '3'],
            ['kneel', '🤲 Kneel', '4'],
            ['pray', '🕌 Pray', '5'],
            ['sleep', '🛌 Lie', '6'],
          ] as [Pose, string, string][]
        ).map(([poseKey, label, keyHint]) => (
          <button
            key={poseKey}
            onClick={() => setPoseActionRef.current(poseKey)}
            className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition flex items-center gap-1 ${
              activePose === poseKey
                ? 'bg-kw-gold text-stone-950 shadow-2xs'
                : 'text-kw-cream-dim hover:text-white hover:bg-white/10'
            }`}
            title={`Shortcut: ${keyHint}`}
          >
            <span>{label}</span>
            <kbd className="text-[9px] opacity-60">{keyHint}</kbd>
          </button>
        ))}
        <button
          onClick={() => emoteRef.current()}
          className="px-2 py-1 rounded-lg font-bold text-kw-cream-dim hover:text-white hover:bg-white/10 cursor-pointer flex items-center gap-1"
          title="Shortcut: G"
        >
          <span>👋 Wave</span>
          <kbd className="text-[9px] opacity-60">G</kbd>
        </button>
        {mount !== 'none' ? (
          <button
            onClick={() => setMount('none')}
            className="px-2.5 py-1 rounded-lg font-bold bg-amber-400 text-stone-950 shadow-md cursor-pointer flex items-center gap-1 animate-pulse"
            title="Dismount Vehicle (F)"
          >
            <span>{mount === 'okada' ? '🏍️ Dismount' : '🚲 Dismount'}</span>
            <kbd className="text-[9px] opacity-70 bg-black/20 px-1 rounded">F</kbd>
          </button>
        ) : housing.upgrades.includes('asset_okada') ? (
          <button
            onClick={() => setMount('okada')}
            className="px-2 py-1 rounded-lg font-bold text-amber-300 hover:text-white hover:bg-white/10 cursor-pointer flex items-center gap-1"
            title="Ride Okada (F)"
          >
            <span>🏍️ Okada</span>
            <kbd className="text-[9px] opacity-60">F</kbd>
          </button>
        ) : housing.upgrades.includes('asset_bicycle') ? (
          <button
            onClick={() => setMount('bicycle')}
            className="px-2 py-1 rounded-lg font-bold text-emerald-300 hover:text-white hover:bg-white/10 cursor-pointer flex items-center gap-1"
            title="Ride Bicycle (F)"
          >
            <span>🚲 Bicycle</span>
            <kbd className="text-[9px] opacity-60">F</kbd>
          </button>
        ) : null}
      </div>

      {/* Touch controls: joystick (left) */}
      {roomOverlay !== 'arrange_furniture' && (
        <div
          className="kw-touch-only absolute left-4 items-end"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 16px)',
          }}
        >
          <div
            ref={padRef}
            className="kw-glass relative w-32 h-32 rounded-full flex items-center justify-center"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleJoy(e, true);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) handleJoy(e, true);
            }}
            onPointerUp={(e) => handleJoy(e, false)}
            onPointerCancel={(e) => handleJoy(e, false)}
          >
            <div ref={joyKnobRef} className="w-14 h-14 rounded-full bg-linear-to-b from-kw-gold-soft to-kw-gold shadow-lg pointer-events-none" />
          </div>
        </div>
      )}

      {/* Touch controls: action cluster (right) */}
      {roomOverlay !== 'arrange_furniture' && (
        <div
          className="kw-touch-only absolute flex-col items-end gap-2"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)',
            right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
          }}
        >
          {nearby && (
            <div className="kw-glass-strong kw-pop px-3 py-1.5 text-center max-w-[52vw]">
              <div className="kw-label">{nearby.name}</div>
              <div className="text-[11px] leading-tight">{nearby.action}</div>
            </div>
          )}
          <div className="flex items-end gap-2.5">
            {mount !== 'none' ? (
              <button
                onClick={() => setMount('none')}
                className="kw-glass w-14 h-14 cursor-pointer flex flex-col items-center justify-center bg-amber-400 text-stone-950 font-extrabold animate-pulse shadow-lg rounded-2xl"
                aria-label="Dismount Vehicle"
                title="Dismount"
              >
                <span className="text-xl leading-none">{mount === 'okada' ? '🏍️' : '🚲'}</span>
                <span className="text-[9px] uppercase font-bold tracking-tight">Dismount</span>
              </button>
            ) : (
              <>
                {housing.upgrades.includes('asset_okada') && (
                  <button
                    onClick={() => setMount('okada')}
                    className="kw-glass w-13 h-13 cursor-pointer flex flex-col items-center justify-center text-amber-300 font-bold hover:bg-white/10 rounded-2xl"
                    aria-label="Ride Okada"
                    title="Ride Okada"
                  >
                    <span className="text-lg leading-none">🏍️</span>
                    <span className="text-[8.5px] uppercase font-bold text-amber-200">Okada</span>
                  </button>
                )}
                {housing.upgrades.includes('asset_bicycle') && (
                  <button
                    onClick={() => setMount('bicycle')}
                    className="kw-glass w-13 h-13 cursor-pointer flex flex-col items-center justify-center text-emerald-300 font-bold hover:bg-white/10 rounded-2xl"
                    aria-label="Ride Bicycle"
                    title="Ride Bicycle"
                  >
                    <span className="text-lg leading-none">🚲</span>
                    <span className="text-[8.5px] uppercase font-bold text-emerald-200">Bike</span>
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => emoteRef.current()}
              className="kw-glass w-12 h-12 text-xl cursor-pointer flex items-center justify-center"
              aria-label="Greet"
            >
              👋
            </button>
            <button
              onClick={() => interactRef.current()}
              disabled={!nearby}
              aria-label="Interact"
              className={`w-[72px] h-[72px] rounded-full flex items-center justify-center border-2 transition ${
                nearby
                  ? 'kw-pulse bg-linear-to-b from-kw-gold-soft to-kw-gold border-white/60 text-[#2a1c00] shadow-xl active:scale-90'
                  : 'kw-glass text-kw-cream-dim opacity-70'
              }`}
            >
              <Hand className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}

      {/* Quick House Navigation Bar (when in 3D Home) */}
      {activeTab === 'home' && roomOverlay === 'none' && (
        <div
          className="kw-pop absolute left-1/2 -translate-x-1/2 z-10 flex items-center gap-2"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 72px)' }}
        >
          <button
            onClick={() => setRoomOverlay('arrange_furniture')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs shadow-lg cursor-pointer flex items-center gap-1.5 active:scale-95 transition"
          >
            <span>📐</span>
            <span>Arrange Room</span>
          </button>
          <button
            onClick={() => setRoomOverlay('home_dashboard')}
            className="px-3.5 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-900 text-amber-200 border border-amber-400/40 font-extrabold text-xs shadow-lg cursor-pointer flex items-center gap-1.5 active:scale-95 transition"
          >
            <span>🏠</span>
            <span>House Ledger</span>
          </button>
        </div>
      )}

      {/* Floating 3D Arrange Overlay */}
      {roomOverlay === 'arrange_furniture' && (
        <div
          className="kw-pop absolute left-1/2 -translate-x-1/2 z-30 w-[min(96vw,560px)] p-3 sm:p-4 rounded-3xl bg-stone-950/90 backdrop-blur-md border-2 border-amber-400 text-white shadow-2xl flex flex-col gap-2.5"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/15 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-base">📐</span>
              <span className="font-extrabold text-xs sm:text-sm text-amber-200">Arrange Room in 3D</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateFurnitureTransform(selectedFurniture, { dx: 0, dz: 0, rot: 0 })}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold text-stone-200 cursor-pointer"
              >
                ↺ Reset Piece
              </button>
              <button
                onClick={() => setRoomOverlay('none')}
                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
              >
                ✓ Done
              </button>
            </div>
          </div>

          {/* Pieces Tabs */}
          {(() => {
            const pieces = [
              {
                id: 'bed',
                label: 'Bed',
                fullName: housing.upgrades.includes('asset_mattress') ? 'Orthopedic Mattress' : 'Bed / Sleeping Mat',
                icon: '🛌',
              },
              {
                id: 'desk',
                label: 'Study Desk',
                fullName: housing.upgrades.includes('asset_desk') ? 'Executive Study Desk & Chair' : 'Study Desk & Chair',
                icon: '🪑',
              },
              {
                id: 'rug',
                label: 'Prayer Rug',
                fullName: 'Sajjadah Prayer Rug',
                icon: '🕌',
              },
              {
                id: 'wardrobe',
                label: housing.tier === 'ruwaq' ? 'Trunk Box' : 'Wardrobe',
                fullName: housing.tier === 'ruwaq' ? 'Apoti Irin Trunk' : 'Wardrobe',
                icon: '🚪',
              },
              ...(housing.upgrades.includes('asset_fan') ? [{ id: 'fan', label: 'Standing Fan', fullName: 'Standing OX Fan', icon: '🌀' }] : []),
              ...(housing.upgrades.includes('asset_maktabah') ? [{ id: 'maktabah', label: 'Bookshelf', fullName: 'Maktabah Bookshelf', icon: '📚' }] : []),
            ];

            const activePieceId = pieces.some((p) => p.id === selectedFurniture) ? selectedFurniture : pieces[0].id;
            const activePiece = pieces.find((p) => p.id === activePieceId) ?? pieces[0];
            const curLayout = housing.furnitureLayout ?? {};
            const curTf = curLayout[activePieceId] ?? { dx: 0, dz: 0, rot: 0 };
            const curRotDeg = Math.round(((curTf.rot % (Math.PI * 2)) * 180) / Math.PI);
            const normalizedRot = (curRotDeg + 360) % 360;

            return (
              <>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 kw-scroll">
                  {pieces.map((p) => {
                    const isSel = activePieceId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedFurniture(p.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 cursor-pointer transition flex items-center gap-1.5 border ${
                          isSel
                            ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md scale-105'
                            : 'bg-white/10 hover:bg-white/20 text-stone-200 border-white/10'
                        }`}
                      >
                        <span className="text-sm">{p.icon}</span>
                        <span>{p.label}</span>
                        {isSel && <span className="text-[10px]">●</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Adjuster D-pad + Turn */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-left leading-tight">
                    <div className="text-[11px] text-amber-300 font-extrabold uppercase tracking-wide">
                      {activePiece.fullName}
                    </div>
                    <div className="text-[10.5px] font-mono text-stone-300 pt-0.5">
                      X: {curTf.dx >= 0 ? `+${curTf.dx.toFixed(1)}` : curTf.dx.toFixed(1)}m · Z: {curTf.dz >= 0 ? `+${curTf.dz.toFixed(1)}` : curTf.dz.toFixed(1)}m · {normalizedRot}°
                    </div>
                    <div className="text-[9.5px] text-stone-400 pt-1">
                      💡 Tap arrows to move in real-time · Tap room to look around
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* D-pad */}
                    <div className="grid grid-cols-3 gap-1 w-28 h-28 p-1 rounded-2xl bg-white/10 border border-white/15">
                      <div />
                      <button
                        onClick={() => updateFurnitureTransform(activePieceId, { dz: curTf.dz - 0.35 })}
                        title="Move Back / North"
                        className="rounded-xl bg-white/20 hover:bg-amber-400 hover:text-stone-950 flex items-center justify-center font-bold text-white transition active:scale-95 cursor-pointer text-base"
                      >
                        ▲
                      </button>
                      <div />
                      <button
                        onClick={() => updateFurnitureTransform(activePieceId, { dx: curTf.dx - 0.35 })}
                        title="Move Left / West"
                        className="rounded-xl bg-white/20 hover:bg-amber-400 hover:text-stone-950 flex items-center justify-center font-bold text-white transition active:scale-95 cursor-pointer text-base"
                      >
                        ◀
                      </button>
                      <div className="flex items-center justify-center text-[9px] font-extrabold text-stone-400">
                        MOVE
                      </div>
                      <button
                        onClick={() => updateFurnitureTransform(activePieceId, { dx: curTf.dx + 0.35 })}
                        title="Move Right / East"
                        className="rounded-xl bg-white/20 hover:bg-amber-400 hover:text-stone-950 flex items-center justify-center font-bold text-white transition active:scale-95 cursor-pointer text-base"
                      >
                        ▶
                      </button>
                      <div />
                      <button
                        onClick={() => updateFurnitureTransform(activePieceId, { dz: curTf.dz + 0.35 })}
                        title="Move Forward / South"
                        className="rounded-xl bg-white/20 hover:bg-amber-400 hover:text-stone-950 flex items-center justify-center font-bold text-white transition active:scale-95 cursor-pointer text-base"
                      >
                        ▼
                      </button>
                      <div />
                    </div>

                    {/* Turn 90° button */}
                    <button
                      onClick={() =>
                        updateFurnitureTransform(activePieceId, {
                          rot: (curTf.rot + Math.PI / 2) % (Math.PI * 2),
                        })
                      }
                      className="px-3.5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs cursor-pointer flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95"
                    >
                      <span className="text-xl">🔄</span>
                      <span className="text-[10px] leading-none font-extrabold">Turn 90°</span>
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

