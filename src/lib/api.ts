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

// Fetch 7-day weather forecast with GDU estimates
export interface ForecastData {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  condition: string;
  estimatedGDU: number;
}

export const fetch7DayForecast = async (
  latitude: number,
  longitude: number
): Promise<ForecastData[]> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`
    );

    if (!response.ok) throw new Error("Failed to fetch forecast");

    const data = await response.json();
    const days: ForecastData[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(data.daily.time[i]);
      const tempMax = data.daily.temperature_2m_max[i];
      const tempMin = data.daily.temperature_2m_min[i];
      
      // Calculate GDU using standard formula
      const cappedMax = Math.min(tempMax, 30);
      const cappedMin = Math.max(tempMin, 10);
      const avgTemp = (cappedMax + cappedMin) / 2;
      const gdu = Math.max(0, avgTemp - 10);

      days.push({
        date: data.daily.time[i],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        tempMax: Math.round(tempMax),
        tempMin: Math.round(tempMin),
        weatherCode: data.daily.weather_code[i],
        condition: getWeatherCondition(data.daily.weather_code[i]),
        estimatedGDU: Math.round(gdu * 10) / 10,
      });
    }

    return days;
  } catch (error) {
    console.error("Forecast error:", error);
    return [];
  }
};

// Fetch daily min/max temperatures for GDU calculation
export interface DailyTemperatureData {
  date: string;
  tempMax: number;
  tempMin: number;
}

// Fetch historical temperatures using Open-Meteo Archive API
export const fetchHistoricalTemperatures = async (
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<DailyTemperatureData[]> => {
  try {
    const response = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${startDate}&end_date=${endDate}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch historical temperature data');
    }

    const apiData = await response.json();
    
    const results: DailyTemperatureData[] = [];
    const dates = apiData.daily?.time || [];
    const maxTemps = apiData.daily?.temperature_2m_max || [];
    const minTemps = apiData.daily?.temperature_2m_min || [];

    for (let i = 0; i < dates.length; i++) {
      if (maxTemps[i] !== null && minTemps[i] !== null) {
        results.push({
          date: dates[i],
          tempMax: maxTemps[i],
          tempMin: minTemps[i],
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching historical temperatures:', error);
    return [];
  }
};

// Fetch forecast temperatures (for future days)
export const fetchDailyTemperatures = async (
  latitude: number, 
  longitude: number, 
  startDate: string, 
  endDate: string
): Promise<DailyTemperatureData[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  // If requesting historical data (before today), use archive API
  if (startDate < today) {
    const historicalEnd = endDate < today ? endDate : today;
    const historicalData = await fetchHistoricalTemperatures(latitude, longitude, startDate, historicalEnd);
    
    // If also need future data, fetch from forecast
    if (endDate >= today) {
      const forecastData = await fetchForecastTemperatures(latitude, longitude, today, endDate);
      return [...historicalData, ...forecastData.filter(d => d.date > historicalEnd)];
    }
    
    return historicalData;
  }
  
  // Future dates - use forecast API
  return fetchForecastTemperatures(latitude, longitude, startDate, endDate);
};

// Fetch forecast temperatures
const fetchForecastTemperatures = async (
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
      if (maxTemps[i] !== null && minTemps[i] !== null) {
        results.push({
          date: dates[i],
          tempMax: maxTemps[i],
          tempMin: minTemps[i],
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching forecast temperatures:', error);
    return [];
  }
};

// Fetch today's min/max temperature for GDU - uses forecast for today's expected temps
export const fetchTodayTemperature = async (
  latitude: number, 
  longitude: number
): Promise<DailyTemperatureData | null> => {
  try {
    // Use forecast API for today - gives today's expected max/min
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch today temperature');
    }

    const apiData = await response.json();
    
    if (apiData.daily?.time?.[0]) {
      return {
        date: apiData.daily.time[0],
        tempMax: apiData.daily.temperature_2m_max[0],
        tempMin: apiData.daily.temperature_2m_min[0],
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching today temperature:', error);
    return null;
  }
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
        'ngrok-skip-browser-warning': 'true',
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
        'ngrok-skip-browser-warning': 'true',
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
