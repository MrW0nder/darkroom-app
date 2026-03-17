"""
Migration script to update all Layer.content fields in the database to use HTTP-resolvable relative paths.
Run this script once with your backend virtual environment activated.
"""

from sqlalchemy import create_engine, MetaData, Table, select, update
from pathlib import Path
import os


# Use the fallback SQLite database path used by the backend
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///backend/storage/db.sqlite")

engine = create_engine(DATABASE_URL)
metadata = MetaData()
metadata.reflect(bind=engine)
layers = Table('layers', metadata, autoload_with=engine)

with engine.connect() as conn:
    select_stmt = select(layers.c.id, layers.c.content)
    results = conn.execute(select_stmt).fetchall()
    for row in results:
        layer_id, content = row
        if not content:
            continue
        # Only update if content is an absolute path to originals
        if "backend/storage/originals" in content:
            filename = Path(content).name
            new_content = f"/storage/originals/{filename}"
            upd = update(layers).where(layers.c.id == layer_id).values(content=new_content)
            conn.execute(upd)
            print(f"Updated layer {layer_id}: {content} -> {new_content}")
    conn.commit()

print("Migration complete. All layer content fields are now HTTP-resolvable.")
