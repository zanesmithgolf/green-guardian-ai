'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import {
  Thermometer,
  Wind,
  Droplets,
  AlertTriangle,
  Calendar,
  Search,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
  Snowflake,
  FlaskConical,
  Settings,
  MapPin,
  Leaf,
  ArrowUp,
  ArrowRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Mock fallback – guaranteed array
const mockTempData = [
  { time: '12 AM', air: 28, soil: 38 },
  { time: '2 AM', air: 26, soil: 36 },
  { time: '4 AM', air: 24, soil: 35 },
  { time: '6 AM', air: 23, soil: 34 },
  { time: '8 AM', air: 25, soil: 34 },
  { time: '10 AM', air: 32, soil: 36 },
  { time: '12 PM', air: 40, soil: 40 },
  { time: '2 PM', air: 45, soil: 42 },
  { time: '4 PM', air: 44, soil: 43 },
  { time: '6 PM', air: 38, soil: 42 },
  { time: '8 PM', air: 34, soil: 40 },
  { time: '10 PM', air: 30, soil: 39 },
];

export default function Dashboard() {
  const searchParams = useSearchParams();
  const zip = searchParams.get('zip') || '30004';

  const [hourly, setHourly] = useState<any[]>([]); // always array
  const [locationName, setLocationName] = useState('Loading location...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[START] Fetching for ZIP:', zip);

        // Nominatim geocoding
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?postalcode=${zip}&countrycodes=us&format=json&limit=1`;
        const geocodeRes = await axios.get(geocodeUrl, {
          headers: { 'User-Agent': 'GreenGuardian/1.0 (contact@zanesmithgolf.com)' }
        });
        console.log('[GEOCODE] Full:', geocodeRes.data);

        if (!geocodeRes.data?.length) throw new Error('No location found');

        const result = geocodeRes.data[0];
        const lat = Number(result.lat);
        const lon = Number(result.lon);
        console.log('[GEOCODE] Lat/Lon:', lat, lon);

        const parts = result.display_name.split(', ');
        setLocationName(`${parts[0] || 'Alpharetta'}, ${parts[1] || 'GA'}`);

        // Open-Meteo
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${today}&end_date=${tomorrow}&hourly=temperature_2m,soil_temperature_0cm,dewpoint_2m,relative_humidity_2m,wind_speed_10m,cloudcover,precipitation`;
        const weatherRes = await axios.get(weatherUrl);
        console.log('[WEATHER] Full:', weatherRes.data);

        const rawHourly = weatherRes.data?.hourly;

        if (!rawHourly || !Array.isArray(rawHourly.temperature_2m) || rawHourly.temperature_2m.length === 0) {
          console.warn('[WEATHER] Invalid hourly – using mock');
          throw new Error('No valid hourly data');
        }

        // Transform to array of objects for easier mapping
        const transformed = rawHourly.time.map((time: string, i: number) => ({
          time,
          temperature_2m: rawHourly.temperature_2m[i],
          soil_temperature_0cm: rawHourly.soil_temperature_0cm[i],
          dewpoint_2m: rawHourly.dewpoint_2m[i],
          relative_humidity_2m: rawHourly.relative_humidity_2m[i],
          wind_speed_10m: rawHourly.wind_speed_10m[i],
          cloudcover: rawHourly.cloudcover[i],
          precipitation: rawHourly.precipitation?.[i] ?? 0,
        }));

        setHourly(transformed);
        console.log('[SUCCESS] Transformed hourly array length:', transformed.length);
      } catch (err: any) {
        console.error('[ERROR]', err.message, err.stack);
        setError('Failed to load real data – using demo.');
        setHourly(mockTempData);
      }
    };

    fetchData();
  }, [searchParams]);

  // Calculations – hourly is guaranteed array
  const minTemp = Math.min(...hourly.map(d => d.temperature_2m ?? d.air ?? 0));
  const minTempF = minTemp * 9/5 + 32;
  const dewPoint = hourly[0]?.dewpoint_2m ?? 25;
  const humidity = hourly[0]?.relative_humidity_2m ?? 90;
  const wind = hourly[0]?.wind_speed_10m ?? 4;
  const cloud = hourly[0]?.cloudcover ?? 20;

  let fri = ((4 - minTemp) / 4) * (dewPoint <= 0 ? 1 : 0) * (humidity / 100) * (1 - wind / 20) * (1 - cloud / 100);
  fri = Math.max(0, Math.min(1, fri));

  const risk = fri > 0.5 ? 'High' : 'Low';

  const coveringNeeded = minTempF < 25;

  const sprayWindows = [];
  for (let i = 0; i < Math.min(24, hourly.length); i++) {
    const d = hourly[i];
    const tempF = (d.temperature_2m ?? d.air ?? 0) * 9/5 + 32;
    const windSpeed = d.wind_speed_10m ?? 5;
    const precip = d.precipitation ?? 0;
    if (tempF >= 50 && tempF <= 85 && windSpeed < 10 && precip === 0) {
      sprayWindows.push(`Hour ${i + 1}: Good (Temp: ${Math.round(tempF)}°F, Wind: ${windSpeed} mph)`);
    }
  }

  const highHumidity = humidity > 80;
  const chemRec = highHumidity ? { name: 'Azoxystrobin', conditions: 'High humidity fungi control', buyLink: 'https://example.com/buy' } : null;

  // Chart data
  const chartData = hourly.slice(0, 24).map((d, i) => ({
    time: `${i + 1} hr`,
    air: (d.temperature_2m ?? d.air ?? 0) * 9/5 + 32,
    soil: (d.soil_temperature_0cm ?? d.soil ?? 0) * 9/5 + 32,
  }));

  return (
    <div className="pt-28 pb-20 px-4 md:px-8 bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">System Active</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">Course Overview</h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm font-medium">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#228B22]" /> {locationName}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-[#228B22]" /> TifEagle Bermuda
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#228B22]" /> Updated just now
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule
            </button>
            <button className="bg-[#228B22] hover:bg-[#1a6b1a] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#228B22]/20 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Covering Alert */}
            {coveringNeeded && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl flex items-start gap-4">
                <div className="bg-amber-500 text-white p-2 rounded-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-900">Green Covering Recommended</h3>
                  <p className="text-amber-800 mt-1">
                    Low of <span className="font-bold underline">{Math.round(minTempF)}°F</span> forecasted tonight. Covering should be completed by 4:30 PM today.
                    Estimated removal: Tomorrow morning at 10:00 AM.
                  </p>
                  <button className="mt-3 text-sm font-bold text-amber-900 flex items-center gap-1 hover:underline">
                    View coverage plan <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Frost Risk Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                    <Snowflake className="w-6 h-6 text-blue-500" />
                    Frost Risk
                  </h3>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] ${risk === 'High' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {risk}
                  </span>
                </div>
                <div className="p-8">
                  <div className="mb-8">
                    <div className="flex justify-between mb-3">
                      <span className="text-sm font-bold text-slate-500">Delay Status</span>
                      <span className="text-sm font-black text-slate-900">Ends ~9:00 AM</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full w-[75%] shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                    </div>
                    <p className="mt-4 text-sm text-slate-600 font-medium leading-relaxed">
                      Air temp currently <span className="font-black text-slate-900">{Math.round(minTempF)}°F</span>.
                      Light wind may assist in clearing frost.
                    </p>
                  </div>

                  <div className="h-48 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorAir" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                        <Area type="monotone" dataKey="air" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAir)" strokeWidth={3} />
                        <Area type="monotone" dataKey="soil" stroke="#10b981" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex justify-center gap-6 mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-1 bg-blue-500 rounded-full"></span> Air Temp
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-1 bg-emerald-500 rounded-full border-t border-dashed"></span> Soil Temp
                    </div>
                  </div>
                </div>
              </div>

              {/* Spray Scheduler */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-[#228B22]" />
                    Spray Window
                  </h3>
                  <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em]">
                    Optimal
                  </span>
                </div>
                <div className="p-8 space-y-6">
                  {sprayWindows.length > 0 ? (
                    <div className="space-y-4">
                      {sprayWindows.slice(0, 3).map((win, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                          <p className="font-bold text-slate-900">{win}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-600">No optimal spray windows in next 24h.</p>
                  )}

                  <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98]">
                    Add to Application Log
                  </button>
                </div>
              </div>
            </div>

            {/* Chemical Recommendations */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Smart Chemical Suggestions</h3>
                  <p className="text-sm text-slate-500 font-medium">Auto-generated based on current soil and weather triggers</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by trigger..."
                    className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#228B22] outline-none w-full md:w-72 transition-all focus:bg-white"
                  />
                </div>
              </div>

              <div className="p-8">
                {chemRec ? (
                  <div className="flex items-start gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-16 h-16 bg-[#228B22]/10 rounded-xl flex items-center justify-center text-[#228B22]">
                      <FlaskConical className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900">{chemRec.name}</h4>
                      <p className="text-slate-600 mt-1">{chemRec.conditions}</p>
                      <a
                        href={chemRec.buyLink}
                        className="mt-4 inline-flex items-center gap-2 text-[#228B22] font-bold hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View / Buy <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-600 text-center py-8">No specific recommendations at this time.</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Ground Sensors */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
              <h3 className="font-black text-slate-900 mb-8 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#228B22] rounded-full"></div>
                Ground Sensors
              </h3>
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
                      <Thermometer className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Soil Temp (4")</p>
                      <p className="text-2xl font-black text-slate-900">{Math.round(minTempF)}°F</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                      <Droplets className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Humidity</p>
                      <p className="text-2xl font-black text-slate-900">{Math.round(humidity)}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center shadow-sm">
                      <Wind className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wind Speed</p>
                      <p className="text-2xl font-black text-slate-900">{Math.round(wind)} mph</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#228B22]/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#228B22]/30 transition-colors"></div>
              <h3 className="text-xl font-black mb-6 relative z-10">Maintenance Logs</h3>
              <div className="space-y-3 relative z-10">
                <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold transition-all flex items-center justify-between px-5">
                  Log Spray App <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
                <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold transition-all flex items-center justify-between px-5">
                  Log Moisture <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
                <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold transition-all flex items-center justify-between px-5">
                  Report Disease <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}