import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLogController';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', AuditLogController.getAll);

export default router;
