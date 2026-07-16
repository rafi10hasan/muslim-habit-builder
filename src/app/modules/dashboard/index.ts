import { Router } from "express";
import userOverviewRouter from "./overview/overview.route";
import userManagementRouter from "./user-management/user.management.route";

import authMiddleware from "../../middlewares/auth.middleware";
import quranContentRouter from "./quran-content/quran.content.route";
import { USER_ROLE } from "../user/user.constant";
import { adminController } from "./admin/admin.controller";
import announcementRouter from "./announcement/announcement.route";
import userBugRouter from "./bugs/bug.route";


const adminRouter = Router();


adminRouter.use('/users', userManagementRouter);
adminRouter.use('/overview', userOverviewRouter);
adminRouter.use('/quran-content', quranContentRouter);
adminRouter.use('/bugs', userBugRouter);
adminRouter.use('/get-me', authMiddleware(USER_ROLE.SUPER_ADMIN), adminController.getMeIntoDb);
adminRouter.use('/announcement', announcementRouter);

export default adminRouter;