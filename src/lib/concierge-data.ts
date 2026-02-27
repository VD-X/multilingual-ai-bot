export const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "te", name: "తెలుగు", flag: "🇮🇳" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
];

export interface Recommendation {
  name: string;
  category: string;
  image_url: string; // Keep for backward compatibility
  images: string[];  // New field for gallery
  detail: string;
  price: string;
}

export interface BookingState {
  type: string;
  pickup?: string;
  dropoff?: string;
  time?: string;
  status: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
  recommendations?: Recommendation[];
  bookingState?: BookingState;
  itineraryPlan?: Record<string, unknown>;
}

export interface Zone {
  id: string;
  name: string;
  safetyScore: number;
  crowdScore: number;
  weatherScore: number;
  priceScore: number;
  reviewScore: number;
  color: "green" | "yellow" | "red";
  overallScore: number;
}

export interface TouristPlace {
  id: string;
  name: string;
  category: string;
  openTime: string;
  closeTime: string;
  bestTime: string;
  ticketPrice: number;
  zone: Zone;
  indoor: boolean;
  image?: string;
}

export interface ItineraryItem {
  time: string;
  place: TouristPlace;
  activity: string;
  clothing: string;
  foodSuggestion?: string;
}

export interface BookingStep {
  label: string;
  completed: boolean;
  value?: string;
}

export const MOCK_ZONES: Zone[] = [
  { id: "z1", name: "Old Town", safetyScore: 85, crowdScore: 60, weatherScore: 75, priceScore: 50, reviewScore: 90, color: "green", overallScore: 74 },
  { id: "z2", name: "Beach District", safetyScore: 90, crowdScore: 70, weatherScore: 80, priceScore: 65, reviewScore: 85, color: "green", overallScore: 79 },
  { id: "z3", name: "Night Market", safetyScore: 55, crowdScore: 85, weatherScore: 70, priceScore: 40, reviewScore: 75, color: "yellow", overallScore: 63 },
  { id: "z4", name: "Industrial Quarter", safetyScore: 30, crowdScore: 20, weatherScore: 60, priceScore: 80, reviewScore: 25, color: "red", overallScore: 38 },
  { id: "z5", name: "Temple District", safetyScore: 95, crowdScore: 45, weatherScore: 70, priceScore: 55, reviewScore: 95, color: "green", overallScore: 76 },
  { id: "z6", name: "Harbor Area", safetyScore: 60, crowdScore: 50, weatherScore: 65, priceScore: 45, reviewScore: 60, color: "yellow", overallScore: 56 },
];

export const MOCK_PLACES: TouristPlace[] = [
  { id: "p1", name: "Grand Palace", category: "Historical", openTime: "08:00", closeTime: "17:00", bestTime: "Morning", ticketPrice: 15, zone: MOCK_ZONES[0], indoor: false },
  { id: "p2", name: "Sunset Beach", category: "Nature", openTime: "06:00", closeTime: "20:00", bestTime: "Afternoon", ticketPrice: 0, zone: MOCK_ZONES[1], indoor: false },
  { id: "p3", name: "Night Bazaar", category: "Shopping", openTime: "18:00", closeTime: "23:00", bestTime: "Evening", ticketPrice: 0, zone: MOCK_ZONES[2], indoor: false },
  { id: "p4", name: "Sacred Temple", category: "Cultural", openTime: "07:00", closeTime: "18:00", bestTime: "Morning", ticketPrice: 5, zone: MOCK_ZONES[4], indoor: true },
  { id: "p5", name: "Aquarium World", category: "Family", openTime: "09:00", closeTime: "19:00", bestTime: "Afternoon", ticketPrice: 20, zone: MOCK_ZONES[1], indoor: true },
];

export const MOCK_ITINERARY: ItineraryItem[] = [
  { time: "08:00 - 10:30", place: MOCK_PLACES[0], activity: "Explore the Grand Palace grounds", clothing: "Light cotton, comfortable shoes, sunhat", foodSuggestion: "Traditional breakfast at nearby café" },
  { time: "11:00 - 13:00", place: MOCK_PLACES[3], activity: "Visit Sacred Temple & meditation garden", clothing: "Modest clothing covering shoulders & knees", foodSuggestion: "Vegetarian lunch at temple courtyard" },
  { time: "14:00 - 16:30", place: MOCK_PLACES[4], activity: "Aquarium World — great for the afternoon heat", clothing: "Casual, light layers (AC inside)", foodSuggestion: "Seafood restaurant next door" },
  { time: "17:00 - 18:30", place: MOCK_PLACES[1], activity: "Sunset Beach — golden hour walk", clothing: "Swimwear, sandals, light cover-up" },
  { time: "19:00 - 22:00", place: MOCK_PLACES[2], activity: "Night Bazaar shopping & street food", clothing: "Comfortable walking shoes, crossbody bag", foodSuggestion: "Street food tour — pad thai, mango sticky rice" },
];

export const EMERGENCY_CONTACTS = [
  { label: "Police", number: "191", icon: "🚔" },
  { label: "Ambulance", number: "1669", icon: "🚑" },
  { label: "Tourist Police", number: "1155", icon: "👮" },
  { label: "Fire Department", number: "199", icon: "🚒" },
  { label: "Embassy Hotline", number: "+1-202-555-0147", icon: "🏛️" },
  { label: "Hotel Reception", number: "0", icon: "🏨" },
];
