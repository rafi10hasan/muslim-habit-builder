import { z } from "zod";

const quranVerseschema = z.object({
  name: z.string().min(1, "Name is required"),
  nameArabic: z.string().optional(),
  totalVerses: z.coerce.number().min(1, "Total verses must be at least 1"), 
});

export type TQuranContentPayload = z.infer<
    typeof quranVerseschema
>;

const quranVerseValidationSchema = {
    quranVerseschema
};

export default quranVerseValidationSchema;