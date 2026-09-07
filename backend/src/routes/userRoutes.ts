import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { createUserSchema, updateUserSchema } from '../validators/userValidator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN'), UserController.getAll);
router.post('/', authorize('ADMIN'), validate(createUserSchema), UserController.create);
router.get('/:id', UserController.getById);
router.patch('/:id', validate(updateUserSchema), UserController.update);
router.delete('/:id', authorize('ADMIN'), UserController.delete);

export default router;
