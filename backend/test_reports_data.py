import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "spss.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Pharmacists ---")
cursor.execute("SELECT pharmacist_id, name, email FROM pharmacists;")
for r in cursor.fetchall():
    print(r)

print("\n--- Prescriptions ---")
cursor.execute("SELECT prescription_id, patient_id, pharmacist_id, prescription_date, status FROM prescriptions;")
for r in cursor.fetchall():
    print(r)

print("\n--- Staff Shifts ---")
cursor.execute("SELECT shift_id, staff_name, start_time, end_time FROM staff_shifts;")
for r in cursor.fetchall():
    print(r)

conn.close()
