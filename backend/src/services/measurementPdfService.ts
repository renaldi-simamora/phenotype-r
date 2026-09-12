import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Measurement, RawSensorSample } from '../types';
import { MeasurementService } from './measurementService';
import { RawSampleRepository } from '../repositories/rawSampleRepository';
import { SensorRepository } from '../repositories/sensorRepository';
import { Err } from '../utils/errors';

type PdfValue = string | number | null | undefined;
type NumericRecord = Record<string, number>;

const FEATURE_KEYS = [
  ['AS7341 F1', 'as7341_f1'], ['AS7341 F2', 'as7341_f2'], ['AS7341 F3', 'as7341_f3'],
  ['AS7341 F4', 'as7341_f4'], ['AS7341 F5', 'as7341_f5'], ['AS7341 F6', 'as7341_f6'],
  ['AS7341 F7', 'as7341_f7'], ['AS7341 F8', 'as7341_f8'], ['AS7341 Clear', 'as7341_clear'],
  ['AS7341 NIR', 'as7341_nir'], ['TCS34725 R', 'tcs34725_r'], ['TCS34725 G', 'tcs34725_g'],
  ['TCS34725 B', 'tcs34725_b'], ['TCS34725 Clear', 'tcs34725_clear'],
  ['VL53L1X Distance_mm', 'vl53l1x_distance_mm'],
] as const;
const PATTERN_CHANNELS = FEATURE_KEYS.map(([, key]) => key);
const LABEL_DISCLAIMER = 'Class A/B/C merupakan label penelitian/simulasi pada model dan belum merepresentasikan kategori biologis, genetik, kepribadian, STIFIn, ras/etnis, atau kondisi medis.';

interface ChannelPattern {
  mean: number;
  standardDeviation: number;
  coefficientOfVariation: number | null;
  slope: number | null;
  rSquared: number | null;
  outlierCount: number;
}
export interface PatternMetrics {
  channels: Record<string, ChannelPattern>;
  averageCv: number | null;
  averageOutlierCount: number;
  trendChannel: string | null;
  trendSlope: number | null;
  trendRSquared: number | null;
  crossSensorPair: { first: string; second: string; correlation: number } | null;
  motionEvidence: boolean;
  available: boolean;
}
interface ModelEvidence {
  finalMetrics: NumericRecord | null;
  metadata: Record<string, unknown> | null;
  ablationRows: Array<Record<string, string>>;
}

function formatValue(value: PdfValue, digits = 3): string {
  if (value === null || value === undefined || value === '') return 'Tidak tersedia';
  return typeof value === 'number' ? value.toFixed(digits) : String(value);
}
function formatPercent(value: number | null | undefined, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : 'Tidak tersedia';
}
function classLabel(value?: string): string { return value ? value.replace(/_/g, ' ') : 'Tidak tersedia'; }
function sourceLabel(source: Measurement['data_source']): string { return source === 'iot_real' ? 'IoT REAL' : 'SINTETIS / SIMULASI'; }
function mean(values: number[]): number | null { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
function standardDeviation(values: number[], average: number): number {
  if (values.length < 2) return 0;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length);
}
function regression(values: number[]): { slope: number; rSquared: number } | null {
  if (values.length < 3) return null;
  const xMean = (values.length - 1) / 2;
  const yMean = mean(values) || 0;
  const denominator = values.reduce((sum, _, index) => sum + (index - xMean) ** 2, 0);
  if (!denominator) return null;
  const slope = values.reduce((sum, value, index) => sum + (index - xMean) * (value - yMean), 0) / denominator;
  const ssTotal = values.reduce((sum, value) => sum + (value - yMean) ** 2, 0);
  if (ssTotal === 0) return { slope: 0, rSquared: 1 };
  const intercept = yMean - slope * xMean;
  const ssResidual = values.reduce((sum, value, index) => sum + (value - (intercept + slope * index)) ** 2, 0);
  return { slope, rSquared: Math.max(0, 1 - ssResidual / ssTotal) };
}
function correlation(first: number[], second: number[]): number | null {
  if (first.length < 3 || first.length !== second.length) return null;
  const firstMean = mean(first) || 0;
  const secondMean = mean(second) || 0;
  const numerator = first.reduce((sum, value, index) => sum + (value - firstMean) * (second[index] - secondMean), 0);
  const firstDenominator = Math.sqrt(first.reduce((sum, value) => sum + (value - firstMean) ** 2, 0));
  const secondDenominator = Math.sqrt(second.reduce((sum, value) => sum + (value - secondMean) ** 2, 0));
  return firstDenominator && secondDenominator ? numerator / (firstDenominator * secondDenominator) : null;
}
function pairLabel(pair: PatternMetrics['crossSensorPair']): string {
  return pair ? `${pair.first} / ${pair.second}` : 'Tidak tersedia';
}
function pairValue(pair: PatternMetrics['crossSensorPair']): number | undefined {
  return pair?.correlation;
}

