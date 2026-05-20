import { z } from 'zod';
import { CONNECTED_PRAYERS, HABIT_CATEGORIES, HABIT_LEVELS } from '../../../interfaces';
import {
  FREQUENCY_TYPE,
  WEEK_DAYS,
} from '../../../shared/constants/habit.shared.types';
import { FREQUENCY_TYPES } from '../user-habit/user.habit.constant';
import { HABIT_TYPES } from './system.habit.constant';

export const frequencyZodSchema = z.object({
  type: z.enum(Object.values(FREQUENCY_TYPES) as [string, ...string[]], {
    error: () => "Frequency type is required",
  }),
  days: z.array(z.enum(Object.values(WEEK_DAYS) as [string, ...string[]])).default([]),
  everyNDays: z.number().min(1).nullable().optional().default(null),
})
  .superRefine((data, ctx) => {

    if (data.type === FREQUENCY_TYPE.DAILY) {
      if (data.days && data.days.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: "Days must be empty when frequency is daily",
          path: ["days"],
        });
      }
    }


    if (data.type === FREQUENCY_TYPE.WEEKLY) {
      if (!data.days || data.days.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Please select at least one day for weekly frequency",
          path: ["days"],
        });
      }
    }


    if (data.type === FREQUENCY_TYPE.INTERVAL) {
      if (!data.everyNDays || data.everyNDays <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Please specify the interval (every N days)",
          path: ["everyNDays"],
        });
      }

      if (data.days && data.days.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: "Days should be empty for 'every n days' type",
          path: ["days"],
        });
      }
    }
  });

// create habit template zod
const createHabitTemplateZod = z.object({
  name: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Name is required'
      if (typeof issue.input !== 'string') return 'Name must be a string'
      return 'Invalid name'
    },
  })
    .min(1, 'Name cannot be empty')
    .max(100, 'Name cannot exceed 100 characters'),

  category: z.enum(Object.values(HABIT_CATEGORIES) as [string, ...string[]], {
    error: (issue) => {
      if (issue.input === undefined) return 'Category is required'
      return `Invalid category. Must be one of: ${Object.values(HABIT_CATEGORIES).join(', ')}`
    },
  }),

  connectedPrayer: z.enum(Object.values(CONNECTED_PRAYERS) as [string, ...string[]], {
    error: (issue) => {
      if (issue.input === undefined) return 'Connected prayer is required'
      return `Invalid connected prayer. Must be one of: Fajr, Dhuhr, Asr, Maghrib, Isha`
    },
  }).optional(),


  supportLocation: z.preprocess(
    (val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return val;
    },
    z.boolean({
      error: "supportLocation must be a boolean",
    }).optional().default(false)
  ),

  habitType: z.enum(Object.values(HABIT_TYPES) as [string, ...string[]], {
    error: (issue) => {
      if (issue.input === undefined) return 'Habit type is required'
      return `Invalid habit type. Must be one of: ${Object.values(HABIT_TYPES).join(', ')}`
    },
  }),

  group: z
    .string({
      error: 'Group ID must be a string',
    })
    .regex(/^[0-9a-fA-F]{24}$/, {
      message: 'Invalid Id format',
    })
    .nullable()
    .optional(),

  defaultFrequency: z.enum(Object.values(FREQUENCY_TYPES) as [string, ...string[]], {
    error: (issue) => {
      if (issue.input === undefined) return 'Default frequency is required'
      return `Invalid default frequency. Must be one of: ${Object.values(FREQUENCY_TYPE).join(', ')}`
    },
  }),

  allowedFrequencies: z.array(z.enum(Object.values(FREQUENCY_TYPES) as [string, ...string[]], {
    error: (issue) => {
      if (!Array.isArray(issue.input)) return 'Allowed frequencies must be an array'
      return `Invalid frequency in allowed frequencies. Must be one of: ${Object.values(FREQUENCY_TYPE).join(', ')}`
    },
  })).min(1, 'At least one allowed frequency must be selected'),

  level: z.enum(Object.values(HABIT_LEVELS) as [string, ...string[]], {
    error: (issue) => {
      if (issue.input === undefined) return 'Level is required'
      return `Invalid level. Must be one of: ${Object.values(HABIT_LEVELS).join(', ')}`
    },
  }),

  infoContent: z.string().min(0, "Info content must be at least 20 characters long").optional(),

  adhkarSet: z.string({
    error: 'Adhkar Set ID must be a string',
  }).regex(/^[0-9a-fA-F]{24}$/, {
    message: 'Invalid Id format',
  })
    .nullable()
    .optional(),


  quranContent: z.string({
    error: 'Quran Content ID must be a string',
  }).regex(/^[0-9a-fA-F]{24}$/, {
    message: 'Invalid Id format',
  })
    .nullable()
    .optional(),

  connectedHabits: z
    .array(z.string(), {
      error: () => 'connectedHabits must be an array of string IDs',
    })
    .optional()
    .superRefine((val, ctx) => {
      if (!val?.length) return;

      if (new Set(val).size !== val.length) {
        ctx.addIssue({
          code: 'custom',
          message: 'Input habits must not have duplicate IDs',
        });
      }
    }),

})

/*

export interface IInfoContent {
    title?:     string  
    text:       string  
    reference?: string   
}
*/


export const getSystemHabitsZod = z.object({
  query: z.object({
    level: z.enum(Object.values(HABIT_LEVELS) as [string, ...string[]], {
      error: () => `Invalid level. Must be one of: ${Object.values(HABIT_LEVELS).join(', ')}`,
    }).optional(),
    category: z.enum(Object.values(HABIT_CATEGORIES) as [string, ...string[]], {
      error: () => `Invalid category. Must be one of: ${Object.values(HABIT_CATEGORIES).join(', ')}`,
    }).optional(),
  })
})

export type TCreateHabitTemplate = z.infer<typeof createHabitTemplateZod>
export type TGetSystemHabitsQuery = z.infer<typeof getSystemHabitsZod>['query']


const systemHabitValidationZodSchema = {
  createHabitTemplateZod,
  getSystemHabitsZod
};


export default systemHabitValidationZodSchema;