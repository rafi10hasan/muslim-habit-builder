import { Router } from 'express';

import { uploadFile } from '../../../helpers/fileuploader';

import { validateFileSizes } from '../../middlewares/validateFileSize';
import { quranContentController } from './quran.content.controller';
import { validateFormDataRequest } from '../../middlewares/request.validator';
import quranVerseValidationSchema from './quran.content.zod';



const quranContentRouter = Router();

quranContentRouter.post(
    '/create',
    uploadFile(),
    validateFileSizes,
    validateFormDataRequest(quranVerseValidationSchema.quranVerseschema),
    quranContentController.createQuranContentIntoDb,
);

export default quranContentRouter;