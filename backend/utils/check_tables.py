from pathlib import Path
import sqlite3
db = Path("backend/storage/db.sqlite")
print("DB path:", db.resolve())
print("DB exists:", db.exists())
if not db.exists():
    print("ERROR: DB file not found. Aborting.")
    raise SystemExit(1)

conn = sqlite3.connect(str(db))
cur = conn.cursor()
tables = [row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
print("tables:", tables)

if "images" in tables:
    print("\nimages table columns (PRAGMA table_info(images)):")
    for row in cur.execute("PRAGMA table_info(images);").fetchall():
        print(row)
else:
    print("\nimages table NOT found in the database.")

conn.close()