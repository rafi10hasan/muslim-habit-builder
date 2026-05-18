import { z } from 'zod';

const createFaqSchemaByAdmin = z.object({

  question: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'Full name is required';
        if (typeof issue.input !== 'string') return 'Full name must be a string';
        return 'Invalid full name format';
      },
    })
    .min(10, 'Question must be at least 10 characters long'),

  answer: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'Answer is required';
        if (typeof issue.input !== 'string') return 'Answer must be a string';
        return 'Invalid answer format';
      },
    })
    .min(20, 'Answer must be at least 20 characters long'),

  isPublished: z.preprocess(
    (val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return val;
    },
    z.boolean({
      error: "isPublished must be a boolean",
    }).optional().default(false)
  ),

}).superRefine((data, ctx) => {
  if (!Object.keys(data).length) {
    ctx.addIssue({
      code: "custom",
      maximum: 1,
      origin: "superRefine",
      inclusive: true,
      path: ["error"],
      message: "At least one field must be provided for update",
    });
  }
});

const updateFaqSchema = z.object({
  body: z
    .object({
      question: z
        .string({
          error: (issue) => {
            if (issue.input === undefined) return 'Question is required';
            if (typeof issue.input !== 'string') return 'Question must be a string';
            return 'Invalid question format';
          },
        })
        .min(10, 'Question must be at least 10 characters long')
        .optional(),

      answer: z
        .string({
          error: (issue) => {
            if (issue.input === undefined) return 'Answer is required';
            if (typeof issue.input !== 'string') return 'Answer must be a string';
            return 'Invalid answer format';
          },
        })
        .min(20, 'Answer must be at least 20 characters long')
        .optional(),

      isPublished: z
        .string({
          error: (issue) => {
            if (issue.input === undefined) return 'Publish status is required';
            if (typeof issue.input !== 'string') return 'Publish status must be a string';
            return 'Invalid publish status format';
          },
        })
        .transform((val) => val === 'true')
        .optional(),
    })
    .refine(
      (data) =>
        data.question !== undefined ||
        data.answer !== undefined ||
        data.isPublished !== undefined,
      {
        message:
          'At least one field (question, answer, or isActive) must be provided',
        path: ['body'],
      }
    ),
});

export type TCreateFaqPayload = z.infer<
  typeof createFaqSchemaByAdmin
>;

export type TUpdatedFaqPayload = z.infer<typeof updateFaqSchema.shape.body>;

export const FaqValidation = {
  createFaqSchemaByAdmin,
  updateFaqSchema,
};
