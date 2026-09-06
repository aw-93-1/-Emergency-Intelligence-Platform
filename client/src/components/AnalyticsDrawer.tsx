import React, { useState } from 'react';
import {
  Activity,
  Hospital,
  Droplets,
  Truck,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Radio,
  CloudRain,
  Sun,
  Moon,
  Wind
} from 'lucide-react';
import { useCrisis } from '../context/CrisisContext';

export const AnalyticsDrawer: React.FC = () => {
  const {
    hospitals,
    dispatchedUnits,
    systemAlert,
    reports,
    weather,
    simulatedMetrics,
    activeRegion
  } = useCrisis();

  const [isExpanded, setIsExpanded] = useState(false);

  const totalBeds = hospitals.reduce((sum, h) => sum + h.totalBeds, 0);
  const occupiedBeds = hospitals.reduce((sum, h) => sum + h.occupiedBeds, 0);
  const availableIcu = hospitals.reduce((sum, h) => sum + h.icuAvailable, 0);
  const totalTrapped = reports
    .filter(r => r.category === 'RESCUE_NEEDED')
    .reduce((sum, r) => sum + (r.headcount || 0), 0);

  return (
    <div className="bg-[#0b1329]/95 border-t border-slate-800/90 text-slate-200 transition-all select-none z-30">
      {/* Ticker / Quick Glance Header */}
      <div className="px-4 py-2 flex items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-none">
          {/* Active Alert */}
          {systemAlert && (
            <div className="flex items-center gap-2 text-rose-400 font-bold whitespace-nowrap">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-red-300">{systemAlert.title}:</span>
              <span className="text-slate-300 font-normal hidden md:inline">{systemAlert.summary}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Weather Telemetry in Ticker Bar */}
          {weather && (
            <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-300 border-r border-slate-800 pr-3">
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                {weather.precipitation > 0 ? (
                  <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                ) : weather.isDay === false ? (
                  <Moon className="w-3.5 h-3.5 text-indigo-300" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                )}
                {weather.temperature}°C
              </span>
              <span className="text-slate-400">({weather.condition || 'Clear'})</span>
              <span className="text-slate-500 font-mono text-[10px]">🌧️ {weather.precipitation}mm/h &bull; 💨 {weather.windSpeed}km/h</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
            <span>ICU Saturation <em className="text-[9px] text-cyan-400 not-italic">SIMULATED</em>:</span>
            <span className="font-bold text-amber-400">
              {simulatedMetrics.icuSaturation}%
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs"
          >
            <span>{isExpanded ? 'Collapse' : 'Tactical HUD'}</span>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Operations HUD */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Hospital Capacity Grid */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                <Hospital className="w-4 h-4 text-emerald-400" />
                <span>HOSPITAL SURGE STATUS</span>
              </h4>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                {availableIcu} ICU Beds Free <span className="text-cyan-400">SIMULATED</span>
              </span>
            </div>

            <div className="space-y-2">
              {hospitals.map(h => (
                <div key={h.id} className="text-[11px]">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-slate-300 font-medium truncate">{h.name} <em className="text-[9px] text-cyan-400 not-italic">SIMULATED</em></span>
                    <span className={`font-mono font-bold ${h.capacity >= 85 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {h.capacity}% ({h.occupiedBeds}/{h.totalBeds})
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        h.capacity >= 85 ? 'bg-red-500' : h.capacity >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${h.capacity}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Dispatched Units Fleet */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                <Truck className="w-4 h-4 text-rose-400" />
                <span>DISPATCHED RESCUE UNITS</span>
              </h4>
              <span className="text-[10px] text-rose-300 font-mono font-bold">
                {dispatchedUnits.length} Units En Route
              </span>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto scrollbar-thin">
              {dispatchedUnits.length === 0 ? (
                <p className="text-slate-500 text-[11px] py-4 text-center">No units currently deployed.</p>
              ) : (
                dispatchedUnits.map(unit => (
                  <div key={unit.id} className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 text-[11px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white">{unit.unitName}</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950 px-1 rounded">
                        ETA: {unit.etaMin}m
                      </span>
                    </div>
                    <p className="text-slate-400 text-[10px]">{unit.type}</p>
                    <p className="text-cyan-400 font-mono text-[10px] mt-0.5">Target: {unit.targetZone}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* River & Catchment Flood Gauges */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <span>HYDROLOGICAL SENSORS</span>
              </h4>
              <span className="text-[10px] text-red-400 font-mono font-bold animate-pulse">
                <span className="text-cyan-400">SIMULATED</span>
              </span>
            </div>

            <div className="space-y-3 text-[11px]">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-red-900/50 min-w-0">
                <div className="flex justify-between">
                  <span className="text-slate-300 font-medium">{activeRegion.riverBasin || 'Nullah Lai'} @ {activeRegion.sensorName || 'Primary Gauge'}</span>
                  <span className="font-bold text-red-400 font-mono">{simulatedMetrics.nullahGaugeFeet} ft <em className="text-[9px] text-cyan-400 not-italic">SIMULATED</em></span>
                </div>
                <p className="text-[10px] text-red-300 mt-0.5">Danger Threshold: {(activeRegion.dangerLimitFeet || 20).toFixed(1)} ft — field verification required.</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-amber-900/50 min-w-0">
                <div className="flex justify-between">
                  <span className="text-slate-300 font-medium">{activeRegion.riverBasin || 'Nullah Lai'} @ Secondary Spillway</span>
                  <span className="font-bold text-amber-400 font-mono">{Math.max(1, simulatedMetrics.nullahGaugeFeet - 1.2).toFixed(1)} ft <em className="text-[9px] text-cyan-400 not-italic">SIMULATED</em></span>
                </div>
                <p className="text-[10px] text-amber-300 mt-0.5">Catchment downstream telemetry — automated alert active.</p>
              </div>

              {/* Atmospheric Weather Telemetry */}
              {weather && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-cyan-900/50 min-w-0">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium flex items-center gap-1">
                      <Wind className="w-3 h-3 text-cyan-400" />
                      Atmospheric Rain & Wind
                    </span>
                    <span className="font-bold text-cyan-400 font-mono">{weather.temperature}°C &bull; {weather.humidity}% Hum</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Precip: <strong className="text-slate-200">{weather.precipitation} mm/h</strong> &bull; Wind: <strong className="text-slate-200">{weather.windSpeed} km/h</strong> (Gusts: {weather.windGusts} km/h)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
