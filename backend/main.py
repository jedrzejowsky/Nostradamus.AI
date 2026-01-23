from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from services.open_meteo import OpenMeteoClient
from services.ml_service import WeatherPredictor
from services.geocoding import GeocodingClient
from datetime import datetime, timedelta
import pandas as pd
import json

app = FastAPI(title="Nostradamus.AI API", description="Weather Prediction API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenMeteoClient()
predictor = WeatherPredictor()
geo_client = GeocodingClient()

@app.get("/")
def read_root():
    return {"message": "Welcome to Nostradamus.AI Backend", "status": "active"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/location/search")
def search_location(name: str):
    results = geo_client.search_location(name)
    return results

def serialize_df(df):
    if df is None: return []
    if "time" in df.columns:
        df["time"] = df["time"].astype(str)
    return df.to_dict(orient="records")

@app.get("/api/weather/history")
def get_history(
    lat: float, 
    lon: float, 
    start_date: str = Query(..., description="Start date YYYY-MM-DD"), 
    end_date: str = Query(..., description="End date YYYY-MM-DD")
):
    try:
        data = client.get_historical_data(lat, lon, start_date, end_date)
        if data is None:
            raise HTTPException(status_code=500, detail="Failed to fetch data")
        
        return {
            "hourly": serialize_df(data["hourly"]),
            "daily": serialize_df(data["daily"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/weather/forecast")
def get_forecast(
    lat: float, 
    lon: float, 
    days: int = Query(7, ge=1, le=16)
):
    try:
        data = client.get_forecast_data(lat, lon, days)
        if data is None:
            raise HTTPException(status_code=500, detail="Failed to fetch forecast")
        
        return {
            "hourly": serialize_df(data["hourly"]),
            "daily": serialize_df(data["daily"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/weather/predict")
def predict_weather(
    lat: float, 
    lon: float, 
    days: int = Query(7, ge=1, le=14)
):
    try:
        end_date_hist = datetime.now().date() 
        start_date_hist = end_date_hist - timedelta(days=365*2)
        
        # Train needs standard specific format, sticking to 'hourly' df for training
        # We need to extract just hourly df from our new return structure
        data_hist = client.get_historical_data(lat, lon, str(start_date_hist), str(end_date_hist))
        
        if data_hist is None or "hourly" not in data_hist or len(data_hist["hourly"]) < 100:
             raise HTTPException(status_code=500, detail="Insufficient historical data for training")

        df = data_hist["hourly"]
        train_stats = predictor.train(df)
        
        if train_stats.get("status") == "error":
             raise HTTPException(status_code=500, detail="Model training failed")

        forecast = predictor.predict_next_days(days, df)
        
        return {
            "model_performance": train_stats,
            "prediction": forecast
        }
    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