export function calculatePatterns(samples: RawSensorSample[]): PatternMetrics {
  if (samples.length < 3) return { channels: {}, averageCv: null, averageOutlierCount: 0, trendChannel: null, trendSlope: null, trendRSquared: null, crossSensorPair: null, motionEvidence: false, available: false };
  const channels: Record<string, ChannelPattern> = {};
  for (const key of PATTERN_CHANNELS) {
    const values = samples.map((sample) => Number(sample[key as keyof RawSensorSample])).filter(Number.isFinite);
    const channelMean = mean(values);
    if (channelMean === null) continue;
    const std = standardDeviation(values, channelMean);
    const cv = channelMean !== 0 ? (std / Math.abs(channelMean)) * 100 : null;
    const fit = regression(values);
    const outlierCount = std === 0 ? 0 : values.filter((value) => Math.abs((value - channelMean) / std) > 2).length;
    channels[key] = { mean: channelMean, standardDeviation: std, coefficientOfVariation: cv, slope: fit?.slope ?? null, rSquared: fit?.rSquared ?? null, outlierCount };
  }
  const cvs = Object.values(channels).map((channel) => channel.coefficientOfVariation).filter((value): value is number => value !== null);
  const trendCandidates = Object.entries(channels).filter(([, channel]) => channel.slope !== null && channel.rSquared !== null && channel.rSquared > 0.6).sort(([, first], [, second]) => Math.abs(second.slope || 0) - Math.abs(first.slope || 0));
  const trend = trendCandidates[0];
  const distance = samples.map((sample) => sample.vl53l1x_distance_mm).filter(Number.isFinite);
  const spectralTrend = trend && trend[0] !== 'vl53l1x_distance_mm';
  const motionCorrelation = spectralTrend && distance.length === samples.length ? correlation(samples.map((sample) => sample[trend[0] as keyof RawSensorSample] as number), distance) : null;
  const sensorSeries = PATTERN_CHANNELS.filter((key) => key !== 'vl53l1x_distance_mm');
  let strongestPair: PatternMetrics['crossSensorPair'] = null;
  for (let firstIndex = 0; firstIndex < sensorSeries.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < sensorSeries.length; secondIndex += 1) {
      const first = samples.map((sample) => Number(sample[sensorSeries[firstIndex] as keyof RawSensorSample])).filter(Number.isFinite);
      const second = samples.map((sample) => Number(sample[sensorSeries[secondIndex] as keyof RawSensorSample])).filter(Number.isFinite);
      const value = correlation(first, second);
      if (value !== null && (!strongestPair || Math.abs(value) > Math.abs(strongestPair.correlation))) strongestPair = { first: sensorSeries[firstIndex], second: sensorSeries[secondIndex], correlation: value };
    }
  }
  return { channels, averageCv: mean(cvs), averageOutlierCount: Object.values(channels).reduce((sum, channel) => sum + channel.outlierCount, 0), trendChannel: trend?.[0] || null, trendSlope: trend?.[1].slope ?? null, trendRSquared: trend?.[1].rSquared ?? null, crossSensorPair: strongestPair, motionEvidence: Boolean(spectralTrend && motionCorrelation !== null && Math.abs(motionCorrelation) >= 0.6), available: true };
}

