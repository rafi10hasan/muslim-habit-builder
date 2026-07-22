import { Router } from 'express';
import { uploadFile } from '../../../../helpers/fileuploader';
import authMiddleware from '../../../middlewares/auth.middleware';
import { validateFormDataRequest, validateRequest } from '../../../middlewares/request.validator';
import { validateFileSizes } from '../../../middlewares/validateFileSize';
import { USER_ROLE } from '../../user/user.constant';
import { quranContentController } from './quran.content.controller';
import quranVerseValidationSchema from './quran.content.zod';



const quranContentRouter = Router();

quranContentRouter.post(
    '/create',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    uploadFile(),
    validateFileSizes,
    validateFormDataRequest(quranVerseValidationSchema.quranVerseschema),
    quranContentController.createQuranContentIntoDb,
);

quranContentRouter.patch(
    '/update/:id',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest({body:quranVerseValidationSchema.updateQuranVerseschema}),
    quranContentController.updateQuranContentIntoDb,
);

quranContentRouter.delete(
    '/delete/:id',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    quranContentController.deleteQuranContentIntoDb,
);

quranContentRouter.get(
    '/:id',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    quranContentController.getSingleQuranContentIntoDb,
);


quranContentRouter.get(
    '/preview/:id',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    quranContentController.getQuranContentPreview
);

quranContentRouter.post(
    '/image/:id',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    uploadFile(),
    validateFileSizes,
    quranContentController.addVerseInQuranContent,
);

quranContentRouter.post(
    '/image/reorder/:id',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    quranContentController.reOrderVerseInQuranContent,
);

quranContentRouter.delete(
    '/image/delete/:id',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    quranContentController.deleteVerseImageInQuranContent,
);

quranContentRouter.put(
    '/image/replace/:id',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    uploadFile(),
    validateFileSizes,
    quranContentController.replaceVerseImageInQuranContent,
);

quranContentRouter.get(
    '/',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    quranContentController.getQuranContentNames,
);

export default quranContentRouter;