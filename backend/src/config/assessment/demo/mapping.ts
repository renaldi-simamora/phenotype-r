import { AssessmentMappingConfiguration } from '../../assessmentMapping';

// DEMO ONLY. This content is never research ground truth and never participates in ML.
// PHENOTYPE is a scanning platform; this mapping demonstrates how external systems 
// might interpret the classification results for research purposes.
export const demoAssessmentMapping: AssessmentMappingConfiguration = {
  mode: 'demo',
  label: 'SIMULATION ONLY - not an official assessment',
  mapping_version: 'simulation-v1',
  assessment_version: 'simulation-v1',
  mappings: {
    Class_A: {
      profile: 'Research Profile: Balanced Response',
      description: 'SIMULATION ONLY: This is a placeholder profile for system testing and UI demonstration.',
      dimensions: [
        { name: 'Stability Index', score: 88, level: 'High', description: 'SIMULATION ONLY' },
        { name: 'Spectral Consistency', score: 84, level: 'High', description: 'SIMULATION ONLY' },
        { name: 'Data Reliability', score: 81, level: 'High', description: 'SIMULATION ONLY' },
        { name: 'Signal-to-Noise', score: 79, level: 'Medium', description: 'SIMULATION ONLY' },
        { name: 'Alignment Score', score: 72, level: 'Medium', description: 'SIMULATION ONLY' },
      ],
      characteristics: [{ title: 'Baseline Stability', level: 'High', description: 'SIMULATION ONLY' }],
      strengths: [{ title: 'Low signal variance', description: 'SIMULATION ONLY' }],
      developmentAreas: [{ title: 'Environmental noise sensitivity', description: 'SIMULATION ONLY' }],
      recommendations: [{ category: 'Acquisition', title: 'Maintain controlled lighting', description: 'SIMULATION ONLY' }],
    },
    Class_B: {
      profile: 'Research Profile: Dynamic Response',
      description: 'SIMULATION ONLY: This is a placeholder profile for system testing and UI demonstration.',
      dimensions: [
        { name: 'Stability Index', score: 88, level: 'High', description: 'SIMULATION ONLY' },
        { name: 'Spectral Consistency', score: 84, level: 'High', description: 'SIMULATION ONLY' },
        { name: 'Data Reliability', score: 81, level: 'High', description: 'SIMULATION ONLY' },
        { name: 'Signal-to-Noise', score: 79, level: 'Medium', description: 'SIMULATION ONLY' },
        { name: 'Alignment Score', score: 72, level: 'Medium', description: 'SIMULATION ONLY' },
      ],
      characteristics: [{ title: 'Adaptive Acquisition', level: 'High', description: 'SIMULATION ONLY' }],
      strengths: [{ title: 'Rapid stabilization', description: 'SIMULATION ONLY' }],
      developmentAreas: [{ title: 'Sensor calibration drift', description: 'SIMULATION ONLY' }],
      recommendations: [{ category: 'Acquisition', title: 'Regular re-calibration required', description: 'SIMULATION ONLY' }],
    },
    Class_C: {
      profile: 'Research Profile: Precision Response',
      description: 'SIMULATION ONLY: This is a placeholder profile for system testing and UI demonstration.',
      dimensions: [
        { name: 'Stability Index', score: 88, level: 'High', description: 'SIMULATION ONLY' },
        { name: 'Spectral Consistency', score: 84, level: 'High', description: 'SIMULATION ONLY' },
        { name: 'Data Reliability', score: 81, level: 'High', description: 'SIMULATION ONLY' },
        { name: 'Signal-to-Noise', score: 79, level: 'Medium', description: 'SIMULATION ONLY' },
        { name: 'Alignment Score', score: 72, level: 'Medium', description: 'SIMULATION ONLY' },
      ],
      characteristics: [{ title: 'Precision Mapping', level: 'High', description: 'SIMULATION ONLY' }],
      strengths: [{ title: 'High spectral resolution', description: 'SIMULATION ONLY' }],
      developmentAreas: [{ title: 'Acquisition timeout risk', description: 'SIMULATION ONLY' }],
      recommendations: [{ category: 'Acquisition', title: 'Optimize sampling frequency', description: 'SIMULATION ONLY' }],
    },
  },
};