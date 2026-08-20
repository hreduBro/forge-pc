export type PCCategory =
  | 'case'
  | 'cpu'
  | 'motherboard'
  | 'gpu'
  | 'cooler'
  | 'ram'
  | 'storage'
  | 'psu'
  | 'fans'
  | 'cables';

export type FormFactor = 'ATX' | 'Micro-ATX' | 'Mini-ITX' | 'E-ATX';
export type SocketType = 'AM5' | 'AM4' | 'LGA1700' | 'LGA1851';
export type RAMType = 'DDR5' | 'DDR4';
export type CoolerType = 'AIO-360' | 'AIO-240' | 'AIO-280' | 'AIR-DUAL' | 'AIR-SINGLE' | 'AIR-LOWPROFILE';
export type ColorTheme = 'black' | 'white' | 'silver' | 'wood' | 'stealth';

export interface PCPart {
  id: string;
  category: PCCategory;
  name: string;
  brand: string;
  model: string;
  price: number;
  image?: string;
  color: ColorTheme;
  specs: Record<string, string | number | boolean>;
  tags: string[];
  description: string;
  
  // Specific technical attributes for validation & 3D rendering
  dimensions?: {
    length?: number; // mm
    width?: number;  // mm
    height?: number; // mm
  };
  
  // Electrical & Thermal
  tdp?: number; // Watts
  wattage?: number; // Watts (for PSU)
  socket?: SocketType;
  formFactor?: FormFactor;
  ramType?: RAMType;
  coolerType?: CoolerType;
  
  // 3D rendering flags & styles
  visuals: {
    primaryColor: string;
    secondaryColor?: string;
    accentColor?: string;
    hasRGB: boolean;
    rgbZones?: string[];
    transparency?: number;
    roughness?: number;
    metalness?: number;
    fanCount?: number;
    lcdScreen?: boolean;
    woodFinish?: boolean;
  };
}

export interface PCBuild {
  case: PCPart | null;
  cpu: PCPart | null;
  motherboard: PCPart | null;
  gpu: PCPart | null;
  cooler: PCPart | null;
  ram: PCPart | null;
  storage: PCPart | null;
  psu: PCPart | null;
  fans: PCPart | null;
  cables: PCPart | null;
}

export interface CompatibilityCheckResult {
  isCompatible: boolean;
  issues: CompatibilityIssue[];
  warnings: CompatibilityIssue[];
  estimatedWattage: number;
  isComplete: boolean;
  missingRequired: PCCategory[];
}

export interface CompatibilityIssue {
  type: 'socket' | 'form_factor' | 'ram_type' | 'wattage' | 'clearance' | 'cooler_capacity' | 'missing_part';
  severity: 'error' | 'warning';
  title: string;
  message: string;
  affectedCategories: PCCategory[];
}

export type RGBMode = 'static' | 'rainbow' | 'breathing' | 'pulse' | 'synthwave' | 'aurora' | 'off';

export interface StudioSettings {
  isPoweredOn: boolean;
  explodedProgress: number; // 0 to 1
  glassPanelOpen: boolean;
  viewMode: 'normal' | 'exploded' | 'xray' | 'thermals' | 'wireframe';
  fanSpeed: number; // 0 to 100%
  environmentLighting: 'studio_dark' | 'studio_clean' | 'cyberpunk_neon' | 'warm_amber';
  rgb: {
    enabled: boolean;
    mode: RGBMode;
    color1: string;
    color2: string;
    speed: number;
    brightness: number;
  };
  gpuVertical: boolean;
  showCableManagement: boolean;
  selectedComponent: PCCategory | null;
}

export interface BuildPreset {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  description: string;
  targetResolution: '4K Ultra' | '1440p High FPS' | '1080p Esports' | 'Quiet Workstation';
  estimatedFps: {
    cyberpunk: number;
    blackMyth: number;
    callOfDuty: number;
    valorant: number;
  };
  parts: Partial<Record<PCCategory, string>>; // Part IDs
}
