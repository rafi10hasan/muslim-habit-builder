import z from "zod";
import { BUG_FEATURES, BUG_STATUS } from "./bug.constant";


export const bugReportSchema = z.object({
    featureKey: z
        .enum(
            Object.values(BUG_FEATURES).filter(Boolean) as [string, ...string[]],
            {
                error: () =>
                    `Invalid feature key. Must be one of: ${Object.values(BUG_FEATURES).filter(Boolean).join(', ')}`,
            },
        ),

    title: z.string().nonempty("Title is required"),

    description: z.string().nonempty("Description is required"),
});


export type TBugReportPayload = z.infer<
    typeof bugReportSchema
>;

export const bugStatusUpdateSchema = z.object({
    status: z.enum(
        Object.values(BUG_STATUS) as [string, ...string[]],
        {
            error: () =>
                `Invalid status. Must be one of: ${Object.values(BUG_STATUS).join(', ')}`,
        },
    ),
});

export type TBugStatusUpdatePayload = z.infer<typeof bugStatusUpdateSchema>;

const bugValidationZodSchema = {
    bugReportSchema,
    bugStatusUpdateSchema
};

export default bugValidationZodSchema;
