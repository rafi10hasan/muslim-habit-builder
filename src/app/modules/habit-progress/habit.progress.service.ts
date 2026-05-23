import moment from "moment-timezone";
import { HabitLog } from "../habit-logs/habit.log.model";
import { UserHabit } from "../user-habit/user.habit.model";
import { buildDateBasedOnTimeZone } from "../user-habit/user.habit.utils";
import { IUser } from "../user/user.interface";



// get Combined Progress and Analytics (For Future Use - Master Endpoint For All Data In One Go)

const getCombinedProgressAndAnalytics = async (
    user: IUser, 
    query: { year?: string; month?: string; category?: string; analyticsView?: string }
) => {
    try {
        const userId = user._id;
        const { category = 'all', analyticsView = 'week' } = query;

        // 🚀 User Registration Date Tracking (Format: 'YYYY-MM-DD')
        const userRegisterDateStr = moment(user.createdAt).format('YYYY-MM-DD');

        const currentDeviceTodayStr = buildDateBasedOnTimeZone(user.timezone as string);
        const currentDeviceMoment = moment(currentDeviceTodayStr, 'YYYY-MM-DD');

        const year = query.year ? query.year : '2026';
        const month = query.month ? String(query.month).padStart(2, '0') : currentDeviceMoment.format('MM');

        const targetMonthPrefix = `${year}-${month}`;
        const todayStr = currentDeviceTodayStr;
        const referenceMoment = moment(todayStr, 'YYYY-MM-DD');

        const normalizeCategory = (catStr: string) => {
            const lower = catStr.toLowerCase().trim();
            if (lower === 'prayer') return 'Prayer';
            if (lower === 'quran' || lower === "qur'an") return 'Quran';
            if (lower === 'dhikr' || lower === 'adhkar') return 'Dhikr';
            if (lower === 'deeds' || lower === 'connect') return 'Deeds';
            return catStr;
        };

        const targetCategoryNormalized = normalizeCategory(category);

        // ─────────────────────────────────────────────────────────
        // 🎯 SCENARIO B: SPECIFIC CATEGORY TAB SELECTED
        // ─────────────────────────────────────────────────────────
        if (targetCategoryNormalized !== 'all' && targetCategoryNormalized !== '') {
            const targetedCategoryHabits = await UserHabit.find({
                user: userId,
                category: { $regex: `^${targetCategoryNormalized}$`, $options: 'i' }
            })
            .select('_id name')
            .lean();

            return {
                viewMode: 'CATEGORY_HABITS', //
                categoryName: targetCategoryNormalized,
                habits: targetedCategoryHabits //
            };
        }

        // ─────────────────────────────────────────────────────────
        // 🎯 SCENARIO A: 'ALL' TAB SELECTED
        // ─────────────────────────────────────────────────────────
        const activeHabits = await UserHabit.find({ user: userId, isActive: true }).lean();
        const totalUserActiveHabitsCount = activeHabits.length;

        // 🚀 MODULE A: TODAY'S PROGRESS OVERVIEW
        const todayLogs = await HabitLog.find({ user: userId, date: todayStr }).lean();

        let categoryStats = {
            Prayer: { total: 0, completed: 0 },
            Quran: { total: 0, completed: 0 },
            Dhikr: { total: 0, completed: 0 },
            Deeds: { total: 0, completed: 0 }
        };

        let todayOverallCompleted = 0;
        let todayOverallMissed = 0;

        activeHabits.forEach((h: any) => {
            const cat = normalizeCategory(h.category);
            const logFound = todayLogs.find((l: any) => l.userHabit.toString() === h._id.toString());
            const currentStatus = logFound ? logFound.status : 'Pending';

            if (categoryStats[cat as keyof typeof categoryStats]) {
                categoryStats[cat as keyof typeof categoryStats].total += 1;
                if (currentStatus === 'Completed') {
                    categoryStats[cat as keyof typeof categoryStats].completed += 1;
                    todayOverallCompleted += 1;
                } else {
                    todayOverallMissed += 1;
                }
            }
        });

        const getRatio = (completed: number, total: number) => total > 0 ? Math.round((completed / total) * 100) : 0;

        const overviewCard = {
            overallPercentage: getRatio(todayOverallCompleted, totalUserActiveHabitsCount), //
            counters: {
                completed: todayOverallCompleted, //
                missed: todayOverallMissed        //
            },
            categories: {
                Prayer: getRatio(categoryStats.Prayer.completed, categoryStats.Prayer.total), //
                Quran: getRatio(categoryStats.Quran.completed, categoryStats.Quran.total),   //
                Adhkar: getRatio(categoryStats.Dhikr.completed, categoryStats.Dhikr.total),   //
                Connect: getRatio(categoryStats.Deeds.completed, categoryStats.Deeds.total)   //
            }
        };

        // 🚀 MODULE B: MONTHLY CALENDAR GRID STATUS
        const monthlyLogs = await HabitLog.find({
            user: userId,
            date: { $regex: `^${targetMonthPrefix}` }
        }).lean();

        const dayGrouping = monthlyLogs.reduce((acc: any, log: any) => {
            const dateKey = log.date;
            if (!acc[dateKey]) acc[dateKey] = 0;
            if (log.status === 'Completed') acc[dateKey] += 1;
            return acc;
        }, {});

        const daysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate(); 
        const calendarGrid = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const currentFormattedDate = `${targetMonthPrefix}-${String(d).padStart(2, '0')}`;
            const completedCount = dayGrouping[currentFormattedDate] ?? 0;

            const ratio = totalUserActiveHabitsCount > 0 ? Math.round((completedCount / totalUserActiveHabitsCount) * 100) : 0;
            let statusLabel = 'Missed';

            // 🚀 PROTECTION BLOCK: Future Date OR Registration er purborborti date hole straight Blank string!
            if (currentFormattedDate > todayStr || currentFormattedDate < userRegisterDateStr) {
                statusLabel = ''; //
            } else {
                if (ratio >= 60) statusLabel = 'Good'; //
                else if (ratio >= 20 && ratio < 60) statusLabel = 'Partial'; //
            }

            calendarGrid.push({
                date: currentFormattedDate,
                day: d,
                completionRatio: (currentFormattedDate > todayStr || currentFormattedDate < userRegisterDateStr) ? 0 : ratio, //
                status: statusLabel //
            });
        }

        // 🚀 MODULE C: LOWER SECTION ANALYTICS GRAPHS DATA
        let analyticsGraphData: any = {};
        const getLabelByRatio = (r: number) => {
            if (r >= 60) return 'Good';
            if (r >= 20) return 'Partial';
            return 'Missed';
        };

        // 📊 Sub-Case 1: Week Data Block
        if (analyticsView === 'week') {
            const startOfWeek = referenceMoment.clone().startOf('week'); 
            const weeklyMetrics = [];
            let maxCompleted = 0, bestDay = 'N/A';

            for (let i = 0; i < 7; i++) {
                const currentDay = startOfWeek.clone().add(i, 'days');
                const dayStr = currentDay.format('YYYY-MM-DD');
                const dayShortName = currentDay.format('ddd'); //

                // 🚀 FUTURE DATES & BEFORE REGISTRATION PROTECTION
                if (dayStr > todayStr || dayStr < userRegisterDateStr) {
                    weeklyMetrics.push({
                        label: dayShortName,
                        habitsCompletedCount: 0,
                        completionRatio: 0,
                        status: "" // Clear validation text
                    });
                    continue;
                }

                const completedCount = await HabitLog.countDocuments({ user: userId, date: dayStr, status: 'Completed' });
                const ratio = totalUserActiveHabitsCount > 0 ? Math.round((completedCount / totalUserActiveHabitsCount) * 100) : 0;

                if (completedCount > maxCompleted) {
                    maxCompleted = completedCount;
                    bestDay = dayShortName; 
                }

                weeklyMetrics.push({
                    label: dayShortName, //
                    habitsCompletedCount: completedCount, //
                    completionRatio: ratio,
                    status: getLabelByRatio(ratio)
                });
            }
            analyticsGraphData = { viewType: 'week', bestDisplayLabel: `Best Day: ${bestDay}`, metrics: weeklyMetrics }; //
        }

        // 📊 Sub-Case 2: Month Data Block
        if (analyticsView === 'month') {
            const currentYearStr = year; 
            const monthlyMetrics = [];
            let maxMonthlyDays = 0, bestMonth = 'N/A';
            const currentMonthStartStr = referenceMoment.clone().startOf('month').format('YYYY-MM-DD');
            const userRegisterMonthStartStr = moment(userRegisterDateStr).startOf('month').format('YYYY-MM-DD');

            for (let m = 1; m <= 12; m++) {
                const prefix = `${currentYearStr}-${String(m).padStart(2, '0')}`;
                const firstDayOfMonthStr = `${prefix}-01`;
                const monthShortLabel = moment().month(m - 1).format('Jan'); //

                // 🚀 FUTURE MONTHS & MONTHS BEFORE REGISTRATION PROTECTION
                if ((firstDayOfMonthStr > currentMonthStartStr && currentYearStr === '2026') || 
                    (firstDayOfMonthStr < userRegisterMonthStartStr)) {
                    monthlyMetrics.push({
                        label: monthShortLabel,
                        daysCompletedCount: 0,
                        completionRatio: 0,
                        status: ""
                    });
                    continue;
                }

                const monthlyCompletedLogs = await HabitLog.find({ user: userId, date: { $regex: `^${prefix}` }, status: 'Completed' }).lean();
                const totalDaysCompletedInMonth = new Set(monthlyCompletedLogs.map((l: any) => l.date)).size;

                const totalDaysInMonth = new Date(parseInt(currentYearStr, 10), m, 0).getDate();
                const mRatio = totalDaysInMonth > 0 ? Math.round((totalDaysCompletedInMonth / totalDaysInMonth) * 100) : 0;

                if (totalDaysCompletedInMonth > maxMonthlyDays) {
                    maxMonthlyDays = totalDaysCompletedInMonth;
                    bestMonth = moment().month(m - 1).format('MMMM'); //
                }

                monthlyMetrics.push({
                    label: monthShortLabel, //
                    daysCompletedCount: totalDaysCompletedInMonth, //
                    completionRatio: mRatio,
                    status: getLabelByRatio(mRatio)
                });
            }
            analyticsGraphData = { viewType: 'month', bestDisplayLabel: `Best Month: ${bestMonth}`, metrics: monthlyMetrics }; //
        }

        // 📊 Sub-Case 3: Year Data Block
        if (analyticsView === 'year') {
            const activeYear = parseInt(year, 10);
            const yearlyMetrics = [];
            let maxYearlyDays = 0, bestYear = 'N/A';
            const baseStartYear = activeYear - 3; 
            const userRegisterYear = moment(userRegisterDateStr).year();

            for (let offset = 0; offset < 4; offset++) {
                const queryYear = baseStartYear + offset;
                const yearStringLabel = String(queryYear); //

                // 🚀 FUTURE YEARS & YEARS BEFORE REGISTRATION PROTECTION
                if (queryYear > referenceMoment.year() || queryYear < userRegisterYear) {
                    yearlyMetrics.push({
                        label: yearStringLabel,
                        daysCompletedCount: 0,
                        completionRatio: 0,
                        status: ""
                    });
                    continue;
                }

                const yearlyCompletedLogs = await HabitLog.find({ user: userId, date: { $regex: `^${queryYear}` }, status: 'Completed' }).lean();
                const uniqueCompletedDays = new Set(yearlyCompletedLogs.map((l: any) => l.date)).size;

                const totalDaysInYear = (queryYear % 4 === 0 && queryYear % 100 !== 0) || (queryYear % 400 === 0) ? 366 : 365;
                const yRatio = Math.round((uniqueCompletedDays / totalDaysInYear) * 100);

                if (uniqueCompletedDays > maxYearlyDays) {
                    maxYearlyDays = uniqueCompletedDays;
                    bestYear = yearStringLabel;
                }

                yearlyMetrics.push({
                    label: yearStringLabel, //
                    daysCompletedCount: uniqueCompletedDays, //
                    completionRatio: yRatio,
                    status: getLabelByRatio(yRatio)
                });
            }
            analyticsGraphData = { viewType: 'year', bestDisplayLabel: `Best Year: ${bestYear}`, metrics: yearlyMetrics }; //
        }

        return {
            viewMode: 'GLOBAL_OVERVIEW',
            progressOverview: overviewCard,
            calendarHistoryGrid: calendarGrid,
            analyticsCharts: analyticsGraphData //
        };

    } catch (error: any) {
        throw new Error(`Failed to process master progress panel dataset matrix: ${error.message}`);
    }
};



