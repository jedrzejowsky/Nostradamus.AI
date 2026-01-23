import React, { useEffect, useState } from 'react';
import WeatherChart from './WeatherChart';
import LocationSearch from './LocationSearch';
import WeatherMap from './WeatherMap';
import DayTile from './DayTile';
import ModelInsights from './ModelInsights';
import { Thermometer, BrainCircuit, Activity, RefreshCw, MapPin, Droplets, Wind, Cloud, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subDays, addDays, isSameDay, startOfDay } from 'date-fns';
import { clsx } from 'clsx';

// Update base URL if needed or use relative proxy
const API_BASE = 'http://localhost:8000/api/weather';

const WeatherDashboard = () => {
    const [data, setData] = useState([]); // Hourly data for chart
    const [dailyData, setDailyData] = useState([]); // Daily data from API
    const [loading, setLoading] = useState(true);
    const [predicting, setPredicting] = useState(false);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState({
        name: "Warsaw",
        lat: 52.2297,
        lon: 21.0122
    });

    const [selectedDay, setSelectedDay] = useState(null);
    const [carouselOffset, setCarouselOffset] = useState(0); // Offset in weeks (7 days)
    const [modelStats, setModelStats] = useState(null);
    const [historyComparison, setHistoryComparison] = useState({ yearAgo: null, decadeAgo: null });

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        setModelStats(null);
        setHistoryComparison({ yearAgo: null, decadeAgo: null });
        try {
            // Fetch 7 days history + 7 days forecast
            const now = new Date();
            const startDate = format(subDays(now, 7), 'yyyy-MM-dd');
            const endDate = format(subDays(now, 1), 'yyyy-MM-dd');

            const histRes = await fetch(`${API_BASE}/history?lat=${location.lat}&lon=${location.lon}&start_date=${startDate}&end_date=${endDate}`);
            if (!histRes.ok) throw new Error("Failed to fetch history");
            const histPayload = await histRes.json();

            const foreRes = await fetch(`${API_BASE}/forecast?lat=${location.lat}&lon=${location.lon}&days=7`);
            if (!foreRes.ok) throw new Error("Failed to fetch forecast");
            const forePayload = await foreRes.json();

            // Merge & Set Data
            const mergedHourly = mergeHourlyData(histPayload.hourly, forePayload.hourly, []);
            setData(mergedHourly);

            // Daily Data Processing
            const rawDaily = [...(histPayload.daily || []), ...(forePayload.daily || [])];
            const dailyMap = new Map();
            rawDaily.forEach(d => {
                const t = d.time.split('T')[0];
                if (!dailyMap.has(t)) dailyMap.set(t, d);
                else dailyMap.set(t, { ...dailyMap.get(t), ...d });
            });
            const sortedDaily = Array.from(dailyMap.values()).sort((a, b) => new Date(a.time) - new Date(b.time));
            setDailyData(sortedDaily);

            // Select today
            const todayData = sortedDaily.find(d => isSameDay(new Date(d.time), now));
            if (todayData) setSelectedDay(todayData);

            // Fetch Historical Comparisons (Async, don't block main UI excessively, but here we await)
            // 1 Year Ago
            const date1y = subDays(now, 365);
            const date10y = subDays(now, 365 * 10);

            const fetchPointHistory = async (date) => {
                const dStr = format(date, 'yyyy-MM-dd');
                try {
                    const res = await fetch(`${API_BASE}/history?lat=${location.lat}&lon=${location.lon}&start_date=${dStr}&end_date=${dStr}`);
                    const json = await res.json();
                    if (json.hourly && json.hourly.length > 0) {
                        // Find same hour
                        const hour = now.getHours();
                        const record = json.hourly.find(r => new Date(r.time).getHours() === hour);
                        return record ? record.temperature_2m : null;
                    }
                } catch (e) { console.error(e); }
                return null;
            };

            const [temp1y, temp10y] = await Promise.all([
                fetchPointHistory(date1y),
                fetchPointHistory(date10y)
            ]);

            setHistoryComparison({ yearAgo: temp1y, decadeAgo: temp10y });

        } catch (err) {
            console.error(err);
            setError("Failed to load weather data.");
        } finally {
            setLoading(false);
        }
    };

    const handlePredict = async () => {
        setPredicting(true);
        setModelStats(null);
        try {
            const res = await fetch(`${API_BASE}/predict?lat=${location.lat}&lon=${location.lon}&days=7`);
            const payload = await res.json();

            if (payload.prediction) {
                // Create a map using time values for robust matching
                const predMap = new Map();
                payload.prediction.forEach(p => {
                    // Normalize time to handle potential differences (e.g. seconds)
                    const timeKey = new Date(p.time).toISOString().slice(0, 16); // match 'YYYY-MM-DDTHH:mm'
                    predMap.set(timeKey, p);
                });

                const newData = data.map(d => {
                    const timeKey = new Date(d.time).toISOString().slice(0, 16);
                    const pred = predMap.get(timeKey);
                    return {
                        ...d,
                        prediction: pred ? pred.predicted_temperature_2m : null,
                        prediction_wind: pred ? pred.predicted_wind_speed_10m : null,
                        prediction_hum: pred ? pred.predicted_relative_humidity_2m : null
                    };
                });

                setData(newData);

                if (payload.model_performance) {
                    setModelStats(payload.model_performance);
                }
            }
        } catch (err) {
            console.error(err);
            setError("AI Prediction failed.");
        } finally {
            setPredicting(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [location]);

    const mergeHourlyData = (hist, fore, pred) => {
        const map = new Map();

        hist.forEach(d => {
            const t = d.time;
            map.set(t, { ...d, history: d.temperature_2m, unified_temp: d.temperature_2m });
        });

        fore.forEach(d => {
            const t = d.time;
            const existing = map.get(t) || {};
            const unified = existing.history !== undefined ? existing.history : d.temperature_2m;
            map.set(t, { ...existing, ...d, forecast: d.temperature_2m, unified_temp: unified });
        });

        pred.forEach(d => {
            const t = d.time;
            const existing = map.get(t) || {};
            map.set(t, { ...existing, time: t, prediction: d.predicted_temperature_2m });
        });

        return Array.from(map.values()).sort((a, b) => new Date(a.time) - new Date(b.time));
    };

    // Logic for displaying 7 cards: Center = Today + offset
    // We want to show [Center-3, Center-2, Center-1, Center, Center+1, Center+2, Center+3]
    const visibleDays = React.useMemo(() => {
        if (!dailyData.length) return [];

        const today = startOfDay(new Date());
        // Apply carousel offset (weeks)
        const centerDate = addDays(today, carouselOffset * 7);

        // Find index of centerDate in dailyData
        // Note: dailyData string is yyyy-mm-dd
        const centerIndex = dailyData.findIndex(d => isSameDay(new Date(d.time), centerDate));

        if (centerIndex === -1) {
            // Fallback if out of range, just show middle of what we have
            return dailyData.slice(0, 7);
        }

        // Calculate start and end indices
        let start = centerIndex - 3;
        let end = centerIndex + 3;

        // Adjust if out of bounds (padding logic could be complex, simple clamping here)
        // BUT user wants to scroll infinite-ish? We only fetched 2 weeks back/fwd.
        // If start < 0, we show what we have.

        const slice = [];
        for (let i = start; i <= end; i++) {
            if (i >= 0 && i < dailyData.length) {
                slice.push(dailyData[i]);
            } else {
                // Push placeholder or null? 
                // Better to just not push or push a dummy date?
                // Let's filter nulls later.
            }
        }
        return slice;
    }, [dailyData, carouselOffset]);

    const current = data.find(d => d.history !== undefined) || data[0]; // fallback
    const now = new Date();
    const currentMetric = data.reduce((prev, curr) => {
        return (Math.abs(new Date(curr.time) - now) < Math.abs(new Date(prev.time) - now) ? curr : prev);
    }, data[0]);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full lg:min-h-[calc(100vh-8rem)]">

            {/* Sidebar / Top Panel on Mobile */}
            <div className="lg:col-span-4 space-y-6 flex flex-col">
                {/* Search & Map */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <MapPin className="text-indigo-400" />
                        Location
                    </h2>
                    <LocationSearch onLocationSelect={setLocation} />
                    <div className="rounded-2xl overflow-hidden border border-white/10 mt-2">
                        <WeatherMap lat={location.lat} lon={location.lon} onLocationSelect={setLocation} />
                    </div>
                    <div className="text-center text-slate-400 text-sm">
                        Selected: <span className="text-white font-medium">{location.name}</span>
                    </div>
                </div>

                {/* Current Weather Big Widget */}
                <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-indigo-500/30 rounded-3xl p-8 flex-1 flex flex-col justify-center items-center text-center backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-20"><Cloud size={100} /></div>

                    <div className="z-10">
                        <div className="text-slate-300 text-lg uppercase tracking-widest font-semibold mb-2">Now</div>
                        <div className="text-7xl font-black text-white mb-4 tracking-tighter">
                            {currentMetric?.temperature_2m ? Math.round(currentMetric.temperature_2m) : "--"}°
                        </div>

                        <div className="flex gap-6 justify-center text-indigo-200">
                            <div className="flex flex-col items-center">
                                <Droplets size={20} className="mb-1" />
                                <span className="text-sm">{currentMetric?.relative_humidity_2m || 0}%</span>
                                <span className="text-[10px] opacity-70">Humidity</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <Wind size={20} className="mb-1" />
                                <span className="text-sm">{currentMetric?.wind_speed_10m || 0} km/h</span>
                                <span className="text-[10px] opacity-70">Wind</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <Activity size={20} className="mb-1" />
                                <span className="text-sm">
                                    {currentMetric?.precipitation !== undefined ? currentMetric.precipitation : (currentMetric?.precipitation_probability || 0)}
                                    {currentMetric?.precipitation !== undefined ? ' mm' : '%'}
                                </span>
                                <span className="text-[10px] opacity-70">Precip</span>
                            </div>
                        </div>

                        {/* Historical Context */}
                        <div className="mt-6 border-t border-white/10 pt-4 w-full">
                            <div className="text-[10px] uppercase tracking-widest text-indigo-300 font-semibold mb-2 text-center">Did You Know?</div>
                            <div className="flex justify-center px-4 text-sm text-slate-300">
                                <div className="flex flex-col items-center">
                                    <span className="opacity-60 text-xs">1 Year Ago Today</span>
                                    <span className="font-mono text-white text-lg">{historyComparison.yearAgo !== null ? Math.round(historyComparison.yearAgo) + '°' : '--'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={handlePredict}
                                disabled={predicting}
                                className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-sm font-bold"
                            >
                                {predicting ? <RefreshCw className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                                {predicting ? "AI Thinking..." : "Predict Future"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8 flex flex-col gap-6">

                {/* History Grid (Carousel) */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-200">
                            <Activity className="text-emerald-400" />
                            Daily Overview
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => setCarouselOffset(0)} className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 text-xs font-bold uppercase tracking-wider transition-colors">
                                Jump to Today
                            </button>
                        </div>
                    </div>

                    <div className="relative md:px-12 px-0 py-2">
                        {/* Left Arrow (Desktop) */}
                        <button
                            onClick={() => setCarouselOffset(prev => prev - 1)}
                            className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-all z-10"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        {/* Days Grid/Scroll */}
                        <div className="flex md:grid md:grid-cols-5 gap-3 overflow-x-auto snap-x no-scrollbar px-4 md:px-0 pb-2 md:pb-0">
                            {visibleDays.slice(0, 5).map((d, i) => (
                                <div key={i} className="min-w-[100px] md:min-w-0 snap-center">
                                    <DayTile
                                        day={d}
                                        onClick={() => setSelectedDay(d)}
                                        isSelected={selectedDay && d.time.split('T')[0] === selectedDay.time.split('T')[0]}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Right Arrow (Desktop) */}
                        <button
                            onClick={() => setCarouselOffset(prev => prev + 1)}
                            className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-all z-10"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    {/* Selected Day Details */}
                    {selectedDay && (
                        <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-4">
                            <h4 className="font-bold text-lg mb-2">Details for {format(new Date(selectedDay.time), 'PPPP')}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-slate-300">
                                <div>Max Temp: <span className="text-white font-mono block text-lg">{Math.round(selectedDay.temperature_2m_max)}°</span></div>
                                <div>Min Temp: <span className="text-white font-mono block text-lg">{Math.round(selectedDay.temperature_2m_min)}°</span></div>
                                <div>Precip Sum: <span className="text-white font-mono block text-lg">{selectedDay.precipitation_sum} mm</span></div>
                                <div>Precip Prob: <span className="text-white font-mono block text-lg">{selectedDay.precipitation_probability_max || selectedDay.precipitation_hours || '- '}%</span></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chart Section */}
                <div className="flex-1 min-h-[400px] flex flex-col gap-6">
                    {loading ? (
                        <div className="h-full flex items-center justify-center text-slate-500">Loading charts...</div>
                    ) : (
                        <>
                            <WeatherChart data={data} modelStats={modelStats} />
                            {modelStats && <ModelInsights stats={modelStats} />}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default WeatherDashboard;
