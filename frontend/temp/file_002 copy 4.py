# Weather API client
import requests
import json

class WeatherAPI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "http://api.openweathermap.org/data/2.5/weather"
    
    def get_weather(self, city):
        params = {
            'q': city,
            'appid': self.api_key,
            'units': 'metric'
        }
        response = requests.get(self.base_url, params=params)
        return response.json()

# Example usage
if __name__ == "__main__":
    api = WeatherAPI("your_api_key_here")
    weather = api.get_weather("London")
    print(weather)
