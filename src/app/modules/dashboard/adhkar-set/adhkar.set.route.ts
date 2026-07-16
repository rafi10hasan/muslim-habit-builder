import { Router } from 'express';

import authMiddleware from '../../../middlewares/auth.middleware';
import { validateFormDataRequest } from '../../../middlewares/request.validator';
import { USER_ROLE } from '../../user/user.constant';
import adhakarValidationSchema from './adhkar.set.zod';
import { adhakarController } from './adhkar.set.controller';


const AdhkarRouter = Router();

// ==========================================
// Main Adhkar Set Operations
// ==========================================

// 1. Create a new main Adhkar Set
AdhkarRouter.post(
    '/create',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateFormDataRequest(adhakarValidationSchema.addAdhakarSchema),
    adhakarController.createAdhakarIntoDb
);

// 2. Delete a main Adhkar Set completely
AdhkarRouter.delete(
    '/:setId',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    adhakarController.deleteAdhakarSetFromDb
);

// 3. Preview/Get a single Adhkar Set with its sorted items
AdhkarRouter.get(
    '/preview/:setId',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    adhakarController.previewAdhakarFromDb
);

// ==========================================
// Adhkar Inner Items Operations (Array Index Based)
// ==========================================

// 4. Add a new item inside an Adhkar Set
AdhkarRouter.post(
    '/item/add/:setId',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateFormDataRequest(adhakarValidationSchema.adhakarItemValidationSchema),
    adhakarController.addAdhakarItemIntoDb
);

// 5. Update an existing item using its array index
AdhkarRouter.patch(
    '/item/update/:setId/:itemIndex',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateFormDataRequest(adhakarValidationSchema.updateAdhakarItemSchema),
    adhakarController.updateAdhakarItemInDb
);

// 6. Delete an item from the set using its array index
AdhkarRouter.delete(
    '/item/delete/:setId/:itemIndex',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    adhakarController.deleteAdhakarItemFromDb
);

export default AdhkarRouter;