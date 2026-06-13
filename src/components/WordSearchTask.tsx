import React, { useState } from 'react';
import { CheckCircle2, Search, Sparkles, HelpCircle } from 'lucide-react';

interface WordSearchTaskProps {
  onSuccess: () => void;
}

export default function WordSearchTask({ onSuccess }: WordSearchTaskProps) {
  const teachers = ["חיים", "רחל", "מיכל", "דניאל", "אורית", "יוסי", "גילה"];
  
  // Custom pre-crafted 10x10 grid containing vertical, horizontal, and reverse hidden teachers!
  const grid = [
    ['ש', 'ת', 'ח', 'י', 'י', 'מ', 'א', 'ב', 'ג', 'ד'],
    ['מ', 'צ', 'ל', 'מ', 'ר', 'ח', 'ל', 'ט', 'י', 'כ'],
    ['ז', 'ה', 'ב', 'ט', 'ו', 'פ', 'י', 'ע', 'י', 'ק'],
    ['כ', 'ד', 'נ', 'י', 'א', 'ל', 'מ', 'ס', 'ו', 'ל'],
    ['ס', 'ע', 'נ', 'ו', 'ה', 'ח', 'ק', 'ר', 'ס', 'ח'],
    ['פ', 'צ', 'ק', 'א', 'ו', 'ר', 'י', 'ת', 'י', 'ע'],
    ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י'],
    ['מ', 'י', 'כ', 'ל', 'כ', 'ל', 'ס', 'ש', 'ר', 'ת'],
    ['ק', 'ר', 'ש', 'פ', 'ו', 'ן', 'ס', 'מ', 'ע', 'ב'],
    ['נ', 'ס', 'ע', 'פ', 'צ', 'ה', 'ל', 'י', 'ג', 'מ']
  ];

  const [selectedCells, setSelectedCells] = useState<{ r: number; c: number }[]>([]);
  const [foundTeachers, setFoundTeachers] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState("");

  // Helper to normalize Hebrew letters (e.g. converting ם -> מ, ן -> נ, ך -> כ, ץ -> צ, ף -> פ) to overcome final/regular letter mismatches
  const normalizeHebrew = (str: string) => {
    return str
      .replace(/ם/g, 'מ')
      .replace(/ן/g, 'נ')
      .replace(/ך/g, 'כ')
      .replace(/ץ/g, 'צ')
      .replace(/ף/g, 'פ');
  };

  const handleCellClick = (r: number, c: number) => {
    // Check if cell is already selected
    const isAlreadySelected = selectedCells.some(cell => cell.r === r && cell.c === c);
    
    let newSelected;
    if (isAlreadySelected) {
      newSelected = selectedCells.filter(cell => !(cell.r === r && cell.c === c));
    } else {
      newSelected = [...selectedCells, { r, c }];
    }
    
    setSelectedCells(newSelected);
    
    // Construct word from selection order
    const word = newSelected.map(cell => grid[cell.r][cell.c]).join("");
    const wordReverse = [...newSelected].reverse().map(cell => grid[cell.r][cell.c]).join("");
    
    setCurrentWord(word);

    // Check if word matches any teacher using normalized Hebrew matching
    const normalizedWord = normalizeHebrew(word);
    const normalizedWordReverse = normalizeHebrew(wordReverse);

    const matchedTeacher = teachers.find(t => {
      const normalizedT = normalizeHebrew(t);
      return (normalizedT === normalizedWord || normalizedT === normalizedWordReverse) && !foundTeachers.includes(t);
    });

    if (matchedTeacher) {
      const updatedFound = [...foundTeachers, matchedTeacher];
      setFoundTeachers(updatedFound);
      setSelectedCells([]); // clear selected
      setCurrentWord("");
      
      // Auto success when all 7 found
      if (updatedFound.length === teachers.length) {
        setTimeout(() => {
          onSuccess();
        }, 800);
      }
    }
  };

  const clearSelection = () => {
    setSelectedCells([]);
    setCurrentWord("");
  };

  const handleBypass = () => {
    onSuccess();
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur border border-red-500/30 rounded-2xl p-5 md:p-6 shadow-2xl relative text-right">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2 text-yellow-400">
          <Search className="w-5 h-5 text-yellow-400" />
          <span>תפזורת מורים מורחבת • רמת קושי עילאית</span>
        </h3>
        <span className="text-sm bg-slate-905 px-3 py-1 rounded-full text-slate-300 font-bold border border-slate-700 decoration-clone shrink-0">
          אותרו: {foundTeachers.length} מתוך {teachers.length}
        </span>
      </div>

      <p className="text-xs md:text-sm text-slate-300 mb-4 leading-relaxed">
        לטובת קבלת החתימה בחדר מורים, עליכם לאתר את שמות שבעת המורים התורנים!
        <span className="text-orange-400 font-bold block mt-1">שימו לב: חלק מהשמות מסתתרים מלמעלה למטה, או משמאל לימין (הפוך)!</span>
      </p>

      {/* Teachers List status */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {teachers.map((teacher) => {
          const isFound = foundTeachers.includes(teacher);
          return (
            <span
              key={teacher}
              className={`px-2.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-all duration-300 ${
                isFound 
                  ? 'bg-emerald-500/20 text-emerald-405 border border-emerald-500/40 line-through' 
                  : 'bg-slate-900 border border-slate-850 text-slate-200'
              }`}
            >
              {isFound && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {teacher}
            </span>
          );
        })}
      </div>

      {/* Current selection word text box */}
      <div className="mb-4 flex justify-between items-center bg-slate-950/80 py-2.5 px-4 rounded-xl border border-slate-800 min-h-[48px]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-450">צירוף חיפוש נוכחי:</span>
          <span className="text-lg font-bold text-red-450 font-display tracking-widest">{currentWord || '---'}</span>
        </div>
        {currentWord && (
          <button
            onClick={clearSelection}
            className="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded text-red-350 font-bold transition"
          >
            נקה
          </button>
        )}
      </div>

      {/* The 10x10 Grid */}
      <div className="grid grid-cols-10 gap-1 md:gap-1.5 justify-center max-w-md mx-auto mb-6 aspect-square select-none">
        {grid.map((row, r) => 
          row.map((letter, c) => {
            const isSelected = selectedCells.some(cell => cell.r === r && cell.c === c);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={`w-full aspect-square flex items-center justify-center font-bold text-sm md:text-base rounded-lg transition-all duration-150 ${
                  isSelected
                    ? 'bg-red-500 text-white shadow-lg scale-105 animate-pulse'
                    : 'bg-slate-70 text-slate-100 border border-slate-750/50 hover:bg-slate-650'
                }`}
              >
                {letter}
              </button>
            );
          })
        )}
      </div>

      {foundTeachers.length === teachers.length ? (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-emerald-300 font-bold animate-pulse flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span>כל הכבוד מומחים! פתרתם את התפזורת המעצבנת ביותר! מעבר... 🚀</span>
        </div>
      ) : (
        <button
          onClick={handleBypass}
          className="w-full mt-4 py-2 hover:bg-slate-700/50 border border-dashed border-slate-700 text-[10px] text-slate-500 rounded-lg hover:text-slate-400 transition font-bold"
        >
          קושי למצוא את המורים? דלגו לתחנה הבאה (אישור מנחה קבוצה) 🛠️
        </button>
      )}
    </div>
  );
}
