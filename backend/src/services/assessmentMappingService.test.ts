import assert from 'node:assert/strict';
import test from 'node:test';
import { AssessmentMappingConfiguration } from '../config/assessmentMapping';
import { officialAssessmentMapping } from '../config/assessment/official/mapping';
import { AssessmentMappingService } from './assessmentMappingService';

const fixture: AssessmentMappingConfiguration = {
  mapping_version: 'test-mapping-1',
  assessment_version: 'test-assessment-1',
  mode: 'official',
  label: 'Test mapping',
  mappings: {
    Class_A: { profile: 'Test Profile A', description: 'Test only', dimensions: [], characteristics: [], strengths: [], developmentAreas: [], recommendations: [] },
    Class_B: { profile: 'Test Profile B', description: 'Test only', dimensions: [], characteristics: [], strengths: [], developmentAreas: [], recommendations: [] },
    Class_C: { profile: 'Test Profile C', description: 'Test only', dimensions: [], characteristics: [], strengths: [], developmentAreas: [], recommendations: [] },
  },
};

test('resolves Class A, Class B, and Class C only when mapping content is supplied', () => {
  assert.equal(AssessmentMappingService.resolve('Class_A', fixture).classification_profile, 'Test Profile A');
  assert.equal(AssessmentMappingService.resolve('Class_B', fixture).classification_profile, 'Test Profile B');
  assert.equal(AssessmentMappingService.resolve('Class_C', fixture).classification_profile, 'Test Profile C');
});

test('handles unknown classes without inventing a profile', () => {
  const result = AssessmentMappingService.resolve('Class_D', fixture);
  assert.equal(result.status, 'UNKNOWN_CLASS');
  assert.equal(result.mapping_available, false);
  assert.equal(result.classification_profile, null);
});

test('empty production mapping remains unavailable', () => {
  const result = AssessmentMappingService.resolve('Class_A');
  assert.equal(result.status, 'MAPPING_NOT_CONFIGURED');
  assert.equal(result.mapping_available, false);
  assert.equal(result.classification_profile, null);
  assert.deepEqual(result.characteristics, []);
  assert.deepEqual(result.strengths, []);
  assert.deepEqual(result.developmentAreas, []);
  assert.deepEqual(result.recommendations, []);
});

test('official mapping ships unconfigured with no semantics for any class', () => {
  assert.equal(officialAssessmentMapping.mapping_version, 'unconfigured');
  assert.equal(officialAssessmentMapping.assessment_version, 'unconfigured');
  for (const className of ['Class_A', 'Class_B', 'Class_C'] as const) {
    const entry = officialAssessmentMapping.mappings[className];
    assert.equal(entry.profile, null);
    assert.equal(entry.description, null);
    assert.deepEqual(entry.dimensions, []);
    assert.deepEqual(entry.characteristics, []);
    assert.deepEqual(entry.strengths, []);
    assert.deepEqual(entry.developmentAreas, []);
    assert.deepEqual(entry.recommendations, []);
  }
});

test('production resolution never invents meaning for Class_A/B/C', () => {
  for (const className of ['Class_A', 'Class_B', 'Class_C'] as const) {
    const result = AssessmentMappingService.resolve(className);
    assert.equal(result.status, 'MAPPING_NOT_CONFIGURED');
    assert.equal(result.mapping_available, false);
    assert.equal(result.classification_profile, null);
    assert.equal(result.classification_description, null);
    assert.deepEqual(result.dimensions, []);
    assert.deepEqual(result.characteristics, []);
    assert.deepEqual(result.strengths, []);
    assert.deepEqual(result.developmentAreas, []);
    assert.deepEqual(result.recommendations, []);
  }
});

test('production resolution output carries no STIFIn or assessment terms', () => {
  const serialized = JSON.stringify(AssessmentMappingService.resolve('Class_A')).toLowerCase();
  for (const forbidden of ['stifin', 'personality', 'kepribadian', 'assessment profile', 'sensing', 'thinking', 'feeling', 'intuiting']) {
    assert.equal(serialized.includes(forbidden), false, `unexpected semantic term: ${forbidden}`);
  }
});
