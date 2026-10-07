import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

import {
  Thermometer,
  Droplets,
  Gauge,
  Wifi,
  WifiOff,
  Search,
  RefreshCw,
  MapPin,
  AlertTriangle,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Sensor {
  id: string;
  name: string;
  location: string;
  temperature: number;
  humidity: number;
  soilMoisture: number;
  waterLevel: number;
  lat: number;
  lng: number;
  online: boolean;
  lastUpdateTime: number; // timestamp (ms)
}

export function SensorMonitoring() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [search, setSearch] = useState("");
  const [tempHistory, setTempHistory] = useState<any[]>([]);
  const [humidityHistory, setHumidityHistory] = useState<any[]>([]);
  const [moistureHistory, setMoistureHistory] = useState<any[]>([]);
  const [waterLevelHistory, setWaterLevelHistory] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());

  // Tick every second so "last updated X seconds ago" and offline detection stay live
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔥 REALTIME FIREBASE LISTENER
  useEffect(() => {
    const sensorRef = ref(db, "field");

    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const receivedAt = Date.now();

      const liveSensor: Sensor = {
        id: "S-REALTIME",
        name: "Main Field Sensor",
        location: "Live Field",
        temperature: data.temp,
        humidity: data.humidity,
        soilMoisture: data.moisture,
        waterLevel: data.waterLevel ?? 0,
        lat: data.lat ?? 0,
        lng: data.lng ?? 0,
        online: true,
        lastUpdateTime: receivedAt,
      };

      setSensors([liveSensor]);
      setSelectedSensor(liveSensor);

      const timeLabel = new Date(receivedAt).toLocaleTimeString();
      setTempHistory((prev) => [...prev.slice(-14), { time: timeLabel, value: data.temp }]);
      setHumidityHistory((prev) => [...prev.slice(-14), { time: timeLabel, value: data.humidity }]);
      setMoistureHistory((prev) => [...prev.slice(-14), { time: timeLabel, value: data.moisture }]);
      setWaterLevelHistory((prev) => [...prev.slice(-14), { time: timeLabel, value: data.waterLevel ?? 0 }]);
    });

    return () => unsubscribe();
  }, []);

  // Consider a sensor offline if no update received in the last 30 seconds
  const isOnline = selectedSensor ? now - selectedSensor.lastUpdateTime < 30000 : false;

  const secondsAgo = selectedSensor ? Math.max(0, Math.floor((now - selectedSensor.lastUpdateTime) / 1000)) : null;
  const lastUpdateLabel =
    secondsAgo === null
      ? "—"
      : secondsAgo < 5
      ? "Just now"
      : secondsAgo < 60
      ? `${secondsAgo} seconds ago`
      : `${Math.floor(secondsAgo / 60)} min ago`;

  // 🔍 search filter
  const filtered = sensors.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const alerts: string[] = [];
  if (selectedSensor) {
    if (selectedSensor.temperature > 35) alerts.push(`High temperature: ${selectedSensor.temperature}°C`);
    if (selectedSensor.soilMoisture < 30) alerts.push(`Low soil moisture: ${selectedSensor.soilMoisture}%`);
    if (selectedSensor.humidity < 40) alerts.push(`Low humidity: ${selectedSensor.humidity}%`);
    if (selectedSensor.waterLevel < 5) alerts.push(`Water level too low: ${selectedSensor.waterLevel} cm`);
    if (selectedSensor.waterLevel > 20) alerts.push(`Water level too high: ${selectedSensor.waterLevel} cm`);
  }

  return (
    <div className="min-h-screen bg-green-50 p-4">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-green-800">
            🌾 Sensor Dashboard
          </h1>
          <p className="text-green-600 text-sm">
            Real-time Firebase monitoring
          </p>
        </div>

        <Button className="bg-green-600 hover:bg-green-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Live
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* LEFT LIST */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Sensors</CardTitle>

            <div className="relative mt-2">
              <Search className="absolute left-2 top-2 w-4 h-4 text-green-600" />
              <Input
                className="pl-8"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>

          <CardContent>
            {filtered.length === 0 && (
              <p className="text-sm text-gray-500">No sensors yet.</p>
            )}
            {filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedSensor(s)}
                className={`p-3 border-b cursor-pointer hover:bg-green-50 ${
                  selectedSensor?.id === s.id ? "bg-green-50" : ""
                }`}
              >
                <div className="flex justify-between">
                  <p className="font-semibold">{s.name}</p>
                  {isOnline ? (
                    <Wifi className="text-green-600 w-4 h-4" />
                  ) : (
                    <WifiOff className="text-red-600 w-4 h-4" />
                  )}
                </div>
                <p className="text-xs text-gray-500">{s.location}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* RIGHT DETAILS */}
        <div className="md:col-span-3 space-y-4">
          {selectedSensor && (
            <>
              {/* Alerts */}
              {alerts.length > 0 && (
                <Card className="border-red-300">
                  <CardContent className="p-4 space-y-2">
                    {alerts.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        {a}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* TEMP */}
                <Card>
                  <CardContent className="p-4">
                    <Thermometer className="text-orange-500" />
                    <h2 className="text-xl font-bold">
                      {selectedSensor.temperature}°C
                    </h2>
                    <p className="text-gray-500">Temperature</p>
                  </CardContent>
                </Card>

                {/* HUMIDITY */}
                <Card>
                  <CardContent className="p-4">
                    <Droplets className="text-blue-500" />
                    <h2 className="text-xl font-bold">
                      {selectedSensor.humidity}%
                    </h2>
                    <p className="text-gray-500">Humidity</p>
                  </CardContent>
                </Card>

                {/* MOISTURE */}
                <Card>
                  <CardContent className="p-4">
                    <Gauge className="text-green-600" />
                    <h2 className="text-xl font-bold">
                      {selectedSensor.soilMoisture}%
                    </h2>
                    <p className="text-gray-500">Soil Moisture</p>
                  </CardContent>
                </Card>

                {/* WATER LEVEL */}
                <Card>
                  <CardContent className="p-4">
                    <Droplets className="text-cyan-600" />
                    <h2 className="text-xl font-bold">
                      {selectedSensor.waterLevel} cm
                    </h2>
                    <p className="text-gray-500">Water Level</p>
                  </CardContent>
                </Card>

                {/* STATUS */}
                <Card className="md:col-span-4">
                  <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm">Last update: {lastUpdateLabel}</p>
                    <Badge className={isOnline ? "bg-green-600" : "bg-red-500"}>
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* TREND CHARTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">🌡 Temperature Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={tempHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" hide />
                        <YAxis />
                        <Tooltip />
                        <Line dataKey="value" stroke="#f97316" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">💧 Humidity Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={humidityHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" hide />
                        <YAxis />
                        <Tooltip />
                        <Line dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">🌱 Soil Moisture Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={moistureHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" hide />
                        <YAxis />
                        <Tooltip />
                        <Line dataKey="value" stroke="#16a34a" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">🌊 Water Level Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={waterLevelHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" hide />
                        <YAxis />
                        <Tooltip />
                        <Line dataKey="value" stroke="#0891b2" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* GPS LOCATION */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-red-500" />
                    GPS Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-8 text-sm">
                  <p>Latitude: {selectedSensor.lat}</p>
                  <p>Longitude: {selectedSensor.lng}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}