// /*

// import { Types } from 'mongoose';
// import { UserHabit, IUserHabit } from './userHabit.model'; // আপনার পাথ অনুযায়ী দিন
// import { HabitLog } from './habitLog.model';               // আপনার পাথ অনুযায়ী দিন
// import { 
//   OverallProgress, 
//   CategoryHabit, 
//   DayProgress, 
//   WeeklyBarData,
//   HabitCategory 
// } from '@/types/progress.types';

// // হেল্পার: একটি মাসের দিন গুলো জেনারেট করা
// const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

// // হেল্পার: ডেট থেকে দিনের নাম বের করা (Mon, Tue...)
// const getDayName = (date: Date): string => {
//   return date.toLocaleDateString('en-US', { weekday: 'short' });
// };

// export class ProgressService {
//   /**
//    * ওভারঅল প্রগ্রেস বের করার ফাংশন (All Tab)
//    */
//   static async getOverallProgress(userId: Types.ObjectId, year: number, month: number): Promise<OverallProgress> {
//     const habits = await UserHabit.find({ userId, isActive: true });
//     const startDate = new Date(year, month, 1);
//     const endDate = new Date(year, month, getDaysInMonth(year, month), 23, 59, 59);
    
//     const logs = await HabitLog.find({
//       userId,
//       date: { $gte: startDate, $lte: endDate }
//     });

//     const calendarData = this.buildOverallCalendar(logs, habits, year, month);
    
//     const totalDays = getDaysInMonth(year, month);
//     const today = new Date().getDate();
//     const passedDays = today <= totalDays ? today : totalDays;

//     // ক্যালেন্ডার থেকে টোটাল কমপ্লিটেড এবং মিসড বের করা
//     const completedTotal = calendarData.filter(d => d.status === 'completed').length;
//     const missedTotal = calendarData.filter(d => d.status === 'missed').length;
//     const percentage = passedDays > 0 ? Math.round((completedTotal / passedDays) * 100) : 0;

//     // ক্যাটাগরি অনুযায়ী ব্রেকডাউন
//     const categoryBreakdown = await this.getCategoryBreakdown(userId, year, month);

//     return {
//       percentage,
//       completedTotal,
//       missedTotal,
//       categoryBreakdown,
//       calendarData
//     };
//   }

//   /**
//    * নির্দিষ্ট ক্যাটাগরির নিচের হাবিট গুলোর প্রগ্রেস (Prayer, Quran Tab)
//    */
//   static async getCategoryHabits(userId: Types.ObjectId, category: HabitCategory, year: number, month: number): Promise<CategoryHabit[]> {
//     const habits = await UserHabit.find({ userId, category, isActive: true });
    
//     return Promise.all(habits.map(async (habit) => {
//       return this.calculateSingleHabitProgress(habit, year, month);
//     }));
//   }

//   // --- Private Helper Functions ---

//   private static async calculateSingleHabitProgress(habit: IUserHabit, year: number, month: number): Promise<CategoryHabit> {
//     const startDate = new Date(year, month, 1);
//     const endDate = new Date(year, month, getDaysInMonth(year, month), 23, 59, 59);

//     const logs = await HabitLog.find({
//       userHabitId: habit._id,
//       date: { $gte: startDate, $lte: endDate }
//     });

//     const totalDays = getDaysInMonth(year, month);
//     const today = new Date().getDate();
//     const passedDays = today <= totalDays ? today : totalDays;

//     const completedDays = logs.filter(l => l.status === 'Completed').length;
//     const missedDays = logs.filter(l => l.status === 'Skipped').length; // বা আপনার লজিক অনুযায়ী 'Missed'
//     const percentage = passedDays > 0 ? Math.round((completedDays / passedDays) * 100) : 0;

//     const calendarData = this.buildHabitCalendar(logs, year, month);
//     const weeklyData = this.calculateWeeklyData(logs, year, month);
    
//     // স্ট্রিক এবং বেস্ট/কোয়েটেস্ট ডে ক্যালকুলেশন (সহজ ভার্সন)
//     const { bestStreak, bestDays, quietestDays } = this.calculateStreaksAndDays(calendarData, year, month);
    
//     // এই সপ্তাহের কমপ্লিশন
//     const completionThisWeek = this.calculateCurrentWeekPercentage(logs);

