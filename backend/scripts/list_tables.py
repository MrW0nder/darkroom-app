"""
Script to list all tables in the SQLite database so we can find the correct table name for layers.
"""
from sqlalchemy import create_engine, inspect
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///backend/db.sqlite3")

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

tables = inspector.get_table_names()
print("Tables in the database:")
for table in tables:
    print(f"- {table}")
