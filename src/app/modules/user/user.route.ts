import { Router } from 'express';
import { validateRequest } from '../../middlewares/request.validator';
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

export default userRouter;
