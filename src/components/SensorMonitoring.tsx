
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Droplets,
  Gauge,
  Leaf,
  MapPin,
  Radio,
  Search,
  Thermometer,
  Waves,
  Wifi,
  WifiOff,
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
  lastUpdateTime: number;
}

type Reading = {
  time: string;
  value: number;
};

const panel =
  "rounded-2xl border border-emerald-100 bg-white shadow-sm";

// SENSOR READING CARD
function ReadingCard({
  title,
  value,
  unit,
  icon: Icon,
  accent,
  status,
  isOnline,
}: {
  title: string;
  value: number;
  unit: string;
  icon: typeof Thermometer;
  accent: string;
  status?: string;
  isOnline: boolean;
}) {
  return (
    <div
      className={`${panel} min-w-0 p-4 sm:p-5 transition-shadow hover:shadow-md`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}
        >
          <Icon className="h-5 w-5" />
        </span>

        <span
          className={`flex items-center gap-1 text-[11px] font-semibold ${isOnline ? "text-emerald-600" : "text-red-500"
            }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-red-500"
              }`}
          />
          {isOnline ? "LIVE" : "OFFLINE"}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-800">
        {value ?? "—"}
        <span className="ml-1 text-base font-semibold text-slate-500">
          {unit}
        </span>
      </p>

      <p className="mt-3 inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
        {status ?? "Real-time reading"}
      </p>
    </div>
  );
}

// LIVE TREND CHART
function TrendCard({
  title,
  data,
  color,
  unit,
  icon: Icon,
}: {
  title: string;
  data: Reading[];
  color: string;
  unit: string;
  icon: typeof Thermometer;
}) {
  return (
    <div className={`${panel} min-w-0 p-4 sm:p-5`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Icon className="h-4 w-4" />
          </span>

          <h3 className="truncate text-sm font-bold text-slate-800 sm:text-base">
            {title}
          </h3>
        </div>

        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Live
        </span>
      </div>

      <div className="h-52 w-full sm:h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 8,
              right: 12,
              left: -22,
              bottom: 4,
            }}
          >
            <CartesianGrid
              stroke="#e7f2ed"
              strokeDasharray="4 4"
              vertical={false}
            />

            <XAxis
              dataKey="time"
              tick={{
                fontSize: 10,
                fill: "#94a3b8",
              }}
              minTickGap={25}
            />

            <YAxis
              tick={{
                fontSize: 11,
                fill: "#94a3b8",
              }}
              width={42}
            />

            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #d1fae5",
                fontSize: 12,
              }}
              formatter={(value: number | string | undefined) => [
                `${value ?? "—"} ${unit}`,
                title,
              ]}
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        {title} ({unit})
      </div>
    </div>
  );
}

