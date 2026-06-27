import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "spss.db")
if not os.path.exists(db_path):
    print("spss.db not found at:", db_path)
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

tables = [
    "audit_logs",
    "prescriptions",
    "prescription_drugs",
    "alerts",
    "instructions",
    "error_logs",
    "interaction_checks",
    "staff_shifts",
    "verification_sessions"
]

for table in tables:
    try:
        cursor.execute(f"DELETE FROM {table};")
        print(f"Cleared table: {table}")
    except sqlite3.OperationalError as e:
        print(f"Skipping table {table} (does not exist or error: {e})")

# Clear patients except Anonymous Patient if exists
try:
    cursor.execute("DELETE FROM patients WHERE name != 'Anonymous Patient';")
    print("Cleared custom patients")
except sqlite3.OperationalError as e:
    print(f"Skipping patients table error: {e}")

conn.commit()
conn.close()
print("Database cleanup complete, boss.")
