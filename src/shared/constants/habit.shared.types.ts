export const HABIT_CATEGORY = {
    PRAYER: 'prayer',
    QURAN: 'quran',
    DHIKR: 'dhikr',
    DEEDS: 'deeds',
} as const

export const HABIT_LEVEL = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
} as const


export const WEEK_DAYS = {
    MON: 'Mon',
    TUE: 'Tue',
    WED: 'Wed',
    THU: 'Thu',
    FRI: 'Fri',
    SAT: 'Sat',
    SUN: 'Sun',
} as const

export const FREQUENCY_TYPE = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    INTERVAL: 'interval',
} as const



export const HABIT_TYPE = {
    SYSTEM: 'system',
    USER: 'user',
} as const



export type THabitCategory = (typeof HABIT_CATEGORY)[keyof typeof HABIT_CATEGORY];
export type THabitLevel = (typeof HABIT_LEVEL)[keyof typeof HABIT_LEVEL];

export type TWEEK_DAYS = (typeof WEEK_DAYS)[keyof typeof WEEK_DAYS];
export type THabitType = (typeof HABIT_TYPE)[keyof typeof HABIT_TYPE];
export type TFrequencyType = (typeof FREQUENCY_TYPE)[keyof typeof FREQUENCY_TYPE]

export type TFrequency =
    | { type: 'daily' }
    | { type: 'weekly'; days: TWEEK_DAYS[] }
    | { type: 'interval'; everyNDays: number }

export type TDetailItem =
    | { type: 'text'; content: string }
    | { type: 'image'; url: [string] , default: null}
    | { type: 'pdf'; url: string; fileName: string, default: null }