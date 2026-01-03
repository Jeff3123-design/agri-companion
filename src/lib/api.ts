import { WeatherData, PestDiseaseResult, YieldPrediction } from "@/types/farm";
import { offlineStorage, isOnline, getCacheAge } from "./offline";
import { showWeatherAlert } from "./notifications";
import { backendConfig } from "@/config/backend";

// Weather code to condition mapping for Open-Meteo
const getWeatherCondition = (code: number): string => {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 49) return "Foggy";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rain";
  if (code <= 79) return "Snow";
  if (code <= 84) return "Rain showers";
  if (code <= 94) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
};

const getForecast = (code: number): string => {
  if (code === 0) return "Clear conditions expected";
  if (code <= 3) return "Partly cloudy throughout the day";
  if (code <= 49) return "Foggy conditions - monitor visibility";
  if (code <= 59) return "Light drizzle expected";
  if (code <= 69) return "Rain expected - adjust irrigation";
  if (code <= 79) return "Snow possible - protect crops";
  if (code <= 84) return "Rain showers throughout day";
  if (code <= 94) return "Snow showers expected";
  if (code >= 95) return "Thunderstorms likely - take precautions";
  return "Variable conditions";
};

// Weather API using Open-Meteo (free, no API key)
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

  try {
    // Use Open-Meteo API (free, no API key required)
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const apiData = await response.json();
    
    // Get location name using reverse geocoding
    let locationName = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
    try {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      );
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        locationName = geoData.address?.city || geoData.address?.town || geoData.address?.county || locationName;
      }
    } catch {
      // Keep default location name if geocoding fails
    }

    const weatherCode = apiData.current.weather_code;
    const data: WeatherData = {
      temperature: Math.round(apiData.current.temperature_2m),
      humidity: apiData.current.relative_humidity_2m,
      condition: getWeatherCondition(weatherCode),
      forecast: getForecast(weatherCode),
      location: locationName,
    };
    
    // Cache the fresh data
    await offlineStorage.set('weather', cacheKey, data);
    
    // Check for weather alerts
    if (weatherCode >= 61 || weatherCode >= 95) {
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

// Fetch daily min/max temperatures for GDU calculation
export interface DailyTemperatureData {
  date: string;
  tempMax: number;
  tempMin: number;
}

export const fetchDailyTemperatures = async (
  latitude: number, 
  longitude: number, 
  startDate: string, 
  endDate: string
): Promise<DailyTemperatureData[]> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${startDate}&end_date=${endDate}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch temperature data');
    }

    const apiData = await response.json();
    
    const results: DailyTemperatureData[] = [];
    const dates = apiData.daily?.time || [];
    const maxTemps = apiData.daily?.temperature_2m_max || [];
    const minTemps = apiData.daily?.temperature_2m_min || [];

    for (let i = 0; i < dates.length; i++) {
      results.push({
        date: dates[i],
        tempMax: maxTemps[i],
        tempMin: minTemps[i],
      });
    }

    return results;
  } catch (error) {
    console.error('Error fetching daily temperatures:', error);
    return [];
  }
};

// Fetch today's min/max temperature for GDU
export const fetchTodayTemperature = async (
  latitude: number, 
  longitude: number
): Promise<DailyTemperatureData | null> => {
  const today = new Date().toISOString().split('T')[0];
  const temps = await fetchDailyTemperatures(latitude, longitude, today, today);
  return temps[0] || null;
};

// Pest/Disease detection API call with offline caching
export const analyzePestDisease = async (imageFile: File): Promise<PestDiseaseResult> => {
  if (!isOnline()) {
    throw new Error('Pest analysis requires internet connection. View previous checks in history.');
  }

  if (!backendConfig.apiUrl) {
    throw new Error('Backend URL not configured. Add credentials to src/config/backend.ts');
  }

  const formData = new FormData();
  formData.append('image', imageFile);

  try {
    const response = await fetch(`${backendConfig.apiUrl}/pest-disease/analyze`, {
      method: 'POST',
      headers: {
        ...(backendConfig.apiKey && { 'Authorization': `Bearer ${backendConfig.apiKey}` })
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

  if (!backendConfig.apiUrl) {
    throw new Error('Backend URL not configured. Add credentials to src/config/backend.ts');
  }

  try {
    const response = await fetch(`${backendConfig.apiUrl}/yield/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(backendConfig.apiKey && { 'Authorization': `Bearer ${backendConfig.apiKey}` })
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
