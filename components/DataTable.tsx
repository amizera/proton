import React, { useMemo } from 'react';
import { EnergyDbRecord } from '../types';

interface DataTableProps {
  data: EnergyDbRecord[];
  isAggregate?: boolean;
}

const DataTable: React.FC<DataTableProps> = ({ data, isAggregate = false }) => {
  // Use useMemo for potential filtering/sorting performance later
  const tableData = useMemo(() => data, [data]);

  if (tableData.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-800">Dane Energetyczne (Tabela)</h3>
        <p className="text-xs text-slate-500">
          {isAggregate 
            ? "Poniższe dane są sumą wartości ze wszystkich liczników dla danej godziny."
            : "Szczegółowe dane pomiarowe dla wybranego licznika."}
        </p>
      </div>
      <div className="max-h-[500px] overflow-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-500 shadow-sm">
            <tr>
              <th className="px-6 py-3 font-semibold">Data</th>
              <th className="px-6 py-3 font-semibold">Godzina</th>
              <th className="px-6 py-3 font-semibold">
                {isAggregate ? 'Typ Danych' : 'PPE (Licznik)'}
              </th>
              <th className="px-6 py-3 font-semibold text-right">CP (Pobrana)</th>
              <th className="px-6 py-3 font-semibold text-right">CO (Oddana)</th>
              <th className="px-6 py-3 font-semibold text-right">CB (Zbilansowana)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tableData.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-3 font-medium text-slate-900">{row.date}</td>
                <td className="whitespace-nowrap px-6 py-3">{row.hour}:00</td>
                <td className="whitespace-nowrap px-6 py-3 text-xs text-slate-500 font-mono">
                  {isAggregate ? (
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                      SUMA SPÓŁDZIELNI
                    </span>
                  ) : (
                    row.ppe
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-right text-red-600 font-mono">
                  {row.cp.toFixed(3)}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-right text-green-600 font-mono">
                  {row.co.toFixed(3)}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-right text-blue-600 font-mono">
                  {row.cb.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;