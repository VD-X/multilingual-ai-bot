from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import BookingState, Booking
import uuid

router = APIRouter(
    prefix="/booking",
    tags=["booking"]
)

class ConfirmBookingRequest(BaseModel):
    hotel_id: str

@router.post("/confirm")
async def confirm_booking(request: ConfirmBookingRequest, db: Session = Depends(get_db)):
    """
    Finalizes an active booking state into a confirmed booking.
    """
    # Find the current 'ready' booking state
    active_booking = db.query(BookingState).filter(
        BookingState.hotel_id == request.hotel_id,
        BookingState.current_step == "ready"
    ).first()
    
    if not active_booking:
        raise HTTPException(status_code=404, detail="No ready booking state found for this user/hotel.")
        
    try:
        # Create final Confirmed Booking record
        new_booking = Booking(
            hotel_id=active_booking.hotel_id,
            user_id=active_booking.user_id,
            service_type=active_booking.service_type,
            reference_id=f"BK-{str(uuid.uuid4())[:8].upper()}",
            status="confirmed",
            payment_status="pending"
        )
        db.add(new_booking)
        
        # Mark temp state as completed to clear the context
        active_booking.current_step = "completed"
        
        db.commit()
        db.refresh(new_booking)
        
        return {
            "status": "success", 
            "message": f"Successfully booked {new_booking.service_type}",
            "reference_id": new_booking.reference_id,
            "details": active_booking.temp_data_json
        }
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
