// src/types.ts
// Complete data models for CrisisMap application.
// All optional UI-specific fields are included to match actual component usage.

export type ReportCategory =
  | 'RESCUE_NEEDED'
  | 'ROAD_BLOCKED'
  | 'HOSPITAL_CAPACITY'
  | 'WATER_SHORTAGE'
  | 'POWER_OUTAGE'
  | 'OTHER';

export interface EmergencyReport {
  id: string;
  category: ReportCategory;
  severity: number;
  rawText: string;
  locationName: string;
  coords: [number, number];
  type?: string;
  title?: string;
  description?: string;
  location?: string;
  source?: string;
  lat?: number;
  lon?: number;
  headcount?: number;
  needs?: string[];
  languageDetected?: string;
  // Optional UI / runtime fields
  timestamp?: string;
  status?: string;
  confidence?: number;
  dispatched?: boolean;
  citizenName?: string;
  isLiveGps?: boolean;
  accuracyMeters?: number;
  [key: string]: any;
}

export interface Hospital {
  id: string;
  name: string;
  location: string;
  coords: [number, number];
  totalBeds: number;
  occupiedBeds: number;
  capacity: number;
  icuAvailable: number;
  bloodBankUnits?: number;
  powerBackup: string;
  status: 'NORMAL' | 'OVERLOADED' | 'WARNING';
  acceptingEmergencies: boolean;
  phone: string;
  [key: string]: any;
}

export interface HazardZone {
  id: string;
  type: string;
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  waterDepthMeters?: number;
  status: string;
  polygon: [number, number][];
  description?: string;
  [key: string]: any;
}

export interface RoadBlock {
  id: string;
  coords: [number, number];
  description?: string;
  roadName?: string;
  reason?: string;
  detourRecommended?: string;
  [key: string]: any;
}

export interface ReliefHub {
  id: string;
  name: string;
  coords: [number, number];
  waterAvailable?: boolean;
  type?: string;
  status?: string;
  managedBy?: string;
  drinkingWaterLiters?: number;
  foodPackets?: number;
  rescueBoats?: number;
  [key: string]: any;
}

// DispatchRecommendation used inside PriorityZone.recommendedDispatch
export interface DispatchRecommendation {
  boats?: number;
  helicopters?: number;
  waterBowsersLiters?: number;
  medicalTeams?: number;
  emergencyRations?: number;
  [key: string]: any;
}

export interface PriorityZone {
  id: string;
  // These fields exist in legacy data as the *Count variant; make all optional
  name?: string;
  affectedPeople?: number;
  hospitalsOverloaded?: number;
  waterReported?: boolean;
  roadAccessibility?: string;
  // Optional UI / ranking fields
  rank?: number;
  zoneName?: string;
  subDistricts?: string[];
  centerCoords?: [number, number];
  affectedPeopleCount?: number;
  overloadedHospitalsCount?: number;
  waterShortageReported?: boolean;
  powerOutageReported?: boolean;
  accessibilityScore?: number;
  urgencyScore?: number;
  riskLevel?: string;
  recommendedDispatch?: DispatchRecommendation;
  status?: string;
  keySummary?: string;
  actionPlan?: string[];
  [key: string]: any;
}

// Named location used in SafestRoute origin/destination
export interface RouteLocation {
  name: string;
  coords: [number, number];
  capacity?: number;
  status?: string;
  icuAvailable?: number;
  [key: string]: any;
}

// A step in the turn-by-turn navigation
export interface RouteStep {
  instruction: string;
  distanceKm: string;
  status: string;
  safetyStatus?: string;
  [key: string]: any;
}

// A detected hazard along a route
export interface DetectedHazard {
  type: string;
  name: string;
  coords: [number, number];
  hazardLevel?: string;
  risk?: string;
  [key: string]: any;
}

export interface SafestRoute {
  id?: string;
  // Origin and destination are objects with a name + coords
  origin: RouteLocation;
  destination: RouteLocation;
  // Path arrays (arrays of coordinate pairs)
  directPath?: [number, number][];
  safePath?: [number, number][];
  waypoints?: [number, number][];
  // Distance / time metrics
  distanceMeters?: number;
  durationSeconds?: number;
  directDistanceKm?: number;
  safeDistanceKm?: number;
  estimatedTimeMin?: number;
  riskReductionPercent?: number;
  // Detail arrays
  steps?: RouteStep[];
  detectedHazards?: DetectedHazard[];
  routeClearedTimestamp?: string;
  [key: string]: any;
}

export interface DispatchedUnit {
  id: string;
  targetZone: string;
  unitName: string;
  type: string;
  status: string;
  dispatchedAt: string;
  etaMin: number;
  [key: string]: any;
}

export interface SystemAlert {
  active: boolean;
  title: string;
  severity: string;
  summary: string;
  timestamp: string;
  [key: string]: any;
}

export interface Region {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  status: string;
  riverBasin?: string;
  sensorName?: string;
  dangerLimitFeet?: number;
  [key: string]: any;
}

export interface LayerState {
  floods: boolean;
  hospitals: boolean;
  roadBlocks: boolean;
  reliefHubs: boolean;
  sosPins: boolean;
  safeRouteOverlay: boolean;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  condition?: string;
  isDay?: boolean;
  windSpeed: number;
  windGusts: number;
  time: string;
  isHeavyRain?: boolean;
  isHighWind?: boolean;
  flightFeasibility?: 'CLEAR' | 'CAUTION' | 'RESTRICTED';
  floodRiskLevel?: 'LOW' | 'MODERATE' | 'HIGH';
  riverDischargeM3s?: number;
  [key: string]: any;
}

export interface RadarData {
  tileUrl: string;
  frameTimestamp: number;
  fetchedAt: string;
}

export type AnyObject = Record<string, any>;

export type AppRole = 'citizen' | 'commander';

export interface CommanderSession {
  isAuthenticated: boolean;
  officerName?: string;
  rank?: string;
  token?: string;
}
