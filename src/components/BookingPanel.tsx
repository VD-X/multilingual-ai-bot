import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, UtensilsCrossed, Hotel, CheckCircle2, MapPin,
  Clock, ArrowRight, Trash2, ChevronDown, ChevronUp
} from "lucide-react";
import { RideTrackingMap } from "./RideTrackingMap";
import { NearbyPlaces } from "./NearbyPlaces";

interface ConfirmedBooking {
  id: string;
  type: string;
  pickup: string;
  dropoff: string;
  time: string;
  confirmedAt: string;
  startCoords: [number, number];
  endCoords: [number, number];
}

const BOOKING_TYPES = [
  { id: "taxi", label: "Taxi", icon: Car, color: "text-ocean" },
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed, color: "text-accent" },
  { id: "hotel", label: "Hotel", icon: Hotel, color: "text-gold" },
];

const formatLocation = (loc: string) => {
  if (
    loc.includes("Current Location") ||
    loc.includes("Live GPS") ||
    loc.includes("[SYSTEM DATA]") ||
    loc.match(/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/)
  ) return "📍 Current Location";
  return loc;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ─── LocationSection: shows NearbyPlaces for one coordinate source ───────
const LocationSection = ({
  coords,
  label,
  filterType,
}: {
  coords: [number, number];
  label: string;
  filterType: "restaurant" | "hotel";
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white/70">
      <button
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-lg">{filterType === "restaurant" ? "🍽️" : "🏨"}</span>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{label}</p>
          <p className="text-[10px] text-muted-foreground">
            Tap to see nearby {filterType}s
          </p>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-3 pb-3"
          >
            <NearbyPlaces
              coords={coords}
              label={label}
              defaultFilter={filterType}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────
export default function BookingPanel() {
  const [activeTab, setActiveTab] = useState<"taxi" | "restaurant" | "hotel">("taxi");
  const [confirmedBookings, setConfirmedBookings] = useState<ConfirmedBooking[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<Record<string, string>>({});
  const [liveCoords, setLiveCoords] = useState<[number, number] | null>(null);

  const loadBookings = () => {
    try {
      const data: ConfirmedBooking[] = JSON.parse(
        localStorage.getItem("confirmed_bookings") || "[]"
      );
      setConfirmedBookings(data);
      if (data.length > 0 && !expandedId) setExpandedId(data[0].id);
    } catch {
      setConfirmedBookings([]);
    }
  };

  useEffect(() => {
    loadBookings();

    const handleSync = (e: StorageEvent) => {
      if (e.key === "confirmed_bookings") loadBookings();
    };

    window.addEventListener("bookings_updated", loadBookings);
    window.addEventListener("storage", handleSync);

    // Check for user location sync too
    const locStr = localStorage.getItem("current_user_location");
    if (locStr) {
      const [lat, lng] = locStr.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) setLiveCoords([lat, lng]);
    }

    return () => {
      window.removeEventListener("bookings_updated", loadBookings);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const removeBooking = (id: string) => {
    const updated = confirmedBookings.filter((b) => b.id !== id);
    localStorage.setItem("confirmed_bookings", JSON.stringify(updated));
    setConfirmedBookings(updated);
    if (expandedId === id) setExpandedId(updated[0]?.id || null);
  };

  const toggleSection = (bookingId: string, section: string) => {
    setExpandedSection((prev) => ({
      ...prev,
      [bookingId]: prev[bookingId] === section ? "" : section,
    }));
  };

  // ─── Collect all unique location sources for restaurant/hotel tabs ──
  const locationSources: Array<{ coords: [number, number]; label: string }> = [];
  if (liveCoords) {
    locationSources.push({ coords: liveCoords, label: "Your Current Location" });
  }
  confirmedBookings.forEach((b) => {
    locationSources.push({
      coords: b.endCoords,
      label: formatLocation(b.dropoff),
    });
  });

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold text-foreground">Book Services</h2>

      {/* Tab selector */}
      <div className="flex gap-3">
        {BOOKING_TYPES.map((type) => (
          <motion.button
            key={type.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(type.id as any)}
            className={`clay-card flex-1 p-4 rounded-3xl flex flex-col items-center gap-2 transition-all cursor-pointer ${activeTab === type.id
              ? "ring-2 ring-primary shadow-lg bg-primary/5 border-primary/20"
              : "border-transparent hover:bg-white/90"
              }`}
          >
            <type.icon className={`w-6 h-6 ${type.color} ${activeTab === type.id ? "animate-bounce" : ""}`} />
            <span className="text-[13px] font-bold text-foreground">{type.label}</span>
          </motion.button>
        ))}
      </div>

      {/* ══════ TAXI TAB ══════ */}
      <AnimatePresence mode="wait">
        {activeTab === "taxi" && (
          <motion.div
            key="taxi"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Near current location (collapsible) */}
            {liveCoords && (
              <div className="clay-card-lg rounded-[1.5rem] bg-white/80 backdrop-blur-md border border-primary/10 overflow-hidden">
                <button
                  className="w-full p-4 flex items-center gap-3 text-left"
                  onClick={() =>
                    setExpandedSection((prev) => ({
                      ...prev,
                      _current: prev._current === "nearby" ? "" : "nearby",
                    }))
                  }
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg">📍</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-foreground">Near Your Current Location</p>
                    <p className="text-xs text-muted-foreground">Restaurants & Hotels around you</p>
                  </div>
                  {expandedSection._current === "nearby" ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <AnimatePresence>
                  {expandedSection._current === "nearby" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden px-4 pb-4"
                    >
                      <NearbyPlaces coords={liveCoords} label="Your Current Location" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Confirmed bookings */}
            {confirmedBookings.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h3 className="font-bold text-base text-foreground">Your Confirmed Rides</h3>
                  <span className="ml-auto text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
                    {confirmedBookings.length} booking{confirmedBookings.length > 1 ? "s" : ""}
                  </span>
                </div>
                <AnimatePresence>
                  {confirmedBookings.map((booking) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="clay-card-lg rounded-[1.5rem] overflow-hidden bg-white/80 backdrop-blur-md border border-green-200/60 shadow-sm"
                    >
                      <button
                        className="w-full p-4 flex items-center gap-3 text-left hover:bg-green-50/40 transition-colors"
                        onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                      >
                        <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-xl flex-shrink-0">🚕</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="font-bold text-sm text-foreground truncate">{formatLocation(booking.pickup)}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-bold text-sm text-foreground truncate">{formatLocation(booking.dropoff)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {booking.time === "Now" ? "Immediate" : booking.time}
                            </span>
                            <span className="text-green-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {formatTime(booking.confirmedAt)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeBooking(booking.id); }}
                          className="p-2 rounded-full hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </button>

                      <AnimatePresence>
                        {expandedId === booking.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-2 grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-muted/30 rounded-xl p-2.5">
                                <p className="text-muted-foreground font-medium mb-0.5 uppercase tracking-wide text-[10px]">Pickup</p>
                                <p className="font-semibold text-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                                  {formatLocation(booking.pickup)}
                                </p>
                              </div>
                              <div className="bg-muted/30 rounded-xl p-2.5">
                                <p className="text-muted-foreground font-medium mb-0.5 uppercase tracking-wide text-[10px]">Drop-off</p>
                                <p className="font-semibold text-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                                  {formatLocation(booking.dropoff)}
                                </p>
                              </div>
                            </div>

                            <div className="px-4 pb-3">
                              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Live Route Map</p>
                              <RideTrackingMap
                                startCoords={booking.startCoords}
                                endCoords={booking.endCoords}
                                className="h-48 w-full"
                              />
                            </div>

                            <div className="px-4 pb-4">
                              <button
                                className="w-full flex items-center justify-between bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 transition-colors"
                                onClick={() => toggleSection(booking.id, "nearby_dropoff")}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">🏙️</span>
                                  <div className="text-left">
                                    <p className="text-sm font-bold text-primary">Restaurants & Hotels at Destination</p>
                                    <p className="text-xs text-muted-foreground">{formatLocation(booking.dropoff)}</p>
                                  </div>
                                </div>
                                {expandedSection[booking.id] === "nearby_dropoff" ? (
                                  <ChevronUp className="w-4 h-4 text-primary" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-primary" />
                                )}
                              </button>
                              <AnimatePresence>
                                {expandedSection[booking.id] === "nearby_dropoff" && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden mt-3"
                                  >
                                    <NearbyPlaces coords={booking.endCoords} label={formatLocation(booking.dropoff)} />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="clay-card-lg p-8 rounded-[2rem] bg-white/70 backdrop-blur-md border border-white/50 text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto text-3xl">🚕</div>
                <div>
                  <h3 className="font-bold text-base text-foreground mb-1">No Confirmed Rides Yet</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Book a taxi via <strong>Chat</strong> to see it here with live route tracking.
                  </p>
                </div>
                <div className="bg-primary/5 rounded-2xl p-4 text-left space-y-1 border border-primary/10">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide">How it works</p>
                  <p className="text-sm text-muted-foreground">💬 Chat → "Book a taxi to Taj Mahal, Agra"</p>
                  <p className="text-sm text-muted-foreground">✅ Confirm → 🗺️ Track here</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ══════ RESTAURANT TAB ══════ */}
        {activeTab === "restaurant" && (
          <motion.div
            key="restaurant"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <UtensilsCrossed className="w-5 h-5 text-accent" />
              <h3 className="font-bold text-base text-foreground">Restaurants Near You</h3>
            </div>

            {locationSources.length === 0 ? (
              <div className="clay-card-lg p-6 rounded-[2rem] bg-white/70 text-center text-sm text-muted-foreground">
                Allow location access or book a taxi to see nearby restaurants.
              </div>
            ) : (
              <div className="space-y-3">
                {locationSources.map((src, i) => (
                  <LocationSection
                    key={i}
                    coords={src.coords}
                    label={src.label}
                    filterType="restaurant"
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ══════ HOTEL TAB ══════ */}
        {activeTab === "hotel" && (
          <motion.div
            key="hotel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Hotel className="w-5 h-5 text-gold" />
              <h3 className="font-bold text-base text-foreground">Hotels Near You</h3>
            </div>

            {locationSources.length === 0 ? (
              <div className="clay-card-lg p-6 rounded-[2rem] bg-white/70 text-center text-sm text-muted-foreground">
                Allow location access or book a taxi to see nearby hotels.
              </div>
            ) : (
              <div className="space-y-3">
                {locationSources.map((src, i) => (
                  <LocationSection
                    key={i}
                    coords={src.coords}
                    label={src.label}
                    filterType="hotel"
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
