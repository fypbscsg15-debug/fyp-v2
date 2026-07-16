import re
import requests
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from ..models.drug import Drug

def clean_text(text_list) -> str:
    if not text_list:
        return ""
    if isinstance(text_list, str):
        text_list = [text_list]
    text = " ".join(text_list)
    # Remove extra spaces/newlines
    text = re.sub(r"\s+", " ", text)
    return text.strip()

# Hardcoded fallbacks for clinical resilience (e.g. offline, timeout, or API limit)
FALLBACK_CONTRAINDICATIONS = {
    "tetracycline": "Contraindicated in pediatric patients under 8 years of age due to risk of permanent tooth discoloration. Avoid in pediatric use.",
    "isotretinoin": "Pregnancy Category X: Highly contraindicated in female patients who are pregnant or may become pregnant due to severe risk of birth defects (teratogenic warnings).",
    "ibuprofen": "Geriatric Warning: Increased risk of serious gastrointestinal adverse events, including bleeding, ulceration, and perforation in elderly patients.",
    "amoxicillin": "Contraindicated in patients with a history of hypersensitivity reactions to penicillin or cephalosporins."
}

def get_fda_contraindications(drug_name: str) -> Optional[str]:
    # Clean drug name to remove dosage details like "500mg" or "500 mg" or "tablet"
    cleaned_name = re.sub(r"\d+\s*(mg|ml|mcg|g|iu|units?|tabs?|caps?)\b", "", drug_name, flags=re.IGNORECASE)
    cleaned_name = re.sub(r"\b(tablet|capsule|injection|syrup|suspension|drops?|cream|gel|ointment)\b", "", cleaned_name, flags=re.IGNORECASE)
    cleaned_name = cleaned_name.strip()
    if not cleaned_name:
        cleaned_name = drug_name

    # Query FDA API searching both brand_name and generic_name
    url = f"https://api.fda.gov/drug/label.json?search=(openfda.brand_name:\"{cleaned_name}\"+OR+openfda.generic_name:\"{cleaned_name}\")&limit=1"
    try:
        response = requests.get(url, timeout=3)  # Fast 3s timeout for better user experience
        if response.status_code == 200:
            data = response.json()
            if "results" in data and len(data["results"]) > 0:
                result = data["results"][0]
                contraindications = result.get("contraindications", [])
                if contraindications:
                    return clean_text(contraindications)
    except Exception:
        # Quietly catch connection/timeout exceptions to prevent terminal clutter
        pass
    
    # Offline/timeout fallback for clinical safety resilience
    norm_name = cleaned_name.lower()
    for key, text in FALLBACK_CONTRAINDICATIONS.items():
        if key in norm_name:
            print(f"[Clinical Safety Engine] Applied offline safety guidelines for: {cleaned_name}")
            return text
            
    return None


def check_contraindications(
    medicines: List[str],
    patient_age: Optional[str] = None,
    patient_gender: Optional[str] = None
) -> List[Dict[str, Any]]:
    alerts = []
    
    # Parse age
    age_val = None
    if patient_age:
        try:
            age_val = int(patient_age)
        except ValueError:
            pass

    for i, med in enumerate(medicines):
        if not med.strip():
            continue
        contra_text = get_fda_contraindications(med)
        if not contra_text:
            continue
        
        # 1. General Contraindication alert
        desc_truncated = contra_text
        if len(desc_truncated) > 300:
            desc_truncated = desc_truncated[:300] + "..."
            
        alerts.append({
            "id": f"contra_gen_{i}_{med.lower().replace(' ', '_')}",
            "severity": "medium",
            "category": "contraindication",
            "title": f"Contraindications for {med}",
            "description": desc_truncated,
            "reference": "FDA Label — Contraindications Section"
        })
        
        # 2. Gender/Pregnancy contraindications
        if patient_gender and patient_gender.lower() == "female":
            preg_keywords = ["pregnancy", "pregnant", "lactation", "breastfeed", "breast-feeding", "nursing mother", "teratogenic", "fetus", "fetal"]
            if any(k in contra_text.lower() for k in preg_keywords):
                alerts.append({
                    "id": f"contra_preg_{i}_{med.lower().replace(' ', '_')}",
                    "severity": "high",
                    "category": "contraindication",
                    "title": f"Pregnancy Warning: {med}",
                    "description": f"Safety concern for female patient. Pregnancy/lactation risks associated with {med}. FDA: {desc_truncated}",
                    "reference": "FDA Label — Pregnancy and Lactation Warnings"
                })

        # 3. Pediatric contraindications
        if age_val is not None and age_val < 18:
            ped_keywords = ["pediatric", "children", "child", "infant", "neonate", "adolescent"]
            if any(k in contra_text.lower() for k in ped_keywords):
                alerts.append({
                    "id": f"contra_ped_{i}_{med.lower().replace(' ', '_')}",
                    "severity": "high",
                    "category": "contraindication",
                    "title": f"Pediatric Warning: {med}",
                    "description": f"Safety concern for pediatric patient (age {age_val}). Contraindications or pediatric warnings associated with {med}. FDA: {desc_truncated}",
                    "reference": "FDA Label — Pediatric Use"
                })

        # 4. Geriatric contraindications
        if age_val is not None and age_val >= 65:
            ger_keywords = ["geriatric", "elderly", "older patients", "older adults"]
            if any(k in contra_text.lower() for k in ger_keywords):
                alerts.append({
                    "id": f"contra_ger_{i}_{med.lower().replace(' ', '_')}",
                    "severity": "medium",
                    "category": "contraindication",
                    "title": f"Geriatric Warning: {med}",
                    "description": f"Safety concern for elderly patient (age {age_val}). Precautions or warnings associated with {med}. FDA: {desc_truncated}",
                    "reference": "FDA Label — Geriatric Use"
                })
                
    return alerts