function parseCsvLine(line: string): string[] { return line.split(',').map((value) => value.trim().replace(/^"|"$/g, '')); }
function readModelEvidence(): ModelEvidence {
  const root = path.resolve(__dirname, '../../../ml');
  let finalMetrics: NumericRecord | null = null;
  let metadata: Record<string, unknown> | null = null;
  let ablationRows: Array<Record<string, string>> = [];
  try {
    const metricsLines = fs.readFileSync(path.join(root, 'tables', 'final_metrics.csv'), 'utf8').trim().split(/\r?\n/);
    const headers = parseCsvLine(metricsLines[0]);
    const values = parseCsvLine(metricsLines[1]);
    const parsedMetrics: NumericRecord = {};
    headers.forEach((header, index) => { const value = Number(values[index]); if (Number.isFinite(value)) parsedMetrics[header] = value; });
    finalMetrics = parsedMetrics;
  } catch { /* Optional model evidence is unavailable in some deployments. */ }
  try {
    metadata = JSON.parse(fs.readFileSync(path.join(root, 'models', 'metadata.json'), 'utf8')) as Record<string, unknown>;
  } catch { /* Optional model evidence is unavailable in some deployments. */ }
  try {
    const ablationLines = fs.readFileSync(path.join(root, 'tables', 'ablation_results.csv'), 'utf8').trim().split(/\r?\n/);
    const ablationHeaders = parseCsvLine(ablationLines[0]);
    ablationRows = ablationLines.slice(1).map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [ablationHeaders[index], value])));
  } catch { /* Optional ablation evidence is unavailable in some deployments. */ }
  try {
    return { finalMetrics, metadata, ablationRows };
  } catch { return { finalMetrics: null, metadata: null, ablationRows: [] }; }
}

