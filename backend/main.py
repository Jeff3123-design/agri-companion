# main.py - Complete updated version with external connection support
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import os
import json
import numpy as np
import pandas as pd
import joblib
import uvicorn
from datetime import datetime
from schemas import InputData

# --------------------------------------------------
# App Setup
# --------------------------------------------------

app = FastAPI(
    title="FarmBuddy AI Backend",
    description="ML-powered maize yield prediction backend using trained Kenya model",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Enhanced CORS configuration for external access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",  # Allow all origins (for development)
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://*.ngrok.io",
        "https://*.ngrok-free.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Configuration
DOWNLOADS_DIR = r"C:\Users\admin\Downloads"
MODEL_PATH = r'C:\Users\admin\kenya_maize_yield_model.pkl'
HOST = "0.0.0.0"  # Allows external connections
PORT = 8000

# --------------------------------------------------
# Load Trained Model
# --------------------------------------------------

print("="*60)
print("🚀 FARMBOUTY AI BACKEND - STARTING UP")
print("="*60)
print(f"📅 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"📍 Host: {HOST}:{PORT}")
print(f"📁 Downloads directory: {DOWNLOADS_DIR}")
print(f"📦 Model path: {MODEL_PATH}")
print("-"*60)

try:
    # Load the model artifacts
    model_artifacts = joblib.load(MODEL_PATH)
    print(f"✅ Model loaded successfully!")
    print(f"   Model: {model_artifacts['model_name']}")
    print(f"   R² Score: {model_artifacts['performance']['r2_score']:.3f}")
    print(f"   RMSE: ±{model_artifacts['performance']['rmse']:.2f} tons/ha")
    print(f"   MAE: {model_artifacts['performance']['mae']:.2f} tons/ha")
    print(f"   MAPE: {model_artifacts['performance'].get('mape', 0):.1f}%")
    
    # Extract components
    model = model_artifacts['model']
    scaler = model_artifacts['scaler']
    label_encoder = model_artifacts['label_encoder_county']
    feature_columns = model_artifacts['feature_columns']
    performance = model_artifacts['performance']
    model_name = model_artifacts['model_name']
    
    print(f"📊 Features used: {len(feature_columns)}")
    print(f"📍 Counties supported: {len(label_encoder.classes_) if label_encoder else 0}")
    
except Exception as e:
    print(f"❌ Error loading model: {e}")
    print("   Falling back to dummy model...")
    # Fallback to dummy model if trained model not found
    from sklearn.linear_model import LinearRegression
    model = LinearRegression()
    # Dummy training data
    X_dummy = np.array([[200, 24, 60, 1, 1], [400, 26, 70, 1, 1], [600, 25, 80, 1, 1]])
    y_dummy = np.array([2.1, 3.0, 3.8])
    model.fit(X_dummy, y_dummy)
    scaler = None
    label_encoder = None
    feature_columns = ['gdu', 'temp', 'health', 'pest', 'rainfall']
    performance = {'rmse': 0.5, 'r2_score': 0.7, 'mae': 0.4, 'mape': 15}
    model_name = "Fallback Linear Regression"
    model_artifacts = {'model_name': model_name, 'performance': performance}

print("-"*60)
print("✅ Server is ready to accept connections!")
print("="*60)

# --------------------------------------------------
# Utility Functions
# --------------------------------------------------

def encode_rainfall(rainfall_text: str) -> float:
    """Convert rainfall description to estimated mm"""
    rainfall_map = {
        "low": 400,
        "moderate": 700,
        "high": 1000,
        "very high": 1200,
        "none": 200,
        "light": 300,
        "heavy": 1100
    }
    return rainfall_map.get(rainfall_text.lower(), 700)

def extract_ndvi_value(ndvi_estimate: str) -> float:
    """Convert NDVI estimate string to numeric value"""
    ndvi_estimate = ndvi_estimate.lower()
    if "0.4-0.6" in ndvi_estimate or "moderate" in ndvi_estimate:
        return 0.5
    elif "0.6-0.8" in ndvi_estimate or "high" in ndvi_estimate:
        return 0.7
    elif "0.2-0.4" in ndvi_estimate or "low" in ndvi_estimate:
        return 0.3
    elif "0.8-1.0" in ndvi_estimate or "very high" in ndvi_estimate:
        return 0.9
    else:
        # Try to extract numeric value if present
        import re
        numbers = re.findall(r"0\.\d", ndvi_estimate)
        if numbers:
            return float(numbers[0])
        return 0.5  # Default

def estimate_soil_nitrogen(health_score: int, ndvi: float) -> float:
    """Estimate soil nitrogen from available data"""
    # This is a heuristic - ideally you'd get actual soil test
    base_nitrogen = 0.3
    health_factor = (health_score / 100) * 0.3
    ndvi_factor = ndvi * 0.3
    return min(0.6, max(0.1, base_nitrogen + health_factor + ndvi_factor))

def get_latest_json():
    """Get the latest JSON file from Downloads folder"""
    try:
        files = [
            f for f in os.listdir(DOWNLOADS_DIR)
            if f.endswith(".json")
        ]
        if not files:
            return None

        latest = max(
            files,
            key=lambda f: os.path.getctime(os.path.join(DOWNLOADS_DIR, f))
        )

        with open(os.path.join(DOWNLOADS_DIR, latest), "r", encoding='utf-8') as file:
            return json.load(file)
    except Exception as e:
        print(f"❌ Error reading JSON file: {e}")
        return None

def prepare_features_for_model(data: dict) -> dict:
    """
    Transform frontend data into model features
    """
    try:
        # Extract values from frontend data
        county = data["farmInfo"]["farmLocation"].title()
        farm_size = float(data["farmInfo"]["farmSize"])
        temp = float(data["weatherData"]["temperature"])
        humidity = float(data["weatherData"]["humidity"])
        
        # Convert rainfall description to mm
        rainfall_mm = encode_rainfall(data["rainfallData"]["recentRainfall"])
        
        # Extract NDVI and convert to numeric
        ndvi_estimate = data["cropHealthProxy"]["ndviEstimate"]
        ndvi = extract_ndvi_value(ndvi_estimate)
        
        # Get GDU
        gdu = float(data["sessionData"]["accumulatedGdu"])
        
        # Estimate soil pH (default to 6.2 if not available)
        soil_ph = 6.2
        
        # Estimate soil nitrogen from available data
        health_score = float(data["cropHealthProxy"]["healthScore"])
        soil_nitrogen = estimate_soil_nitrogen(health_score, ndvi)
        
        # Create feature dictionary
        features = {
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
        
        return features
    except Exception as e:
        print(f"❌ Error preparing features: {e}")
        raise

# --------------------------------------------------
# API Endpoints
# --------------------------------------------------

@app.get("/")
def root():
    """Root endpoint - shows API status"""
    return {
        "status": "online",
        "app_name": "FarmBuddy AI Backend",
        "version": "3.0.0",
        "model": model_name,
        "accuracy": {
            "r2_score": round(performance['r2_score'], 3),
            "rmse": round(performance['rmse'], 2),
            "mae": round(performance.get('mae', 0), 2)
        },
        "endpoints": {
            "health": "/health",
            "predict": "/yield/predict (POST)",
            "model_info": "/model/info",
            "counties": "/counties",
            "docs": "/docs",
            "redoc": "/redoc"
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": 'model_artifacts' in locals(),
        "model_name": model_name,
        "model_accuracy": {
            "r2_score": round(performance['r2_score'], 3),
            "rmse": round(performance['rmse'], 2)
        },
        "server_time": datetime.now().isoformat(),
        "uptime": "running"
    }

@app.post("/yield/predict")
def predict_yield(input_data: InputData):
    """
    Predict maize yield using trained ML model
    """
    try:
        # Convert Pydantic model to dict
        data = input_data.dict()
        
        # Prepare features for the model
        features = prepare_features_for_model(data)
        
        # Get pest status
        pest_detected = data["pestData"]["fawPresence"] != "Not detected"
        health_score = float(data["cropHealthProxy"]["healthScore"])
        
        # If using trained model
        if 'model_artifacts' in locals() and scaler is not None:
            # Convert to DataFrame
            input_df = pd.DataFrame([features])
            
            # Encode county
            try:
                input_df['County_Encoded'] = label_encoder.transform(input_df['County'])
                county_known = True
            except:
                # If county not in training data, use default
                input_df['County_Encoded'] = 0
                county_known = False
                print(f"⚠️ Unknown county: {features['County']}, using default encoding")
            
            # Create derived features (same as during training)
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
            
            # Ensure all required features are present
            for col in feature_columns:
                if col not in input_df.columns:
                    input_df[col] = 0
            
            # Select and scale features
            X_input = input_df[feature_columns]
            X_scaled = scaler.transform(X_input)
            
            # Make prediction
            predicted_yield = model.predict(X_scaled)[0]
            
        else:
            # Fallback to dummy model
            gdu = features['AccumulatedGDU']
            temp = features['AvgTemperature_C']
            health = health_score
            rainfall = features['Rainfall_mm'] / 200  # Normalize
            pest = 1 if pest_detected else 0
            
            X_input = np.array([[gdu, temp, health, pest, rainfall]])
            predicted_yield = model.predict(X_input)[0]
            county_known = True
        
        # Ensure yield is reasonable
        predicted_yield = max(0.5, min(8.0, float(predicted_yield)))
        predicted_yield = round(predicted_yield, 2)
        
        # Calculate confidence interval based on model RMSE
        rmse = performance['rmse']
        yield_min = round(max(0.5, predicted_yield - 1.96 * rmse), 2)
        yield_max = round(predicted_yield + 1.96 * rmse, 2)
        
        # Calculate confidence percentage (95% is max)
        confidence = min(95, int(95 - (rmse / predicted_yield * 30)))
        
        # Generate factors based on model inputs
        factors = [
            {
                "name": "Rainfall",
                "impact": "positive" if features['Rainfall_mm'] >= 700 else "negative",
                "score": min(100, int(features['Rainfall_mm'] / 12)),
                "value": f"{features['Rainfall_mm']} mm"
            },
            {
                "name": "Temperature",
                "impact": "positive" if 20 <= features['AvgTemperature_C'] <= 28 else "negative",
                "score": min(100, int(100 - abs(features['AvgTemperature_C'] - 24) * 5)),
                "value": f"{features['AvgTemperature_C']}°C"
            },
            {
                "name": "Pest Pressure",
                "impact": "negative" if pest_detected else "positive",
                "score": 40 if pest_detected else 85,
                "value": "Detected" if pest_detected else "None"
            },
            {
                "name": "Crop Health",
                "impact": "positive" if health_score >= 60 else "neutral",
                "score": health_score,
                "value": f"{health_score}/100"
            },
            {
                "name": "Growing Degree Days",
                "impact": "positive" if features['AccumulatedGDU'] >= 1000 else "neutral",
                "score": min(100, int(features['AccumulatedGDU'] / 15)),
                "value": f"{features['AccumulatedGDU']} GDU"
            }
        ]
        
        # Generate recommendations based on predictions
        recommendations = []
        
        if features['Rainfall_mm'] < 600:
            recommendations.append("💧 Consider supplemental irrigation - rainfall below optimal")
        elif features['Rainfall_mm'] > 1100:
            recommendations.append("⚠️ Ensure proper drainage - excess rainfall risk")
        
        if features['AvgTemperature_C'] > 28:
            recommendations.append("🌡️ Watch for heat stress; maintain soil moisture")
        elif features['AvgTemperature_C'] < 18:
            recommendations.append("❄️ Consider frost protection for young plants")
        
        if pest_detected:
            recommendations.append("🐛 Apply integrated pest management for fall armyworm")
        else:
            recommendations.append("✅ Continue regular pest scouting")
        
        if health_score < 60:
            recommendations.append("🌱 Apply foliar fertilizer to boost crop health")
        
        if features['AccumulatedGDU'] < 800:
            recommendations.append("🌿 Early season - ensure adequate nutrients")
        elif features['AccumulatedGDU'] > 1400:
            recommendations.append("🌾 Monitor for maturity and prepare for harvest")
        
        # Add general recommendations if list is empty
        if not recommendations:
            recommendations = [
                "✅ Maintain current fertilizer schedule",
                "👁️ Continue regular monitoring",
                "💧 Ensure adequate soil moisture"
            ]
        
        return {
            "success": True,
            "estimatedYield": predicted_yield,
            "yieldRange": {
                "min": yield_min,
                "max": yield_max
            },
            "confidence": confidence,
            "factors": factors[:4],  # Return top 4 factors
            "recommendations": recommendations[:4],  # Return top 4 recommendations
            "county_known": county_known,
            "model_used": model_name
        }
        
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/model/info")
def model_info():
    """Get information about the trained model"""
    if 'model_artifacts' in locals():
        return {
            "model_name": model_name,
            "performance": {
                "r2_score": round(performance['r2_score'], 3),
                "rmse": round(performance['rmse'], 2),
                "mae": round(performance.get('mae', 0), 2),
                "mape": round(performance.get('mape', 0), 1)
            },
            "features_used": len(feature_columns) if feature_columns else 0,
            "feature_list": feature_columns[:10] if feature_columns else [],
            "training_date": model_artifacts.get('training_date', 'Unknown'),
            "n_samples": model_artifacts.get('n_samples', 'Unknown'),
            "n_features": model_artifacts.get('n_features', 'Unknown')
        }
    else:
        return {"error": "Model not loaded"}

@app.get("/counties")
def get_counties():
    """Get list of counties the model was trained on"""
    if 'label_encoder' in locals() and label_encoder is not None:
        counties = sorted(label_encoder.classes_.tolist())
        return {
            "count": len(counties),
            "counties": counties
        }
    return {
        "count": 5,
        "counties": ["Kisii", "Uasin Gishu", "Trans Nzoia", "Nakuru", "Bungoma"]
    }

@app.get("/test/json")
def test_json():
    """Test endpoint to read the latest JSON file"""
    data = get_latest_json()
    if data:
        return {"success": True, "data": data}
    return {"success": False, "error": "No JSON file found"}

@app.get("/test/features")
def test_features():
    """Test endpoint to see what features would be extracted"""
    data = get_latest_json()
    if not data:
        return {"error": "No JSON file found"}
    
    try:
        features = prepare_features_for_model(data)
        return {
            "success": True,
            "extracted_features": features
        }
    except Exception as e:
        return {"error": str(e)}

# --------------------------------------------------
# Main entry point
# --------------------------------------------------

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🌟 SERVER STARTING - READY FOR EXTERNAL CONNECTIONS")
    print("="*60)
    print(f"🌐 Local URL: http://localhost:{PORT}")
    print(f"🌍 Network URL: http://{HOST}:{PORT}")
    print(f"📚 API Docs: http://localhost:{PORT}/docs")
    print(f"📊 Alternative Docs: http://localhost:{PORT}/redoc")
    print("\n📱 To expose online with ngrok, run:")
    print(f"   ngrok http {PORT}")
    print("\n⚠️  Press CTRL+C to stop the server")
    print("="*60 + "\n")
    
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=True,
        log_level="info"
    )