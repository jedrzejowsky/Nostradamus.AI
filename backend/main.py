from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from services.open_meteo import OpenMeteoClient
from services.ml_service import WeatherPredictor
from datetime import datetime, timedelta
import pandas as pd

app = FastAPI(title="Nostradamus.AI API", description="Weather Prediction API", version="0.1.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenMeteoClient()
predictor = WeatherPredictor()

@app.get("/")
def read_root():
    return {"message": "Welcome to Nostradamus.AI Backend", "status": "active"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/weather/history")
def get_history(
    lat: float, 
    lon: float, 
    start_date: str = Query(..., description="Start date YYYY-MM-DD"), 
    end_date: str = Query(..., description="End date YYYY-MM-DD")
):
    try:
        df = client.get_historical_data(lat, lon, start_date, end_date)
        if df is None:
            raise HTTPException(status_code=500, detail="Failed to fetch data")
        if "time" in df.columns:
            df["time"] = df["time"].astype(str)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/weather/forecast")
def get_forecast(
    lat: float, 
    lon: float, 
    days: int = Query(7, ge=1, le=16)
):
    try:
        df = client.get_forecast_data(lat, lon, days)
        if df is None:
            raise HTTPException(status_code=500, detail="Failed to fetch forecast")
        if "time" in df.columns:
            df["time"] = df["time"].astype(str)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/weather/predict")
def predict_weather(
    lat: float, 
    lon: float, 
    days: int = Query(7, ge=1, le=14)
):
    """
    Fetches historical data, trains the model, and predicts future weather.
    """
    try:
        # 1. Fetch Long History for Training (2 years)
        # Open-Meteo archive has 2-day lag typically.
        end_date_hist = datetime.now().date() 
        start_date_hist = end_date_hist - timedelta(days=365*2)
        
        df = client.get_historical_data(lat, lon, str(start_date_hist), str(end_date_hist))
        
        if df is None or len(df) < 100:
             raise HTTPException(status_code=500, detail="Insufficient historical data for training")

        # 2. Train Model
        # Using the whole dataset as training for now
        train_stats = predictor.train(df)
        
        if train_stats.get("status") == "error":
             raise HTTPException(status_code=500, detail="Model training failed")

        # 3. Predict Future
        forecast = predictor.predict_next_days(days, df)
        
        return {
            "model_performance": train_stats,
            "prediction": forecast
        }
    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
