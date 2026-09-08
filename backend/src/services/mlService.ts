import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface PredictRequestPayload {
  measurement_id: string;
  features: number[];
  model_version?: string;
}

export interface PredictResponsePayload {
  measurement_id: string;
  prediction: string;
  confidence: number;
  probabilities?: {
    Class_A?: number;
    Class_B?: number;
    Class_C?: number;
    [key: string]: number | undefined;
  };
  model_version: string;
}

export class MlService {
  /**
   * Calls the external Python ML Service (POST /predict) via HTTP.
   * Uses env.ML_SERVICE_URL configured in .env.
   */
  static async predict(payload: PredictRequestPayload): Promise<PredictResponsePayload> {
    const url = `${env.ML_SERVICE_URL.replace(/\/$/, '')}/predict`;
    
    logger.info(`Calling ML Service at: ${url} for measurement: ${payload.measurement_id}`);

    const response = await axios.post<PredictResponsePayload>(
      url,
      {
        measurement_id: payload.measurement_id,
        features: payload.features,
        model_version: payload.model_version || 'SVM-v1.0',
      },
      {
        timeout: 10000, // 10 seconds timeout
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }
}
