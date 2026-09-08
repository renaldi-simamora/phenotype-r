import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import deviceRoutes from './deviceRoutes';
import iotRoutes from './iotRoutes';
import measurementRoutes from './measurementRoutes';
import mlRoutes from './mlRoutes';
import analyticsRoutes from './analyticsRoutes';
import auditLogRoutes from './auditLogRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);
router.use('/iot', iotRoutes);
router.use('/measurements', measurementRoutes);
router.use('/ml', mlRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit-logs', auditLogRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PHENOTYPE API is healthy',
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export default router;
