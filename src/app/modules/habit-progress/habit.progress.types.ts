export type HabitCategory = 'Prayer' | 'Quran' | 'Dhikr' | 'Deeds';
export type ProgressView = 'overview' | 'detail';
export type ChartTab = 'weekly' | 'effective' | 'time';

export interface DayProgress {
  date: number;
  month: number;
  year: number;
  status: 'completed' | 'partial' | 'missed' | 'future' | 'empty';
  completedCount?: number;
  totalCount?: number;
}

export interface WeeklyBarData {
  day: string;
  value: number;
}

export interface CategoryProgress {
  category: HabitCategory;
  percentage: number;
  completedDays: number;
  missedDays: number;
  bestStreak: number;
  bestDays: string[];
  quietestDays: string[];
  weeklyData: WeeklyBarData[];
  calendarData: DayProgress[];
  completionThisWeek: number;
}

export interface OverallProgress {
  percentage: number;
  completedTotal: number;
  missedTotal: number;
  categoryBreakdown: { category: string; percentage: number }[];
  calendarData: DayProgress[];
}

export interface CategoryHabit extends CategoryProgress {
  id: string; 
  title: string; 
}