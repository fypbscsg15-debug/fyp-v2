import io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.prescription import Prescription
from ..models.alert import Alert
from ..models.inventory import Inventory
from ..models.audit_log import AuditLog
from ..utils.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

class ReportRequest(BaseModel):
    selected: list[str]
    from_date: str | None = None
    to_date: str | None = None
    pharmacist: str | None = "all"
    severity: str | None = "all"

@router.post("")
def generate_report(
    body: ReportRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not body.from_date or not body.to_date:
        raise HTTPException(
            status_code=400,
            detail="Please select both From and To dates for the report."
        )

    try:
        from_dt = datetime.strptime(body.from_date, "%Y-%m-%d")
        to_dt = datetime.strptime(body.to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Expected YYYY-MM-DD."
        )

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="ReportLab library not installed on backend. Please run 'pip install reportlab' to generate PDFs."
        )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=24,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=12
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=24
    )
    h2_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=14,
        spaceAfter=6
    )
    h3_style = ParagraphStyle(
        "SubSectionHeader",
        parent=styles["Heading3"],
        fontSize=10,
        textColor=colors.HexColor("#475569"),
        spaceBefore=8,
        spaceAfter=4
    )

    from ..models.user import Pharmacist

    # Filter prescriptions by date and pharmacist
    px_query = db.query(Prescription).filter(
        func.date(Prescription.prescription_date, 'localtime') >= body.from_date,
        func.date(Prescription.prescription_date, 'localtime') <= body.to_date
    )

    if body.pharmacist and body.pharmacist != "all":
        px_query = px_query.join(Prescription.pharmacist).filter(
            Pharmacist.name == body.pharmacist
        )

    # Filter alerts by date, pharmacist and severity
    alert_query = db.query(Alert).join(Prescription).filter(
        func.date(Prescription.prescription_date, 'localtime') >= body.from_date,
        func.date(Prescription.prescription_date, 'localtime') <= body.to_date
    )

    if body.pharmacist and body.pharmacist != "all":
        alert_query = alert_query.filter(
            Prescription.pharmacist.has(name=body.pharmacist)
        )

    story.append(Paragraph("SPSS Clinical & Operational Report", title_style))
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Date Range: {body.from_date} to {body.to_date} | Pharmacist: {body.pharmacist} | Severity: {body.severity}", subtitle_style))
    story.append(Spacer(1, 12))

    if "prescription" in body.selected:
        story.append(Paragraph("1. Prescription Activity Summary", h2_style))
        total = px_query.count()
        verified = px_query.filter(Prescription.status == "verified").count()
        errors = px_query.filter(Prescription.status == "error").count()
        pending = px_query.filter(Prescription.status == "pending").count()
        
        data = [
            ["Metric", "Value"],
            ["Total Prescriptions", str(total)],
            ["Verified Successfully", str(verified)],
            ["Flagged with Errors", str(errors)],
            ["Pending Review", str(pending)]
        ]
        t = Table(data, colWidths=[200, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#0f172a")),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
        ]))
        story.append(t)
        story.append(Spacer(1, 12))

        # Add list of prescriptions
        px_list = px_query.order_by(Prescription.prescription_date.desc()).all()
        if px_list:
            story.append(Paragraph("Prescription Activity Details", h3_style))
            details_data = [["Date/Time", "Patient", "Status", "Medicines"]]
            for p in px_list[:20]:
                local_date = p.prescription_date.replace(tzinfo=timezone.utc).astimezone()
                patient_name = p.patient.name if p.patient else "Anonymous"
                meds_names = ", ".join([d.drug_name_raw for d in p.drugs])
                details_data.append([
                    local_date.strftime("%Y-%m-%d %H:%M:%S"),
                    patient_name,
                    p.status.capitalize(),
                    (meds_names[:45] + "...") if len(meds_names) > 45 else meds_names
                ])
            px_table = Table(details_data, colWidths=[110, 90, 70, 210])
            px_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
                ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#334155")),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
            ]))
            story.append(px_table)
            story.append(Spacer(1, 12))

    if "errors" in body.selected:
        story.append(Paragraph("2. Safety & Error Analysis", h2_style))
        
        ints_q = alert_query.filter(Alert.alert_type == "interaction")
        dos_q = alert_query.filter(Alert.alert_type == "dosage")
        con_q = alert_query.filter(Alert.alert_type == "contraindication")
        dup_q = alert_query.filter(Alert.alert_type == "duplicate")

        if body.severity and body.severity != "all":
            ints_q = ints_q.filter(Alert.severity == body.severity)
            dos_q = dos_q.filter(Alert.severity == body.severity)
            con_q = con_q.filter(Alert.severity == body.severity)
            dup_q = dup_q.filter(Alert.severity == body.severity)

        ints = ints_q.count()
        dos = dos_q.count()
        con = con_q.count()
        dup = dup_q.count()

        data = [
            ["Alert Category", "Incidents Detected"],
            ["Drug-Drug Interactions", str(ints)],
            ["Dosage Limit Exceeded", str(dos)],
            ["Contraindications", str(con)],
            ["Therapeutic Duplication", str(dup)]
        ]
        t = Table(data, colWidths=[200, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#0f172a")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
        ]))
        story.append(t)
        story.append(Spacer(1, 12))

    if "inventory" in body.selected:
        story.append(Paragraph("3. Low Stock & Inventory Status", h2_style))
        low_items = db.query(Inventory).filter(Inventory.quantity_in_stock < Inventory.low_stock_threshold).all()
        if low_items:
            data = [["Medication", "Batch", "Stock Qty", "Threshold"]]
            for item in low_items[:10]:
                data.append([
                    item.drug.brand_name if item.drug else f"Drug ID {item.drug_id}",
                    item.batch_number or "—",
                    str(item.quantity_in_stock),
                    str(item.low_stock_threshold)
                ])
        else:
            data = [
                ["Status"],
                ["No low stock items in inventory."]
            ]
        t = Table(data, colWidths=[150, 70, 70, 70] if low_items else [360])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#0f172a")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
        ]))
        story.append(t)
        story.append(Spacer(1, 12))

    if "audit" in body.selected:
        story.append(Paragraph("4. Audit Log & Activities Report", h2_style))
        
        audit_query = db.query(AuditLog).filter(
            func.date(AuditLog.timestamp, 'localtime') >= body.from_date,
            func.date(AuditLog.timestamp, 'localtime') <= body.to_date
        )
        if body.pharmacist and body.pharmacist != "all":
            audit_query = audit_query.filter(AuditLog.user == body.pharmacist)
            
        logs_list = audit_query.order_by(AuditLog.timestamp.desc()).all()
        
        if logs_list:
            data = [["Date/Time", "Action", "Details"]]
            for item in logs_list[:20]:
                data.append([
                    item.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                    item.action or "—",
                    (item.details[:40] + "...") if item.details and len(item.details) > 40 else (item.details or "—")
                ])
        else:
            data = [
                ["Status"],
                ["No activities logged for the selected criteria."]
            ]
            
        t = Table(data, colWidths=[110, 110, 260] if logs_list else [480])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#0f172a")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
        ]))
        story.append(t)
        story.append(Spacer(1, 12))

    doc.build(story)
    buffer.seek(0)
    import base64
    pdf_b64 = base64.b64encode(buffer.read()).decode("utf-8")
    return {"pdf_b64": pdf_b64}
