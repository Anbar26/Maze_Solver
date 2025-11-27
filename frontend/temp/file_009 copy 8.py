# Database connection manager
import sqlite3
import json
from contextlib import contextmanager

class DatabaseManager:
    def __init__(self, db_path):
        self.db_path = db_path
    
    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def create_table(self, table_name, columns):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            column_defs = ', '.join([f"{col} {dtype}" for col, dtype in columns.items()])
            cursor.execute(f"CREATE TABLE IF NOT EXISTS {table_name} ({column_defs})")
            conn.commit()
    
    def insert_data(self, table_name, data):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            columns = ', '.join(data.keys())
            placeholders = ', '.join(['?' for _ in data])
            query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
            cursor.execute(query, list(data.values()))
            conn.commit()
    
    def fetch_all(self, table_name):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM {table_name}")
            return [dict(row) for row in cursor.fetchall()]

if __name__ == "__main__":
    db = DatabaseManager("test.db")
    db.create_table("users", {"id": "INTEGER PRIMARY KEY", "name": "TEXT", "email": "TEXT"})
    db.insert_data("users", {"name": "John Doe", "email": "john@example.com"})
    users = db.fetch_all("users")
    print(users)
