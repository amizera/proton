import React, { useState, useMemo } from 'react';
import { EnergyDbRecord, ParseResult } from './types';
import FileUpload from './components/FileUpload';
import EnergyChart from './components/EnergyChart';
import DataTable from './components/DataTable';
import { Zap, Activity, Database, LayoutDashboard, Filter, Building2, Calculator } from 'lucide-react';

interface Stats {
  totalImport: number;
  totalExport: number;
  daysCount: number;
  coopId?: string;
}

const App: React.FC = () => {
  const [data, setData] = useState<EnergyDbRecord[]>([]);
  const [uniquePPEs, setUniquePPEs] = useState<string[]>([]);
  const [selectedPPE, setSelectedPPE] = useState<string>('ALL');
  const [stats, setStats] = useState<Stats>({ totalImport: 0, totalExport: 0, daysCount: 0 });

  const handleDataReady = (result: ParseResult) => {
    setData(result.records);
    setUniquePPEs(result.uniquePPEs);
    setStats(result.summary);
    setSelectedPPE('ALL'); // Reset filter on new upload
  };

  // Logic to filter or aggregate data based on selection
  const processedData = useMemo(() => {
    if (data.length === 0) return [];

    if (selectedPPE === 'ALL') {
      // Aggregate data by Date + Hour
      const aggregationMap = new Map<string, EnergyDbRecord>();
      
      const aggregateLabel = stats.coopId ? `${stats.coopId} (Suma)` : 'SPÓŁDZIELNIA (Suma)';

      data.forEach(record => {
        const key = `${record.date}_${record.hour}`;
        if (!aggregationMap.has(key)) {
          aggregationMap.set(key, {
            id: `AGG_${key}`,
            ppe: aggregateLabel,
            date: record.date,
            hour: record.hour,
            cp: 0,
            co: 0,
            cb: 0
          });
        }
        const agg = aggregationMap.get(key)!;
        agg.cp += record.cp;
        agg.co += record.co;
        agg.cb += record.cb;
      });

      return Array.from(aggregationMap.values()).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.hour - b.hour;
      });
    } else {
      // Filter by specific PPE
      return data.filter(r => r.ppe === selectedPPE);
    }
  }, [data, selectedPPE, stats.coopId]);

  // Recalculate stats for the current view
  const currentStats = useMemo(() => {
    return {
      totalImport: processedData.reduce((sum, r) => sum + r.cp, 0),
      totalExport: processedData.reduce((sum, r) => sum + r.co, 0),
    };
  }, [processedData]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                Proton<span className="text-indigo-600">Energy</span> Manager
              </span>
              {stats.coopId && (
                <span className="text-[10px] font-medium text-slate-500 tracking-wider mt-0.5">
                  ID: {stats.coopId}
                </span>
              )}
            </div>
          </div>
          <nav className="flex space-x-4">
            <a href="#" className="flex items-center rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Panel Główny
            </a>
            <a href="#" className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900">
              <Database className="mr-2 h-4 w-4" />
              Członkowie
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Left Column: Controls & Stats */}
          <div className="space-y-6 lg:col-span-4">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500 uppercase">
                    {selectedPPE === 'ALL' ? 'Suma Pobrana' : 'Pobrana (PPE)'}
                  </p>
                  <Zap className="h-4 w-4 text-red-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {currentStats.totalImport.toFixed(2)} <span className="text-sm font-normal text-slate-500">kWh</span>
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500 uppercase">
                     {selectedPPE === 'ALL' ? 'Suma Oddana' : 'Oddana (PPE)'}
                  </p>
                  <Zap className="h-4 w-4 text-green-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {currentStats.totalExport.toFixed(2)} <span className="text-sm font-normal text-slate-500">kWh</span>
                </p>
              </div>
            </div>

            {/* Upload Area */}
            <FileUpload onDataReady={handleDataReady} />

            {/* Filter Section */}
            {uniquePPEs.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <label className="mb-2 flex items-center text-sm font-semibold text-slate-700">
                  <Filter className="mr-2 h-4 w-4" />
                  Wybierz Źródło Danych
                </label>
                <select
                  value={selectedPPE}
                  onChange={(e) => setSelectedPPE(e.target.value)}
                  className="block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="ALL">
                    {stats.coopId ? `Bilans Spółdzielni: ${stats.coopId}` : 'Bilans Całej Spółdzielni'}
                  </option>
                  <option disabled>──────────────</option>
                  {uniquePPEs.map(ppe => (
                    <option key={ppe} value={ppe}>{ppe}</option>
                  ))}
                </select>
                <div className="mt-2 flex items-start text-xs text-slate-500">
                  {selectedPPE === 'ALL' ? (
                     <>
                      <Calculator className="mr-1.5 h-3 w-3 mt-0.5" />
                      <span>
                        Wyświetlasz <strong>sumę matematyczną</strong> wszystkich liczników w pliku. 
                        W pliku CSV "SEPN" to tylko nagłówek, a nie fizyczny licznik.
                      </span>
                     </>
                  ) : (
                    <span>Dane dla fizycznego licznika: {selectedPPE}</span>
                  )}
                </div>
              </div>
            )}

            {/* Info Panel */}
            {data.length > 0 && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex items-start">
                  <Activity className="mr-3 h-5 w-5 mt-0.5 text-indigo-600" />
                  <div>
                    <h4 className="text-sm font-semibold text-indigo-900">Baza Danych</h4>
                    <p className="mt-1 text-xs text-indigo-700">
                      Znaleziono <strong>{stats.daysCount}</strong> dni pomiarowych. <br/>
                      Liczba fizycznych liczników (PPE): <strong>{uniquePPEs.length}</strong>.<br/>
                      Łącznie rekordów: <strong>{data.length}</strong>.
                    </p>
                    {stats.coopId && (
                      <div className="mt-2 flex items-center rounded bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-800">
                        <Building2 className="mr-1.5 h-3 w-3" />
                        Kod Spółdzielni: {stats.coopId}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Visualization */}
          <div className="space-y-6 lg:col-span-8">
            <EnergyChart data={processedData} />
            <DataTable data={processedData} isAggregate={selectedPPE === 'ALL'} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;