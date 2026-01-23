import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

const WeatherChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="h-[500px] w-full bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-200">Neural Comparison Engine</h3>
                <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Historical</span>
                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-cyan-400"></div> Official Forecast</span>
                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> AI Prediction</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
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
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '8px' }}
                        labelFormatter={(label) => format(new Date(label), 'PPP p')}
                    />

                    <Area
                        type="monotone"
                        dataKey="history"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorHist)"
                        name="Historical"
                    />
                    <Area
                        type="monotone"
                        dataKey="forecast"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorFore)"
                        name="Official Forecast"
                    />
                    <Area
                        type="monotone"
                        dataKey="prediction"
                        stroke="#a855f7"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        fillOpacity={1}
                        fill="url(#colorPred)"
                        name="AI Prediction"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default WeatherChart;
