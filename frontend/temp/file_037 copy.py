# File utilities
import os
import shutil

def get_file_size(filepath):
    return os.path.getsize(filepath)

def copy_file(source, destination):
    shutil.copy2(source, destination)

def list_files(directory, extension=None):
    files = []
    for file in os.listdir(directory):
        if os.path.isfile(os.path.join(directory, file)):
            if extension is None or file.endswith(extension):
                files.append(file)
    return files

if __name__ == '__main__':
    print('Current directory files:', list_files('.'))
