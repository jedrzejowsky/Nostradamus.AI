import requests

class GeocodingClient:
    """
    Client for Open-Meteo Geocoding API.
    """
    GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"

    def search_location(self, name: str, count: int = 5):
        """
        Search for a location by name.
        Returns a list of matching locations with lat/lon.
        """
        params = {
            "name": name,
            "count": count,
            "language": "en",
            "format": "json"
        }
        
        try:
            response = requests.get(self.GEOCODING_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            if "results" not in data:
                return []
                
            return data["results"]
        except Exception as e:
            print(f"Error fetching geocoding data: {e}")
            return []
