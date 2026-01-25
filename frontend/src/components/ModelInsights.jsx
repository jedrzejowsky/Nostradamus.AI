import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ModelInsights = ({ stats }) => {
    if (!stats) return null;

    const data = Object.entries(stats.feature_importance)
        .map(([name, value]) => ({
            name: formatFeatureName(name),
            value: value,
            originalKey: name
        }))
        .sort((a, b) => b.value - a.value); // Sort descending

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6 lg:rounded-3xl backdrop-blur-md">
            <h3 className="text-base lg:text-xl font-bold text-slate-200 mb-1">Model Intelligence</h3>
            <p className="text-xs lg:text-sm text-slate-400 mb-2">
                Which factors influenced the AI's decision most?
            </p>

            <div className="h-[140px] lg:h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            width={80}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ color: '#e2e8f0' }}
                            formatter={(value) => [`${(value * 100).toFixed(1)}% `, 'Influence']}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                            {data.map((entry, index) => (
                                <Cell key={`cell - ${index} `} fill={getBarColor(entry.originalKey)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const formatFeatureName = (key) => {
    const map = {
        'temp_lag_24h': 'Yesterday Temp',
        'hour': 'Time of Day',
        'day_of_year': 'Season (Day)',
        'month': 'Month',
        'wind_speed_10m': 'Wind Speed',
        'relative_humidity_2m': 'Humidity'
    };
    return map[key] || key;
};

const getBarColor = (key) => {
    // Gradient-like coloring based on typical importance or feature type
    if (key.includes('temp')) return '#f59e0b'; // Amber
    if (key.includes('hour')) return '#6366f1'; // Indigo
    if (key.includes('day') || key.includes('month')) return '#a855f7'; // Purple
    if (key.includes('wind')) return '#0ea5e9'; // Sky
    if (key.includes('humidity')) return '#10b981'; // Emerald
    return '#cbd5e1';
};

export default ModelInsights;
