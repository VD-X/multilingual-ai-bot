from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from app.services.nvidia_client import nvidia_client
from app.database import get_db
from app.models import BookingState
import re
import json
import base64
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/chat",
    tags=["chat", "audio"]
)

class TTSRequest(BaseModel):
    text: str

@router.post("/audio/speech-to-text")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Accepts an audio file upload (webm, wav, etc.) from the frontend and transcribes it using NVIDIA STT.
    """
    try:
        audio_bytes = await file.read()
        transcription = await nvidia_client.transcribe_audio(audio_bytes=audio_bytes)
        
        if not transcription:
            raise HTTPException(status_code=500, detail="Failed to transcribe audio via AI model")
            
        return {"text": transcription}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/audio/text-to-speech")
async def text_to_speech(request: TTSRequest):
    """
    Accepts text and returns a synthesized speech audio file (WAV format) from NVIDIA TTS.
    """
    try:
        audio_content = await nvidia_client.synthesize_speech(text=request.text)
        
        if not audio_content:
            raise HTTPException(status_code=500, detail="Failed to synthesize speech via AI model")
            
        # Return raw audio bytes to the client
        return Response(content=audio_content, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TranslationRequest(BaseModel):
    text: str
    target_language: str

class ChatMessage(BaseModel):
    role: str
    content: str
    
class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    hotel_id: str
    user_location: Optional[str] = None

class ResetRequest(BaseModel):
    hotel_id: str

@router.post("/translate")
async def translate_text(request: TranslationRequest):
    """
    Translates text into the target language using Mistral Large model via NVIDIA.
    """
    try:
        translated_text = await nvidia_client.translate_text(
            text=request.text,
            target_language=request.target_language
        )
        if not translated_text:
            raise HTTPException(status_code=500, detail="Failed to get translation from AI model")
            
        return {"translated_text": translated_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/message")
async def send_message(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Sends a message to the AI agent and gets a response using Llama3-70b via NVIDIA.
    """
    # Convert pydantic models to dicts for the NVIDIA client
    dict_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    # Check for active booking state context (only if updated in last 2 hours)
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    active_booking = db.query(BookingState).filter(
        BookingState.hotel_id == request.hotel_id,
        BookingState.current_step != "completed",
        BookingState.updated_at >= two_hours_ago
    ).first()
    
    booking_context_str = None
    if active_booking:
        booking_context_str = f"Service: {active_booking.service_type}, Status: {active_booking.current_step}, Data: {json.dumps(active_booking.temp_data_json)}"
        
    try:
        response_text = await nvidia_client.generate_response(
            messages=dict_messages,
            booking_context=booking_context_str,
            user_location=request.user_location
        )
        if not response_text:
            raise HTTPException(status_code=500, detail="Failed to get response from AI model")
            
        # Fast Response: Replace real-time images with a proxy URL
        # The frontend will load these images asynchronously
        rec_match = re.search(r"\[RECOMMENDATIONS:\s*(\[.*\])\]", response_text, re.DOTALL | re.IGNORECASE)
        if rec_match:
            try:
                rec_json_str = rec_match.group(1)
                recommendations = json.loads(rec_json_str)
                
                for idx, rec in enumerate(recommendations):
                    import urllib.parse
                    name = rec.get("name", "Unknown")
                    city = rec.get("city", "India")
                    category = rec.get("category", "tourism")
                    
                    safe_name = urllib.parse.quote(name)
                    safe_city = urllib.parse.quote(city)
                    safe_category = urllib.parse.quote(category)
                    
                    # Apply a per-card offset to ensure unique images across the entire response
                    # Card 0: indices 0,1,2 | Card 1: indices 3,4,5 | Card 2: indices 6,7,8 etc.
                    offset = idx * 3
                    base_proxy = f"http://127.0.0.1:8000/api/v1/chat/recommendation-image?name={safe_name}&category={safe_category}&city={safe_city}"
                    rec["image_url"] = f"{base_proxy}&index={offset}"
                    rec["images"] = [
                        f"{base_proxy}&index={offset}",
                        f"{base_proxy}&index={offset + 1}",
                        f"{base_proxy}&index={offset + 2}"
                    ]
                
                # Update the tag with internal proxy URLs
                updated_rec_tag = f"[RECOMMENDATIONS: {json.dumps(recommendations)}]"
                response_text = response_text.replace(rec_match.group(0), updated_rec_tag)
                
            except Exception as parse_err:
                print(f"Error setting proxy URLs: {parse_err}")
            
        # Parse internal Booking State and save to Postgres
        booking_match = re.search(r"\[BOOKING_STATE:\s*(\{.*\})\]", response_text, re.DOTALL | re.IGNORECASE)
        if booking_match:
            try:
                booking_json_str = booking_match.group(1)
                booking_json = json.loads(booking_json_str)
                service_type = booking_json.get("type", "booking")
                status = booking_json.get("status", "gathering_info")
                
                if not active_booking:
                    active_booking = BookingState(
                        hotel_id=request.hotel_id,
                        service_type=service_type,
                        current_step=status,
                        temp_data_json=booking_json
                    )
                    db.add(active_booking)
                else:
                    active_booking.service_type = service_type
                    active_booking.current_step = status
                    active_booking.temp_data_json = booking_json
                db.commit()
            except Exception as parse_err:
                print(f"Error parsing booking state JSON: {parse_err}")
                
        return {"response": response_text}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset")
