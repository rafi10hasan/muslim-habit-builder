import z from "zod";
import { USER_STATUS } from "../../user/user.constant";


const updateUserSchema = z.object({
    status: z
        .enum(
            Object.values(USER_STATUS).filter(Boolean) as [string, ...string[]],
            {
                error: () =>
                    `Invalid user status. Must be one of: ${Object.values(USER_STATUS).filter(Boolean).join(', ')}`,
            },
        )
})


export type TUserUpdatePayload = z.infer<
    typeof updateUserSchema
>;


const userStatusValidationZodSchema = {
    updateUserSchema
};

export default userStatusValidationZodSchema;