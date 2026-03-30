export function safeDivide(a: number, b: number, fallback: number = 0): number {
  return b === 0 ? fallback : a / b;
}

export function recalibrateSteps(value: number, steps: number[]): number {
  if (steps.length === 0) return value;
  if (steps.length === 1) return 50;
  if (value <= steps[0]) return 0;
  if (value >= steps[steps.length - 1]) return 100;
  for (let i = 1; i < steps.length; i++) {
    if (value <= steps[i]) {
      const segStart = steps[i - 1];
      const segEnd = steps[i];
      const segWidth = segEnd - segStart;
      const outStart = ((i - 1) / (steps.length - 1)) * 100;
      const outEnd = (i / (steps.length - 1)) * 100;
      if (segWidth === 0) return outStart;
      const fraction = (value - segStart) / segWidth;
      return outStart + fraction * (outEnd - outStart);
    }
  }
  return 100;
}

export function rankNormalize(
  suggestions: Array<Record<string, number>>,
  dimensions: string[],
): Array<Record<string, number>> {
  const n = suggestions.length;
  if (n === 0) return [];
  const result = suggestions.map((s) => ({ ...s }));
  for (const dim of dimensions) {
    const indexed = suggestions.map((s, i) => ({ index: i, value: s[dim] ?? 0 }));
    indexed.sort((a, b) => a.value - b.value);
    let i = 0;
    while (i < indexed.length) {
      let j = i;
      while (j < indexed.length && indexed[j].value === indexed[i].value) j++;
      const avgRank = (i + j + 1) / 2;
      for (let k = i; k < j; k++) {
        result[indexed[k].index][dim] = Math.round(((avgRank - 0.5) / n) * 100 * 10) / 10;
      }
      i = j;
    }
  }
  return result;
}
