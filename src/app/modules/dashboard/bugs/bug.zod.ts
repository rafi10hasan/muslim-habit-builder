import z from "zod";
import { BUG_STATUS } from "../../bug/bug.constant";


const updateBugSchema = z.object({
    status: z
        .enum(
            Object.values(BUG_STATUS).filter(Boolean) as [string, ...string[]],
            {
                error: () =>
                    `Invalid bug status. Must be one of: ${Object.values(BUG_STATUS).filter(Boolean).join(', ')}`,
            },
        )
})


export type TBugUpdatePayload = z.infer<
    typeof updateBugSchema
>;


const bugValidationZodSchema = {
    updateBugSchema
};

export default bugValidationZodSchema;