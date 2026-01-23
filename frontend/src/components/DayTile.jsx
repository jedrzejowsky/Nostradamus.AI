import React from 'react';
import { format } from 'date-fns';
import { Cloud, CloudRain, Sun, CloudSnow, CloudLightning, CloudDrizzle, CloudFog } from 'lucide-react';
import { clsx } from 'clsx';

const getWeatherIcon = (code) => {
    if (code === 0 || code === 1) return <Sun className="text-amber-400" />;
    if (code === 2) return <Cloud className="text-slate-400" />;
    if (code === 3) return <Cloud className="text-slate-500" />;
    if ([45, 48].includes(code)) return <CloudFog className="text-slate-400" />;
    if ([51, 53, 55, 56, 57].includes(code)) return <CloudDrizzle className="text-blue-300" />;
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <CloudRain className="text-blue-400" />;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow className="text-white" />;
    if ([95, 96, 99].includes(code)) return <CloudLightning className="text-purple-400" />;
    return <Cloud className="text-slate-400" />;
};

const DayTile = ({ day, onClick, isSelected }) => {
    const date = new Date(day.time);

    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 min-w-[90px]",
                isSelected
                    ? "bg-white/10 border-white/20 shadow-lg scale-105"
                    : "bg-transparent border-transparent hover:bg-white/5"
            )}
        >
            <div className="flex flex-col items-center mb-2">
                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                    {format(date, 'EEE')}
                </span>
                <span className="text-slate-600 font-medium text-[10px] mt-0.5">
                    {format(date, 'd MMM')}
                </span>
            </div>

            <div className="mb-3 transform scale-125">
                {getWeatherIcon(day.weather_code)}
            </div>

            <div className="flex flex-col items-center">
                <span className={clsx("font-bold text-xl", isSelected ? "text-white" : "text-slate-200")}>
                    {Math.round(day.temperature_2m_max)}°
                </span>
                <span className="text-xs text-slate-500 font-medium mt-1">
                    {Math.round(day.temperature_2m_min)}°
                </span>
            </div>
        </button>
    );
};

export default DayTile;
