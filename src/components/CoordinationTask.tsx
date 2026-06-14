import React, { useState, useEffect, useRef } from 'react';
import { Target, Sparkles, AlertTriangle } from 'lucide-react';

interface CoordinationTaskProps {
  onSuccess: () => void;
}

export default function CoordinationTask({ onSuccess }: CoordinationTaskProps) {
  const [cupsStacked, setCupsStacked] = useState(0);
  const totalCupsNeeded = 5; // Balanced challenging length
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'failed' | 'success'>('idle');
  
  // Use refs for moving values to achieve ultra-smooth 60fps movement with no React rendering tearing
  const speed = useRef(1.4); // Balanced, engaging initial speed
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
      speed.current = 1.4; // Balanced initial speed for nice challenge
      direction.current = 'right';
      return;
    }

    // Engaging, moderately challenging target area: 38% to 62% (giving a 24% hit zone!)
    const isGood = sliderPos >= 38 && sliderPos <= 62;

    if (isGood) {
      const nextCups = cupsStacked + 1;
      setCupsStacked(nextCups);
      
      // Noticeable speed increase per cup stacked to test coordination
      speed.current += 0.22;

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
        <span>משימת קואורדינציה חווייתית • מגדל כוסות</span>
      </h3>
      
      <p className="text-xs md:text-sm text-slate-300 mb-5 leading-relaxed text-right md:text-center">
        עליכם לערום מגדל יציב של <strong className="text-emerald-400 font-bold">{totalCupsNeeded} כוסות</strong>!
        <br />
        <span className="text-emerald-400 font-bold flex items-center justify-center gap-1 mt-1 text-[11px] md:text-xs">
          <AlertTriangle className="w-4 h-4 text-emerald-405 inline" />
          לחצו בדיוק בתוך רצועת האור הירוקה כדי להניח את הכוס!
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
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 w-32 scale-100 opacity-100 shadow font-black' 
                  : 'bg-slate-850 text-slate-705 border border-slate-800 w-20 opacity-30'
              }`}
            >
              [ כוס {idx + 1} של המגדל ]
            </div>
          );
        })}
      </div>

      {/* Slider Bar */}
      <div className="relative w-full h-8 bg-slate-950 rounded-full border border-slate-700 overflow-hidden mb-6 flex items-center justify-center">
        {/* Challenging target zone (24% width spanning from 38% to 62%) */}
        <div className="absolute w-[24%] h-full bg-emerald-500/25 border-x border-emerald-400 animate-pulse" />
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
          
          <div className="text-center text-xs text-slate-350 font-semibold font-sans">
            {gameState === 'playing' && `כוסות שנערמו בהצלחה: ${cupsStacked} מתוך ${totalCupsNeeded}`}
            {gameState === 'idle' && 'מומלץ לעבוד בתיאום עין-יד מדויק וריכוז שיא!'}
            {gameState === 'failed' && 'קרה משהו? תוכלו לדלג באישור המנחה בשטח או לנסות שנית.'}
          </div>

          <button
            type="button"
            onClick={() => onSuccess()}
            className="w-full mt-2 py-2 hover:bg-slate-700/50 border border-dashed border-slate-700 text-[10px] text-slate-500 rounded-lg hover:text-slate-400 transition font-bold"
          >
            קשיים קואורדינטיביים? דלגו לתחנה הבאה (אישור מנחה קבוצה) 🛠️
          </button>
        </div>
      )}
    </div>
  );
}
