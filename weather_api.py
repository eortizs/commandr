from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import os

app = FastAPI(title="Weather API", version="1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = "ee73452f08b66312eaee7bd69faa2aca"
BASE_URL = "https://api.openweathermap.org/data/2.5"

@app.get("/")
def root():
    return {"message": "Weather API - Usa /weather?city=CDMX o /weather?lat=19.43&lon=-99.13"}

@app.get("/weather")
def get_weather(city: str = None, lat: float = None, lon: float = None, units: str = "metric", lang: str = "es"):
    """
    Consulta el clima por ciudad o coordenadas.
    
    - city: Nombre de la ciudad (ej: CDMX, Madrid, New York)
    - lat, lon: Coordenadas GPS
    - units: metric (°C) o imperial (°F)
    - lang: idioma (es, en, etc.)
    """
    if not city and (lat is None or lon is None):
        raise HTTPException(status_code=400, detail="Proporciona 'city' o 'lat' y 'lon'")
    
    params = {
        "appid": API_KEY,
        "units": units,
        "lang": lang
    }
    
    if city:
        params["q"] = city
    else:
        params["lat"] = lat
        params["lon"] = lon
    
    try:
        response = requests.get(f"{BASE_URL}/weather", params=params, timeout=10)
        data = response.json()
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=data.get("message", "Error"))
        
        # Formatear respuesta
        return {
            "ciudad": data["name"],
            "pais": data["sys"]["country"],
            "temperatura": {
                "actual": data["main"]["temp"],
                "sensacion": data["main"]["feels_like"],
                "min": data["main"]["temp_min"],
                "max": data["main"]["temp_max"]
            },
            "humedad": data["main"]["humidity"],
            "presion": data["main"]["pressure"],
            "clima": {
                "principal": data["weather"][0]["main"],
                "descripcion": data["weather"][0]["description"],
                "icono": f"https://openweathermap.org/img/wn/{data['weather'][0]['icon']}@2x.png"
            },
            "viento": {
                "velocidad": data["wind"]["speed"],
                "direccion": data["wind"].get("deg", 0)
            },
            "nubes": data["clouds"]["all"],
            "visibilidad": data.get("visibility", 0),
            "amanecer": data["sys"]["sunrise"],
            "atardecer": data["sys"]["sunset"],
            "timezone": data["timezone"]
        }
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error de conexión: {str(e)}")

@app.get("/forecast")
def get_forecast(city: str = None, lat: float = None, lon: float = None, units: str = "metric", lang: str = "es"):
    """Pronóstico de 5 días / 3 horas"""
    if not city and (lat is None or lon is None):
        raise HTTPException(status_code=400, detail="Proporciona 'city' o 'lat' y 'lon'")
    
    params = {
        "appid": API_KEY,
        "units": units,
        "lang": lang
    }
    
    if city:
        params["q"] = city
    else:
        params["lat"] = lat
        params["lon"] = lon
    
    try:
        response = requests.get(f"{BASE_URL}/forecast", params=params, timeout=10)
        data = response.json()
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=data.get("message", "Error"))
        
        # Simplificar pronóstico
        forecast_list = []
        for item in data["list"][:8]:  # Próximas 24 horas (cada 3h)
            forecast_list.append({
                "fecha": item["dt_txt"],
                "temperatura": item["main"]["temp"],
                "descripcion": item["weather"][0]["description"],
                "icono": f"https://openweathermap.org/img/wn/{item['weather'][0]['icon']}@2x.png"
            })
        
        return {
            "ciudad": data["city"]["name"],
            "pais": data["city"]["country"],
            "pronostico": forecast_list
        }
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error de conexión: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