def parse_dosage_value(dosage_str: str, default_unit: Optional[str] = None) -> Optional[tuple[float, str]]:
    if not dosage_str:
        return None
    m = re.search(r"(\d+(?:\.\d+)?)\s*(mg|ml|mcg|g|iu|units?|tabs?|caps?|puffs?)", dosage_str, re.IGNORECASE)
    if m:
        val = float(m.group(1))
        unit = m.group(2).lower()
        if unit.startswith("tab"):
            unit = "tab"
        elif unit.startswith("cap"):
            unit = "cap"
        elif unit.startswith("unit"):
            unit = "unit"
        return val, unit
    
    # Fallback if no unit is matched, but string has a number
    num_match = re.search(r"(\d+(?:\.\d+)?)", dosage_str)
    if num_match:
        val = float(num_match.group(1))
        return val, default_unit or "mg"
    return None

def check_dosage_errors(
    medicines: List[str],
    dosages: List[str],
    db: Session
) -> List[Dict[str, Any]]:
    alerts = []
    if not dosages or len(dosages) != len(medicines):
        return []

    for i, (med, prescribed_dose) in enumerate(zip(medicines, dosages)):
        if not med.strip() or not prescribed_dose or not prescribed_dose.strip():
            continue

        # Look up drug in database (case insensitive search)
        drug_rec = db.query(Drug).filter(
            (Drug.brand_name.ilike(f"%{med}%")) | 
            (Drug.generic_name.ilike(f"%{med}%"))
        ).first()

        if not drug_rec:
            continue

        # Parse standard dosage and prescribed dosage
        std_parsed = parse_dosage_value(drug_rec.standard_dosage)
        std_unit = std_parsed[1] if std_parsed else "mg"
        presc_parsed = parse_dosage_value(prescribed_dose, default_unit=std_unit)

        if std_parsed and presc_parsed:
            std_val, std_unit = std_parsed
            presc_val, presc_unit = presc_parsed

            # Compare if the units match
            if std_unit == presc_unit:
                if presc_val > std_val:
                    alerts.append({
                        "id": f"dosage_err_{i}_{med.lower().replace(' ', '_')}",
                        "severity": "high",
                        "category": "dosage",
                        "title": f"Dosage Alert: {med}",
                        "description": f"Prescribed dosage ({prescribed_dose}) exceeds the standard recommended dosage ({drug_rec.standard_dosage}) for this drug.",
                        "reference": f"SPSS Clinical Guideline Database — Standard: {drug_rec.standard_dosage}"
                    })
                elif presc_val < std_val * 0.1: # Check for subtherapeutic dosage (10% of standard)
                    alerts.append({
                        "id": f"dosage_warn_{i}_{med.lower().replace(' ', '_')}",
                        "severity": "medium",
                        "category": "dosage",
                        "title": f"Subtherapeutic Dosage Warning: {med}",
                        "description": f"Prescribed dosage ({prescribed_dose}) is significantly below the standard recommended dosage ({drug_rec.standard_dosage}).",
                        "reference": f"SPSS Clinical Guideline Database — Standard: {drug_rec.standard_dosage}"
                    })
    return alerts

