import { WeatherData, PestDiseaseResult, YieldPrediction, BackendConfig } from "@/types/farm";
import { offlineStorage, isOnline, getCacheAge } from "./offline";
import { showWeatherAlert } from "./notifications";

// Get backend config from localStorage
const getBackendConfig = (): BackendConfig => {
  const config = localStorage.getItem('backendConfig');
  return config ? JSON.parse(config) : { apiUrl: '', apiKey: '' };
};

// Weather API call with offline support
export const fetchWeather = async (latitude: number, longitude: number): Promise<WeatherData & { cached?: boolean; cacheAge?: number }> => {
  const cacheKey = `${latitude}_${longitude}`;
  
  // Try to get cached data first
  const cached = await offlineStorage.get<WeatherData>('weather', cacheKey);
  
  // If offline, return cached data
  if (!isOnline()) {
    if (cached) {
      return { 
        ...cached.data, 
        cached: true, 
        cacheAge: getCacheAge(cached.timestamp) 
      };
    }
    throw new Error('No cached weather data available offline');
  }

  const config = getBackendConfig();
  
  if (!config.apiUrl) {
    // Return cached if available, even if backend not configured
    if (cached) {
      return { 
        ...cached.data, 
        cached: true, 
        cacheAge: getCacheAge(cached.timestamp) 
      };
    }
    throw new Error('Backend URL not configured. Please set it in Settings.');
  }

  try {
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

    const data = await response.json();
    
    // Cache the fresh data
    await offlineStorage.set('weather', cacheKey, data);
    
    // Check for weather alerts
    if (data.forecast && (data.forecast.toLowerCase().includes('rain') || 
        data.forecast.toLowerCase().includes('storm') || 
        data.forecast.toLowerCase().includes('frost'))) {
      showWeatherAlert(data.forecast);
    }
    
    return data;
  } catch (error) {
    // If fetch fails but we have cache, return it
    if (cached) {
      return { 
        ...cached.data, 
        cached: true, 
        cacheAge: getCacheAge(cached.timestamp) 
      };
    }
    throw error;
  }
};

// Pest/Disease detection API call with offline caching
export const analyzePestDisease = async (imageFile: File): Promise<PestDiseaseResult> => {
  if (!isOnline()) {
    throw new Error('Pest analysis requires internet connection. View previous checks in history.');
  }

  const config = getBackendConfig();
  
  if (!config.apiUrl) {
    throw new Error('Backend URL not configured. Please set it in Settings.');
  }

  const formData = new FormData();
  formData.append('image', imageFile);

  try {
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

    const result = await response.json();
    
    // Cache the result for offline viewing
    await offlineStorage.add('pestChecks', {
      ...result,
      imageName: imageFile.name,
      date: new Date().toISOString(),
    });
    
    return result;
  } catch (error) {
    // Queue for retry when online
    await offlineStorage.add('failedRequests', {
      type: 'pest-analysis',
      data: { fileName: imageFile.name },
      timestamp: Date.now(),
    });
    throw error;
  }
};

// Get pest check history
export const getPestCheckHistory = async (): Promise<any[]> => {
  const history = await offlineStorage.getAll('pestChecks');
  return history.map(item => item.data).reverse();
};

// Yield prediction API call with offline caching
export const predictYield = async (data: {
  currentDay: number;
  weatherConditions: any;
  pestStatus: string;
}): Promise<YieldPrediction> => {
  if (!isOnline()) {
    // Try to get latest cached prediction
    const history = await offlineStorage.getAll('yieldPredictions');
    if (history.length > 0) {
      const latest = history[history.length - 1];
      return { ...(latest.data as YieldPrediction), cached: true } as YieldPrediction;
    }
    throw new Error('No cached yield predictions available offline');
  }

  const config = getBackendConfig();
  
  if (!config.apiUrl) {
    throw new Error('Backend URL not configured. Please set it in Settings.');
  }

  try {
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

    const result = await response.json();
    
    // Cache the prediction
    await offlineStorage.add('yieldPredictions', {
      ...result,
      date: new Date().toISOString(),
      day: data.currentDay,
    });
    
    return result;
  } catch (error) {
    // Try to return cached if available
    const history = await offlineStorage.getAll('yieldPredictions');
    if (history.length > 0) {
      const latest = history[history.length - 1];
      return { ...(latest.data as YieldPrediction), cached: true } as YieldPrediction;
    }
    throw error;
  }
};

// Get yield prediction history
export const getYieldHistory = async (): Promise<any[]> => {
  const history = await offlineStorage.getAll('yieldPredictions');
  return history.map(item => item.data).reverse();
};
