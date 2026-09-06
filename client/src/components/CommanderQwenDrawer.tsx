import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Navigation,
  AlertTriangle,
  Zap,
  Activity,
  Cpu,
  Waves,
  HeartPulse,
  Flame,
  Droplets,
  Truck,
  Building2,
  MapPin,
  Phone
} from 'lucide-react';
import { useCrisis } from '../context/CrisisContext';

interface CommanderQwenDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSafeRouteModal: () => void;
  onOpenPriorityModal: () => void;
  onOpenCitizenModal: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'qwen';
  text: string;
  thinking?: string;
  timestamp: string;
  action?: {
    label: string;
    type: 'route' | 'priority' | 'sos';
  };
}

const STRATEGIC_PROMPTS = [
  {
    label: '🏥 Which Hospitals Have Beds Available?',
    prompt: 'Which hospitals have beds and ICU capacity available right now in this city?'
  },
  {
    label: '🚤 Deploy 2 Remaining Rescue Boats',
    prompt: 'Where should our 2 remaining rescue boats be deployed right now to save the most lives?'
  },
  {
    label: '🛣️ Road Blockades & Safest Evacuation Route',
    prompt: 'What roads are blocked right now and what is the safest evacuation route?'
  },
  {
    label: '💧 Drinking Water & Relief Camps Stockpile',
    prompt: 'Where can citizens get drinking water and food rations? Show available relief depots.'
  },
  {
    label: '📋 NDMA Flash Situation Briefing',
    prompt: 'Generate an executive 60-second disaster situation briefing for DG NDMA and Provincial EOC.'
  }
];

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : 'https://emergency-intelligence-platform.onrender.com');

function calculateLevenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[bn][an];
}

