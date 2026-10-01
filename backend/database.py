import sqlite3

DB_NAME = "fleet.db"

conn = sqlite3.connect(DB_NAME)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT,
    driver_id TEXT,
    speed REAL,
    acceleration REAL,
    braking REAL,
    fuel_consumption REAL
)
""")

conn.commit()
conn.close()

print("SQLite database created successfully!")
