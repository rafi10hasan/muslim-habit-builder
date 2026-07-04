 
import { Router } from 'express';
import authMiddleware from '../../../middlewares/auth.middleware';
import { USER_ROLE } from '../../user/user.constant';
import { adminBugController } from './bug.controller';
import bugValidationZodSchema from './bug.zod';

import { validateRequest } from '../../../middlewares/request.validator';

const userBugRouter = Router();

userBugRouter.get(
  '/',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  adminBugController.getAllBugsIntoDb,
);

userBugRouter.get(
  '/details/:bugId',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  adminBugController.getBugDetails,
);


userBugRouter.patch(
  '/change-status/:bugId',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  validateRequest({
    body: bugValidationZodSchema.updateBugSchema,
  }),
  adminBugController.updateBugStatus,
);
export default userBugRouter;
