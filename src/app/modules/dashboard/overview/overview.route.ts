
import { Router } from 'express';
import authMiddleware from '../../../middlewares/auth.middleware';
import { USER_ROLE } from '../../user/user.constant';
import { overviewController } from './overview.controller';
const userOverviewRouter = Router();

userOverviewRouter.get(
  '/stats',
  authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
  overviewController.getStatsOverviewIntoDb,
);

userOverviewRouter.get(
  '/user-growth',
  authMiddleware(USER_ROLE.SUPER_ADMIN,USER_ROLE.ADMIN),
  overviewController.getUserGrowthIntoDb,
);

userOverviewRouter.get(
  '/recent-active-users',
  authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
  overviewController.getRecentUsersIntoDb,
);



export default userOverviewRouter
