# File organizer
import os
import shutil
from pathlib import Path

class FileOrganizer:
    def __init__(self, directory):
        self.directory = Path(directory)
    
    def organize_by_extension(self):
        for file_path in self.directory.iterdir():
            if file_path.is_file():
                extension = file_path.suffix[1:] or 'no_extension'
                folder_path = self.directory / extension
                folder_path.mkdir(exist_ok=True)
                shutil.move(str(file_path), str(folder_path / file_path.name))
    
    def organize_by_date(self):
        for file_path in self.directory.iterdir():
            if file_path.is_file():
                date_folder = file_path.stat().st_mtime
                folder_path = self.directory / str(int(date_folder))
                folder_path.mkdir(exist_ok=True)
                shutil.move(str(file_path), str(folder_path / file_path.name))

if __name__ == "__main__":
    organizer = FileOrganizer("./test_folder")
    organizer.organize_by_extension()
