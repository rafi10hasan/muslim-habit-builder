import { Router } from "express";
import userManagementRouter from "./user-management/user.management.route";
import userOverviewRouter from "./overview/overview.route";

import authMiddleware from "../../middlewares/auth.middleware";
import { USER_ROLE } from "../user/user.constant";
import userBugRouter from "./bugs/bug.route";


const adminRouter = Router();


adminRouter.use('/users', authMiddleware(USER_ROLE.SUPER_ADMIN), userManagementRouter);
adminRouter.use('/overview', authMiddleware(USER_ROLE.SUPER_ADMIN), userOverviewRouter);
adminRouter.use('/bugs', authMiddleware(USER_ROLE.SUPER_ADMIN), userBugRouter);


export default adminRouter;