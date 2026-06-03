import React, { useState, useEffect } from 'react';
import { Shield, Eye, ShieldAlert, Key, HelpCircle, Sparkles } from 'lucide-react';

interface MemoryTaskProps {
  onSuccess: () => void;
}

interface Card {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryTask({ onSuccess }: MemoryTaskProps) {
  const initialSymbols = [
    'שומר', 'שער', 'מצלמה', 'מפתח', 'משקפת', 'פנס',
    'שומר', 'שער', 'מצלמה', 'מפתח', 'משקפת', 'פנס'
  ];

  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    // Generate randomized deck
    const deck = initialSymbols
      .map((sym, idx) => ({
        id: idx,
        symbol: sym,
        isFlipped: false,
        isMatched: false
      }))
      .sort(() => Math.random() - 0.5);
    setCards(deck);
  }, []);

  const handleCardClick = (id: number) => {
    if (selected.length === 2 || cards[id].isFlipped || cards[id].isMatched) return;

    // Flip card
    const updatedCards = [...cards];
    updatedCards[id].isFlipped = true;
    setCards(updatedCards);

    const nextSelected = [...selected, id];
    setSelected(nextSelected);

    if (nextSelected.length === 2) {
      const [firstIdx, secondIdx] = nextSelected;
      if (cards[firstIdx].symbol === cards[secondIdx].symbol) {
        // It's a match!
        setTimeout(() => {
          const finalCards = cards.map((c, i) => {
            if (i === firstIdx || i === secondIdx) {
              return { ...c, isMatched: true };
            }
            return c;
          });
          setCards(finalCards);
          setSelected([]);

          // Check if all matched
          const isAllMatched = finalCards.every(c => c.isMatched);
          if (isAllMatched) {
            setComplete(true);
            setTimeout(() => {
              onSuccess();
            }, 1200);
          }
        }, 300);
      } else {
        // Not a match, flip back
        setTimeout(() => {
          const resetCards = cards.map((c, i) => {
            if (i === firstIdx || i === secondIdx) {
              return { ...c, isFlipped: false };
            }
            return c;
          });
          setCards(resetCards);
          setSelected([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur border border-red-500/30 rounded-2xl p-5 md:p-6 shadow-2xl">
      <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-yellow-400">
        <Shield className="w-5 h-5 text-yellow-500" />
        <span>משימת הזיכרון החזותי של השומר</span>
      </h3>
      
      <p className="text-sm text-slate-300 mb-5 leading-relaxed text-center">
        השומר בודק את הזיכרון החזותי והערנות שלכם!
        <br />
        <strong>מצאו והתאימו את כל זוגות קלפי האבטחה הבית-ספרית בשער!</strong>
      </p>

      {/* Grid of Cards */}
      <div className="grid grid-cols-4 gap-2.5 max-w-sm mx-auto mb-6">
        {cards.map((card) => {
          const showValue = card.isFlipped || card.isMatched;
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={`aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                showValue
                  ? 'bg-red-500/90 text-white rotate-y-180 scale-100'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-400 border border-slate-600 shadow-inner'
              }`}
            >
              {showValue ? (
                <span className="text-xs break-all text-center">{card.symbol}</span>
              ) : (
                <HelpCircle className="w-6 h-6 text-slate-500" />
              )}
            </button>
          );
        })}
      </div>

      {complete ? (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-emerald-300 font-bold animate-pulse flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span>זיכרון יוצא מן הכלל! המעבר לתחנה 2 מאושר!</span>
        </div>
      ) : (
        <div className="text-center text-xs text-slate-400">
          * שמרו על נימוס מלא ואיחולי יום טוב לשומר בזמן המעבר!
        </div>
      )}
    </div>
  );
}
