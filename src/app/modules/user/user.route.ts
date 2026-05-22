import { Router } from 'express';
import { uploadFile } from '../../../helpers/fileuploader';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { validateFileSizes } from '../../middlewares/validateFileSize';
import { USER_ROLE } from './user.constant';
import { userController } from './user.controller';
import userValidationZodSchema from './user.validations';

const userRouter = Router();

userRouter.post(
  '/create',
  validateRequest({
    body: userValidationZodSchema.createAuthSchema,
  }),
  userController.createAccountIntoDb,
);

userRouter.post(
  '/create-guest',
  userController.createGuestAccountIntoDb,
);

userRouter.patch(
  '/update-profile',
  authMiddleware(USER_ROLE.USER, USER_ROLE.GUEST),
  validateRequest({
    body: userValidationZodSchema.updateUserProfileSchema,
  }),
  userController.updateUserProfile,
);

userRouter.patch(
  '/update-profile-image',
  authMiddleware(USER_ROLE.USER, USER_ROLE.GUEST),
  uploadFile(),
  validateFileSizes,
  userController.updateUserProfileImage,
);

userRouter.get(
  '/get-profile',
  authMiddleware(USER_ROLE.USER, USER_ROLE.GUEST),
  userController.getUserProfile,
);

export default userRouter;
