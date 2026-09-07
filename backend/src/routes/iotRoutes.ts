import { Router } from 'express';
import { IotController } from '../controllers/iotController';
import { deviceAuth } from '../middlewares/deviceAuth';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { iotMeasurementSchema, iotHeartbeatSchema, iotStatusSchema } from '../validators/iotValidator';

const router = Router();

// ESP32 device authenticated routes
router.post('/measurements', deviceAuth, validate(iotMeasurementSchema), IotController.sendSensorData);
router.post('/heartbeat', deviceAuth, validate(iotHeartbeatSchema), IotController.heartbeat);
router.post('/device-status', deviceAuth, validate(iotStatusSchema), IotController.updateStatus);

// User-facing IoT device status route
router.get('/devices/:deviceId/status', authenticate, IotController.getDeviceStatus);

export default router;
