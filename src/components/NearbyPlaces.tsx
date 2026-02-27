import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, Hotel, Star, Phone, MapPin, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

interface OverpassElement {
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags: Record<string, string>;
}

interface Place {
    id: number;
    name: string;
    lat: number;
    lon: number;
    type: 'restaurant' | 'hotel';
    cuisine?: string;
    stars?: string;
    phone?: string;
    website?: string;
    priceRange?: string;
    distance?: number;
}

interface NearbyPlacesProps {
    coords: [number, number]; // [lat, lng]
    label: string;            // e.g. "Your Location" or "India Gate, New Delhi"
    defaultFilter?: 'all' | 'restaurant' | 'hotel';
}

const PRICE_RANGES: Record<string, string> = {
    '1': '₹ Budget',
    '2': '₹₹ Mid-range',
    '3': '₹₹₹ Premium',
    '4': '₹₹₹₹ Luxury',
};

const guessPrice = (tags: Record<string, string>, type: 'restaurant' | 'hotel'): string => {
    if (tags['price_range']) return PRICE_RANGES[tags['price_range']] || tags['price_range'];
    if (type === 'hotel') {
        const stars = parseInt(tags['stars'] || '0');
        if (stars >= 5) return '₹₹₹₹ Luxury (₹15,000+/night)';
        if (stars >= 4) return '₹₹₹ Premium (₹5,000–15,000/night)';
        if (stars >= 3) return '₹₹ Mid-range (₹2,000–5,000/night)';
        return '₹ Budget (Under ₹2,000/night)';
    }
    // For restaurants, guess from cuisine/brand
    const cuisine = (tags['cuisine'] || '').toLowerCase();
    if (cuisine.includes('fast_food') || cuisine.includes('pizza')) return '₹ Budget (₹100–300)';
    if (cuisine.includes('indian') || cuisine.includes('chinese')) return '₹₹ Mid-range (₹300–800)';
    return '₹₹ Mid-range (₹400–1,200)';
};

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const NearbyPlaces: React.FC<NearbyPlacesProps> = ({ coords, label, defaultFilter = 'all' }) => {
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'restaurant' | 'hotel'>(defaultFilter);

    const fetchNearby = useCallback(async () => {
        setLoading(true);
        setError(null);
        const [lat, lon] = coords;
        const radius = 5000; // 5km radius

        const query = `[out:json][timeout:25];(node["amenity"="restaurant"](around:${radius},${lat},${lon});node["amenity"="cafe"](around:${radius},${lat},${lon});node["amenity"="fast_food"](around:${radius},${lat},${lon});node["tourism"="hotel"](around:${radius},${lat},${lon});node["tourism"="guest_house"](around:${radius},${lat},${lon});way["amenity"="restaurant"](around:${radius},${lat},${lon});way["tourism"="hotel"](around:${radius},${lat},${lon}););out center 30;`;

        // Multiple Overpass mirrors — try each until one succeeds
        const ENDPOINTS = [
            'https://overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter',
            'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
        ];

        const parseElements = (elements: OverpassElement[]): Place[] =>
            elements
                .filter(e => e.tags?.name)
                .map(e => {
                    const elLat = e.lat ?? e.center?.lat ?? lat;
                    const elLon = e.lon ?? e.center?.lon ?? lon;
                    const tourism = e.tags.tourism || '';
                    const type: 'restaurant' | 'hotel' =
                        tourism === 'hotel' || tourism === 'guest_house' ? 'hotel' : 'restaurant';
                    return {
                        id: e.id,
                        name: e.tags.name,
                        lat: elLat,
                        lon: elLon,
                        type,
                        cuisine: e.tags.cuisine,
                        stars: e.tags.stars,
                        phone: e.tags.phone || e.tags['contact:phone'],
                        website: e.tags.website || e.tags['contact:website'],
                        priceRange: guessPrice(e.tags, type),
                        distance: haversineDistance(lat, lon, elLat, elLon),
                    };
                })
                .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
                .slice(0, 20);

        let lastError: string = '';
        for (const endpoint of ENDPOINTS) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 15000);
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    body: `data=${encodeURIComponent(query)}`,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    signal: controller.signal,
                });
                clearTimeout(timer);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setPlaces(parseElements(data.elements || []));
                setLoading(false);
                return; // success
            } catch (err: any) {
                clearTimeout(timer);
                lastError = err?.message || 'Unknown error';
                console.warn(`Overpass mirror failed (${endpoint}):`, lastError);
            }
        }

        // All mirrors failed
        setError('Could not fetch nearby places. Check your connection and try again.');
        setLoading(false);
    }, [coords]);

    useEffect(() => {
        fetchNearby();
    }, [fetchNearby]);

    const filtered = activeFilter === 'all' ? places : places.filter(p => p.type === activeFilter);
    const restaurants = places.filter(p => p.type === 'restaurant').length;
    const hotels = places.filter(p => p.type === 'hotel').length;

    const openBooking = (place: Place) => {
        const query = encodeURIComponent(place.name);
        const gmapsUrl = `https://www.google.com/maps/search/${query}/@${place.lat},${place.lon},17z`;
        window.open(gmapsUrl, '_blank');
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">Nearby: <span className="text-primary truncate">{label}</span></p>
                    {!loading && !error && (
                        <p className="text-[10px] text-muted-foreground">{restaurants} restaurants · {hotels} hotels within 5km</p>
                    )}
                </div>
                <button onClick={fetchNearby} className="text-[10px] text-primary hover:underline font-medium">Refresh</button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {[
                    { id: 'all', label: 'All' },
                    { id: 'restaurant', label: '🍽️ Eat', icon: UtensilsCrossed },
                    { id: 'hotel', label: '🏨 Stay', icon: Hotel },
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id as any)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${activeFilter === f.id ? 'bg-primary text-white shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* States */}
            {loading && (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Finding nearby places...</span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}
            {!loading && !error && filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No {activeFilter === 'all' ? 'places' : activeFilter + 's'} found within 5km.</p>
            )}

            {/* Place Cards */}
            {!loading && !error && (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-primary/10">
                    <AnimatePresence>
                        {filtered.map((place, i) => (
                            <motion.div
                                key={place.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="bg-white/90 border border-gray-100 rounded-2xl p-3 flex items-start gap-3 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${place.type === 'hotel' ? 'bg-amber-50' : 'bg-orange-50'}`}>
                                    {place.type === 'hotel' ? '🏨' : '🍽️'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-foreground truncate">{place.name}</p>
                                    <p className="text-[11px] text-primary font-semibold">{place.priceRange}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {place.cuisine && (
                                            <span className="text-[10px] text-muted-foreground capitalize">{place.cuisine.replace(/_/g, ' ')}</span>
                                        )}
                                        {place.stars && (
                                            <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                                                <Star className="w-2.5 h-2.5 fill-amber-400" />
                                                {place.stars}★
                                            </span>
                                        )}
                                        {place.distance !== undefined && (
                                            <span className="text-[10px] text-muted-foreground ml-auto">
                                                {place.distance < 1 ? `${Math.round(place.distance * 1000)}m` : `${place.distance.toFixed(1)}km`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => openBooking(place)}
                                        className="bg-primary text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-1"
                                    >
                                        <ExternalLink className="w-2.5 h-2.5" />
                                        Book
                                    </button>
                                    {place.phone && (
                                        <a
                                            href={`tel:${place.phone}`}
                                            className="bg-green-500/10 text-green-700 text-[10px] font-bold px-2.5 py-1.5 rounded-full hover:bg-green-500/20 transition-all flex items-center gap-1"
                                        >
                                            <Phone className="w-2.5 h-2.5" />
                                            Call
                                        </a>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};
