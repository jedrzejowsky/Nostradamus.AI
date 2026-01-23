import React, { useState } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Label } from 'recharts';
import { format } from 'date-fns';
import { Eye, EyeOff } from 'lucide-react';

const WeatherChart = ({ data, modelStats }) => {
    const [showUnified, setShowUnified] = useState(true);
    const [showAI, setShowAI] = useState(true);
    if (!data || data.length === 0) return null;

    return (
        <div className="h-full min-h-[400px] w-full bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-slate-200">Temperature Analysis</h3>
                    {modelStats && (
                        <div className="text-xs text-emerald-400 font-mono flex gap-3 mt-1 animate-pulse">
                            <span>Accuracy (R²): {(modelStats.r2 * 100).toFixed(1)}%</span>
                            <span>Error (MAE): {modelStats.mae?.toFixed(1)}°</span>
                        </div>
                    )}
                </div>
                <div className="flex gap-4 text-sm select-none">
                    <button
                        onClick={() => setShowUnified(!showUnified)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${showUnified ? 'bg-blue-500/10 border-blue-500/50 text-blue-200' : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <div className={`w-3 h-3 rounded-full ${showUnified ? 'bg-blue-500' : 'bg-slate-500'}`}></div>
                        Real & Forecast
                        {showUnified ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    <button
                        onClick={() => setShowAI(!showAI)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${showAI ? 'bg-purple-500/10 border-purple-500/50 text-purple-200' : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <div className={`w-3 h-3 rounded-full ${showAI ? 'bg-purple-500' : 'bg-slate-500'}`}></div>
                        AI Model
                        {showAI ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorUnified" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                        formatter={(value, name) => [
                            Math.round(value) + "°",
                            name === "unified_temp" ? "Temperature" : "AI Prediction"
                        ]}
                    />

                    {/* Current Time Marker */}
                    <ReferenceLine x={data.reduce((prev, curr) => Math.abs(new Date(curr.time) - new Date()) < Math.abs(new Date(prev.time) - new Date()) ? curr : prev).time} stroke="#fff" strokeOpacity={0.5} strokeDasharray="3 3">
                        <Label value="NOW" position="insideTop" offset={10} fill="#cbd5e1" fontSize={12} fontWeight="bold" />
                    </ReferenceLine>

                    {/* Continuous line for history + forecast */}
                    <Area
                        type="monotone"
                        dataKey="unified_temp"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={0.2}
                        fill="url(#colorUnified)"
                        name="unified_temp"
                        hide={!showUnified}
                        animationDuration={500}
                    />

                    {/* Overlay AI Prediction */}
                    <Line
                        type="monotone"
                        dataKey="prediction"
                        stroke="#a855f7"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={false}
                        name="prediction"
                        connectNulls
                        hide={!showAI}
                        animationDuration={500}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default WeatherChart;
