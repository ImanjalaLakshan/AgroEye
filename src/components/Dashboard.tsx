import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

import {
  Thermometer,
  Droplets,
  Gauge,
  AlertTriangle,
  CheckCircle2,
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

export function Dashboard() {
  const [data, setData] = useState({
    temp: 0,
    humidity: 0,
    moisture: 0,
    waterLevel: 0,
    lat: 0,
    lng: 0,
  });

  const [alerts, setAlerts] = useState<any[]>([]);

  const [tempHistory, setTempHistory] = useState<any[]>([]);
  const [moistureHistory, setMoistureHistory] = useState<any[]>([]);
  const [waterLevelHistory, setWaterLevelHistory] = useState<any[]>([]);

  useEffect(() => {
    const dataRef = ref(db, "field");

    onValue(dataRef, (snapshot) => {
      const value = snapshot.val();
      if (!value) return;

      setData(value);

      const time = new Date().toLocaleTimeString();

      setTempHistory((prev) => [
        ...prev.slice(-12),
        { time, temp: value.temp },
      ]);

      setMoistureHistory((prev) => [
        ...prev.slice(-12),
        { time, moisture: value.moisture },
      ]);

      setWaterLevelHistory((prev) => [
        ...prev.slice(-12),
        { time, waterLevel: value.waterLevel },
      ]);

      const newAlerts: any[] = [];

      if (value.temp > 35) {
        newAlerts.push({
          type: "high",
          message: "High Temperature: " + value.temp + "C",
        });
      }

      if (value.moisture < 30) {
        newAlerts.push({
          type: "high",
          message: "Low Soil Moisture: " + value.moisture + "%",
        });
      }

      if (value.humidity < 40) {
        newAlerts.push({
          type: "medium",
          message: "Low Humidity: " + value.humidity + "%",
        });
      }

      if (value.waterLevel < 5) {
        newAlerts.push({
          type: "high",
          message: "Water Level Too Low: " + value.waterLevel + " cm - Field needs irrigation",
        });
      } else if (value.waterLevel > 20) {
        newAlerts.push({
          type: "high",
          message: "Water Level Too High: " + value.waterLevel + " cm - Flooding risk",
        });
      }

      setAlerts(newAlerts);
    });
  }, []);

  const statusColor = data.moisture > 60 ? "text-green-600" : "text-red-600";

  const waterLevelColor =
    data.waterLevel < 5 || data.waterLevel > 20 ? "text-red-600" : "text-blue-600";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6 space-y-6">

      <h1 className="text-2xl font-bold text-green-800">
        Smart AgroEye Dashboard
      </h1>

      <Card className="border-red-300">
        <CardHeader>
          <CardTitle>Live Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 />
              All systems normal
            </div>
          ) : (
            alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-red-600 mb-2">
                <AlertTriangle className="w-4 h-4" />
                {a.message}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-4 gap-4">

        <Card>
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-gray-500">Temperature</p>
              <h2 className="text-2xl font-bold text-orange-500">
                {data.temp}C
              </h2>
            </div>
            <Thermometer className="w-10 h-10 text-orange-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-gray-500">Humidity</p>
              <h2 className="text-2xl font-bold text-blue-500">
                {data.humidity}%
              </h2>
            </div>
            <Droplets className="w-10 h-10 text-blue-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-gray-500">Soil Moisture</p>
              <h2 className={"text-2xl font-bold " + statusColor}>
                {data.moisture}%
              </h2>
              <p className="text-xs">
                {data.moisture > 60 ? "Healthy" : "Needs Water"}
              </p>
            </div>
            <Gauge className="w-10 h-10 text-green-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-gray-500">Water Level</p>
              <h2 className={"text-2xl font-bold " + waterLevelColor}>
                {data.waterLevel} cm
              </h2>
              <p className="text-xs">
                {data.waterLevel < 5
                  ? "Too Low"
                  : data.waterLevel > 20
                  ? "Too High"
                  : "Optimal"}
              </p>
            </div>
            <Droplets className="w-10 h-10 text-cyan-600" />
          </CardContent>
        </Card>

      </div>

      <div className="grid md:grid-cols-2 gap-4">

        <Card>
          <CardHeader>
            <CardTitle>Temperature Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={tempHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line dataKey="temp" stroke="#f97316" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Moisture Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={moistureHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line dataKey="moisture" stroke="#2563eb" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Water Level Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={waterLevelHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line dataKey="waterLevel" stroke="#0891b2" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>GPS Location</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Latitude: {data.lat}</p>
          <p>Longitude: {data.lng}</p>
        </CardContent>
      </Card>

    </div>
  );
}