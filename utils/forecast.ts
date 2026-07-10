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
};

export const defaultState: ForecastState = {
  prevalence: 1750000,
  diagnosisRate: 0.85,
  treatmentRate: 0.92,
  addressableShare: 0.65,
  peakShare: 0.25,
  yearsToPeak: 5,
  netPrice: 2200,
  injectionsPerYear: 2,
  compliance: 0.20
};

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

function smoothstep(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

export function addressablePatients(s: ForecastState): number {
  return s.prevalence * s.diagnosisRate * s.treatmentRate * s.addressableShare;
}

export function computeForecast(s: ForecastState) {
  const addressable = addressablePatients(s);
  const years = [];
  const patients = [];
  const revenue = [];
  const share = [];
  
  for (let n = 1; n <= 7; n++) {
    const t = n / s.yearsToPeak;
    const frac = smoothstep(t);
    const shareN = s.peakShare * frac;
    const patientsN = addressable * shareN;
    const revenueN = patientsN * s.injectionsPerYear * s.netPrice * s.compliance;
    
    years.push('Year ' + n);
    patients.push(patientsN);
    revenue.push(revenueN);
    share.push(shareN * 100);
  }
  
  const cumulativeRevenue = revenue.reduce((acc: number[], val) => {
    acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + val);
    return acc;
  }, []);

  
  const peakRevenue = addressable * s.peakShare * s.injectionsPerYear * s.netPrice * s.compliance;
  const cumulative = revenue.reduce((a, b) => a + b, 0);
  
  return {
    years,
    patients,
    revenue,
    cumulativeRevenue,
    share,
    addressable,
    peakRevenue,
    cumulative
  };
}
