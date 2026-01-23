import React from 'react';
import WeatherDashboard from './components/WeatherDashboard';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8 overflow-x-hidden relative selection:bg-purple-500/30">
      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b border-white/5 pb-4">
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
            Nostradamus.AI
          </h1>
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-400">
            ML WEATHER FORECAST
          </div>
        </header>

        <main>
          <WeatherDashboard />
        </main>
      </div>
    </div>
  );
}

export default App;
