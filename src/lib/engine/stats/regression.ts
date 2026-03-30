export interface TrendResult {
  slope: number;
  intercept: number;
  rSquared: number;
  pValue: number;
  significant: boolean;
}

export function linearTrend(values: number[]): TrendResult {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0, rSquared: 0, pValue: 1, significant: false };
  if (n === 1) return { slope: 0, intercept: values[0], rSquared: 0, pValue: 1, significant: false };

  let sumX = 0, sumY = 0;
  for (let i = 0; i < n; i++) { sumX += i; sumY += values[i]; }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let ssXY = 0, ssXX = 0, ssYY = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    const dy = values[i] - meanY;
    ssXY += dx * dy;
    ssXX += dx * dx;
    ssYY += dy * dy;
  }

  if (ssXX === 0) return { slope: 0, intercept: meanY, rSquared: 0, pValue: 1, significant: false };

  const slope = ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  const rSquared = ssYY > 0 ? (ssXY * ssXY) / (ssXX * ssYY) : 0;

  const df = n - 2;
  if (df <= 0) return { slope, intercept, rSquared, pValue: 1, significant: false };

  const ssRes = ssYY - ssXY * ssXY / ssXX;
  const mse = ssRes / df;
  const seBeta = Math.sqrt(Math.max(0, mse / ssXX));
  if (seBeta === 0) {
    // Zero residual error: perfect fit. Significant only if slope is non-zero.
    const sig = slope !== 0;
    return { slope, intercept, rSquared, pValue: sig ? 0 : 1, significant: sig };
  }

  const tStat = slope / seBeta;
  const pValue = tDistPValue(Math.abs(tStat), df);
  return { slope, intercept, rSquared, pValue, significant: pValue < 0.05 };
}

export function safeTrend(values: number[], minN: number = 5): TrendResult | null {
  if (values.length < minN) return null;
  return linearTrend(values);
}

// Abramowitz & Stegun approximation for two-tailed t-distribution p-value
function tDistPValue(absT: number, df: number): number {
  const x = absT * (1 - 1 / (4 * df));
  const p = 0.3275911;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const t = 1 / (1 + p * Math.abs(x));
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  const phi = poly * Math.exp(-x * x / 2);
  return Math.min(1, 2 * phi);
}
