import httpx
from pydantic import BaseModel
from typing import List, Dict, Optional
from app.config import settings
from app.services.data_loader import data_loader
import base64
import json

class NVIDIAClient:
    def __init__(self):
        self.api_key = settings.nvidia_api_key
        self.base_url = "https://integrate.api.nvidia.com/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "meta/llama3-70b-instruct",
        temperature: float = 0.5,
        max_tokens: int = 1024,
        booking_context: Optional[str] = None,
        user_location: Optional[str] = None
    ) -> Optional[str]:
        """
        Calls the NVIDIA standard Chat Completions endpoint for general text-to-text.
        """
        # Fetch the loaded Kaggle tourism dataset
        factual_context = data_loader.get_context_for_llm(limit=15)
        
        booking_prompt = f"\n\nActive Booking Context:\n{booking_context}\n" if booking_context else ""
        location_prompt = f"\n\n[SYSTEM DATA] Live User Geolocation: {user_location}\n" if user_location else ""

        # Inject the system persona prompt at the beginning of the conversation history
        system_prompt = {
            "role": "system", 
            "content":        f"""You are a highly helpful, concise, and polite AI Travel Concierge for India. 
        You MUST provide highly accurate and realistic recommendations for food, tourist attractions, and experiences specifically located in the Indian states/cities requested by the user.
        DO NOT invent places. You must primarily base your recommendations on the Verified Indian Tourism Data provided below (if applicable to the user's requested region):
        
        {factual_context}{booking_prompt}{location_prompt}
        
        When a guest asks for recommendations, provide a friendly text response AND append this structured tag at the end:
        [RECOMMENDATIONS: [{{"name": "Exact Place Name", "city": "City Name", "category": "Culture/Food/Nature/Shopping", "image_url": "URL", "detail": "Specific, factual 1-sentence description.", "price": "Free/Range"}}]]
        
        When a guest asks to book a taxi or a hotel, OR you are currently in the middle of gathering booking information, you MUST append this structured tag at the end:
        [BOOKING_STATE: {{"type": "taxi", "pickup": "[Location]", "dropoff": "[Destination]", "time": "[Time]", "status": "gathering_info"}}]
        
        When a guest asks for a trip plan, travel itinerary, OR mentions a budget (₹, INR, budget, days, plan my trip), you MUST append this structured tag at the end instead of RECOMMENDATIONS:
        [ITINERARY_PLAN: {{"destination": "City, State", "days": 3, "budget_total": 15000, "budget_currency": "INR", "generated_at": "ISO_DATETIME", "days_plan": [{{"day": 1, "theme": "Arrival & Heritage", "items": [{{"time": "09:00", "activity": "Visit Charminar", "place": "Charminar, Hyderabad", "cost": 25, "category": "Culture", "tip": "Visit early morning to avoid crowds"}}]}}]}}]
        
        ITINERARY RULES:
        1. Create a realistic day-by-day plan that fits within the stated budget.
        2. For each day, include 3-5 activities with time, place name, estimated cost, category (Culture/Food/Nature/Shopping/Travel), and a practical tip.
        3. Budget must cover: activities + food + local transport. Mention savings tips if budget is tight.
        4. "budget_total" should be the total budget given by the user (number only, no currency symbols).
        5. Always specify the "days" field as an integer equal to the number of trip days.
        
        CRITICAL BOOKING RULES:
        1. If 'pickup' is not explicitly requested by the user, you MUST look at the [SYSTEM DATA] Live User Geolocation above. If it exists, set the 'pickup' value EXACLTY to "Current Location (Live GPS)" without any [SYSTEM DATA] tags. NEVER ask the user for their pickup location if you have their Geolocation.
        2. If 'time' is not explicitly requested by the user (e.g. they just say "book a taxi"), you MUST default 'time' to "Now". DO NOT ask the user for the time.
        3. Change the 'status' to "ready" ONLY when ALL required fields (pickup, dropoff, time) are filled with valid data. If 'dropoff' is missing, ask the user.
        4. When filling out the 'dropoff' location, ALWAYS append the City and State/Country (e.g., "Charminar, Hyderabad, India") to ensure it can be mapped accurately.
        
        Guidelines:
        1. Accuracy is critical. Only suggest real places that exist.
        2. If suggesting multiple places, provide exactly 3 to 5 highly relevant options.
        3. Only generate ONE tag ([RECOMMENDATIONS: ...] OR [BOOKING_STATE: ...] OR [ITINERARY_PLAN: ...]) per response. Keep JSON on a single line at the very END of your message.
        """
        }
        
        # Normalize roles: Frontend uses 'bot', LLM API expects 'assistant'
        normalized_messages = []
        for msg in messages:
            role = "assistant" if msg["role"] == "bot" else msg["role"]
            normalized_messages.append({"role": role, "content": msg["content"]})
        
        # Ensure the system prompt is always the first message
        formatted_messages = [system_prompt] + normalized_messages
        
        payload = {
            "model": model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    return data["choices"][0]["message"]["content"]
                return None
            except Exception as e:
                print(f"Error calling NVIDIA API: {e}")
                # Log this error properly in production
                return None
                
    async def translate_text(
        self,
        text: str,
        target_language: str,
        temperature: float = 0.15,
    ) -> Optional[str]:
        """
        Uses the Mistral Large model as requested by the user for translation tasks.
        """
        model = "mistralai/mistral-large-3-675b-instruct-2512"
        messages = [
            {"role": "system", "content": f"You are a professional translator. Translate the following text into {target_language}. Respond ONLY with the translated text without any conversational filler or quotes."},
            {"role": "user", "content": text}
        ]
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 2048,
            "top_p": 1.00,
            "frequency_penalty": 0.00,
            "presence_penalty": 0.00,
            "stream": False
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    return data["choices"][0]["message"]["content"]
                return None
            except Exception as e:
                print(f"Error calling NVIDIA API (Translation): {e}")
                return None
                
    async def transcribe_audio(self, audio_bytes: bytes) -> Optional[str]:
        """
        Uses NVIDIA STT model (e.g., nvidia/parakeet-rnnt-1.1b) to transcribe audio.
        Assumes the audio is standard webm/mp3/wav bytes.
        """
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        
        # Audio NIM interface usually accepts base64 audio and metadata
        payload = {
            "model": "nvidia/parakeet-rnnt-1.1b", # Default fast accurate ASR
            "audio": audio_b64, # Try sending directly as a base64 string
            "language": "en" 
        }
        
        async with httpx.AsyncClient() as client:
            try:
                # Assuming the standard aio path for STT endpoints on NV API
                response = await client.post(
                    f"{self.base_url}/audio/transcriptions",
                    headers=self.headers,
                    json=payload,
                    timeout=60.0 # Transcription can take a bit longer
                )
                response.raise_for_status()
                data = response.json()
                if "text" in data:
                    return data["text"]
                return None
            except Exception as e:
                print(f"Error calling NVIDIA API (STT): {e}")
                return None

    async def synthesize_speech(self, text: str) -> Optional[bytes]:
        """
        Uses NVIDIA TTS model (e.g., nvidia/fastpitch-hifi-gan) to synthesize speech.
        Returns the raw audio bytes (usually WAV format).
        """
        payload = {
            "model": "nvidia/fastpitch-hifi-gan",
            "text": text,
            "voice": "en-US-JennyNeural" # Example typical voice namespace
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/audio/speech",
                    headers=self.headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                # Assuming the API returns raw bytes for audio content, or base64 if it's JSON
                if response.headers.get("content-type", "").startswith("audio/"):
                    return response.content
                else:
                    # If it returns JSON with a base64 string
                    data = response.json()
                    if "audioContent" in data:
                        return base64.b64decode(data["audioContent"])
                return None
            except Exception as e:
                print(f"Error calling NVIDIA API (TTS): {e}")
                return None

# Singleton instance
nvidia_client = NVIDIAClient()
