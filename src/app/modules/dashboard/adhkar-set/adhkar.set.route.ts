import { Router } from 'express';

import authMiddleware from '../../../middlewares/auth.middleware';
import { validateFormDataRequest, validateRequest } from '../../../middlewares/request.validator';
import { USER_ROLE } from '../../user/user.constant';
import adhakarValidationSchema from './adhkar.set.zod';
import { adhakarController } from './adhkar.set.controller';


const adhkarRouter = Router();

// ==========================================
// Main Adhkar Set Operations
// ==========================================

// 1. Create a new main Adhkar Set
adhkarRouter.post(
    '/add',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest({body:adhakarValidationSchema.addAdhakarSchema}),
    adhakarController.createAdhakarIntoDb
);

// 2. Delete a main Adhkar Set completely
adhkarRouter.delete(
    '/delete/:setId',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    adhakarController.deleteAdhakarSetFromDb
);

// 3. Preview/Get a single Adhkar Set with its sorted items
adhkarRouter.get(
    '/preview/:setId',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    adhakarController.previewAdhakarFromDb
);

// ==========================================
// Adhkar Inner Items Operations (Array Index Based)
// ==========================================

// 4. Add a new item inside an Adhkar Set
adhkarRouter.post(
    '/item/add/:setId',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest({body:adhakarValidationSchema.adhakarItemValidationSchema}),
    adhakarController.addAdhakarItemIntoDb
);

// 5. Update an existing item using its array index
adhkarRouter.patch(
    '/item/update/:setId/:itemIndex',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest({body:adhakarValidationSchema.updateAdhakarItemSchema}),
    adhakarController.updateAdhakarItemInDb
);

// 6. Delete an item from the set using its array index
adhkarRouter.delete(
    '/item/delete/:setId/:itemIndex',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    adhakarController.deleteAdhakarItemFromDb
);
// 7. Reorder items in the set by their index
adhkarRouter.patch(
    '/item/reorder/:setId',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    validateRequest({body:adhakarValidationSchema.reorderAdhkarItemsByIndexSchema}),
    adhakarController.reorderAdhkarItemsByIndex
);

// 8. Get names of all Adhkar Sets
adhkarRouter.get(
    '/',
    authMiddleware(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
    adhakarController.getAdhkarSetNames
);

export default adhkarRouter;