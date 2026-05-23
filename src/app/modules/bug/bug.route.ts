import { Router } from "express";
import { uploadFile } from "../../../helpers/fileuploader";
import authMiddleware from "../../middlewares/auth.middleware";
import { validateFormDataRequest, validateRequest } from "../../middlewares/request.validator";
import { validateFileSizes } from "../../middlewares/validateFileSize";
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
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest({
        body: bugValidationZodSchema.bugStatusUpdateSchema,
    }),
    bugController.updateBugStatusIntoDb,
);

bugRouter.delete(
    '/delete/:bugId',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    bugController.deleteBugIntoDb,
);

bugRouter.get(
    '/retrieve-all',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    bugController.getAllBugsForAdmin,
);


export default bugRouter;