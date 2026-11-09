'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { sound } from '@/lib/audio';
import { subscribeMatchRoom, syncMatchRoomMove } from '@/lib/firebase';
import { RotateCcw, X, Target, Crosshair, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ThrowMinigameProps {
  onClose: () => void;
  initialMode?: 'friendly' | 'online';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const ThrowMinigame: React.FC<ThrowMinigameProps> = ({ onClose, initialMode }) => {
  const { player, reward } = useGameStore();
  const activeMatchRoom = useGameStore((s) => s.activeMatchRoom);
  const authUser = useGameStore((s) => s.authUser);

  const myUid = authUser?.uid || player.id;
  const isMultiplayer = Boolean(activeMatchRoom && activeMatchRoom.gameType === 'throw');
  const isPlayer1 = isMultiplayer ? myUid === activeMatchRoom!.player1Uid : true;
  const opponentName = isMultiplayer
    ? isPlayer1
      ? activeMatchRoom!.player2Name
      : activeMatchRoom!.player1Name
    : 'Snow Fighter Faruq';

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Health states (0 - 100)
  const [p1Health, setP1Health] = useState(100);
  const [p2Health, setP2Health] = useState(100);
  const [turn, setTurn] = useState<'player1' | 'player2'>('player1');
  const [aimData, setAimData] = useState<{ force: number; angle: number }>({ force: 50, angle: 42 });
  const [isAiming, setIsAiming] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('Pull back to aim. Release to throw!');
  const [winner, setWinner] = useState<'player1' | 'player2' | null>(null);
  const [distance] = useState<number>(60); // 60 meters duel

  // World dimensions calibrated for a snappy, responsive 60m duel
  const WORLD_WIDTH = 1400;
  const WORLD_HEIGHT = 420;
  const GROUND_Y = 350;

  // Player positions in world coordinates (separated by ~1080px = 60m)
  const P1_X = 140;
  const P2_X = 1220;

  // Refs for animation loop
  const p1HealthRef = useRef(100);
  const p2HealthRef = useRef(100);
  const turnRef = useRef<'player1' | 'player2'>('player1');
  const winnerRef = useRef<'player1' | 'player2' | null>(null);
  const cameraXRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const projectileRef = useRef<{
    active: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    from: 'player1' | 'player2';
  } | null>(null);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const currentAimRef = useRef<{ force: number; angle: number }>({ force: 50, angle: 42 });
  const isAimingRef = useRef(false);
  const isBotThinkingRef = useRef(false);

  // Sync state refs
  useEffect(() => {
    p1HealthRef.current = p1Health;
    p2HealthRef.current = p2Health;
    turnRef.current = turn;
    winnerRef.current = winner;
  }, [p1Health, p2Health, turn, winner]);

  // Clean room when leaving/unmounting
  useEffect(() => {
    return () => {
      if (isMultiplayer) {
        useGameStore.getState().setActiveMatchRoom(null);
      }
    };
  }, [isMultiplayer]);

  // Firestore room sync
  useEffect(() => {
    if (!isMultiplayer || !activeMatchRoom?.id) return;

    const unsub = subscribeMatchRoom(activeMatchRoom.id, (room) => {
      if (!room || !room.state) return;
      const st = room.state;

      if (typeof st.p1Health === 'number') setP1Health(st.p1Health);
      if (typeof st.p2Health === 'number') setP2Health(st.p2Health);
      if (st.turn) setTurn(st.turn);
      if (st.over) setWinner(st.over);
      if (st.msg) setStatusMsg(st.msg);

      // If remote move triggered projectile
      if (st.lastThrow && st.lastThrow.from !== (isPlayer1 ? 'player1' : 'player2')) {
        const last = st.lastThrow;
        if (!projectileRef.current?.active && Date.now() - last.timestamp < 3500) {
          triggerLaunch(last.from, last.angle, last.force, false);
        }
      }
    });

    return () => unsub();
  }, [isMultiplayer, activeMatchRoom?.id, isPlayer1]);

  // Launch projectile helper
  const triggerLaunch = useCallback(
    (
      from: 'player1' | 'player2',
      launchAngleDeg: number,
      launchForcePercent: number,
      shouldSync: boolean = true,
    ) => {
      sound.playPasan();
      const angleRad = (launchAngleDeg * Math.PI) / 180;
      // Calibrated velocity for 60m (~1080px) arc
      const speed = (launchForcePercent / 100) * 19.5 + 4.5;

      const startX = from === 'player1' ? P1_X + 22 : P2_X - 22;
      const startY = GROUND_Y - 45;

      const dir = from === 'player1' ? 1 : -1;
      const vx = speed * Math.cos(angleRad) * dir;
      const vy = -speed * Math.sin(angleRad);

      projectileRef.current = {
        active: true,
        x: startX,
        y: startY,
        vx,
        vy,
        from,
      };

      if (shouldSync && isMultiplayer && activeMatchRoom) {
        syncMatchRoomMove(activeMatchRoom.id, {
          ...activeMatchRoom.state,
          lastThrow: {
            from,
            angle: launchAngleDeg,
            force: launchForcePercent,
            timestamp: Date.now(),
          },
          p1Health: p1HealthRef.current,
          p2Health: p2HealthRef.current,
        }, from === 'player1' ? 'player2' : 'player1');
      }
    },
    [isMultiplayer, activeMatchRoom, P1_X, P2_X],
  );

  // Spawn snowball burst particles
  const spawnSnowBurst = (x: number, y: number, count = 18, isCrit = false) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isCrit ? 6 : 4) + 1.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 0,
        maxLife: Math.random() * 20 + 25,
        size: Math.random() * (isCrit ? 5 : 3.5) + 2,
        color: isCrit ? '#fef08a' : '#ffffff',
      });
    }
  };

  // Bot AI routine
  useEffect(() => {
    if (isMultiplayer) return; // Only in solo / bot mode
    if (turn !== 'player2' || winner || isBotThinkingRef.current) return;

    isBotThinkingRef.current = true;
    setStatusMsg(`${opponentName} is calculating trajectory...`);

    const botTimer = setTimeout(() => {
      if (winnerRef.current) {
        isBotThinkingRef.current = false;
        return;
      }

      // Ballistic physics estimation to hit P1_X from P2_X across 60m (~1080px)
      // Range R = (v^2 * sin(2*theta)) / g
      const chosenAngle = Math.floor(Math.random() * 12) + 40; // 40 to 51 degrees optimal launch
      const rad = (chosenAngle * Math.PI) / 180;
      const g = 0.36;
      const targetDist = P2_X - P1_X;
      // Ideal speed for a direct hit:
      const idealSpeed = Math.sqrt((targetDist * g) / Math.sin(2 * rad));
      let idealForce = ((idealSpeed - 4.5) / 19.5) * 100;

      // Balanced competitive AI tuning:
      // Faruq has an authentic ~38% hit rate (~1 hit every 2.5 turns).
      // He poses a real threat if the player slacks off or misses 5+ times, but remains fair.
      const isAccurateShot = Math.random() < 0.38;
      if (isAccurateShot) {
        // On-target throw with subtle human variance (+/- 3%)
        idealForce += (Math.random() * 6 - 3);
      } else {
        // Realistic miss: lands short in the snow (6-11% undershot) or sails just overhead (5-10% overshot)
        const missOffset = Math.random() < 0.6 ? -(Math.random() * 6 + 6) : (Math.random() * 5 + 5);
        idealForce += missOffset;
      }
      idealForce = Math.max(20, Math.min(95, Math.round(idealForce)));

      setStatusMsg(`${opponentName} throws!`);
      triggerLaunch('player2', chosenAngle, idealForce, false);
      isBotThinkingRef.current = false;
    }, 1300);

    return () => clearTimeout(botTimer);
  }, [turn, winner, isMultiplayer, opponentName, triggerLaunch, P1_X, P2_X]);

  // Main canvas animation & physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // 1. Dimensions
      const w = canvas.width;
      const h = canvas.height;

      // 2. Camera tracking - smooth 60m panoramic tracking
      let targetCamX = 0;
      if (projectileRef.current?.active) {
        // Follow snowball, keep in center
        targetCamX = projectileRef.current.x - w / 2;
      } else {
        // Center on active player
        const activeX = turnRef.current === 'player1' ? P1_X : P2_X;
        targetCamX = activeX - w / 2;
      }
      targetCamX = Math.max(0, Math.min(WORLD_WIDTH - w, targetCamX));
      cameraXRef.current += (targetCamX - cameraXRef.current) * 0.12;
      const camX = cameraXRef.current;

      // 3. Sky gradient background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#7dd3fc'); // Sky blue
      skyGrad.addColorStop(0.65, '#e0f2fe'); // Light soft horizon
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(-camX, 0);

      // 4. Distant snowy hills & clouds across 1400px field
      ctx.fillStyle = '#f0f9ff';
      const cloudCenters = [160, 480, 820, 1160];
      for (const cx of cloudCenters) {
        ctx.beginPath();
        ctx.arc(cx - 30, 95, 45, 0, Math.PI * 2);
        ctx.arc(cx + 10, 85, 55, 0, Math.PI * 2);
        ctx.arc(cx + 50, 95, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      // Continuous snowy background mountain ridges
      ctx.fillStyle = '#bfdbfe';
      ctx.beginPath();
      ctx.moveTo(-100, GROUND_Y);
      for (let mx = -100; mx < WORLD_WIDTH + 200; mx += 300) {
        ctx.quadraticCurveTo(mx + 150, 165 + ((mx % 600 === 0) ? 30 : -20), mx + 300, GROUND_Y);
      }
      ctx.lineTo(WORLD_WIDTH + 200, h);
      ctx.lineTo(-100, h);
      ctx.fill();

      // Foreground snow ground
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, h);
      groundGrad.addColorStop(0, '#ffffff');
      groundGrad.addColorStop(0.3, '#f1f5f9');
      groundGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, h - GROUND_Y);

      // Snowy floor top border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(WORLD_WIDTH, GROUND_Y);
      ctx.stroke();

      // Pine trees along the 60m field between P1 and P2
      const drawPineTree = (tx: number, ty: number, scale = 1) => {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(-4, -18, 8, 18);
        ctx.fillStyle = '#14532d';
        for (let t = 0; t < 3; t++) {
          ctx.beginPath();
          ctx.moveTo(0, -58 + t * 14);
          ctx.lineTo(-20 + t * 2, -36 + t * 14);
          ctx.lineTo(20 - t * 2, -36 + t * 14);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(0, -58 + t * 14);
          ctx.lineTo(-10, -46 + t * 14);
          ctx.lineTo(10, -46 + t * 14);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#14532d';
        }
        ctx.restore();
      };

      for (const tx of [420, 720, 980]) {
        drawPineTree(tx, GROUND_Y, 0.95);
      }

      // 5. Draw Dotted Aim Trajectory for human player
      const isMyTurn = isMultiplayer
        ? turnRef.current === (isPlayer1 ? 'player1' : 'player2')
        : turnRef.current === 'player1';

      if (isMyTurn && isAimingRef.current && !projectileRef.current?.active && !winnerRef.current) {
        const aim = currentAimRef.current;
        const fromP1 = turnRef.current === 'player1';
        const startX = fromP1 ? P1_X + 22 : P2_X - 22;
        const startY = GROUND_Y - 45;
        const angleRad = (aim.angle * Math.PI) / 180;
        const speed = (aim.force / 100) * 19.5 + 4.5;
        const dir = fromP1 ? 1 : -1;
        const vx = speed * Math.cos(angleRad) * dir;
        let vy = -speed * Math.sin(angleRad);
        let currX = startX;
        let currY = startY;

        ctx.fillStyle = fromP1 ? '#ef4444' : '#3b82f6';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;

        for (let step = 0; step < 18; step++) {
          currX += vx * 1.8;
          currY += vy * 1.8;
          vy += 0.36 * 1.8;

          ctx.beginPath();
          ctx.arc(currX, currY, Math.max(1.5, 4.8 - step * 0.18), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (currY >= GROUND_Y) break;
        }
      }

      // 6. Draw Player Characters
      const drawCharacter = (
        x: number,
        color: 'red' | 'blue',
        isCurrentTurn: boolean,
        facingRight: boolean,
      ) => {
        const primaryColor = color === 'red' ? '#ef4444' : '#3b82f6';
        const darkColor = color === 'red' ? '#b91c1c' : '#1d4ed8';

        ctx.save();
        ctx.translate(x, GROUND_Y);
        if (!facingRight) ctx.scale(-1, 1);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.beginPath();
        ctx.ellipse(0, -2, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs / Boots
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-12, -14, 8, 14);
        ctx.fillRect(4, -14, 8, 14);

        // Body / Winter Parka Jacket
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.roundRect(-16, -48, 32, 36, [12, 12, 6, 6]);
        ctx.fill();
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Parka Zipper line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -46);
        ctx.lineTo(0, -14);
        ctx.stroke();

        // Head / Face
        ctx.fillStyle = '#fed7aa'; // Skin tone
        ctx.beginPath();
        ctx.arc(0, -60, 13, 0, Math.PI * 2);
        ctx.fill();

        // Parka Hood
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(0, -60, 14, Math.PI * 0.75, Math.PI * 2.25);
        ctx.stroke();

        // Eyes
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(4, -61, 2, 0, Math.PI * 2);
        ctx.fill();

        // Throwing Arm with Snowball (if their turn & not thrown)
        ctx.fillStyle = primaryColor;
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 2;

        if (isCurrentTurn && !projectileRef.current?.active) {
          const armAngle = (currentAimRef.current.angle * Math.PI) / 180;
          ctx.save();
          ctx.translate(8, -38);
          ctx.rotate(-armAngle * 0.7);

          ctx.beginPath();
          ctx.roundRect(0, -4, 18, 8, 4);
          ctx.fill();
          ctx.stroke();

          // Snowball in hand
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#94a3b8';
          ctx.beginPath();
          ctx.arc(19, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else {
          // Resting arm
          ctx.beginPath();
          ctx.roundRect(6, -40, 8, 18, 4);
          ctx.fill();
          ctx.stroke();
        }

        // Active indicator ring around feet
        if (isCurrentTurn && !winnerRef.current) {
          ctx.strokeStyle = color === 'red' ? '#f87171' : '#60a5fa';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.ellipse(0, -2, 28, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
      };

      // Draw both characters
      drawCharacter(P1_X, 'red', turnRef.current === 'player1', true);
      drawCharacter(P2_X, 'blue', turnRef.current === 'player2', false);

      // 7. Update & Draw Projectile
      const proj = projectileRef.current;
      if (proj && proj.active) {
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.vy += 0.36; // calibrated 60m gravity

        // Draw Snowball
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Sparkle / motion trail
        particlesRef.current.push({
          x: proj.x,
          y: proj.y,
          vx: -proj.vx * 0.15 + (Math.random() - 0.5),
          vy: -proj.vy * 0.15 + (Math.random() - 0.5),
          life: 0,
          maxLife: 12,
          size: Math.random() * 2.5 + 1.5,
          color: '#e2e8f0',
        });

        // Hit Detection against Opponent
        const targetX = proj.from === 'player1' ? P2_X : P1_X;
        const isFacing = Math.abs(proj.x - targetX) < 18;

        // Head hit (Y around GROUND_Y - 74 to -48)
        const isHeadshot = isFacing && proj.y >= GROUND_Y - 74 && proj.y <= GROUND_Y - 48;
        // Body hit (Y around GROUND_Y - 48 to -10)
        const isBodyHit = isFacing && proj.y > GROUND_Y - 48 && proj.y <= GROUND_Y - 10;

        let hitHappened = false;
        let isHead = false;

        if (isHeadshot) {
          hitHappened = true;
          isHead = true;
        } else if (isBodyHit) {
          hitHappened = true;
          isHead = false;
        } else if (proj.y >= GROUND_Y) {
          // Miss / Ground hit
          proj.active = false;
          spawnSnowBurst(proj.x, GROUND_Y, 14, false);
          sound.playWalaahTap();
          setStatusMsg('Splash! Missed the target.');

          // Switch turn
          setTimeout(() => {
            const nextTurn = proj.from === 'player1' ? 'player2' : 'player1';
            setTurn(nextTurn);
            setStatusMsg(
              nextTurn === 'player1'
                ? 'Your turn! Pull back to aim and throw.'
                : `${opponentName}'s turn to throw!`,
            );
          }, 650);
        }

        if (hitHappened) {
          proj.active = false;
          const damage = isHead ? 45 : 25;
          spawnSnowBurst(proj.x, proj.y, isHead ? 30 : 18, isHead);

          if (isHead) {
            sound.playTakbeer();
            setStatusMsg('🎯 CRITICAL HEADSHOT! Extra damage dealt!');
          } else {
            sound.playCoin();
            setStatusMsg('💥 Direct Body Hit! Damage dealt.');
          }

          // Apply damage
          if (proj.from === 'player1') {
            const newHp = Math.max(0, p2HealthRef.current - damage);
            setP2Health(newHp);
            p2HealthRef.current = newHp;

            if (newHp <= 0) {
              setWinner('player1');
              confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
              reward(
                { naira: 1000, barakah: 8, taqwa: 4 },
                `Victory in the Snowball Duel tournament! Awarded ₦1,000 +8 Barakah.`,
              );
            }
          } else {
            const newHp = Math.max(0, p1HealthRef.current - damage);
            setP1Health(newHp);
            p1HealthRef.current = newHp;

            if (newHp <= 0) {
              setWinner('player2');
            }
          }

          // Switch turn if no winner
          if (p1HealthRef.current > 0 && p2HealthRef.current > 0) {
            setTimeout(() => {
              const nextTurn = proj.from === 'player1' ? 'player2' : 'player1';
              setTurn(nextTurn);
              setStatusMsg(
                nextTurn === 'player1'
                  ? 'Your turn! Pull back to aim and throw.'
                  : `${opponentName}'s turn to throw!`,
              );
            }, 800);
          }
        }
        ctx.restore();
      }

      // 8. Draw & update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        const radius = Math.max(0.1, p.size * (1 - p.life / p.maxLife));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // 9. Opponent Off-Screen Radar Bubble (matching tutorial screenshots)
      const targetPlayerX = turnRef.current === 'player1' ? P2_X : P1_X;
      const targetScreenX = targetPlayerX - camX;

      if (targetScreenX > w - 40) {
        // Target is off-screen to the right (Player 1 looking towards Player 2)
        const bubbleW = 86;
        const bubbleH = 34;
        const bubbleX = w - bubbleW - 14;
        const bubbleY = h - 68;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 17);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(bubbleX + 18, bubbleY + 17, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👤', bubbleX + 18, bubbleY + 17);

        ctx.fillStyle = '#0f172a';
        ctx.font = '900 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${distance}m ➔`, bubbleX + 34, bubbleY + 18);
        ctx.restore();
      } else if (targetScreenX < 40) {
        // Target is off-screen to the left (Player 2 looking towards Player 1)
        const bubbleW = 86;
        const bubbleH = 34;
        const bubbleX = 14;
        const bubbleY = h - 68;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 17);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`⬅ ${distance}m`, bubbleX + 10, bubbleY + 18);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(bubbleX + bubbleW - 18, bubbleY + 17, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👤', bubbleX + bubbleW - 18, bubbleY + 17);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [P1_X, P2_X, WORLD_WIDTH, distance, isMultiplayer, isPlayer1, opponentName, reward]);

  // Touch / Mouse Drag handlers for Pull-Back Aiming
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isMyTurn = isMultiplayer
      ? turn === (isPlayer1 ? 'player1' : 'player2')
      : turn === 'player1';

    if (!isMyTurn || projectileRef.current?.active || winner) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    dragStartRef.current = { x: clientX, y: clientY };
    setIsAiming(true);
    isAimingRef.current = true;
    sound.playWalaahTap();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAimingRef.current || !dragStartRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const dx = dragStartRef.current.x - clientX;
    const dy = clientY - dragStartRef.current.y;

    // Pull-back calculation
    const dragDistance = Math.hypot(dx, dy);
    const forcePercent = Math.min(100, Math.max(10, Math.round((dragDistance / 140) * 100)));

    let angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    angleDeg = Math.max(-15, Math.min(80, angleDeg));

    currentAimRef.current = { force: forcePercent, angle: angleDeg };
    setAimData({ force: forcePercent, angle: angleDeg });
  };

  const handlePointerUp = () => {
    if (!isAimingRef.current) return;
    setIsAiming(false);
    isAimingRef.current = false;
    dragStartRef.current = null;

    const myRole = isMultiplayer ? (isPlayer1 ? 'player1' : 'player2') : 'player1';
    triggerLaunch(myRole, currentAimRef.current.angle, currentAimRef.current.force, true);
  };

  const handleRestart = () => {
    setP1Health(100);
    setP2Health(100);
    p1HealthRef.current = 100;
    p2HealthRef.current = 100;
    setTurn('player1');
    turnRef.current = 'player1';
    setWinner(null);
    winnerRef.current = null;
    projectileRef.current = null;
    setStatusMsg('New match started! Pull back to aim and throw.');
    sound.playCoin();
  };

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-sky-400/30">
      {/* Top Header / Dual Health Bar */}
      <div className="bg-slate-950/90 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-sky-500/20 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs gap-1.5">
          {/* Player 1 (Red) */}
          <div className="flex items-center gap-1.5 font-extrabold text-rose-400 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="truncate max-w-[100px] sm:max-w-[170px]">
              {isMultiplayer && !isPlayer1 ? opponentName : player.name}
            </span>
            <span className="text-[10px] text-rose-300 font-bold shrink-0">({p1Health}%)</span>
          </div>

          {/* Centered Distance Badge */}
          <span className="shrink-0 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 whitespace-nowrap">
            🎯 {distance}m
          </span>

          {/* Player 2 (Blue) */}
          <div className="flex items-center gap-1.5 font-extrabold text-sky-400 min-w-0 justify-end">
            <span className="text-[10px] text-sky-300 font-bold shrink-0">({p2Health}%)</span>
            <span className="truncate max-w-[100px] sm:max-w-[170px] text-right">
              {opponentName}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
          </div>
        </div>

        {/* Dual Opposing Health Bar (Matches the game's exact aesthetic) */}
        <div className="relative w-full h-4 sm:h-5 bg-slate-800 rounded-full overflow-hidden flex items-center border border-white/20 shadow-inner">
          {/* Red Half (Left) */}
          <div className="w-1/2 h-full flex justify-end bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-300"
              style={{ width: `${p1Health}%` }}
            />
          </div>

          {/* Center Crossed Swords Marker */}
          <div className="absolute left-1/2 -translate-x-1/2 z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[9px] sm:text-[10px] shadow">
            ⚔️
          </div>

          {/* Blue Half (Right) */}
          <div className="w-1/2 h-full flex justify-start bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-300"
              style={{ width: `${p2Health}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Game Canvas */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-sky-200 overflow-hidden">
        {/* Live Aim HUD (Force % and Angle ° positioned neatly inside canvas sky) */}
        <div className="absolute top-2.5 left-2.5 z-10 bg-white/90 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-sky-300 shadow-md flex items-center gap-2 sm:gap-3 text-xs pointer-events-none">
          <div>
            <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Force</div>
            <div className="font-black text-slate-900 text-xs sm:text-sm">{aimData.force}%</div>
          </div>
          <div className="w-px h-5 sm:h-6 bg-slate-300" />
          <div>
            <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Angle</div>
            <div className="font-black text-slate-900 text-xs sm:text-sm">{aimData.angle}°</div>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full cursor-crosshair touch-none select-none"
        />

        {/* Status ticker pill */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-900/85 backdrop-blur-md px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-white text-[11px] sm:text-xs font-bold border border-white/20 shadow-lg pointer-events-none text-center max-w-[90%] truncate">
          {statusMsg}
        </div>
      </div>

      {/* Bottom Controls / Helper Bar */}
      <div className="bg-slate-950 px-3 py-2 sm:py-2.5 flex items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-400">
        <div className="flex items-center gap-1.5 min-w-0">
          <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Tap &amp; drag backwards to aim. Release to throw!</span>
        </div>

        <button
          onClick={handleRestart}
          className="shrink-0 inline-flex items-center gap-1 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer font-bold text-[11px]"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Winner Overlay Modal */}
      {winner && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white gap-3 animate-in fade-in duration-300">
          <div className="text-5xl animate-bounce">
            {winner === 'player1' ? '🏆' : '❄️'}
          </div>
          <h3 className="font-black text-2xl text-amber-300">
            {winner === 'player1'
              ? `${isMultiplayer && !isPlayer1 ? opponentName : player.name} WINS!`
              : `${opponentName} WINS!`}
          </h3>
          <p className="text-xs text-slate-300 max-w-xs">
            {winner === 'player1'
              ? 'Tremendous aim and trajectory calculation! The opposing health bar has been completely depleted.'
              : `${opponentName} claimed the snowball victory this round! Ready for a rematch?`}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleRestart}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-lg transition"
            >
              <RotateCcw className="w-4 h-4" /> Rematch
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition"
            >
              <X className="w-4 h-4" /> Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