//     return {
//       id: habit._id.toString(),
//       title: habit.name,
//       category: habit.category as HabitCategory,
//       percentage,
//       completedDays,
//       missedDays,
//       bestStreak,
//       bestDays,
//       quietestDays,
//       weeklyData,
//       calendarData,
//       completionThisWeek
//     };
//   }

//   private static buildOverallCalendar(logs: any[], habits: IUserHabit[], year: number, month: number): DayProgress[] {
//     const totalDays = getDaysInMonth(year, month);
//     const today = new Date();
//     const calendar: DayProgress[] = [];
//     const totalHabitsCount = habits.length;

//     for (let i = 1; i <= totalDays; i++) {
//       const currentDate = new Date(year, month, i);
      
//       // ভবিষ্যতের দিন
//       if (currentDate > today) {
//         calendar.push({ date: i, month, year, status: 'future' });
//         continue;
//       }

//       // আজকের দিন বা পূর্বের দিনের লগ ফিল্টার করা
//       const dayLogs = logs.filter(l => {
//         const logDate = new Date(l.date);
//         return logDate.getDate() === i && logDate.getMonth() === month && logDate.getFullYear() === year;
//       });

//       const completedCount = dayLogs.filter(l => l.status === 'Completed').length;

//       if (completedCount === totalHabitsCount && totalHabitsCount > 0) {
//         calendar.push({ date: i, month, year, status: 'completed', completedCount, totalCount: totalHabitsCount });
//       } else if (completedCount > 0) {
//         calendar.push({ date: i, month, year, status: 'partial', completedCount, totalCount: totalHabitsCount });
//       } else if (dayLogs.length > 0 || currentDate < today) {
//         calendar.push({ date: i, month, year, status: 'missed', completedCount: 0, totalCount: totalHabitsCount });
//       } else {
//         calendar.push({ date: i, month, year, status: 'empty' });
//       }
//     }
//     return calendar;
//   }

//   private static buildHabitCalendar(logs: any[], year: number, month: number): DayProgress[] {
//     const totalDays = getDaysInMonth(year, month);
//     const today = new Date();
//     const calendar: DayProgress[] = [];

//     for (let i = 1; i <= totalDays; i++) {
//       const currentDate = new Date(year, month, i);
//       if (currentDate > today) {
//         calendar.push({ date: i, month, year, status: 'future' });
//         continue;
//       }

//       const log = logs.find(l => {
//         const logDate = new Date(l.date);
//         return logDate.getDate() === i && logDate.getMonth() === month && logDate.getFullYear() === year;
//       });

//       if (log?.status === 'Completed') {
//         calendar.push({ date: i, month, year, status: 'completed', completedCount: 1, totalCount: 1 });
//       } else if (log?.status === 'Skipped' || (currentDate < today && !log)) {
//         calendar.push({ date: i, month, year, status: 'missed', completedCount: 0, totalCount: 1 });
//       } else {
//         calendar.push({ date: i, month, year, status: 'empty' });
//       }
//     }
//     return calendar;
//   }

//   private static calculateWeeklyData(logs: any[], year: number, month: number): WeeklyBarData[] {
//     // সপ্তাহের ৭ দিনের একটি ফরম্যাট তৈরি করা হলো
//     const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//     const totalDays = getDaysInMonth(year, month);
//     const today = new Date().getDate();
    
//     // প্রতিদিনের কমপ্লিশন ম্যাপিং
//     const dayWiseCompletion: Record<string, { completed: number, total: number }> = {};

//     for (let i = 1; i <= (today <= totalDays ? today : totalDays); i++) {
//       const date = new Date(year, month, i);
//       const dayName = weekDays[date.getDay()]; // 'Mon', 'Tue' etc.
      
//       if (!dayWiseCompletion[dayName]) dayWiseCompletion[dayName] = { completed: 0, total: 0 };
      
//       const isCompleted = logs.some(l => {
//         const logDate = new Date(l.date);
//         return logDate.getDate() === i && l.status === 'Completed';
//       });

//       if (isCompleted) dayWiseCompletion[dayName].completed++;
//       dayWiseCompletion[dayName].total++;
//     }

