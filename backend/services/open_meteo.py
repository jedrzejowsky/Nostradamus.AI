import requests
import pandas as pd
from datetime import datetime, timedelta

class OpenMeteoClient:
    """
    Client for interacting with the Open-Meteo API.
    Handles fetching of historical and forecast weather data.
    """
    
    HISTORICAL_URL = "https://archive-api.open-meteo.com/v1/archive"
    FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

    def __init__(self):
        pass

    def get_historical_data(self, latitude: float, longitude: float, start_date: str, end_date: str):
        """
        Fetches historical weather data for a given location and date range.
        Variables: temperature_2m, precipitation, wind_speed_10m.
        """
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": ["temperature_2m", "precipitation", "wind_speed_10m", "relative_humidity_2m", "rain", "snowfall", "weather_code", "cloud_cover"],
            "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "weather_code", "precipitation_hours"],
            "timezone": "auto"
        }

        try:
            response = requests.get(self.HISTORICAL_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Process hourly
            hourly = data.get("hourly", {})
            df_hourly = pd.DataFrame(hourly)
            df_hourly["time"] = pd.to_datetime(df_hourly["time"])
            
            # Process daily
            daily = data.get("daily", {})
            df_daily = pd.DataFrame(daily)
            df_daily["time"] = pd.to_datetime(df_daily["time"])
            
            return {"hourly": df_hourly, "daily": df_daily}
        except Exception as e:
            print(f"Error fetching historical data: {e}")
            return None

    def get_forecast_data(self, latitude: float, longitude: float, days: int = 7):
        """
        Fetches forecast data for the next 'days' days.
        """
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": ["temperature_2m", "precipitation", "wind_speed_10m", "relative_humidity_2m", "rain", "snowfall", "weather_code", "cloud_cover"],
            "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "weather_code", "precipitation_probability_max"],
            "forecast_days": days,
            "timezone": "auto"
        }

        try:
            response = requests.get(self.FORECAST_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            hourly = data.get("hourly", {})
            df_hourly = pd.DataFrame(hourly)
            df_hourly["time"] = pd.to_datetime(df_hourly["time"])
            
            daily = data.get("daily", {})
            df_daily = pd.DataFrame(daily)
            df_daily["time"] = pd.to_datetime(df_daily["time"])
            
            return {"hourly": df_hourly, "daily": df_daily}
        except Exception as e:
            print(f"Error fetching forecast data: {e}")
            return None

    def get_recent_data(self, latitude: float, longitude: float, days_past: int = 3):
        """
        Fetches very recent data (past days) using the Forecast API.
        This often contains more up-to-date observations/estimations than the Archive API
        for the immediate past (last 24-48h).
        """
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": ["temperature_2m", "wind_speed_10m", "relative_humidity_2m"],
            "past_days": days_past,
            "forecast_days": 1, # Minimal forecast, we just want past
            "timezone": "auto"
        }

        try:
            response = requests.get(self.FORECAST_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            hourly = data.get("hourly", {})
            df_hourly = pd.DataFrame(hourly)
            df_hourly["time"] = pd.to_datetime(df_hourly["time"])
            
            # Filter to only keep past data (up to now)
            now = pd.Timestamp.now()
            df_hourly = df_hourly[df_hourly["time"] <= now]
            
            return df_hourly
        except Exception as e:
            print(f"Error fetching recent data: {e}")
            return None

# Example usage for testing
if __name__ == "__main__":
    client = OpenMeteoClient()
    # Warsaw coordinates
    print("Fetching historical data for Warsaw...")
    hist_df = client.get_historical_data(52.2297, 21.0122, "2023-01-01", "2023-01-10")
    if hist_df is not None:
        print(hist_df.head())
        print(f"Fetched {len(hist_df)} rows.")
