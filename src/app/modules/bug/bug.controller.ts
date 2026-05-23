import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { TBugImage } from "./bug.interface";
import { bugServices } from "./bug.service";




const createBug = asyncHandler(async (req: Request, res: Response) => {
    const bugPayload = req.body
    const result = await bugServices.createFreshBug(req.user, bugPayload, req.files as TBugImage);

    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Bug report submitted successfully',
        data: result,
    });
});



const checkExistingBugsIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const featureKey = req.query.featureKey as string;
    console.log(featureKey)
    const result = await bugServices.checkExistingBugs(req.user, featureKey);

    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Existing bugs fetched successfully',
        data: result,
    });
});


const upvoteExistingBugIntodb = asyncHandler(async (req: Request, res: Response) => {
    const { bugId } = req.params
    const result = await bugServices.upvoteExistingBug(req.user, bugId as string);

    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Existing bug upvoted successfully',
        data: result,
    });
});


const deleteBugIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const { bugId } = req.params
    const result = await bugServices.deleteBug(bugId as string);

    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Bug deleted successfully',
        data: result,
    });
});


const updateBugStatusIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const { bugId } = req.params;
    const { status } = req.body;

    const result = await bugServices.updateStatus(bugId as string, status);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Bug status updated successfully',
        data: result,
    });
});

const getAllBugsForAdmin = asyncHandler(async (req: Request, res: Response) => {
    const result = await bugServices.getAllBugsForAdmin(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Bugs fetched successfully',
        data: result,
    });
})

export const bugController = {
    createBug,
    checkExistingBugsIntoDb,
    upvoteExistingBugIntodb,
    updateBugStatusIntoDb,
    deleteBugIntoDb,
    getAllBugsForAdmin

}