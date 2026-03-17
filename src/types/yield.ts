// src/types/yield.ts


export interface FarmInfo {
  farmSize: string;
  farmLocation: string;
  maizeVariety: string;
  soilPH?: string; // Add this - optional but recommended
}
export interface SessionData {
  currentDay: number;
  accumulatedGdu: number;
  currentStage: string;
  plantingDate: string | null;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
  location?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface ForecastDay {
  date: string;
  condition: string;
  tempMax: number;
  tempMin: number;
}

export interface RainfallData {
  recentRainfall: string;
  forecast7Day: ForecastDay[];
}

export interface PestData {
  overallStatus: string;
  fawPresence: string;
  recentChecks: number;
}

export interface CropHealthProxy {
  ndviEstimate: string;
  healthScore: number;
  basedOn: string;
}

export interface GatheredData {
  farmInfo: FarmInfo;
  sessionData: SessionData;
  weatherData: WeatherData;
  rainfallData: RainfallData;
  pestData: PestData;
  cropHealthProxy: CropHealthProxy;
  collectedAt: string;
}

export interface Factor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  score: number;
  value?: string;
}

export interface YieldPredictionResponse {
  success: boolean;
  estimatedYield: number;
  yieldRange: {
    min: number;
    max: number;
  };
  confidence: number;
  factors: Factor[];
  recommendations: string[];
  county_known: boolean;
  model_used: string;
}

export interface ModelInfo {
  model_name: string;
  performance: {
    r2_score: number;
    rmse: number;
    mae: number;
    mape: number;
  };
  features_used: number;
  feature_list: string[];
  training_date: string;
  n_samples: number;
  n_features: number;
}

export interface GatheringStep {
  label: string;
  icon: React.ElementType;
  status: 'pending' | 'loading' | 'done';
}

export interface HealthCheckResponse {
  status: string;
  model_loaded: boolean;
  model_name: string;
  model_accuracy: {
    r2_score: number;
    rmse: number;
  };
  server_time: string;
  uptime: string;
}