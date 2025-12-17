export interface HourlyRecord {
  hour: number;
  value: number;
  flag: string;
}

// Normalized database record format
export interface EnergyDbRecord {
  id: string; // Unique composition of PPE + Date + Hour
  ppe: string;
  date: string; // ISO YYYY-MM-DD
  hour: number;
  cp: number; // Consumption (Pobrana)
  co: number; // Production (Oddana)
  cb: number; // Balanced (Zbilansowana)
}

export interface RawCsvRow {
  ppe: string;
  type: 'CP' | 'CO' | 'CB';
  date: string;
  hourlyValues: Record<number, number>;
}

export type ParseResult = {
  records: EnergyDbRecord[];
  uniquePPEs: string[];
  summary: {
    totalImport: number;
    totalExport: number;
    daysCount: number;
    coopId?: string; // Kod Spółdzielni (np. SEPN)
  };
  errors: string[];
};