import { Router } from "express";

import authMiddleware from "../../../middlewares/auth.middleware";
import { validateRequest } from "../../../middlewares/request.validator";
import { USER_ROLE } from "../../user/user.constant";
import discountValidationZodSchema from "./discount.zod";
import { discountController } from "./discount.controller";




const discountRouter = Router();

discountRouter.post(
    '/add',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    validateRequest({
        body: discountValidationZodSchema.discountSchema
    }),
    discountController.createDiscountIntoDb,
);


discountRouter.patch(
    '/update/:id',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest({
        body: discountValidationZodSchema.updateDiscountSchema,
    }),
    discountController.updateDiscountIntoDb,
);

discountRouter.delete(
    '/delete/:id',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    discountController.deleteDiscountIntoDb,
);

discountRouter.get(
    '/retrieve',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    discountController.getAllDiscountsForAdmin,
);


export default discountRouter;