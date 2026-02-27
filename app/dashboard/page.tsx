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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// Mock fallback data
const mockTempData = [
  { time: '12 AM', air: 28, soil: 38 },
  { time: '2 AM', air: 26, soil: 36 },
  { time: '4 AM', air: 24, soil: 35 },
  { time: '6 AM', air: 23, soil: 34 },
  { time: '8 AM', air: 25, soil: 34 },
  { time: '10 AM', air: 32, soil: 36 },
  { time: '12 PM', air: 40, soil: 34 },
  { time: '2 PM', air: 45, soil: 42 },
  { time: '4 PM', air: 44, soil: 43 },
  { time: '6 PM', air: 38, soil: 42 },
  { time: '8 PM', air: 34, soil: 40 },
  { time: '10 PM', air: 30, soil: 39 },
];

export default function Dashboard() {
  const searchParams = useSearchParams();
  const zip = searchParams.get('zip') || '30004';

  const [realData, setRealData] = useState<any>(null);
  const [locationName, setLocationName] = useState('Loading location...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let lat: number | null = searchParams.get('lat') ? Number(searchParams.get('lat')) : null;
        let lon: number | null = searchParams.get('lon') ? Number(searchParams.get('lon')) : null;

        if (lat && lon) {
          setLocationName('Current Location');
        } else {
          // US Census Geocoder – returns numbers directly (no parseFloat)
          const geocodeUrl = `https://geocoding.geo.census.gov/geocoder/locations/address?zip=${zip}&benchmark=Public_AR_Current&format=json`;
          const geocodeRes = await axios.get(geocodeUrl);

          if (!geocodeRes.data.result?.addressMatches?.length) {
            throw new Error('ZIP code not found');
          }

          const match = geocodeRes.data.result.addressMatches[0];
          lat = match.coordinates.y;
          lon = match.coordinates.x;

          const city = match.addressComponents.city || 'Alpharetta';
          const state = match.addressComponents.state || 'GA';
          setLocationName(`${city}, ${state}`);
        }

        // Fetch real Open-Meteo data
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${today}&end_date=${tomorrow}&hourly=soil_temperature_0cm,temperature_2m,dewpoint_2m,relative_humidity_2m,wind_speed_10m,cloudcover,precipitation`;
        const weatherRes = await axios.get(weatherUrl);

        setRealData(weatherRes.data.hourly);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load real data — showing demo.');
      }
    };

    fetchData();
  }, [searchParams]);

  // Use real data if available, otherwise mock
  const displayData = realData?.hourly || mockTempData;

  // Calculations
  const minTemp = Math.min(...displayData.map((d: any) => d.temperature_2m ?? d.air ?? 0));
  const minTempF = minTemp * 9/5 + 32;
  const dewPoint = realData ? realData.dewpoint_2m?.[0] ?? 25 : 25;
  const humidity = realData ? realData.relative_humidity_2m?.[0] ?? 90 : 90;
  const wind = realData ? realData.wind_speed_10m?.[0] ?? 4 : 4;
  const cloud = realData ? realData.cloudcover?.[0] ?? 20 : 20;

  let fri = ((4 - minTemp) / 4) * (dewPoint <= 0 ? 1 : 0) * (humidity / 100) * (1 - wind / 20) * (1 - cloud / 100);
  fri = Math.max(0, Math.min(1, fri));

  const risk = fri > 0.5 ? 'High' : 'Low';
  const message = fri > 0.5 ? 'Frost delay recommended until thaw' : 'No delay needed';

  const coveringNeeded = minTempF < 25;
  const coveringMessage = coveringNeeded ? `Cover greens tonight - low of ${Math.round(minTempF)}°F forecasted` : 'No covering needed';

  const sprayWindows = [];
  for (let i = 0; i < Math.min(24, displayData.length); i++) {
    const tempF = (displayData[i].temperature_2m ?? displayData[i].air ?? 0) * 9/5 + 32;
    const windSpeed = displayData[i].wind_speed_10m ?? 5;
    const precip = displayData[i].precipitation ?? 0;
    if (tempF >= 50 && tempF <= 85 && windSpeed < 10 && precip === 0) {
      sprayWindows.push(`Hour ${i + 1}: Good (Temp: ${Math.round(tempF)}°F, Wind: ${windSpeed} mph)`);
    }
  }

  const highHumidity = humidity > 80;
  const chemRec = highHumidity ? { name: 'Azoxystrobin', conditions: 'High humidity fungi control', buyLink: 'https://example.com/buy' } : null;

  // Chart data
  const chartData = displayData.slice(0, 24).map((d: any, i: number) => ({
    time: `${i + 1} hr`,
    air: (d.temperature_2m ?? d.air ?? 0) * 9/5 + 32,
    soil: (d.soil_temperature_0cm ?? d.soil ?? 0) * 9/5 + 32,
  }));

  return (
    <div className="pt-28 pb-20 px-4 md:px-8 bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Course Header "Frame" Section */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">System Active</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">Course Overview</h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm font-medium">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#228B22]" /> {locationName}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1.5"><Leaf className="w-4 h-4 text-[#228B22]" /> TifEagle Bermuda</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#228B22]" /> Updated 12m ago</span>
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
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
           
            {/* Green Covering Alert - Urgent Banner */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl flex items-start gap-4">
              <div className="bg-amber-500 text-white p-2 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-900">Green Covering Recommended</h3>
                <p className="text-amber-800 mt-1">
                  Low of <span className="font-bold underline">22°F</span> forecasted tonight. Covering should be completed by 4:30 PM today.
                  Estimated removal: Tuesday morning at 10:00 AM.
                </p>
                <button className="mt-3 text-sm font-bold text-amber-900 flex items-center gap-1 hover:underline">
                  View coverage plan <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Frost Risk Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                    <Snowflake className="w-6 h-6 text-blue-500" />
                    Frost Risk
                  </h3>
                  <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em]">
                    High Risk
                  </span>
                </div>
                <div className="p-8">
                  <div className="mb-8">
                    <div className="flex justify-between mb-3">
                      <span className="text-sm font-bold text-slate-500">Delay Status</span>
                      <span className="text-sm font-black text-slate-900">Ends 9:00 AM</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full w-[75%] shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                    </div>
                    <p className="mt-4 text-sm text-slate-600 font-medium leading-relaxed">
                      Air temp currently <span className="font-black text-slate-900">23°F</span>.
                      Light wind may assist in clearing frost by 8:45 AM.
                    </p>
                  </div>
                 
                  <div className="h-48 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockTempData}>
                        <defs>
                          <linearGradient id="colorAir" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        />
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
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-black text-slate-900">8:00 AM – 10:30 AM Tomorrow</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Wind className="w-4 h-4 text-[#228B22]" /> &lt;8 mph
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Droplets className="w-4 h-4 text-[#228B22]" /> 0% Rain
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Thermometer className="w-4 h-4 text-[#228B22]" /> 45-52°F
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recommended App</h4>
                    <div className="flex items-start gap-4 p-4 border-2 border-slate-50 rounded-2xl hover:border-[#228B22]/20 hover:bg-slate-50 transition-all cursor-pointer group">
                      <div className="w-12 h-12 bg-[#228B22]/10 rounded-xl flex items-center justify-center text-[#228B22] shadow-inner">
                        <FlaskConical className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-900">Azoxystrobin (Fungicide)</p>
                        <p className="text-xs text-slate-500 font-medium">Target: Spring Dead Spot</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors mt-2" />
                    </div>
                  </div>
                 
                  <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98]">
                    Add to Application Log
                  </button>
                </div>
              </div>
            </div>
            {/* Chemical Recommendations - Full Width within Content */}
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
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <th className="px-8 py-4">Trigger</th>
                      <th className="px-8 py-4">Product Name</th>
                      <th className="px-8 py-4">Ideal Window</th>
                      <th className="px-8 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { trigger: 'High Humidity', product: 'Segway Fungicide', window: 'Immediate', color: 'text-orange-600', bg: 'bg-orange-50' },
                      { trigger: 'Soil Temp 55°F', product: 'Ronstar G Herbicide', window: 'Next 3 Days', color: 'text-blue-600', bg: 'bg-blue-50' },
                      { trigger: 'Growth Regulation', product: 'Primo Maxx', window: 'Friday', color: 'text-[#228B22]', bg: 'bg-emerald-50' },
                    ].map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <span className={`text-[10px] font-black ${item.color} ${item.bg} px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center w-fit gap-2`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${item.color.replace('text', 'bg')}`}></div>
                            {item.trigger}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-slate-800">{item.product}</td>
                        <td className="px-8 py-5 text-sm text-slate-500 font-medium">{item.window}</td>
                        <td className="px-8 py-5 text-right">
                          <button className="text-slate-400 hover:text-[#228B22] p-2 hover:bg-[#228B22]/10 rounded-xl transition-all">
                            <ExternalLink className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                <button className="text-xs font-bold text-[#228B22] hover:underline flex items-center gap-1">
                  View full chemical database <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          {/* Sidebar Stats */}
          <div className="space-y-8">
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
                      <p className="text-2xl font-black text-slate-900">38.2°F</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1">
                      <ArrowUp className="w-3 h-3" /> 2.1°
                    </span>
                  </div>
                </div>
               
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                      <Droplets className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vol. Moisture</p>
                      <p className="text-2xl font-black text-slate-900">22.4%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ideal
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center shadow-sm">
                      <Wind className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wind Speed</p>
                      <p className="text-2xl font-black text-slate-900">4.5 mph</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-full">NW</span>
                  </div>
                </div>
              </div>
             
              <div className="mt-10 pt-8 border-t border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Course Intel</h4>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Grass Type:</span>
                    <span className="font-bold text-slate-900">Bermuda</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Mow Height:</span>
                    <span className="font-bold text-slate-900">0.110"</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Last Fertilized:</span>
                    <span className="font-bold text-slate-900">12 Days Ago</span>
                  </div>
                </div>
                <button className="w-full mt-8 py-4 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2">
                  <Settings className="w-4 h-4" />
                  Adjust Settings
                </button>
              </div>
            </div>
            {/* Quick Actions Frame */}
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