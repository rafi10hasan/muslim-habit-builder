import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { Request, Response } from "express";
import { bugService } from "./bug.service";




const getAllBugsIntoDb = asyncHandler(async (req: Request, res: Response) => {

    const result = await bugService.getAllBugs(req.query);
    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.data.length > 0 ? 'Bugs data has been retrieved successfully' : 'No bugs found',
        meta: result.meta,
        data: result.data,
    });
});



const getBugDetails = asyncHandler(async (req: Request, res: Response) => {

    const result = await bugService.getBugDetails(req.params.bugId as string);
    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Bugs details has been retrieved successfully',
        data: result,
    });
});


const updateBugStatus = asyncHandler(async (req: Request, res: Response) => {

    const result = await bugService.updateBugStatus(req.params.bugId as string, req.body);
    console.log(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Bugs status has been updated successfully',
        data: result,
    });
});


export const adminBugController = {
    getAllBugsIntoDb,
    getBugDetails,
    updateBugStatus
}