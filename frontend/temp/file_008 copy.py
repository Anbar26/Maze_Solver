# Image resizer
from PIL import Image
import os

class ImageResizer:
    def __init__(self, input_path):
        self.input_path = input_path
        self.image = Image.open(input_path)
    
    def resize_by_percentage(self, percentage):
        width, height = self.image.size
        new_width = int(width * percentage / 100)
        new_height = int(height * percentage / 100)
        return self.image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    def resize_to_dimensions(self, width, height):
        return self.image.resize((width, height), Image.Resampling.LANCZOS)
    
    def resize_maintaining_aspect_ratio(self, max_width, max_height):
        width, height = self.image.size
        
        # Calculate scaling factor
        scale = min(max_width/width, max_height/height)
        
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        return self.image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    def save_resized(self, output_path, resized_image):
        resized_image.save(output_path)

if __name__ == "__main__":
    # Example usage
    resizer = ImageResizer("input.jpg")
    resized = resizer.resize_by_percentage(50)
    resizer.save_resized("output.jpg", resized)
