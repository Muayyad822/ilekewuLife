'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { sound } from '@/lib/audio';
import { Trophy, Play, RotateCcw } from 'lucide-react';

const W = 360;
const H = 460;
const GOAL_W = 136;
const GOAL_LEFT = (W - GOAL_W) / 2;
const GOAL_RIGHT = (W + GOAL_W) / 2;
const BALL_R = 9;
const WIN_GOALS = 3;

export const FootballMinigame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { player, reward } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<'menu' | 'friendly' | 'cup'>('menu');
  const [score, setScore] = useState<{ you: number; ai: number }>({ you: 0, ai: 0 });
  const [banner, setBanner] = useState<string | null>(null);
  const [winner, setWinner] = useState<'you' | 'ai' | null>(null);

  const inputXRef = useRef<number>(W / 2);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  const startMatch = (kind: 'friendly' | 'cup') => {
    sound.playWalaahTap();
    setScore({ you: 0, ai: 0 });
    setWinner(null);
    setBanner('KICK OFF! First to 3 Goals!');
    setMode(kind);
  };

  useEffect(() => {
    if (mode === 'menu' || winner) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isCup = mode === 'cup';
    const baseSpeed = isCup ? 275 : 230;
    const aiSpeed = isCup ? 225 : 170;

    let youX = W / 2;
    let aiX = W / 2;
    inputXRef.current = W / 2;

    const ball = {
      x: W / 2,
      y: H / 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * 110,
      vy: (Math.random() > 0.5 ? 1 : -1) * baseSpeed,
    };

    let youScore = 0;
    let aiScore = 0;
    let freezeUntil = performance.now() + 700;
    let raf = 0;
    let last = performance.now();

    const resetBall = (towardYou: boolean) => {
      ball.x = W / 2;
      ball.y = H / 2;
      const angle = (Math.random() - 0.5) * 0.7;
      const spd = baseSpeed;
      ball.vx = Math.sin(angle) * spd;
      ball.vy = (towardYou ? 1 : -1) * Math.cos(angle) * spd;
      freezeUntil = performance.now() + 850;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Paddles: each side has a Goalie paddle and a Midfield Striker paddle
    const GOALIE_W = 68;
    const STRIKER_W = 52;
    const PADDLE_H = 11;

    const checkPaddleHit = (px: number, py: number, pw: number, isPlayer: boolean) => {
      const halfW = pw / 2;
      const halfH = PADDLE_H / 2;
      if (
        ball.x + BALL_R > px - halfW &&
        ball.x - BALL_R < px + halfW &&
        ball.y + BALL_R > py - halfH &&
        ball.y - BALL_R < py + halfH
      ) {
        // Only bounce if moving toward the paddle's defending side (or slow)
        const hitOffset = Math.max(-1, Math.min(1, (ball.x - px) / halfW));
        const curSpeed = Math.min(420, Math.hypot(ball.vx, ball.vy) * 1.04 + 6);
        const maxAngle = 1.05; // ~60 deg
        const bounceAngle = hitOffset * maxAngle;
        ball.vx = Math.sin(bounceAngle) * curSpeed;
        ball.vy = (isPlayer ? -1 : 1) * Math.cos(bounceAngle) * curSpeed;
        ball.y = isPlayer ? py - halfH - BALL_R - 1 : py + halfH + BALL_R + 1;
        sound.playWalaahTap();
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.035, (now - last) / 1000);
      last = now;

      // Keyboard movement updates target X
      const keyDir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
      if (keyDir !== 0) {
        inputXRef.current = Math.max(40, Math.min(W - 40, inputXRef.current + keyDir * 290 * dt));
      }
      youX += (inputXRef.current - youX) * Math.min(1, dt * 18);
      youX = Math.max(40, Math.min(W - 40, youX));

      // AI tracks ball when heading north or in top half
      const aiTarget = ball.vy < 0 || ball.y < H * 0.62 ? ball.x : W / 2;
      const diff = aiTarget - aiX;
      const maxStep = aiSpeed * dt;
      if (Math.abs(diff) > maxStep) aiX += Math.sign(diff) * maxStep;
      else aiX = aiTarget;
      aiX = Math.max(40, Math.min(W - 40, aiX));

      if (now >= freezeUntil) {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Left / right side-board ping-pong bounce
        if (ball.x - BALL_R < 14) {
          ball.x = 14 + BALL_R;
          ball.vx = Math.abs(ball.vx);
          sound.playWalaahTap();
        } else if (ball.x + BALL_R > W - 14) {
          ball.x = W - 14 - BALL_R;
          ball.vx = -Math.abs(ball.vx);
          sound.playWalaahTap();
        }

        // Top wall / AI Goal check
        if (ball.y - BALL_R < 14) {
          if (ball.x > GOAL_LEFT && ball.x < GOAL_RIGHT) {
            // YOU SCORED!
            youScore += 1;
            setScore({ you: youScore, ai: aiScore });
            sound.playTakbeer();
            if (youScore >= WIN_GOALS) {
              setWinner('you');
              const prize = isCup ? 1200 : 500;
              const def = isCup ? 6 : 4;
              const bar = isCup ? 5 : 3;
              reward(
                { naira: prize, pasanResistance: def, barakah: bar, energy: -6 },
                `Defeated Captain Ridwan ${youScore}-${aiScore} in Ping-Pong Football! Won ₦${prize.toLocaleString()} & +${def} Agility!`,
              );
              return;
            }
            setBanner('⚽ GOOOAL! ALLAHU AKBAR!');
            resetBall(true);
          } else {
            ball.y = 14 + BALL_R;
            ball.vy = Math.abs(ball.vy);
            sound.playWalaahTap();
          }
        }

        // Bottom wall / Your Goal check
        if (ball.y + BALL_R > H - 14) {
          if (ball.x > GOAL_LEFT && ball.x < GOAL_RIGHT) {
            // AI SCORED!
            aiScore += 1;
            setScore({ you: youScore, ai: aiScore });
            sound.playPasan();
            if (aiScore >= WIN_GOALS) {
              setWinner('ai');
              reward(
                { pasanResistance: 2, energy: -5 },
                `Played a tough 1-on-1 football match against Captain Ridwan (${youScore}-${aiScore}) (+2 Agility).`,
              );
              return;
            }
            setBanner('Ridwan Scored! Defend your Monkey Post!');
            resetBall(false);
          } else {
            ball.y = H - 14 - BALL_R;
            ball.vy = -Math.abs(ball.vy);
            sound.playWalaahTap();
          }
        }

        // Paddle collisions
        // Your Goalie (y = H - 34) & Your Striker (y = H * 0.64)
        checkPaddleHit(youX, H - 34, GOALIE_W, true);
        if (ball.vy > 0) checkPaddleHit(youX, H * 0.64, STRIKER_W, true);

        // AI Goalie (y = 34) & AI Striker (y = H * 0.36)
        checkPaddleHit(aiX, 34, GOALIE_W, false);
        if (ball.vy < 0) checkPaddleHit(aiX, H * 0.36, STRIKER_W, false);
      }

      // ================== DRAW TABLE SOCCER PITCH ==================
      ctx.clearRect(0, 0, W, H);

      // Alternating turf stripes
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#16a34a';
        ctx.fillRect(0, i * (H / 10), W, H / 10);
      }

      // Side-board rails
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 12, H);
      ctx.fillRect(W - 12, 0, 12, H);

      // Pitch white lines
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(14, 14, W - 28, H - 28);

      // Halfway line & center circle
      ctx.beginPath();
      ctx.moveTo(14, H / 2);
      ctx.lineTo(W - 14, H / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 46, 0, Math.PI * 2);
      ctx.stroke();

      // Penalty boxes
      ctx.strokeRect((W - 180) / 2, 14, 180, 62);
      ctx.strokeRect((W - 180) / 2, H - 76, 180, 62);

      // Goal mouths (Top & Bottom)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(GOAL_LEFT, 0, GOAL_W, 14);
      ctx.fillRect(GOAL_LEFT, H - 14, GOAL_W, 14);
      // Goalposts
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(GOAL_LEFT - 4, 4, 6, 14);
      ctx.fillRect(GOAL_RIGHT - 2, 4, 6, 14);
      ctx.fillRect(GOAL_LEFT - 4, H - 18, 6, 14);
      ctx.fillRect(GOAL_RIGHT - 2, H - 18, 6, 14);

      // Foosball guide rods (subtle horizontal bars)
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      for (const ry of [34, H * 0.36, H * 0.64, H - 34]) {
        ctx.beginPath();
        ctx.moveTo(14, ry);
        ctx.lineTo(W - 14, ry);
        ctx.stroke();
      }

      // Draw Paddles
      const drawPaddle = (x: number, y: number, w: number, fill: string, trim: string) => {
        ctx.fillStyle = fill;
        ctx.strokeStyle = trim;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - PADDLE_H / 2, w, PADDLE_H, 6);
        ctx.fill();
        ctx.stroke();
      };

      // AI Paddles (Gold / Red)
      drawPaddle(aiX, 34, GOALIE_W, '#dc2626', '#fef08a');
      drawPaddle(aiX, H * 0.36, STRIKER_W, '#ef4444', '#ffffff');

      // Player Paddles (Sky Blue / Gold)
      drawPaddle(youX, H - 34, GOALIE_W, '#0284c7', '#fde047');
      drawPaddle(youX, H * 0.64, STRIKER_W, '#38bdf8', '#ffffff');

      // Draw Soccer Ball
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#111827';
      ctx.stroke();
      // Pentagon center dot
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
      ctx.restore();
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [mode, winner, reward]);

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    inputXRef.current = Math.max(40, Math.min(W - 40, relX));
  };

  if (mode === 'menu') {
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
              ⚽ Kewu F.C. — Ping-Pong Table Soccer
            </h3>
            <p className="text-xs text-stone-500">
              Slide your Goalie &amp; Striker rods to bounce the ball past Captain Ridwan into the Monkey Post!
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
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950">
                Win ₦500
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-1.5">
              First to 3 goals against Ridwan. Win <b>₦500</b> gift, <b>+4 Pasan Defense</b> &amp; <b>+3 Barakah</b>!
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
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                Win ₦1,200
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-1.5">
              Fast-paced championship match! Free entry — win <b>₦1,200 Trophy Gift</b>, <b>+6 Pasan Defense</b> &amp; <b>+5 Barakah</b>!
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col items-center gap-3">
      {/* Scoreboard */}
      <div className="w-full max-w-[360px] flex items-center justify-between bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-extrabold">
        <span className="text-sky-300">YOU (Blue): {score.you}</span>
        <span className="text-amber-300 font-mono">FIRST TO {WIN_GOALS}</span>
        <span className="text-rose-400">RIDWAN (Red): {score.ai}</span>
      </div>

      {banner && !winner && (
        <div className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
          {banner}
        </div>
      )}

      {/* Table Soccer Pitch Canvas */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-stone-800">
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
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-5 text-center text-white gap-3">
            <div className="text-3xl">{winner === 'you' ? '🏆⚽' : '😅⚽'}</div>
            <h4 className="font-extrabold text-lg text-amber-300">
              {winner === 'you'
                ? `Masha'Allah! You Won ${score.you}–${score.ai}!`
                : `Ridwan Won ${score.ai}–${score.you}!`}
            </h4>
            <p className="text-xs text-stone-200">
              {winner === 'you'
                ? `You claimed ₦${mode === 'cup' ? '1,200' : '500'} and sharpened your reflexes!`
                : 'Good workout! Your agility still improved (+2 Pasan Defense).'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => startMatch(mode)}
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Play Again
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" /> Back to Compound
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] text-stone-500 font-semibold text-center">
        Drag your finger / mouse across the pitch or use <b>← →</b> Arrow keys to control your Goalie &amp; Striker.
      </div>
    </div>
  );
};

