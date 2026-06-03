import React, { useState, useEffect, useRef } from 'react';
import { Target, Sparkles, AlertCircle } from 'lucide-react';

interface CoordinationTaskProps {
  onSuccess: () => void;
}

export default function CoordinationTask({ onSuccess }: CoordinationTaskProps) {
  const [cupsStacked, setCupsStacked] = useState(0);
  const totalCupsNeeded = 5;
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'failed' | 'success'>('idle');
  const speed = useRef(3); // Slider speed
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(() => {
        setSliderPos((prev) => {
          if (direction === 'right') {
            if (prev >= 100) {
              setDirection('left');
              return 100;
            }
            return prev + speed.current;
          } else {
            if (prev <= 0) {
              setDirection('right');
              return 0;
            }
            return prev - speed.current;
          }
        });
      }, 16);
      return () => clearInterval(interval);
    }
  }, [gameState, direction]);

  const handleTap = () => {
    if (gameState !== 'playing') {
      setGameState('playing');
      setCupsStacked(0);
      speed.current = 2.5;
      return;
    }

    // Checking if slider is in the target area (43 to 57)
    const isPerfect = sliderPos >= 45 && sliderPos <= 55;
    const isGood = sliderPos >= 40 && sliderPos <= 60;

    if (isPerfect || isGood) {
      const nextCups = cupsStacked + 1;
      setCupsStacked(nextCups);
      
      // Speed up slightly to make it progressively exciting
      speed.current += 0.8;

      if (nextCups >= totalCupsNeeded) {
        setGameState('success');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      }
    } else {
      // Failed - reset
      setGameState('failed');
    }
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur border border-red-500/30 rounded-2xl p-5 md:p-6 shadow-2xl">
      <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-yellow-400">
        <Target className="w-5 h-5 text-yellow-400" />
        <span>משימת קואורדינציות כוסות דיגיטלית</span>
      </h3>
      
      <p className="text-sm text-slate-300 mb-5 leading-relaxed text-center">
        אבות הבית מאתגרים אתכם לבנות מגדל של 5 כוסות חד-פעמיות!
        <br />
        <strong>לחצו בדיוק כשהמד המהיר מגיע למרכז (האזור הירוק) כדי להציב כוס במגדל!</strong>
      </p>

      {/* Visual Cup Tower Stack */}
      <div className="flex flex-col-reverse items-center gap-1.5 h-36 justify-end bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 mb-6">
        {Array.from({ length: totalCupsNeeded }).map((_, idx) => {
          const isStacked = idx < cupsStacked;
          return (
            <div
              key={idx}
              className={`h-6 rounded-md flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                isStacked 
                  ? 'bg-red-500 text-white w-28 scale-100 opacity-100 shadow' 
                  : 'bg-slate-800/30 text-slate-600 border border-slate-700 w-16 opacity-40'
              }`}
            >
              컵 [ כוס {idx + 1} ]
            </div>
          );
        })}
      </div>

      {/* Slider Bar */}
      <div className="relative w-full h-8 bg-slate-900 rounded-full border border-slate-700 overflow-hidden mb-6 flex items-center justify-center">
        {/* Safe target zone (Green) */}
        <div className="absolute w-[20%] h-full bg-emerald-500/30 border-x border-emerald-500" />
        {/* Perfect center indicator */}
        <div className="absolute w-[4px] h-full bg-yellow-400" />

        {/* Current Moving Pin */}
        <div
          className="absolute w-4 h-4 bg-red-500 rounded-full shadow-lg border-2 border-white transition-all pointer-events-none duration-75"
          style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
        />
      </div>

      {gameState === 'success' ? (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-emerald-300 font-bold animate-pulse flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span>המגדל יציב! כל הכבוד! ממשיכים הלאה...</span>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={handleTap}
            className={`w-full py-4 rounded-xl font-bold text-lg transition duration-200 shadow-lg ${
              gameState === 'playing'
                ? 'bg-red-500 hover:bg-red-600 text-white hover:scale-95'
                : 'bg-yellow-500 hover:bg-yellow-600 text-slate-950 glow-btn'
            }`}
          >
            {gameState === 'idle' && 'התחל משימת כוסות!'}
            {gameState === 'playing' && 'לחץ כדי להניח כוס! 🔴'}
            {gameState === 'failed' && 'מגדל קרס! נסו שוב 🔄'}
          </button>
          
          <div className="text-center text-xs text-slate-400">
            {gameState === 'playing' && `הצלחות: ${cupsStacked}/5`}
            {gameState === 'idle' && 'מומלץ לתאם לחיצות ביחד!'}
            {gameState === 'failed' && 'רגישות גבוהה! לחצו בדיוק כשהמד במרכז המדויק.'}
          </div>
        </div>
      )}
    </div>
  );
}
