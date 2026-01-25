import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMarker = ({ position, onLocationSelect }) => {
    const map = useMap();

    // Destructure lat and lon
    const lat = position ? position[0] : undefined;
    const lon = position ? position[1] : undefined;

    // Use Number.isFinite for stricter validation (catches NaN, Infinity, undefined)
    const isValid = Number.isFinite(lat) && Number.isFinite(lon);

    useEffect(() => {
        if (isValid && map) {
            try {
                map.flyTo(position, 10, { duration: 1.5 });
            } catch (e) {
                console.warn("Map flyTo failed:", e);
            }
        }
    }, [isValid, map, position, lat, lon]);

    useMapEvents({
        click(e) {
            if (onLocationSelect) {
                onLocationSelect({
                    lat: e.latlng.lat,
                    lon: e.latlng.lng,
                    name: "Selected Location"
                });
            }
        },
    });

    if (!isValid) return null;

    return <Marker position={position} />;
};

const LocateControl = ({ onLocationFound }) => {
    const map = useMap();

    const handleLocate = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                onLocationFound({
                    lat: latitude,
                    lon: longitude,
                    name: "My Location",
                    country: ""
                });
                map.flyTo([latitude, longitude], 12);
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Unable to retrieve your location. Please check browser permissions.");
            }
        );
    };

    return (
        <div className="leaflet-bottom leaflet-right">
            <div className="leaflet-control leaflet-bar">
                <button
                    onClick={handleLocate}
                    className="bg-slate-900 border-2 border-white/20 p-2 rounded-lg hover:bg-slate-800 transition-colors text-white z-[1000] pointer-events-auto shadow-xl"
                    title="Locate Me"
                    style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <LocateFixed size={20} />
                </button>
            </div>
        </div>
    );
};

const WeatherMap = ({ lat, lon, onLocationSelect }) => {
    // Use Number.isFinite for bulletproof validation
    const isValid = Number.isFinite(lat) && Number.isFinite(lon);
    const position = isValid ? [lat, lon] : [52.2297, 21.0122];

    if (!isValid) {
        return (
            <div className="h-[300px] w-full rounded-3xl overflow-hidden border border-white/10 shadow-lg relative z-0 bg-white/5 flex items-center justify-center">
                <div className="flex flex-col items-center text-slate-500 animate-pulse">
                    <LocateFixed size={40} className="mb-2 opacity-50" />
                    <span className="text-xs font-mono uppercase tracking-widest">Map Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[300px] w-full rounded-3xl overflow-hidden border border-white/10 shadow-lg relative z-0">
            <MapContainer
                center={position}
                zoom={10}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <LocationMarker position={position} onLocationSelect={onLocationSelect} />
                <LocateControl onLocationFound={onLocationSelect} />
            </MapContainer>
        </div>
    );
};

export default WeatherMap;
