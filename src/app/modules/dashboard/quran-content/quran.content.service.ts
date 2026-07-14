
import { deleteImageFromCloudinary } from "../../../cloudinary/deleteImageFromCloudinary";
import { uploadToCloudinary } from "../../../cloudinary/uploadImageToCLoudinary";
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


const getSingleQuranContent = async (id: string) => {
    const result = await QuranContent.findById(id);
    if (!result) {
        throw new Error("Quran content not found");
    }
    return result;
};

// get quran content preview
const getQuranContentPreview = async (id: string, index: number) => {
    const result = await QuranContent.findById(id).select('name images');
    if (!result) {
        throw new Error("Quran content not found");
    }

    const image = result.images[index];
    if (!image) {
        throw new Error("Image not found");
    }
    return {
        name: result.name,
        image
    };
}

// add verse
const addVerse = async (
    id: string,
    files: TQuranContentImages
) => {

    const existingContent = await QuranContent.findById(id).select('images');

    if (!existingContent) {
        throw new Error("Quran content not found");
    }

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


        existingContent.images.push(...refinedImages);

        await existingContent.save();

        return existingContent.images[existingContent.images.length - refinedImages.length]; // return the last added image

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
    getSingleQuranContent,
    getQuranContentPreview,
    addVerse
};