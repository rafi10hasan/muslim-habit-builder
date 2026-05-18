import { deleteImageFromCloudinary } from "../../cloudinary/deleteImageFromCloudinary";
import { uploadToCloudinary } from "../../cloudinary/uploadImageToCLoudinary";
import { TQuranContentImages } from "./quran.content.interface";
import { QuranContent } from "./quran.content.model";
import { TQuranContentPayload } from "./quran.content.zod";



const createQuranContent = async (
    payload: TQuranContentPayload,
    files: TQuranContentImages
) => {

    let uploadedVerseImages: string[] = [];

    try {

        if (files?.pages?.length) {
            const uploads = await Promise.all(
                files.pages.map((file) => uploadToCloudinary(file, 'quran_verse'))
            )
            uploadedVerseImages = uploads.map((img) => img.secure_url);
        }

        const refinedImages = uploadedVerseImages.map((url, index) => ({
            order: index + 1,
            imageUrl: url,
        }));

        const versePayload = {
            ...payload,
            images: refinedImages,
            pages: refinedImages.length,
        };

        const result = await QuranContent.create(versePayload)

        return result;
    } catch (error) {
        // 8. Rollback DB
        if (uploadedVerseImages.length) {
            await Promise.all(
                uploadedVerseImages.map((url) => deleteImageFromCloudinary(url))
            );
        }
        throw error;
    }
};

export const quranContentService = {
    createQuranContent,
};