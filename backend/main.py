# main.py - SIMPLIFIED VERSION
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
import joblib
import uvicorn
from datetime import datetime
import os

app = FastAPI(title="FarmBuddy AI Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MODEL_PATH = r'C:\Users\admin\kenya_maize_yield_model.pkl'

# Load model
try:
    model_artifacts = joblib.load(MODEL_PATH)
    model = model_artifacts['model']
    scaler = model_artifacts['scaler']
    label_encoder = model_artifacts['label_encoder_county']
    feature_columns = model_artifacts['feature_columns']
    performance = model_artifacts['performance']
    print(f"✅ Model loaded: {model_artifacts['model_name']}")
    print(f"📊 Features expected: {len(feature_columns)}")
    print(f"📋 Feature list: {feature_columns}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model_artifacts = None

# Helper functions
def encode_rainfall(rainfall_text):
    rainfall_map = {
        "none": 200, "low": 400, "moderate": 700, 
        "high": 1000, "very high": 1200, "light": 300, "heavy": 1100
    }
    return rainfall_map.get(str(rainfall_text).lower(), 700)

def extract_ndvi(ndvi_text):
    ndvi_text = str(ndvi_text).lower()
    if "0.4-0.6" in ndvi_text or "moderate" in ndvi_text:
        return 0.5
    if "0.6-0.8" in ndvi_text or "high" in ndvi_text:
        return 0.7
    if "0.2-0.4" in ndvi_text or "low" in ndvi_text:
        return 0.3
    if "0.8-1.0" in ndvi_text or "very high" in ndvi_text:
        return 0.9
    return 0.5

@app.get("/")
def root():
    return {"status": "online", "message": "FarmBuddy API"}

@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": model_artifacts is not None}

@app.post("/debug/received")
async def debug_received(request: Request):
    """See exactly what's received"""
    body = await request.json()
    return {"received": body}

@app.post("/yield/predict")
async def predict_yield(request: Request):
    """
    Predict maize yield - SIMPLIFIED VERSION
    """
    try:
        # Get raw JSON
        data = await request.json()
        print("="*60)
        print("📦 Received data structure:")
        print(f"Top level keys: {list(data.keys())}")
        
        # Extract all 17 features manually
        farm_info = data.get('farmInfo', {})
        session_data = data.get('sessionData', {})
        weather_data = data.get('weatherData', {})
        rainfall_data = data.get('rainfallData', {})
        pest_data = data.get('pestData', {})
        crop_health = data.get('cropHealthProxy', {})
        
        # 1. County
        county = str(farm_info.get('farmLocation', 'Kisii')).title()
        
        # 2. Farm Size
        farm_size = float(farm_info.get('farmSize', 2.0))
        
        # 3. Temperature
        temp = float(weather_data.get('temperature', 25))
        
        # 4. Humidity
        humidity = float(weather_data.get('humidity', 60))
        
        # 5. Rainfall (convert to mm)
        rainfall_text = rainfall_data.get('recentRainfall', 'Moderate')
        rainfall_mm = encode_rainfall(rainfall_text)
        
        # 6. Soil pH
        soil_ph = float(farm_info.get('soilPH', 6.2))
        
        # 7. NDVI
        ndvi_text = crop_health.get('ndviEstimate', 'Moderate (0.4-0.6)')
        ndvi = extract_ndvi(ndvi_text)
        
        # 8. GDU
        gdu = float(session_data.get('accumulatedGdu', 0))
        
        # 9. Soil Nitrogen (estimated)
        health_score = float(crop_health.get('healthScore', 50))
        soil_nitrogen = 0.3 + (health_score / 100) * 0.3 + ndvi * 0.3
        soil_nitrogen = min(0.6, max(0.1, soil_nitrogen))
        
        # Create base features dictionary
        base_features = {
            'County': county,
            'FarmSize_acres': farm_size,
            'AvgTemperature_C': temp,
            'Rainfall_mm': rainfall_mm,
            'Humidity_pct': humidity,
            'SoilPH': soil_ph,
            'SoilNitrogen_pct': soil_nitrogen,
            'NDVI': ndvi,
            'AccumulatedGDU': gdu
        }
        
        print("✅ Base features extracted:")
        for k, v in base_features.items():
            print(f"   {k}: {v}")
        
        # Convert to DataFrame
        input_df = pd.DataFrame([base_features])
        
        # Add County_Encoded
        try:
            input_df['County_Encoded'] = label_encoder.transform([county])[0]
            county_known = True
        except:
            input_df['County_Encoded'] = 0
            county_known = False
            print(f"⚠️ Unknown county: {county}, using default")
        
        # Add derived features
        input_df['Rainfall_x_Temp'] = input_df['Rainfall_mm'] * input_df['AvgTemperature_C']
        input_df['Fertilizer_x_Rainfall'] = input_df['SoilNitrogen_pct'] * input_df['Rainfall_mm']
        input_df['GDU_per_Day'] = input_df['AccumulatedGDU'] / 120
        input_df['Soil_Quality_Index'] = (
            input_df['SoilPH'] / 7 * 0.3 + 
            input_df['SoilNitrogen_pct'] * 2 * 0.7
        )
        input_df['High_Rainfall'] = (input_df['Rainfall_mm'] > 1000).astype(int)
        input_df['High_Temp'] = (input_df['AvgTemperature_C'] > 28).astype(int)
        input_df['Good_Soil'] = ((input_df['SoilPH'] >= 5.5) & (input_df['SoilPH'] <= 7.5)).astype(int)
        
        print(f"📊 Total features after derivation: {len(input_df.columns)}")
        
        # Ensure all required features exist
        for col in feature_columns:
            if col not in input_df.columns:
                input_df[col] = 0
                print(f"⚠️ Added missing column: {col}")
        
        # Select features in correct order
        X_input = input_df[feature_columns]
        print(f"📊 Final feature vector shape: {X_input.shape}")
        print(f"📊 Features being sent to model: {list(X_input.columns)}")
        
        # Scale and predict
        X_scaled = scaler.transform(X_input)
        predicted_yield = float(model.predict(X_scaled)[0])
        predicted_yield = max(0.5, min(8.0, round(predicted_yield, 2)))
        
        print(f"✅ Prediction: {predicted_yield} tons/ha")
        
        # Return simple response
        return {
            "success": True,
            "estimatedYield": predicted_yield,
            "yieldRange": {
                "min": round(max(0.5, predicted_yield - 0.5), 2),
                "max": round(predicted_yield + 0.5, 2)
            },
            "confidence": 85,
            "factors": [
                {"name": "Rainfall", "impact": "positive" if rainfall_mm >= 700 else "negative", "score": min(100, int(rainfall_mm/12)), "value": f"{rainfall_mm} mm"},
                {"name": "Temperature", "impact": "positive", "score": min(100, int(100 - abs(temp-24)*5)), "value": f"{temp}°C"},
                {"name": "Crop Health", "impact": "positive" if health_score >= 60 else "neutral", "score": int(health_score), "value": f"{health_score}/100"}
            ],
            "recommendations": [
                "Continue regular monitoring",
                "Maintain current irrigation schedule"
            ],
            "county_known": county_known,
            "model_used": "Lasso Regression"
        }
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)