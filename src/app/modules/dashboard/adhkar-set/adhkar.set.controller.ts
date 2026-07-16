import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import asyncHandler from '../../../../shared/asynchandler';
import { adhakarService } from './adhkar.set.service';
import sendResponse from '../../../../shared/sendResponse';


// 1. Create Main Adhkar Set
const createAdhakarIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await adhakarService.createAdhakar(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Adhkar set has been created successfully',
        data: result,
    });
});

// 2. Delete Main Adhkar Set Completely
const deleteAdhakarSetFromDb = asyncHandler(async (req: Request, res: Response) => {
    const { setId } = req.params;
    const result = await adhakarService.deleteAdhakarSet(setId as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Adhkar set deleted successfully',
        data: result,
    });
});

// 3. Add Item to Adhkar Set
const addAdhakarItemIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const { setId } = req.params;
    const result = await adhakarService.addAdhakarItem(setId as string, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Adhkar item added successfully',
        data: result,
    });
});

// 4. Update Item inside Adhkar Set
const updateAdhakarItemInDb = asyncHandler(async (req: Request, res: Response) => {
    const { setId, itemId } = req.params;
    const result = await adhakarService.updateAdhakarItem(setId as string, Number(itemId), req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Adhkar item updated successfully',
        data: result,
    });
});

// 5. Delete Item from Adhkar Set
const deleteAdhakarItemFromDb = asyncHandler(async (req: Request, res: Response) => {
    const { setId, itemId } = req.params;
    const result = await adhakarService.deleteAdhakarItem(setId as string, Number(itemId));
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Adhkar item deleted and ordering sequence synchronized',
        data: result,
    });
});

// 6. Preview Adhkar Set
const previewAdhakarFromDb = asyncHandler(async (req: Request, res: Response) => {
    const { setId } = req.params;
    const result = await adhakarService.getAdhakarPreview(setId as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Adhkar preview retrieved successfully',
        data: result,
    });
});

export const adhakarController = {
    createAdhakarIntoDb,
    deleteAdhakarSetFromDb,
    addAdhakarItemIntoDb,
    updateAdhakarItemInDb,
    deleteAdhakarItemFromDb,
    previewAdhakarFromDb
};