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
  apiUrl: "https://e253-102-0-11-44.ngrok-free.app", // ngrok tunnel to local backend
  apiKey: "0ee907c39b7944f7b15135759250412", // Add your API key here (optional)
};
