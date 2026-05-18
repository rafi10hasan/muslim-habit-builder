import { Router } from 'express';
import { faqController } from './faq.controller';
import { FaqValidation } from './faq.zod.validation';
import authMiddleware from '../../middlewares/auth.middleware';
import { USER_ROLE } from '../user/user.constant';
import { validateRequest } from '../../middlewares/request.validator';

const faqRouter = Router();

// createFaqByAdmin
faqRouter.post(
  '/create',
  // authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  validateRequest({body: FaqValidation.createFaqSchemaByAdmin}),
  faqController.createFaqByAdmin
);

// getAllFaqForAdmin
faqRouter.get(
  '/',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  faqController.getAllFaqForAdmin
);

// updateFaq
faqRouter.patch(
  '/update/:id',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  validateRequest({body: FaqValidation.updateFaqSchema}),
  faqController.updateFaq
);

// deleteFaq
faqRouter.delete(
  '/delete/:id',
  authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  faqController.deleteFaq
);

export default faqRouter;
