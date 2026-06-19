import sys
from datetime import date, timedelta
from sqlalchemy import func
from app.database import SessionLocal
from app.models.prescription import Prescription
from app.models.alert import Alert
from app.routes.analytics import get_analytics

import app.models
db = SessionLocal()
try:
    print("Testing get_analytics function directly...")
    res = get_analytics(range_val="This Week", db=db, current_user=None)
    print("Function result:", res)
    print("Success! No query issues.")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
