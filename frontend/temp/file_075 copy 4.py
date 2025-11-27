# Date utilities
from datetime import datetime, timedelta

def days_between(date1, date2):
    return abs((date2 - date1).days)

def add_days(date_str, days):
    date = datetime.strptime(date_str, '%Y-%m-%d')
    new_date = date + timedelta(days=days)
    return new_date.strftime('%Y-%m-%d')

def is_weekend(date_str):
    date = datetime.strptime(date_str, '%Y-%m-%d')
    return date.weekday() >= 5

if __name__ == '__main__':
    print('Days between:', days_between(datetime(2023, 1, 1), datetime(2023, 1, 10)))
