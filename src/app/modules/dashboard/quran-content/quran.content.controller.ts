import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { TQuranContentImages } from "./quran.content.interface";
import { quranContentService } from "./quran.content.service";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";



const createQuranContentIntoDb = asyncHandler(async (req: Request, res: Response) => {

    const result = await quranContentService.createQuranContent(req.body, req.files as TQuranContentImages);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Quran content has been created successfully',
        data: result,
    });
});



const getSingleQuranContentIntoDb = asyncHandler(async (req: Request, res: Response) => {

    const result = await quranContentService.getSingleQuranContent(req.params.id as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Quran content has been retrieved successfully',
        data: result,
    });
});


const getQuranContentPreview = asyncHandler(async (req: Request, res: Response) => {

    const result = await quranContentService.getQuranContentPreview(req.params.id as string, parseInt(req.query.index as string));
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Quran content has been retrieved successfully',
        data: result,
    });
});


const addVerseInQuranContent = asyncHandler(async (req: Request, res: Response) => {

    const result = await quranContentService.addVerse(req.params.id as string, req.files as TQuranContentImages);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Quran verse added successfully',
        data: result,
    });
});

export const quranContentController = {
    createQuranContentIntoDb,
    getSingleQuranContentIntoDb,
    getQuranContentPreview,
    addVerseInQuranContent
};
