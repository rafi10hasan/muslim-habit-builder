import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { habitTemplateController } from './system.habit.controller';
import systemHabitValidationZodSchema from './system.habit.zod';


const habitTemplateRouter = Router();

habitTemplateRouter.post(
    '/create',
    //   authMiddleware(USER_ROLE.SUPER_ADMIN),
    validateRequest(
        {
            body: systemHabitValidationZodSchema.createHabitTemplateZod,
        }

    ),
    habitTemplateController.createHabitTemplate,
);


habitTemplateRouter.get(
    '/get-habits',
    authMiddleware(USER_ROLE.GUEST, USER_ROLE.USER, USER_ROLE.SUPER_ADMIN),
    habitTemplateController.getSystemHabits,
);


export default habitTemplateRouter;
