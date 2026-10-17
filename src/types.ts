export interface HistoricalEra {
  id: string;
  name: string;
  yearDisplay: string;
  period: string;
  location: string;
  description: string;
  greeting: string;
  trivia: string;
  imageSrc: string;
  fallbackGradient: string;
  defaultFaceConfig: {
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    scale: number; // 0.5 - 2.0
    rotation: number; // degrees -45 to 45
    feather: number; // 5 - 50 px
    warmth: number; // -50 to 50
    brightness: number; // 0.5 - 1.5
    contrast: number; // 0.5 - 1.5
    blendMode: GlobalCompositeOperation;
  };
  filterPreset: 'sepia' | 'chiaroscuro' | 'tintype' | 'kodachrome' | 'polaroid' | 'cyberpunk' | 'antique-oil';
  accessoryOptions?: {
    id: string;
    label: string;
    svgIcon: string;
  }[];
}

export interface BlendingSettings {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  feather: number;
  opacity: number;
  warmth: number;
  brightness: number;
  contrast: number;
  sepia: number;
  grain: number;
  blendMode: GlobalCompositeOperation;
  activeAccessory?: string;
}

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
  eraId?: string;
}

export interface FaceAnalysisData {
  faceDetected: boolean;
  expression: string;
  lightingAngle: string;
  faceShape: string;
  historicalArchetype: string;
  recommendedEras: string[];
  historicalBackstory: string;
  costumeDetails: string;
  vintagePaletteRecommendation: string;
}

export type ActiveTab = 'booth' | 'studio' | 'strip' | 'game';
