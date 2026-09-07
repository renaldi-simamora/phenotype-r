import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';
import { sendError } from './utils/response';

const app: Application = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate Limiting
app.use('/api', apiLimiter);

// Body Parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Main API Router
app.use('/api', routes);

// 404 Handler
app.use((req: Request, res: Response) => {
  sendError(res, `Route ${req.originalUrl} not found`, 'NOT_FOUND', 404);
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
