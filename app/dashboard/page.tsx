'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const params = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [locationName, setLocationName] = useState('Alpharetta, GA'); // Default

  useEffect(() => {
    const fetchData = async () => {
      try {
        let lat = params.get('lat');
        let lon = params.get('lon');
        const zip = params.get('zip') || '30004';

        let isGPS = false;
        if (lat && lon) {
          isGPS = true;
        } else {
          // Geocode zip if no lat/lon
          const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${zip}&country=US&count=1&language=en&format=json`;
          const geocodeResponse = await axios.get(geocodeUrl);
          if (!geocodeResponse.data.results || geocodeResponse.data.results.length === 0) {
            throw new Error('No location found for the zip code');
          }
          lat = geocodeResponse.data.results[0].latitude;
          lon = geocodeResponse.data.results[0].longitude;
          const city = geocodeResponse.data.results[0].name;
          const state = geocodeResponse.data.results[0].admin1;
          setLocationName(`${city}, ${state}`);
        }

        if (isGPS) {
          setLocationName('Current Location');
        }

        // Fetch weather with lat/lon
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=2026-02-02&end_date=2026-02-03&hourly=soil_temperature_0cm,temperature_2m,dewpoint_2m,relative_humidity_2m,wind_speed_10m,cloudcover,precipitation`;
        const weatherResponse = await axios.get(weatherUrl);
        setData(weatherResponse.data.hourly);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
      }
    };
    fetchData();
  }, [params]);

  if (error) return <p className="text-red-500 text-center mt-10">{error}</p>;
  if (!data) return <p className="text-gray-500 text-center mt-10">Loading turf data...</p>;

  // Frost Risk
  const minTemp = Math.min(...data.temperature_2m);
  const minTempF = minTemp * 9/5 + 32;
  const dewPoint = data.dewpoint_2m[0];
  const dewPointF = dewPoint * 9/5 + 32;
  const humidity = data.relative_humidity_2m[0];
  const wind = data.wind_speed_10m[0];
  const cloud = data.cloudcover[0];

  let fri = ((4 - minTemp) / 4) * (dewPoint <= 0 ? 1 : 0) * (humidity / 100) * (1 - wind / 20) * (1 - cloud / 100);
  fri = Math.max(0, Math.min(1, fri));

  const risk = fri > 0.5 ? 'High' : 'Low';
  const message = fri > 0.5 ? 'Frost delay recommended until thaw' : 'No delay needed';

  // Green Covering
  const coveringNeeded = minTempF < 25;
  const coveringMessage = coveringNeeded ? `Cover greens tonight - low of ${Math.round(minTempF)}°F forecasted` : 'No covering needed';

  // Spray Windows (check next 24 hours)
  const sprayWindows = [];
  for (let i = 0; i < 24; i++) {
    const tempF = data.temperature_2m[i] * 9/5 + 32;
    if (tempF >= 50 && tempF <= 85 && data.wind_speed_10m[i] < 10 && data.precipitation[i] === 0) {
      sprayWindows.push(`Hour ${i + 1}: Good (Temp: ${Math.round(tempF)}°F, Wind: ${data.wind_speed_10m[i]} mph)`);
    }
  }

  // Chemical Recs (static for MVP, match to conditions)
  const highHumidity = humidity > 80;
  const chemRec = highHumidity ? { name: 'Azoxystrobin', conditions: 'High humidity fungi control', buyLink: 'https://example.com/buy' } : null;

  // Chart Data (temps over 24 hours)
  const chartData = data.temperature_2m.slice(0, 24).map((temp, index) => ({
    hour: index + 1,
    airTemp: temp * 9/5 + 32,
    soilTemp: data.soil_temperature_0cm[index] * 9/5 + 32,
  }));

  return (
    <main className="min-h-screen bg-[#F8FAF5] p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-8">Turf Dashboard - {locationName}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Frost Risk Card */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Frost Risk</h2>
            <p className={`text-2xl font-bold ${risk === 'High' ? 'text-red-600' : 'text-green-600'}`}>{risk}</p>
            <p className="text-gray-600 mt-2">{message}</p>
          </div>

          {/* Green Covering Card */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Green Covering</h2>
            <p className={`text-2xl font-bold ${coveringNeeded ? 'text-red-600' : 'text-green-600'}`}>{coveringMessage}</p>
          </div>

          {/* Spray Scheduler Card */}
          <div className="bg-white rounded-3xl shadow-xl p-6 md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Spray Windows (Next 24 Hours)</h2>
            {sprayWindows.length > 0 ? (
              <ul className="list-disc ml-6 space-y-2">
                {sprayWindows.map((win, idx) => <li key={idx} className="text-gray-700">{win}</li>)}
              </ul>
            ) : (
              <p className="text-gray-600">No optimal windows - check weather.</p>
            )}
          </div>

          {/* Chemical Rec Card */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Chemical Recommendations</h2>
            {chemRec ? (
              <div>
                <p className="text-gray-700">{chemRec.name} for {chemRec.conditions}</p>
                <a href={chemRec.buyLink} className="text-primary hover:underline mt-2 block">Buy Now</a>
              </div>
            ) : (
              <p className="text-gray-600">No recs based on current conditions.</p>
            )}
          </div>

          {/* Temp Graph Card */}
          <div className="bg-white rounded-3xl shadow-xl p-6 md:col-span-1">
            <h2 className="text-xl font-semibold mb-4">Temperature Forecast</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="airTemp" stroke="#228B22" name="Air Temp (°F)" />
                <Line type="monotone" dataKey="soilTemp" stroke="#90EE90" name="Soil Temp (°F)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}