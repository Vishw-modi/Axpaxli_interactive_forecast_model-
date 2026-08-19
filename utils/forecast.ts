export type ForecastState = {
  prevalence: number;
  diagnosisRate: number;
  treatmentRate: number;
  addressableShare: number;
  peakShare: number;
  yearsToPeak: number;
  netPrice: number;
  injectionsPerYear: number;
  compliance: number;

  // STAGE 0 — Scoping
  launchDate: string;
  availabilityDate: string;
  forecastHorizonYears: number;

  // STAGE 2
  diagnosisAnnualGrowthRate: number;

  // STAGE 3
  iasTreatedPctOfDiagnosed: number;
  iasTreatedGrowthRate: number;
  haRatioToIAS: number;
  haRatioGrowthRate: number;
  iasAndHATreatedBoth: number;
  initialAdditionalMarketGrowth: number;
  annualDecayRateOfAdditionalGrowth: number;

  // STAGE 5
  overstatementAdjFactor: number;
  womacScoreAvailable: boolean;
  diabetesGlycemicDataAvailable: boolean;
  wacPrice: number;
  newMarketResearchAdjOrtho: number;
  newMarketResearchAdjRheum: number;

  // STAGE 6
  payerAccessRequirement: 'none' | 'prior_auth_only' | 'pre_cert' | 'pre_cert_step_edit' | 'prior_auth_plus_step_edit';
  pricingAdjFactorAccessImpact: number;
  patientAssistanceProgramInPlace: boolean;
  pricingAdjPatientAssistanceImpact: number;

  // STAGE 7
  // STAGE 8
  jCodeWindowMonths: number;
  jCodeRetentionRate: number;

  // STAGE 9
  refrigerationDurationMonths: number;
  refrigerationRetentionORS: number;
  refrigerationRetentionRheumOther: number;

  // STAGE 11
  cingalLaunchDate: string | 'does_not_launch';
  cingalRetentionOrtho: number;
  cingalRetentionPCP: number;

  // STAGE 12
  ampionLaunchDate: string | 'does_not_launch';
  ampionRetentionOrtho: number;
  ampionRetentionPCP: number;

  // STAGE 13
  antiNGFLaunchDate: string | 'does_not_launch';
  antiNGFRetentionOrtho: number;
  antiNGFRetentionPCP: number;

  // STAGE 14
  frequencyOfInjectionsYearly: number;

  // STAGE 18
  q4_2017_OverrideAdj: number;
  q1_2018_OverrideAdj: number;
  q2_2018_OverrideAdj: number;
  q3_2018_OverrideAdj: number;
  q4_2018_OverrideAdj: number;
};

export const DEFAULT_FORECAST_STATE: ForecastState = {
  prevalence: 1750000,
  diagnosisRate: 0.051,
  treatmentRate: 0.92,
  addressableShare: 0.65,
  peakShare: 0.25,
  yearsToPeak: 5,
  netPrice: 5125,
  injectionsPerYear: 2,
  compliance: 0.20,

  // STAGE 0 — Scoping
  launchDate: '2017-12',
  availabilityDate: '2017-12',
  forecastHorizonYears: 7,

  // STAGE 2
  diagnosisAnnualGrowthRate: 0.032,

  // STAGE 3
  iasTreatedPctOfDiagnosed: 0.284,
  iasTreatedGrowthRate: 0.03,
  haRatioToIAS: 0.45,
  haRatioGrowthRate: -0.01,
  iasAndHATreatedBoth: 0.15,
  initialAdditionalMarketGrowth: 0.045,
  annualDecayRateOfAdditionalGrowth: 0.20,

  // STAGE 5
  overstatementAdjFactor: 0.22,
  womacScoreAvailable: true,
  diabetesGlycemicDataAvailable: true,
  wacPrice: 575,
  newMarketResearchAdjOrtho: 1.25,
  newMarketResearchAdjRheum: 1.00,

  // STAGE 6
  payerAccessRequirement: 'pre_cert_step_edit',
  pricingAdjFactorAccessImpact: 0.96,
  patientAssistanceProgramInPlace: false,
  pricingAdjPatientAssistanceImpact: 1.10,

  // STAGE 8
  jCodeWindowMonths: 12,
  jCodeRetentionRate: 0.88,

  // STAGE 9
  refrigerationDurationMonths: 18,
  refrigerationRetentionORS: 0.88,
  refrigerationRetentionRheumOther: 0.88,

  // STAGE 11
  cingalLaunchDate: '2019-11',
  cingalRetentionOrtho: 0.74,
  cingalRetentionPCP: 0.85,

  // STAGE 12
  ampionLaunchDate: 'does_not_launch',
  ampionRetentionOrtho: 0.865,
  ampionRetentionPCP: 0.84,

  // STAGE 13
  antiNGFLaunchDate: '2020-01',
  antiNGFRetentionOrtho: 0.90,
  antiNGFRetentionPCP: 0.95,

  // STAGE 14
  frequencyOfInjectionsYearly: 1.5,

  // STAGE 18
  q4_2017_OverrideAdj: 0.0,
  q1_2018_OverrideAdj: 0.0,
  q2_2018_OverrideAdj: 0.0,
  q3_2018_OverrideAdj: 0.0,
  q4_2018_OverrideAdj: 0.0,
};