//     // শুধুমাত্র ওই দিনগুলো রিটার্ন করা হলো যেগুলো মাসে এসেছে (অথবা আপনি চাইলে সব দিন 0 দিয়ে রাখতে পারেন)
//     return weekDays.map(day => ({
//       day,
//       value: dayWiseCompletion[day] && dayWiseCompletion[day].total > 0
//         ? Math.round((dayWiseCompletion[day].completed / dayWiseCompletion[day].total) * 100)
//         : 0
//     })).filter(d => d.value > 0 || true); // true দিয়ে সব দিন দেখানো হচ্ছে
//   }

//   private static calculateStreaksAndDays(calendarData: DayProgress[], year: number, month: number) {
//     let bestStreak = 0, currentStreak = 0;
//     const dayStats: Record<string, number> = {};

//     calendarData.forEach(day => {
//       const dateObj = new Date(year, month, day.date);
//       const dayName = getDayName(dateObj);
      
//       if (!dayStats[dayName]) dayStats[dayName] = 0;

//       if (day.status === 'completed') {
//         currentStreak++;
//         bestStreak = Math.max(bestStreak, currentStreak);
//         dayStats[dayName] += 100;
//       } else if (day.status === 'missed') {
//         currentStreak = 0;
//         dayStats[dayName] += 0;
//       } else if (day.status === 'partial') {
//         currentStreak = 0;
//         dayStats[dayName] += 50;
//       }
//     });

//     // বেস্ট এবং কোয়েটেস্ট ডে বের করা
//     let maxAvg = -1, minAvg = 101;
//     let bestDays: string[] = [], quietestDays: string[] = [];
    
//     const dayCounts: Record<string, number> = {};
//     calendarData.filter(d => d.status !== 'future' && d.status !== 'empty').forEach(d => {
//       const dayName = getDayName(new Date(year, month, d.date));
//       dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
//     });

//     for (const [day, totalScore] of Object.entries(dayStats)) {
//       const count = dayCounts[day] || 1;
//       const avg = totalScore / count;
      
//       if (avg > maxAvg) { maxAvg = avg; bestDays = [day]; }
//       else if (avg === maxAvg) bestDays.push(day);

//       if (avg < minAvg) { minAvg = avg; quietestDays = [day]; }
//       else if (avg === minAvg) quietestDays.push(day);
//     }

//     return { bestStreak, bestDays, quietestDays };
//   }

//   private static calculateCurrentWeekPercentage(logs: any[]): number {
//     const now = new Date();
//     const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
//     const startOfWeek = new Date(now);
//     startOfWeek.setDate(now.getDate() - dayOfWeek);
//     startOfWeek.setHours(0, 0, 0, 0);

//     const weekLogs = logs.filter(l => new Date(l.date) >= startOfWeek);
//     const completedInWeek = weekLogs.filter(l => l.status === 'Completed').length;
    
//     // আজ পর্যন্ত কয়টা দিন পার হয়েছে (Sunday=1, Monday=2...)
//     const daysPassedThisWeek = dayOfWeek + 1; 
    
//     return daysPassedThisWeek > 0 ? Math.round((completedInWeek / daysPassedThisWeek) * 100) : 0;
//   }

//   private static async getCategoryBreakdown(userId: Types.ObjectId, year: number, month: number) {
//     const categories: HabitCategory[] = ['Prayer', 'Quran', 'Dhikr', 'Deeds'];
//     const breakdown = [];

//     for (const cat of categories) {
//       const habits = await UserHabit.find({ userId, category: cat, isActive: true });
//       const habitIds = habits.map(h => h._id);
      
//       const startDate = new Date(year, month, 1);
//       const endDate = new Date(year, month, getDaysInMonth(year, month), 23, 59, 59);
      
//       const logs = await HabitLog.find({ userHabitId: { $in: habitIds }, date: { $gte: startDate, $lte: endDate } });
      
//       // এখানে সহজ লজিক: মোট কমপ্লিটেড লগ / মোট হাবিট * পার হওয়া দিন
//       const today = new Date().getDate();
//       const passedDays = today <= getDaysInMonth(year, month) ? today : getDaysInMonth(year, month);
//       const totalPossibleLogs = habits.length * passedDays;
//       const completedLogs = logs.filter(l => l.status === 'Completed').length;
      
//       const percentage = totalPossibleLogs > 0 ? Math.round((completedLogs / totalPossibleLogs) * 100) : 0;
      
//       breakdown.push({ category: cat, percentage });
//     }

//     return breakdown;
//   }
// }

// */