import React, { useEffect, useState } from 'react';
import WeatherChart from './WeatherChart';
import { CloudRain, Wind, Thermometer, BrainCircuit, Activity, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { format, subDays, addDays } from 'date-fns';

const API_BASE = 'http://localhost:8000/api/weather';

const WeatherDashboard = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [predicting, setPredicting] = useState(false);
    const [error, setError] = useState(null);

    // Default: Warsaw
    const lat = 52.2297;
    const lon = 21.0122;

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Get History (Last 3 days)
            const startDate = format(subDays(new Date(), 3), 'yyyy-MM-dd');
            const endDate = format(new Date(), 'yyyy-MM-dd'); // Today

            const histRes = await fetch(`${API_BASE}/history?lat=${lat}&lon=${lon}&start_date=${startDate}&end_date=${endDate}`);
            const histData = await histRes.json();

            // 2. Get Forecast (Next 7 days)
            const foreRes = await fetch(`${API_BASE}/forecast?lat=${lat}&lon=${lon}&days=7`);
            const foreData = await foreRes.json();

            // Merge Data
            const merged = mergeData(histData, foreData, []);
            setData(merged);
        } catch (err) {
            console.error(err);
            setError("Failed to load weather data.");
        } finally {
            setLoading(false);
        }
    };

    const handlePredict = async () => {
        setPredicting(true);
        try {
            const res = await fetch(`${API_BASE}/predict?lat=${lat}&lon=${lon}&days=7`);
            const payload = await res.json();

            if (payload.prediction) {
                // Re-merge with prediction
                const newData = mergeData(
                    // Recover existing history/forecast from state (imperfect but okay for MVP)
                    data.filter(d => d.history !== null),
                    data.filter(d => d.forecast !== null),
                    payload.prediction
                );
                setData(newData);
            }
        } catch (err) {
            setError("AI Prediction failed.");
        } finally {
            setPredicting(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Helper to merge arrays by time
    const mergeData = (hist, fore, pred) => {
        const map = new Map();

        // Normalize time to simple ISO string hour precision if needed
        // But Open-Meteo returns ISO strings.

        hist.forEach(d => {
            const t = d.time;
            if (!map.has(t)) map.set(t, { time: t });
            map.get(t).history = d.temperature_2m;
        });

        fore.forEach(d => {
            const t = d.time;
            if (!map.has(t)) map.set(t, { time: t });
            map.get(t).forecast = d.temperature_2m;
        });

        pred.forEach(d => {
            const t = d.time; // key matches?
            // Prediction returns predicted_temperature_2m
            if (!map.has(t)) map.set(t, { time: t });
            map.get(t).prediction = d.predicted_temperature_2m;
        });

        return Array.from(map.values()).sort((a, b) => new Date(a.time) - new Date(b.time));
    };

    const currentTemp = data.find(d => d.history !== undefined)?.history || 0;
    // Should ideally get *latest* history.
    const latestHistory = [...data].reverse().find(d => d.history !== undefined);

    return (
        <div className="space-y-6">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-lg flex items-center justify-between">
                    <div>
                        <div className="text-slate-400 text-sm font-medium uppercase tracking-wider">Current Temp</div>
                        <div className="text-3xl font-bold mt-1 text-white">{latestHistory ? latestHistory.history.toFixed(1) : "--"}°C</div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Thermometer size={24} />
                    </div>
                </div>

                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-lg flex items-center justify-center col-span-1 md:col-span-2 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <button
                        onClick={handlePredict}
                        disabled={predicting}
                        className="relative z-10 flex items-center gap-3 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-lg shadow-purple-500/25 hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
                    >
                        {predicting ? <RefreshCw className="animate-spin" /> : <BrainCircuit />}
                        {predicting ? "Training Model..." : "Generate AI Prediction"}
                    </button>
                </div>

                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-lg flex items-center justify-between">
                    <div>
                        <div className="text-slate-400 text-sm font-medium uppercase tracking-wider">Accuracy</div>
                        <div className="text-3xl font-bold mt-1 text-green-400">--%</div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                        <Activity size={24} />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="h-[400px] w-full flex items-center justify-center text-slate-500">Loading data...</div>
            ) : (
                <WeatherChart data={data} />
            )}

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
                    {error}
                </div>
            )}
        </div>
    );
};

export default WeatherDashboard;
