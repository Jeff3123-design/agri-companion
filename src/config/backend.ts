/**
 * Backend Configuration
 * 
 * Add your Python backend credentials here:
 * 
 * Expected endpoints:
 * - POST /weather (body: { latitude, longitude })
 * - POST /pest-disease/analyze (body: FormData with image file)
 * - POST /yield/predict (body: GatheredData object)
 */

export const backendConfig = {
  apiUrl: "http://localhost:8000", // Change this to your actual backend URL (use localhost for dev, or ngrok URL for testing)
  apiKey: "0ee907c39b7944f7b15135759250412", // Your API key
};