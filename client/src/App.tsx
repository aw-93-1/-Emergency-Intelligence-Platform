import { useState, useEffect, useMemo, useCallback } from 'react';
import { CrisisProvider, useCrisis } from './context/CrisisContext';
import { Navbar, DashboardTab } from './components/Navbar';
import { LiveFeed } from './components/LiveFeed';
import { MapView } from './components/MapView';
import { SafestRouteModal } from './components/SafestRouteModal';
import { PriorityDispatch } from './components/PriorityDispatch';
import { EmergencyTicker } from './components/EmergencyTicker';
import { CommanderQwenDrawer } from './components/CommanderQwenDrawer';
import { QwenVisionInspector } from './components/QwenVisionInspector';
import { SitrepModal } from './components/SitrepModal';
import { CitizenSurvivalPortal } from './components/CitizenSurvivalPortal';
import { CommanderAuthModal } from './components/CommanderAuthModal';
import { RoleGateway } from './components/RoleGateway';
import {
  Navigation,
  Send,
  Play,
  RotateCcw,
  PlusCircle,
  Hospital,
  Droplets,
  Truck,
  Activity,
  Radio,
  Users,
  Bot,
  Eye,
  Sparkles,
  X,
  HeartPulse
} from 'lucide-react';

function DashboardContent({
  onLockEoc
}: {
  onLockEoc: () => void;
}) {
  const {
    activeRegion,
    hospitals,
    reliefHubs,
    dispatchedUnits,
    reports,
    weather,
    radar,
    intelLoading,
    setHighlightedCoords,
    calculateSafeRoute,
    reserveHospitalBed,
    latestIncomingSos,
    clearLatestIncomingSos
  } = useCrisis();

  const [activeTab, setActiveTab] = useState<DashboardTab>('all');
  const [isSafeRouteOpen, setIsSafeRouteOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isSitrepOpen, setIsSitrepOpen] = useState(false);
  const [isQwenOpen, setIsQwenOpen] = useState(false);
  const [isVisionOpen, setIsVisionOpen] = useState(false);
  const [routeOriginCoords, setRouteOriginCoords] = useState<[number, number] | undefined>(undefined);

  // Sync activeTab with URL hash so tabs can be opened in new windows/tabs
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') as DashboardTab;
      if (['all', 'map', 'reports', 'hospitals', 'sensors'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleOpenSafeRoute = useCallback((coords?: [number, number]) => {
    if (coords) setRouteOriginCoords(coords);
    setIsSafeRouteOpen(true);
  }, []);

  const [hospitalReserveToast, setHospitalReserveToast] = useState<{ visible: boolean; name: string } | null>(null);

  const scrollToMap = useCallback(() => {
    const mapEl = document.getElementById('tactical-map');
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleRouteToHospital = useCallback((h: (typeof hospitals)[0]) => {
    reserveHospitalBed(h.id);
    setHospitalReserveToast({ visible: true, name: h.name });
    setTimeout(() => setHospitalReserveToast(null), 4500);

    const targetRep = reports.find(r => r.coords && r.coords.length === 2 && !isNaN(r.coords[0]));
    calculateSafeRoute(targetRep?.coords, h.id);

    setActiveTab('map');
    setTimeout(() => {
      scrollToMap();
    }, 150);
  }, [reserveHospitalBed, reports, calculateSafeRoute, scrollToMap]);

  const overloadedHospitals = useMemo(() => hospitals.filter(h => h.capacity >= 85).length, [hospitals]);
  const availableIcu = useMemo(() => hospitals.reduce((sum, h) => sum + h.icuAvailable, 0), [hospitals]);
  const totalDrinkingWater = useMemo(() => reliefHubs.reduce((sum, h) => sum + (h.drinkingWaterLiters || 0), 0), [reliefHubs]);
  const totalFoodPacks = useMemo(() => reliefHubs.reduce((sum, h) => sum + (h.foodPackets || 0), 0), [reliefHubs]);
  const totalBoats = useMemo(() => reliefHubs.reduce((sum, h) => sum + (h.rescueBoats || 0), 0), [reliefHubs]);

  // Live Dynamic Metrics for Dashboard Telemetry Pods (100% calculated from live state)
  const liveTrappedCitizens = useMemo(() => {
    return reports.reduce((sum, r) => sum + (r.headcount || 0), 0);
  }, [reports]);

  const liveIcuSaturation = useMemo(() => {
    const totalHospitalBeds = hospitals.reduce((sum, h) => sum + (h.totalBeds || 0), 0);
    const totalOccupiedBeds = hospitals.reduce((sum, h) => sum + (h.occupiedBeds || 0), 0);
    return totalHospitalBeds > 0
      ? Math.round((totalOccupiedBeds / totalHospitalBeds) * 100)
      : 0;
  }, [hospitals]);

  const liveActiveSos = useMemo(() => reports.length, [reports.length]);

  const liveRiverLevel = useMemo(() => {
    if (weather?.riverDischargeM3s) {
      return `${weather.riverDischargeM3s} m³/s`;
    }
    const rainOffset = (weather?.precipitation && weather.precipitation > 0) ? Math.min(3.5, weather.precipitation * 0.3) : 0;
    return `${(19.5 + rainOffset).toFixed(1)} ft`;
  }, [weather?.riverDischargeM3s, weather?.precipitation]);

  return (
    <div className="min-h-screen w-full bg-[#080d1a] text-slate-100 font-['Plus_Jakarta_Sans'] overflow-x-hidden pb-16 md:pb-0">
      {/* Live Emergency Broadcast Ticker */}
      <EmergencyTicker
        onOpenCitizenModal={() => {}}
        onOpenSafeRoute={() => handleOpenSafeRoute()}
      />

      {/* Sleek Single-Line Navbar with Tabs and Popout Options */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenSafeRouteModal={() => handleOpenSafeRoute()}
        onOpenPriorityModal={() => setIsPriorityOpen(true)}
        onOpenSitrepModal={() => setIsSitrepOpen(true)}
        onLockEoc={onLockEoc}
      />

      {/* High-Visibility Live Citizen SOS Incoming Dispatch Banner */}
      {latestIncomingSos && (
        <div className="bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 border-y-2 border-red-500 px-4 py-3 shadow-[0_4px_30px_rgba(239,68,68,0.5)] flex flex-col md:flex-row items-center justify-between gap-3 sticky top-14 z-40 animate-pulse">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-full bg-red-600/30 border-2 border-red-500 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-red-400 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black tracking-wider bg-red-600 text-white px-2 py-0.5 rounded shadow">
                  🚨 LIVE CITIZEN SOS RECEIVED
                </span>
                <span className="font-bold text-white text-sm">
                  {latestIncomingSos.citizenName ? `${latestIncomingSos.citizenName} — ` : ''}{latestIncomingSos.category.replace('_', ' ')}
                </span>
                {latestIncomingSos.headcount ? (
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-600/80 px-2 py-0.5 rounded">
                    👥 {latestIncomingSos.headcount} Trapped
                  </span>
                ) : null}
                {latestIncomingSos.accuracyMeters ? (
                  <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-600/80 px-2 py-0.5 rounded font-bold">
                    📍 ±{latestIncomingSos.accuracyMeters}m Satellite Accuracy
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1 italic">
                "{latestIncomingSos.rawText}" — <span className="text-cyan-300 font-mono font-semibold">{latestIncomingSos.locationName}</span> ({latestIncomingSos.coords[0].toFixed(4)}, {latestIncomingSos.coords[1].toFixed(4)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={() => {
                setHighlightedCoords(latestIncomingSos.coords);
                scrollToMap();
              }}
              className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>🎯 Locate on Map</span>
            </button>
            <button
              onClick={() => {
                handleOpenSafeRoute(latestIncomingSos.coords);
              }}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>🚑 Calculate Safe Route</span>
            </button>
            <button
              onClick={clearLatestIncomingSos}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Dismiss Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE: Standalone Tactical Map Tab */}
      {activeTab === 'map' && (
        <section className="relative w-full h-[calc(100vh-112px)] md:h-[calc(100vh-56px)] bg-slate-950">
          <MapView
            onSelectRouteFromCoords={(coords) => {
              setRouteOriginCoords(coords);
              setIsSafeRouteOpen(true);
            }}
            onDispatchToSector={() => {
              setIsPriorityOpen(true);
            }}
          />
        </section>
      )}

      {/* VIEW MODE: Standalone Distress Wire Tab */}
      {activeTab === 'reports' && (
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
              <span>Real-Time Citizen Distress Stream</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold">
                {reports.length} Active Distress Calls
              </span>
            </div>
          </div>
          <LiveFeed
            onOpenSafeRoute={(coords) => {
              setRouteOriginCoords(coords);
              setIsSafeRouteOpen(true);
            }}
          />
        </main>
      )}

      {/* VIEW MODE: Standalone Hospitals Tab */}
      {activeTab === 'hospitals' && (
        <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
                <Hospital className="w-5 h-5 text-emerald-400" />
                <span>Hospital Triage & Bed Saturation Matrix</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Live monitoring across primary trauma centers in {activeRegion.name}
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
              {availableIcu} ICU Beds Available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hospitals.map(h => (
              <div key={h.id} className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-xl font-mono text-xs hover:border-emerald-500/40 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                        EOC CAD FEED • PEOC REGISTERED
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white font-['Plus_Jakarta_Sans']">{h.name}</h3>
                    <span className="text-[10px] text-slate-400">{h.address || h.location || 'Primary Emergency Trauma Center'}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.capacity >= 85 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
                      {h.capacity >= 85 ? 'OVERLOAD DIVERSION' : 'NORMAL TRIAGE'}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">Synced: Just now</span>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Occupancy:</span>
                    <span className="font-bold text-white">{h.occupiedBeds} / {h.totalBeds} ({h.capacity}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        h.capacity >= 85 ? 'bg-rose-500' : h.capacity >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${h.capacity}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] mb-4 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block text-[10px]">ICU Available</span>
                    <span className="text-emerald-400 font-bold">{h.icuAvailable} Beds</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Power Backup</span>
                    <span className="text-cyan-400 font-bold">100% (Aux Gen)</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRouteToHospital(h)}
                  className="w-full py-2.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg hover:shadow-emerald-950/50"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Route Ambulances & Reserve Bed</span>
                </button>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* VIEW MODE: Standalone Hydrology Tab */}
      {activeTab === 'sensors' && (
        <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
                <Droplets className="w-5 h-5 text-cyan-400" />
                <span>Hydrological Sensors & Logistics Reserve</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Real-time water level gauges, NDMA relief stocks & deployed units
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* River Gauges */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-xl font-mono text-xs">
              <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2 font-['Plus_Jakarta_Sans']">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <span>RIVER CATCHMENT SENSORS</span>
              </h3>
              <div className="space-y-3">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-rose-900/40">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-200 font-bold">Nullah Lai @ Kattarian Bridge</span>
                    <span className="text-rose-400 font-bold text-sm">22.4 ft</span>
                  </div>
                  <p className="text-[11px] text-rose-300/90 mt-1">
                    Danger Level: 20.0 ft &bull; Discharge: 34,000 cusecs (Critical Surge)
                  </p>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-amber-900/40">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-200 font-bold">Nullah Lai @ Gawalmandi</span>
                    <span className="text-amber-400 font-bold text-sm">19.2 ft</span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 mt-1">
                    Danger Level: 18.0 ft &bull; Embankment water overtopping road
                  </p>
                </div>
              </div>
            </div>

            {/* Relief Stocks */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-xl font-mono text-xs">
              <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2 font-['Plus_Jakarta_Sans']">
                <Droplets className="w-4 h-4 text-sky-400" />
                <span>RELIEF & CLEAN WATER RESERVE</span>
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block mb-1">Potable Water</span>
                  <span className="font-bold text-cyan-300 text-sm">{totalDrinkingWater.toLocaleString()} L</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block mb-1">Ration Packs</span>
                  <span className="font-bold text-emerald-300 text-sm">{totalFoodPacks.toLocaleString()}</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block mb-1">Rescue Boats</span>
                  <span className="font-bold text-amber-300 text-sm">{totalBoats}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Managed by NDMA, Rescue 1122 & Pakistan Red Crescent Society (PRCS).
              </p>
            </div>
          </div>
        </main>
      )}

      {/* VIEW MODE: Default Scrollable "Overview" Tab */}
      {activeTab === 'all' && (
        <>
          {/* Hero: Tactical Geospatial EOC Map Viewport */}
          <section id="tactical-map" className="relative w-full h-[360px] sm:h-[440px] lg:h-[500px] bg-slate-950 border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
            <MapView
              onSelectRouteFromCoords={(coords) => {
                setRouteOriginCoords(coords);
                setIsSafeRouteOpen(true);
              }}
              onDispatchToSector={() => {
                setIsPriorityOpen(true);
              }}
            />
          </section>

          {/* Core Telemetry KPI Strip — Cleanly Separated Below Map */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Citizens Trapped */}
              <div className="relative overflow-hidden bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span className="text-[10px] font-mono font-bold tracking-wider text-rose-400 uppercase">
                      PRIORITY ZERO
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-800/80 px-1.5 py-0.5 rounded">
                    URGENT
                  </span>
                </div>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-950 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Trapped Civilians</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-black text-2xl sm:text-3xl text-white font-mono leading-none tracking-tight">
                        {liveTrappedCitizens}
                      </span>
                      <span className="text-[10px] text-rose-400 font-mono font-bold">SO-1122</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: ICU Saturation */}
              <div className="relative overflow-hidden bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span className="text-[10px] font-mono font-bold tracking-wider text-amber-400 uppercase">
                      HOSPITAL SURGE
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded">
                    TRIAGE ACTIVE
                  </span>
                </div>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Hospital className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">ICU Saturation</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-black text-2xl sm:text-3xl text-white font-mono leading-none tracking-tight">
                        {liveIcuSaturation}%
                      </span>
                      <span className="text-[10px] text-amber-400 font-mono font-bold">{availableIcu} Beds Free</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Active SOS Signals */}
              <div className="relative overflow-hidden bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase">
                      DISTRESS MESH
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 px-1.5 py-0.5 rounded">
                    LIVE INTEL
                  </span>
                </div>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Active SOS Beacons</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-black text-2xl sm:text-3xl text-white font-mono leading-none tracking-tight">
                        {liveActiveSos}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">{reports.length} Total Logs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: River Hydrology Gauge */}
              <div className="relative overflow-hidden bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase">
                      HYDROLOGY GAUGE
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.5 rounded truncate max-w-[130px]" title={activeRegion.sensorName || 'BASIN SENSOR'}>
                    {activeRegion.sensorName || 'BASIN SENSOR'}
                  </span>
                </div>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block truncate" title={activeRegion.riverBasin || 'Basin Hydrology Level'}>
                      {activeRegion.riverBasin || 'Basin Hydrology Level'}
                    </span>
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="font-black text-2xl sm:text-3xl text-white font-mono leading-none tracking-tight">
                        {liveRiverLevel}
                      </span>
                      <span className="text-sm font-bold text-emerald-400 font-mono ml-0.5">ft</span>
                      {weather?.riverDischargeM3s !== undefined && (
                        <span className="text-[10px] text-cyan-300 font-mono font-bold ml-1 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/80" title="Live Copernicus GloFAS River Streamflow API">
                          {weather.riverDischargeM3s.toLocaleString()} m³/s
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono ml-1 hidden sm:inline">
                        (Limit {(activeRegion.dangerLimitFeet || 20.0).toFixed(1)}ft)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Scrollable Command Operations Container */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Section 1: Tactical Quick Actions Deck */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h2 className="font-bold text-base tracking-wider uppercase text-white font-mono">
                    RAPID CRISIS ACTION DIRECTIVES
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
                  AUTONOMOUS DECISION MATRIX
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Crisis Simulation */}
                {/* Card 1: Live Doppler Radar & Hydrology Stream */}
                <div className="bg-slate-950/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 transition-all shadow-xl flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center text-cyan-400 shadow-sm">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-cyan-950 text-cyan-300 border-cyan-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE GLOFAS
                      </span>
                    </div>
                    <h3 className="font-black text-base text-white mb-1.5 group-hover:text-cyan-300 transition-colors">
                      Live Hydrology & Radar
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Real-time RainViewer Doppler radar tiles & Copernicus GloFAS streamflow discharge rates.
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-900 font-mono text-xs">
                    <button
                      onClick={() => setActiveTab('sensors')}
                      className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg"
                    >
                      <Droplets className="w-3.5 h-3.5" />
                      <span>Inspect Hydrology Radar</span>
                    </button>
                  </div>
                </div>

                {/* Card 2: Safest Evacuation Pathfinder */}
                <div className="bg-slate-950/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition-all shadow-xl flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shadow-sm">
                        <Navigation className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-emerald-950 text-emerald-300 border-emerald-800">
                        94% RISK CUT
                      </span>
                    </div>
                    <h3 className="font-black text-base text-white mb-1.5 group-hover:text-emerald-300 transition-colors">
                      Safe Evacuation Route
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Bypass submerged Faizabad corridor via elevated 9th Ave flyover to PIMS.
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-900 font-mono text-xs">
                    <button
                      onClick={() => handleOpenSafeRoute()}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Calculate Safe Route</span>
                    </button>
                  </div>
                </div>

                {/* Card 3: AI Priority Dispatch Matrix */}
                <div className="bg-slate-950/90 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-4 transition-all shadow-xl flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-700/50 flex items-center justify-center text-rose-400 shadow-sm">
                        <Send className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-rose-950 text-rose-300 border-rose-800">
                        PRIORITY QUEUE
                      </span>
                    </div>
                    <h3 className="font-black text-base text-white mb-1.5 group-hover:text-rose-300 transition-colors">
                      Resource Dispatch Matrix
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Autonomous asset optimizer for jet-boats, water bowsers & medical squads.
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-900 font-mono text-xs">
                    <button
                      onClick={() => setIsPriorityOpen(true)}
                      className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Open Dispatch Matrix</span>
                    </button>
                  </div>
                </div>

                {/* Card 4: Qwen-VL Aerial Drone Damage AI */}
                <div className="bg-slate-950/90 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-4 transition-all shadow-xl flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-700/50 flex items-center justify-center text-rose-400 shadow-sm">
                        <Eye className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-rose-950 text-rose-300 border-rose-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-rose-400" />
                        MULTIMODAL AI
                      </span>
                    </div>
                    <h3 className="font-black text-base text-white mb-1.5 group-hover:text-rose-300 transition-colors">
                      Qwen-VL Drone Vision AI
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Computer vision aerial damage grading with localized hazard bounding boxes.
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-900 font-mono text-xs">
                    <button
                      onClick={() => setIsVisionOpen(true)}
                      className="w-full py-2 rounded-lg bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white font-bold flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg"
                    >
                      <Eye className="w-3.5 h-3.5 text-white" />
                      <span>Launch Drone Vision AI</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Split Tactical Operations & Infrastructure Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
              {/* Left Column: Live Ground Intel Feed (7 cols) */}
              <div className="min-w-0">
                <LiveFeed
                  onOpenSafeRoute={(coords) => {
                    setRouteOriginCoords(coords);
                    setIsSafeRouteOpen(true);
                  }}
                />
              </div>

              {/* Right Column: Critical Infrastructure & Sensors (5 cols) */}
              <div className="min-w-0 max-h-[calc(100vh-8rem)] overflow-y-auto space-y-6 pr-1">
                {/* 1. Hospital Bed Surge & ICU Saturation Card */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 shadow-xl font-mono text-xs">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Hospital className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-black text-base text-white font-['Plus_Jakarta_Sans']">
                        HOSPITAL BED CAPACITY & SURGE
                      </h3>
                    </div>
                    <span className="text-xs text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-800/60 px-2.5 py-1 rounded-md">
                      {liveIcuSaturation}% <span className="text-[9px]">LIVE OCCUPANCY</span>
                    </span>
                  </div>

                  <div className="space-y-4">
                    {intelLoading && hospitals.length === 0 && (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-4 rounded bg-slate-800" />
                        <div className="h-3 rounded bg-slate-900" />
                      </div>
                    )}
                    {hospitals.map(h => (
                      <div key={h.id} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-slate-200 font-bold truncate pr-2">{h.name}</span>
                          <span className={`font-bold font-mono ${h.capacity >= 85 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {h.capacity}% ({h.occupiedBeds}/{h.totalBeds})
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              h.capacity >= 85 ? 'bg-rose-500' : h.capacity >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${h.capacity}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Live meteorological and radar telemetry */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 shadow-xl font-mono text-xs">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Droplets className="w-5 h-5 text-cyan-400" />
                      <h3 className="font-black text-base text-white font-['Plus_Jakarta_Sans']">
                        HYDRO-METEO RADAR
                      </h3>
                    </div>
                    <span className="text-xs text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-800/60 px-2.5 py-1 rounded-md">
                      {radar ? 'LIVE FRAME' : 'CONNECTING'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">Precipitation</span>
                      <span className="text-cyan-300 font-black text-lg">{weather?.precipitation ?? '--'} mm/h</span>
                    </div>
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">Flood risk</span>
                      <span className="text-amber-300 font-black text-lg">{weather?.floodRiskLevel ?? '--'}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Relief & Potable Water Supply Depots */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 shadow-xl font-mono text-xs">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Droplets className="w-5 h-5 text-sky-400" />
                      <h3 className="font-black text-base text-white font-['Plus_Jakarta_Sans']">
                        RELIEF & WATER DEPOT STOCKS
                      </h3>
                    </div>
                    <span className="text-xs text-sky-400 font-bold bg-sky-950/80 border border-sky-800/60 px-2.5 py-1 rounded-md">
                      {reliefHubs.length} DEPOTS <span className="text-[9px]">SIMULATED</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-center mb-3">
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Water Reserves</span>
                      <span className="font-black text-cyan-300 text-sm sm:text-base">{totalDrinkingWater.toLocaleString()} L</span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Food Packs</span>
                      <span className="font-black text-emerald-300 text-sm sm:text-base">{totalFoodPacks.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Jet Boats</span>
                      <span className="font-black text-amber-300 text-sm sm:text-base">{totalBoats} Units</span>
                    </div>
                  </div>
                </div>

                {/* 4. Active Dispatched Fleet Status */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 shadow-xl font-mono text-xs">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-5 h-5 text-rose-400" />
                      <h3 className="font-black text-base text-white font-['Plus_Jakarta_Sans']">
                        ACTIVE DEPLOYED UNITS
                      </h3>
                    </div>
                    <span className="text-xs text-rose-300 font-bold bg-rose-950/80 border border-rose-800/60 px-2.5 py-1 rounded-md">
                      {dispatchedUnits.length} EN ROUTE
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {dispatchedUnits.length === 0 ? (
                      <p className="text-slate-500 text-center py-4 text-xs sm:text-sm">No active dispatch missions currently deployed.</p>
                    ) : (
                      dispatchedUnits.map(unit => (
                        <div key={unit.id} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white text-xs sm:text-sm block">{unit.unitName}</span>
                            <span className="text-xs text-slate-400">{unit.type}</span>
                          </div>
                          <span className="text-xs text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-md font-bold font-mono">
                            ETA: {unit.etaMin}m
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      {/* Modals */}
      <SafestRouteModal
        isOpen={isSafeRouteOpen}
        onClose={() => setIsSafeRouteOpen(false)}
        initialCoords={routeOriginCoords}
      />

      <PriorityDispatch
        isOpen={isPriorityOpen}
        onClose={() => setIsPriorityOpen(false)}
      />

      <SitrepModal
        isOpen={isSitrepOpen}
        onClose={() => setIsSitrepOpen(false)}
      />

      {/* Floating Dual AI Copilot Triggers (Hidden when any modal is open to avoid blocking actions) */}
      {!isSafeRouteOpen && !isPriorityOpen && !isSitrepOpen && !isVisionOpen && !isQwenOpen && (
        <div className="fixed bottom-5 right-5 z-30 flex items-center gap-2.5">
          {/* Qwen-VL Vision Intelligence Trigger */}
          <button
            onClick={() => setIsVisionOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-700 hover:from-cyan-500 hover:to-teal-500 text-white font-mono text-xs font-black tracking-wide shadow-xl hover:shadow-2xl border border-cyan-400/40 transition-all hover:scale-105 active:scale-95 group"
            title="Open Qwen-VL Vision Multimodal Damage Assessment Engine"
          >
            <div className="w-5 h-5 rounded-lg bg-black/40 flex items-center justify-center border border-white/20">
              <Eye className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            </div>
            <span className="hidden sm:inline">QWEN-VL VISION</span>
            <span className="sm:hidden">VISION</span>
            <span className="text-[9px] bg-black/40 px-1.5 py-0.5 rounded border border-white/20 text-cyan-200 font-bold">
              72B
            </span>
          </button>

          {/* Floating Commander Qwen AI Copilot Trigger */}
          <button
            onClick={() => setIsQwenOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-700 via-rose-700 to-red-800 hover:from-red-600 hover:to-rose-600 text-white font-mono text-xs font-black tracking-wide shadow-xl hover:shadow-2xl border border-red-500/40 transition-all hover:scale-105 active:scale-95 group"
            title="Open Commander Qwen EOC AI Copilot"
          >
            <div className="w-5 h-5 rounded-lg bg-black/40 flex items-center justify-center border border-white/20">
              <Bot className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
            </div>
            <span className="hidden sm:inline">COMMANDER QWEN (AI COPILOT)</span>
            <span className="sm:hidden">QWEN AI</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </div>
      )}

      {/* Standalone Qwen-VL Multimodal Vision Modal */}
      {isVisionOpen && (
        <QwenVisionInspector
          standalone
          onClose={() => setIsVisionOpen(false)}
        />
      )}

      {/* Commander Qwen EOC AI Drawer */}
      <CommanderQwenDrawer
        isOpen={isQwenOpen}
        onClose={() => setIsQwenOpen(false)}
        onOpenSafeRouteModal={() => setIsSafeRouteOpen(true)}
        onOpenPriorityModal={() => setIsPriorityOpen(true)}
        onOpenCitizenModal={() => {}}
        onOpenSitrepModal={() => setIsSitrepOpen(true)}
      />

      {/* Floating Hospital Bed Reservation Confirmation Toast */}
      {hospitalReserveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950/95 border-2 border-emerald-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 font-mono text-xs max-w-md backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5 text-emerald-300 animate-pulse" />
          </div>
          <div>
            <span className="font-black text-emerald-300 block text-xs">🚑 EOC DISPATCH & BED RESERVED</span>
            <span className="text-slate-300 text-[11px] leading-tight block mt-0.5">
              1 Emergency Trauma Bed reserved at <strong>{hospitalReserveToast.name}</strong>. Traffic corridor cleared.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  type AppMode = 'gateway' | 'citizen' | 'commander';

  const [mode, setMode] = useState<AppMode>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === '#sos' || hash === '#citizen' || search.includes('role=citizen')) {
        return 'citizen';
      }
      if (hash === '#commander' || search.includes('role=commander')) {
        if (sessionStorage.getItem('eoc_commander_auth') === 'true') {
          return 'commander';
        }
      }
    }
    return 'gateway';
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCommanderAuthenticated, setIsCommanderAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('eoc_commander_auth') === 'true';
    }
    return false;
  });

  const handleSelectCommander = () => {
    if (isCommanderAuthenticated) {
      setMode('commander');
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleAuthSuccess = (_officerName: string) => {
    setIsCommanderAuthenticated(true);
    setIsAuthModalOpen(false);
    setMode('commander');
  };

  return (
    <CrisisProvider>
      {isAuthModalOpen ? (
        <CommanderAuthModal
          isOpen={isAuthModalOpen}
          onSuccess={handleAuthSuccess}
          onCancel={() => setIsAuthModalOpen(false)}
        />
      ) : (
        <>
          {mode === 'gateway' && (
            <RoleGateway
              onSelectCitizen={() => setMode('citizen')}
              onSelectCommander={handleSelectCommander}
              isCommanderAuthenticated={isCommanderAuthenticated}
            />
          )}

          {mode === 'citizen' && (
            <CitizenSurvivalPortal
              onSwitchToCommander={handleSelectCommander}
              onBackToGateway={() => setMode('gateway')}
            />
          )}

          {mode === 'commander' && (
            <DashboardContent
              onLockEoc={() => setMode('gateway')}
            />
          )}
        </>
      )}
    </CrisisProvider>
  );
}
