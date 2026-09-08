import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/measurements', AnalyticsController.getMeasurementsStats);
router.get('/predictions', AnalyticsController.getPredictionsStats);
router.get('/sources', AnalyticsController.getDataSourcesStats);
router.get('/devices', AnalyticsController.getDevicesStats);
router.get('/model-performance', AnalyticsController.getModelPerformance);

export default router;
