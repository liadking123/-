import React, { useState } from 'react';
import { CheckCircle2, Search, Sparkles } from 'lucide-react';

interface WordSearchTaskProps {
  onSuccess: () => void;
}

export default function WordSearchTask({ onSuccess }: WordSearchTaskProps) {
  const teachers = ["חיים", "רחל", "מיכל", "דניאל", "אורית"];
  
  // Custom pre-crafted grid
  const grid = [
    ['ח', 'י', 'י', 'מ', 'ש', 'מ', 'ו', 'א'],
    ['ר', 'ח', 'ל', 'א', 'ב', 'ג', 'ד', 'ה'],
    ['מ', 'י', 'כ', 'ל', 'ו', 'ז', 'ח', 'ט'],
    ['ד', 'נ', 'י', 'א', 'ל', 'י', 'כ', 'ל'],
    ['א', 'ו', 'ר', 'י', 'ת', 'נ', 'ס', 'ע'],
    ['ע', 'מ', 'ר', 'מ', 'ש', 'ה', 'ק', 'ר'],
    ['ז', 'ה', 'ב', 'ט', 'ו', 'פ', 'י', 'ע'],
    ['ת', 'ל', 'מ', 'י', 'ד', 'י', 'ם', '!']
  ];

  const [selectedCells, setSelectedCells] = useState<{ r: number; c: number }[]>([]);
  const [foundTeachers, setFoundTeachers] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState("");

  const handleCellClick = (r: number, c: number) => {
    // Check if cell is already selected
    const isAlreadySelected = selectedCells.some(cell => cell.r === r && cell.c === c);
    
    let newSelected;
    if (isAlreadySelected) {
      newSelected = selectedCells.filter(cell => !(cell.r === r && cell.c === c));
    } else {
      // Limit selection chain to make sure it is connected or just let them select any order
      newSelected = [...selectedCells, { r, c }];
    }
    
    setSelectedCells(newSelected);
    
    // Construct word from selection order
    const word = newSelected.map(cell => grid[cell.r][cell.c]).join("");
    const wordReverse = [...newSelected].reverse().map(cell => grid[cell.r][cell.c]).join("");
    
    setCurrentWord(word);

    // Check if word matches any teacher
    const matchedTeacher = teachers.find(t => 
      (t === word || t === wordReverse) && !foundTeachers.includes(t)
    );

    if (matchedTeacher) {
      const updatedFound = [...foundTeachers, matchedTeacher];
      setFoundTeachers(updatedFound);
      setSelectedCells([]); // clear selected
      setCurrentWord("");
      
      // Auto success when all 5 found
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
    // For testing/quick-run or emergencies
    onSuccess();
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur border border-red-500/30 rounded-2xl p-5 md:p-6 shadow-2xl relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2 text-yellow-400">
          <Search className="w-5 h-5 text-yellow-400" />
          <span>תפזורת מורים דיגיטלית</span>
        </h3>
        <span className="text-sm bg-slate-700 px-3 py-1 rounded-full text-slate-300 font-medium">
          אותרו: {foundTeachers.length} מתוך {teachers.length}
        </span>
      </div>

      <p className="text-sm text-slate-300 mb-4 text-center leading-relaxed">
        לחצו על האותיות בטבלה כדי להרכיב את שמות חמשת המורים הבאים:
      </p>

      {/* Teachers List status */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {teachers.map((teacher) => {
          const isFound = foundTeachers.includes(teacher);
          return (
            <span
              key={teacher}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all duration-300 ${
                isFound 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 line-through' 
                  : 'bg-slate-700 border border-slate-600 text-slate-200'
              }`}
            >
              {isFound && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {teacher}
            </span>
          );
        })}
      </div>

      {/* Current selection word text box */}
      <div className="mb-4 flex justify-between items-center bg-slate-900/90 py-2.5 px-4 rounded-xl border border-slate-700 min-h-[48px]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">המילה הנוכחית:</span>
          <span className="text-lg font-bold text-red-400 font-display tracking-widest">{currentWord || '---'}</span>
        </div>
        {currentWord && (
          <button
            onClick={clearSelection}
            className="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded text-red-300 transition"
          >
            נקה
          </button>
        )}
      </div>

      {/* The 8x8 Grid */}
      <div className="grid grid-cols-8 gap-1.5 justify-center max-w-sm mx-auto mb-6 aspect-square select-none">
        {grid.map((row, r) => 
          row.map((letter, c) => {
            const isSelected = selectedCells.some(cell => cell.r === r && cell.c === c);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={`w-full aspect-square flex items-center justify-center font-bold text-lg rounded-xl transition-all duration-150 ${
                  isSelected
                    ? 'bg-red-500 text-white shadow-lg scale-105 animate-pulse'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600/50'
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
          <span>כל הכבוד! פתרתם את התפזורת! מעבר לתחנה הבאה...</span>
        </div>
      ) : (
        <button
          onClick={handleBypass}
          className="w-full mt-4 py-2 hover:bg-slate-700/50 border border-dashed border-slate-600 text-xs text-slate-500 rounded-lg hover:text-slate-400 transition"
        >
          קושי למצוא את המורים? דלגו לתחנה הבאה (אישור מדריך)
        </button>
      )}
    </div>
  );
}
