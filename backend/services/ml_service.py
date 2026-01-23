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
        Features: Hour, DayOfYear, Month, Lags (Temp, Wind, Hum).
        Targets: temperature_2m, wind_speed_10m, relative_humidity_2m
        """
        df = df.copy()
        if "time" not in df.columns:
            return None, None
            
        df["time"] = pd.to_datetime(df["time"])
        df = df.sort_values("time")
        
        # Feature Engineering: Time
        df["hour"] = df["time"].dt.hour
        df["month"] = df["time"].dt.month
        df["day_of_year"] = df["time"].dt.dayofyear
        
        # Target Columns checking
        targets = ["temperature_2m", "wind_speed_10m", "relative_humidity_2m"]
        for t in targets:
            if t not in df.columns:
                return None, None
        
        # Create lag features (24h) for ALL targets
        df["temp_lag_24h"] = df["temperature_2m"].shift(24)
        df["wind_lag_24h"] = df["wind_speed_10m"].shift(24)
        df["hum_lag_24h"] = df["relative_humidity_2m"].shift(24)
        
        df = df.dropna()
        
        features = ["hour", "month", "day_of_year", "temp_lag_24h", "wind_lag_24h", "hum_lag_24h"]
        
        return df[features], df[targets]

    def train(self, df: pd.DataFrame):
        """
        Trains the model on historical data (Multivariate).
        """
        X, y = self.preprocess_data(df)
        if X is None or len(X) < 100:
            return {"status": "error", "message": "Insufficient data"}

        # Split
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        # Fit model (RandomForest handles multi-output naturally)
        self.model_temp.fit(X_train, y_train)
        self.is_trained = True
        
        # Evaluate
        y_pred = self.model_temp.predict(X_test)
        r2 = self.model_temp.score(X_test, y_test)
        mae = mean_absolute_error(y_test, y_pred) # Average MAE across all targets
        
        # Retrain on full
        self.model_temp.fit(X, y)
        
        feature_importance = dict(zip(X.columns, self.model_temp.feature_importances_))

        return {
            "status": "success", 
            "r2": r2,
            "mae": mae,
            "feature_importance": feature_importance
        }

    def predict_next_days(self, days: int, last_historical_data: pd.DataFrame):
        """
        Predicts weather (Temp, Wind, Hum) for the next N days recursively.
        """
        if not self.is_trained:
            return None

        future_preds = []
        last_time = pd.to_datetime(last_historical_data["time"].iloc[-1])
        
        # We need buffers for ALL 3 variables
        required_cols = ["temperature_2m", "wind_speed_10m", "relative_humidity_2m"]
        for col in required_cols:
            if col not in last_historical_data.columns:
                return None

        # Buffers (last 24h)
        buf_temp = list(last_historical_data["temperature_2m"].values[-24:])
        buf_wind = list(last_historical_data["wind_speed_10m"].values[-24:])
        buf_hum = list(last_historical_data["relative_humidity_2m"].values[-24:])
        
        if len(buf_temp) < 24: return None # Safety

        for i in range(days * 24):
            next_time = last_time + timedelta(hours=i+1)
            
            # Features
            features = pd.DataFrame([{
                "hour": next_time.hour,
                "month": next_time.month,
                "day_of_year": next_time.timetuple().tm_yday,
                "temp_lag_24h": buf_temp[-24],
                "wind_lag_24h": buf_wind[-24],
                "hum_lag_24h": buf_hum[-24]
            }])
            
            # Predict [Temp, Wind, Hum]
            pred = self.model_temp.predict(features)[0] # Returns array of 3
            p_temp, p_wind, p_hum = pred[0], pred[1], pred[2]
            
            future_preds.append({
                "time": next_time.isoformat(),
                "predicted_temperature_2m": p_temp,
                "predicted_wind_speed_10m": p_wind,
                "predicted_relative_humidity_2m": p_hum
            })
            
            # Update buffers
            buf_temp.append(p_temp)
            buf_wind.append(p_wind)
            buf_hum.append(p_hum)
            
        return future_preds