def check_duplicate_medicines(
    medicines: List[str],
    db: Session
) -> List[Dict[str, Any]]:
    alerts = []
    seen_exact = set()  # exact cleaned name
    seen_rxcuis = {}   # rxcui -> original input medicine name
    seen_generics = {}  # generic_name -> original input medicine name
    
    for i, med in enumerate(medicines):
        med_clean = med.strip().lower()
        if not med_clean:
            continue
            
        # 1. Check exact name duplication (case insensitive)
        if med_clean in seen_exact:
            original_med = next(m for m in medicines if m.strip().lower() == med_clean)
            alerts.append({
                "id": f"dup_exact_{i}_{med_clean.replace(' ', '_')}",
                "severity": "high",
                "category": "duplicate",
                "title": f"Duplicate Therapy Alert: {med.strip()}",
                "description": f"The medication '{med.strip()}' is prescribed multiple times in this prescription.",
                "reference": "Clinical Guideline: Avoid duplicate active ingredients."
            })
            continue
        seen_exact.add(med_clean)

        # Helper to clean the name for RxNav / Database lookup
        cleaned_name = re.sub(r"\d+\s*(mg|ml|mcg|g|iu|units?|tabs?|caps?|puffs?)\b", "", med, flags=re.IGNORECASE)
        cleaned_name = re.sub(r"\b(tablet|capsule|injection|syrup|suspension|drops?|cream|gel|ointment|inhaler)\b", "", cleaned_name, flags=re.IGNORECASE)
        cleaned_name = cleaned_name.strip()
        if not cleaned_name:
            cleaned_name = med.strip()

        # 2. Try RxNav API Lookup
        api_success = False
        rxcui = None
        try:
            # Query for the RxCUI of the cleaned drug name
            rxcui_url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={requests.utils.quote(cleaned_name)}"
            rxcui_res = requests.get(rxcui_url, timeout=3).json()
            rxnorm_ids = rxcui_res.get("idGroup", {}).get("rxnormId", [])
            if rxnorm_ids:
                rxcui = rxnorm_ids[0]
                # Query related concepts to get the active ingredients (TTY = IN / MIN)
                related_url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/allrelated.json"
                related_res = requests.get(related_url, timeout=3).json()
                concept_groups = related_res.get("allRelatedGroup", {}).get("conceptGroup", [])
                
                # Extract ingredients
                ingredients = []
                for group in concept_groups:
                    if group.get("tty") in ["IN", "MIN"]:
                        for prop in group.get("conceptProperties", []):
                            ingredients.append((prop.get("rxcui"), prop.get("name")))
                
                if ingredients:
                    api_success = True
                    for ing_cui, ing_name in ingredients:
                        if ing_cui in seen_rxcuis:
                            duplicate_with = seen_rxcuis[ing_cui]
                            alerts.append({
                                "id": f"dup_generic_{i}_{med_clean.replace(' ', '_')}",
                                "severity": "high",
                                "category": "duplicate",
                                "title": f"Duplicate Active Ingredient: {ing_name.capitalize()}",
                                "description": f"Multiple prescriptions contain the same active ingredient ({ing_name}): prescribed as '{med.strip()}' and '{duplicate_with}'.",
                                "reference": "RxNorm: Duplicate therapy increases risk of adverse events."
                            })
                        else:
                            seen_rxcuis[ing_cui] = med.strip()
        except Exception:
            # Fall back to local DB if API fails/timeouts
            pass

        # 3. Fallback to Local Database if API didn't resolve anything
        if not api_success:
            # Check database for generic ingredient duplication using the cleaned name
            drug_rec = db.query(Drug).filter(
                (Drug.brand_name.ilike(f"%{cleaned_name}%")) | 
                (Drug.generic_name.ilike(f"%{cleaned_name}%"))
            ).first()

            if drug_rec:
                generic = drug_rec.generic_name.strip().lower()
                if generic in seen_generics:
                    duplicate_with = seen_generics[generic]
                    alerts.append({
                        "id": f"dup_generic_{i}_{med_clean.replace(' ', '_')}",
                        "severity": "high",
                        "category": "duplicate",
                        "title": f"Duplicate Active Ingredient: {drug_rec.generic_name}",
                        "description": f"Multiple prescriptions contain the same active ingredient ({drug_rec.generic_name}): prescribed as '{med.strip()}' and '{duplicate_with}'.",
                        "reference": "Clinical Guideline: Duplicate therapy increases risk of adverse events."
                    })
                else:
                    seen_generics[generic] = med.strip()

    return alerts
