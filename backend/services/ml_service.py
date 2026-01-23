import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib
import os
from datetime import datetime, timedelta

class WeatherPredictor:
    """
    Machine Learning module for forecasting weather.
    Uses RandomForestRegressor on historical data.
    """
    
    def __init__(self):
        self.model_temp = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        self.is_trained = False
        self.model_path = "weather_model.joblib"

    def preprocess_data(self, df: pd.DataFrame):
        """
        Prepares features from the dataframe.
        Features: Hour, DayOfYear, Month (Cyclical encoding ideally, but keeping simple for MVP).
        Target: temperature_2m
        """
        df = df.copy()
        if "time" not in df.columns:
            return None, None
            
        df["time"] = pd.to_datetime(df["time"])
        df = df.sort_values("time")
        
        # Feature Engineering
        df["hour"] = df["time"].dt.hour
        df["month"] = df["time"].dt.month
        df["day_of_year"] = df["time"].dt.dayofyear
        
        # Create lag features (e.g., temperature 24h ago)
        # Shift by 24 rows assuming hourly data
        df["temp_lag_24h"] = df["temperature_2m"].shift(24)
        
        # Drop NaNs created by lagging
        df = df.dropna()
        
        features = ["hour", "month", "day_of_year", "temp_lag_24h"]
        target = "temperature_2m"
        
        return df[features], df[target]

    def train(self, df: pd.DataFrame):
        """
        Trains the model on the provided historical data.
        """
        X, y = self.preprocess_data(df)
        if X is None or len(X) < 100:
            print("Not enough data to train.")
            return {"status": "error", "message": "Insufficient data"}

        # Use TimeSeriesSplit logic: Train on past, test on recent past
        # Split: 80% train, 20% test
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        # Fit model
        self.model_temp.fit(X_train, y_train)
        self.is_trained = True
        
        # Evaluate on Test set (unseen data)
        y_pred = self.model_temp.predict(X_test)
        
        r2 = self.model_temp.score(X_test, y_test)
        mae = mean_absolute_error(y_test, y_pred)
        
        # Retrain on FULL dataset for future predictions
        self.model_temp.fit(X, y)

        return {
            "status": "success", 
            "r2": r2,
            "mae": mae
        }

    def predict_next_days(self, days: int, last_historical_data: pd.DataFrame):
        """
        Predicts weather for the next N days.
        Requires recent historical data to establish lags.
        Uses recursive forecasting strategy.
        """
        if not self.is_trained:
            return None

        # Need the last 24h of data to start the feedback loop
        # We need to reconstruct the state at t=now
        
        future_preds = []
        
        # Get last timestamp
        last_time = pd.to_datetime(last_historical_data["time"].iloc[-1])
        
        # We need the last 24 values of temperature to use as lag buffer
        # Assuming last_historical_data is sorted end-to-end
        last_temps = last_historical_data["temperature_2m"].values[-24:] # Buffer of last 24h temps
        if len(last_temps) < 24:
             # Fallback if sparse data, though unlikely if fetching strictly
             pass
        
        current_buffer = list(last_temps)
        
        for i in range(days * 24): # Forecast hourly
            next_time = last_time + timedelta(hours=i+1)
            
            # Features
            hour = next_time.hour
            month = next_time.month
            doy = next_time.timetuple().tm_yday
            
            # Lag 24h is the value extracted 24 hours ago from the buffer
            # The buffer grows. index -24 from end is what we want?
            # actually if we append predictions, we can just take [-24]
            
            lag_24 = current_buffer[-24]
            
            features = pd.DataFrame([{
                "hour": hour,
                "month": month,
                "day_of_year": doy,
                "temp_lag_24h": lag_24
            }])
            
            pred_temp = self.model_temp.predict(features)[0]
            
            future_preds.append({
                "time": next_time.isoformat(),
                "predicted_temperature_2m": pred_temp
            })
            
            # Update buffer
            current_buffer.append(pred_temp)
            
        return future_preds
