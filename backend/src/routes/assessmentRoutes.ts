import { Router } from 'express';
import { AssessmentController } from '../controllers/assessmentController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);
router.get('/:measurementId', AssessmentController.getByMeasurementId);

export default router;