# Email validator
import re

def is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def extract_emails_from_text(text):
    pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    return re.findall(pattern, text)

def validate_email_list(emails):
    valid_emails = []
    invalid_emails = []
    
    for email in emails:
        if is_valid_email(email):
            valid_emails.append(email)
        else:
            invalid_emails.append(email)
    
    return valid_emails, invalid_emails

if __name__ == "__main__":
    test_emails = ["test@example.com", "invalid-email", "user@domain.org"]
    valid, invalid = validate_email_list(test_emails)
    print("Valid:", valid)
    print("Invalid:", invalid)