async def reset_chat(request: ResetRequest, db: Session = Depends(get_db)):
    """
    Clears any active (non-completed) booking states for the user.
    """
    try:
        db.query(BookingState).filter(
            BookingState.hotel_id == request.hotel_id,
            BookingState.current_step != "completed"
        ).delete()
        db.commit()
        return {"status": "success", "message": "Chat context reset successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendation-image")
async def get_recommendation_image(name: str, category: str = "tourism", city: str = "Hyderabad", index: int = 0):
    """
    Triple Accuracy Chain Image Proxy:
    1. WikiData (SPARQL): 100% accurate entity-verified photos (Primary).
    2. Unsplash (Professional): Official API for stunning visuals.
    3. LoremFlickr: Final search fallback.
    """
    from fastapi.responses import RedirectResponse
    import httpx
    import re
    from app.config import settings
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    clean_name = name.strip()
    
    async with httpx.AsyncClient() as client:
        # TIER 1: WikiData (Structured Database - 100% Accurate)
        try:
            # Flexible case-insensitive query for the item and its image
            # We try both the original name and the name with underscores
            l_name = clean_name.lower()
            u_name = l_name.replace(" ", "_")
            sparql = f"""
            SELECT ?image WHERE {{
              ?item rdfs:label ?label.
              FILTER(LCASE(STR(?label)) IN ("{l_name}", "{u_name}"))
              ?item wdt:P18 ?image.
              SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
            }} LIMIT 1
            """
            wiki_url = "https://query.wikidata.org/sparql"
            w_resp = await client.get(wiki_url, params={"query": sparql, "format": "json"}, headers=headers, timeout=5.0)
            if w_resp.status_code == 200:
                w_data = w_resp.json()
                bindings = w_data.get("results", {}).get("bindings", [])
                if bindings:
                    # If we have multiple images in WikiData, we can use the index
                    # but usually it only has 1 main P18 image.
                    # We'll use WikiData only for index 0 to ensure 100% accuracy for the main shot.
                    if index == 0:
                        img_url = bindings[0]["image"]["value"]
                        if img_url:
                            return RedirectResponse(url=img_url)
        except Exception as e:
            print(f"WikiData Proxy Error: {e}")

        # TIER 2: Unsplash (Professional API)
        try:
            # Improve query for relevance by adding category
            u_query = f"{clean_name} {category} {city}"
            if settings.unsplash_access_key:
                # Official API - pull more (20) to ensure uniqueness across multiple cards 
                unsplash_url = f"https://api.unsplash.com/search/photos?query={u_query}&per_page=20"
                u_headers = {**headers, "Authorization": f"Client-ID {settings.unsplash_access_key}"}
                u_resp = await client.get(unsplash_url, headers=u_headers, timeout=5.0)
                
                if u_resp.status_code == 200:
                    u_data = u_resp.json()
                    u_results = u_data.get("results", [])
                    if len(u_results) > index:
                        u_img = u_results[index].get("urls", {}).get("regular")
                        if u_img:
                            return RedirectResponse(url=u_img)
            else:
                # Fallback NAPI (Public endpoint)
                unsplash_url = f"https://unsplash.com/napi/search/photos?query={u_query}&per_page=20"
                u_resp = await client.get(unsplash_url, headers=headers, timeout=5.0)

                if u_resp.status_code == 200:
                    u_data = u_resp.json()
                    u_results = u_data.get("results", [])
                    # The public NAPI sometimes returns fewer results or a different structure
                    # We ensure we modulo the index against available results so it doesn't crash
                    if u_results:
                        safe_index = index % len(u_results)
                        u_img = u_results[safe_index].get("urls", {}).get("regular")
                        if u_img:
                            return RedirectResponse(url=u_img)
        except Exception as e:
            print(f"Unsplash Proxy Error: {e}")

    # TIER 3: Final Fallback (LoremFlickr)
    safe_name = re.sub(r'[^a-zA-Z0-9]', '', clean_name.lower())
    fallback_url = f"https://loremflickr.com/600/400/{city.lower()},{safe_name}/all?lock={index}"
    return RedirectResponse(url=fallback_url)
