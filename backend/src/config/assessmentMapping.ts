export type AssessmentClass = 'Class_A' | 'Class_B' | 'Class_C';

export interface AssessmentContentItem {
  title: string;
  description: string;
  level?: string;
  category?: string;
  score?: number;
}

export interface AssessmentDimension {
  name: string;
  score: number;
  level: string;
  description: string;
}

export interface AssessmentMappingEntry {
  profile: string | null;
  description: string | null;
  dimensions: AssessmentDimension[];
  characteristics: AssessmentContentItem[];
  strengths: AssessmentContentItem[];
  developmentAreas: AssessmentContentItem[];
  recommendations: AssessmentContentItem[];
}

export interface AssessmentMappingConfiguration {
  mode: 'official' | 'demo';
  label: string;
  mapping_version: string;
  assessment_version: string;
  mappings: Record<AssessmentClass, AssessmentMappingEntry>;
}

// Deliberately empty until the research methodology supplies authoritative definitions.
export const assessmentMapping: AssessmentMappingConfiguration = {
  mode: 'official',
  label: 'Official mapping not configured',
  mapping_version: 'unconfigured',
  assessment_version: 'unconfigured',
  mappings: {
    Class_A: {
      profile: null,
      description: null,
      dimensions: [],
      characteristics: [],
      strengths: [],
      developmentAreas: [],
      recommendations: [],
    },
    Class_B: {
      profile: null,
      description: null,
      dimensions: [],
      characteristics: [],
      strengths: [],
      developmentAreas: [],
      recommendations: [],
    },
    Class_C: {
      profile: null,
      description: null,
      dimensions: [],
      characteristics: [],
      strengths: [],
      developmentAreas: [],
      recommendations: [],
    },
  },
};