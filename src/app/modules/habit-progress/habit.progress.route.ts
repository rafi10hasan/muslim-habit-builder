import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware";
import { USER_ROLE } from "../user/user.constant";
import { habitProgressController } from "./habit.progress.controller";



const habitProgressRouter = Router();


habitProgressRouter.get(
    '/overview',
    authMiddleware(USER_ROLE.USER),
    habitProgressController.getOverviewProgressAndAnalytics,
);

habitProgressRouter.get(
    '/specific/:habitId',
    authMiddleware(USER_ROLE.USER),
    habitProgressController.getIndividualHabitAnalytics,
);

export default habitProgressRouter;