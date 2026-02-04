'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [zip, setZip] = useState('30004');  // Default to Alpharetta

  const handleLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        window.location.href = `/dashboard?lat=${lat}&lon=${lon}`;
      },
      (err) => {
        alert('Unable to get location: ' + err.message);
      }
    );
  };

  return (
    <main className="min-h-screen bg-[#F8FAF5] font-sans bg-[url('/background-graphic.png')] bg-cover bg-center bg-no-repeat">
      <div className="max-w-5xl mx-auto px-6 py-12">
        
        {/* Header / Logo */}
        <div className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              🌱
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary tracking-tight">Green Guardian AI</h1>
              <p className="text-xs text-gray-500 -mt-1">Turf Intelligence</p>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-[52px] leading-[58px] font-semibold text-gray-900 mb-4">
            Optimize Your Golf Course
          </h2>
          <p className="text-2xl text-gray-600 max-w-2xl mx-auto">
            Frost delays • Green covers • Spray timing • Chemical recommendations
          </p>
          <p className="text-gray-500 mt-2">Powered by real-time soil & weather data</p>
        </div>

        {/* Location Card */}
        <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl p-10">
          <h3 className="text-xl font-semibold mb-6 text-center">Enter Course Location</h3>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-gray-600 mb-2">ZIP Code</label>
              <input
                id="zip"
                name="zip"
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-primary text-lg"
              />
            </div>

            <Link href={`/dashboard?zip=${zip}`} className="block w-full bg-primary hover:bg-[#1e6b1e] transition-colors text-white font-semibold py-4 rounded-2xl text-lg shadow-lg shadow-green-900/20 text-center">
              Get Turf Insights
            </Link>
          </div>

          <div className="text-center mt-4">
            <button onClick={handleLocation} className="text-sm text-primary hover:underline flex items-center gap-2 mx-auto">
              📍 Use my current location
            </button>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="text-center mt-16 text-gray-400 text-sm">
          Recommendations are for guidance only • Always follow local regulations
        </div>
      </div>
    </main>
  );
}