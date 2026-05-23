import { Router } from "express";
import { uploadFile } from "../../../helpers/fileuploader";
import adminAuthMiddleware from "../../middlewares/admin.auth.middleware";
import authMiddleware from "../../middlewares/auth.middleware";
import { validateFormDataRequest, validateRequest } from "../../middlewares/request.validator";
import { validateFileSizes } from "../../middlewares/validateFileSize";
import { ADMIN_ROLE } from "../admin/admin.constant";
import { USER_ROLE } from "../user/user.constant";
import { bugController } from "./bug.controller";
import bugValidationZodSchema from "./bug.zod";



const bugRouter = Router();

bugRouter.post(
    '/create',
    authMiddleware(USER_ROLE.USER, USER_ROLE.GUEST),
    uploadFile(),
    validateFileSizes,
    validateFormDataRequest(
        bugValidationZodSchema.bugReportSchema,
    ),
    bugController.createBug,
);

bugRouter.get(
    '/check-existing',
    authMiddleware(USER_ROLE.USER, USER_ROLE.GUEST),
    bugController.checkExistingBugsIntoDb
);

bugRouter.patch(
    '/upvote/:bugId',
    authMiddleware(USER_ROLE.USER, USER_ROLE.GUEST),
    bugController.upvoteExistingBugIntodb
);

bugRouter.patch(
    '/status/:bugId',
    adminAuthMiddleware(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN),
    validateRequest({
        body: bugValidationZodSchema.bugStatusUpdateSchema,
    }),
    bugController.updateBugStatusIntoDb,
);

bugRouter.delete(
    '/delete/:bugId',
    adminAuthMiddleware(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN),
    bugController.deleteBugIntoDb,
);

bugRouter.get(
    '/retrieve-all',
    adminAuthMiddleware(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN),
    bugController.getAllBugsForAdmin,
);


export default bugRouter;