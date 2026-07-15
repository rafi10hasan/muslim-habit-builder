import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { discountService } from "./discount.service";


// add discount
const createDiscountIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await discountService.createDiscount(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Discount added successfully",
        data: result,
    })
})

const getAllDiscountsForAdmin = asyncHandler(async (req: Request, res: Response) => {
    const result = await discountService.getAllDiscounts(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Discounts retrieved successfully",
        meta: result.meta,
        data: result.data,
    })
})

const updateDiscountIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await discountService.updateDiscount(req.params.id as string, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Discount updated successfully",
        data: result,
    })
})

const deleteDiscountIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await discountService.deleteDiscount(req.params.id as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Discount deleted successfully",
        data: result,
    })
})

export const discountController = {
    createDiscountIntoDb,
    getAllDiscountsForAdmin,
    updateDiscountIntoDb,
    deleteDiscountIntoDb
};