export const defaultState: ForecastState = DEFAULT_FORECAST_STATE;

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtM(n: number): string {
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
  return '$' + fmtNum(n);
}

export function fmtPct(n: number): string {
  return (Math.round(n * 10) / 10) + '%';
}

export function buildSequentialLabels(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);
}

export function buildInterpolatedSeries(values: number[], pointCount: number): number[] {
  if (pointCount <= 0) return [];
  if (values.length === 0) return Array.from({ length: pointCount }, () => 0);
  if (values.length === 1) return Array.from({ length: pointCount }, () => values[0]);

  const lastIndex = values.length - 1;
  const lastPoint = pointCount - 1;

  return Array.from({ length: pointCount }, (_, pointIdx) => {
    const t = (pointIdx / lastPoint) * lastIndex;
    const leftIdx = Math.floor(t);
    const rightIdx = Math.min(leftIdx + 1, lastIndex);
    const frac = t - leftIdx;
    return values[leftIdx] + ((values[rightIdx] - values[leftIdx]) * frac);
  });
}

function smoothstep(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

export function addressablePatients(s: ForecastState): number {
  return s.prevalence * s.diagnosisRate * s.treatmentRate * s.addressableShare;
}

export function computeForecast(s: ForecastState) {
  const LAUNCH_YEAR = 2025;
  const ORS_WEIGHT = 0.70;
  const PCP_WEIGHT = 0.30;
  
  const years: string[] = [];
  const patients: number[] = [];
  const revenue: number[] = [];
  const share: number[] = [];
  
  let basePeakShare = s.peakShare * (1 - s.overstatementAdjFactor);
  if (s.womacScoreAvailable) basePeakShare += 0.02;
  if (s.diabetesGlycemicDataAvailable) basePeakShare += 0.02;
  const papMultiplier = s.patientAssistanceProgramInPlace ? s.pricingAdjPatientAssistanceImpact : 1.0;
  const adjustedPeakShare = basePeakShare * s.pricingAdjFactorAccessImpact * papMultiplier;
  
  for (let i = 0; i < 6; i++) {
    const year = LAUNCH_YEAR + i;
    const t = i; // years since launch, 0-indexed

    // STAGE 1
    const patientUniverse = s.prevalence;

    // STAGE 2
    const diagnosed = patientUniverse * s.diagnosisRate * Math.pow(1 + s.diagnosisAnnualGrowthRate, year - 2016);

    // STAGE 3
    const iasTreated = diagnosed * s.iasTreatedPctOfDiagnosed * Math.pow(1 + s.iasTreatedGrowthRate, t);
    const promoLift = s.initialAdditionalMarketGrowth * Math.pow(1 - s.annualDecayRateOfAdditionalGrowth, t);
    const treatedWithPromo = iasTreated * (1 + promoLift);

    // STAGE 5 & 6 (Calculated outside loop to track the absolute adjusted peak)
    const accessAdjustedPeakShare = adjustedPeakShare;

    // STAGE 7
    const orthoReachedAdj = t === 0 ? 0.70 : (t === 1 ? 0.80 : 0.85);
    const pcpReachedAdj = t === 0 ? 0.524 : (t === 1 ? 0.60 : 0.65);
    
    // Apply market research adjs
    const finalOrthoReached = orthoReachedAdj * s.newMarketResearchAdjOrtho;
    const finalPcpReached = pcpReachedAdj * s.newMarketResearchAdjRheum;
    const reachFactor = (ORS_WEIGHT * finalOrthoReached) + (PCP_WEIGHT * finalPcpReached);
    const rawX = Math.min((t + 1) / s.yearsToPeak, 1.0);
    const uptakeCurve = rawX * rawX * (3 - 2 * rawX); // smoothstep
    let monthlyShare = accessAdjustedPeakShare * uptakeCurve * reachFactor;

    // STAGE 8
    const jCodeWindowYears = s.jCodeWindowMonths / 12;
    if (t < jCodeWindowYears) {
      monthlyShare *= s.jCodeRetentionRate;
    }

    // STAGE 9
    const refrigDurationYears = s.refrigerationDurationMonths / 12;
    if (t <= refrigDurationYears) {
      monthlyShare *= s.refrigerationRetentionORS;
    }

    // STAGE 11-13
    if (s.cingalLaunchDate !== 'does_not_launch') {
      const cingalLaunchYear = parseInt(s.cingalLaunchDate.split('-')[0]);
      if (year >= cingalLaunchYear) {
        monthlyShare *= s.cingalRetentionOrtho;
      }
    }
    if (s.ampionLaunchDate !== 'does_not_launch') {
      const ampionLaunchYear = parseInt(s.ampionLaunchDate.split('-')[0]);
      if (year >= ampionLaunchYear) {
        monthlyShare *= s.ampionRetentionOrtho;
      }
    }
    if (s.antiNGFLaunchDate !== 'does_not_launch') {
      const antiNGFLaunchYear = parseInt(s.antiNGFLaunchDate.split('-')[0]);
      if (year >= antiNGFLaunchYear) {
        monthlyShare *= s.antiNGFRetentionOrtho;
      }
    }

    // STAGE 14
    const patientsOnTherapy = treatedWithPromo * monthlyShare;

    // STAGE 15
    const annualPatients = patientsOnTherapy * 1;

    // Sampling discount logic uses fixed demo assumptions so the UI does not expose them.
    const samplingDecayRate = 0.5; // decays halfway each year
    const peakSamplingIntensity = 0.15;
    const steadyStateSampleRate = 0.05;
    const currentSampleRate = steadyStateSampleRate + (peakSamplingIntensity - steadyStateSampleRate) * Math.pow(1 - samplingDecayRate, t);

    // STAGE 16
    // Apply sampling discount to revenue (free injections don't generate revenue)
    let rev = (annualPatients * s.frequencyOfInjectionsYearly * s.wacPrice) * (1 - currentSampleRate);
    
    // Apply Quarterly Overrides
    if (t === 0) {
      // Year 1 average override of Q4-2017 to Q3-2018
      const y1AvgOverride = (s.q4_2017_OverrideAdj + s.q1_2018_OverrideAdj + s.q2_2018_OverrideAdj + s.q3_2018_OverrideAdj) / 4;
      rev *= (1 + y1AvgOverride);
    } else if (t === 1) {
      // Year 2 mapped to Q4-2018
      rev *= (1 + s.q4_2018_OverrideAdj);
    }
    
    years.push((2016 + i).toString());
    patients.push(annualPatients);
    revenue.push(rev);
    share.push(monthlyShare * 100);
  }
  
  const cumulativeRevenue = revenue.reduce((acc: number[], val) => {
    acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + val);
    return acc;
  }, []);

  const cumulative = revenue.reduce((a, b) => a + b, 0);
  const addressable = s.prevalence * s.diagnosisRate * s.treatmentRate * s.addressableShare;
  const peakRevenue = Math.max(...revenue);
  const adjustedPeakPatients = addressable * adjustedPeakShare;

  const zilrettaActuals = [
    349088,
    40497790,
    254686453,
    600051917,
    836669581,
    911430289
  ];

  const zilrettaTreatments = [
    567,
    70391,
    442933,
    1043569,
    1455078,
    1585096
  ];
  
  return {
    years,
    patients,
    revenue,
    cumulativeRevenue,
    share,
    addressable,
    peakRevenue,
    cumulative,
    adjustedPeakShare,
    adjustedPeakPatients,
    zilrettaActuals,
    zilrettaTreatments
  };
}
