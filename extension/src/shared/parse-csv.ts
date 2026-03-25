import Papa from 'papaparse';

export function parseCSV<T = Record<string, string>>(csvText: string): T[] {
  const result = Papa.parse<T>(csvText, { header: true, skipEmptyLines: true });
  return result.data;
}
