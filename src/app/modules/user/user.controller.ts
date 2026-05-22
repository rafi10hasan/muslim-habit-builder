import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';

import asyncHandler from '../../../shared/asynchandler';
import { userService } from './user.service';
import { TProfileImage } from './user.interface';


// register user
const createAccountIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const userPayload = req.body
  const result = await userService.createAccount(userPayload);

  // console.log(result);
  const isVerificationRequired = result.status === 'UNVERIFIED';
  sendResponse(res, {
    statusCode: isVerificationRequired ? StatusCodes.BAD_REQUEST : StatusCodes.CREATED,
    success: isVerificationRequired ? false : true,
    message: isVerificationRequired ? 'Your Account is not verified. Please verify your email to complete registration' : 'Check your email to verify your Account',
    data: result,
  });
});


const createGuestAccountIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.createGuestAccount();
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Guest account created successfully',
    data: result,
  });
});


const updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.updateUserProfile(req.user,req.body);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Profile updated successfully',
    data: result,
  });
});


const updateUserProfileImage = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.updateUserProfileImage(req.user,req.files as TProfileImage);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Profile image updated successfully',
    data: result,
  });
});

const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.getUserProfile(req.user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Profile fetched successfully',
    data: result,
  });
});

export const userController = {
  createAccountIntoDb,
  createGuestAccountIntoDb,
  updateUserProfile,
  updateUserProfileImage,
  getUserProfile
};


