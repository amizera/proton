import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { EnergyDbRecord } from '../types';

interface EnergyChartProps {
  data: EnergyDbRecord[];
}

const EnergyChart: React.FC<EnergyChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
        Brak danych do wyświetlenia wykresu
      </div>
    );
  }

  // To allow for better visualization if multiple days are selected, we might want to slice 
  // or allow zooming, but for now we render all sequential data points.
  // We construct a label that is readable.
  const formattedData = data.map(d => ({
    ...d,
    label: `${d.date.substring(5)} H${d.hour}`, // MM-DD H1
    fullLabel: `${d.date} Godz: ${d.hour}`
  }));

  return (
    <div className="h-[400px] w-full rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Profil Energetyczny (Pobór vs Oddanie vs Bilans)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={formattedData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 10, fill: '#64748b' }} 
            interval="preserveStartEnd" 
            minTickGap={30}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#64748b' }} 
            label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 12 } }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '4px' }}
            formatter={(value: number) => [value.toFixed(3), '']}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }}/>
          <ReferenceLine y={0} stroke="#000" />
          
          <Bar dataKey="cp" name="Pobrana (CP)" fill="#ef4444" barSize={20} radius={[4, 4, 0, 0]} opacity={0.8} />
          <Bar dataKey="co" name="Oddana (CO)" fill="#22c55e" barSize={20} radius={[4, 4, 0, 0]} opacity={0.8} />
          <Line 
            type="monotone" 
            dataKey="cb" 
            name="Zbilansowana (CB)" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EnergyChart;
