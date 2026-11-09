'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { sound } from '@/lib/audio';
import { subscribeMatchRoom, syncMatchRoomMove, publishMinbarPostToCloud } from '@/lib/firebase';
import { Trophy, Play, RotateCcw, Users } from 'lucide-react';

const W = 360;
const H = 460;
const GOAL_W = 136;
const GOAL_LEFT = (W - GOAL_W) / 2;
const GOAL_RIGHT = (W + GOAL_W) / 2;
const BALL_R = 9;
const WIN_GOALS = 3;

export const FootballMinigame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { player, reward } = useGameStore();
  const activeMatchRoom = useGameStore((s) => s.activeMatchRoom);
  const setActiveMatchRoom = useGameStore((s) => s.setActiveMatchRoom);
  const authUser = useGameStore((s) => s.authUser);

  const myUid = authUser?.uid || player.id;
  const isMultiplayer = Boolean(activeMatchRoom && activeMatchRoom.gameType === 'football');
  const isPlayer1 = isMultiplayer ? myUid === activeMatchRoom!.player1Uid : true;
  const opponentName = isMultiplayer
    ? isPlayer1
      ? activeMatchRoom!.player2Name
      : activeMatchRoom!.player1Name
    : 'Captain Ridwan';

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<'menu' | 'friendly' | 'cup' | 'twoplayer' | 'online'>(
    isMultiplayer ? 'online' : 'menu',
  );
  const isOnline = mode === 'online';
  const [score, setScore] = useState<{ you: number; opp: number }>({ you: 0, opp: 0 });
  const [banner, setBanner] = useState<string | null>(
    isMultiplayer ? `LIVE 1v1 MATCH vs ${opponentName.toUpperCase()}!` : null,
  );
  const [winner, setWinner] = useState<'you' | 'opp' | null>(null);

  const inputXRef = useRef<number>(W / 2);
  const p2InputXRef = useRef<number>(W / 2);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const p2KeysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const lastSyncRef = useRef<number>(0);
  const rewarded = useRef(false);

  // Store activeMatchRoom in ref to avoid recreating loops
  const activeMatchRoomRef = useRef(activeMatchRoom);
  useEffect(() => {
    activeMatchRoomRef.current = activeMatchRoom;
  }, [activeMatchRoom]);

  // Remote network data received from opponent
  const remoteDataRef = useRef<{
    ball?: { x: number; y: number; vx: number; vy: number };
    p1X?: number;
    p2X?: number;
    p1Score?: number;
    p2Score?: number;
    msg?: string;
  }>({});

  // If match room exists, enter online mode immediately
  useEffect(() => {
    if (isMultiplayer) {
      setMode('online');
      setBanner(`LIVE 1v1 MATCH vs ${opponentName.toUpperCase()}!`);
    }
  }, [isMultiplayer, opponentName]);

  // Clean room when leaving/unmounting
  useEffect(() => {
    return () => {
      if (isMultiplayer) {
        useGameStore.getState().setActiveMatchRoom(null);
      }
    };
  }, [isMultiplayer]);

  // 1. Separate Firestore Room Subscription: Updates remoteDataRef and score/winner state WITHOUT restarting canvas animation
  useEffect(() => {
    if (!isOnline || !activeMatchRoom?.id) return;

    const unsub = subscribeMatchRoom(activeMatchRoom.id, (room) => {
      if (!room || !room.state) return;
      const st = room.state;

      remoteDataRef.current = {
        ball: st.ball,
        p1X: st.p1X,
        p2X: st.p2X,
        p1Score: st.p1Score,
        p2Score: st.p2Score,
        msg: st.msg,
      };

      const serverP1Score = st.p1Score ?? 0;
      const serverP2Score = st.p2Score ?? 0;

      setScore({
        you: isPlayer1 ? serverP1Score : serverP2Score,
        opp: isPlayer1 ? serverP2Score : serverP1Score,
      });

      if (st.msg) setBanner(st.msg);

      if (room.winnerUid && !rewarded.current) {
        rewarded.current = true;
        if (room.winnerUid === myUid) {
          setWinner('you');
          reward(
            { naira: 1000, pasanResistance: 6, barakah: 5, energy: -4 },
            `🏆 Won 1v1 Table Soccer match against ${opponentName} (${isPlayer1 ? serverP1Score : serverP2Score}-${isPlayer1 ? serverP2Score : serverP1Score})! Claimed ₦1,000 prize pot!`,
          );
          publishMinbarPostToCloud({
            authorName: player.name,
            authorStage: player.stage,
            text: `⚽🏆 Alhamdulillah! Just defeated ${opponentName} in a live 1v1 Table Soccer match (${isPlayer1 ? serverP1Score : serverP2Score} vs ${isPlayer1 ? serverP2Score : serverP1Score}) and won the ₦1,000 prize pot! 📿`,
            likes: 3,
            takbeers: 6,
            timestamp: Date.now(),
          });
        } else {
          setWinner('opp');
          reward({ pasanResistance: 2, energy: -3 }, `Played 1v1 Table Soccer against ${opponentName}. Great effort!`);
        }
      }
    });

    return () => unsub();
  }, [isOnline, activeMatchRoom?.id, isPlayer1, myUid, opponentName, player.name, player.stage, reward]);

  const startMatch = (kind: 'friendly' | 'cup' | 'twoplayer') => {
    sound.playWalaahTap();
    setScore({ you: 0, opp: 0 });
    setWinner(null);
    setBanner(kind === 'twoplayer' ? '2-PLAYER DUEL! First to 3 Goals!' : 'KICK OFF! First to 3 Goals!');
    setMode(kind);
  };

  // 2. Main game loop: Runs continuously at 60fps without being restarted by network messages
  useEffect(() => {
    if (mode === 'menu') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isCup = mode === 'cup';
    const baseSpeed = isCup ? 275 : 230;
    const aiSpeed = isCup ? 225 : 170;

    let p1X = W / 2;
    let p2X = W / 2;
    inputXRef.current = W / 2;
    p2InputXRef.current = W / 2;

    const ball = {
      x: W / 2,
      y: H / 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * 110,
      vy: (Math.random() > 0.5 ? 1 : -1) * baseSpeed,
    };

    let p1Score = 0;
    let p2Score = 0;
    let freezeUntil = performance.now() + 700;
    let raf = 0;
    let last = performance.now();

    const resetBall = (towardP1: boolean) => {
      ball.x = W / 2;
      ball.y = H / 2;
      const angle = (Math.random() - 0.5) * 0.7;
      const spd = baseSpeed;
      ball.vx = Math.sin(angle) * spd;
      ball.vy = (towardP1 ? 1 : -1) * Math.cos(angle) * spd;
      freezeUntil = performance.now() + 850;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (mode === 'twoplayer') {
        if (e.key === 'a' || e.key === 'A') keysRef.current.left = true;
        if (e.key === 'd' || e.key === 'D') keysRef.current.right = true;
        if (e.key === 'ArrowLeft') p2KeysRef.current.left = true;
        if (e.key === 'ArrowRight') p2KeysRef.current.right = true;
      } else {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (mode === 'twoplayer') {
        if (e.key === 'a' || e.key === 'A') keysRef.current.left = false;
        if (e.key === 'd' || e.key === 'D') keysRef.current.right = false;
        if (e.key === 'ArrowLeft') p2KeysRef.current.left = false;
        if (e.key === 'ArrowRight') p2KeysRef.current.right = false;
      } else {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const GOALIE_W = 68;
    const STRIKER_W = 52;
    const PADDLE_H = 11;

    const checkPaddleHit = (px: number, py: number, pw: number, isP1: boolean) => {
      const halfW = pw / 2;
      const halfH = PADDLE_H / 2;
      if (
        ball.x + BALL_R > px - halfW &&
        ball.x - BALL_R < px + halfW &&
        ball.y + BALL_R > py - halfH &&
        ball.y - BALL_R < py + halfH
      ) {
        const hitOffset = Math.max(-1, Math.min(1, (ball.x - px) / halfW));
        const curSpeed = Math.min(420, Math.hypot(ball.vx, ball.vy) * 1.04 + 6);
        const maxAngle = 1.05;
        const bounceAngle = hitOffset * maxAngle;
        ball.vx = Math.sin(bounceAngle) * curSpeed;
        ball.vy = (isP1 ? -1 : 1) * Math.cos(bounceAngle) * curSpeed;
        ball.y = isP1 ? py - halfH - BALL_R - 1 : py + halfH + BALL_R + 1;
        sound.playWalaahTap();
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.035, (now - last) / 1000);
      last = now;

      // Local keyboard direction
      const keyDir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
      if (keyDir !== 0) {
        inputXRef.current = Math.max(40, Math.min(W - 40, inputXRef.current + keyDir * 290 * dt));
      }

      const curRoom = activeMatchRoomRef.current;

      if (isOnline) {
        if (isPlayer1) {
          // Player 1 controls bottom paddle (p1X)
          p1X += (inputXRef.current - p1X) * Math.min(1, dt * 18);
          p1X = Math.max(40, Math.min(W - 40, p1X));

          // Read remote Player 2 paddle
          const remoteP2X = remoteDataRef.current.p2X;
          if (remoteP2X !== undefined) {
            p2X += (remoteP2X - p2X) * Math.min(1, dt * 14);
            p2X = Math.max(40, Math.min(W - 40, p2X));
          }
        } else {
          // Player 2 controls top paddle (p2X)
          p2X += (inputXRef.current - p2X) * Math.min(1, dt * 18);
          p2X = Math.max(40, Math.min(W - 40, p2X));

          // Read remote Player 1 paddle
          const remoteP1X = remoteDataRef.current.p1X;
          if (remoteP1X !== undefined) {
            p1X += (remoteP1X - p1X) * Math.min(1, dt * 14);
            p1X = Math.max(40, Math.min(W - 40, p1X));
          }

          // Player 2 broadcasts paddle position every 350ms
          if (now - lastSyncRef.current > 350 && curRoom) {
            lastSyncRef.current = now;
            syncMatchRoomMove(
              curRoom.id,
              {
                ...curRoom.state,
                p2X: Math.round(p2X),
              },
              'player1',
            );
          }
        }
      } else if (mode === 'twoplayer') {
        p1X += (inputXRef.current - p1X) * Math.min(1, dt * 18);
        p1X = Math.max(40, Math.min(W - 40, p1X));

        const p2KeyDir = (p2KeysRef.current.right ? 1 : 0) - (p2KeysRef.current.left ? 1 : 0);
        if (p2KeyDir !== 0) {
          p2InputXRef.current = Math.max(40, Math.min(W - 40, p2InputXRef.current + p2KeyDir * 290 * dt));
        }
        p2X += (p2InputXRef.current - p2X) * Math.min(1, dt * 18);
        p2X = Math.max(40, Math.min(W - 40, p2X));
      } else {
        // Solo against Captain Ridwan
        p1X += (inputXRef.current - p1X) * Math.min(1, dt * 18);
        p1X = Math.max(40, Math.min(W - 40, p1X));

        const aiTarget = ball.vy < 0 || ball.y < H * 0.62 ? ball.x : W / 2;
        const diff = aiTarget - p2X;
        const maxStep = aiSpeed * dt;
        if (Math.abs(diff) > maxStep) p2X += Math.sign(diff) * maxStep;
        else p2X = aiTarget;
        p2X = Math.max(40, Math.min(W - 40, p2X));
      }

      // Ball Physics Simulation
      const isSimulationHost = !isOnline || isPlayer1;

      if (isSimulationHost) {
        if (now >= freezeUntil) {
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;

          // Side wall bounce
          if (ball.x - BALL_R < 14) {
            ball.x = 14 + BALL_R;
            ball.vx = Math.abs(ball.vx);
            sound.playWalaahTap();
          } else if (ball.x + BALL_R > W - 14) {
            ball.x = W - 14 - BALL_R;
            ball.vx = -Math.abs(ball.vx);
            sound.playWalaahTap();
          }

          // Top wall / Goal (Player 1 scores on Player 2's net)
          if (ball.y - BALL_R < 14) {
            if (ball.x > GOAL_LEFT && ball.x < GOAL_RIGHT) {
              p1Score += 1;
              sound.playTakbeer();
              const goalBanner = `⚽ GOAL BY ${isOnline ? curRoom?.player1Name || 'YOU' : 'YOU'}!`;
              setBanner(goalBanner);
              resetBall(true);

              if (isOnline && curRoom) {
                const won = p1Score >= WIN_GOALS;
                syncMatchRoomMove(
                  curRoom.id,
                  {
                    ...curRoom.state,
                    ball: { x: Math.round(ball.x), y: Math.round(ball.y), vx: Math.round(ball.vx), vy: Math.round(ball.vy) },
                    p1X: Math.round(p1X),
                    p1Score,
                    p2Score,
                    msg: goalBanner,
                  },
                  'player1',
                  won ? curRoom.player1Uid : undefined,
                );
              } else {
                setScore({ you: p1Score, opp: p2Score });
                if (p1Score >= WIN_GOALS) {
                  setWinner('you');
                  const prize = isCup ? 1200 : mode === 'twoplayer' ? 1000 : 500;
                  reward({ naira: prize, pasanResistance: 4, barakah: 3 }, `Defeated Ridwan ${p1Score}-${p2Score}!`);
                  return;
                }
              }
            } else {
              ball.y = 14 + BALL_R;
              ball.vy = Math.abs(ball.vy);
              sound.playWalaahTap();
            }
          }

          // Bottom wall / Goal (Player 2 / AI scores on Player 1's net)
          if (ball.y + BALL_R > H - 14) {
            if (ball.x > GOAL_LEFT && ball.x < GOAL_RIGHT) {
              p2Score += 1;
              sound.playPasan();
              const goalBanner = `⚽ GOAL BY ${isOnline ? curRoom?.player2Name || 'OPPONENT' : 'RIDWAN'}!`;
              setBanner(goalBanner);
              resetBall(false);

              if (isOnline && curRoom) {
                const won = p2Score >= WIN_GOALS;
                syncMatchRoomMove(
                  curRoom.id,
                  {
                    ...curRoom.state,
                    ball: { x: Math.round(ball.x), y: Math.round(ball.y), vx: Math.round(ball.vx), vy: Math.round(ball.vy) },
                    p1X: Math.round(p1X),
                    p1Score,
                    p2Score,
                    msg: goalBanner,
                  },
                  'player1',
                  won ? curRoom.player2Uid : undefined,
                );
              } else {
                setScore({ you: p1Score, opp: p2Score });
                if (p2Score >= WIN_GOALS) {
                  setWinner('opp');
                  reward({ pasanResistance: 2 }, `Played match against Captain Ridwan (${p1Score}-${p2Score}).`);
                  return;
                }
              }
            } else {
              ball.y = H - 14 - BALL_R;
              ball.vy = -Math.abs(ball.vy);
              sound.playWalaahTap();
            }
          }

          // Paddle collisions
          checkPaddleHit(p1X, H - 34, GOALIE_W, true);
          if (ball.vy > 0) checkPaddleHit(p1X, H * 0.64, STRIKER_W, true);

          checkPaddleHit(p2X, 34, GOALIE_W, false);
          if (ball.vy < 0) checkPaddleHit(p2X, H * 0.36, STRIKER_W, false);

          // Player 1 broadcasts authoritative physics at ~2.5 Hz (380ms)
          if (isOnline && curRoom && now - lastSyncRef.current > 380) {
            lastSyncRef.current = now;
            syncMatchRoomMove(
              curRoom.id,
              {
                ...curRoom.state,
                ball: { x: Math.round(ball.x), y: Math.round(ball.y), vx: Math.round(ball.vx), vy: Math.round(ball.vy) },
                p1X: Math.round(p1X),
                p1Score,
                p2Score,
              },
              'player1',
            );
          }
        }
      } else {
        // Player 2 client: Extrapolates ball locally and lerps toward authoritative server ball
        const remoteBall = remoteDataRef.current.ball;
        if (remoteBall) {
          ball.x += (remoteBall.x - ball.x) * Math.min(1, dt * 7);
          ball.y += (remoteBall.y - ball.y) * Math.min(1, dt * 7);
          ball.vx = remoteBall.vx;
          ball.vy = remoteBall.vy;
        }
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
      }

      // RENDER PITCH & PADDLES
      ctx.fillStyle = '#14532d'; // Dark grass green
      ctx.fillRect(0, 0, W, H);

      // Pitch lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(14, 14, W - 28, H - 28);

      // Halfway line & center circle
      ctx.beginPath();
      ctx.moveTo(14, H / 2);
      ctx.lineTo(W - 14, H / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 44, 0, Math.PI * 2);
      ctx.stroke();

      // Top Goal area (Monkey Post)
      ctx.strokeRect(GOAL_LEFT, 14, GOAL_W, 44);
      // Bottom Goal area
      ctx.strokeRect(GOAL_LEFT, H - 58, GOAL_W, 44);

      // Rod rails (metal slide lines)
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = 3;
      [34, H * 0.36, H * 0.64, H - 34].forEach((ry) => {
        ctx.beginPath();
        ctx.moveTo(14, ry);
        ctx.lineTo(W - 14, ry);
        ctx.stroke();
      });

      // Draw Paddles
      // Player 2 / Opponent (Top Red)
      ctx.fillStyle = '#e11d48'; // Rose Red
      ctx.fillRect(p2X - GOALIE_W / 2, 34 - PADDLE_H / 2, GOALIE_W, PADDLE_H);
      ctx.fillRect(p2X - STRIKER_W / 2, H * 0.36 - PADDLE_H / 2, STRIKER_W, PADDLE_H);

      // Player 1 / You (Bottom Blue)
      ctx.fillStyle = '#0284c7'; // Sky Blue
      ctx.fillRect(p1X - GOALIE_W / 2, H - 34 - PADDLE_H / 2, GOALIE_W, PADDLE_H);
      ctx.fillRect(p1X - STRIKER_W / 2, H * 0.64 - PADDLE_H / 2, STRIKER_W, PADDLE_H);

      // Draw Ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [mode, isOnline, isPlayer1]);

  const handlePointer = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W;
      inputXRef.current = Math.max(40, Math.min(W - 40, x));
    },
    [],
  );

  if (mode === 'menu') {
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
              ⚽ Kewu F.C. — Ping-Pong Table Soccer
            </h3>
            <p className="text-xs text-stone-500">
              Slide your Goalie &amp; Striker rods to bounce the ball past your opponent into the Monkey Post!
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-mono text-xs font-extrabold">
            Wallet: ₦{player.stats.naira.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => startMatch('friendly')}
            className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/80 text-left cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-stone-900">🥅 Break-Time Friendly</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-extrabold">
                Win ₦500
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-1.5">
              First to 3 goals against Captain Ridwan. Win <b>₦500</b>, <b>+4 Agility</b> &amp; <b>+3 Barakah</b>!
            </p>
          </button>

          <button
            onClick={() => startMatch('cup')}
            className="p-4 rounded-2xl border-2 border-amber-500 bg-amber-50/70 hover:bg-amber-100/80 text-left cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-600" /> Alhaji&apos;s Madrasah Cup
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-extrabold">
                Win ₦1,200
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-1.5">
              Fast championship tournament! Win <b>₦1,200 Trophy</b>, <b>+6 Agility</b> &amp; <b>+5 Barakah</b>!
            </p>
          </button>

          <button
            onClick={() => startMatch('twoplayer')}
            className="p-4 rounded-2xl border-2 border-indigo-400 bg-indigo-50/60 hover:bg-indigo-100/70 text-left cursor-pointer transition sm:col-span-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-700" /> Same-Device Shared Keyboard Duel
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-950 font-extrabold">
                Local Match
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Playing on one computer together: P1 uses <b>A &amp; D</b>, P2 uses <b>Arrow Keys</b>. (To challenge a friend on another device, use the <b>Organize Game</b> button in the Online Lobby!).
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col items-center gap-3">
      {/* Scoreboard */}
      <div className="w-full max-w-[360px] flex items-center justify-between bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-md">
        <span className="text-sky-300">
          {mode === 'online'
            ? isPlayer1
              ? `YOU (${player.name}): ${score.you}`
              : `${opponentName.toUpperCase()}: ${score.opp}`
            : mode === 'twoplayer'
            ? `P1 (Blue): ${score.you}`
            : `YOU (Blue): ${score.you}`}
        </span>
        <span className="text-amber-300 font-mono text-[11px]">FIRST TO {WIN_GOALS}</span>
        <span className="text-rose-400">
          {mode === 'online'
            ? isPlayer1
              ? `${opponentName.toUpperCase()}: ${score.opp}`
              : `YOU (${player.name}): ${score.you}`
            : mode === 'twoplayer'
            ? `P2 (Red): ${score.opp}`
            : `RIDWAN: ${score.opp}`}
        </span>
      </div>

      {banner && !winner && (
        <div className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-xs">
          {mode === 'online' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          <span>{banner}</span>
        </div>
      )}

      {/* Table Soccer Pitch Canvas */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl border-4 border-stone-800">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ width: 'min(84vw, 340px, calc(50dvh * 0.7826))', height: 'auto', aspectRatio: '360 / 460', touchAction: 'none' }}
          className="block cursor-ew-resize"
          onPointerDown={handlePointer}
          onPointerMove={handlePointer}
        />

        {winner && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-5 text-center text-white gap-3 animate-in zoom-in-95">
            <div className="text-4xl">{winner === 'you' ? '🏆⚽' : '🥈⚽'}</div>
            <h4 className="font-extrabold text-lg text-amber-300">
              {winner === 'you'
                ? `Masha'Allah! You Won ${score.you}–${score.opp}!`
                : `${opponentName} Won ${score.opp}–${score.you}!`}
            </h4>
            <p className="text-xs text-stone-200">
              {winner === 'you'
                ? `You claimed ₦${mode === 'online' ? '1,000 Pot' : mode === 'cup' ? '1,200' : '500'} and sharpened your agility!`
                : 'Great match! Keep practicing your reflexes and monkey post defense.'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => {
                  if (mode === 'online') setActiveMatchRoom(null);
                  setWinner(null);
                  setMode(mode === 'online' ? 'menu' : mode);
                }}
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Play Again
              </button>
              <button
                onClick={() => {
                  if (mode === 'online') setActiveMatchRoom(null);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" /> Back to Compound
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] text-stone-500 font-semibold text-center">
        {mode === 'online' ? (
          <span>
            {isPlayer1 ? '🟦 You are Blue (Bottom Rod)' : '🟥 You are Red (Top Rod)'}. Slide finger or use <b>← →</b> / <b>A D</b> keys.
          </span>
        ) : (
          <span>Drag finger / mouse or use <b>← →</b> Arrow keys to slide your Goalie &amp; Striker.</span>
        )}
      </div>
    </div>
  );
};
