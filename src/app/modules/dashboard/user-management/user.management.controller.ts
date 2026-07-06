import { Request, Response } from "express";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { userManagementService } from "./user.management.service";


const getUserStatsIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await userManagementService.getUserStats();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'User stats retrieved successfully',
        data: result,
    });
});

const getAllUsersIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await userManagementService.getAllUsers(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Users retrieved successfully',
        meta: result.meta,
        data: result.data,
    });
});

const getUserDetailsIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await userManagementService.getUserDetails(req.params.userId as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'User details retrieved successfully',
        data: result,
    });
});

const updateStatusChange = asyncHandler(async (req: Request, res: Response) => {
    const result = await userManagementService.updateUserStatus(req.params.userId as string, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'User status updated successfully',
        data: result,
    });
});


export const userManagementController = {
  getUserStatsIntoDb,
  getAllUsersIntoDb,
  updateStatusChange,
  getUserDetailsIntoDb
}