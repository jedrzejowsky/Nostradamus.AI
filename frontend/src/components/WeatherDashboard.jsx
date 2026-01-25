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

    // Mobile State
    const [mobilePage, setMobilePage] = useState(0);
    const [showMobileMap, setShowMobileMap] = useState(false);

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

                // Update selectedDay to reflect new prediction data
                if (selectedDay) {
                    const selectedTime = selectedDay.time;
                    const updatedDay = newData.find(d => d.time === selectedTime);
                    if (updatedDay) {
                        setSelectedDay(updatedDay);
                    }
                } else if (newData.length > 0) {
                    setSelectedDay(newData[0]);
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


    // --- Mobile Logic Helpers ---
    const isToday = selectedDay && isSameDay(new Date(selectedDay.time), new Date());
    const displayData = !isToday && selectedDay ? {
        temp: Math.round(selectedDay.temperature_2m_max),
        wind: selectedDay.wind_speed_10m_max || 0, // Daily aggregations might vary, check OpenMeteo daily params?
        // OpenMeteo Daily: temperature_2m_max, precipitation_sum, precipitation_probability_max, wind_speed_10m_max
        // My `weekly` fetch only got: temperature_2m_max, temperature_2m_min, precipitation_sum, weather_code, precipitation_probability_max
        // It did NOT get wind_speed or humidity for daily. I might need to fetch those or fallback to hourly-at-noon.
        // For simplicity on mobile details, let's stick to what we have or accept "--".
        hum: '--', // Daily hum not fetched
        precip: selectedDay.precipitation_sum,
        label: format(new Date(selectedDay.time), 'EEEE, d MMM')
    } : {
        temp: currentMetric?.temperature_2m ? Math.round(currentMetric.temperature_2m) : "--",
        wind: currentMetric?.wind_speed_10m || 0,
        hum: currentMetric?.relative_humidity_2m || 0,
        precip: currentMetric?.precipitation !== undefined ? currentMetric.precipitation : (currentMetric?.precipitation_probability || 0),
        label: "NOW"
    };

    return (
        <div className="h-full w-full relative lg:overflow-visible overflow-hidden max-h-[100dvh] lg:max-h-none">

            {/* --- DESKTOP VIEW (lg+) --- */}
            <div className="hidden lg:grid grid-cols-12 gap-6 h-full lg:min-h-[calc(100vh-8rem)]">
                {/* Sidebar */}
                <div className="col-span-4 space-y-6 flex flex-col">
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

                    <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-indigo-500/30 rounded-3xl p-8 flex-1 flex flex-col justify-center items-center text-center backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-20"><Cloud size={100} /></div>
                        <div className="z-10 w-full">
                            <div className="text-slate-300 text-lg uppercase tracking-widest font-semibold mb-1">Now</div>
                            <div className="text-white text-xl font-bold mb-2">{location.name}</div>
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
                                <button onClick={handlePredict} disabled={predicting} className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-sm font-bold mx-auto">
                                    {predicting ? <RefreshCw className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                                    {predicting ? "AI Thinking..." : "Predict Future"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Main Content */}
                <div className="col-span-8 flex flex-col gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-200">
                                <Activity className="text-emerald-400" />
                                Daily Overview
                            </h3>
                            <button onClick={() => setCarouselOffset(0)} className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 text-xs font-bold uppercase tracking-wider transition-colors">
                                Jump to Today
                            </button>
                        </div>
                        <div className="relative px-12 py-2">
                            <button onClick={() => setCarouselOffset(prev => prev - 1)} className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-all z-10"><ChevronLeft size={24} /></button>
                            <div className="grid grid-cols-5 gap-3">
                                {visibleDays.slice(0, 5).map((d, i) => (
                                    <DayTile key={i} day={d} onClick={() => setSelectedDay(d)} isSelected={selectedDay && d.time.split('T')[0] === selectedDay.time.split('T')[0]} />
                                ))}
                            </div>
                            <button onClick={() => setCarouselOffset(prev => prev + 1)} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-all z-10"><ChevronRight size={24} /></button>
                        </div>
                        {selectedDay && (
                            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="font-bold text-lg mb-2">Details for {format(new Date(selectedDay.time), 'PPPP')}</h4>
                                <div className="grid grid-cols-5 gap-4 text-sm text-slate-300">
                                    <div>Max: <span className="text-white font-mono block text-lg">{Math.round(selectedDay.temperature_2m_max)}°</span></div>
                                    <div>Min: <span className="text-white font-mono block text-lg">{Math.round(selectedDay.temperature_2m_min)}°</span></div>
                                    <div>Precip: <span className="text-white font-mono block text-lg">{selectedDay.precipitation_sum} mm</span></div>
                                    <div>Prob: <span className="text-white font-mono block text-lg">{selectedDay.precipitation_probability_max || '-'}%</span></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-h-[400px] flex flex-col gap-6">
                        {loading ? <div className="text-center text-slate-500">Loading charts...</div> : (
                            <>
                                <WeatherChart data={data} modelStats={modelStats} />
                                {modelStats && <ModelInsights stats={modelStats} />}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MOBILE VIEW (lg:hidden) --- */}
            <div className="lg:hidden flex flex-col h-[100dvh] overflow-hidden relative bg-slate-900">

                {/* Mobile Page 1: Overview */}
                <div className={clsx("flex flex-col h-full pb-10", mobilePage === 0 ? "flex" : "hidden")}>

                    {/* Header: Location & Map Toggle */}
                    <div className="shrink-0 flex items-center gap-2 p-2 pb-0 z-20">
                        <div className="flex-1">
                            <LocationSearch onLocationSelect={setLocation} />
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowMobileMap(!showMobileMap)}
                            className={clsx("p-2 rounded-xl border transition-colors", showMobileMap ? "bg-indigo-500 text-white border-indigo-400" : "bg-white/5 border-white/10 text-slate-300")}
                        >
                            <MapPin size={18} />
                        </button>
                    </div>

                    {showMobileMap && (
                        <div className="shrink-0 h-32 mx-2 my-1 rounded-2xl overflow-hidden border border-white/10 relative z-10">
                            <WeatherMap lat={location.lat} lon={location.lon} onLocationSelect={setLocation} />
                        </div>
                    )}

                    {/* NOW Tile - fills available space */}
                    <div className="flex-1 px-3 py-1 flex flex-col">
                        <div className="w-full h-full bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-indigo-500/30 rounded-2xl p-3 relative overflow-hidden shadow-2xl flex flex-col">
                            <div className="absolute top-0 right-0 p-2 opacity-10"><Cloud size={60} /></div>
                            <div className="z-10 w-full h-full flex flex-col items-center justify-between py-2">
                                <div className="text-indigo-200 text-[20px] font-bold uppercase tracking-widest">{displayData.label}</div>
                                <div className="text-white text-sm font-semibold truncate max-w-full px-2">{location.name}</div>
                                <div className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">
                                    {displayData.temp}°
                                </div>

                                <div className="grid grid-cols-3 gap-1 text-indigo-100 mt-1 w-full max-w-[200px]">
                                    <div className="flex flex-col items-center py-1 rounded-lg bg-white/5 border border-white/5">
                                        <Droplets size={12} className="opacity-70" />
                                        <span className="font-bold text-[9px]">{displayData.hum !== '--' ? displayData.hum + '%' : '--'}</span>
                                    </div>
                                    <div className="flex flex-col items-center py-1 rounded-lg bg-white/5 border border-white/5">
                                        <Wind size={12} className="opacity-70" />
                                        <span className="font-bold text-[9px]">{displayData.wind}<span className="text-[7px]">km/h</span></span>
                                    </div>
                                    <div className="flex flex-col items-center py-1 rounded-lg bg-white/5 border border-white/5">
                                        <Activity size={12} className="opacity-70" />
                                        <span className="font-bold text-[9px]">{displayData.precip || 0}<span className="text-[7px]">mm</span></span>
                                    </div>
                                </div>

                                {isToday && (
                                    <div className="mt-1 pt-0.5 border-t border-white/10 w-full text-center">
                                        <div className="text-[7px] text-slate-400">1 YEAR AGO</div>
                                        <div className="text-white font-mono text-[10px]">{historyComparison.yearAgo !== null ? Math.round(historyComparison.yearAgo) + '°' : '--'}</div>
                                    </div>
                                )}

                                {/* Mobile Predict Button */}
                                {isToday && (
                                    <button
                                        type="button"
                                        onClick={handlePredict}
                                        disabled={predicting}
                                        className="mt-1 w-full max-w-[200px] py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all z-20"
                                    >
                                        {predicting ? <RefreshCw className="animate-spin" size={12} /> : <BrainCircuit size={12} />}
                                        {predicting ? "Thinking..." : "Predict Future"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Daily Carousel (Bottom) */}
                    <div className="shrink-0 mt-auto py-2 px-2 overflow-x-auto snap-x flex gap-2 no-scrollbar items-center">
                        {visibleDays.map((d, i) => (
                            <div key={i} className="snap-center min-w-[55px]">
                                <DayTile day={d} onClick={() => setSelectedDay(d)} isSelected={selectedDay && d.time.split('T')[0] === selectedDay.time.split('T')[0]} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mobile Page 2: Analytics */}
                {mobilePage === 1 && (
                    <div className="flex-1 p-3 pb-14 flex flex-col gap-3 overflow-y-auto">
                        <h2 className="text-lg font-bold text-white shrink-0">Analysis</h2>
                        <div className="bg-white/5 rounded-xl p-2 border border-white/10 h-[180px] w-full shrink-0">
                            {loading || !data || data.length === 0 ? (
                                <div className="text-center p-4 text-slate-500 flex items-center justify-center h-full">Loading Chart...</div>
                            ) : (
                                <WeatherChart data={data} modelStats={modelStats} />
                            )}
                        </div>
                        <div className="shrink-0">
                            {modelStats && <ModelInsights stats={modelStats} />}
                        </div>
                    </div>
                )}

                {/* Bottom Pagination Dots */}
                <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-center gap-2 z-50 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent">
                    <button onClick={() => setMobilePage(0)} className={clsx("h-1.5 rounded-full transition-all duration-300", mobilePage === 0 ? "bg-indigo-400 w-8" : "bg-white/20 w-1.5")} />
                    <button onClick={() => setMobilePage(1)} className={clsx("h-1.5 rounded-full transition-all duration-300", mobilePage === 1 ? "bg-indigo-400 w-8" : "bg-white/20 w-1.5")} />
                </div>
            </div>

        </div>
    );
};


export default WeatherDashboard;
