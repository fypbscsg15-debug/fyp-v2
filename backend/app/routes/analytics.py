from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.prescription import Prescription
from ..models.alert import Alert
from ..utils.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("")
def get_analytics(
    range_val: str = Query("This Week", alias="range"),
    start: str = None,
    end: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    from datetime import datetime, timedelta, date
    from sqlalchemy import func

    today = date.today()
    now = datetime.utcnow()
    start_date = None
    end_date = None

    # For "Today": use a 24-hour rolling UTC window to avoid timezone mismatches
    if range_val == "Today":
        start_dt = now - timedelta(hours=24)
        end_dt = now

        total_prescriptions = db.query(Prescription).filter(
            Prescription.prescription_date >= start_dt,
            Prescription.prescription_date <= end_dt
        ).count()

        total_errors = db.query(Prescription).filter(
            Prescription.prescription_date >= start_dt,
            Prescription.prescription_date <= end_dt,
            Prescription.status == "error"
        ).count()

        pending_prescriptions = db.query(Prescription).filter(
            Prescription.prescription_date >= start_dt,
            Prescription.prescription_date <= end_dt,
            Prescription.status == "pending"
        ).count()

        # Shift prescriptions: only by the currently logged-in pharmacist (last 24h)
        shift_prescriptions = db.query(Prescription).filter(
            Prescription.prescription_date >= start_dt,
            Prescription.prescription_date <= end_dt,
            Prescription.pharmacist_id == current_user.pharmacist_id
        ).count()

        # Build real-time 4-hour intervals for Today charts
        volume_data = []
        accuracy_data = []
        verification_time = []
        num_intervals = 6
        for i in range(num_intervals):
            interval_start = start_dt + timedelta(hours=i*4)
            interval_end = interval_start + timedelta(hours=4)
            label = interval_start.strftime("%H:%M")

            cnt = db.query(Prescription).filter(
                Prescription.prescription_date >= interval_start,
                Prescription.prescription_date < interval_end
            ).count()

            errs = db.query(Prescription).filter(
                Prescription.prescription_date >= interval_start,
                Prescription.prescription_date < interval_end,
                Prescription.status == "error"
            ).count()

            acc = 100
            if cnt > 0:
                acc = int(((cnt - errs) / cnt) * 100)

            v_time = 2.4 if cnt > 0 else 0.0

            volume_data.append({"day": label, "value": cnt, "target": 8})
            accuracy_data.append({"day": label, "value": acc, "target": 95})
            verification_time.append({"day": label, "value": v_time, "target": 3})

        alert_counts = {
            "interaction": db.query(Alert).join(Prescription).filter(
                Prescription.prescription_date >= start_dt,
                Prescription.prescription_date <= end_dt,
                Alert.alert_type == "interaction"
            ).count(),
            "dosage": db.query(Alert).join(Prescription).filter(
                Prescription.prescription_date >= start_dt,
                Prescription.prescription_date <= end_dt,
                Alert.alert_type == "dosage"
            ).count(),
            "contraindication": db.query(Alert).join(Prescription).filter(
                Prescription.prescription_date >= start_dt,
                Prescription.prescription_date <= end_dt,
                Alert.alert_type == "contraindication"
            ).count(),
            "duplicate": db.query(Alert).join(Prescription).filter(
                Prescription.prescription_date >= start_dt,
                Prescription.prescription_date <= end_dt,
                Alert.alert_type == "duplicate"
            ).count(),
        }

        total_alerts = sum(alert_counts.values())
        if total_alerts > 0:
            top_type = max(alert_counts, key=alert_counts.get)
            top_name = {
                "interaction": "Drug Interactions",
                "dosage": "Dosage Errors",
                "contraindication": "Contraindications",
                "duplicate": "Duplicates"
            }.get(top_type, "Drug Interactions")
            top_percent = int((alert_counts[top_type] / total_alerts) * 100)
        else:
            top_name = "Drug Interactions"
            top_percent = 100

        alert_types_list = [
            {"name": "Drug Interactions", "value": alert_counts["interaction"] or (1 if total_alerts == 0 else 0)},
            {"name": "Dosage Errors", "value": alert_counts["dosage"]},
            {"name": "Contraindications", "value": alert_counts["contraindication"]},
            {"name": "Duplicates", "value": alert_counts["duplicate"]},
        ]

        return {
            "totalPrescriptions": total_prescriptions,
            "shiftPrescriptions": shift_prescriptions,
            "totalErrors": total_errors,
            "pendingVerification": pending_prescriptions,
            "avgVerificationTime": 2.4 if total_prescriptions > 0 else 0.0,
            "topAlert": {"name": top_name, "percent": top_percent},
            "volumeData": volume_data,
            "accuracyData": accuracy_data,
            "alertTypes": alert_types_list,
            "verificationTime": verification_time
        }

    if range_val == "This Week":
        start_date = today - timedelta(days=today.weekday())
        end_date = start_date + timedelta(days=6)
    elif range_val == "This Month":
        start_date = date(today.year, today.month, 1)
        if today.month == 12:
            end_date = date(today.year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
    elif range_val == "Custom" and start and end:
        try:
            start_date = datetime.strptime(start, "%Y-%m-%d").date()
            end_date = datetime.strptime(end, "%Y-%m-%d").date()
        except Exception:
            start_date = today - timedelta(days=6)
            end_date = today
    else:
        start_date = today - timedelta(days=6)
        end_date = today

    start_date_str = start_date.strftime("%Y-%m-%d")
    end_date_str = end_date.strftime("%Y-%m-%d")

    total_prescriptions = db.query(Prescription).filter(
        func.date(Prescription.prescription_date) >= start_date_str,
        func.date(Prescription.prescription_date) <= end_date_str
    ).count()

    total_errors = db.query(Prescription).filter(
        func.date(Prescription.prescription_date) >= start_date_str,
        func.date(Prescription.prescription_date) <= end_date_str,
        Prescription.status == "error"
    ).count()

    pending_prescriptions = db.query(Prescription).filter(
        func.date(Prescription.prescription_date) >= start_date_str,
        func.date(Prescription.prescription_date) <= end_date_str,
        Prescription.status == "pending"
    ).count()

    delta = end_date - start_date
    num_days = delta.days + 1
    
    if num_days > 31:
        num_days = 31
        start_date = end_date - timedelta(days=30)
        start_date_str = start_date.strftime("%Y-%m-%d")

    volume_data = []
    accuracy_data = []
    verification_time = []

    for i in range(num_days):
        current_day = start_date + timedelta(days=i)
        day_str = current_day.strftime("%a" if num_days <= 7 else "%b %d")
        current_day_str = current_day.strftime("%Y-%m-%d")
        
        cnt = db.query(Prescription).filter(
            func.date(Prescription.prescription_date) == current_day_str
        ).count()

        errs = db.query(Prescription).filter(
            func.date(Prescription.prescription_date) == current_day_str,
            Prescription.status == "error"
        ).count()

        acc = 100
        if cnt > 0:
            acc = int(((cnt - errs) / cnt) * 100)

        v_time = 2.4 if cnt > 0 else 0.0

        volume_data.append({"day": day_str, "value": cnt, "target": 50})
        accuracy_data.append({"day": day_str, "value": acc, "target": 95})
        verification_time.append({"day": day_str, "value": v_time, "target": 3})

    alert_counts = {
        "interaction": db.query(Alert).join(Prescription).filter(
            func.date(Prescription.prescription_date) >= start_date_str,
            func.date(Prescription.prescription_date) <= end_date_str,
            Alert.alert_type == "interaction"
        ).count(),
        "dosage": db.query(Alert).join(Prescription).filter(
            func.date(Prescription.prescription_date) >= start_date_str,
            func.date(Prescription.prescription_date) <= end_date_str,
            Alert.alert_type == "dosage"
        ).count(),
        "contraindication": db.query(Alert).join(Prescription).filter(
            func.date(Prescription.prescription_date) >= start_date_str,
            func.date(Prescription.prescription_date) <= end_date_str,
            Alert.alert_type == "contraindication"
        ).count(),
        "duplicate": db.query(Alert).join(Prescription).filter(
            func.date(Prescription.prescription_date) >= start_date_str,
            func.date(Prescription.prescription_date) <= end_date_str,
            Alert.alert_type == "duplicate"
        ).count(),
    }

    total_alerts = sum(alert_counts.values())
    if total_alerts > 0:
        top_type = max(alert_counts, key=alert_counts.get)
        top_name = {
            "interaction": "Drug Interactions",
            "dosage": "Dosage Errors",
            "contraindication": "Contraindications",
            "duplicate": "Duplicates"
        }.get(top_type, "Drug Interactions")
        top_percent = int((alert_counts[top_type] / total_alerts) * 100)
    else:
        top_name = "Drug Interactions"
        top_percent = 100

    alert_types_list = [
        {"name": "Drug Interactions", "value": alert_counts["interaction"] or (1 if total_alerts == 0 else 0)},
        {"name": "Dosage Errors", "value": alert_counts["dosage"]},
        {"name": "Contraindications", "value": alert_counts["contraindication"]},
        {"name": "Duplicates", "value": alert_counts["duplicate"]},
    ]

    return {
        "totalPrescriptions": total_prescriptions,
        "totalErrors": total_errors,
        "pendingVerification": pending_prescriptions,
        "avgVerificationTime": 2.4 if total_prescriptions > 0 else 0.0,
        "topAlert": {"name": top_name, "percent": top_percent},
        "volumeData": volume_data,
        "accuracyData": accuracy_data,
        "alertTypes": alert_types_list,
        "verificationTime": verification_time
    }
