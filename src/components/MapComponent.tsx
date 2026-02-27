import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from 'lucide-react';

// Fix Leaflet default icon path
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
    placeName: string;
    className?: string;
}

export const MapComponent: React.FC<MapComponentProps> = ({ placeName, className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const [location, setLocation] = useState<[number, number] | null>(null);

    // Geocode the place name using Nominatim
    useEffect(() => {
        if (!placeName) return;
        const fetchCoords = async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`
                );
                const data = await res.json();
                if (data && data.length > 0) {
                    setLocation([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                }
            } catch (e) {
                console.error('Geocoding failed:', e);
            }
        };
        fetchCoords();
    }, [placeName]);

    // Initialize or update the Leaflet map
    useEffect(() => {
        if (!containerRef.current || !location) return;

        if (!mapRef.current) {
            const map = L.map(containerRef.current, {
                center: location,
                zoom: 14,
                zoomControl: false,
            });
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; CartoDB',
            }).addTo(map);
            L.marker(location).addTo(map).bindPopup(placeName);
            mapRef.current = map;
        } else {
            mapRef.current.setView(location, 14);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [location, placeName]);

    const handleGetDirections = () => {
        if (location) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${location[0]},${location[1]}`, '_blank');
        }
    };

    if (!location) {
        return (
            <div className={`flex items-center justify-center bg-muted/30 animate-pulse ${className}`}>
                <MapPin className="w-5 h-5 text-muted-foreground/50" />
            </div>
        );
    }

    return (
        <div className={`relative group ${className || 'h-64'} overflow-hidden rounded-xl border border-gray-200 shadow-sm z-0`}>
            <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
            <button
                onClick={handleGetDirections}
                className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm hover:bg-white text-primary text-[10px] font-bold py-1.5 px-3 rounded-full shadow-lg border border-primary/20 flex items-center gap-1.5 transition-all active:scale-95 z-[1000]"
            >
                <Navigation className="w-3 h-3" />
                GET DIRECTIONS
            </button>
        </div>
    );
};
