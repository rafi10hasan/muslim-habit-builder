
import { StatusCodes } from 'http-status-codes';
import asyncHandler from '../../../shared/asynchandler';
import sendResponse from '../../../shared/sendResponse';
import { FaqService } from './faq.service';

const createFaqByAdmin = asyncHandler(async (req, res) => {
  const result = await FaqService.createFaqByAdminIntoDb(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Frequently Asked Question Created Successfully!',
    data: result,
  });
});



const getAllFaqForAdmin = asyncHandler(async (req, res) => {
  const result = await FaqService.getAllFaqForAdmin(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Frequently Asked Question retrieved Successfully!',
    meta: result.meta,
    data: result.data,

  });
});


const updateFaq = asyncHandler(async (req, res) => {
  const result = await FaqService.updateFaqIntoDb(req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Frequently Asked Question updated Successfully!',
    data: result,
  });
});

const deleteFaq = asyncHandler(async (req, res) => {
  const result = await FaqService.deleteFaqFromDb(req.params.id as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Frequently Asked Question deleted Successfully!',
    data: result,
  });
});

export const faqController = {
  createFaqByAdmin,
  updateFaq,
  deleteFaq,
  getAllFaqForAdmin,

};
