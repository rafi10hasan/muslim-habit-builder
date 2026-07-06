import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware";
import { USER_ROLE } from "../../user/user.constant";
import { userManagementController } from "./user.management.controller";
import userStatusValidationZodSchema from "./user.management.zod";
import { validateRequest } from "../../../middlewares/request.validator";



const userManagementRouter = Router();

userManagementRouter.get(
    '/overview',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    userManagementController.getUserStatsIntoDb,
);

userManagementRouter.get(
    '/list',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    userManagementController.getAllUsersIntoDb,
);

userManagementRouter.get(
    '/details/:userId',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    userManagementController.getUserDetailsIntoDb,
);

userManagementRouter.patch(
    '/change-status/:userId',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    validateRequest({
        body: userStatusValidationZodSchema.updateUserSchema,
    }),
    userManagementController.updateStatusChange,
);

export default userManagementRouter;