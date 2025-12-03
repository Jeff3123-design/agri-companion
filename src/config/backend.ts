/**
 * Backend Configuration
 * 
 * Add your Python backend credentials here:
 * 
 * Expected endpoints:
 * - POST /weather (body: { latitude, longitude })
 * - POST /pest-disease/analyze (body: FormData with image file)
 * - POST /yield/predict (body: { currentDay, weatherConditions, pestStatus })
 */

export const backendConfig = {
  apiUrl: "http://0.0.0.0:8000", // Add your backend API URL here
  apiKey: "", // Add your API key here (optional)
};
