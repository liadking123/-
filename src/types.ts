export interface GameState {
  status: 'waiting' | 'countdown' | 'active' | 'ended';
  countdown: number; // 3, 2, 1, 0
  startedAt?: string;
  launchedClasses?: string[]; // E.g. ['ז\'1', 'ז\'2']
}

export interface Team {
  id: string;
  name: string;
  classNumber?: string; // e.g. ח'2
  currentStation: number; // -1 = waiting, 0 = Station 1, ..., 5 = Station 6 (Final), 6 = Finished
  score: number; // number of stations solved (0 to 6)
  isCompleted: boolean;
  completedAt?: string;
  lastActive: string;
  joinedAt: string;
  thankYouNote?: string;
  memoryStationMatches?: number;
  memoryFinishedAt?: string;
}

export interface NotificationMsg {
  id: string;
  teamName: string;
  stationIndex: number;
  message: string;
  createdAt: string;
}

export interface Station {
  index: number;
  title: string;
  location: string;
  imageAlt: string;
  description: string;
  ruleWarning?: string;
  taskType: 'memory' | 'math' | 'coordination' | 'thanks' | 'wordsearch' | 'trivia';
}

export const STATIONS: Station[] = [
  {
    index: 0,
    title: "תחנה 1 - ביתן השומר",
    location: "שער בית הספר",
    imageAlt: "ביתן השומר",
    description: "עמדו מול השומר, בצעו את משימת הזיכרון החזותי שיופיעה לכם במסך וקבלו את הרמז הבא! התנהגו בכבוד ובנימוס לשומר בית הספר!",
    taskType: 'memory'
  },
  {
    index: 1,
    title: "תחנה 2 - קפיטריה בית הספר",
    location: "קפיטריה",
    imageAlt: "קפיטריה בית הספר",
    description: "פתרו את חידת המסטיקים והארטיקים המפורסמת כדי לקבל את הרמז הבא מהמוכר בקפיטריה! שימו לב: אל תקנו שום דבר בינתיים, המירוץ בעיצומו!",
    ruleWarning: "חל איסור מוחלט לקנות דברים במהלך המירוץ!",
    taskType: 'math'
  },
  {
    index: 2,
    title: "תחנה 3 - חדר אבות הבית",
    location: "חדר אבות הבית",
    imageAlt: "חדר אבות הבית",
    description: "בצעו את משימת הקואורדינציה העדינה בסבלנות מוחלטת! העריכו את העבודה הקשה והיומיומית של צוות אבות הבית המסור!",
    taskType: 'coordination'
  },
  {
    index: 3,
    title: "תחנה 4 - המזכירות הגדולה",
    location: "המזכירות",
    imageAlt: "המזכירות הגדולה",
    description: "כתבו מילת תודה או ברכה מרגשת לצוות בית הספר ותלו אותה על לוח המודעות במזכירות! פתק ברכה אחד בלבד לכל זוג! (כתבו את הברכה שלכם גם כאן בתיבה למטה כדי להמשיך)",
    taskType: 'thanks'
  },
  {
    index: 4,
    title: "תחנה 5 - חדר המורים",
    location: "חדר המורים",
    imageAlt: "חדר המורים",
    description: "קבלו מהמורה התורן דף תפזורת מורים מיוחד, ומצאו את 5 שמות המורים התורנים במהירות גם בתפזורת הדיגיטלית שלמטה! שמרו על שקט מופתי! הכניסה לחדר המורים באישור בלבד!",
    taskType: 'wordsearch'
  },
  {
    index: 5,
    title: "תחנה 6 - חדר המנהלת",
    location: "חדר המנהלת",
    imageAlt: "חדר המנהלת (תחנה סופית)",
    description: "ענו נכון על שאלת הטריוויה הבית-ספרית של המנהלת לקבלת כרטיס הסיום חזרה לכיתה! מי יהיה הזוג המנצח שיגיע ראשון חזרה לכיתה?",
    taskType: 'trivia'
  }
];
