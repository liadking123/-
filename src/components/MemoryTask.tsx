import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Eye, 
  Key, 
  HelpCircle, 
  Sparkles, 
  Flashlight, 
  Compass, 
  Lock, 
  Bell, 
  Cpu, 
  Users, 
  Timer, 
  XCircle, 
  CheckCircle2, 
  Volume2, 
  Flame,
  Phone,
  Monitor,
  Laptop,
  Layout
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Team } from '../types';

interface MemoryTaskProps {
  onSuccess: () => void;
  currentTeam: Team;
  allTeams: Team[];
}

interface Card {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryTask({ onSuccess, currentTeam, allTeams }: MemoryTaskProps) {
  const initialSymbols = [
    'שומר', 'שער', 'מצלמה', 'מפתח', 'משקפת', 'פנס', 'אזעקה', 'קודן', 'טלפון', 'מסך', 'מחשב', 'חלון',
    'שומר', 'שער', 'מצלמה', 'מפתח', 'משקפת', 'פנס', 'אזעקה', 'קודן', 'טלפון', 'מסך', 'מחשב', 'חלון'
  ];

  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [complete, setComplete] = useState(false);
  
  // Competitive states
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'won' | 'lost' | 'penalty'>('loading');
  const [botMatches, setBotMatches] = useState<number>(0);
  const [botAction, setBotAction] = useState<string>('הבוט המאבטח מוכן למקצה וקשוב!');
  const [penaltyEndTime, setPenaltyEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes (300 seconds)

  // 1. Sort all teams registered in the database alphabetically by ID to get a stable, shared deterministic order across all devices
  const sortedTeams = [...allTeams].sort((a, b) => a.id.localeCompare(b.id));

  // Find our team's index in this sorted array
  const myIndex = sortedTeams.findIndex(t => t.id === currentTeam.id);

  // Symmetrically determine the partner team or if we are paired with a bot
  let opponentTeam: Team | null = null;
  let isBot = false;

  if (myIndex !== -1) {
    const isEven = myIndex % 2 === 0;
    const partnerIndex = isEven ? myIndex + 1 : myIndex - 1;
    
    if (partnerIndex >= 0 && partnerIndex < sortedTeams.length) {
      opponentTeam = sortedTeams[partnerIndex];
    } else {
      isBot = true;
    }
  } else {
    isBot = true;
  }

  const opponentName = isBot ? "בוט 🤖" : (opponentTeam ? opponentTeam.name : "בוט 🤖");
  const opponentMatches = isBot ? botMatches : (opponentTeam?.memoryStationMatches || 0);
  const totalPairsRequired = 12;

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
      case 'אזעקה':
        return <Bell className="w-5 h-5 text-rose-400 stroke-[2.5]" />;
      case 'קודן':
        return <Cpu className="w-5 h-5 text-violet-400 stroke-[2.5]" />;
      case 'טלפון':
        return <Phone className="w-5 h-5 text-blue-400 stroke-[2.5]" />;
      case 'מסך':
        return <Monitor className="w-5 h-5 text-pink-400 stroke-[2.5]" />;
      case 'מחשב':
        return <Laptop className="w-5 h-5 text-teal-400 stroke-[2.5]" />;
      case 'חלון':
        return <Layout className="w-5 h-5 text-amber-500 stroke-[2.5]" />;
      default:
        return <HelpCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  // On mount: Load game progress of this session from localStorage or initialize
  useEffect(() => {
    const savedStatus = localStorage.getItem('memory_task_status');
    const savedEndTime = localStorage.getItem('memory_task_penalty_end');
    const savedDeck = localStorage.getItem('memory_task_deck');

    // 1. Check if we are currently serving a penalty block
    if (savedStatus === 'penalty' && savedEndTime) {
      const remaining = parseInt(savedEndTime) - Date.now();
      if (remaining > 0) {
        setGameState('penalty');
        setPenaltyEndTime(parseInt(savedEndTime));
        setTimeLeft(Math.ceil(remaining / 1000));
        return;
      } else {
        // Time has expired, clear localStorage and ready to play/success
        localStorage.removeItem('memory_task_status');
        localStorage.removeItem('memory_task_penalty_end');
      }
    }

    // 2. Generate or load the 24-card deck (6x4 or 4x6)
    if (savedDeck) {
      try {
        const parsedDeck = JSON.parse(savedDeck) as Card[];
        // Check if saved deck matches current size requirement
        if (parsedDeck.length === 24) {
          setCards(parsedDeck);
          
          // Check if saved deck was already solved
          const alreadyDone = parsedDeck.every(c => c.isMatched);
          if (alreadyDone) {
            setComplete(true);
            setGameState('won');
            return;
          }

          setGameState('playing');
          return;
        }
      } catch (e) {
        console.error("Failed to restore memory deck, shuffling a new one.", e);
      }
    }

    // Generate brand new reliable Fisher-Yates shuffled deck of 24 cards
    const deckSymbols = [...initialSymbols];
    for (let i = deckSymbols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = deckSymbols[i];
      deckSymbols[i] = deckSymbols[j];
      deckSymbols[j] = temp;
    }

    const newDeck = deckSymbols.map((sym, idx) => ({
      id: idx,
      symbol: sym,
      isFlipped: false,
      isMatched: false
    }));

    setCards(newDeck);
    localStorage.setItem('memory_task_deck', JSON.stringify(newDeck));
    localStorage.setItem('memory_task_status', 'playing');
    setGameState('playing');
  }, []);

  // background bot simulator loop during match (only if isBot is true)
  useEffect(() => {
    if (gameState !== 'playing' || complete || !isBot) return;

    // Bot makes updates slower (around 15-21s per match) giving players a fair but highly competitive challenge
    const timer = setInterval(() => {
      setBotMatches(prev => {
        const next = prev + 1;
        
        const feedbackPool = [
          "מצא זוג של פנס! 🔦",
          "חושף קלפים במהירות מפתיעה!",
          "מתקדם בקצב מעולה!",
          "זיהה את המיקום של השומר! 🛡️",
          "מצא זוג של מצלמת אבטחה! 📷",
          "סרק חריץ אלקטרוני וגילה טלפון! 📞",
          "מצא חיבור תואם למחשב! 💻",
          "ממש קרוב לסיום הלוח!",
          "זיהה זוג של חלון מעוצב! 🪟",
          "במרחק נגיעה מפתרון כל המשימה!"
        ];
        const phrase = feedbackPool[Math.min(next - 1, feedbackPool.length - 1)];
        setBotAction(`בוט 🤖 ${phrase}`);

        if (next >= totalPairsRequired) {
          clearInterval(timer);
        }
        return next;
      });
    }, Math.floor(Math.random() * 4000) + 14000);

    return () => clearInterval(timer);
  }, [gameState, complete, isBot]);

  // Synchronized rival win check
  useEffect(() => {
    if (gameState !== 'playing' || complete) return;

    const isOpponentWinner = isBot 
      ? botMatches >= totalPairsRequired 
      : opponentTeam && ((opponentTeam.memoryStationMatches || 0) >= totalPairsRequired || opponentTeam.currentStation > 0);

    if (isOpponentWinner) {
      triggerPenalty();
    }
  }, [botMatches, opponentTeam?.memoryStationMatches, opponentTeam?.currentStation, isBot, gameState, complete]);

  // Handle active penalty timer countdown
  useEffect(() => {
    if (gameState !== 'penalty' || !penaltyEndTime) return;

    const timer = setInterval(() => {
      const remaining = penaltyEndTime - Date.now();
      if (remaining <= 0) {
        clearInterval(timer);
        setTimeLeft(0);
        handleBypass();
      } else {
        setTimeLeft(Math.ceil(remaining / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, penaltyEndTime]);

  // Trigger penalty phase
  const triggerPenalty = () => {
    setGameState('penalty');
    const finishAt = Date.now() + 5 * 60 * 1000; // Exactly 5 minutes from now
    setPenaltyEndTime(finishAt);
    localStorage.setItem('memory_task_status', 'penalty');
    localStorage.setItem('memory_task_penalty_end', String(finishAt));
  };

  // Card interaction
  const handleCardClick = (index: number) => {
    if (gameState !== 'playing' || selected.length >= 2 || cards[index].isFlipped || cards[index].isMatched) return;

    // Flip card immediately in interface
    const updated = cards.map((c, i) => i === index ? { ...c, isFlipped: true } : c);
    setCards(updated);

    const nextSelected = [...selected, index];
    setSelected(nextSelected);

    // If we have selected a pair of cards
    if (nextSelected.length === 2) {
      const [first, second] = nextSelected;
      if (updated[first].symbol === updated[second].symbol) {
        // MATCH found!
        setTimeout(() => {
          setCards(prev => {
            const finalCards = prev.map((c, i) => {
              if (i === first || i === second) {
                return { ...c, isMatched: true };
              }
              return c;
            });

            localStorage.setItem('memory_task_deck', JSON.stringify(finalCards));

            // Check if player solved all pairs
            const playerMatchedCount = finalCards.filter(c => c.isMatched).length / 2;
            const isAllSolved = finalCards.every(c => c.isMatched);

            // Sync matched count to Firestore in real-time
            if (currentTeam?.id) {
              updateDoc(doc(db, 'teams', currentTeam.id), {
                memoryStationMatches: playerMatchedCount,
                lastActive: new Date().toISOString()
              }).catch(err => console.error("Firestore matches sync error:", err));
            }

            if (isAllSolved) {
              setComplete(true);
              setGameState('won');
              localStorage.setItem('memory_task_status', 'won');
              
              if (currentTeam?.id) {
                updateDoc(doc(db, 'teams', currentTeam.id), {
                  memoryStationMatches: totalPairsRequired,
                  memoryFinishedAt: new Date().toISOString()
                }).catch(err => console.error("Firestore final success sync error:", err));
              }

              // Move to next station after 1.5 seconds delay
              setTimeout(() => {
                onSuccess();
              }, 1500);
            }

            return finalCards;
          });
          setSelected([]);
        }, 300);
      } else {
        // Not a match, flip back down after 1s delay
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => {
            if (i === first || i === second) {
              return { ...c, isFlipped: false };
            }
            return c;
          }));
          setSelected([]);
        }, 850);
      }
    }
  };

  // Admin / Instructor bypass function to instantly clear wait or complete station during testing
  const handleBypass = () => {
    localStorage.removeItem('memory_task_status');
    localStorage.removeItem('memory_task_penalty_end');
    setComplete(true);
    setGameState('won');
    localStorage.setItem('memory_task_status', 'won');
    
    // Auto trigger success progress
    onSuccess();
  };

  // Format penalty time to MM:SS Hebraic style
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const opponentActionText = () => {
    if (isBot) return botAction;
    if (!opponentTeam) return 'מחובר וממתין לחברים.';
    const m = opponentTeam.memoryStationMatches || 0;
    if (m === 0) return `${opponentTeam.name} מחפשים את הזוגות בלוח...`;
    if (m < 5) return `${opponentTeam.name} מצאו ${m} זוגות קלפים!`;
    if (m < 11) return `${opponentTeam.name} עובדים מהר מאוד עם ${m} זוגות! 🔥`;
    if (m === 11) return `⚠️ אזהרה חמה: ${opponentTeam.name} במרחק קלף סופי אחד מניצחון ותחילת השעיה!`;
    return `${opponentTeam.name} מוכנים ומקדמים את המשימה לשלבים מתקדמים.`;
  };

  if (gameState === 'loading') {
    return (
      <div className="bg-slate-850 p-6 rounded-2xl border border-slate-700/50 text-center animate-pulse text-right">
        <div className="text-yellow-400 font-bold">טוען מערכת קשר וזיכרון מוגברת (24 קלפים)...</div>
      </div>
    );
  }

  // --- RENDER PENALTY WAITING VIEW ---
  if (gameState === 'penalty') {
    return (
      <div className="bg-gradient-to-b from-slate-900 to-red-950/90 border border-red-500/60 rounded-3xl p-6 shadow-2xl text-right relative overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Animated flashing red beacon */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/15 border border-red-500/30 px-3 py-1 rounded-full text-[10px] font-black tracking-normal text-red-400 animate-pulse">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block animate-ping" />
          <span>השעיית אבטחה פעילה</span>
        </div>

        <div className="flex flex-col items-center justify-center text-center mt-6 mb-5">
          <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500/40 rounded-full flex items-center justify-center mb-4 text-red-500 animate-bounce">
            <Timer className="w-8 h-8 stroke-[2.5]" />
          </div>
          
          <h3 className="text-2xl font-black text-red-400 font-display leading-tight mb-2">
            הקבוצה המתחרה השיגה אתכם!
          </h3>
          <p className="text-sm text-slate-300 max-w-md leading-relaxed">
            הקבוצה {opponentName} השלימה את משימת הזיכרון המוגדלת ({totalPairsRequired} זוגות) לפניכם, סיימה ראשונה ועברה ישירות לקבלת הרמז הבא!
            <br />
            <span className="text-red-350 font-semibold text-xs mt-1 block">על מנת למנוע עומס תנועה, השער ננעל. עליכם להמתין בדיוק לחלוף ההשעיה של 5 דקות כדי לקבל את הקוד ולהמשיך הלאה.</span>
          </p>
        </div>

        {/* Big digital timer box */}
        <div className="bg-black/45 border-2 border-red-500/35 rounded-2xl p-6 text-center shadow-inner max-w-xs mx-auto mb-6">
          <span className="text-xs uppercase tracking-widest text-slate-500 font-bold block mb-1">זמן המתנה שנותר</span>
          <span className="text-4xl md:text-5xl font-mono text-red-500 tracking-wider font-bold block filter drop-shadow-[0_0_10px_rgba(239,68,68,0.3)] select-none">
            {formatTime(timeLeft)}
          </span>
        </div>

        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2 mb-6 max-w-md mx-auto">
          <div className="flex items-start gap-1.5 justify-start text-right">
            <span className="mt-0.5 text-red-500">▪</span>
            <span>רמז מנחה: בזמן שאתם ממתינים, נצלו את הזמן לתכנן את מעברי התחנות הבאים שלכם בקמפוס הלימודים!</span>
          </div>
          <div className="flex items-start gap-1.5 justify-start text-right">
            <span className="mt-0.5 text-red-500">▪</span>
            <span>עם סיום שעון העצר, הקוד של התחנה ייפתח עבורכם אוטומטית.</span>
          </div>
        </div>

        {/* Admin Secret Skip feature */}
        <div className="border-t border-red-500/15 pt-4 text-center">
          <button
            type="button"
            onClick={handleBypass}
            className="text-[10px] text-slate-500 hover:text-red-400 font-semibold mx-auto border border-dashed border-slate-700/65 rounded px-2.5 py-1 transition duration-150 hover:border-red-500/40"
          >
            עקוף המתנה (לשימוש מנחה / בדיקה מהירה) 🛠️
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN PLAY VIEW ---
  const playerMatchedCount = cards.filter(c => c.isMatched).length / 2;

  return (
    <div className="bg-slate-850 border border-slate-700/40 rounded-3xl overflow-hidden shadow-2xl text-right animate-in fade-in duration-300">
      
      {/* Dynamic Esports Header Bar */}
      <div className="bg-gradient-to-r from-red-650 to-amber-700 py-3.5 px-5 md:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-red-500/25">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-600/20 border border-red-500/30 rounded-xl relative">
            <Shield className="w-5 h-5 text-yellow-400" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-yellow-300 block leading-none mb-1">תחנה 1 - עימות חזותי קשה</span>
            <h4 className="text-base font-black text-white tracking-wide font-display">זירת הזיכרון הדיגיטלית של אבטחת השער • 24 קלפים!</h4>
          </div>
        </div>

        {/* Live competition badge */}
        <div className="bg-black/30 border border-white/10 px-3 py-1.5 rounded-2xl flex items-center gap-2 text-xs shrink-0 max-w-full">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="font-bold text-slate-300 text-right">
            מתחרה פעיל: <strong className={isBot ? "text-amber-400" : "text-emerald-400"}>{isBot ? "בוט 🤖" : "אונליין ⚡"}</strong>
          </span>
        </div>
      </div>

      {/* Main Competitive layout container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 md:p-6 pb-4">
        
        {/* RIGHT COLUMN (Telemetry & Competitor status info box) */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          
          {/* Competitor Panel Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800/85 pb-2.5 mb-3.5">
              <span className="text-[10px] bg-red-500/15 border border-red-500/30 text-rose-450 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                <Flame className="w-3 h-3 text-red-500 fill-red-500" />
                <span>מוביל הלוח</span>
              </span>
              <div className="flex items-center gap-1.5 text-right font-bold text-slate-200">
                <span className="text-slate-200 text-sm font-black">{opponentName}</span>
                <Users className="w-4 h-4 text-orange-400 shrink-0" />
              </div>
            </div>

            {/* Simulated Live visual progress of Rival matches */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-orange-400 min-w-max bg-orange-950/20 border border-orange-500/20 px-1.5 py-0.5 rounded font-mono">{opponentMatches} מתוך {totalPairsRequired} זוגות</span>
                <span className="text-slate-400 font-semibold text-[11px]">קצב התקדמות היריב</span>
              </div>
              
              {/* Rival Match Progress bar */}
              <div className="w-full bg-slate-950 rounded-full h-3.5 overflow-hidden border border-slate-800 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full transition-all duration-500 shadow-lg relative"
                  style={{ width: `${(opponentMatches / totalPairsRequired) * 100}%` }}
                >
                  {opponentMatches > 0 && <span className="absolute right-1 top-[20%] w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
                </div>
              </div>

              {/* Your Progress Comparison */}
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="font-bold text-cyan-400 min-w-max bg-cyan-950/20 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono">{playerMatchedCount} מתוך {totalPairsRequired} זוגות</span>
                <span className="text-slate-400 font-semibold text-[11px]">מדד הזיכרון שלכם במרוץ</span>
              </div>
              
              {/* Player Progress bar */}
              <div className="w-full bg-slate-950 rounded-full h-3.5 overflow-hidden border border-slate-800 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 shadow-lg"
                  style={{ width: `${(playerMatchedCount / totalPairsRequired) * 100}%` }}
                />
              </div>
            </div>

            {/* Live activity log telemetry feedback */}
            <div className="mt-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5 text-right">
              <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse mt-1 shrink-0 filter drop-shadow-[0_0_3px_rgba(249,115,22,0.8)]" />
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider leading-none">תנועת מרוץ נוכחית</span>
                <p className="text-xs text-orange-350 font-bold leading-normal">{opponentActionText()}</p>
              </div>
            </div>
          </div>

          {/* Quick instructions / Rule board */}
          <div className="bg-slate-900/35 border border-slate-800/80 p-4 rounded-2xl text-xs space-y-2.5 text-right">
            <h5 className="font-bold text-slate-350 flex items-center justify-start gap-1">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>חוקי המרוץ המוגבר:</span>
            </h5>
            <div className="space-y-1.5 text-slate-400 leading-normal font-medium text-[11px]">
              <p>1. כפתרו את {totalPairsRequired} הזוגות המאוירים בלוח שלכם במהירות המרבית!</p>
              <p className="text-orange-400 font-bold">2. הלוח גדל ל-24 קלפים! (מגוון סמלים חדש: טלפונים, מחשבים, מסכים).</p>
              <p className="text-red-400 font-bold">3. מי שמפסיד לקבוצה השניה ייענש בהשעיית הגנת אבטחה של <strong className="underline">5 דקות</strong> שלמות ללא רמז!</p>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN (Player's Active 6x4 Grid Memory board) */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="flex justify-between items-center bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80 mb-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs bg-cyan-950/20 border border-cyan-500/20 px-2.5 py-1 rounded">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>רמת קושי: גבוהה מאוד ⚡</span>
            </div>
            <span className="text-xs text-slate-350 font-bold">
              עודכן בענן • התאמתם: <strong className="text-cyan-400 font-black font-mono">{playerMatchedCount}</strong> מתוך {totalPairsRequired} פריטים
            </span>
          </div>

          {/* Responsive grid for 24 cards (6 columns, 4 rows or vice-versa, let's make it 6 columns) */}
          <div className="grid grid-cols-6 gap-2 max-w-xl mx-auto select-none">
            {cards.map((card, index) => {
              const showValue = card.isFlipped || card.isMatched;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(index)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center font-bold transition-all duration-300 transform active:scale-95 ${
                    card.isMatched
                      ? 'bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-lg scale-100 ring-2 ring-emerald-400/30'
                      : showValue
                        ? 'bg-gradient-to-br from-cyan-600 to-cyan-500 text-white shadow-lg scale-100 ring-2 ring-cyan-500/40 animate-in fade-in zoom-in duration-200'
                        : 'bg-slate-900 hover:bg-slate-800 hover:scale-[1.03] text-slate-505 border border-slate-800 shadow-inner hover:border-slate-705'
                  }`}
                >
                  {showValue ? (
                    <div className="flex flex-col items-center gap-1 animate-in zoom-in duration-150">
                      {getSymbolIcon(card.symbol)}
                      <span className="text-[8px] md:text-[10px] font-black tracking-normal leading-none block mt-1 text-center truncate max-w-[42px]">{card.symbol}</span>
                    </div>
                  ) : (
                    <HelpCircle className="w-4 h-4 md:w-5 h-5 text-slate-750 hover:text-slate-600 transition duration-155" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {complete ? (
        <div className="p-4 bg-emerald-500/20 border-t border-emerald-500/40 rounded-b-3xl text-center text-emerald-300 font-bold animate-pulse flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
          <span>מדהים ומבריק! ניצחתם בדו-קרב ה-24! מעבר מאושר לתחנה הבאה! 🎉</span>
        </div>
      ) : (
        <div className="bg-slate-900/50 border-t border-slate-850 py-3 px-5 text-center text-[10px] md:text-[11px] text-slate-450 font-medium">
          היריב צמוד מאוד אליכם! שמרו על ריכוז עילאי והשיגו את הניצחון!
        </div>
      )}

    </div>
  );
}
