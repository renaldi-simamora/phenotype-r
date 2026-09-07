import { Router } from 'express';
import { DeviceController } from '../controllers/deviceController';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { createDeviceSchema, updateDeviceSchema } from '../validators/deviceValidator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'OPERATOR'), DeviceController.getAll);
router.post('/', authorize('ADMIN'), validate(createDeviceSchema), DeviceController.create);
router.get('/:id', authorize('ADMIN', 'OPERATOR'), DeviceController.getById);
router.patch('/:id', authorize('ADMIN'), validate(updateDeviceSchema), DeviceController.update);

export default router;