export class MeasurementPdfService {
  static async generate(measurementId: string): Promise<Buffer> {
    if (!measurementId.trim()) throw Err.badRequest('Measurement ID wajib diisi', 'MEASUREMENT_ID_REQUIRED');
    const measurement = await MeasurementService.getMeasurementById(measurementId);
    const [rawSamples, sensorReadings] = await Promise.all([RawSampleRepository.findByMeasurementId(measurement.id), SensorRepository.findByMeasurementId(measurement.id)]);
    if (!measurement.prediction) throw Err.badRequest('Measurement belum memiliki hasil SVM', 'PREDICTION_NOT_AVAILABLE');
    if (typeof measurement.prediction.confidence !== 'number') throw Err.badRequest('Confidence hasil SVM belum tersedia', 'PREDICTION_DATA_INCOMPLETE');
    if (!measurement.features_summary && rawSamples.length === 0 && sensorReadings.length === 0) throw Err.badRequest('Data sensor measurement belum tersedia', 'SENSOR_DATA_NOT_AVAILABLE');
    const prediction = measurement.prediction;

    const patterns = calculatePatterns(rawSamples);
    const model = readModelEvidence();
    const featureSummaryFromRaw = rawSamples.length >= 20
      ? Object.fromEntries(PATTERN_CHANNELS.map((key) => [key, patterns.channels[key]?.mean]))
      : null;
    const distanceValues = rawSamples.map((sample) => sample.vl53l1x_distance_mm).filter(Number.isFinite);
    const document = new PDFDocument({ size: 'A4', margin: 42, info: { Title: 'PHENOTYPE - Laporan Hasil Pengukuran Multi-Sensor' } });
    const chunks: Buffer[] = [];
    const result = new Promise<Buffer>((resolve, reject) => { document.on('data', (chunk: Buffer) => chunks.push(chunk)); document.on('end', () => resolve(Buffer.concat(chunks))); document.on('error', reject); });
    const page = (title: string, subtitle?: string) => { document.addPage().fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(title); if (subtitle) document.moveDown(0.25).font('Helvetica').fontSize(9).fillColor('#64748b').text(subtitle); document.moveDown(0.5).strokeColor('#0f766e').lineWidth(2).moveTo(42, document.y).lineTo(553, document.y).stroke().moveDown(0.8); };
    const section = (title: string) => { document.moveDown(0.6).font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(title); document.moveDown(0.2).strokeColor('#cbd5e1').lineWidth(0.6).moveTo(42, document.y).lineTo(553, document.y).stroke().moveDown(0.3); };
    const row = (label: string, value: PdfValue, digits = 3) => { document.font('Helvetica-Bold').fontSize(9).fillColor('#334155').text(`${label}: `, { continued: true }); document.font('Helvetica').text(formatValue(value, digits)); };
    const note = (text: string) => document.font('Helvetica').fontSize(9).fillColor('#475569').text(text, { lineGap: 3 });
    const card = (label: string, value: string) => { const top = document.y; document.roundedRect(42, top, 511, 54, 6).fill('#f1f5f9'); document.fillColor('#64748b').font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), 56, top + 10); document.fillColor('#0f172a').font('Helvetica-Bold').fontSize(17).text(value, 56, top + 25); document.y = top + 66; };
    const metricValue = (key: string) => model.finalMetrics?.[key];

    // PAGE 1 - Ringkasan pengukuran + hasil klasifikasi model
    document.font('Helvetica-Bold').fontSize(26).fillColor('#0f172a').text('PHENOTYPE');
    document.moveDown(0.4).fontSize(18).fillColor('#0f766e').text('LAPORAN HASIL PENGUKURAN MULTI-SENSOR');
    section('Ringkasan pengukuran');
    row('Measurement ID', measurement.id);
    row('Device ID', measurement.device_id);
    row('Timestamp', measurement.completed_at || measurement.created_at);
    row('Data source', sourceLabel(measurement.data_source));
    row('Jumlah sampel', measurement.sample_count || rawSamples.length, 0);
    row('Status pengukuran', measurement.status === 'COMPLETED' ? 'SELESAI' : measurement.status);
    row('Kualitas pengukuran', measurement.quality);
    section('Hasil klasifikasi model');
    card('Hasil klasifikasi model', classLabel(prediction.prediction));
    row('Confidence', formatPercent(prediction.confidence, 2));
    document.moveDown(0.6); note(`Catatan: ${LABEL_DISCLAIMER}`);

    // PAGE 2 - Analisis pola pengukuran
    page('ANALISIS POLA PENGUKURAN', 'Perhitungan dibuat dari raw samples yang tersimpan.');
    if (!patterns.available) note('Data tidak cukup untuk analisis pola ini.'); else {
      row('CV rata-rata seluruh channel', patterns.averageCv, 2);
      row('Jumlah outlier (|z| > 2)', patterns.averageOutlierCount, 0);
      row('Trend terkuat (R-squared > 0.6)', patterns.trendChannel || 'Tidak ditemukan');
      row('Slope trend', patterns.trendSlope, 4);
      row('R-squared trend', patterns.trendRSquared, 3);
      row('Korelasi sensor terkuat', pairLabel(patterns.crossSensorPair));
      row('Nilai korelasi Pearson', pairValue(patterns.crossSensorPair), 3);
      row('Bukti motion', patterns.motionEvidence ? 'TERSEDIA berdasarkan trend + korelasi distance' : 'TIDAK DINYATAKAN');
      document.moveDown(0.6);
      note('Ambang stabilitas: CV < 5% rendah, 5-15% sedang, > 15% tinggi. Trend hanya dipilih ketika R-squared > 0.6; motion hanya dinyatakan bila trend spectral dan korelasi dengan VL53L1X memenuhi ambang.');
    }

    // PAGE 3 - Ringkasan hasil pengukuran (teknis)
    page('RINGKASAN HASIL PENGUKURAN', 'Ringkasan teknis kondisi pengukuran.');
    row('Jumlah sampel', rawSamples.length, 0);
    row('Kualitas pengukuran', measurement.quality);
    row('Stabilitas sensor (CV rata-rata)', patterns.averageCv, 2);
    row('Distance mean (mm)', mean(distanceValues), 2);
    row('Distance minimum (mm)', distanceValues.length ? Math.min(...distanceValues) : undefined, 2);
    row('Distance maximum (mm)', distanceValues.length ? Math.max(...distanceValues) : undefined, 2);
    row('Status pemrosesan', measurement.status);
    row('Data source', sourceLabel(measurement.data_source));
    document.moveDown(0.6);
    note(`Hasil klasifikasi model tersedia pada bagian "Hasil Klasifikasi Model" (halaman 1) dan "Hasil Klasifikasi Machine Learning" (halaman 6). ${LABEL_DISCLAIMER}`);

    // PAGE 4 - Hasil pengukuran / IoT
    page('HASIL PENGUKURAN DAN DATA PERANGKAT');
    row('Measurement ID', measurement.id);
    row('Device ID', measurement.device_id);
    row('Timestamp', measurement.completed_at || measurement.created_at);
    row('Data source', sourceLabel(measurement.data_source));
    row('Jumlah sampel', rawSamples.length, 0);
    row('Measurement quality', measurement.quality);
    row('Processing status', measurement.status);
    row('Distance mean (mm)', mean(distanceValues), 2);
    row('Distance minimum (mm)', distanceValues.length ? Math.min(...distanceValues) : undefined, 2);
    row('Distance maximum (mm)', distanceValues.length ? Math.max(...distanceValues) : undefined, 2);
    document.moveDown(0.6);
    note('Sumber data: SINTETIS / SIMULASI. Hardware integration: PENDING.');
    note('Tidak ada telemetri perangkat (Wi-Fi, IP, uptime, atau status koneksi) yang ditampilkan karena hardware belum terintegrasi.');

    // PAGE 5 - Ringkasan sensor
    page('RINGKASAN SENSOR');
    const sensorGroups = [['AS7341', PATTERN_CHANNELS.slice(0, 10)], ['TCS34725', PATTERN_CHANNELS.slice(10, 14)], ['VL53L1X', PATTERN_CHANNELS.slice(14)]] as const;
    for (const [group, keys] of sensorGroups) {
      section(group);
      for (const key of keys) {
        const channel = patterns.channels[key];
        row(`${key} mean`, channel?.mean, 2);
        if (channel) row('  std / CV / outlier', `${formatValue(channel.standardDeviation, 2)} / ${formatValue(channel.coefficientOfVariation, 2)}% / ${channel.outlierCount}`);
      }
    }
    document.moveDown(0.6);
    note('Ringkasan ini adalah evidence pengukuran dan tidak merupakan interpretasi biologis.');

    // PAGE 6 - Hasil klasifikasi machine learning
    page('HASIL KLASIFIKASI MACHINE LEARNING');
    card('Prediksi model', classLabel(prediction.prediction));
    card('Confidence', formatPercent(prediction.confidence, 2));
    section('Probabilitas');
    row('Class A', prediction.probability_class_a ?? prediction.probabilities?.Class_A);
    row('Class B', prediction.probability_class_b ?? prediction.probabilities?.Class_B);
    row('Class C', prediction.probability_class_c ?? prediction.probabilities?.Class_C);
    section('Konfigurasi model');
    row('Model', prediction.model_name);
    row('Versi', prediction.model_version);
    row('Jumlah fitur', 15, 0);
    row('Jumlah sampel', measurement.sample_count || rawSamples.length, 0);
    document.moveDown(0.6);
    note('Prediksi Class A/B/C merupakan keluaran model pada dataset penelitian/simulasi. Kelas tersebut belum memiliki interpretasi biologis, genetik, kepribadian, atau STIFIn.');

    // PAGE 7 - Performa model
    page('PERFORMA MODEL');
    section('Overall Model Performance');
    if (!model.finalMetrics) note('Artefak metrik validasi model tidak tersedia pada runtime ini.'); else {
      row('Accuracy', formatPercent(metricValue('accuracy')));
      row('Macro Precision', formatPercent(metricValue('precision_macro')));
      row('Macro Recall', formatPercent(metricValue('recall_macro')));
      row('Macro F1', formatPercent(metricValue('f1_macro')));
      row('Weighted F1', formatPercent(metricValue('f1_weighted')));
      const metadataCv = model.metadata?.cv_result as Record<string, unknown> | undefined;
      row('CV mean', formatPercent(metadataCv?.cv_mean as number | undefined));
      row('CV std', formatPercent(metadataCv?.cv_std as number | undefined));
    }
    section('Confusion Matrix'); note('Tidak tersedia sebagai artefak terstruktur pada backend report ini.');
    section('Classification Report'); note('Tidak tersedia sebagai artefak terstruktur pada backend report ini.');
    section('Sensor Ablation');
    if (model.ablationRows.length === 0) note('Hasil ablation study tidak tersedia pada runtime ini.'); else { for (const ablation of model.ablationRows) row(ablation.config || 'Tidak tersedia', `${formatPercent(Number(ablation.accuracy))} / ${formatPercent(Number(ablation.f1_macro))}`); }
    section('Feature Importance'); note('Feature importance per measurement tidak tersedia dari API SVM saat ini.');
    section('Model Configuration'); row('Algorithm', 'SVM'); row('Kernel', 'Linear'); row('C', '1.0'); row('Scaler', 'StandardScaler'); row('Features', 15); row('Validation strategy', 'Group-aware evaluation from stored ML artifacts'); row('Model version', prediction.model_version);

    // PAGE 8 - Catatan metodologi
    page('CATATAN METODOLOGI');
    note('- Data saat ini bersifat sintetis/simulasi.');
    note('- Model SVM dilatih dan diuji pada dataset penelitian/simulasi.');
    note('- Class A/B/C adalah label simulasi.');
    note('- Hasil klasifikasi belum dapat digunakan untuk menyimpulkan karakteristik biologis, genetik, atau kepribadian individu.');
    note('- Integrasi hardware masih dalam tahap pengembangan.');
    note('- Integrasi dengan sistem eksternal/STIFIn belum diimplementasikan.');
    document.moveDown(0.6);
    note('Performa model yang ditampilkan adalah performa terhadap dataset penelitian/simulasi yang digunakan, bukan validasi biologis maupun validasi STIFIn.');

    // PAGE 9/10 - Lampiran data teknis
    page('LAMPIRAN DATA TEKNIS', 'Metadata measurement, feature summary, dan raw samples yang tersimpan.');
    section('Metadata measurement');
    row('Measurement ID', measurement.id);
    row('Device ID', measurement.device_id);
    row('Timestamp', measurement.completed_at || measurement.created_at);
    row('Status', measurement.status);
    row('Data source', sourceLabel(measurement.data_source));
    row('Feature count', 15, 0);
    row('Raw sample count', rawSamples.length, 0);
    section('Feature summary');
    for (const [label, key] of FEATURE_KEYS) { const value = featureSummaryFromRaw ? featureSummaryFromRaw[key] : measurement.features_summary?.[key.toUpperCase()]; row(label, value); }
    section('Raw sensor data (20 samples x 15 features)');
    if (!rawSamples.length) note('Raw data tidak tersedia.'); else { const columns = ['#', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'Clr', 'NIR', 'R', 'G', 'B', 'Clr', 'Dist']; document.font('Helvetica-Bold').fontSize(5.6).fillColor('#0f172a').text(columns.join(' | ')); rawSamples.forEach((sample) => { if (document.y > 740) document.addPage(); const values = [sample.sample_number, sample.as7341_f1, sample.as7341_f2, sample.as7341_f3, sample.as7341_f4, sample.as7341_f5, sample.as7341_f6, sample.as7341_f7, sample.as7341_f8, sample.as7341_clear, sample.as7341_nir, sample.tcs34725_r, sample.tcs34725_g, sample.tcs34725_b, sample.tcs34725_clear, sample.vl53l1x_distance_mm]; document.font('Helvetica').fontSize(5.4).fillColor('#334155').text(values.map((value) => formatValue(value, 1)).join(' | ')); }); }
    document.moveDown(1).font('Helvetica').fontSize(7).fillColor('#64748b').text('PHENOTYPE software-only report. Data bersifat sintetis/simulasi; hardware integration masih pending dan integrasi sistem eksternal/STIFIn belum diimplementasikan.');
    document.end(); return result;
  }
}
