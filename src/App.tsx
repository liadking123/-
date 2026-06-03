import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  UserCheck, 
  Play, 
  MapPin, 
  AlertTriangle, 
  Clock, 
  Gift, 
  Compass, 
  Tv, 
  ListOrdered, 
  RotateCcw, 
  Sparkles, 
  FileText, 
  ThumbsUp, 
  ArrowRight,
  Info
} from 'lucide-react';
import { db } from './firebase';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  limit, 
  setDoc, 
  updateDoc, 
  getDocs 
} from 'firebase/firestore';
import { GameState, Team, NotificationMsg, STATIONS } from './types';
import { 
  getGameSettings, 
  updateGameStatus, 
  updateGameCountdown, 
  createTeam, 
  updateTeamStation, 
  checkTeamStatus, 
  sendNotification, 
  testConnection,
  resetGameData
} from './firebaseUtils';

import MemoryTask from './components/MemoryTask';
import CoordinationTask from './components/CoordinationTask';
import WordSearchTask from './components/WordSearchTask';

const STATION_PASSCODES = ["1321", "1232", "1515", "1717", "1818", "1111"];

export default function App() {
  const [role, setRole] = useState<'select' | 'student' | 'guide'>('select');
  const [teamName, setTeamName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  
  // Local state for current connected team
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  
  // Password screen for Guide
  const [guidePassword, setGuidePassword] = useState('');
  const [isAuthorizedGuide, setIsAuthorizedGuide] = useState(false);
  const [guideError, setGuideError] = useState('');

  // Firebase Real-time syncing states
  const [globalState, setGlobalState] = useState<GameState>({ status: 'waiting', countdown: 3 });
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<NotificationMsg[]>([]);
  
  // Game countdown local display trigger
  const [localCountdown, setLocalCountdown] = useState<number | null>(null);
  const [localCountdownText, setLocalCountdownText] = useState('');

  // Task states
  const [textAnswer, setTextAnswer] = useState('');
  const [answerError, setAnswerError] = useState('');
  const [thankYouText, setThankYouText] = useState('');
  const [selectedTriviaOption, setSelectedTriviaOption] = useState<number | null>(null);
  const [triviaError, setTriviaError] = useState('');

  // Passcode verification states
  const [stationPasscode, setStationPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Toast / announcement messages display
  const [activeToast, setActiveToast] = useState<string | null>(null);

  // Student entry tabs
  const [studentTab, setStudentTab] = useState<'register' | 'reconnect'>('register');
  const [selectedTeamToReconnect, setSelectedTeamToReconnect] = useState<string>('');

  // Custom modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Set RTL direction and test Firebase connection on startup
  useEffect(() => {
    document.documentElement.dir = "rtl";
    testConnection();

    // Check local storage for persistent team session
    const savedTeamId = localStorage.getItem('nave_nachum_team_id');
    if (savedTeamId) {
      checkTeamStatus(savedTeamId).then((team) => {
        if (team) {
          setCurrentTeam(team);
          setRole('student');
        }
      });
    }
  }, []);

  // Subscribe to Global Game State
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'game', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GameState;
        setGlobalState(data);
      } else {
        // Initialize if empty
        setDoc(doc(db, 'game', 'main'), { status: 'waiting', countdown: 3 });
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to connected teams
  useEffect(() => {
    const q = query(collection(db, 'teams'));
    const unsub = onSnapshot(q, (snapshot) => {
      const teamsList: Team[] = [];
      snapshot.forEach((doc) => {
        teamsList.push(doc.data() as Team);
      });
      // Sort teams first by score/current station down, then by finish/active timestamp
      teamsList.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime();
      });
      setAllTeams(teamsList);

      // Keep local team state synchronised with server updates
      if (currentTeam) {
        const matched = teamsList.find(t => t.id === currentTeam.id);
        if (matched) {
          setCurrentTeam(matched);
        }
      }
    });
    return () => unsub();
  }, [currentTeam?.id]);

  // Subscribe to real-time solving notification banners
  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(5));
    const unsub = onSnapshot(q, (snapshot) => {
      const notifs: NotificationMsg[] = [];
      snapshot.forEach((doc) => {
        notifs.push(doc.data() as NotificationMsg);
      });
      setLiveNotifications(notifs);

      // Pop active notification toast if a new one is received
      if (notifs.length > 0) {
        const latestInfo = notifs[0];
        // Only show if it's within the last 15 seconds
        const ageSecs = (Date.now() - new Date(latestInfo.createdAt).getTime()) / 1000;
        if (ageSecs < 15) {
          setActiveToast(latestInfo.message);
          const t = setTimeout(() => {
            setActiveToast(null);
          }, 6000);
          return () => clearTimeout(t);
        }
      }
    });
    return () => unsub();
  }, []);

  // Real-time Countdown automation triggered by game setting transition
  useEffect(() => {
    if (globalState.status === 'countdown') {
      let counter = 3;
      setLocalCountdown(counter);
      setLocalCountdownText('3');

      const interval = setInterval(() => {
        counter -= 1;
        if (counter === 2) {
          setLocalCountdown(2);
          setLocalCountdownText('2');
        } else if (counter === 1) {
          setLocalCountdown(1);
          setLocalCountdownText('1');
        } else if (counter === 0) {
          setLocalCountdown(0);
          setLocalCountdownText('צאו לדרך! 🏁');
        } else {
          clearInterval(interval);
          setLocalCountdown(null);
          // If current is Guide, transition game state globally to 'active'
          if (isAuthorizedGuide) {
            updateGameStatus('active');
          }
        }
      }, 1200);

      return () => clearInterval(interval);
    } else {
      setLocalCountdown(null);
    }
  }, [globalState.status]);

  // Handles reconnecting to an existing team
  const handleReconnectToTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamToReconnect) return;
    const team = allTeams.find(t => t.id === selectedTeamToReconnect);
    if (team) {
      localStorage.setItem('nave_nachum_team_id', team.id);
      setCurrentTeam(team);
      setRole('student');
    }
  };

  // Handles joining as a pair
  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !partnerName.trim() || !classNumber.trim()) return;

    const combinedName = `${teamName.trim()} ו${partnerName.trim()}`;
    const generatedId = 'team_' + Math.random().toString(36).substring(2, 9);
    
    try {
      const newTeam = await createTeam(generatedId, combinedName, classNumber);
      localStorage.setItem('nave_nachum_team_id', generatedId);
      setCurrentTeam(newTeam);
    } catch (err) {
      console.error(err);
    }
  };

  // Guide authorize
  const handleAuthorizeGuide = (e: React.FormEvent) => {
    e.preventDefault();
    if (guidePassword === '1234' || guidePassword === 'מיליון2026') {
      setIsAuthorizedGuide(true);
      setGuideError('');
    } else {
      setGuideError('קוד גישה לא נכון! נסו שוב.');
    }
  };

  // Start Countdown from Admin
  const handleStartGame = async () => {
    await updateGameStatus('countdown');
  };

  // Reset Game entirely (Admin)
  const handleResetGame = () => {
    setConfirmModal({
      isOpen: true,
      title: '🚨 איפוס מוחלט של המשחק',
      message: 'אזהרה: האם אתה בטוח שברצונך לאפס הכל? פעולה זו תמחק לחלוטין את כל הזוגות הרשומים, פתרונות התחנות, ולוח הניקוד ותתחיל את הכל מחדש!',
      type: 'danger',
      confirmText: 'כן, מחק ואפס הכל',
      cancelText: 'ביטול',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await resetGameData();
          localStorage.removeItem('nave_nachum_team_id');
          setCurrentTeam(null);
          setAlertModal({
            isOpen: true,
            title: 'האיפוס הושלם בהצלחה',
            message: 'המשחק אותחל מחדש! כל הנתונים נמחקו והלובי מוכן לקבוצות חדשות.',
            type: 'success'
          });
        } catch (err) {
          console.error(err);
          setAlertModal({
            isOpen: true,
            title: 'שגיאה',
            message: 'שגיאה במהלך איתחול הנתונים במערכת.',
            type: 'error'
          });
        }
      }
    });
  };

  // Handle Station Solving & Move Forward
  const handleSolveStation = async () => {
    if (!currentTeam) return;
    
    const currentIdx = currentTeam.currentStation;
    const requiredCode = STATION_PASSCODES[currentIdx];

    if (stationPasscode.trim() !== requiredCode) {
      setPasscodeError('קוד אימות שגוי! קבלו מהמדריך בתחנה את הקוד הנכון.');
      return;
    }

    const nextIdx = currentIdx + 1;
    const finished = nextIdx >= STATIONS.length;

    // Save the thanks note if it was typed (for station 4)
    if (currentIdx === 3 && thankYouText.trim().length > 0) {
      await updateDoc(doc(db, 'teams', currentTeam.id), {
        thankYouNote: thankYouText.trim()
      });
    }

    // Update state in server
    await updateTeamStation(currentTeam.id, nextIdx, finished);
    
    // Trigger live notification
    const statName = STATIONS[currentIdx].title;
    const notifMsg = finished 
      ? `🏆 וואו! הזוג "${currentTeam.name}" סיים את המירוץ למיליון והגיע לקו הסיום! 🏆`
      : `⚡ הזוג "${currentTeam.name}" פתר את ${statName} והתקדם לתחנה הבאה! ⚡`;
    
    await sendNotification(currentTeam.name, currentIdx, notifMsg);
    
    // Reset local inputs
    setTextAnswer('');
    setAnswerError('');
    setSelectedTriviaOption(null);
    setTriviaError('');
    setThankYouText('');
    setStationPasscode('');
    setPasscodeError('');
  };

  const handleLeaveGroup = () => {
    setConfirmModal({
      isOpen: true,
      title: 'התנתקות וחיבור מחדש',
      message: 'האם לעזוב את הזוג הנוכחי ולחזור למסך הראשי כדי להתחבר מחדש?',
      type: 'warning',
      confirmText: 'כן, התנתק',
      cancelText: 'ביטול',
      onConfirm: () => {
        setConfirmModal(null);
        localStorage.removeItem('nave_nachum_team_id');
        setCurrentTeam(null);
        setRole('select');
      }
    });
  };

  // Top 3 Leaderboard extraction
  const podium = allTeams.slice(0, 3);

  // Dynamic Class lists and filter
  const uniqueClasses = Array.from(new Set(allTeams.map(t => t.classNumber).filter(Boolean))) as string[];
  const filteredTeams = selectedClassFilter === 'all'
    ? allTeams
    : allTeams.filter(t => t.classNumber === selectedClassFilter);

  return (
    <div className="min-h-screen text-slate-100 bg-[#0f172a] relative selection:bg-red-500 selection:text-white pb-12 font-sans" dir="rtl">
      {/* Visual background ambient color spots */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/85 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl text-white shadow-md shadow-red-600/20">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tight text-white font-display">
                המירוץ למיליון <span className="text-red-500">עתיד נווה נחום</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">מועצת התלמידים • שנת הלימודים 2026 • המירוץ הבית-ספרי</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {role !== 'select' && (
              <button
                onClick={() => {
                  if (role === 'guide') {
                    setIsAuthorizedGuide(false);
                  }
                  setRole('select');
                }}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 font-medium transition"
              >
                חזור לתפריט
              </button>
            )}
            
            {currentTeam && (
              <button
                onClick={handleLeaveGroup}
                className="text-xs bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-900/50 px-3 py-1.5 rounded-lg font-medium transition"
              >
                התחבר מחדש
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Real-time floating Notification Toast popup */}
      {activeToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-bounce">
          <div className="bg-gradient-to-r from-red-600 to-yellow-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3.5 border border-yellow-400">
            <span className="bg-white/20 p-2 rounded-xl text-yellow-300 font-bold shrink-0">חדש!</span>
            <span className="text-sm md:text-base font-bold text-center w-full">{activeToast}</span>
          </div>
        </div>
      )}

      {/* Countdown overlay panel */}
      {localCountdown !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center">
          <div className="text-center space-y-6 max-w-sm px-4">
            <span className="text-red-500 text-6xl md:text-7xl font-black tracking-widest font-display block select-none">
              הזנקה!
            </span>
            <div className="w-48 h-48 rounded-full bg-slate-900 border-4 border-red-500 flex items-center justify-center mx-auto shadow-2xl shadow-red-500/35">
              <span className="text-5xl md:text-7xl font-black text-yellow-400 animate-ping">
                {localCountdownText}
              </span>
            </div>
            <p className="text-lg text-slate-300 font-medium">
              חוק הברזל: <span className="text-red-400 font-bold">חל איסור מוחלט לרוץ במסדרונות!</span>
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 mt-6">

        {/* 1. SELECTION MAIN MENU */}
        {role === 'select' && (
          <div className="max-w-3xl mx-auto mt-10 md:mt-16 text-center space-y-8">
            <div className="space-y-4">
              <div className="inline-block px-4 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 font-bold text-sm">
                מטורף! מוכנים לצאת לדרך מטורפת? 🧭
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white font-display leading-tight">
                ברוכים הבאים למשחק <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
                  המירוץ למיליון של נווה נחום
                </span>
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-base">
                חוויה אינטראקטיבית מהירה ומלאת אקשן ברחבי בית הספר.
                התחלקו לזוגות, פתרו חידות ושתפו פעולה עם השומרי המורים כדי להגיע ראשונים לקו הסיום!
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Student option */}
              <button
                onClick={() => setRole('student')}
                className="bg-slate-800/60 hover:bg-slate-800 hover:border-red-500/80 border border-slate-700/60 rounded-3xl p-6 text-right transition-all group hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="bg-red-500 text-white p-3 rounded-2xl w-14 h-14 flex items-center justify-center mb-4 group-hover:scale-110 transition duration-200">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">אני תלמיד/ה משתתף</h3>
                <p className="text-sm text-slate-400">
                  הירשמו כזוג והמתינו להזנקה של מנהל המשחק ראשי כדי להתחיל את מסלול המירוץ.
                </p>
              </button>

              {/* Guide/Instructor option */}
              <button
                onClick={() => setRole('guide')}
                className="bg-slate-800/60 hover:bg-slate-800 hover:border-yellow-500/80 border border-slate-700/60 rounded-3xl p-6 text-right transition-all group hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="bg-yellow-500 text-slate-950 p-3 rounded-2xl w-14 h-14 flex items-center justify-center mb-4 group-hover:scale-110 transition duration-200">
                  <Tv className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">אני מדריך/ה ראשי</h3>
                <p className="text-sm text-slate-400">
                  נהל את רשימת הנרשמים, שגר את אות ההזנקה, עקוב אחרי לוח המובילים והתוצאות.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* 2. STUDENT LOGIN SCREEN */}
        {role === 'student' && !currentTeam && (
          <div className="max-w-md mx-auto bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 mt-10 shadow-xl">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white font-display">הרשמה והתחברות למירוץ</h3>
              <p className="text-xs text-slate-400">חברו מחדש לזוג שפתחתם או רשמו זוג מרוץ חדש</p>
            </div>

            {/* Tab selection */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => setStudentTab('register')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  studentTab === 'register' 
                    ? 'bg-red-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                הרשמת זוג חדש
              </button>
              <button
                type="button"
                onClick={() => setStudentTab('reconnect')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  studentTab === 'reconnect' 
                    ? 'bg-red-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                התחברות לזוג קיים
              </button>
            </div>

            {studentTab === 'register' ? (
              <form onSubmit={handleJoinTeam} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">השם שלך:</label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="לדוגמא: אורי דיין"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">שם בן/בת הזוג שלך:</label>
                  <input
                    type="text"
                    required
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="לדוגמא: עידו כהן"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">הכיתה שלכם:</label>
                  <input
                    type="text"
                    required
                    value={classNumber}
                    onChange={(e) => setClassNumber(e.target.value)}
                    placeholder="לדוגמא: ז׳3, ח׳1, ט׳2, סגל"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm text-center font-bold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-red-600/20 text-sm"
                >
                  התחברו ללובי המירוץ! 🚀
                </button>
              </form>
            ) : (
              <form onSubmit={handleReconnectToTeam} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">בחרו את הזוג שלכם מתוך הרשימה:</label>
                  <select
                    required
                    value={selectedTeamToReconnect}
                    onChange={(e) => setSelectedTeamToReconnect(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm"
                  >
                    <option value="">-- בחרו זוג מהרשימה --</option>
                    {allTeams.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100">
                        {t.name} (כיתה {t.classNumber || '?'}) — {t.currentStation === 6 ? '🏁 סיימו' : `📍 תחנה ${t.currentStation + 1}`}
                      </option>
                    ))}
                  </select>
                  {allTeams.length === 0 && (
                    <p className="text-slate-500 text-xs text-center mt-3">עדיין לא נרשמו זוגות למשחק.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!selectedTeamToReconnect}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-red-600/20 text-sm"
                >
                  התחבר מחדש והמשך במירוץ! ⚡
                </button>
              </form>
            )}

            <button
              onClick={() => setRole('select')}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition"
            >
              ביטול וחזרה
            </button>
          </div>
        )}

        {/* 3. STUDENT WAITING ROOM */}
        {role === 'student' && currentTeam && globalState.status === 'waiting' && (
          <div className="max-w-3xl mx-auto space-y-6 mt-6">
            <div className="bg-slate-900/70 border border-yellow-500/40 rounded-3xl p-6 text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>ממתינים להזנקה של המדריכים</span>
              </div>
              
              <h3 className="text-2xl md:text-3xl font-bold text-white font-display">
                שלום לצוות המנצח: <span className="text-yellow-400 font-black">{currentTeam.name}</span>
                {currentTeam.classNumber && <span className="text-lg text-slate-400 block mt-1">מכיתה: {currentTeam.classNumber}</span>}
              </h3>
              
              <p className="text-slate-300 max-w-md mx-auto text-sm leading-relaxed">
                אתם רשומים ומחוברים בהצלחה! השענו לאחור, אל תרוצו בינתיים, ובקרוב המדריך יזניק את המשחק עבור כל הכיתות ביחד.
              </p>

              {/* Connected Teams Count Badge */}
              <div className="bg-slate-800/60 p-4 rounded-2xl max-w-xs mx-auto border border-slate-700/50">
                <span className="text-3xl font-black text-white font-display block">
                  {allTeams.length}
                </span>
                <span className="text-xs text-slate-400">זוגות מחוברים בלובי</span>
              </div>
            </div>

            {/* List of joined users */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <h4 className="text-sm font-bold text-slate-300 mb-3.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span>החברים שמחוברים איתנו כרגע:</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {allTeams.map((team) => {
                  const isMe = team.id === currentTeam.id;
                  return (
                    <div
                      key={team.id}
                      className={`px-3 py-2.5 rounded-xl border text-sm text-center flex flex-col justify-center min-w-0 ${
                        isMe 
                          ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300 font-bold' 
                          : 'bg-slate-800/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="truncate block font-semibold">{team.name}</span>
                      {team.classNumber && (
                        <span className="text-[10px] text-slate-400 font-bold mt-0.5 block">
                          כיתה {team.classNumber}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 4. ACTIVE GAME SCREEN FOR STUDENT */}
        {role === 'student' && currentTeam && (globalState.status === 'active' || globalState.status === 'ended') && (
          <div className="grid lg:grid-cols-12 gap-6 mt-4">
            
            {/* LEFT / CENTER: Active Station Content (8cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {currentTeam.isCompleted ? (
                /* Completed Screen */
                <div className="bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
                  <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <Trophy className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white font-display">רגע של ניצחון והערצה! 🏆</h2>
                    <p className="text-emerald-400 font-bold text-lg">סיימתם את המירוץ למיליון של נווה נחום!</p>
                  </div>
                  
                  <div className="bg-slate-900/80 p-5 rounded-2xl max-w-sm mx-auto border border-emerald-500/20 space-y-3">
                    <p className="text-sm text-slate-300">
                      כל הכבוד לזוג החרוצים <strong className="text-white">{currentTeam.name}</strong> על פתרון כל ששת התחנות במהירות ובחכמה!
                    </p>
                    <p className="text-xs text-slate-400">
                      נא לחזור מיד ולשמור על השקט בכיתה, כרטיס המעבר שלכם אושר דיגיטלית במערכת.
                    </p>
                  </div>

                  <div className="text-xs text-yellow-500 font-mono animate-pulse">
                    עקבו אחרי הטבלה של השלישייה הראשונה המוצגת כעת על המסך!
                  </div>
                </div>
              ) : (
                /* Main Active Station view */
                (() => {
                  const currentIdx = currentTeam.currentStation;
                  const station = STATIONS[currentIdx];
                  if (!station) return <div className="text-white">טוען תחנה...</div>;

                  return (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                      {/* Station Title header */}
                      <div className="bg-gradient-to-r from-red-600 to-red-700 py-4 px-6 flex justify-between items-center text-white">
                        <div>
                          <span className="text-xs font-mono uppercase tracking-wider bg-black/20 px-2.5 py-1 rounded-full text-red-100 font-bold block mb-1 w-max">
                            תחנה {currentIdx + 1} מתוך 6
                          </span>
                          <h2 className="text-xl md:text-2xl font-black font-display">{station.title}</h2>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-300 font-medium text-xs bg-black/25 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span>מיקום: {station.location}</span>
                        </div>
                      </div>

                      {/* Station Instructions */}
                      <div className="p-6 space-y-6">
                        <div className="space-y-3">
                          <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                            <Info className="w-5 h-5 text-slate-400" />
                            <span>הנחיות התחנה:</span>
                          </h3>
                          <p className="text-slate-200 text-sm md:text-base leading-relaxed bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
                            {station.description}
                          </p>
                          {station.ruleWarning && (
                            <div className="bg-red-500/10 border border-red-500/40 p-3.5 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                              <span>{station.ruleWarning}</span>
                            </div>
                          )}
                        </div>

                        {/* Physical Task Guidelines and Completion Interface */}
                        <div className="border-t border-slate-800/60 pt-6 space-y-6">
                          <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
                            <div className="flex items-center gap-2.5 text-yellow-400 font-bold text-base">
                              <Sparkles className="w-5 h-5 text-yellow-400" />
                              <span>משימה פיזית בשטח</span>
                            </div>
                            
                            <p className="text-sm text-slate-300 leading-relaxed">
                              כל המשימות של המירוץ למיליון מתבצעות באופן <strong className="text-white">פיזי ומעשי</strong> ברחבי בית הספר על פי ההנחיות שלמעלה. 
                              שתפו פעולה עם חבריכם, קיימו את חוקי בית הספר, והפגינו ספורטיביות מנצחת!
                            </p>

                            {/* Additional specific guidelines based on the current station */}
                            {currentIdx === 0 && (
                              <div className="bg-slate-900/40 p-4 rounded-xl text-xs text-slate-400 space-y-1">
                                <p className="font-semibold text-yellow-400">💡 טיפ לתחנה 1:</p>
                                <p>אמרו שלום מנומס ושמרו על הכללים בקרבת שער בית הספר!</p>
                              </div>
                            )}

                            {currentIdx === 1 && (
                              <div className="bg-slate-900/40 p-4 rounded-xl text-xs text-slate-400 space-y-1.5">
                                <p className="font-semibold text-yellow-400">💡 טיפ לתחנה 2 (חידת קפיטריה):</p>
                                <p className="text-slate-250 bg-slate-950/45 p-3 rounded-lg border border-slate-800 font-mono mb-2">
                                  ”מסטיק עולה 2 ש״ח, ארטיק עולה 5 ש״ח. קנינו 10 פריטים ושילמנו 32 ש״ח. כמה ארטיקים קנינו בסך הכל?“
                                </p>
                                <p className="text-xs text-slate-400">חשבו את החידה ביחד או קבלו את התשובה מהמוכר/המדריך, ולאחר הביצוע המשיכו.</p>
                              </div>
                            )}

                            {currentIdx === 2 && (
                              <div className="bg-slate-900/40 p-4 rounded-xl text-xs text-slate-400 space-y-1">
                                <p className="font-semibold text-yellow-400">💡 טיפ לתחנה 3:</p>
                                <p>משימת הקואורדינציה מתבצעת אצל אבות הבית. שמרו על הסדר והסבלנות!</p>
                              </div>
                            )}

                            {currentIdx === 3 && (
                              <div className="bg-slate-900/40 p-4 rounded-xl text-xs text-slate-400 space-y-3">
                                <p className="font-semibold text-yellow-400">💡 מכתב תודה (תחנה 4):</p>
                                <p className="text-slate-300">בנוסף לתליית הפתק הפיזי שלכם במזכירות בית הספר, תוכלו לכתוב אותו בקצרה גם כאן, והוא יופיע באופן מיידי על גבי לוח המודעות הדיגיטלי של כל המדריכים:</p>
                                <textarea
                                  value={thankYouText}
                                  onChange={(e) => setThankYouText(e.target.value)}
                                  rows={2}
                                  placeholder="הקלידו את מכתב התודה לתצוגה בלוח המדריכים..."
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 text-xs font-medium leading-relaxed resize-none focus:outline-none focus:border-red-500"
                                />
                              </div>
                            )}

                            {currentIdx === 4 && (
                              <div className="bg-slate-900/40 p-4 rounded-xl text-xs text-slate-400 space-y-1">
                                <p className="font-semibold text-yellow-400">💡 טיפ לתחנה 5 (תפזורת מורים):</p>
                                <p>גשו לחדר המורים ופתרו את דף תפזורת המורים המודפס שקיבלתם. מצאו את המורים והשלימו!</p>
                              </div>
                            )}

                            {currentIdx === 5 && (
                              <div className="bg-slate-900/40 p-4 rounded-xl text-xs text-slate-400 space-y-1">
                                <p className="font-semibold text-yellow-400">💡 טיפ לתחנה 6 הסופית:</p>
                                <p>השיבו לשאלת המנהלת בחדר המנהלת או הציגו לה את משימותיכם לאורך המרוץ לאישור האחרון!</p>
                              </div>
                            )}

                            {/* Verification Code Form */}
                            <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-2xl space-y-2 mt-2">
                              <label className="block text-xs font-bold text-slate-300">
                                🔑 קוד אימות מהמדריך בתחנה הנוכחית:
                              </label>
                              <p className="text-[11px] text-slate-400">
                                בצעו את המשימה הפיזית וקבלו את קוד האימות הדיגיטלי מהמדריך הנוכחי בתחנה כדי להתקדם במירוץ.
                              </p>
                              <input
                                type="text"
                                pattern="[0-9]*"
                                inputMode="numeric"
                                maxLength={6}
                                value={stationPasscode}
                                onChange={(e) => {
                                  setStationPasscode(e.target.value);
                                  setPasscodeError('');
                                }}
                                placeholder="הקלידו כאן קוד בן 4 ספרות..."
                                className="w-full text-center bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white font-mono font-bold tracking-widest placeholder-slate-600 text-sm focus:outline-none focus:border-red-500"
                              />
                              {passcodeError && (
                                <p className="text-red-400 text-xs font-bold text-center mt-1 animate-pulse">
                                  {passcodeError}
                                </p>
                              )}
                            </div>

                            <div className="pt-2">
                              <button
                                onClick={handleSolveStation}
                                className="w-full bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-white font-black py-4 rounded-2xl transition duration-200 transform active:scale-95 shadow-xl shadow-red-600/20 text-sm md:text-base flex items-center justify-center gap-2"
                              >
                                <span>אמת קוד והמשך במירוץ ➔</span>
                                <ArrowRight className="w-5 h-5 shrink-0" />
                              </button>
                              <p className="text-[11px] text-slate-400 text-center mt-2">
                                הזנת הקוד מאשרת שסיימתם בהצלחה את התחנה הפיזית!
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* RIGHT: Real-time Leaderboards & Activity Log (4cols) */}
            <div className="lg:col-span-4 space-y-6">

              {/* Top 3 Live Rankings */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-yellow-500/15 p-1.5 rounded-lg">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-display">שלושת המקומות הראשונים</h3>
                </div>

                <div className="space-y-2.5">
                  {podium.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-2.5">ממתינים שקבוצות יירשמו...</p>
                  ) : (
                    podium.map((team, idx) => {
                      const isGold = idx === 0;
                      const isSilver = idx === 1;
                      const isBronze = idx === 2;

                      return (
                        <div
                          key={team.id}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                            isGold 
                              ? 'bg-yellow-500/10 border-yellow-500/35 text-yellow-300' 
                              : isSilver 
                              ? 'bg-slate-300/10 border-slate-400/20 text-slate-300' 
                              : 'bg-amber-700/15 border-amber-800/25 text-amber-500'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xl font-black font-display font-mono w-6 shrink-0 text-center">
                              {idx === 0 && '🥇'}
                              {idx === 1 && '🥈'}
                              {idx === 2 && '🥉'}
                            </span>
                            <div className="min-w-0 flex flex-col">
                              <span className="text-sm font-bold truncate">{team.name}</span>
                              {team.classNumber && (
                                <span className="text-[10px] text-slate-400 font-bold block">כיתה {team.classNumber}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-mono font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                              תחנה {team.currentStation === 6 ? '🏁 סיום' : team.currentStation + 1}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Progress Tracker (All other teams) */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  <ListOrdered className="w-3.5 h-3.5 text-slate-400" />
                  <span>מעקב התקדמות כללי ({allTeams.length} זוגות)</span>
                </h4>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {allTeams.map((team) => {
                    const progressPercent = Math.min((team.currentStation / 6) * 100, 100);
                    return (
                      <div key={team.id} className="text-xs space-y-1">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="truncate max-w-[150px] font-medium">
                            {team.name}
                            {team.classNumber && (
                              <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded mr-1">
                                {team.classNumber}
                              </span>
                            )}
                          </span>
                          <span className="font-semibold shrink-0">
                            {team.currentStation === 6 ? 'סיים!' : `תחנה ${team.currentStation + 1}`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${team.currentStation === 6 ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Actions Feed */}
              <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 font-mono">הזנות אחרונות מן השטח:</h4>
                <div className="space-y-2 divide-y divide-slate-800/60 max-h-40 overflow-y-auto">
                  {liveNotifications.length === 0 ? (
                    <p className="text-xxs text-slate-600 text-center py-2">האירועים יופיעו כאן בזמן אמת...</p>
                  ) : (
                    liveNotifications.map((notif) => (
                      <div key={notif.id} className="text-[11px] text-slate-300 pt-1.5 leading-normal">
                        {notif.message}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 5. INSTRUCTOR PASSWORD PAGE */}
        {role === 'guide' && !isAuthorizedGuide && (
          <div className="max-w-md mx-auto bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 mt-10 shadow-xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-yellow-500/10 text-yellow-400 rounded-xl flex items-center justify-center mx-auto mb-2">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white font-display">הרשאת כניסה למדריכים</h3>
              <p className="text-sm text-slate-400">הקלידו את קוד הגישה של המדריך הראשי (1234):</p>
            </div>

            <form onSubmit={handleAuthorizeGuide} className="space-y-4">
              <div>
                <input
                  type="password"
                  required
                  value={guidePassword}
                  onChange={(e) => setGuidePassword(e.target.value)}
                  placeholder="הזן קוד גישה..."
                  className="w-full text-center bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm"
                />
                {guideError && (
                  <p className="text-red-400 text-xs font-bold text-center mt-2">{guideError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg text-sm"
              >
                כניסה ללוח המדריך! 🔐
              </button>
            </form>
          </div>
        )}

        {/* 6. INSTRUCTOR CONTROL PANEL */}
        {role === 'guide' && isAuthorizedGuide && (
          <div className="max-w-5xl mx-auto space-y-6 mt-4">
            
            {/* Guide Admin Banner */}
            <div className="bg-slate-900/80 border border-yellow-500/30 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-white font-display">פאנל שליטה ומעקב מדריכים 📣</h2>
                <p className="text-xs text-slate-400">נהל את משחק "המירוץ למיליון נווה נחום" בקלות ובזמן אמת</p>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                {globalState.status === 'waiting' ? (
                  <button
                    onClick={handleStartGame}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-600/30 text-sm"
                  >
                    <Play className="w-4 h-4 shrink-0" />
                    <span>הפעל הזנקה מטורפת! (3.. 2.. 1.. צאו)</span>
                  </button>
                ) : (
                  <div className="flex-1 md:flex-none flex items-center gap-2 bg-red-650 text-white px-5 py-3 rounded-xl border border-red-500 font-bold text-sm">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>סטטוס: המשחק בשיאו! 🔥</span>
                  </div>
                )}

                <button
                  onClick={handleResetGame}
                  className="bg-red-950/40 hover:bg-red-900/50 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl transition flex items-center gap-1.5 text-xs font-bold shrink-0"
                  title="איפוס מוחלט של המשחק, הזוגות והניקוד"
                >
                  <RotateCcw className="w-4 h-4 text-red-400 shrink-0" />
                  <span>איפוס וניקוי המשחק</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-xs text-slate-400 block mb-1">זוגות מחוברים</span>
                <span className="text-3xl font-black text-yellow-400 font-display">{allTeams.length}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-xs text-slate-400 block mb-1">פעילים כרגע</span>
                <span className="text-3xl font-black text-red-400 font-display">
                  {allTeams.filter(t => t.currentStation > 0 && t.currentStation < 6).length}
                </span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-xs text-slate-400 block mb-1">סיימו בהצלחה</span>
                <span className="text-3xl font-black text-emerald-400 font-display">
                  {allTeams.filter(t => t.currentStation === 6).length}
                </span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-xs text-slate-400 block mb-1">לובי / הגדרות</span>
                <span className="text-3xl font-black text-blue-400 font-display font-mono">
                  {globalState.status === 'waiting' ? 'הכנה' : 'רץ'}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-12 gap-6">
              
              {/* Connected Teams Real-time Table */}
              <div className="md:col-span-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-slate-400" />
                    <span>מעקב זוגות ותחנות בזמן אמת ({filteredTeams.length})</span>
                  </h3>
                  
                  {/* Class Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">סנן לפי כיתה:</span>
                    <select
                      value={selectedClassFilter}
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      <option value="all">כל הכיתות (הכל)</option>
                      {uniqueClasses.map(cls => (
                        <option key={cls} value={cls}>כיתה {cls}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold bg-slate-800/30">
                        <th className="py-2.5 px-3">שם הזוג וכיתה</th>
                        <th className="py-2.5 px-3 text-center">תחנה נוכחית</th>
                        <th className="py-2.5 px-3 text-center">פתרונות</th>
                        <th className="py-2.5 px-3 text-left">מצב / אי פעילות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredTeams.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-slate-500">
                            ממתינים לצוותים שיתחברו...
                          </td>
                        </tr>
                      ) : (
                        filteredTeams.map((team) => {
                          const lastActiveDate = new Date(team.lastActive || team.joinedAt);
                          const diffMs = Date.now() - lastActiveDate.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          const isInactive = !team.isCompleted && diffMins >= 5;

                          return (
                            <tr 
                              key={team.id} 
                              className={`transition-all ${
                                isInactive 
                                  ? 'bg-red-950/20 text-slate-400 border-r-4 border-red-500 opacity-80 hover:bg-red-950/30' 
                                  : 'hover:bg-slate-800/30'
                              }`}
                            >
                              <td className="py-3.5 px-3">
                                <div className="font-semibold text-white flex items-center gap-2">
                                  <span>{team.name}</span>
                                  {team.classNumber && (
                                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold">
                                      כיתה {team.classNumber}
                                    </span>
                                  )}
                                </div>
                                {isInactive && (
                                  <div className="text-[11px] text-red-400 font-bold flex items-center gap-1 mt-1">
                                    <span>⚠️ לא פעיל מעל {diffMins} דקות! צוות תקוע?</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                {team.currentStation === 6 ? (
                                  <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">
                                    🏆 הגיעו לסוף!
                                  </span>
                                ) : (
                                  <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                                    isInactive ? 'bg-slate-900 border border-slate-700 text-slate-400' : 'bg-slate-800 text-slate-300'
                                  }`}>
                                    תחנה {team.currentStation + 1} - {STATIONS[team.currentStation]?.location}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-center font-bold tracking-wider font-mono text-slate-300">
                                {team.score} / 6
                              </td>
                              <td className="py-3.5 px-3 text-left">
                                {team.isCompleted ? (
                                  <span className="text-emerald-400 text-xs font-bold">הושלם! ✅</span>
                                ) : isInactive ? (
                                  <span className="text-red-400 text-xs font-bold animate-pulse">⚠️ דרוש סיוע מדריך</span>
                                ) : (
                                  <span className="text-yellow-500 text-xs font-medium">בדרך לפסגה ⚡</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Digital Bulletin Board for Thank You postcards! */}
              <div className="md:col-span-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-500/10 p-1.5 rounded-lg">
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-display">מכתבי תודה מהמזכירות 📝</h3>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {allTeams.filter(t => t.thankYouNote).length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      מכתבי התודה של זוגות שיפתרו את תחנה 4 יתחילו להופיע כאן!
                    </div>
                  ) : (
                    allTeams.filter(t => t.thankYouNote).map((team) => (
                      <div 
                        key={team.id}
                        className="bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/15 rounded-2xl p-3 text-xs leading-relaxed space-y-2 transition-all"
                      >
                        <div className="flex justify-between items-center text-yellow-400 font-bold border-b border-yellow-500/10 pb-1.5">
                          <span>מאת: {team.name}</span>
                          <ThumbsUp className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                        </div>
                        <p className="text-slate-200">
                          ”{team.thankYouNote}”
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Custom Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                confirmModal.type === 'danger' 
                  ? 'bg-red-500/15 text-red-450' 
                  : confirmModal.type === 'warning'
                  ? 'bg-yellow-500/15 text-yellow-500'
                  : 'bg-blue-500/15 text-blue-400'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1 text-right">
                <h3 className="text-xl font-bold text-white font-display">{confirmModal.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition"
              >
                {confirmModal.cancelText || 'ביטול'}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition ${
                  confirmModal.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-500'
                    : confirmModal.type === 'warning'
                    ? 'bg-yellow-500 hover:bg-yellow-450 text-slate-950'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert/Failure Modal */}
      {alertModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                alertModal.type === 'success' 
                  ? 'bg-emerald-500/15 text-emerald-450' 
                  : alertModal.type === 'error'
                  ? 'bg-red-500/15 text-red-450'
                  : 'bg-blue-500/15 text-blue-400'
              }`}>
                {alertModal.type === 'success' ? (
                  <Sparkles className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1 text-right">
                <h3 className="text-xl font-bold text-white font-display">{alertModal.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{alertModal.message}</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAlertModal(null)}
                className={`w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold transition text-center`}
              >
                סגור בשלום
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
