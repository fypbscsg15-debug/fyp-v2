import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.prescription import Prescription
from ..models.alert import Alert
from ..models.inventory import Inventory
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

    story.append(Paragraph("SPSS Clinical & Operational Report", title_style))
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Scope: {', '.join(body.selected)}", subtitle_style))
    story.append(Spacer(1, 12))

    if "prescription" in body.selected:
        story.append(Paragraph("1. Prescription Activity Summary", h2_style))
        total = db.query(Prescription).count()
        verified = db.query(Prescription).filter(Prescription.status == "verified").count()
        errors = db.query(Prescription).filter(Prescription.status == "error").count()
        pending = db.query(Prescription).filter(Prescription.status == "pending").count()
        
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

    if "errors" in body.selected:
        story.append(Paragraph("2. Safety & Error Analysis", h2_style))
        ints = db.query(Alert).filter(Alert.alert_type == "interaction").count()
        dos = db.query(Alert).filter(Alert.alert_type == "dosage").count()
        con = db.query(Alert).filter(Alert.alert_type == "contraindication").count()
        dup = db.query(Alert).filter(Alert.alert_type == "duplicate").count()

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

    doc.build(story)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=spss_report.pdf"})
