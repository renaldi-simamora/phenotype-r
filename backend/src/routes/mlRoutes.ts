import { Router } from 'express';
import { MlController } from '../controllers/mlController';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';

const router = Router();

router.use(authenticate);

router.get('/predictions/:measurementId', MlController.getPredictionByMeasurementId);
router.get('/models', authorize('ADMIN'), MlController.getModels);
router.get('/models/:id', authorize('ADMIN'), MlController.getModelById);

export default router;
