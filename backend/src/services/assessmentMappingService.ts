import {
  AssessmentClass,
  AssessmentContentItem,
  AssessmentMappingConfiguration,
} from '../config/assessmentMapping';
import { env } from '../config/env';
import { demoAssessmentMapping } from '../config/assessment/demo/mapping';
import { officialAssessmentMapping } from '../config/assessment/official/mapping';

export type AssessmentMappingStatus = 'MAPPED' | 'MAPPING_NOT_CONFIGURED' | 'UNKNOWN_CLASS';

/**
 * ResolvedAssessmentMapping
 * Represents the mapping of a predicted class to its research/simulation semantics.
 * Note: These profiles are for research/simulation purposes and do not represent
 * final biological or personality assessments.
 */
export interface ResolvedAssessmentMapping {
  status: AssessmentMappingStatus;
  mapping_available: boolean;
  mapping_version: string;
  assessment_version: string;
  predicted_class: string | null;
  classification_profile: string | null;
  classification_description: string | null;
  characteristics: AssessmentContentItem[];
  strengths: AssessmentContentItem[];
  developmentAreas: AssessmentContentItem[];
  recommendations: AssessmentContentItem[];
  dimensions: AssessmentMappingConfiguration['mappings'][AssessmentClass]['dimensions'];
  mapping_mode: 'official' | 'demo';
  mapping_label: string;
}

function normalizeClass(value: string): AssessmentClass | null {
  const normalized = value.trim().toUpperCase().replace(/[-\s]/g, '_');
  const classNames: Record<string, AssessmentClass> = {
    CLASS_A: 'Class_A',
    CLASS_B: 'Class_B',
    CLASS_C: 'Class_C',
  };
  return classNames[normalized] || null;
}

export class AssessmentMappingService {
  /**
   * Resolves a predicted class into its configured research/simulation profile.
   * PHENOTYPE is a scanning platform; this mapping is external to the core acquisition.
   */
  static resolve(
    predictedClass: string | null | undefined,
    configuration?: AssessmentMappingConfiguration
  ): ResolvedAssessmentMapping {
    const selectedConfiguration = configuration || (env.ASSESSMENT_MAPPING_MODE === 'demo' && env.NODE_ENV === 'development'
      ? demoAssessmentMapping
      : officialAssessmentMapping);
    const normalizedClass = predictedClass ? normalizeClass(predictedClass) : null;
    const entry = normalizedClass ? selectedConfiguration.mappings[normalizedClass] : undefined;
    const mappingAvailable = Boolean(
      entry && (entry.profile || entry.description || entry.dimensions.length || entry.characteristics.length || entry.strengths.length || entry.developmentAreas.length || entry.recommendations.length)
    );

    return {
      status: !normalizedClass ? 'UNKNOWN_CLASS' : mappingAvailable ? 'MAPPED' : 'MAPPING_NOT_CONFIGURED',
      mapping_available: mappingAvailable,
      mapping_version: selectedConfiguration.mapping_version,
      assessment_version: selectedConfiguration.assessment_version,
      predicted_class: predictedClass || null,
      classification_profile: entry?.profile || null,
      classification_description: entry?.description || null,
      characteristics: entry?.characteristics || [],
      strengths: entry?.strengths || [],
      developmentAreas: entry?.developmentAreas || [],
      recommendations: entry?.recommendations || [],
      dimensions: entry?.dimensions || [],
      mapping_mode: selectedConfiguration.mode,
      mapping_label: selectedConfiguration.label,
    };
  }
}