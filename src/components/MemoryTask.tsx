import React, { useState, useEffect } from 'react';
import { Shield, Eye, Key, HelpCircle, Sparkles, Flashlight, Compass, Lock } from 'lucide-react';

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

  // Get a matching visual icon for each Hebrew word symbol
  const getSymbolIcon = (symbol: string) => {
    switch (symbol) {
      case 'שומר':
        return <Shield className="w-5 h-5 text-yellow-400 stroke-[2.5]" />;
      case 'שער':
        return <Lock className="w-5 h-5 text-orange-400 stroke-[2.5]" />;
      case 'מצלמה':
        return <Eye className="w-5 h-5 text-cyan-400 stroke-[2.5]" />;
      case 'מפתח':
        return <Key className="w-5 h-5 text-amber-400 stroke-[2.5]" />;
      case 'משקפת':
        return <Compass className="w-5 h-5 text-indigo-400 stroke-[2.5]" />;
      case 'פנס':
        return <Flashlight className="w-5 h-5 text-emerald-400 stroke-[2.5]" />;
      default:
        return <HelpCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  useEffect(() => {
    // Correct Fisher-Yates algorithm for reliable, random shuffle
    const shuffled = [...initialSymbols];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    const deck = shuffled.map((sym, idx) => ({
      id: idx,
      symbol: sym,
      isFlipped: false,
      isMatched: false
    }));
    setCards(deck);
  }, []);

  const handleCardClick = (index: number) => {
    // Prevent actions if 2 cards are already selected, or if this card is already flipped/matched
    if (selected.length >= 2 || cards[index].isFlipped || cards[index].isMatched) return;

    // Flip the clicked card immediately in state
    setCards(prev => prev.map((c, i) => i === index ? { ...c, isFlipped: true } : c));

    const nextSelected = [...selected, index];
    setSelected(nextSelected);

    if (nextSelected.length === 2) {
      const [firstIdx, secondIdx] = nextSelected;
      const firstCard = cards[firstIdx];
      const secondCard = cards[secondIdx];

      if (firstCard.symbol === secondCard.symbol) {
        // Perfect match!
        setTimeout(() => {
          setCards(prev => {
            const finalCards = prev.map((c, i) => {
              if (i === firstIdx || i === secondIdx) {
                return { ...c, isMatched: true };
              }
              return c;
            });

            const isAllMatched = finalCards.every(c => c.isMatched);
            if (isAllMatched) {
              setComplete(true);
              setTimeout(() => {
                onSuccess();
              }, 1200);
            }
            return finalCards;
          });
          setSelected([]);
        }, 300);
      } else {
        // Not a match, flip both cards back down after a short delay
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => {
            if (i === firstIdx || i === secondIdx) {
              return { ...c, isFlipped: false };
            }
            return c;
          }));
          setSelected([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur border border-red-500/30 rounded-2xl p-5 md:p-6 shadow-2xl text-right">
      <h3 className="text-xl font-black mb-3 flex items-center justify-start gap-2 text-yellow-400">
        <Shield className="w-5 h-5 text-yellow-500" />
        <span>משימת הזיכרון החזותי של השומר</span>
      </h3>
      
      <p className="text-xs md:text-sm text-slate-350 mb-5 leading-relaxed font-medium">
        השומר בשער בודק את הזיכרון החזותי והערנות שלכם! 
        <br />
        <strong>מצאו והתאימו את כל זוגות קלפי האבטחה בצורה נכונה:</strong>
      </p>

      {/* Grid of Cards */}
      <div className="grid grid-cols-4 gap-2.5 max-w-sm mx-auto mb-6">
        {cards.map((card, index) => {
          const showValue = card.isFlipped || card.isMatched;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(index)}
              className={`aspect-square rounded-2xl flex flex-col items-center justify-center font-bold transition-all duration-300 transform active:scale-95 ${
                showValue
                  ? 'bg-gradient-to-br from-red-600 to-red-500 text-white shadow-lg scale-100 ring-2 ring-red-500/40 animate-in fade-in zoom-in duration-200'
                  : 'bg-slate-900 hover:bg-slate-800 hover:scale-[1.03] text-slate-500 border border-slate-800 shadow-inner'
              }`}
            >
              {showValue ? (
                <div className="flex flex-col items-center gap-1 animate-in zoom-in duration-150">
                  {getSymbolIcon(card.symbol)}
                  <span className="text-[11px] font-black tracking-normal leading-none block mt-0.5">{card.symbol}</span>
                </div>
              ) : (
                <HelpCircle className="w-6 h-6 text-slate-700 hover:text-slate-500 transition duration-150" />
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
        <div className="text-center text-xs text-slate-400 font-medium">
          * שמרו על נימוס מלא ואיחולי יום טוב לשומר בזמן המעבר!
        </div>
      )}
    </div>
  );
}
