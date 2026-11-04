'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { sound } from '@/lib/audio';
import { realHourNow, fetchLagosWeather, fetchLagosSolatTimings } from '@/lib/time';
import { buildCharacter, Character } from './characterBuilder';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const joyRef = useRef({ x: 0, y: 0 });
  const joyKnobRef = useRef<HTMLDivElement>(null);
  const interactRef = useRef<() => void>(() => {});
  const emoteRef = useRef<() => void>(() => {});

  const [nearby, setNearby] = useState<{ name: string; arabic: string; action: string } | null>(null);
  const [toast, setToast] = useState<string | null>(
    'Assalamu alaikum! Walk with the Arrow Keys (↑ ↓ ← →) or joystick. Drag to rotate the camera. Press E to interact.',
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const labelHost = labelsRef.current;
    if (!container || !labelHost) return;

    const say = (text: string) => {
      setToast(text);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 5500);
    };

    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const coarseToast = coarse
      ? setTimeout(() => {
          setToast('Assalamu alaikum! Use the joystick to walk (push to the edge to run). Drag to look, pinch to zoom. Tap the gold button to interact.');
        }, 0)
      : null;

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
    const pos = { x: 0, z: 3.8, rot: Math.PI };
    playerChar.group.position.set(pos.x, 0, pos.z);
    let lastOutfitRev = useGameStore.getState().outfitRevision;

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
    const KEY_NPCS = new Set(['alfa', 'ped4', 'basira', 'mallam', 'alhaji', 'imam', 'ridwan', 'zainab', 'baba_ayo']);
    world.npcs.forEach((n) => {
      if (!KEY_NPCS.has(n.id)) return;
      const sitting = n.idlePose === 'recite' || n.idlePose === 'alfa' || n.idlePose === 'sit';
      const s = n.char.group.scale.x;
      makeLabel(n.name, n.title, n.char.group, (sitting ? 1.35 : 2.0) * s, n.lines);
    });

    // ---------- Zones ----------
    const st = () => useGameStore.getState();
    const zones: Zone[] = [
      {
        id: 'alfa', name: "Baba Kewu's Seat", arabic: 'مَقْعَدُ الشَّيْخِ', x: 0, z: -2.6, radius: 2.2,
        action: 'Hifz Verse Builder / Call Adhan',
        onInteract: () => { st().setActivity('alfa'); },
      },
      {
        id: 'ibtida', name: "Ibtida'i Class Shed", arabic: 'فَصْلُ الِابْتِدَائِيِّ', x: -11.5, z: -3.2, radius: 2.8,
        action: 'Huruf Speed Drill & Grade Slates (₦)',
        onInteract: () => { st().setActivity('ibtida'); },
      },
      {
        id: 'adult', name: 'Adult / Markaziy Shed', arabic: 'فَصْلُ النَّحْوِ', x: 11.5, z: -3.2, radius: 2.6,
        action: 'Study Al-Ajurrumiyyah (Arabic Grammar)',
        onInteract: () => { st().setActivity('nahw'); },
      },
      {
        id: 'ustadh', name: 'Ustadh Hamza', arabic: 'الأُسْتَاذُ حَمْزَة', x: 9.5, z: -3.5, radius: 2.0,
        action: 'Amala Errand Hustle (Earn Tip ₦)',
        onInteract: () => {
          const e = st().errand;
          if (!e || e.stage === 'fetch') return st().startErrand();
          return st().completeErrand();
        },
      },
      {
        id: 'minaret', name: 'Mosque Minaret', arabic: 'المِئْذَنَة', x: 7.4, z: -5.5, radius: 2.4,
        action: 'Call the Adhan (Summon Congregation)',
        onInteract: () => { st().setActivity('adhan'); },
      },
      {
        id: 'halqah', name: 'Recitation Circle', arabic: 'حَلْقَةُ التِّلَاوَةِ', x: 0, z: 0.9, radius: 1.8,
        action: 'Join the Tajweed Quiz Duel',
        onInteract: () => { st().setActiveTab('quiz'); },
      },
      {
        id: 'well', name: 'Ablution Well & Taps', arabic: 'بِئْرُ الْوُضُوءِ', x: -7, z: 1, radius: 2.7,
        action: 'Wash Walaah Slate / Fiqh of Wudu',
        onInteract: () => { st().setActivity('well'); },
      },
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
    const unlockAudio = () => sound.startBgNasheed();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === 'e' || k === 'enter') interactRef.current();
      if (k === 'g') emoteRef.current();
      if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Orbit camera: one finger/mouse rotates, two fingers pinch-zoom
    const cam = { yaw: 0, pitch: 0.55, dist: 11 };
    const target = new THREE.Vector3(pos.x, 1.2, pos.z);
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    const el = renderer.domElement;
    const pinchSpan = () => {
      const [a, b] = Array.from(pointers.values());
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
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
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 1) pinchDist = 0;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
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

    // Pause the simulation (and save battery) while a panel covers the world
    let paused = st().activeTab !== 'compound' || st().activity !== null;
    const unsub = useGameStore.subscribe((s) => {
      paused = s.activeTab !== 'compound' || s.activity !== null;
      if (paused) joyRef.current = { x: 0, y: 0 };
      if (s.outfitRevision !== lastOutfitRev) {
        lastOutfitRev = s.outfitRevision;
        scene.remove(playerChar.group);
        playerChar.dispose();
        playerChar = makePlayer();
        playerChar.group.position.set(pos.x, 0, pos.z);
        playerChar.group.rotation.y = pos.rot;
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
          const speed = (sprint ? 8.5 : 4.8) * analog * dt;
          pos.x += dx * speed;
          pos.z += dz * speed;
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
          pos.x = THREE.MathUtils.clamp(pos.x, X_MIN, X_MAX);
          pos.z = THREE.MathUtils.clamp(pos.z, Z_MIN + 0.5, Z_MAX - 0.5);
          pos.rot += shortestAngle(pos.rot, Math.atan2(dx, dz)) * Math.min(1, dt * 12);
          playerChar.setPose(sprint ? 'run' : 'walk');
        } else {
          playerChar.setPose(time < emoteUntil ? 'wave' : 'idle');
        }
        playerChar.group.position.set(pos.x, 0, pos.z);
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

      // --- vehicles ---
      for (const v of world.vehicles) {
        v.group.position.x += v.dir * v.speed * dt;
        if (v.dir === 1 && v.group.position.x > v.maxX) v.group.position.x = v.minX;
        if (v.dir === -1 && v.group.position.x < v.minX) v.group.position.x = v.maxX;
        const spin = (v.speed * dt) / v.wheelR;
        v.wheels.forEach((w) => (w.rotation.z -= spin));
      }

      // --- camera ---
      target.lerp(tmpV.set(pos.x, 1.3, pos.z), 1 - Math.exp(-dt * 8));
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
        const d = Math.hypot(pos.x - z.x, pos.z - z.z);
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
            ? "🍲 Errand: Go to Iya Basira's Buka across the road to collect Ustadh Hamza's hot amala!"
            : '🏃‍♂️ Errand: Hurry back to Ustadh Hamza with the steaming amala before it cools!'}
        </div>
      )}

      {/* Toast / commentary */}
      {toast && (
        <div
          className="kw-glass-strong kw-pop absolute left-1/2 -translate-x-1/2 w-[min(92vw,460px)] px-4 py-3 flex items-start gap-3 text-[13px] leading-snug"
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
        <div className="kw-pointer-only kw-glass-strong kw-pop absolute left-1/2 bottom-24 -translate-x-1/2 px-4 py-3 flex-col items-center gap-2 text-center max-w-[92vw]">
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

      {/* Controls hint (mouse / keyboard) */}
      <div className="kw-pointer-only kw-glass absolute left-3 bottom-3 items-center gap-3 px-3 py-2 text-[11px] text-kw-cream-dim pointer-events-none">
        <span><b className="text-kw-gold-soft">↑ ↓ ← →</b> move</span>
        <span><b className="text-kw-gold-soft">Shift</b> run</span>
        <span><b className="text-kw-gold-soft">Drag</b> look</span>
        <span><b className="text-kw-gold-soft">Scroll</b> zoom</span>
        <span><b className="text-kw-gold-soft">E</b> interact</span>
        <span><b className="text-kw-gold-soft">G</b> salaam</span>
      </div>

      {/* Touch controls: joystick (left) */}
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

      {/* Touch controls: action cluster (right) */}
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
        <div className="flex items-end gap-3">
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
    </div>
  );
};

