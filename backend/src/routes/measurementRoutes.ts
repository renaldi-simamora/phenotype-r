import { Router } from 'express';
import { MeasurementController } from '../controllers/measurementController';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { createMeasurementSchema, updateMeasurementStatusSchema } from '../validators/measurementValidator';

const router = Router();

router.use(authenticate);

router.post('/', authorize('ADMIN', 'OPERATOR', 'USER'), validate(createMeasurementSchema), MeasurementController.create);
router.get('/', MeasurementController.getAll);
router.get('/:id', MeasurementController.getById);
router.patch('/:id/status', authorize('ADMIN', 'OPERATOR'), validate(updateMeasurementStatusSchema), MeasurementController.updateStatus);
router.get('/:id/sensors', MeasurementController.getSensors);

export default router;
