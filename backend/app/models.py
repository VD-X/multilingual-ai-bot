from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
from sqlalchemy import Enum as SQLAlchemyEnum

class ZoneColor(str, enum.Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"

class RoleEnum(str, enum.Enum):
    USER = "user"
    BOT = "bot"

class Hotel(Base):
    __tablename__ = "hotels"
    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(String, unique=True, index=True, nullable=False) # e.g. "H-100"
    name = Column(String, nullable=False)
    stars = Column(Integer, default=3)
    price_per_night = Column(Float, default=0.0)
    amenities = Column(JSON, default=list) # e.g. ["pool", "spa"]
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Zone(Base):
    __tablename__ = "zones"
    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(String, index=True, nullable=False) # Multi-tenant
    area_name = Column(String, nullable=False)
    safety_score = Column(Integer, default=100)
    crowd_score = Column(Integer, default=50)
    weather_score = Column(Integer, default=50)
    price_score = Column(Integer, default=50)
    review_score = Column(Integer, default=50)
    zone_color = Column(SQLAlchemyEnum(ZoneColor), default=ZoneColor.GREEN)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(String, index=True, nullable=False)
    language = Column(String, default="en")
    budget_pref = Column(String, default="medium")
    mood_pref = Column(String, default="relaxed")
    currency = Column(String, default="USD")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String, index=True, nullable=False)
    role = Column(SQLAlchemyEnum(RoleEnum), nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
class BookingState(Base):
    __tablename__ = "booking_state"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    hotel_id = Column(String, index=True, nullable=False)
    service_type = Column(String, nullable=False) # e.g., "taxi", "restaurant"
    current_step = Column(String, nullable=False)
    temp_data_json = Column(JSON, default=dict)
    
class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(String, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    service_type = Column(String, nullable=False)
    reference_id = Column(String, nullable=False)
    status = Column(String, default="pending")
    payment_status = Column(String, default="unpaid")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TouristPlace(Base):
    __tablename__ = "tourist_places"
    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    open_time = Column(String, nullable=False)
    close_time = Column(String, nullable=False)
    best_time = Column(String, nullable=False)
    ticket_price = Column(Float, default=0.0)
    zone_id = Column(Integer, ForeignKey("zones.id"))
    indoor_outdoor = Column(String, default="outdoor")
    image_url = Column(String, nullable=True)

class Restaurant(Base):
    __tablename__ = "restaurants"
    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    cuisine = Column(String, nullable=False)
    budget_level = Column(String, default="medium")
    open_time = Column(String, nullable=False)
    close_time = Column(String, nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"))
    image_url = Column(String, nullable=True)

class TaxiDriver(Base):
    __tablename__ = "taxi_drivers"
    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    car_type = Column(String, nullable=False)
    price_per_km = Column(Float, default=0.0)
    available = Column(Boolean, default=True)
    zone_id = Column(Integer, ForeignKey("zones.id"))
    image_url = Column(String, nullable=True)
