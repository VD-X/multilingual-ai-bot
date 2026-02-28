import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from app.services.weather_client import get_current_weather

router = APIRouter(prefix="/zones", tags=["Zones"])

class ZoneResponse(BaseModel):
    id: str
    name: str
    safetyScore: int
    crowdScore: int
    weatherScore: int
    priceScore: int
    reviewScore: int
    color: str
    overallScore: int

class ZonesContextResponse(BaseModel):
    weather_context: Dict[str, Any]
    zones: List[ZoneResponse]

BASE_ZONES = [
    {"name": "Old Town", "safety": 85, "crowd": 60, "price": 50, "review": 90},
    {"name": "Beach District", "safety": 90, "crowd": 70, "price": 65, "review": 85},
    {"name": "Night Market", "safety": 55, "crowd": 85, "price": 40, "review": 75},
    {"name": "Industrial Quarter", "safety": 30, "crowd": 20, "price": 80, "review": 25},
    {"name": "Temple District", "safety": 95, "crowd": 45, "price": 55, "review": 95},
    {"name": "Harbor Area", "safety": 60, "crowd": 50, "price": 45, "review": 60},
]

def calculate_zone_scores(base_zone: dict, weather_ctx: dict) -> dict:
    # 1. Weather Score Modifier
    base_weather = 100
    if weather_ctx["is_raining"]:
        base_weather -= 30
    if weather_ctx["is_extreme_heat"]:
        base_weather -= 40
        
    weather_score = max(0, min(100, base_weather))

    # 2. Crowd Modifier (if raining or extreme heat, crowds drop)
    crowd = base_zone["crowd"]
    if weather_ctx["is_raining"] or weather_ctx["is_extreme_heat"]:
        crowd = max(10, int(crowd * 0.5))

    safety = base_zone["safety"]
    price = base_zone["price"]
    review = base_zone["review"]

    # 3. Overall Score Calculation (Weights: Safety 40%, Weather 20%, Review 20%, Price 10%, Crowd (inversely) 10%)
    overall = int((safety * 0.4) + (weather_score * 0.2) + (review * 0.2) + (price * 0.1) + ((100 - crowd) * 0.1))

    # 4. Color Classification
    color = "green"
    if overall < 40:
        color = "red"
    elif overall < 70:
        color = "yellow"

    return {
        "id": str(uuid.uuid4())[:8],
        "name": base_zone["name"],
        "safetyScore": safety,
        "crowdScore": crowd,
        "weatherScore": weather_score,
        "priceScore": price,
        "reviewScore": review,
        "color": color,
        "overallScore": overall
    }

@router.get("", response_model=ZonesContextResponse)
async def get_zones(
    lat: float = Query(26.9124, description="Latitude (Default Jaipur)"),
    lon: float = Query(75.7873, description="Longitude (Default Jaipur)")
):
    try:
        # Get live weather context
        weather_ctx = await get_current_weather(lat, lon)
        
        # Calculate dynamic zones
        zones = []
        for bz in BASE_ZONES:
            zones.append(calculate_zone_scores(bz, weather_ctx))
            
        return {
            "weather_context": weather_ctx,
            "zones": zones
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
