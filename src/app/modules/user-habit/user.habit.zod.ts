import z from "zod"
import { HABIT_CATEGORY, HABIT_LEVEL } from "../../../shared/constants/habit.shared.types"
import { frequencyZodSchema } from "../habit-template/system.habit.zod"




const createUserHabitZod = z.object({
  name: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Name is required'
      if (typeof issue.input !== 'string') return 'Name must be a string'
      return 'Invalid name'
    },
  })
    .min(1, 'Name cannot be empty')
    .max(100, 'Name cannot exceed 100 characters'),

  category: z.enum(Object.values(HABIT_CATEGORY) as [string, ...string[]], {
    error: (issue) => {
      if (issue.input === undefined) return 'Category is required'
      return `Invalid category. Must be one of: ${Object.values(HABIT_CATEGORY).join(', ')}`
    },
  }),

  frequency: frequencyZodSchema,

  parentId: z.string({
    error: () => 'Parent ID must be a string',
  }).nullable().optional(),

  level: z.enum(Object.values(HABIT_LEVEL) as [string, ...string[]], {
    error: (issue) => {
      if (issue.input === undefined) return 'Level is required'
      return `Invalid level. Must be one of: ${Object.values(HABIT_LEVEL).join(', ')}`
    },
  }),

  isReminder: z.preprocess(
    (val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return val;
    },
    z.boolean({
      error: "isReminder must be a boolean",
    }).optional().default(false)
  ),

  order: z.number({
    error: (issue) => {
      if (typeof issue.input !== 'number') return 'Order must be a number'
      return 'Invalid order'
    },
  })
    .int('Order must be a whole number')
    .min(0, 'Order cannot be negative')
    .optional()
    .default(0),

})


const habitParamsZod = z.object({
  habitId: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Habit ID is required'
      if (typeof issue.input !== 'string') return 'Habit ID must be a string'
      return 'Invalid habit ID'
    },
  }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid habit ID format'),
})

export type TCreateUserHabit = z.infer<typeof createUserHabitZod>
export type THabitParams = z.infer<typeof habitParamsZod>



const userHabitValidationZodSchema = {
  createUserHabitZod,
  habitParamsZod
};


export default userHabitValidationZodSchema;