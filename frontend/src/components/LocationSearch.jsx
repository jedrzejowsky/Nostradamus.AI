import React, { useState, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';
import { clsx } from 'clsx';

const LocationSearch = ({ onLocationSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const [selectedName, setSelectedName] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 2 && query !== selectedName) {
                searchLocations();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, selectedName]);

    const searchLocations = async () => {
        setLoading(true);
        try {
            // Use local backend which proxies to open-meteo
            const res = await fetch(`http://localhost:8000/api/location/search?name=${query}`);
            const data = await res.json();
            setResults(data || []);
            setDropdownOpen(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full z-50">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value !== selectedName) {
                            setSelectedName(null); // Reset selection tracking if user edits
                        }
                    }}
                    placeholder="Search city..."
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 backdrop-blur-md"
                />
                <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                {loading && <div className="absolute right-4 top-3.5 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
            </div>

            {dropdownOpen && results.length > 0 && query !== selectedName && (
                <div className="absolute top-full mt-2 w-full bg-slate-900/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden max-h-60 overflow-y-auto">
                    {results.map((loc) => (
                        <button
                            key={loc.id}
                            onClick={() => {
                                onLocationSelect({
                                    name: loc.name,
                                    lat: loc.latitude,
                                    lon: loc.longitude,
                                    country: loc.country
                                });
                                setQuery(loc.name);
                                setSelectedName(loc.name);
                                setDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                        >
                            <MapPin size={16} className="text-indigo-400" />
                            <div>
                                <div className="font-medium text-white">{loc.name}</div>
                                <div className="text-xs text-slate-400">{loc.admin1}, {loc.country}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LocationSearch;
