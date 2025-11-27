# QR code generator
import qrcode
from PIL import Image

class QRCodeGenerator:
    def __init__(self):
        self.qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
    
    def generate_qr_code(self, data, filename="qrcode.png"):
        self.qr.add_data(data)
        self.qr.make(fit=True)
        
        img = self.qr.make_image(fill_color="black", back_color="white")
        img.save(filename)
        return filename
    
    def generate_qr_code_with_logo(self, data, logo_path, filename="qrcode_with_logo.png"):
        self.qr.add_data(data)
        self.qr.make(fit=True)
        
        # Create QR code image
        qr_img = self.qr.make_image(fill_color="black", back_color="white")
        
        # Open and resize logo
        logo = Image.open(logo_path)
        logo = logo.resize((60, 60), Image.Resampling.LANCZOS)
        
        # Calculate position to center logo
        qr_width, qr_height = qr_img.size
        logo_width, logo_height = logo.size
        
        pos = ((qr_width - logo_width) // 2, (qr_height - logo_height) // 2)
        
        # Paste logo on QR code
        qr_img.paste(logo, pos)
        qr_img.save(filename)
        return filename

if __name__ == "__main__":
    generator = QRCodeGenerator()
    generator.generate_qr_code("https://www.example.com", "example_qr.png")
    print("QR code generated successfully!")
