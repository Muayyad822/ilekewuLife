'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { TRACE_LETTERS } from '@/data/lessons';
import { Droplets, Eraser, CheckCircle2, Sparkles } from 'lucide-react';

const VERSES = [
  { text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful' },
  { text: 'قُلْ هُوَ اللَّهُ أَحَدٌ', translation: 'Say: He is Allah, [who is] One' },
  { text: 'اللَّهُ الصَّمَدُ', translation: 'Allah, the Eternal Refuge' },
  { text: 'رَبِّ زِدْنِي عِلْمًا', translation: 'My Lord, increase me in knowledge' },
];

const W = 360;
const H = 220;

export const WalaahMinigame: React.FC = () => {
  const { washWalaahSuccess, markSlateTraced, slateTraced } = useGameStore();
  const [letterIdx, setLetterIdx] = useState(0);
  const [verseIndex, setVerseIndex] = useState(0);
  const [coverage, setCoverage] = useState(0);
  const [isWashed, setIsWashed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideMaskRef = useRef<Uint8Array | null>(null);
  const drawingRef = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);

  const letter = TRACE_LETTERS[letterIdx % TRACE_LETTERS.length];
  const currentVerse = VERSES[verseIndex];

  const renderGuide = (ch: string) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    // Build offscreen mask for coverage scoring
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const octx = off.getContext('2d')!;
    octx.fillStyle = '#000';
    octx.font = '900 150px serif';
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillText(ch, W / 2, H / 2 + 8);
    const data = octx.getImageData(0, 0, W, H).data;
    const mask = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (data[i * 4 + 3] > 80) mask[i] = 1;
    }
    guideMaskRef.current = mask;

    // Draw faint guide on visible canvas
    ctx.save();
    ctx.fillStyle = 'rgba(255, 240, 200, 0.22)';
    ctx.font = '900 150px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, W / 2, H / 2 + 8);
    ctx.restore();
    setCoverage(0);
  };

  useEffect(() => {
    renderGuide(letter);
  }, [letter]);

  const computeCoverage = () => {
    const c = canvasRef.current;
    const mask = guideMaskRef.current;
    if (!c || !mask) return;
    const ctx = c.getContext('2d')!;
    const img = ctx.getImageData(0, 0, W, H).data;
    let total = 0;
    let hit = 0;
    for (let i = 0; i < W * H; i += 2) {
      if (mask[i]) {
        total++;
        // Check dark Tadaa ink stroke
        if (img[i * 4] < 60 && img[i * 4 + 3] > 160) hit++;
      }
    }
    const pct = total > 0 ? Math.min(100, Math.round((hit / total) * 145)) : 0;
    setCoverage(pct);
    if (pct >= 45 && !slateTraced) {
      markSlateTraced();
    }
  };

  const posFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPt.current = posFromEvent(e);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || ! canvasRef.current) return;
    const pt = posFromEvent(e);
    const ctx = canvasRef.current.getContext('2d')!;
    const prev = lastPt.current ?? pt;
    ctx.strokeStyle = '#120d08';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPt.current = pt;
  };

  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPt.current = null;
    computeCoverage();
  };

  const handleWash = () => {
    setIsWashed(true);
    washWalaahSuccess();
    setTimeout(() => {
      setLetterIdx((p) => p + 1);
      setVerseIndex((p) => (p + 1) % VERSES.length);
      setIsWashed(false);
    }, 900);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 mt-4">
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3 mb-4">
          <div>
            <h3 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
              <span>🪵</span> Interactive Walaah & Tadaa Calligraphy
            </h3>
            <p className="text-xs text-stone-500">
              Trace the Arabic letter with Tadaa soot ink (45%+ accuracy), then wash at the well or right here!
            </p>
          </div>
          <span className="text-xs bg-amber-100 text-amber-900 px-3 py-1 rounded-full font-bold border border-amber-300">
            Trace: +4 Ilm · Wash at Well: +8 Ilm & ₦150
          </span>
        </div>

        {/* Wooden Board */}
        <div className="relative mx-auto w-full max-w-md bg-linear-to-b from-amber-700 via-amber-800 to-amber-900 rounded-2xl p-5 border-8 border-amber-950 shadow-xl flex flex-col items-center">
          <div className="w-5 h-5 rounded-full bg-stone-900/60 border-2 border-amber-950 mb-2" />

          <div className="text-center mb-2">
            <div className="text-lg font-serif font-bold text-amber-100" dir="rtl">
              {currentVerse.text}
            </div>
            <div className="text-[11px] text-amber-200/80">&quot;{currentVerse.translation}&quot;</div>
          </div>

          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ touchAction: 'none' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className={`w-full max-w-[360px] aspect-[360/220] rounded-xl bg-amber-950/35 border-2 border-amber-950/60 cursor-crosshair transition-opacity duration-500 ${
              isWashed ? 'opacity-10' : 'opacity-100'
            }`}
          />

          <div className="mt-3 w-full flex items-center justify-between text-xs text-amber-200 font-semibold">
            <span>Ink Coverage: {coverage}%</span>
            {slateTraced ? (
              <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Slate Inked! Ready to wash
              </span>
            ) : (
              <span>Trace the faint Arabic letter above</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => renderGuide(letter)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold cursor-pointer"
          >
            <Eraser className="w-4 h-4" /> Clear Ink
          </button>
          <button
            onClick={() => setLetterIdx((p) => p + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-600" /> Next Letter ({TRACE_LETTERS[(letterIdx + 1) % TRACE_LETTERS.length]})
          </button>
          <button
            onClick={handleWash}
            disabled={isWashed}
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm text-xs cursor-pointer"
          >
            <Droplets className="w-4 h-4" />
            {isWashed ? 'Washing...' : 'Wash Slate (Omi Tutu)'}
          </button>
        </div>
      </div>
    </div>
  );
};
