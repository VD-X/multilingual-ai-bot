from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app import models
import random

def seed_db():
    # Optional: Clear existing data for a fresh start in prototype phase
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Create a Default Hotel
        hotel = models.Hotel(
            hotel_id="H-100",
            name="The Grand Azure Resort",
            stars=5,
            price_per_night=450.0,
            amenities=["pool", "spa", "gym", "beach_access", "free_wifi"]
        )
        db.add(hotel)
        db.flush()

        # 2. Create Zones
        zones = [
            models.Zone(hotel_id="H-100", area_name="Old Town", safety_score=95, crowd_score=40, zone_color=models.ZoneColor.GREEN),
            models.Zone(hotel_id="H-100", area_name="Night Market", safety_score=85, crowd_score=90, zone_color=models.ZoneColor.YELLOW),
            models.Zone(hotel_id="H-100", area_name="Temple District", safety_score=98, crowd_score=20, zone_color=models.ZoneColor.GREEN),
            models.Zone(hotel_id="H-100", area_name="Riverside", safety_score=70, crowd_score=80, zone_color=models.ZoneColor.YELLOW),
            models.Zone(hotel_id="H-100", area_name="Central Plaza", safety_score=60, crowd_score=95, zone_color=models.ZoneColor.RED),
        ]
        db.add_all(zones)
        db.flush()

        # 3. Create Tourist Places
        places = [
            models.TouristPlace(
                hotel_id="H-100",
                name="Emerald Buddha Temple",
                category="Culture",
                open_time="08:30",
                close_time="15:30",
                best_time="Morning",
                ticket_price=15.0,
                zone_id=zones[2].id,
                indoor_outdoor="Outdoor",
                image_url="https://images.unsplash.com/photo-1528181304800-2f140819898f?auto=format&fit=crop&w=800&q=80"
            ),
            models.TouristPlace(
                hotel_id="H-100",
                name="Riverside Night Walk",
                category="Sightseeing",
                open_time="18:00",
                close_time="23:00",
                best_time="Night",
                ticket_price=0.0,
                zone_id=zones[3].id,
                indoor_outdoor="Outdoor",
                image_url="https://images.unsplash.com/photo-1590012357758-29933b44497a?auto=format&fit=crop&w=800&q=80"
            ),
            models.TouristPlace(
                hotel_id="H-100",
                name="Ancient Fortress Park",
                category="History",
                open_time="09:00",
                close_time="17:00",
                best_time="Afternoon",
                ticket_price=5.0,
                zone_id=zones[0].id,
                indoor_outdoor="Outdoor",
                image_url="https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80"
            ),
        ]
        db.add_all(places)

        # 4. Create Restaurants
        restaurants = [
            models.Restaurant(
                hotel_id="H-100",
                name="The Spicy Orchid",
                cuisine="Thai Fusion",
                budget_level="Medium",
                open_time="11:00",
                close_time="22:00",
                zone_id=zones[0].id,
                image_url="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80"
            ),
            models.Restaurant(
                hotel_id="H-100",
                name="Skyline Lounge",
                cuisine="Molecular Gastronomy",
                budget_level="High",
                open_time="17:00",
                close_time="01:00",
                zone_id=zones[4].id,
                image_url="https://images.unsplash.com/photo-1514315384763-ba401779410f?auto=format&fit=crop&w=800&q=80"
            ),
        ]
        db.add_all(restaurants)

        # 5. Create Taxi Drivers
        drivers = [
            models.TaxiDriver(
                hotel_id="H-100",
                name="Somchai",
                car_type="Toyota Camry (VIP)",
                price_per_km=2.5,
                available=True,
                zone_id=zones[0].id,
                image_url="https://images.unsplash.com/photo-1559413649-65522d59f175?auto=format&fit=crop&w=800&q=80"
            ),
            models.TaxiDriver(
                hotel_id="H-100",
                name="Ananda",
                car_type="Tesla Model 3",
                price_per_km=3.0,
                available=True,
                zone_id=zones[2].id,
                image_url="https://images.unsplash.com/photo-1617788130097-15292356f98d?auto=format&fit=crop&w=800&q=80"
            ),
        ]
        db.add_all(drivers)

        db.commit()
        print("Database seeded successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
