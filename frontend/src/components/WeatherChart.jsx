import React, { useState } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Label } from 'recharts';
import { format } from 'date-fns';
import { Eye, EyeOff } from 'lucide-react';

const WeatherChart = ({ data, modelStats }) => {
    const [showUnified, setShowUnified] = useState(true);
    const [showAI, setShowAI] = useState(true);
    const [metric, setMetric] = useState('temp'); // 'temp', 'wind', 'humidity'

    if (!data || data.length === 0) return null;

    // Helper to get data keys and config based on metric
    const getMetricConfig = () => {
        switch (metric) {
            case 'wind':
                return {
                    key: 'wind_speed_10m',
                    aiKey: 'prediction_wind',
                    label: 'Wind Speed',
                    unit: ' km/h',
                    color: '#0ea5e9', // Sky blue
                    aiColor: '#a855f7',
                    showAI: true
                };
            case 'humidity':
                return {
                    key: 'relative_humidity_2m',
                    aiKey: 'prediction_hum',
                    label: 'Humidity',
                    unit: '%',
                    color: '#10b981', // Emerald
                    aiColor: '#a855f7',
                    showAI: true
                };
            default:
                return {
                    key: 'unified_temp',
                    aiKey: 'prediction',
                    label: 'Temperature',
                    unit: '°',
                    color: '#3b82f6', // Blue
                    aiColor: '#a855f7', // Purple
                    showAI: true
                };
        }
    };

    const config = getMetricConfig();

    return (
        <div className="h-full min-h-[400px] w-full bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-slate-200">
                        {config.label} Analysis
                    </h3>
                    {metric === 'temp' && modelStats && (
                        <div className="text-xs text-emerald-400 font-mono flex gap-3 mt-1 animate-pulse">
                            <span>Accuracy (R²): {(modelStats.r2 * 100).toFixed(1)}%</span>
                            <span>Error (MAE): {modelStats.mae?.toFixed(1)}°</span>
                        </div>
                    )}
                </div>

                {/* Metric Toggles */}
                <div className="flex bg-white/5 p-1 rounded-xl">
                    <button
                        onClick={() => setMetric('temp')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${metric === 'temp' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Temp
                    </button>
                    <button
                        onClick={() => setMetric('wind')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${metric === 'wind' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Wind
                    </button>
                    <button
                        onClick={() => setMetric('humidity')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${metric === 'humidity' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Humidity
                    </button>
                </div>

                {/* Series Visibility Toggles */}
                <div className="flex gap-4 text-sm select-none">
                    <button
                        onClick={() => setShowUnified(!showUnified)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${showUnified ? 'bg-white/10 border-white/20 text-slate-200' : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }}></div>
                        Real & Forecast
                        {showUnified ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    {config.showAI && (
                        <button
                            onClick={() => setShowAI(!showAI)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${showAI ? 'bg-purple-500/10 border-purple-500/50 text-purple-200' : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500'}`}
                        >
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            AI Model
                            {showAI ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                    )}
                </div>
            </div>

            <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={config.color} stopOpacity={0.5} />
                                <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="#94a3b8"
                            tickFormatter={(str) => {
                                try {
                                    return format(new Date(str), 'MMM dd HH:mm');
                                } catch { return str }
                            }}
                            minTickGap={50}
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                            labelStyle={{ color: '#94a3b8', marginBottom: '8px' }}
                            labelFormatter={(label) => format(new Date(label), 'PPP HH:mm')}
                            formatter={(value, name) => {
                                if (name === config.aiKey) return [Math.round(value) + config.unit, "AI Prediction"];
                                return [Math.round(value) + config.unit, config.label];
                            }}
                        />

                        <ReferenceLine x={data.reduce((prev, curr) => Math.abs(new Date(curr.time) - new Date()) < Math.abs(new Date(prev.time) - new Date()) ? curr : prev).time} stroke="#fff" strokeOpacity={0.5} strokeDasharray="3 3">
                            <Label value="NOW" position="insideTop" offset={10} fill="#cbd5e1" fontSize={12} fontWeight="bold" />
                        </ReferenceLine>

                        <Area
                            type="monotone"
                            dataKey={config.key}
                            stroke={config.color}
                            strokeWidth={3}
                            fillOpacity={0.2}
                            fill="url(#colorMetric)"
                            name={config.key}
                            hide={!showUnified}
                            animationDuration={500}
                        />

                        {config.showAI && (
                            <Line
                                type="monotone"
                                dataKey={config.aiKey}
                                stroke={config.aiColor}
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                dot={false}
                                name={config.aiKey}
                                connectNulls
                                hide={!showAI}
                                animationDuration={500}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default WeatherChart;
