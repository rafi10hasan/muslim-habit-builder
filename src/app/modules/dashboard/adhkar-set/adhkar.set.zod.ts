import { z } from "zod";

// 1. Schema for creating a main Adhkar Set
const addAdhakarSchema = z.object({
    name: z.string().min(1, "Name is required"),
    nameArabic: z.string().optional(),
});

// 2. Schema for adding a new Adhkar Item (Required fields)
const adhakarItemValidationSchema = z.object({
    title: z.string().min(1, "Title is required"),
    arabic: z.string().min(1, "Arabic text is required"),
    transliteration: z.string().min(1, "Transliteration is required"),
    translation: z.string().min(1, "Translation is required"),
    virtue: z.string().optional(),
    reference: z.string().optional(),
    count: z.number().nullable().optional(),
    order: z.number().optional(),
});

// 3. Schema for updating an existing Adhkar Item (All fields optional)
const updateAdhakarItemSchema = z.object({
    title: z.string().optional(),
    arabic: z.string().optional(),
    transliteration: z.string().optional(),
    translation: z.string().optional(),
    virtue: z.string().optional(),
    reference: z.string().optional(),
    count: z.number().nullable().optional(),
});

export type TAdhakarPayload = z.infer<typeof addAdhakarSchema>;
export type TAdhakarItemPayload = z.infer<typeof adhakarItemValidationSchema>;
export type TUpdateAdhakarItemPayload = z.infer<typeof updateAdhakarItemSchema>;

const adhakarValidationSchema = {
    addAdhakarSchema,
    adhakarItemValidationSchema,
    updateAdhakarItemSchema
};

export default adhakarValidationSchema;