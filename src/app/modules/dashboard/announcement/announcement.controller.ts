import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { announcementService } from "./announcement.service";



// add habit
const createAnnouncementIntoDb = asyncHandler(async (req: Request, res: Response) => {

    const result = await announcementService.addAnnouncement(req.body)

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Announcement added successfully",
        data: result,
    })
})

const getAllAnnouncementsForAdmin = asyncHandler(async (req: Request, res: Response) => {
    const result = await announcementService.getAllAnnouncements(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Announcements retrieved successfully",
        meta: result.meta,
        data: result.data,
    })
})

const updateAnnouncementIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await announcementService.updateAnnouncement(req.params.id as string, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Announcement updated successfully",
        data: result,
    })
})

const deleteAnnouncementIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await announcementService.deleteAnnouncement(req.params.id as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Announcement deleted successfully",
        data: result,
    })
})

export const announcementController = {
    createAnnouncementIntoDb,
    getAllAnnouncementsForAdmin,
    updateAnnouncementIntoDb,
    deleteAnnouncementIntoDb
};
