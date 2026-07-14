
import z from "zod";


export const announcementSchema = z.object({
  
    title: z.string().nonempty("Title is required"),

    description: z.string().nonempty("Description is required"),

    startedAt: z.coerce.date({error:()=> "Invalid date format for startedAt"}),

    endedAt: z.coerce.date({error:()=> "Invalid date format for endedAt"})
}).superRefine((data, ctx) => {
    if (data.startedAt && data.endedAt && data.startedAt > data.endedAt) {
        ctx.addIssue({
            code: "custom",
            message: "startedAt must be less than or equal to endedAt",
        });
    }
});


export const updateAnnouncementSchema = z.object({
  
    title: z.string().optional(),

    description: z.string().optional(),

    startedAt: z.coerce.date().optional(),

    endedAt: z.coerce.date().optional()
})

export type TAnnouncementPayload = z.infer<
    typeof announcementSchema
>;

export type TUpdateAnnouncementPayload = z.infer<
    typeof updateAnnouncementSchema
>;

const announcementValidationZodSchema = {
    announcementSchema,
    updateAnnouncementSchema
};

export default announcementValidationZodSchema;