// MAIN SENSOR MONITORING PAGE
export function SensorMonitoring() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensor, setSelectedSensor] =
    useState<Sensor | null>(null);

  const [search, setSearch] = useState("");

  const [tempHistory, setTempHistory] =
    useState<Reading[]>([]);

  const [humidityHistory, setHumidityHistory] =
    useState<Reading[]>([]);

  const [moistureHistory, setMoistureHistory] =
    useState<Reading[]>([]);

  const [waterLevelHistory, setWaterLevelHistory] =
    useState<Reading[]>([]);

  const [now, setNow] = useState(Date.now());

  // LIVE CLOCK AND OFFLINE DETECTION
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ORIGINAL FIREBASE REALTIME LISTENER
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

      const timeLabel =
        new Date(receivedAt).toLocaleTimeString();

      setTempHistory((prev) => [
        ...prev.slice(-14),
        {
          time: timeLabel,
          value: data.temp,
        },
      ]);

      setHumidityHistory((prev) => [
        ...prev.slice(-14),
        {
          time: timeLabel,
          value: data.humidity,
        },
      ]);

      setMoistureHistory((prev) => [
        ...prev.slice(-14),
        {
          time: timeLabel,
          value: data.moisture,
        },
      ]);

      setWaterLevelHistory((prev) => [
        ...prev.slice(-14),
        {
          time: timeLabel,
          value: data.waterLevel ?? 0,
        },
      ]);
    });

    return () => unsubscribe();
  }, []);

  // ORIGINAL 30 SECOND ONLINE / OFFLINE LOGIC
  const isOnline = selectedSensor
    ? now - selectedSensor.lastUpdateTime < 30000
    : false;

  const secondsAgo = selectedSensor
    ? Math.max(
      0,
      Math.floor(
        (now - selectedSensor.lastUpdateTime) / 1000
      )
    )
    : null;

  const lastUpdateLabel =
    secondsAgo === null
      ? "—"
      : secondsAgo < 5
        ? "Just now"
        : secondsAgo < 60
          ? `${secondsAgo} seconds ago`
          : `${Math.floor(secondsAgo / 60)} min ago`;

  // SENSOR SEARCH
  const filtered = sensors.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // ORIGINAL ALERT THRESHOLDS
  const alerts: string[] = [];

  if (selectedSensor) {
    if (selectedSensor.temperature > 35) {
      alerts.push(
        `High temperature: ${selectedSensor.temperature}°C`
      );
    }

    if (selectedSensor.soilMoisture < 30) {
      alerts.push(
        `Low soil moisture: ${selectedSensor.soilMoisture}%`
      );
    }

    if (selectedSensor.humidity < 40) {
      alerts.push(
        `Low humidity: ${selectedSensor.humidity}%`
      );
    }

    if (selectedSensor.waterLevel < 5) {
      alerts.push(
        `Water level too low: ${selectedSensor.waterLevel} cm`
      );
    }

    if (selectedSensor.waterLevel > 20) {
      alerts.push(
        `Water level too high: ${selectedSensor.waterLevel} cm`
      );
    }
  }

  const latest = selectedSensor
    ? [
      {
        label: "Temperature",
        value: `${selectedSensor.temperature}°C`,
        icon: Thermometer,
        color: "text-orange-500",
      },
      {
        label: "Humidity",
        value: `${selectedSensor.humidity}%`,
        icon: Droplets,
        color: "text-blue-500",
      },
      {
        label: "Soil Moisture",
        value: `${selectedSensor.soilMoisture}%`,
        icon: Leaf,
        color: "text-emerald-600",
      },
      {
        label: "Water Level",
        value: `${selectedSensor.waterLevel} cm`,
        icon: Waves,
        color: "text-cyan-600",
      },
    ]
    : [];

  return (
    <div className="min-h-screen bg-[#f2fbf7] px-3 py-5 text-slate-800 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">

        {/* PAGE HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
              <Leaf className="h-4 w-4" />
              AgroEye · Smart Farming
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">
              Sensors
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Real-time field readings to help you make
              better decisions.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
            <Clock3 className="h-4 w-4 text-emerald-600" />

            <span className="text-xs font-medium text-slate-600">
              Updated {lastUpdateLabel}
            </span>
          </div>
        </header>

        {/* FIELD STATUS HEADER */}
        <section
          className={`${panel} flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 text-white">
              <Leaf className="h-6 w-6" />
            </span>

            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-emerald-950">
                {selectedSensor?.name ??
                  "Waiting for field sensor"}
              </h2>

              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {selectedSensor?.location ?? "Live Field"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${isOnline
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
                }`}
            >
              {isOnline ? (
                <Wifi className="h-4 w-4" />
              ) : (
                <WifiOff className="h-4 w-4" />
              )}

              {isOnline
                ? "Sensor Online"
                : "Sensor Offline"}
            </span>

            <span className="text-xs text-slate-500">
              Last update: {lastUpdateLabel}
            </span>
          </div>
        </section>

        {selectedSensor ? (
          <>
            {/* LIVE SENSOR CARDS */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <ReadingCard
                title="Temperature"
                value={selectedSensor.temperature}
                unit="°C"
                icon={Thermometer}
                accent="bg-orange-100 text-orange-600"
                status={
                  selectedSensor.temperature > 35
                    ? "High temperature"
                    : "Current temperature"
                }
                isOnline={isOnline}
              />

              <ReadingCard
                title="Humidity"
                value={selectedSensor.humidity}
                unit="%"
                icon={Droplets}
                accent="bg-blue-100 text-blue-600"
                status={
                  selectedSensor.humidity < 40
                    ? "Low humidity"
                    : "Current humidity"
                }
                isOnline={isOnline}
              />

              <ReadingCard
                title="Soil Moisture"
                value={selectedSensor.soilMoisture}
                unit="%"
                icon={Leaf}
                accent="bg-emerald-100 text-emerald-600"
                status={
                  selectedSensor.soilMoisture < 30
                    ? "Low moisture"
                    : "Current soil moisture"
                }
                isOnline={isOnline}
              />

              <ReadingCard
                title="Water Level"
                value={selectedSensor.waterLevel}
                unit="cm"
                icon={Waves}
                accent="bg-cyan-100 text-cyan-600"
                status={
                  selectedSensor.waterLevel < 5
                    ? "Low water level"
                    : selectedSensor.waterLevel > 20
                      ? "High water level"
                      : "Current water level"
                }
                isOnline={isOnline}
              />
            </section>

            {/* ALERTS */}
            {alerts.length > 0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  Field Alerts
                </h3>

                <div className="space-y-1.5">
                  {alerts.map((alert, i) => (
                    <p
                      key={i}
                      className="text-sm text-amber-800"
                    >
                      {alert}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* CHARTS AND RIGHT SIDEBAR */}
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">

              {/* LIVE CHARTS */}
              <section className="grid min-w-0 gap-4 md:grid-cols-2">
                <TrendCard
                  title="Temperature Trend"
                  data={tempHistory}
                  color="#f97316"
                  unit="°C"
                  icon={Thermometer}
                />

                <TrendCard
                  title="Soil Moisture Trend"
                  data={moistureHistory}
                  color="#16a34a"
                  unit="%"
                  icon={Leaf}
                />

                <TrendCard
                  title="Humidity Trend"
                  data={humidityHistory}
                  color="#3b82f6"
                  unit="%"
                  icon={Droplets}
                />

                <TrendCard
                  title="Water Level Trend"
                  data={waterLevelHistory}
                  color="#06b6d4"
                  unit="cm"
                  icon={Waves}
                />
              </section>

              {/* RIGHT SIDEBAR */}
              <aside className="space-y-4">

                {/* SENSOR STATUS */}
                <div className={`${panel} p-4 sm:p-5`}>
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-950">
                    <Radio className="h-4 w-4 text-emerald-600" />
                    Sensor Status
                  </h3>

                  {latest.map(
                    ({ label, icon: Icon, color }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-2 border-b border-slate-100 py-3 last:border-0"
                      >
                        <span className="flex items-center gap-2 text-xs text-slate-600">
                          <Icon
                            className={`h-4 w-4 ${color}`}
                          />
                          {label}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${isOnline
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                            }`}
                        >
                          {isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    )
                  )}
                </div>

                {/* LATEST READINGS */}
                <div className={`${panel} p-4 sm:p-5`}>
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-950">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    Latest Readings
                  </h3>

                  {latest.map(
                    ({ label, value, icon: Icon, color }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-2 border-b border-slate-100 py-3 last:border-0"
                      >
                        <span className="flex items-center gap-2 text-xs text-slate-600">
                          <Icon
                            className={`h-4 w-4 ${color}`}
                          />
                          {label}
                        </span>

                        <span className="text-right text-xs font-bold text-slate-800">
                          {value}
                        </span>
                      </div>
                    )
                  )}

                  <p className="mt-3 text-xs text-slate-400">
                    Received {lastUpdateLabel}
                  </p>
                </div>

                {/* GPS LOCATION */}
                <div className={`${panel} p-4 sm:p-5`}>
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-950">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    GPS Location
                  </h3>

                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="flex justify-between gap-3">
                      <span>Latitude</span>
                      <strong className="text-slate-800">
                        {selectedSensor.lat}
                      </strong>
                    </p>

                    <p className="flex justify-between gap-3">
                      <span>Longitude</span>
                      <strong className="text-slate-800">
                        {selectedSensor.lng}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* FIELD OVERVIEW */}
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-100 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                    <CheckCircle2 className="h-4 w-4" />
                    Field Overview
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-emerald-800">
                    {alerts.length
                      ? `${alerts.length} active field alert${alerts.length > 1 ? "s" : ""
                      }. Check the readings above.`
                      : "No threshold alerts from the current readings."}
                  </p>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div
            className={`${panel} flex flex-col items-center gap-3 p-10 text-center`}
          >
            <Gauge className="h-9 w-9 text-emerald-500" />

            <h2 className="text-lg font-bold text-emerald-950">
              Waiting for live sensor data
            </h2>

            <p className="text-sm text-slate-500">
              Readings will appear when Firebase receives
              field data.
            </p>
          </div>
        )}

        {/* CONNECTED SENSORS */}
        <section className={`${panel} p-4 sm:p-5`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-emerald-950">
              Connected Field Sensors
            </h3>

            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search sensors..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-3 text-sm text-slate-500">
              No sensors yet.
            </p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  setSelectedSensor(s)
                }
                className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-emerald-50 ${selectedSensor?.id === s.id
                    ? "bg-emerald-50"
                    : ""
                  }`}
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                    <Radio className="h-4 w-4" />
                  </span>

                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      {s.name}
                    </span>

                    <span className="text-xs text-slate-500">
                      {s.location}
                    </span>
                  </span>
                </span>

                {isOnline ? (
                  <Wifi className="h-4 w-4 text-emerald-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </button>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
