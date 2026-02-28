import httpx
from typing import Dict, Any

async def get_current_weather(lat: float, lon: float) -> Dict[str, Any]:
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,weather_code"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=5.0)
            response.raise_for_status()
            data = response.json()
            
            current = data.get("current", {})
            temp = current.get("temperature_2m", 25.0)
            precip = current.get("precipitation", 0.0)
            wmo_code = current.get("weather_code", 0)
            
            # WMO Code Mapping (Simplified)
            condition = "Clear"
            if wmo_code in [1, 2, 3]:
                condition = "Partly Cloudy"
            elif wmo_code in [45, 48]:
                condition = "Foggy"
            elif wmo_code in [51, 53, 55, 56, 57]:
                condition = "Drizzle"
            elif wmo_code in [61, 63, 65, 66, 67, 80, 81, 82]:
                condition = "Rain"
            elif wmo_code in [71, 73, 75, 77, 85, 86]:
                condition = "Snow"
            elif wmo_code >= 95:
                condition = "Thunderstorm"
                
            return {
                "temperature": temp,
                "condition": condition,
                "precipitation_mm": precip,
                "is_raining": "Rain" in condition or "Drizzle" in condition or precip > 0.5,
                "is_extreme_heat": temp > 38.0
            }
        except Exception as e:
            print(f"Weather API Error: {e}")
            # Fallback safe weather
            return {
                "temperature": 28.0,
                "condition": "Clear (Fallback)",
                "precipitation_mm": 0.0,
                "is_raining": False,
                "is_extreme_heat": False
            }
