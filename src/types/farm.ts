export interface DayTask {
  day: number;
  stage: string;
  tasks: string[];
  completed: boolean;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
  forecast: string;
  location: string;
}

export interface PestDiseaseResult {
  name: string;
  confidence: number;
  severity: string;
  solution: string;
  preventiveMeasures: string[];
}

export interface YieldPrediction {
  estimatedYield: number;
  unit: string;
  confidence: number;
  factors: {
    weather: string;
    soilHealth: string;
    pestManagement: string;
  };
  cached?: boolean;
}

export interface BackendConfig {
  apiUrl: string;
  apiKey: string;
}
