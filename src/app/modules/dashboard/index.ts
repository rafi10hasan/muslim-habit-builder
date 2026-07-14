import { Router } from "express";
import userManagementRouter from "./user-management/user.management.route";
import userOverviewRouter from "./overview/overview.route";

import authMiddleware from "../../middlewares/auth.middleware";
import { USER_ROLE } from "../user/user.constant";
import userBugRouter from "./bugs/bug.route";
import { adminController } from "./admin/admin.controller";
import announcementRouter from "./announcement/announcement.route";
import quranContentRouter from "./quran-content/quran.content.route";


const adminRouter = Router();


adminRouter.use('/users', userManagementRouter);
adminRouter.use('/overview', userOverviewRouter);
adminRouter.use('/quran-content', quranContentRouter);
adminRouter.use('/bugs', userBugRouter);
adminRouter.use('/get-me', authMiddleware(USER_ROLE.SUPER_ADMIN), adminController.getMeIntoDb);
adminRouter.use('/announcement', announcementRouter);

export default adminRouter;