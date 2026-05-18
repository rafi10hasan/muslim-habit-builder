import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { TQuranContentImages } from "./quran.content.interface";
import { quranContentService } from "./quran.content.service";




const createQuranContentIntoDb = asyncHandler(async (req: Request, res: Response) => {
    console.log(req.files)
    const result = await quranContentService.createQuranContent(req.body, req.files as TQuranContentImages);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Quran content has been created successfully',
        data: result,
    });
});

export const quranContentController = {
    createQuranContentIntoDb,
}