import os
import re
import json
import requests
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/dosage", tags=["dosage"])

class DosageCheckRequest(BaseModel):
    medicine: str
    dose: str
    age: str
    api_key: Optional[str] = None

def clean_text(text_list) -> str:
    if not text_list:
        return ""
    if isinstance(text_list, str):
        text_list = [text_list]
    text = " ".join(text_list)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def get_drug_info(drug_name):
    # Clean drug name to remove dosage details like "500mg" or "tablet"
    cleaned_name = re.sub(r"\d+\s*(mg|ml|mcg|g|iu|units?|tabs?|caps?)\b", "", drug_name, flags=re.IGNORECASE)
    cleaned_name = re.sub(r"\b(tablet|capsule|injection|syrup|suspension|drops?|cream|gel|ointment)\b", "", cleaned_name, flags=re.IGNORECASE)
    cleaned_name = cleaned_name.strip()
    if not cleaned_name:
        cleaned_name = drug_name

    # Query FDA API searching both brand_name and generic_name
    url = f"https://api.fda.gov/drug/label.json?search=(openfda.brand_name:\"{cleaned_name}\"+OR+openfda.generic_name:\"{cleaned_name}\")&limit=1"

    try:
        response = requests.get(url, timeout=20)
        if response.status_code != 200:
            # Fallback to search openfda.generic_name directly
            fallback_url = f"https://api.fda.gov/drug/label.json?search=openfda.generic_name:{cleaned_name}&limit=1"
            response = requests.get(fallback_url, timeout=20)
            if response.status_code != 200:
                return None

        data = response.json()
        if "results" not in data or len(data["results"]) == 0:
            return None

        result = data["results"][0]

        dosage = clean_text(result.get("dosage_and_administration", [""]))
        warnings = clean_text(result.get("warnings", [""]))

        # If dosage details are missing from dosage_and_administration, fallback to clinical_pharmacology or similar
        if not dosage:
            dosage = clean_text(result.get("dosage_and_administration_table", [""]))
        if not dosage:
            dosage = clean_text(result.get("indications_and_usage", [""]))

        return {
            "dosage": dosage,
            "warnings": warnings
        }

    except Exception as e:
        print("FDA Error:", e)
        return None

@router.post("/check")
def check_dosage(body: DosageCheckRequest):
    medicine = body.medicine.strip()
    dose = body.dose.strip()
    age = body.age.strip()
    
    # Prioritize provided API key, fallback to environment variable
    api_key = (body.api_key or "").strip() or os.getenv("NVIDIA_API_KEY", "")

    if not medicine:
        raise HTTPException(status_code=400, detail="Medicine name is required")
    if not dose:
        raise HTTPException(status_code=400, detail="Prescribed dose is required")
    if not age:
        raise HTTPException(status_code=400, detail="Patient age is required")
    if not api_key:
        raise HTTPException(
            status_code=400, 
            detail="NVIDIA API Key is required. Please input it in the UI or set NVIDIA_API_KEY in the backend env."
        )

    # Get official FDA data
    drug_data = get_drug_info(medicine)
    if not drug_data or (not drug_data.get("dosage") and not drug_data.get("warnings")):
        raise HTTPException(status_code=404, detail=f"Drug '{medicine}' not found in OpenFDA database")

    prompt = f"""
You are a medication dosage checker.

Medicine: {medicine}
Prescribed Dose: {dose}
Patient Age: {age} years

Official FDA Dosage Information:
{drug_data['dosage']}

FDA Warnings:
{drug_data['warnings']}

Tasks:
1. Determine whether the prescribed dose is safe and appropriate for a patient of age {age}. Classify the prescribed dose as:
   - Normal
   - Low
   - High

2. Give confidence level (e.g., High, Medium, Low).

3. Explain briefly, noting any age-specific considerations (e.g. pediatric/geriatric guidelines) or general warnings if relevant.

Output JSON only in the following format:
{{
  "medicine": "{medicine}",
  "classification": "Normal/Low/High",
  "confidence": "High/Medium/Low",
  "reason": "Brief explanation"
}}
"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "meta/llama-3.1-70b-instruct",
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.1,
        "top_p": 0.7,
        "max_tokens": 500
    }

    try:
        response = requests.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=30
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"NVIDIA API Error: {response.text}"
            )

        completion_data = response.json()
        content = completion_data["choices"][0]["message"]["content"].strip()

        # Parse JSON from model's response (handling markdown tags if model adds them)
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\n", "", content)
            content = re.sub(r"\n```$", "", content)
            content = content.strip()

        result_json = json.loads(content)
        return result_json

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Model response was not valid JSON: {content}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to check dosage: {str(e)}"
        )
