import React, { useState, useMemo, useEffect } from 'react';
import { EnergyDbRecord, ParseResult } from './types';
import FileUpload from './components/FileUpload';
import EnergyChart from './components/EnergyChart';
import DataTable from './components/DataTable';
import { Zap, Activity, Database, LayoutDashboard, Filter, Building2, Calculator, Users, Calendar } from 'lucide-react';

interface Stats {
  totalImport: number;
  totalExport: number;
  daysCount: number;
  coopId?: string;
}

const AGGREGATED_MEMBERS_KEY = 'AGGREGATED_MEMBERS';
const DATE_ALL = 'ALL';

const App: React.FC = () => {
  const [data, setData] = useState<EnergyDbRecord[]>([]);
  const [uniquePPEs, setUniquePPEs] = useState<string[]>([]);
  const [selectedPPE, setSelectedPPE] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(DATE_ALL);
  const [stats, setStats] = useState<Stats>({ totalImport: 0, totalExport: 0, daysCount: 0 });

  const handleDataReady = (result: ParseResult) => {
    setData(result.records);
    setUniquePPEs(result.uniquePPEs);
    setStats(result.summary);
    
    // Default selection logic:
    // 1. If we found a CoopID and it exists in the data (files were uploaded), select it.
    // 2. Otherwise default to aggregation.
    if (result.summary.coopId && result.uniquePPEs.includes(result.summary.coopId)) {
      setSelectedPPE(result.summary.coopId);
    } else {
      setSelectedPPE(AGGREGATED_MEMBERS_KEY);
    }

    // Reset date filter when new data comes in
    setSelectedDate(DATE_ALL);
  };

  // Logic to filter or aggregate data based on PPE selection
  const processedDataByPPE = useMemo(() => {
    if (data.length === 0) return [];

    if (selectedPPE === AGGREGATED_MEMBERS_KEY) {
      // Sum only Members (Exclude the main Coop file if it exists to avoid double counting)
      const aggregationMap = new Map<string, EnergyDbRecord>();
      const aggregateLabel = 'SUMA CZŁONKÓW (Wyliczona)';
      
      data.forEach(record => {
        // Skip the main cooperative record during member aggregation
        if (stats.coopId && record.ppe === stats.coopId) {
          return;
        }

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
      // Specific PPE (Either a Member OR the Coop File itself)
      return data.filter(r => r.ppe === selectedPPE);
    }
  }, [data, selectedPPE, stats.coopId]);

  // Extract available dates based on the currently processed data (context dependent)
  const availableDates = useMemo(() => {
    const dates = new Set(processedDataByPPE.map(r => r.date));
    return Array.from(dates).sort();
  }, [processedDataByPPE]);

  // Final filter by Date
  const finalDisplayData = useMemo(() => {
    if (selectedDate === DATE_ALL) {
      return processedDataByPPE;
    }
    return processedDataByPPE.filter(r => r.date === selectedDate);
  }, [processedDataByPPE, selectedDate]);

  // Recalculate stats for the current view (filtered by date)
  const currentStats = useMemo(() => {
    return {
      totalImport: finalDisplayData.reduce((sum, r) => sum + r.cp, 0),
      totalExport: finalDisplayData.reduce((sum, r) => sum + r.co, 0),
    };
  }, [finalDisplayData]);

  // Separate Member PPEs from Coop PPE for the dropdown
  const memberPPEs = useMemo(() => {
    return uniquePPEs.filter(ppe => ppe !== stats.coopId);
  }, [uniquePPEs, stats.coopId]);

  const isCoopView = selectedPPE === stats.coopId;
  const isAggregatedView = selectedPPE === AGGREGATED_MEMBERS_KEY;

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
                    Pobrana (CP)
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
                     Oddana (CO)
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
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                
                {/* PPE Selector */}
                <div>
                  <label className="mb-2 flex items-center text-sm font-semibold text-slate-700">
                    <Filter className="mr-2 h-4 w-4" />
                    Źródło Danych (PPE)
                  </label>
                  <select
                    value={selectedPPE}
                    onChange={(e) => setSelectedPPE(e.target.value)}
                    className="block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm border"
                  >
                    {/* Option 1: Main Coop File */}
                    {stats.coopId && uniquePPEs.includes(stats.coopId) && (
                      <option value={stats.coopId} className="font-bold text-indigo-700">
                        🏢 Dane Spółdzielni (Plik OSD: {stats.coopId})
                      </option>
                    )}
                    
                    {/* Option 2: Aggregation of Members */}
                    <option value={AGGREGATED_MEMBERS_KEY} className="font-semibold text-slate-800">
                      ∑ Suma Kontrolna Członków (Wyliczona)
                    </option>
                    
                    <option disabled>──────────────</option>
                    
                    {/* Option 3: Individual Members */}
                    {memberPPEs.map(ppe => (
                      <option key={ppe} value={ppe}>👤 {ppe}</option>
                    ))}
                  </select>
                </div>

                {/* Date Selector */}
                {availableDates.length > 0 && (
                  <div>
                    <label className="mb-2 flex items-center text-sm font-semibold text-slate-700">
                      <Calendar className="mr-2 h-4 w-4" />
                      Wybierz Datę
                    </label>
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm border"
                    >
                      <option value={DATE_ALL}>📅 Wszystkie dostępne dni ({availableDates.length})</option>
                      {availableDates.map(date => (
                        <option key={date} value={date}>{date}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Contextual Help / Info Box */}
                <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
                  {isCoopView ? (
                    <div className="flex gap-2">
                       <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                       <div>
                         <strong>Tryb Oficjalny:</strong> Dane z licznika głównego spółdzielni.
                       </div>
                    </div>
                  ) : isAggregatedView ? (
                    <div className="flex gap-2">
                      <Calculator className="h-4 w-4 text-orange-600 shrink-0" />
                      <div>
                        <strong>Tryb Kontrolny:</strong> Suma matematyczna liczników członków.
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                       <Users className="h-4 w-4 text-slate-500 shrink-0" />
                       <div>
                         Dane pojedynczego członka.
                       </div>
                    </div>
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
                    <h4 className="text-sm font-semibold text-indigo-900">Status Importu</h4>
                    <p className="mt-1 text-xs text-indigo-700">
                      Rekordy (widoczne): <strong>{finalDisplayData.length}</strong><br/>
                      Wybrana data: <strong>{selectedDate === DATE_ALL ? 'Pełny zakres' : selectedDate}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Visualization */}
          <div className="space-y-6 lg:col-span-8">
            <EnergyChart data={finalDisplayData} />
            <DataTable 
              data={finalDisplayData} 
              isAggregate={isAggregatedView} 
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;