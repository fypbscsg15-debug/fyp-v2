import sys
import os
from pprint import pprint

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.utils.safety import check_contraindications, check_dosage_errors

def run_tests():
    print("==================================================")
    print("Testing openFDA Contraindications Lookup & Rules")
    print("==================================================")
    
    # Test 1: Isotretinoin (highly contraindicated in pregnancy)
    print("\n--- Test 1: Isotretinoin (Female Patient, Age 25) ---")
    alerts_female = check_contraindications(["isotretinoin"], patient_age="25", patient_gender="Female")
    pprint(alerts_female)
    
    # Test 2: Isotretinoin (Male Patient, Age 25)
    print("\n--- Test 2: Isotretinoin (Male Patient, Age 25) ---")
    alerts_male = check_contraindications(["isotretinoin"], patient_age="25", patient_gender="Male")
    pprint(alerts_male)

    # Test 3: Tetracycline (Pediatric Patient, Age 8 - contraindicated due to tooth discoloration)
    print("\n--- Test 3: Tetracycline (Pediatric Patient, Age 8) ---")
    alerts_pediatric = check_contraindications(["tetracycline"], patient_age="8", patient_gender="Male")
    pprint(alerts_pediatric)
    
    # Test 4: Ibuprofen (Geriatric Patient, Age 75)
    print("\n--- Test 4: Ibuprofen (Geriatric Patient, Age 75) ---")
    alerts_geriatric = check_contraindications(["ibuprofen"], patient_age="75", patient_gender="Male")
    pprint(alerts_geriatric)

    print("\n==================================================")
    print("Testing Local Database Drug Dosage Limits")
    print("==================================================")
    db = SessionLocal()
    try:
        # Test 5: Dosage error (Amoxicillin 1000mg when standard is 500mg three times daily)
        print("\n--- Test 5: Dosage Overdose (Amoxicillin 1000mg vs 500mg std) ---")
        dosage_alerts_high = check_dosage_errors(["Amoxicillin"], ["1000mg"], db)
        pprint(dosage_alerts_high)
        
        # Test 6: Dosage low (Amoxicillin 20mg when standard is 500mg three times daily)
        print("\n--- Test 6: Dosage Underdose (Amoxicillin 20mg vs 500mg std) ---")
        dosage_alerts_low = check_dosage_errors(["Amoxicillin"], ["20mg"], db)
        pprint(dosage_alerts_low)
    finally:
        db.close()

    print("\nTests completed successfully.")

if __name__ == "__main__":
    run_tests()
