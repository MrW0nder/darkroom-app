from pathlib import Path
import sqlite3

db = Path("backend/storage/db.sqlite")
orig_dir = Path("backend/storage/originals")

print("DB path:", db.resolve())
print("DB exists:", db.exists())

files = sorted(list(orig_dir.glob("*")), key=lambda p: p.stat().st_mtime, reverse=True)
newest = files[0].name if files else None
print("Newest file in originals:", newest)

conn = sqlite3.connect(str(db))
cur = conn.cursor()

print("\nRecent rows (up to 20):")
for row in cur.execute("SELECT id, filename, filepath, width, height, format, created_at FROM images ORDER BY id DESC LIMIT 20;").fetchall():
    print(row)

if newest:
    print(f"\nRows matching newest file '{newest}':")
    matched = cur.execute("SELECT * FROM images WHERE filename = ? OR filepath LIKE ?;", (newest, f"%{newest}%")).fetchall()
    for r in matched:
        print(r)

conn.close()