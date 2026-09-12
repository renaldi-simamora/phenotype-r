import { AssessmentMappingConfiguration } from '../../assessmentMapping';

// Source of truth for research/production mapping. Kept empty until the official methodology is supplied.
export const officialAssessmentMapping: AssessmentMappingConfiguration = {
  mode: 'official',
  label: 'Official mapping not configured',
  mapping_version: 'unconfigured',
  assessment_version: 'unconfigured',
  mappings: {
    Class_A: { profile: null, description: null, dimensions: [], characteristics: [], strengths: [], developmentAreas: [], recommendations: [] },
    Class_B: { profile: null, description: null, dimensions: [], characteristics: [], strengths: [], developmentAreas: [], recommendations: [] },
    Class_C: { profile: null, description: null, dimensions: [], characteristics: [], strengths: [], developmentAreas: [], recommendations: [] },
  },
};