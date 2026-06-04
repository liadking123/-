import React, { useState, useEffect, useRef } from 'react';
import { Target, Sparkles } from 'lucide-react';

interface CoordinationTaskProps {
  onSuccess: () => void;
}

export default function CoordinationTask({ onSuccess }: CoordinationTaskProps) {
  const [cupsStacked, setCupsStacked] = useState(0);
  const totalCupsNeeded = 5;
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'failed' | 'success'>('idle');
  
  // Use refs for moving values to achieve ultra-smooth 60fps movement with no React rendering tearing
  const speed = useRef(1.8); // Moderate starter speed for high accessibility
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
      speed.current = 1.8; // Friendly initial speed
      direction.current = 'right';
      return;
    }

    // Checking if slider is in the wider, easier target area (36 to 64) with high responsiveness
    // This allows 28% width of tolerance, making it fun and achievable
    const isGood = sliderPos >= 36 && sliderPos <= 64;

    if (isGood) {
      const nextCups = cupsStacked + 1;
      setCupsStacked(nextCups);
      
      // Speed up only marginally (~0.3 per level instead of 0.8) so it stays fair
      speed.current += 0.3;

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
    <div className="bg-slate-800/80 backdrop-blur border border-red-500/30 rounded-2xl p-5 md:p-6 shadow-2xl">
      <h3 className="text-xl font-bold mb-3 flex items-center justify-start gap-2 text-yellow-400">
        <Target className="w-5 h-5 text-yellow-400" />
        <span>משימת קואורדינציית כוסות דיגיטלית</span>
      </h3>
      
      <p className="text-xs md:text-sm text-slate-300 mb-5 leading-relaxed text-right md:text-center">
        צוות אבות הבית מאתגר אתכם לבנות מגדל של {totalCupsNeeded} כוסות חד-פעמיות!
        <br />
        <strong className="text-yellow-300">לחצו על כפתור ה-&quot;להניח כוס&quot; כשהבועה הנעה נמצאת בתוך האזור הירוק שבמרכז!</strong>
      </p>

      {/* Visual Cup Tower Stack */}
      <div className="flex flex-col-reverse items-center gap-1.5 h-36 justify-end bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 mb-6 relative overflow-hidden">
        {Array.from({ length: totalCupsNeeded }).map((_, idx) => {
          const isStacked = idx < cupsStacked;
          return (
            <div
              key={idx}
              className={`h-6 rounded-md flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                isStacked 
                  ? 'bg-red-500 text-white w-32 scale-100 opacity-100 shadow' 
                  : 'bg-slate-800/30 text-slate-600 border border-slate-700/50 w-20 opacity-40'
              }`}
            >
              [ כוס {idx + 1} של המגדל ]
            </div>
          );
        })}
      </div>

      {/* Slider Bar */}
      <div className="relative w-full h-8 bg-slate-950 rounded-full border border-slate-700 overflow-hidden mb-6 flex items-center justify-center">
        {/* Wider Safe target zone (28% width spanning from 36% to 64%) */}
        <div className="absolute w-[28%] h-full bg-emerald-500/25 border-x border-emerald-500" />
        {/* Perfect center indicator line */}
        <div className="absolute w-[3px] h-full bg-yellow-400/80" />

        {/* Current Moving Pin - TRANSITION CLASSES REMOVED SO THERE IS ZERO INPUT LAG AND DELAY */}
        <div
          className="absolute w-5 h-5 bg-yellow-400 rounded-full shadow-lg border-2 border-white pointer-events-none"
          style={{ 
            left: `${sliderPos}%`, 
            transform: 'translateX(-50%)',
            boxShadow: '0 0 10px rgba(250, 204, 21, 0.8)'
          }}
        />
      </div>

      {gameState === 'success' ? (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-emerald-300 font-bold animate-pulse flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
          <span>המגדל יציב וישר לחלוטין! כל הכבוד! 🎉</span>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleTap}
            className={`w-full py-4 rounded-xl font-black text-sm md:text-base transition-all duration-150 transform active:scale-95 shadow-lg ${
              gameState === 'playing'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-yellow-500 hover:bg-yellow-600 text-slate-950 glow-btn'
            }`}
          >
            {gameState === 'idle' && 'התחילו את המשימה! 🚀'}
            {gameState === 'playing' && 'לחצו להנחת כוס עכשיו! 🔴'}
            {gameState === 'failed' && 'המגדל קרס! לחצו לניסיון חדש 🔄'}
          </button>
          
          <div className="text-center text-xs text-slate-350 font-semibold">
            {gameState === 'playing' && `כוסות שנערמו בהצלחה: ${cupsStacked} מתוך ${totalCupsNeeded}`}
            {gameState === 'idle' && 'מומלץ לעבוד בתיאום עין-יד מדויק!'}
            {gameState === 'failed' && 'התרכזו בסימון הירוק הרחב שבמרכז הלוח!'}
          </div>
        </div>
      )}
    </div>
  );
}

