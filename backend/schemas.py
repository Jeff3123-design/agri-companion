# schemas.py
from pydantic import BaseModel
from typing import List, Optional

class FarmInfo(BaseModel):
    farmSize: str
    farmLocation: str
    maizeVariety: str
    soilPH: Optional[str] = "6.2"

class SessionData(BaseModel):
    currentDay: int
    accumulatedGdu: float
    currentStage: str
    plantingDate: Optional[str] = None

class Coordinates(BaseModel):
    latitude: float
    longitude: float

class WeatherData(BaseModel):
    temperature: float
    humidity: float
    condition: str
    location: Optional[str] = None
    coordinates: Coordinates

class ForecastDay(BaseModel):
    date: str
    condition: str
    tempMax: float
    tempMin: float

class RainfallData(BaseModel):
    recentRainfall: str
    forecast7Day: List[ForecastDay] = []

class PestData(BaseModel):
    overallStatus: str
    fawPresence: str
    recentChecks: int

class CropHealthProxy(BaseModel):
    ndviEstimate: str
    healthScore: float
    basedOn: str

class InputData(BaseModel):
    farmInfo: FarmInfo
    sessionData: SessionData
    weatherData: WeatherData
    rainfallData: RainfallData
    pestData: PestData
    cropHealthProxy: CropHealthProxy
    collectedAt: str