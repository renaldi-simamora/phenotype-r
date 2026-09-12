import { Measurement } from '../types';
import { MeasurementService } from './measurementService';
import { MlPredictionRepository } from '../repositories/mlPredictionRepository';
import { AssessmentMappingService, ResolvedAssessmentMapping } from './assessmentMappingService';

export type AssessmentStatus = 'MAPPED' | 'MAPPING_NOT_CONFIGURED' | 'UNKNOWN_CLASS' | 'PREDICTION_NOT_AVAILABLE';
export interface AssessmentProbabilities {
  Class_A?: number;
  Class_B?: number;
  Class_C?: number;
  [key: string]: number | undefined;
}

export interface AssessmentResult {
  measurement: {
    id: string;
    sample_count: number;
    quality: Measurement['quality'];
    data_source: Measurement['data_source'];
  };
  prediction: {
    model_name: string;
    model_version: string;
    predicted_class: string;
    confidence: number;
    probabilities: AssessmentProbabilities | null;
  } | null;
  assessment: {
    status: AssessmentStatus;
    mapping_available: boolean;
    mapping_version: string;
    assessment_version: string;
    mapping_mode: 'official' | 'demo';
    mapping_label: string;
    classification_profile: string | null;
    classification_description: string | null;
    characteristics: ResolvedAssessmentMapping['characteristics'];
    dimensions: ResolvedAssessmentMapping['dimensions'];
    strengths: ResolvedAssessmentMapping['strengths'];
    developmentAreas: ResolvedAssessmentMapping['developmentAreas'];
    recommendations: ResolvedAssessmentMapping['recommendations'];
  };
}

export class AssessmentService {
  static async getByMeasurementId(measurementId: string): Promise<AssessmentResult> {
    const measurement = await MeasurementService.getMeasurementById(measurementId);
    const prediction = await MlPredictionRepository.findByMeasurementId(measurementId);

    const resolvedMapping = AssessmentMappingService.resolve(prediction?.prediction);

    return {
      measurement: {
        id: measurement.id,
        sample_count: measurement.sample_count,
        quality: measurement.quality,
        data_source: measurement.data_source,
      },
      prediction: prediction
        ? {
            model_name: prediction.model_name,
            model_version: prediction.model_version,
            predicted_class: prediction.prediction,
            confidence: prediction.confidence,
            probabilities: prediction.probabilities || (prediction.probability_class_a !== undefined || prediction.probability_class_b !== undefined || prediction.probability_class_c !== undefined
              ? {
                  Class_A: prediction.probability_class_a,
                  Class_B: prediction.probability_class_b,
                  Class_C: prediction.probability_class_c,
                }
              : null),
          }
        : null,
      assessment: {
        status: prediction ? resolvedMapping.status : 'PREDICTION_NOT_AVAILABLE',
        mapping_available: prediction ? resolvedMapping.mapping_available : false,
        mapping_version: resolvedMapping.mapping_version,
        assessment_version: resolvedMapping.assessment_version,
        mapping_mode: resolvedMapping.mapping_mode,
        mapping_label: resolvedMapping.mapping_label,
        classification_profile: prediction ? resolvedMapping.classification_profile : null,
        classification_description: prediction ? resolvedMapping.classification_description : null,
        characteristics: prediction ? resolvedMapping.characteristics : [],
        dimensions: prediction ? resolvedMapping.dimensions : [],
        strengths: prediction ? resolvedMapping.strengths : [],
        developmentAreas: prediction ? resolvedMapping.developmentAreas : [],
        recommendations: prediction ? resolvedMapping.recommendations : [],
      },
    };
  }
}