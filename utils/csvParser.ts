import { EnergyDbRecord, ParseResult } from '../types';

/**
 * Parses the custom value format from the CSV.
 * Example: ".739,+" -> 0.739
 */
const parseValue = (cell: string): number => {
  if (!cell) return 0;
  const parts = cell.split(',');
  let numStr = parts[0];
  if (!numStr) return 0;
  return parseFloat(numStr);
};

const formatDate = (rawDate: string): string => {
  // Input: 01-10-2025 (DD-MM-YYYY)
  // Output: 2025-10-01 (YYYY-MM-DD)
  const parts = rawDate.trim().split('-');
  if (parts.length !== 3) return rawDate;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

/**
 * Reads a File object and returns its content as text.
 */
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'windows-1250'); // Assuming PL encoding, or UTF-8
  });
};

/**
 * Parses a single file content string.
 */
const parseSingleFileContent = (
  content: string, 
  tempMap: Record<string, Partial<EnergyDbRecord>>,
  ppeSet: Set<string>,
  metaRef: { coopId: string | undefined }
) => {
  const lines = content.split('\n');
  let currentDate = '';

  // 1. Scan header section for Date (DD) and Coop Code (kSE)
  for (const line of lines) {
    if (line.startsWith('DD;')) {
      const parts = line.split(';');
      if (parts[1]) {
        currentDate = formatDate(parts[1]);
      }
    }
    if (line.startsWith('kSE;')) {
      const parts = line.split(';');
      // kSE;SEPN;;... -> parts[1] is the code
      if (parts[1] && parts[1].trim() !== '') {
        metaRef.coopId = parts[1].trim();
      }
    }
  }

  // If no date found, we can't process this file reliably as per spec
  if (!currentDate) return;

  // Metadata keywords to ignore if found in PPE column
  const ignoreKeywords = ['kOSD', 'kSE', 'DCW', 'DD', 'VV'];

  // 2. Process data rows
  lines.forEach((line) => {
    const columns = line.split(';');
    
    const ppe = columns[0]?.trim();
    const type = columns[1]?.trim();

    // Validate if row contains energy data
    if (!ppe || !type || !['CP', 'CO', 'CB'].includes(type)) {
      return;
    }

    // Explicitly ignore header rows that might have slipped through (though type check usually catches them)
    if (ignoreKeywords.includes(ppe)) {
      return;
    }

    // Ignore if PPE is same as CoopID (phantom record)
    if (metaRef.coopId && ppe === metaRef.coopId) {
      return;
    }

    ppeSet.add(ppe);

    // Hours 1 to 24 at indices 3 to 26
    for (let hour = 1; hour <= 24; hour++) {
      const colIndex = 2 + hour;
      const cellContent = columns[colIndex];
      const value = parseValue(cellContent);

      const key = `${ppe}_${currentDate}_${hour}`;

      if (!tempMap[key]) {
        tempMap[key] = {
          id: key,
          ppe,
          date: currentDate,
          hour,
          cp: 0,
          co: 0,
          cb: 0,
        };
      }

      if (type === 'CP') tempMap[key].cp = value;
      else if (type === 'CO') tempMap[key].co = value;
      else if (type === 'CB') tempMap[key].cb = value;
    }
  });
};

/**
 * Main function to process a batch of File objects.
 */
export const processEnergyFiles = async (
  files: File[], 
  onProgress?: (count: number) => void
): Promise<ParseResult> => {
  
  const tempMap: Record<string, Partial<EnergyDbRecord>> = {};
  const ppeSet = new Set<string>();
  const errors: string[] = [];
  const metaRef: { coopId: string | undefined } = { coopId: undefined };
  let processedCount = 0;

  // Process files sequentially or in small chunks
  for (const file of files) {
    try {
      const content = await readFileAsText(file);
      parseSingleFileContent(content, tempMap, ppeSet, metaRef);
    } catch (e) {
      errors.push(`Błąd odczytu pliku ${file.name}`);
    }
    
    processedCount++;
    if (onProgress) onProgress(processedCount);
    
    // Tiny yield to let UI update progress bar
    if (processedCount % 5 === 0) {
      await new Promise(r => setTimeout(r, 0)); 
    }
  }

  // Final Cleanup: Ensure the detected CoopId is NOT in the PPE list or records
  // This handles cases where CoopId was detected in one file but treated as PPE in another before detection
  if (metaRef.coopId) {
    if (ppeSet.has(metaRef.coopId)) {
      ppeSet.delete(metaRef.coopId);
    }
    // Remove phantom records
    Object.keys(tempMap).forEach(key => {
      if (tempMap[key]!.ppe === metaRef.coopId) {
        delete tempMap[key];
      }
    });
  }

  // Convert map to array and sort
  const sortedRecords = Object.values(tempMap)
    .map(r => r as EnergyDbRecord)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.hour - b.hour;
    });

  const summary = {
    totalImport: sortedRecords.reduce((sum, r) => sum + r.cp, 0),
    totalExport: sortedRecords.reduce((sum, r) => sum + r.co, 0),
    daysCount: new Set(sortedRecords.map(r => r.date)).size,
    coopId: metaRef.coopId
  };

  return {
    records: sortedRecords,
    uniquePPEs: Array.from(ppeSet).sort(),
    summary,
    errors
  };
};

export const parseEnergyData = (rawText: string): ParseResult => {
   const tempMap = {};
   const ppeSet = new Set<string>();
   const metaRef = { coopId: undefined };
   parseSingleFileContent(rawText, tempMap, ppeSet, metaRef);
   const sortedRecords = Object.values(tempMap).map(r => r as EnergyDbRecord);
   return {
     records: sortedRecords,
     uniquePPEs: Array.from(ppeSet).sort(),
     summary: { totalImport: 0, totalExport: 0, daysCount: 0, coopId: metaRef.coopId }, 
     errors: []
   }
}