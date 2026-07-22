import { z } from "zod";

const quranVerseschema = z.object({
  name: z.string().min(1, "Name is required"),
  nameArabic: z.string().optional(),
  totalVerses: z.coerce.number().min(1, "Total verses must be at least 1"), 
});


const updateQuranVerseschema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  nameArabic: z.string().optional(),
  totalVerses: z.coerce.number().min(1, "Total verses must be at least 1").optional(), 
});

export type TQuranContentPayload = z.infer<
    typeof quranVerseschema
>;

export type TQuranContentUpdatePayload = z.infer<
    typeof updateQuranVerseschema
>;

const quranVerseValidationSchema = {
    quranVerseschema,
    updateQuranVerseschema
};

export default quranVerseValidationSchema;