import { WeatherData, PestDiseaseResult, YieldPrediction, BackendConfig } from "@/types/farm";

// Get backend config from localStorage
const getBackendConfig = (): BackendConfig => {
  const config = localStorage.getItem('backendConfig');
  return config ? JSON.parse(config) : { apiUrl: '', apiKey: '' };
};

// Weather API call
export const fetchWeather = async (latitude: number, longitude: number): Promise<WeatherData> => {
  const config = getBackendConfig();
  
  if (!config.apiUrl) {
    throw new Error('Backend URL not configured. Please set it in Settings.');
  }

  const response = await fetch(`${config.apiUrl}/weather`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({ latitude, longitude })
  });

  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }

  return response.json();
};

// Pest/Disease detection API call
export const analyzePestDisease = async (imageFile: File): Promise<PestDiseaseResult> => {
  const config = getBackendConfig();
  
  if (!config.apiUrl) {
    throw new Error('Backend URL not configured. Please set it in Settings.');
  }

  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch(`${config.apiUrl}/pest-disease/analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to analyze pest/disease');
  }

  return response.json();
};

// Yield prediction API call
export const predictYield = async (data: {
  currentDay: number;
  weatherConditions: any;
  pestStatus: string;
}): Promise<YieldPrediction> => {
  const config = getBackendConfig();
  
  if (!config.apiUrl) {
    throw new Error('Backend URL not configured. Please set it in Settings.');
  }

  const response = await fetch(`${config.apiUrl}/yield/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to predict yield');
  }

  return response.json();
};
