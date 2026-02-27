import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Globe, Bot, User, Trash2 } from "lucide-react";
import { LANGUAGES, type ChatMessage, type Recommendation, type BookingState } from "@/lib/concierge-data";
import { MapComponent } from "./MapComponent";
import { RideTrackingMap } from "./RideTrackingMap";
import { Map as MapIcon, Image as ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * ImageLightbox: A premium full-screen modal to "zoom in" on landmark photos.
 */
const ImageLightbox = ({ url, onClose }: { url: string; onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
    >
      <motion.button
        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </motion.button>

      <motion.img
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        src={url}
        alt="Enlarged landmark"
        className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
};

const parseRecommendations = (text: string): { cleanText: string, recommendations: Recommendation[] } => {
  const regex = /\[RECOMMENDATIONS:\s*(\[.*?\])\]/s;
  const match = text.match(regex);

  if (match) {
    try {
      const jsonStr = match[1];
      const recommendations = JSON.parse(jsonStr);
      const cleanText = text.replace(regex, "").trim();
      return { cleanText, recommendations };
    } catch (e) {
      console.error("Failed to parse recommendations JSON:", e);
    }
  }

  return { cleanText: text, recommendations: [] };
};

const parseBookingState = (text: string): { cleanText: string, bookingState: BookingState | null } => {
  const regex = /\[BOOKING_STATE:\s*(\{.*?\})\]/s;
  const match = text.match(regex);

  if (match) {
    try {
      const jsonStr = match[1];
      const bookingState = JSON.parse(jsonStr);
      const cleanText = text.replace(regex, "").trim();
      return { cleanText, bookingState };
    } catch (e) {
      console.error("Failed to parse booking_state JSON:", e);
    }
  }

  return { cleanText: text, bookingState: null };
};


const parseItineraryPlan = (text: string): { cleanText: string; itineraryPlan: Record<string, unknown> | null } => {
  // Find the tag marker position
  const marker = "[ITINERARY_PLAN:";
  const markerIdx = text.indexOf(marker);
  if (markerIdx === -1) return { cleanText: text, itineraryPlan: null };

  // Walk forward from the '{' to find the balanced closing '}'
  const braceStart = text.indexOf("{", markerIdx + marker.length);
  if (braceStart === -1) return { cleanText: text, itineraryPlan: null };

  let depth = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < text.length; i++) {
    if (text[i] === "{" || text[i] === "[") depth++;
    else if (text[i] === "}" || text[i] === "]") {
      depth--;
      if (depth === 0) { braceEnd = i; break; }
    }
  }
  if (braceEnd === -1) return { cleanText: text, itineraryPlan: null };

  const jsonStr = text.slice(braceStart, braceEnd + 1);
  // Find the closing ']' after the JSON to strip the full tag
  const tagEnd = text.indexOf("]", braceEnd);
  const fullTag = text.slice(markerIdx, tagEnd + 1);

  try {
    const plan = JSON.parse(jsonStr);
    const cleanText = text.replace(fullTag, "").trim();
    return { cleanText, itineraryPlan: plan };
  } catch (e) {
    console.error("Failed to parse ITINERARY_PLAN JSON:", e, "\nJSON string was:", jsonStr);
    return { cleanText: text, itineraryPlan: null };
  }
};

const BookingCard = ({
  state,
  onConfirm
}: {
  state: BookingState;
  onConfirm: () => void;
}) => {
  const isReady = state.status === "ready";
  const [confirmed, setConfirmed] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ start: [number, number] | null, end: [number, number] | null }>({ start: null, end: null });

  const fetchCoordinates = async (placeName: string): Promise<[number, number] | null> => {
    // Handle the "Current Location" live GPS override from the AI
    if (placeName.includes("Current Location") || placeName.includes("Live GPS") || placeName.includes("[SYSTEM DATA]")) {
      const liveLocStr = localStorage.getItem("current_user_location");
      if (liveLocStr) {
        const [lat, lng] = liveLocStr.split(",").map(n => parseFloat(n.trim()));
        return [lat, lng];
      }
    }

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (error) {
      console.error("Geocoding failed for:", placeName, error);
    }
    return null;
  };

  const handleConfirm = async () => {
    setConfirmed(true);
    onConfirm();

    // If it's a taxi ride, fetch coordinates for the live tracking map
    if (state.type.toLowerCase() === 'taxi' && state.pickup && state.dropoff) {
      const start = await fetchCoordinates(state.pickup);
      const end = await fetchCoordinates(state.dropoff);
      setRouteCoords({ start, end });

      // Persist to localStorage for the Booking tab
      if (start && end) {
        const booking = {
          id: Date.now().toString(),
          type: state.type,
          pickup: state.pickup,
          dropoff: state.dropoff,
          time: state.time || 'Now',
          confirmedAt: new Date().toISOString(),
          startCoords: start,
          endCoords: end,
        };
        const existing = JSON.parse(localStorage.getItem('confirmed_bookings') || '[]');
        existing.unshift(booking); // newest first
        localStorage.setItem('confirmed_bookings', JSON.stringify(existing.slice(0, 10))); // keep last 10
        // Notify the Booking tab to refresh
        window.dispatchEvent(new Event('bookings_updated'));
      }
    }
  };

  const formatLocation = (loc: string) => {
    if (loc.includes("Current Location") || loc.includes("Live GPS") || loc.includes("[SYSTEM DATA]") || loc.match(/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/)) {
      return "📍 Current Location";
    }
    return loc;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card-sm overflow-hidden bg-white/95 border border-primary/20 flex flex-col gap-3 p-4 w-full sm:w-[320px] shadow-lg rounded-2xl"
    >
      <div className="flex items-center gap-2 mb-1 border-b pb-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          {state.type.toLowerCase() === 'taxi' ? '🚕' : '🏨'}
        </div>
        <div>
          <h4 className="font-bold text-sm text-foreground capitalize">{state.type} Booking</h4>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {isReady && !confirmed ? "Ready to Confirm" : confirmed ? "Confirmed" : "Gathering Info..."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        {state.pickup && (
          <div className="flex justify-between border-b pb-1 border-gray-100">
            <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Pickup</span>
            <span className="font-semibold text-right max-w-[150px] truncate" title={state.pickup}>{formatLocation(state.pickup)}</span>
          </div>
        )}
        {state.dropoff && (
          <div className="flex justify-between border-b pb-1 border-gray-100">
            <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Dropoff</span>
            <span className="font-semibold text-right max-w-[150px] truncate" title={state.dropoff}>{formatLocation(state.dropoff)}</span>
          </div>
        )}
        {state.time && (
          <div className="flex justify-between pb-1 border-gray-100">
            <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Time</span>
            <span className="font-semibold">{state.time}</span>
          </div>
        )}
      </div>

      {isReady && !confirmed && (
        <button
          onClick={handleConfirm}
          className="w-full mt-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm"
        >
          Confirm Reservation
        </button>
      )}

      {confirmed && routeCoords.start && routeCoords.end && (
        <div className="w-full h-48 mt-2 rounded-xl overflow-hidden border border-gray-200">
          <RideTrackingMap startCoords={routeCoords.start} endCoords={routeCoords.end} className="h-full w-full" />
        </div>
      )}

      {confirmed && (!routeCoords.start || !routeCoords.end) && (
        <div className="w-full mt-2 bg-green-500/10 text-green-700 font-bold py-2 rounded-xl text-center text-xs flex items-center justify-center gap-1.5 border border-green-500/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Booking Confirmed
        </div>
      )}
    </motion.div>
  );
};

const RecommendationCard = ({
  item,
  onImageClick
}: {
  item: Recommendation;
  onImageClick: (url: string) => void
}) => {
  const [showMap, setShowMap] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  // Build a reliable Unsplash image URL from place name + category
  const getImageUrl = (url: string, name: string, category: string) => {
    // Use the LLM-provided URL first, but build a reliable Unsplash fallback
    const query = encodeURIComponent(`${name} ${category} India travel`);
    return url && url.startsWith('http') ? url : `https://source.unsplash.com/400x300/?${query}`;
  };

  const images = item.images && item.images.length > 0
    ? item.images
    : [getImageUrl(item.image_url, item.name, item.category)];

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((prev) => (prev + 1) % images.length);
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="clay-card-sm overflow-hidden bg-white/95 border border-white/60 flex items-stretch gap-0 h-36 sm:h-32 hover:shadow-md transition-shadow cursor-default group"
    >
      <div className="w-32 sm:w-40 flex-shrink-0 relative overflow-hidden bg-muted">
        {showMap ? (
          <MapComponent placeName={item.name} className="w-full h-full" />
        ) : (
          <div className="relative w-full h-full">
            <img
              src={images[imgIndex]}
              alt={`${item.name} - ${imgIndex + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
              onClick={() => onImageClick(images[imgIndex])}
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                const query = encodeURIComponent(`${item.name} ${item.category} India`);
                el.src = `https://source.unsplash.com/400x300/?${query}`;
              }}
            />

            {/* Gallery Navigation Overlay */}
            {!showMap && images.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between px-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <button
                  onClick={prevImg}
                  className="p-1 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 pointer-events-auto"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextImg}
                  className="p-1 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 pointer-events-auto"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Indicator Dots */}
            {!showMap && images.length > 1 && (
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {images.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? "bg-white scale-110 shadow-sm" : "bg-white/40"}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Toggle Button Overlay */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMap(!showMap);
          }}
          className="absolute top-1.5 left-1.5 p-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-black/60 transition-all z-20"
          title={showMap ? "Show Photo" : "Show Map"}
        >
          {showMap ? <ImageIcon className="w-3.5 h-3.5" /> : <MapIcon className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="px-4 py-2 flex-1 flex flex-col justify-center min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-primary truncate max-w-[120px]">
            {item.category}
          </span>
          <span className="text-[10px] font-extrabold text-success whitespace-nowrap ml-2">{item.price}</span>
        </div>
        <h4 className="font-bold text-foreground text-sm truncate">{item.name}</h4>
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-[1.3] mt-0.5">{item.detail}</p>
      </div>
    </motion.div>
  );
};

const RecommendationList = ({
  items,
  onImageClick
}: {
  items: Recommendation[];
  onImageClick: (url: string) => void
}) => (
  <div className="flex flex-col gap-3 mt-3 w-full">
    {items.map((item, idx) => (
      <RecommendationCard key={idx} item={item} onImageClick={onImageClick} />
    ))}
  </div>
);

const BOT_REPLIES = [
  "I'd be happy to help you with that! Let me check the best options for you.",
  "Great choice! Based on the current weather and zone safety, I recommend visiting the Temple District this morning — it's cool and peaceful.",
  "I've found 3 excellent restaurants near your hotel. Would you prefer Thai, Italian, or seafood?",
  "Your taxi has been arranged! Driver Somchai will arrive in 8 minutes with a blue Toyota Camry.",
  "Today's weather: 32°C, partly cloudy. I suggest light cotton clothing, sunscreen, and staying hydrated. Don't forget a hat!",
  "The Night Market zone is currently YELLOW (moderate crowd). Best to visit after 8 PM when it cools down.",
];

const WELCOME_MSG: ChatMessage = {
  id: "1",
  role: "bot",
  content: "Hi! I'm Mini 👋 Your AI travel companion. I speak 100+ languages — ask me about places, bookings, itineraries, weather, or anything!",
  timestamp: new Date(),
};

const loadSavedMessages = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem("chat_history");
    if (!raw) return [WELCOME_MSG];
    const parsed = JSON.parse(raw) as ChatMessage[];
    // Revive Date objects from ISO strings
    return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [WELCOME_MSG];
  }
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadSavedMessages);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lang, setLang] = useState("en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

  // Persist chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng });
          localStorage.setItem("current_user_location", `${lat}, ${lng}`);
        },
        (err) => console.log("Geolocation permission denied:", err)
      );
    }
  }, []);

  const clearChat = async () => {
    // Clear all chat-related localStorage keys
    localStorage.removeItem("chat_history");

    // Also clear active booking state in the backend
    try {
      await fetch("http://127.0.0.1:8000/api/v1/chat/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotel_id: "H-100" })
      });
    } catch (err) {
      console.error("Failed to reset backend context:", err);
    }

    // Create a brand-new array with a fresh welcome message
    const freshWelcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: "bot",
      content: WELCOME_MSG.content,
      timestamp: new Date(),
    };
    setMessages([freshWelcome]);
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    // 1. Initialize Native Text-to-Speech (Speech Synthesis)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }

    // 2. Initialize Native Speech-to-Text (Speech Recognition)
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;   // Stop recording when user finishes sentence
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);

          // Auto-send the transcribed speech
          setTimeout(() => handleVoiceMessage(transcript), 100);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
        };
      }
    }
  }, []);

  const handleStartRecording = () => {
    if (recognitionRef.current) {
      // Force the microphone to listen in the selected UI language
      recognitionRef.current.lang = lang;
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    } else {
      alert("Your browser does not support Speech Recognition. Please try Google Chrome, Safari, or Edge.");
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const speakText = (text: string) => {
    if (synthRef.current) {
      // Cancel any ongoing speech so new messages don't queue endlessly
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;

      // Attempt to pick a premium voice if the device has one matching the language
      const voices = synthRef.current.getVoices();
      const bestVoice = voices.find(v => v.lang.startsWith(lang));
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      synthRef.current.speak(utterance);
    }
  };

  const handleVoiceMessage = (text: string) => {
    if (!text.trim()) return;
    sendMessageInternal(text);
    setInput("");
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;
    sendMessageInternal(input);
    setInput("");
  };

  const sendMessageInternal = async (content: string) => {
    // 1. Immediately show the user's message in the UI
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: content, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      // 2. Format the messages payload to send to the backend
      const payloadMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // 3. Make the API call to our FastAPI Backend
      const response = await fetch("http://127.0.0.1:8000/api/v1/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: payloadMessages,
          hotel_id: "H-100", // Hardcoded for prototype phase, real apps would read from JWT/Context
          user_location: userLocation ? `${userLocation.lat}, ${userLocation.lng}` : undefined
        })
      });

      if (!response.ok) throw new Error("API Route Failed");

      // 4. Parse the LLM response
      const data = await response.json();
      const rawReply = data.response;

      // Parse for structured recommendations
      const { cleanText: textAfterRecs, recommendations } = parseRecommendations(rawReply);

      // Parse for structured bookings
      const { cleanText: textAfterBooking, bookingState } = parseBookingState(textAfterRecs);

      // Parse for itinerary plan
      const { cleanText: finalText, itineraryPlan } = parseItineraryPlan(textAfterBooking);

      // Save itinerary plan to localStorage so ItineraryPanel can display it
      if (itineraryPlan) {
        localStorage.setItem("current_itinerary", JSON.stringify(itineraryPlan));
        window.dispatchEvent(new Event("itinerary_updated"));
      }

      // 5. Update the UI with the bot's newly generated message
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: finalText,
        timestamp: new Date(),
        recommendations: recommendations.length > 0 ? recommendations : undefined,
        bookingState: bookingState || undefined,
        itineraryPlan: itineraryPlan || undefined
      }]);
      setIsTyping(false);

      // 6. Speak only the clean text aloud
      speakText(finalText);
    } catch (error: any) {
      console.error("Error sending message to API:", error);
      // Fallback in case the python backend isn't running or crashes
      const fallbackReply = `Connection Error: ${error.message}. Please check if the FastAPI backend is running on 127.0.0.1:8000.`;
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "bot", content: fallbackReply, timestamp: new Date() }]);
      setIsTyping(false);
    }
  };

  const selectedLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="clay-card p-5 rounded-3xl flex items-center justify-between mb-4 bg-white/70 backdrop-blur-md border border-white/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Mini</h3>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-zone-green inline-block shadow-sm shadow-zone-green/50 animate-pulse-soft" /> Online
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Clear Chat button */}
          <button
            onClick={clearChat}
            className="p-2.5 rounded-2xl clay-card-sm flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
            title="Clear chat history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>

          <div className="relative">
            <button
              onClick={() => setShowLangPicker(!showLangPicker)}
              className="clay-card-sm px-4 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-medium hover:shadow-lg hover:bg-white transition-all cursor-pointer"
            >
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span>{selectedLang.flag} {selectedLang.name}</span>
            </button>
            <AnimatePresence>
              {showLangPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 clay-card-lg p-2 z-50 w-56 max-h-64 overflow-y-auto"
                >
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setShowLangPicker(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${l.code === lang ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Messages — flex-1 + min-h-0 forces scroll INSIDE this div, not the page */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-5 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex items-end gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === "user" ? "bg-white border border-border" : "bg-primary shadow-primary/20"}`}>
                  {msg.role === "user" ? <User className="w-4 h-4 text-foreground/70" /> : <Bot className="w-4 h-4 text-primary-foreground" />}
                </div>
                <div className="flex flex-col gap-1">
                  <div className={`px-5 py-3.5 rounded-3xl text-[15px] shadow-sm break-words ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm shadow-primary/20" : "clay-card bg-white rounded-bl-sm text-foreground leading-relaxed"}`}>
                    {msg.content}
                  </div>
                  {msg.role === "bot" && msg.recommendations && msg.recommendations.length > 0 && (
                    <RecommendationList items={msg.recommendations} onImageClick={setLightboxImage} />
                  )}
                  {msg.role === "bot" && msg.bookingState && (
                    <div className="mt-2">
                      <BookingCard state={msg.bookingState} onConfirm={async () => {
                        try {
                          const res = await fetch("http://127.0.0.1:8000/api/v1/booking/confirm", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ hotel_id: "H-100" })
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setMessages(prev => [...prev, {
                              id: Date.now().toString(),
                              role: "bot",
                              content: `✅ Your booking has been successfully confirmed! Your reference ID is **${data.reference_id}**. Have a great trip!`,
                              timestamp: new Date()
                            }]);
                            speakText("Your booking has been successfully confirmed!");
                          }
                        } catch (err) {
                          console.error("Failed to confirm booking", err);
                        }
                      }} />
                    </div>
                  )}
                  {msg.role === "bot" && msg.itineraryPlan && (
                    <div className="mt-2 flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2.5 text-sm font-semibold text-primary">
                      <span>🗓️</span>
                      <span>Itinerary saved! View it in the <strong>Itinerary</strong> tab.</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div className="clay-card-sm px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-muted-foreground"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3">
        <div className="clay-card p-2 rounded-full flex items-center gap-3 bg-white/80 backdrop-blur-md border border-white/60">
          <button
            onClick={toggleRecording}
            className={`p-3 rounded-full transition-all ${isRecording ? "bg-destructive text-destructive-foreground animate-pulse-soft shadow-lg shadow-destructive/30" : "bg-white text-muted-foreground hover:bg-gray-50 hover:text-foreground clay-inset"}`}
            title={isRecording ? "Stop recording" : "Start Voice Transcription"}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your message or tap the mic..."
            className="flex-1 bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground/70 outline-none px-2"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim()}
            className="clay-button p-3 rounded-full disabled:opacity-40 disabled:shadow-none disabled:transform-none shadow-md shadow-primary/20"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <ImageLightbox url={lightboxImage} onClose={() => setLightboxImage(null)} />
        )}
      </AnimatePresence>
    </div >
  );
}
