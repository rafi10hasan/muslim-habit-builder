import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { userHabitController } from './user.habit.controller';
import userHabitValidationZodSchema from './user.habit.zod';



const userHabitRouter = Router();

userHabitRouter.post(
    '/add/:habitId',
    authMiddleware(USER_ROLE.USER, USER_ROLE.GUEST),
    validateRequest({
        params: userHabitValidationZodSchema.habitParamsZod,
    }),
    userHabitController.addHabitInYourHabitListIntoDb,
);

userHabitRouter.get(
    '/today',
    authMiddleware(USER_ROLE.USER, USER_ROLE.GUEST),
    userHabitController.getTodayHabits,
);

userHabitRouter.post(
    '/custom/add',
    authMiddleware(USER_ROLE.USER, USER_ROLE.GUEST),
    validateRequest({
        body: userHabitValidationZodSchema.addCustomHabitSchema,
    }),
    userHabitController.addCustomHabitIntoDb,
);

userHabitRouter.patch(
    '/update/:habitId',
    authMiddleware(USER_ROLE.USER, USER_ROLE.GUEST),
    validateRequest({
        body: userHabitValidationZodSchema.editHabitSchema,
    }),
    userHabitController.updateHabitIntodb,
);

userHabitRouter.get(
    '/search/:habitId',
    authMiddleware(USER_ROLE.USER, USER_ROLE.GUEST),
    userHabitController.searchHabitsToConnect,
);


userHabitRouter.get(
    '/details/:habitId',
    authMiddleware(USER_ROLE.USER, USER_ROLE.GUEST),
    userHabitController.getHabitDetail,
);


export default userHabitRouter;
