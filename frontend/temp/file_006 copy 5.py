# URL shortener
import hashlib
import string
import random

class URLShortener:
    def __init__(self):
        self.url_map = {}
        self.base_url = "https://short.ly/"
    
    def shorten_url(self, long_url):
        # Generate a short code
        short_code = self._generate_short_code(long_url)
        
        # Store the mapping
        self.url_map[short_code] = long_url
        
        return self.base_url + short_code
    
    def _generate_short_code(self, url):
        # Use hash of URL for consistency
        hash_object = hashlib.md5(url.encode())
        hex_dig = hash_object.hexdigest()
        return hex_dig[:6]
    
    def expand_url(self, short_url):
        short_code = short_url.replace(self.base_url, "")
        return self.url_map.get(short_code, "URL not found")

if __name__ == "__main__":
    shortener = URLShortener()
    short_url = shortener.shorten_url("https://www.example.com/very/long/url")
    print("Short URL:", short_url)
    print("Original URL:", shortener.expand_url(short_url))
