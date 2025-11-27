# Password generator
import random
import string

def generate_password(length=12, include_symbols=True):
    characters = string.ascii_letters + string.digits
    if include_symbols:
        characters += "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    password = ''.join(random.choice(characters) for _ in range(length))
    return password

def generate_multiple_passwords(count=5, length=12):
    passwords = []
    for _ in range(count):
        passwords.append(generate_password(length))
    return passwords

if __name__ == "__main__":
    print("Generated password:", generate_password())
    print("Multiple passwords:", generate_multiple_passwords(3))
