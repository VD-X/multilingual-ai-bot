import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';

// Fix Leaflet default icon path
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RideTrackingMapProps {
    startCoords: [number, number];
    endCoords: [number, number];
    className?: string;
}

const taxiIconUrl = 'https://cdn-icons-png.flaticon.com/512/3204/3204085.png';

export const RideTrackingMap: React.FC<RideTrackingMapProps> = ({ startCoords, endCoords, className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const taxiMarkerRef = useRef<L.Marker | null>(null);
    const routeRef = useRef<[number, number][]>([]);

    const [eta, setEta] = useState<number | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const [taxiIndex, setTaxiIndex] = useState(0);
    const [routeLoaded, setRouteLoaded] = useState(false);

    // Initialize the Leaflet map on a raw DOM node
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: startCoords,
            zoom: 13,
            zoomControl: false,
            scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB',
        }).addTo(map);

        // Pickup marker
        L.marker(startCoords).addTo(map).bindPopup('Pickup');

        // Dropoff marker
        L.marker(endCoords).addTo(map).bindPopup('Destination');

        // Taxi marker
        const taxiIcon = L.icon({ iconUrl: taxiIconUrl, iconSize: [32, 32], iconAnchor: [16, 16] });
        taxiMarkerRef.current = L.marker(startCoords, { icon: taxiIcon, zIndexOffset: 1000 }).addTo(map);

        mapRef.current = map;

        // Fetch OSRM route
        const fetchRoute = async () => {
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.routes && data.routes.length > 0) {
                    const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
                        (c: number[]) => [c[1], c[0]] as [number, number]
                    );
                    routeRef.current = coords;

                    // Draw full route
                    L.polyline(coords, { color: '#94a3b8', weight: 4, opacity: 0.6, dashArray: '5,10' }).addTo(map);

                    // Fit map to route
                    map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });

                    setEta(Math.round(data.routes[0].duration / 60));
                    setDistance(+(data.routes[0].distance / 1000).toFixed(1));
                    setRouteLoaded(true);
                }
            } catch (e) {
                console.error('OSRM route fetch failed:', e);
            }
        };

        fetchRoute();

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Progress polyline and taxi movement
    useEffect(() => {
        if (!isMoving || !routeLoaded || taxiIndex >= routeRef.current.length - 1) return;

        const timer = setTimeout(() => {
            const next = taxiIndex + 1;
            setTaxiIndex(next);

            if (taxiMarkerRef.current && routeRef.current[next]) {
                taxiMarkerRef.current.setLatLng(routeRef.current[next]);
            }

            if (mapRef.current && next % 5 === 0 && routeRef.current[next]) {
                mapRef.current.panTo(routeRef.current[next], { animate: true });
            }

            if (eta && eta > 1 && Math.random() > 0.85) {
                const pct = next / routeRef.current.length;
                setEta(prev => Math.max(1, Math.floor((prev ?? eta) * (1 - pct))));
            }
        }, 900);

        return () => clearTimeout(timer);
    }, [isMoving, taxiIndex, routeLoaded, eta]);

    const arrived = taxiIndex >= routeRef.current.length - 1 && routeRef.current.length > 0;

    return (
        <div className={`relative ${className || 'h-64 w-full'} overflow-hidden rounded-xl border border-gray-200 shadow-sm`}>
            {/* Info overlay */}
            <div className="absolute top-2 left-2 right-2 bg-white/95 backdrop-blur-md p-2 rounded-lg shadow-md z-[1000] flex justify-between items-center text-xs pointer-events-none">
                <div className="flex flex-col">
                    {distance !== null && <span className="font-bold text-gray-800">{distance} km Route</span>}
                    {eta !== null && <span className="text-gray-500">{arrived ? '🎉 Arrived!' : `${eta} min ETA`}</span>}
                    {!routeLoaded && <span className="text-gray-400 italic">Calculating route...</span>}
                </div>
                {routeLoaded && !isMoving && !arrived && (
                    <button
                        onClick={() => setIsMoving(true)}
                        className="bg-primary text-white px-3 py-1.5 rounded-full font-bold shadow-sm active:scale-95 transition-all pointer-events-auto"
                    >
                        Start Ride
                    </button>
                )}
            </div>

            {/* Leaflet map DOM container */}
            <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
        </div>
    );
};