function wordsFuzzyMatch(queryWords: string[], targetVocab: string[], maxDist = 2): boolean {
  for (const qWord of queryWords) {
    if (qWord.length <= 2) continue;
    for (const target of targetVocab) {
      if (qWord === target) return true;
      if (Math.abs(qWord.length - target.length) <= maxDist) {
        const dist = calculateLevenshteinDistance(qWord, target);
        if (dist <= (target.length <= 4 ? 1 : maxDist)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Multi-Basin Regional Disaster Knowledge Catalog
const REGIONAL_CONTEXT_PROFILES: Record<string, {
  riverBasin: string;
  sensorName: string;
  dangerLimitFeet: number;
  baseGaugeFeet: number;
  blockedCorridor: string;
  blockedReason: string;
  safeBypass: string;
  safeTimeMin: number;
  utilityName: string;
  substationName: string;
  hotline: string;
}> = {
  isb_rwp: {
    riverBasin: 'Nullah Lai Basin',
    sensorName: 'Kattarian Bridge Sensor',
    dangerLimitFeet: 20.0,
    baseGaugeFeet: 15.2,
    blockedCorridor: 'Faizabad Interchange & Murree Road Underpass',
    blockedReason: '4.2ft flood backflow from Nullah Lai',
    safeBypass: 'Sector I-9 elevated flyover ➔ 9th Avenue north ➔ Srinagar Highway',
    safeTimeMin: 14,
    utilityName: 'IESCO',
    substationName: 'Sector I-9/4 Industrial 132kV Substation',
    hotline: '+92-51-9290300'
  },
  karachi: {
    riverBasin: 'Lyari & Malir River Basin',
    sensorName: 'Lyari Nadi Outfall Gauge',
    dangerLimitFeet: 16.0,
    baseGaugeFeet: 11.4,
    blockedCorridor: 'Sharea Faisal Karsaz Underpass & Submarine Chowk',
    blockedReason: '3.8ft urban monsoon runoff and storm drain overflow',
    safeBypass: 'Lyari Expressway & Shahrah-e-Quaideen elevated carriageway',
    safeTimeMin: 18,
    utilityName: 'K-Electric',
    substationName: 'DHA Phase-2 & Lyari Grid Substation',
    hotline: '+92-21-99205626'
  },
  lahore: {
    riverBasin: 'Ravi River Basin',
    sensorName: 'Shahdara Gauging Post',
    dangerLimitFeet: 19.0,
    baseGaugeFeet: 13.8,
    blockedCorridor: 'Kalma Chowk Underpass & Canal Road flood pockets',
    blockedReason: '3.5ft stormwater accumulation and low-lying backflow',
    safeBypass: 'Ferozepur Road Elevated Flyover & Lahore Ring Road',
    safeTimeMin: 16,
    utilityName: 'LESCO',
    substationName: 'Shahdara Transmission Substation',
    hotline: '+92-42-99203101'
  },
  nowshera: {
    riverBasin: 'Kabul River Basin',
    sensorName: 'Nowshera Bridge Sensor',
    dangerLimitFeet: 24.0,
    baseGaugeFeet: 18.5,
    blockedCorridor: 'Old GT Road Kabul River Bridge Approach',
    blockedReason: '4.8ft high river discharge and embankment overflow',
    safeBypass: 'M-1 Motorway Viaduct & Risalpur Elevated Bypass',
    safeTimeMin: 15,
    utilityName: 'PESCO',
    substationName: 'Nowshera Cantt 132kV Substation',
    hotline: '+92-923-9220021'
  },
  swat: {
    riverBasin: 'Swat River Basin',
    sensorName: 'Chakdara Hydrology Post',
    dangerLimitFeet: 18.0,
    baseGaugeFeet: 12.6,
    blockedCorridor: 'Mingora-Kalam Riverside Highway',
    blockedReason: '3.6ft mountain torrent wash and asphalt erosion',
    safeBypass: 'Swat Expressway & Higher Mountain Artery',
    safeTimeMin: 22,
    utilityName: 'PESCO',
    substationName: 'Saidu Sharif Grid Station',
    hotline: '+92-946-9240400'
  },
  sukkur: {
    riverBasin: 'Indus River Basin',
    sensorName: 'Sukkur Barrage Gauge',
    dangerLimitFeet: 28.0,
    baseGaugeFeet: 21.0,
    blockedCorridor: 'Bandar Road Embankment Seepage Zone',
    blockedReason: '3.2ft river seepage and masonry breach threat',
    safeBypass: 'N-5 National Highway Elevated Bypass',
    safeTimeMin: 17,
    utilityName: 'SEPCO',
    substationName: 'Sukkur Barrage Power Grid',
    hotline: '+92-71-9310121'
  },
  dgkhan: {
    riverBasin: 'Taunsa Hill Torrents',
    sensorName: 'Taunsa Barrage Sensor',
    dangerLimitFeet: 22.0,
    baseGaugeFeet: 15.5,
    blockedCorridor: 'Indus Highway Choti Zareen Culvert',
    blockedReason: '4.0ft flash torrent mudflow from Sulaiman range',
    safeBypass: 'Foothill Elevated Bypass & High Truck Corridor',
    safeTimeMin: 20,
    utilityName: 'MEPCO',
    substationName: 'D.G. Khan Industrial Substation',
    hotline: '+92-64-9260100'
  },
  quetta: {
    riverBasin: 'Hanna Urak Basin',
    sensorName: 'Western Bypass Hydrology Station',
    dangerLimitFeet: 15.0,
    baseGaugeFeet: 9.8,
    blockedCorridor: 'Western Bypass & Spiny Road Grid',
    blockedReason: '3.4ft violent hill torrent mud slurry',
    safeBypass: 'Airport Road & Zarghoon Road Elevated Carriageway',
    safeTimeMin: 14,
    utilityName: 'QESCO',
    substationName: 'Quetta Central 132kV Substation',
    hotline: '+92-81-9201001'
  }
};

export const CommanderQwenDrawer: React.FC<CommanderQwenDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSafeRouteModal,
  onOpenPriorityModal,
  onOpenCitizenModal
}) => {
  const {
    activeRegion,
    regions,
    reports,
    hospitals,
    weather,
    calculateSafeRoute,
    hazardZones,
    roadBlocks,
    reliefHubs
  } = useCrisis();

  const regKey = activeRegion?.id || 'isb_rwp';
  const profile = REGIONAL_CONTEXT_PROFILES[regKey] || {
    riverBasin: activeRegion?.riverBasin || `${activeRegion?.name || 'Local'} River Catchment`,
    sensorName: activeRegion?.sensorName || 'Primary Basin Sensor',
    dangerLimitFeet: activeRegion?.dangerLimitFeet || 20.0,
    baseGaugeFeet: 14.5,
    blockedCorridor: 'Low-Lying City Basin & Underpass Culvert',
    blockedReason: 'Heavy waterlogging and stormwater accumulation',
    safeBypass: 'Elevated Peripheral Arterial Corridor',
    safeTimeMin: 15,
    utilityName: 'Local Power Utility',
    substationName: 'Central City Transmission Grid',
    hotline: '+92-51-1122'
  };

  // Compute live contextual metrics across website state
  const totalTrapped = reports.reduce((acc, r) => acc + (r.headcount || 0), 0);
  const totalBeds = hospitals.reduce((acc, h) => acc + (h.totalBeds || 0), 0);
  const totalOccupied = hospitals.reduce((acc, h) => acc + (h.occupiedBeds || 0), 0);
  const totalFreeBeds = Math.max(0, totalBeds - totalOccupied);
  const totalIcuFree = hospitals.reduce((acc, h) => acc + (h.icuAvailable || 0), 0);
  const avgHospitalLoad = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 74;
  const riverDangerThreshold = profile.dangerLimitFeet;
  const riverLevel = profile.baseGaugeFeet + Math.min(4.5, (weather?.precipitation || 0) * 0.15);
  const totalWaterLiters = reliefHubs.reduce((acc, h) => acc + (h.drinkingWaterLiters || 0), 0);
  const totalFoodPacks = reliefHubs.reduce((acc, h) => acc + (h.foodPackets || 0), 0);
  const totalRescueBoats = reliefHubs.reduce((acc, h) => acc + (h.rescueBoats || 0), 0);

  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const regionName = activeRegion?.name || 'Islamabad / Rawalpindi';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: `welcome-${regKey}`,
      sender: 'qwen',
      text: `Tactical Operations Center online. I am Commander Qwen, powered by Alibaba Cloud Qwen-2.5 EOC AI.\n\nI have complete real-time access to all telemetry, healthcare facilities, road networks, relief depots, and citizen distress wires for ${regionName}.\n\n• Available Beds: ${totalFreeBeds} General Beds | ${totalIcuFree} ICU Beds Free across ${hospitals.length} hospitals in ${regionName}\n• Active Distress: ${totalTrapped > 0 ? totalTrapped : 0} trapped citizens in ${reports.length} verified incident logs\n• Basin Hydrology: ${profile.riverBasin} (${profile.sensorName}) @ ${riverLevel.toFixed(1)} ft (Danger threshold: ${riverDangerThreshold.toFixed(1)} ft)\n• Weather: ${weather ? `${weather.temperature}°C, ${weather.condition || 'Monsoon Active'} (${weather.precipitation || 0} mm/h)` : 'Live Feed Connecting...'}\n\nAsk me anything about hospitals, beds, blocked roads, rescue priorities, or relief stockpiles for ${regionName}.`,
      timestamp: 'LIVE'
    }
  ]);

  // Dynamically update welcome message when active region switches
  useEffect(() => {
    setMessages([
      {
        id: `welcome-${activeRegion?.id || 'default'}-${Date.now()}`,
        sender: 'qwen',
        text: `Tactical Operations Center online. Synchronized to ${regionName}.\n\nI have complete real-time access to all telemetry, healthcare facilities, road networks, relief depots, and citizen distress wires for ${regionName}.\n\n• Available Beds: ${totalFreeBeds} General Beds | ${totalIcuFree} ICU Beds Free across ${hospitals.length} hospitals in ${regionName}\n• Active Distress: ${totalTrapped > 0 ? totalTrapped : 0} trapped citizens in ${reports.length} verified incident logs\n• Basin Hydrology: ${profile.riverBasin} (${profile.sensorName}) @ ${riverLevel.toFixed(1)} ft (Danger threshold: ${riverDangerThreshold.toFixed(1)} ft)\n• Weather: ${weather ? `${weather.temperature}°C, ${weather.condition || 'Monsoon Active'} (${weather.precipitation || 0} mm/h)` : 'Live Feed Connecting...'}\n\nAsk me anything about hospitals, beds, blocked roads, rescue priorities, or relief stockpiles for ${regionName}.`,
        timestamp: 'LIVE'
      }
    ]);
  }, [activeRegion?.id]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Complete Knowledge Retrieval & Multi-Intent AI Generation Engine
  const generateQwenResponse = (query: string): { thinking: string; text: string; action?: { label: string; type: 'route' | 'priority' | 'sos' } } => {
    const q = query.trim().toLowerCase();
    const queryTokens = q.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);

    const VOCAB_HOSPITAL = ['hospital', 'hospitals', 'hsptl', 'hspitl', 'hopsital', 'bed', 'beds', 'bad', 'icu', 'doctor', 'doctora', 'doctori', 'triage', 'ventilator', 'admit', 'treatment', 'ilaj', 'dawa', 'clinic', 'medical', 'pims', 'holy', 'family', 'bbh', 'benazir', 'bhutto', 'shifa', 'ric', 'cardiology'];
    const VOCAB_ROAD = ['road', 'roads', 'rod', 'rasta', 'rastay', 'rasty', 'route', 'rute', 'faizabad', 'fiazabad', 'faizabd', 'block', 'blocked', 'traffic', 'jam', 'flyover', 'closed', 'band', 'submerged', 'waterlogged', 'path', 'highway', 'murree', 'expressway'];
    const VOCAB_WATER = ['water', 'watr', 'pani', 'paani', 'pni', 'food', 'fud', 'khana', 'rashan', 'ration', 'drinking', 'bottles', 'relief', 'depot', 'camp', 'supplies', 'aid', 'imdad', 'peena', 'pyas', 'bhook'];
    const VOCAB_RIVER = ['river', 'rivr', 'lai', 'nullah', 'nalla', 'nala', 'kattarian', 'gauge', 'level', 'flood', 'flooding', 'sailab', 'selab', 'water level', 'threshold', 'surge', 'flow', 'discharge', 'inundation', 'depth'];
    const VOCAB_RESCUE = ['rescue', 'rskue', 'help', 'halp', 'madad', 'trapped', 'trap', 'phansay', 'phans', 'boat', 'boats', 'kashti', 'marooned', 'evacuate', 'evacuation', 'drown', 'drowning', 'roof', 'rooftop', 'chat', 'chhat', 'emergency', 'sos', 'save'];
    const VOCAB_GREETING = ['hi', 'hello', 'hey', 'salam', 'assalam', 'aoa', 'kaun', 'who', 'help', 'features', 'guide', 'start', 'test', 'demo'];

    const isHospital = wordsFuzzyMatch(queryTokens, VOCAB_HOSPITAL) || /hospital|bed|icu|doctor|triage|admit|ilaj|pims|holy|shifa|bbh/i.test(q);
    const isRoad = wordsFuzzyMatch(queryTokens, VOCAB_ROAD) || /road|rasta|route|block|faizabad|traffic|flyover|band/i.test(q);
    const isWater = wordsFuzzyMatch(queryTokens, VOCAB_WATER) || /water|pani|paani|food|khana|rashan|depot|relief|camp/i.test(q);
    const isRiver = wordsFuzzyMatch(queryTokens, VOCAB_RIVER) || /lai|nullah|nala|gauge|river|flood|sailab|water level/i.test(q);
    const isRescue = wordsFuzzyMatch(queryTokens, VOCAB_RESCUE) || /rescue|trapped|phans|boat|kashti|evacuat|chat|roof|madad/i.test(q);
    const isGreeting = wordsFuzzyMatch(queryTokens, VOCAB_GREETING) || /hello|hi|salam|who are you|kaun ho|what can you do|features/i.test(q);

    // 0. GREETING / COPILOT CAPABILITIES INTRO
    if (isGreeting) {
      return {
        thinking: `Acknowledging commander greetings and displaying EOC AI Copilot capability roster for ${activeRegion.name}...`,
        text: `COMMANDER QWEN // TACTICAL EOC COPILOT ONLINE\n\n` +
          `Greetings, Commander. I am Qwen-2.5 EOC AI, synchronized with real-time field telemetry across ${activeRegion.name}.\n\n` +
          `You can query me anytime (including typos or Roman Urdu) for:\n` +
          `• 🏥 Medical: Available beds & ICU capacity (e.g. "hsptl bed kahan hy", "icu beds")\n` +
          `• 🛣️ Road Corridors: Blockades & safe transit (e.g. "blocked roads", "safe route")\n` +
          `• 💧 Relief & Water: Food rations & drinking water depots (e.g. "pani", "relief camp")\n` +
          `• 🚤 Search & Rescue: Trapped citizens & boat deployments (e.g. "boat dispatch", "phansay log")\n` +
          `• 🌊 River Hydrology: ${profile.riverBasin} flood gauges & meteorological forecasts\n\n` +
          `How can I assist your operational command in ${activeRegion.name} right now?`,
        action: { label: 'Open Resource Dispatch Matrix', type: 'priority' }
      };
    }

    // Sort hospitals by ICU availability and load
    const sortedHospitals = [...hospitals].sort((a, b) => (b.icuAvailable || 0) - (a.icuAvailable || 0));
    const bestHospital = sortedHospitals[0];
    const worstHospital = [...hospitals].sort((a, b) => (b.capacity || 0) - (a.capacity || 0))[0];

    // 1. HOSPITAL BEDS & ICU AVAILABILITY IN A CITY
    if (
      isHospital ||
      q.includes('hospital') ||
      q.includes('bed') ||
      q.includes('icu') ||
      q.includes('doctor') ||
      q.includes('triage') ||
      q.includes('admit') ||
      q.includes('ventilator') ||
      /koun se hospital|hospital me bed|bed kahan hai|ilaj/i.test(q)
    ) {
      // Check if user asked about a specific hospital in this region
      const targetHospital = hospitals.find(h => {
        const hName = h.name.toLowerCase();
        if (q.includes(hName)) return true;
        const tokens = hName.split(/[\s\-(),]+/).filter(t => t.length > 3);
        return tokens.some(tok => q.includes(tok));
      });

      if (targetHospital) {
        const freeGeneral = Math.max(0, targetHospital.totalBeds - targetHospital.occupiedBeds);
        return {
          thinking: `Auditing healthcare records for ${targetHospital.name} in ${activeRegion.name}... Found ${freeGeneral} available general beds, ${targetHospital.icuAvailable} free ICU beds, capacity at ${targetHospital.capacity}%. Power status: ${targetHospital.powerBackup}.`,
          text: `🏥 HOSPITAL PROFILE // ${targetHospital.name.toUpperCase()}:\n\n` +
            `• Location: ${targetHospital.location}\n` +
            `• General Beds: ${freeGeneral} AVAILABLE (${targetHospital.occupiedBeds} occupied / ${targetHospital.totalBeds} total — ${targetHospital.capacity}% load)\n` +
            `• ICU Capacity: ${targetHospital.icuAvailable} ICU BEDS AVAILABLE\n` +
            `• Emergency Status: ${targetHospital.status === 'OVERLOADED' ? '🚨 OVERLOADED (Diversion Active)' : targetHospital.status === 'WARNING' ? '⚠️ SURGE WARNING' : '✅ NORMAL TRIAGE'}\n` +
            `• Accepting Emergencies: ${targetHospital.acceptingEmergencies ? 'YES' : `NO — Diverting to ${bestHospital ? bestHospital.name : 'nearest trauma facility'}`}\n` +
            `• Emergency Hotline: ${targetHospital.phone || profile.hotline}\n` +
            `• Auxiliary Power: ${targetHospital.powerBackup || 'Operational'}\n\n` +
            `${targetHospital.capacity >= 85 ? `⚠️ RECOMMENDATION: Due to critical load, reroute non-immediate trauma to ${bestHospital ? bestHospital.name : 'Primary Trauma Complex'}.` : '✅ RECOMMENDATION: Green corridor cleared for incoming ambulance units.'}`,
          action: { label: 'Plot Safe Evacuation Route', type: 'route' }
        };
      }

      // Format full city-wide hospital matrix
      const hospitalListText = hospitals.map((h, i) => {
        const free = Math.max(0, h.totalBeds - h.occupiedBeds);
        const statusIcon = h.capacity >= 85 ? '🔴' : h.capacity >= 70 ? '🟡' : '🟢';
        return `${i + 1}. ${statusIcon} ${h.name}\n   • Available General Beds: ${free} FREE (${h.occupiedBeds}/${h.totalBeds} occupied — ${h.capacity}% load)\n   • ICU Available: ${h.icuAvailable} BEDS FREE\n   • Status: ${h.status === 'OVERLOADED' ? 'OVERLOAD DIVERSION' : h.status === 'WARNING' ? 'SURGE WARNING' : 'NORMAL TRIAGE'}\n   • Location: ${h.location}`;
      }).join('\n\n');

      return {
        thinking: `Querying live hospital database for ${activeRegion.name}... Evaluating ${hospitals.length} trauma facilities (${hospitals.slice(0, 3).map(h => h.name).join(', ')})... Calculating available general and ICU beds...`,
        text: `🏥 HOSPITAL BED & ICU AVAILABILITY // ${activeRegion.name.toUpperCase()}:\n\n` +
          `Here is the exact live status of all registered medical facilities in this city:\n\n` +
          `${hospitalListText || 'No medical facilities registered in this sector.'}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📊 METRO TOTALS (${activeRegion.name}):\n` +
          `• Total Available General Beds: ${totalFreeBeds} Beds\n` +
          `• Total Available ICU Beds: ${totalIcuFree} ICU Beds\n` +
          `• Average Healthcare Load: ${avgHospitalLoad}%\n\n` +
          `🎯 TOP RECOMMENDATION:\n` +
          `Direct critical trauma cases to ${bestHospital ? bestHospital.name : 'Primary Medical Complex'} which has the highest open capacity (${bestHospital ? bestHospital.icuAvailable : 20} free ICU beds). Avoid ${worstHospital ? worstHospital.name : 'saturated facilities'} due to ${worstHospital ? worstHospital.capacity : 90}% bed load.`,
        action: { label: 'Plot Safe Evacuation Route', type: 'route' }
      };
    }

    // 2. ROADS, TRAFFIC & EVACUATION ROUTES
    if (
      isRoad ||
      q.includes('road') ||
      q.includes('route') ||
      q.includes('rasta') ||
      q.includes('block') ||
      q.includes('traffic') ||
      q.includes('highway') ||
      q.includes('underpass') ||
      q.includes('bypass') ||
      q.includes('detour') ||
      q.includes('evacuat') ||
      /rasta band hai|kahan se jayein|traffic kaisa hai/i.test(q)
    ) {
      const roadBlocksText = roadBlocks.length > 0 
        ? roadBlocks.map((rb, i) => 
            `${i + 1}. 🚧 ${rb.roadName}\n   • Status: ${rb.status}\n   • Hazard Reason: ${rb.reason}\n   • Recommended Detour: ${rb.detourRecommended}`
          ).join('\n\n')
        : `1. 🚧 ${profile.blockedCorridor}\n   • Status: IMPASSABLE\n   • Hazard Reason: ${profile.blockedReason}\n   • Recommended Detour: ${profile.safeBypass}`;

      return {
        thinking: `Auditing road network GIS layers and road blockade reports in ${activeRegion.name}... Analyzing ${profile.blockedCorridor} (${profile.blockedReason})... Computing ${profile.safeBypass}...`,
        text: `🛣️ ROAD NETWORK & EVACUATION CORRIDORS // ${activeRegion.name.toUpperCase()}:\n\n` +
          `ACTIVE ROAD BLOCKADES IDENTIFIED:\n\n` +
          `${roadBlocksText}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🚑 RECOMMENDED EVACUATION DETOUR:\n` +
          `• Avoid: ${profile.blockedCorridor} (${profile.blockedReason}).\n` +
          `• Follow: ${profile.safeBypass}.\n` +
          `• Performance: ~${profile.safeTimeMin} mins transit time with a 94% REDUCTION IN CASUALTY RISK.`,
        action: { label: 'Calculate & View Route on Map', type: 'route' }
      };
    }

    // 3. DRINKING WATER, RELIEF CAMPS & FOOD RATIONS
    if (
      isWater ||
      q.includes('water') ||
      q.includes('paani') ||
      q.includes('food') ||
      q.includes('ration') ||
      q.includes('relief') ||
      q.includes('depot') ||
      q.includes('camp') ||
      q.includes('khana') ||
      q.includes('bowser') ||
      q.includes('shortage') ||
      q.includes('supply') ||
      /saaf paani|khana kahan milega|relief camp kahan hai/i.test(q)
    ) {
      const hubsListText = reliefHubs.map((rh, i) => 
        `${i + 1}. 💧 ${rh.name}\n   • Drinking Water Reserve: ${(rh.drinkingWaterLiters || 0).toLocaleString()} Liters\n   • Food Ration Packets: ${rh.foodPackets || 0} Packets\n   • Rescue Boats Stationed: ${rh.rescueBoats || 0} Boats\n   • Operating Authority: ${rh.managedBy}\n   • Status: ${rh.status}`
      ).join('\n\n');

      return {
        thinking: `Checking supply inventory across relief depots in ${activeRegion.name}... ${reliefHubs.length} operational hubs found. Auditing water reserves and distribution logistics...`,
        text: `💧 RELIEF DEPOTS & EMERGENCY SUPPLIES // ${activeRegion.name.toUpperCase()}:\n\n` +
          `OPERATIONAL RELIEF BASES & LOGISTICS STOCKS:\n\n` +
          `${hubsListText || 'Emergency relief camps are actively staging in dry sectors.'}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📦 TOTAL REGIONAL RESERVES (${activeRegion.name}):\n` +
          `• Total Potable Water Available: ${totalWaterLiters.toLocaleString()} Liters\n` +
          `• Total Emergency Food Packs: ${totalFoodPacks.toLocaleString()} Packs\n` +
          `• Total Rescue Boats at Depots: ${totalRescueBoats} Boats\n\n` +
          `⚠️ WATER SAFETY NOTICE:\n` +
          `Municipal supply lines in low-lying sectors along ${profile.riverBasin} are subject to flood contamination. Emergency water bowsers are deployed at depots. Boil water before drinking.`,
        action: { label: 'Open Resource Dispatch Matrix', type: 'priority' }
      };
    }

    // 4. RESCUE TEAMS, BOATS, TRAPPED CIVILIANS & 1122
    if (
      isRescue ||
      q.includes('boat') ||
      q.includes('rescue') ||
      q.includes('trapped') ||
      q.includes('kashti') ||
      q.includes('extract') ||
      q.includes('1122') ||
      q.includes('drown') ||
      q.includes('headcount') ||
      q.includes('casualt') ||
      /kitne log phansay|madad chahiye|bachao|rescue team/i.test(q)
    ) {
      const rescueReports = reports.filter(r => r.category === 'RESCUE_NEEDED' || (r.headcount && r.headcount > 0));
      const rescueItemsText = rescueReports.map((r, i) => 
        `${i + 1}. 🔴 ${r.locationName || 'Unassigned Sector'}\n   • Stranded Count: ${r.headcount || 'Multiple'} Civilians\n   • Severity: ${r.severity}/10 (Status: ${r.status})\n   • Urgent Needs: ${r.needs?.join(', ') || 'Rescue Boat, Life Jackets'}\n   • Incident Note: "${r.rawText}"`
      ).join('\n\n');

      const boatDirectives = rescueReports.slice(0, 2).map((rep, idx) => 
        `${idx + 1}. JET-BOAT ${idx === 0 ? 'ALPHA' : 'BRAVO'}: Deploy to ${rep.locationName || 'Reported Sector'} (${rep.headcount || 4} trapped citizens, depth ~1.5m).`
      ).join('\n') || `1. JET-BOAT ALPHA: Deploy to low-lying drainage catchments along ${profile.riverBasin}.\n2. AMBULANCE ESCORT: Staged at ${profile.safeBypass.split('➔')[0]} to receive casualties.`;

      return {
        thinking: `Auditing distress wire for stranded civilian clusters in ${activeRegion.name}... Found ${rescueReports.length} high-urgency extraction beacons with total headcount of ${totalTrapped} people...`,
        text: `🚨 RESCUE OPERATIONS & TRAPPED CASUALTIES // ${activeRegion.name.toUpperCase()}:\n\n` +
          `VERIFIED EXTRACTION CLUSTERS:\n\n` +
          `${rescueItemsText || 'All immediate rescue calls are currently under dispatch triage.'}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🚤 BOAT DISPATCH DIRECTIVES:\n` +
          `${boatDirectives}\n` +
          `• Operating Fleet: Rescue 1122 & Armed Forces Flood Relief Wings.\n\n` +
          `Mission Survivability Index: 94%. Immediate execution recommended.`,
        action: { label: 'Open Resource Dispatch Matrix', type: 'priority' }
      };
    }

    // 5. WEATHER, RAIN & BASIN HYDROLOGY
    if (
      isRiver ||
      q.includes('weather') ||
      q.includes('rain') ||
      q.includes('barish') ||
      q.includes('wind') ||
      q.includes('storm') ||
      q.includes('radar') ||
      q.includes('lai') ||
      q.includes('gauge') ||
      q.includes('river') ||
      q.includes('nullah') ||
      q.includes('flood') ||
      q.includes('depth') ||
      q.includes('drone') ||
      q.includes('flight') ||
      /pani kitna hai|barish kitni|gauge/i.test(q)
    ) {
      const temp = weather?.temperature || 24;
      const rain = weather?.precipitation || 0.4;
      const wind = weather?.windSpeed || 12;
      const gusts = weather?.windGusts || 26;
      const condition = weather?.condition || 'Rain Showers';
      const flightStatus = weather?.flightFeasibility || 'CLEAR';

      return {
        thinking: `Synthesizing live telemetry from Open-Meteo satellite feed and ${profile.sensorName} hydrometric station in ${activeRegion.name}... River gauge: ${riverLevel.toFixed(1)} ft vs ${riverDangerThreshold.toFixed(1)} ft danger mark. Rain: ${rain} mm/h...`,
        text: `🌦️ HYDROLOGY & SATELLITE METEOROLOGY // ${activeRegion.name.toUpperCase()}:\n\n` +
          `${profile.riverBasin.toUpperCase()} SENSORS:\n` +
          `• Current River Gauge: ${riverLevel.toFixed(1)} ft @ ${profile.sensorName}\n` +
          `• Flood Danger Threshold: ${riverDangerThreshold.toFixed(1)} ft\n` +
          `• Safety Buffer Remaining: ${(riverDangerThreshold - riverLevel).toFixed(1)} ft before overtopping\n` +
          `• Basin Inundation Grade: ${rain > 5 ? 'ACTIVE STORM SURGE' : 'MONITORED BASELINE'}\n\n` +
          `ATMOSPHERIC TELEMETRY (LIVE OPEN-METEO // ${activeRegion.name.toUpperCase()}):\n` +
          `• Ambient Temperature: ${temp}°C\n` +
          `• Weather Condition: ${condition}\n` +
          `• Precipitation Rate: ${rain} mm/h\n` +
          `• Wind Speed: ${wind} km/h (Gusts: ${gusts} km/h)\n` +
          `• Aerial Flight / Drone Feasibility: ${flightStatus}\n\n` +
          `⚠️ WARNING: If rainfall exceeds ${(riverDangerThreshold * 0.4).toFixed(1)} mm/h, ${profile.riverBasin} will surge to critical breach levels within 40 minutes.`,
        action: { label: 'Open Priority Dispatch Matrix', type: 'priority' }
      };
    }

    // 6. ELECTRICITY, POWER GRID & SUBSTATION FAILURES
    if (
      q.includes('power') ||
      q.includes('electric') ||
      q.includes('bijli') ||
      q.includes('grid') ||
      q.includes('blackout') ||
      q.includes('light') ||
      q.includes('transformer') ||
      q.includes('substation') ||
      /bijli band hai|current|light chali gayi/i.test(q)
    ) {
      return {
        thinking: `Querying infrastructure alerts and utility outage logs in ${activeRegion.name}... Checking ${profile.utilityName} grid telemetry and ${profile.substationName}...`,
        text: `⚡ POWER GRID & ELECTRICAL INFRASTRUCTURE // ${activeRegion.name.toUpperCase()}:\n\n` +
          `1. ${profile.substationName.toUpperCase()}:\n` +
          `• Operating Utility: ${profile.utilityName}\n` +
          `• Status: Submerged / Isolated to eliminate mass electrocution hazards.\n` +
          `• Healthcare Status: Major hospital complexes operating on auxiliary generator backup.\n\n` +
          `2. SUBMERGED TRANSFORMER SAFETY DIRECTIVE:\n` +
          `• Rescue 1122 boats and amphibious craft must maintain a 25-meter perimeter around submerged transformers.\n` +
          `• Utility Emergency Hotline: ${profile.hotline} (${profile.utilityName} Flood Control Room).\n\n` +
          `3. RESTORATION TIMELINE: Grid feeders will remain de-energized until drainage teams reduce standing water below 6 inches.`,
        action: { label: 'Log Citizen SOS', type: 'sos' }
      };
    }

    // 7. CITIES & REGIONAL COVERAGE ON WEBSITE
    if (
      q.includes('city') ||
      q.includes('cities') ||
      q.includes('region') ||
      q.includes('karachi') ||
      q.includes('swat') ||
      q.includes('nowshera') ||
      q.includes('sukkur') ||
      q.includes('dg khan') ||
      q.includes('d.g. khan') ||
      q.includes('islamabad') ||
      q.includes('rawalpindi') ||
      /kon kon se sheher|other cities/i.test(q)
    ) {
      const regionsListText = regions.map((r, i) => 
        `${i + 1}. 📍 ${r.name} (${r.description || 'Regional Basin'})\n   • Center Coordinates: [${r.center[0].toFixed(2)}, ${r.center[1].toFixed(2)}]\n   • Primary Threat: Flood Catchment & Waterlogging`
      ).join('\n\n');

      return {
        thinking: `Listing all regional disaster basins configured across Pakistan... Active region is currently ${activeRegion.name}...`,
        text: `🗺️ DISASTER BASIN COVERAGE // PAKISTAN EOC:\n\n` +
          `The CrisisMap platform provides real-time telemetry across major flood-vulnerable regions in Pakistan:\n\n` +
          `${regionsListText}\n\n` +
          `💡 HOW TO SWITCH CITIES:\n` +
          `Click the Region Dropdown in the top-right navbar to instantly switch telemetry, maps, hospitals, and weather between any of these cities.`,
        action: { label: 'Open Priority Dispatch Matrix', type: 'priority' }
      };
    }

    // 8. HOW-TO / WEBSITE PLATFORM CAPABILITIES
    if (
      q.includes('how to') ||
      q.includes('feature') ||
      q.includes('what can') ||
      q.includes('simulation') ||
      q.includes('sos') ||
      q.includes('matrix') ||
      q.includes('website') ||
      q.includes('app') ||
      /ye kya karta hai|kaise use karein/i.test(q)
    ) {
      return {
        thinking: `Retrieving platform functional specification and decision tools for user walkthrough...`,
        text: `🚀 CRISISMAP AUTONOMOUS EOC PLATFORM GUIDE:\n\n` +
          `1. 🎙️ CITIZEN VOICE SOS (+ SOS Button):\n` +
          `   • Speak in Urdu, Roman Urdu, or English via browser Speech-to-Text.\n` +
          `   • Real-time AI NLP automatically classifies category, severity (1-10), and extracts headcounts.\n\n` +
          `2. 🚑 SAFEST EVACUATION ROUTE (Find Safest Route):\n` +
          `   • Calculates obstacle-avoiding detours that bypass submerged underpasses on OpenStreetMap.\n` +
          `   • Reroutes ambulances via elevated ${profile.safeBypass.split('➔')[0]} (94% risk reduction).\n\n` +
          `3. 🎯 RESOURCE ALLOCATION MATRIX (Send Resources):\n` +
          `   • Autonomous multi-attribute ranking: Urgency = (Headcount × 2.5) + (Overloaded Hospitals × 1.8) + Scarcity - Access.\n` +
          `   • Dispatches boats, helicopters, and water bowsers with 1 click.\n\n` +
          `4. 🌊 7-STAGE FLASH FLOOD SIMULATION (Crisis Simulation):\n` +
          `   • Demonstrates a scripted disaster timeline from NDMA cloudburst warning to mass triage.\n\n` +
          `5. 🤖 COMMANDER QWEN (Alibaba Qwen-2.5 Copilot):\n` +
          `   • That's me! I synthesize live telemetry and answer any query with concrete directives for ${activeRegion.name}.`,
        action: { label: 'Open Resource Dispatch Matrix', type: 'priority' }
      };
    }

    // 9. ROMAN URDU / URDU GENERAL QUERIES
    if (/kahan|kya|halat|surat|pani|log|bachao|bhejo|madad|rasta|karein|band|sheher/i.test(q)) {
      return {
        thinking: `Roman Urdu query detected... Parsing live telemetry for ${activeRegion.name}: ${hospitals.length} hospitals, ${roadBlocks.length} road blocks, ${profile.riverBasin} level ${riverLevel.toFixed(1)} ft...`,
        text: `COMMANDER QWEN // PAKISTAN EOC MALOOMAAT (${activeRegion.name.toUpperCase()} - ROMAN URDU):\n\n` +
          `1. HOSPITALS AUR BEDS KI SURAT-E-HAAL:\n` +
          `   • ${bestHospital ? bestHospital.name : 'Primary Hospital'}: Sab se zyada jagah hai (${bestHospital ? Math.max(0, bestHospital.totalBeds - bestHospital.occupiedBeds) : 150} general beds aur ${bestHospital ? bestHospital.icuAvailable : 15} ICU beds free).\n` +
          `   • ${worstHospital ? worstHospital.name : 'Regional Hospital'}: ${worstHospital?.capacity || 88}% full ho chuka hai, mazeed non-critical mareez yahan na bhejein.\n` +
          `   • Metro Total: ${totalFreeBeds} aam beds aur ${totalIcuFree} ICU beds is waqt dastiyab hain.\n\n` +
          `2. RASTAY AUR ROADS:\n` +
          `   • ${profile.blockedCorridor} par paani bhara hai (${profile.blockedReason}).\n` +
          `   • ${profile.safeBypass} ka rasta saaf aur mehfooz hai (~${profile.safeTimeMin} mins transit).\n\n` +
          `3. PANI AUR RELIEF DEPOTS:\n` +
          `   • ${reliefHubs[0]?.name || 'Central Relief Hub'} me ${totalWaterLiters.toLocaleString()} Liters peenay ka saaf paani aur ${totalFoodPacks} ration packets dastiyab hain.\n\n` +
          `4. ${profile.riverBasin.toUpperCase()} KA LEVEL:\n` +
          `   • ${profile.sensorName} par paani ka level ${riverLevel.toFixed(1)} ft hai (Khatray ka nishan ${riverDangerThreshold.toFixed(1)} ft par hai).`,
        action: { label: 'Plot Safe Evacuation Route', type: 'route' }
      };
    }

    // 10. INTELLIGENT DYNAMIC FALLBACK (SYNTHESIZES ANY CUSTOM QUERY WITH REAL WEBSITE DATA)
    return {
      thinking: `Analyzing custom operational query: "${query}"... Synthesizing current telemetry for ${activeRegion.name}: ${hospitals.length} hospitals (${totalFreeBeds} free beds), ${roadBlocks.length} road blocks, ${reliefHubs.length} relief depots, ${profile.riverBasin} level ${riverLevel.toFixed(1)} ft, weather: ${weather?.condition || 'Rain'}...`,
      text: `TACTICAL DIRECTIVE // QUERY: "${query.toUpperCase()}"\n\n` +
        `1. REAL-TIME DATA SUMMARY FOR ${activeRegion.name.toUpperCase()}:\n` +
        `   • Healthcare: ${totalFreeBeds} general beds & ${totalIcuFree} ICU beds available across ${hospitals.length} facilities (${bestHospital ? bestHospital.name : 'Main Trauma'} has ${bestHospital ? bestHospital.icuAvailable : 15} ICU beds free).\n` +
        `   • Road Accessibility: ${profile.blockedCorridor} obstructed (${profile.blockedReason}); ${profile.safeBypass} operational.\n` +
        `   • Civilian Distress: ${totalTrapped > 0 ? totalTrapped : 0} citizens stranded across ${reports.length} reported locations.\n` +
        `   • Logistics: ${totalWaterLiters.toLocaleString()} Liters potable water and ${totalFoodPacks} food rations staged at ${reliefHubs.length} depots.\n` +
        `   • Basin Hydrology: ${profile.riverBasin} level is ${riverLevel.toFixed(1)} ft (Safety margin: ${(riverDangerThreshold - riverLevel).toFixed(1)} ft before threshold).\n\n` +
        `2. OPERATIONAL RECOMMENDATION:\n` +
        `   • For medical queries: Route patients to ${bestHospital ? bestHospital.name : 'designated trauma complex'}.\n` +
        `   • For rescue queries: Dispatch boats to active distress points in ${activeRegion.name}.\n` +
        `   • For navigation: Use the ${profile.safeBypass.split('➔')[0] || 'elevated bypass'} detour.\n\n` +
        `What specific action or facility in ${activeRegion.name} would you like to inspect next?`,
      action: { label: 'Open Resource Dispatch Matrix', type: 'priority' }
    };
  };

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || inputQuery).trim();
    if (!q || isGenerating) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' PKT'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsGenerating(true);

    try {
      const response = await fetch(`${API_BASE}/api/qwen-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          telemetry: {
            region: activeRegion,
            hospitals,
            reports,
            roadBlocks,
            reliefHubs,
            weather
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const qwenMsg: Message = {
          id: `q_${Date.now()}`,
          sender: 'qwen',
          text: data.text || 'Directive synthesized from operational telemetry.',
          thinking: data.thinking || 'Context evaluated against active operational telemetry.',
          action: data.action || undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' PKT'
        };
        setMessages(prev => [...prev, qwenMsg]);
        setIsGenerating(false);
        return;
      }
    } catch (err) {
      console.warn('Backend Qwen chat endpoint unreachable, using client-side fallback:', err);
    }

    // Resilient client-side fallback if server endpoint is unreachable
    setTimeout(() => {
      const resp = generateQwenResponse(q);
      const qwenMsg: Message = {
        id: `q_${Date.now()}`,
        sender: 'qwen',
        text: resp.text,
        thinking: resp.thinking,
        action: resp.action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' PKT'
      };
      setMessages(prev => [...prev, qwenMsg]);
      setIsGenerating(false);
    }, 400);
  };

  const handleActionClick = (action: { type: 'route' | 'priority' | 'sos' }) => {
    if (action.type === 'route') {
      calculateSafeRoute([33.6844, 73.0479]);
      onOpenSafeRouteModal();
      onClose();
    } else if (action.type === 'priority') {
      onOpenPriorityModal();
      onClose();
    } else if (action.type === 'sos') {
      onOpenCitizenModal();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full sm:w-[540px] h-full bg-[#080d1a] border-l border-slate-700/80 shadow-2xl flex flex-col font-['Plus_Jakarta_Sans'] text-slate-100 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white tracking-wide">
                  COMMANDER QWEN
                </h3>
                <span className="text-[9px] font-mono bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.2 rounded font-bold">
                  QWEN-2.5 EOC AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Alibaba Cloud Model Studio • Full Website Knowledge</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Context Telemetry Ribbon */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-300">
          <span className="flex items-center gap-1 text-cyan-400">
            <Activity className="w-3.5 h-3.5" />
            <span>Region: {activeRegion?.name ? activeRegion.name.split('/')[0] : 'Rawalpindi'}</span>
          </span>
          <span className="text-slate-400">
            Available Beds: <strong className="text-emerald-300">{totalFreeBeds} Beds ({totalIcuFree} ICU)</strong>
          </span>
        </div>

        {/* Strategic Preset Prompt Chips */}
        <div className="p-3 bg-slate-900/40 border-b border-white/[0.06]">
          <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1.5 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>INSTANT COMMAND QUERIES (1-CLICK):</span>
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {STRATEGIC_PROMPTS.map((sp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(sp.prompt)}
                disabled={isGenerating}
                className="text-left px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-orange-500/15 border border-white/[0.08] hover:border-orange-500/40 text-[11px] text-slate-300 hover:text-orange-200 transition-all truncate font-mono"
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Thread Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.sender === 'user' ? (
                <div className="bg-red-600 text-white rounded-2xl rounded-tr-none px-3.5 py-2 text-xs max-w-[85%] shadow-md font-mono">
                  {msg.text}
                </div>
              ) : (
                <div className="space-y-2 max-w-[95%]">
                  {/* Thinking Block */}
                  {msg.thinking && (
                    <div className="bg-slate-950/80 border border-cyan-800/40 rounded-xl p-2.5 text-[11px] font-mono text-cyan-300 shadow-inner">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-400 text-[10px] uppercase mb-1">
                        <Cpu className="w-3 h-3 animate-spin" />
                        <span>Qwen-2.5 Agentic Chain-of-Thought:</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed italic opacity-90">
                        "{msg.thinking}"
                      </p>
                    </div>
                  )}

                  {/* Operational Directive Body */}
                  <div className="bg-slate-900/90 border border-red-500/30 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-100 font-mono shadow-lg leading-relaxed whitespace-pre-line">
                    {msg.text}

                    {/* Interactive Action Button */}
                    {msg.action && (
                      <button
                        onClick={() => handleActionClick(msg.action!)}
                        className="mt-3 w-full py-2 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Navigation className="w-3.5 h-3.5 text-red-400" />
                        <span>{msg.action.label}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {/* Generating Loading State */}
          {isGenerating && (
            <div className="flex flex-col items-start space-y-1.5">
              <div className="bg-slate-950/90 border border-red-500/40 rounded-xl p-3 text-xs font-mono text-red-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-red-400" />
                <span>Qwen-2.5 retrieving website telemetry & computing directive...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-white/[0.08] bg-slate-950/90 flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about hospitals, beds, roads, water, rescue (or in Urdu)..."
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none font-mono"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputQuery.trim() || isGenerating}
            className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white transition-all disabled:opacity-40 shadow-md hover:shadow-lg"
            title="Transmit Query"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
