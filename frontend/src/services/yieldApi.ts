// src/services/yieldApi.ts
import { backendConfig } from "@/config/backend";
import { GatheredData, YieldPredictionResponse, ModelInfo, HealthCheckResponse } from "@/types/yield";

const API_URL = backendConfig.apiUrl;
const API_KEY = backendConfig.apiKey;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
});

export const predictYield = async (data: GatheredData): Promise<YieldPredictionResponse> => {
  try {
    console.log('Sending data to backend:', JSON.stringify(data, null, 2));
    
    const response = await fetch(`${API_URL}/yield/predict`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Backend error response:', responseData);
      throw new Error(responseData.detail || `HTTP error! status: ${response.status}`);
    }

    console.log('Prediction received:', responseData);
    return responseData;
  } catch (error) {
    console.error('Prediction API error:', error);
    throw error;
  }
};

export const testConnection = async (): Promise<{ connected: boolean; data?: HealthCheckResponse; error?: string }> => {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      return { 
        connected: false, 
        error: `HTTP error! status: ${response.status}` 
      };
    }
    
    const data = await response.json();
    return { 
      connected: true, 
      data 
    };
  } catch (error: any) {
    console.error('Backend connection failed:', error);
    return { 
      connected: false, 
      error: error.message || 'Could not connect to backend' 
    };
  }
};

export const getModelInfo = async (): Promise<ModelInfo> => {
  const response = await fetch(`${API_URL}/model/info`, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get model info: ${response.status}`);
  }
  
  return response.json();
};

export const getCounties = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_URL}/counties`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      return ["Kisii", "Uasin Gishu", "Trans Nzoia", "Nakuru", "Bungoma"];
    }
    
    const data = await response.json();
    return data.counties || [];
  } catch (error) {
    console.error('Failed to fetch counties:', error);
    return ["Kisii", "Uasin Gishu", "Trans Nzoia", "Nakuru", "Bungoma"];
  }
};

export const testEndpoint = async (endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) => {
  try {
    const options: RequestInit = {
      method,
      headers: getHeaders(),
    };
    
    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
};