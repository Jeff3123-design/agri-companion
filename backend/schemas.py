from pydantic import BaseModel
from typing import List, Dict, Any

class InputData(BaseModel):
    farmInfo: Dict[str, Any]
    sessionData: Dict[str, Any]
    weatherData: Dict[str, Any]
    rainfallData: Dict[str, Any]
    pestData: Dict[str, Any]
    cropHealthProxy: Dict[str, Any]
    collectedAt: str