// get individual habit analytics
const getIndividualHabitAnalytics = async (
    user: IUser, 
    habitId: string, 
    query: { year?: string; month?: string }
) => {
    try {
        const userId = user._id;

        // 🚀 User account creation timeline reference
        const userRegisterDateStr = moment(user.createdAt).format('YYYY-MM-DD');

        // Current real-time layout snapshot reference benchmarks
        const currentDeviceTodayStr = buildDateBasedOnTimeZone(user.timezone as string);
        const currentDeviceMoment = moment(currentDeviceTodayStr, 'YYYY-MM-DD');

        const year = query.year ? query.year : '2026';
        const month = query.month ? String(query.month).padStart(2, '0') : currentDeviceMoment.format('MM');

        const targetMonthPrefix = `${year}-${month}`;
        const todayStr = currentDeviceTodayStr;

        // Verify habit resource configuration constraints existence first
        const trackingHabit = await UserHabit.findOne({ _id: habitId, user: userId }).lean();
        if (!trackingHabit) {
            throw new Error('Requested user tracking habit structure target reference not found.');
        }

        // ─────────────────────────────────────────────────────────
        // 📊 MODULE 1: COMPLETION THIS CURRENT RUNNING WEEK (Top Bar Metric)
        // ─────────────────────────────────────────────────────────
        const startOfCurrentWeekStr = currentDeviceMoment.clone().startOf('week').format('YYYY-MM-DD');
        const endOfCurrentWeekStr = currentDeviceMoment.clone().endOf('week').format('YYYY-MM-DD');

        // Limit range calculations query parameters bounded safely within registration snapshot timeline rules
        const effectiveWeekStartStr = startOfCurrentWeekStr < userRegisterDateStr ? userRegisterDateStr : startOfCurrentWeekStr;

        let totalEligibleWeekDays = 0;
        let runningWeekIter = moment(effectiveWeekStartStr, 'YYYY-MM-DD');
        const currentWeekEndMoment = moment(endOfCurrentWeekStr, 'YYYY-MM-DD');

        while (runningWeekIter.isSameOrBefore(currentWeekEndMoment)) {
            const dateStr = runningWeekIter.format('YYYY-MM-DD');
            if (dateStr <= todayStr) {
                totalEligibleWeekDays++;
            }
            runningWeekIter.add(1, 'day');
        }

        const currentWeekCompletedLogsCount = await HabitLog.countDocuments({
            user: userId,
            userHabit: habitId,
            date: { $gte: effectiveWeekStartStr, $lte: todayStr },
            status: 'Completed'
        });

        const currentWeekCompletionRatio = totalEligibleWeekDays > 0 
            ? Math.round((currentWeekCompletedLogsCount / totalEligibleWeekDays) * 100) 
            : 0;

        // ─────────────────────────────────────────────────────────
        // 📊 MODULE 2: SPECIFIC SINGLE HABIT MONTHLY CALENDAR GRID
        // ─────────────────────────────────────────────────────────
        const monthlyHabitLogs = await HabitLog.find({
            user: userId,
            userHabit: habitId,
            date: { $regex: `^${targetMonthPrefix}` }
        }).lean();

        const logStatusLookupMap = new Map<string, any>(monthlyHabitLogs.map((l: any) => [l.date, l.status]));

        const daysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate(); 
        const calendarHistoryGrid = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const currentFormattedDate = `${targetMonthPrefix}-${String(d).padStart(2, '0')}`;
            const dbLoggedStatus = logStatusLookupMap.get(currentFormattedDate);

            let calculatedStatus = 'Missed'; // Default fallback status

            if (currentFormattedDate > todayStr || currentFormattedDate < userRegisterDateStr) {
                calculatedStatus = ''; // Future or pre-registration disabled zone mapping rules
            } else if (dbLoggedStatus) {
                calculatedStatus = dbLoggedStatus; // 'Completed' or 'Missed' directly mapped from DB
            }

            calendarHistoryGrid.push({
                date: currentFormattedDate,
                day: d,
                status: calculatedStatus // Exact match field string 'Completed' | 'Missed' | ''
            });
        }

        // ─────────────────────────────────────────────────────────
        // 📊 MODULE 3: EXTENSIVE OVERALL LIFETIME BREAKDOWN ANALYTICS CARD
        // ─────────────────────────────────────────────────────────
        // Query completely bound past track sequences filtered safely from the user registration initialization line
        const absoluteActiveLifetimeLogs = await HabitLog.find({
            user: userId,
            userHabit: habitId,
            date: { $gte: userRegisterDateStr, $lte: todayStr }
        }).sort({ date: 1 }).lean();

        let totalCompletedCount = 0;
        let totalMissedCount = 0;

        // Weekday tracking dictionaries initialization setup matrix
        const weekdayFrequencyWeightMap: Record<string, { completed: number; total: number }> = {
            'Monday': { completed: 0, total: 0 },
            'Tuesday': { completed: 0, total: 0 },
            'Wednesday': { completed: 0, total: 0 },
            'Thursday': { completed: 0, total: 0 },
            'Friday': { completed: 0, total: 0 },
            'Saturday': { completed: 0, total: 0 },
            'Sunday': { completed: 0, total: 0 }
        };

        // Populate database execution log metrics map
        const logsDateIndexedMap = new Map<string, any>(absoluteActiveLifetimeLogs.map((l: any) => [l.date, l.status]));

        let analysisDayIterator = moment(userRegisterDateStr, 'YYYY-MM-DD');
        const activeTodayMoment = moment(todayStr, 'YYYY-MM-DD');

        while (analysisDayIterator.isSameOrBefore(activeTodayMoment)) {
            const loopDateKeyStr = analysisDayIterator.format('YYYY-MM-DD');
            const dayNameStr = analysisDayIterator.format('dddd'); 
            const recordedStatus = logsDateIndexedMap.get(loopDateKeyStr);

            if (recordedStatus === 'Completed') {
                totalCompletedCount++;
                if (weekdayFrequencyWeightMap[dayNameStr]) {
                    weekdayFrequencyWeightMap[dayNameStr].completed += 1;
                    weekdayFrequencyWeightMap[dayNameStr].total += 1;
                }
            } else {
                totalMissedCount++;
                if (weekdayFrequencyWeightMap[dayNameStr]) {
                    weekdayFrequencyWeightMap[dayNameStr].total += 1;
                }
            }
            analysisDayIterator.add(1, 'day');
        }

        // 🚀 CALCULATE THE CURRENT MAX STREAK DURATION INDEX
        let currentMaxStreak = 0;
        let runningStreakCounter = 0;

        let streakDayIterator = moment(userRegisterDateStr, 'YYYY-MM-DD');
        while (streakDayIterator.isSameOrBefore(activeTodayMoment)) {
            const streakDateKeyStr = streakDayIterator.format('YYYY-MM-DD');
            const statusAtTargetDate = logsDateIndexedMap.get(streakDateKeyStr);

            if (statusAtTargetDate === 'Completed') {
                runningStreakCounter++;
                if (runningStreakCounter > currentMaxStreak) {
                    currentMaxStreak = runningStreakCounter;
                }
            } else {
                runningStreakCounter = 0; // Streak reset rule triggered
            }
            streakDayIterator.add(1, 'day');
        }

        // 🚀 COMPUTE HIGHEST AND LOWEST INTERACTION DAY LABELS (Best & Quietest Days)
        let maxDayRatio = -1;
        let minDayRatio = 101;
        
        let bestDaysArray: string[] = [];
        let quietestDaysArray: string[] = [];

        Object.keys(weekdayFrequencyWeightMap).forEach((day) => {
            const metrics = weekdayFrequencyWeightMap[day];
            if (metrics.total > 0) {
                const calculatedRatio = Math.round((metrics.completed / metrics.total) * 100);

                // Evaluation engine checking for best days parameters matching rules
                if (calculatedRatio > maxDayRatio) {
                    maxDayRatio = calculatedRatio;
                    bestDaysArray = [day.substring(0, 3)]; // Slice down to standard short string token e.g., 'Mon'
                } else if (calculatedRatio === maxDayRatio && maxDayRatio > 0) {
                    bestDaysArray.push(day.substring(0, 3));
                }

                // Evaluation engine checking for quietest days mapping constraints
                if (calculatedRatio < minDayRatio) {
                    minDayRatio = calculatedRatio;
                    quietestDaysArray = [day.substring(0, 3)]; // Short formatting text code format match e.g., 'Sun'
                } else if (calculatedRatio === minDayRatio) {
                    quietestDaysArray.push(day.substring(0, 3));
                }
            }
        });

        // Safe operational fallbacks logic criteria adjustments
        const finalBestDisplayString = bestDaysArray.length > 0 && maxDayRatio > 0 ? bestDaysArray.join(', ') : 'N/A'; //
        const finalQuietestDisplayString = quietestDaysArray.length > 0 ? quietestDaysArray.join(', ') : 'N/A'; //

        // Combined payload response structures compile match
        return {
            habitId: trackingHabit._id,
            habitName: trackingHabit.name,
            percentage: currentWeekCompletionRatio, //
            calendarHistory: calendarHistoryGrid, // Grid status: 'Completed' | 'Missed' | ''
            breakdownCard: {
                completedDaysCount: totalCompletedCount, //
                missedDaysCount: totalMissedCount,       //
                bestStreakDays: currentMaxStreak,        // Continuous counting index indicator
                bestDaysDisplay: finalBestDisplayString,      // Explicit short keys format context string
                quietestDaysDisplay: finalQuietestDisplayString // Explicit short keys format context string
            }
        };

    } catch (error: any) {
        throw new Error(`Failed to compile structured individual habit analysis metrics schema: ${error.message}`);
    }
};


export const habitProgressService = {
    getCombinedProgressAndAnalytics,
    getIndividualHabitAnalytics
}











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