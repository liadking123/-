import React, { useState, useEffect, useRef } from 'react';
import { Target, Sparkles, AlertTriangle } from 'lucide-react';

interface CoordinationTaskProps {
  onSuccess: () => void;
}

export default function CoordinationTask({ onSuccess }: CoordinationTaskProps) {
  const [cupsStacked, setCupsStacked] = useState(0);
  const totalCupsNeeded = 8; // Toughened: 8 cups instead of 5
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'failed' | 'success'>('idle');
  
  // Use refs for moving values to achieve ultra-smooth 60fps movement with no React rendering tearing
  const speed = useRef(2.4); // Toughened: Faster initial speed (2.4 instead of 1.8)
  const direction = useRef<'left' | 'right'>('right');
  const animationFrameId = useRef<number | null>(null);

  // Smooth animation loop using requestAnimationFrame for zero-lag and no interval lag
  useEffect(() => {
    if (gameState === 'playing') {
      const updateSlider = () => {
        setSliderPos((prev) => {
          let next = prev;
          if (direction.current === 'right') {
            next = prev + speed.current;
            if (next >= 100) {
              next = 100;
              direction.current = 'left';
            }
          } else {
            next = prev - speed.current;
            if (next <= 0) {
              next = 0;
              direction.current = 'right';
            }
          }
          return next;
        });
        animationFrameId.current = requestAnimationFrame(updateSlider);
      };

      animationFrameId.current = requestAnimationFrame(updateSlider);
      return () => {
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
      };
    }
  }, [gameState]);

  const handleTap = () => {
    if (gameState !== 'playing') {
      setGameState('playing');
      setCupsStacked(0);
      speed.current = 2.4; // Challenging initial speed
      direction.current = 'right';
      return;
    }

    // Toughened: Target area is now incredibly narrow (44 to 56) giving only 12% width tolerance!
    const isGood = sliderPos >= 44 && sliderPos <= 56;

    if (isGood) {
      const nextCups = cupsStacked + 1;
      setCupsStacked(nextCups);
      
      // Toughened: Speed up by 0.45 per level instead of 0.3 for a real adrenaline rush
      speed.current += 0.45;

      if (nextCups >= totalCupsNeeded) {
        setGameState('success');
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
        setTimeout(() => {
          onSuccess();
        }, 1200);
      }
    } else {
      // Failed - reset state
      setGameState('failed');
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur border border-red-500/40 rounded-2xl p-5 md:p-6 shadow-2xl text-right">
      <h3 className="text-xl font-bold mb-3 flex items-center justify-start gap-2 text-yellow-400">
        <Target className="w-5 h-5 text-yellow-400" />
        <span>משימת קואורדינציה קשה במיוחד • מגדל כוסות</span>
      </h3>
      
      <p className="text-xs md:text-sm text-slate-300 mb-5 leading-relaxed text-right md:text-center">
        צוות אבות הבית הגביר את רמת הקושי! כעת עליכם לצבור רצף מטורף של <strong className="text-red-400 font-bold">{totalCupsNeeded} כוסות</strong>!
        <br />
        <span className="text-orange-400 font-bold flex items-center justify-center gap-1 mt-1 text-[11px] md:text-xs">
          <AlertTriangle className="w-4 h-4 text-orange-400 inline" />
          שברון הטווח: רק פגיעה מדויקת מאוד ברצועת האור הירוקה הדקה תצליח להניח את הכוס!
        </span>
      </p>

      {/* Visual Cup Tower Stack */}
      <div className="flex flex-col-reverse items-center gap-1 h-44 justify-end bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-6 relative overflow-hidden">
        {Array.from({ length: totalCupsNeeded }).map((_, idx) => {
          const isStacked = idx < cupsStacked;
          return (
            <div
              key={idx}
              className={`h-4.5 rounded flex items-center justify-center font-bold text-[10px] transition-all duration-300 ${
                isStacked 
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white w-32 scale-100 opacity-100 shadow' 
                  : 'bg-slate-800/20 text-slate-700 border border-slate-800 w-20 opacity-30'
              }`}
            >
              [ כוס {idx + 1} של המגדל ]
            </div>
          );
        })}
      </div>

      {/* Slider Bar */}
      <div className="relative w-full h-8 bg-slate-950 rounded-full border border-slate-700 overflow-hidden mb-6 flex items-center justify-center">
        {/* Toughened narrow Target zone (12% width spanning from 44% to 56%) */}
        <div className="absolute w-[12%] h-full bg-emerald-500/35 border-x border-emerald-400 animate-pulse" />
        {/* Perfect center indicator line */}
        <div className="absolute w-[3px] h-full bg-yellow-400/80" />

        {/* Current Moving Pin */}
        <div
          className="absolute w-5 h-5 bg-yellow-400 rounded-full shadow-lg border-2 border-white pointer-events-none"
          style={{ 
            left: `${sliderPos}%`, 
            transform: 'translateX(-50%)',
            boxShadow: '0 0 12px rgba(250, 204, 21, 0.9)'
          }}
        />
      </div>

      {gameState === 'success' ? (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-emerald-300 font-bold animate-pulse flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
          <span>המגדל הענק שלכם יציב לחלוטין! עברתם את המשימה הקשה בגבורה! 🎉</span>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleTap}
            className={`w-full py-4 rounded-xl font-black text-sm md:text-base transition-all duration-150 transform active:scale-95 shadow-lg ${
              gameState === 'playing'
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-yellow-500 hover:bg-yellow-600 text-slate-950 glow-btn'
            }`}
          >
            {gameState === 'idle' && 'התחילו את המרוץ המהיר! 🚀'}
            {gameState === 'playing' && 'לחצו להנחת כוס עכשיו! 🔴'}
            {gameState === 'failed' && 'המגדל קרס! לחצו לניסיון חדש 🔄'}
          </button>
          
          <div className="text-center text-xs text-slate-350 font-semibold">
            {gameState === 'playing' && `כוסות שנערמו בהצלחה: ${cupsStacked} מתוך ${totalCupsNeeded}`}
            {gameState === 'idle' && 'מומלץ לעבוד בתיאום עין-יד מדויק וריכוז שיא!'}
            {gameState === 'failed' && 'זה חמקמק! נסו לתזמן מוקדם או מאוחר קלות!'}
          </div>
        </div>
      )}
    </div>
  );
}
