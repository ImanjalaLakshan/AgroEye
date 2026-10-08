
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  onValue,
  ref,
  remove,
  update,
} from 'firebase/database';
import { db } from '../firebase';

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Battery,
  Bell,
  BellRing,
  Bug,
  CheckCheck,
  CheckCircle2,
  Clock3,
  CloudRain,
  Droplets,
  Eye,
  Filter,
  Leaf,
  MapPin,
  Radio,
  Search,
  ShieldCheck,
  Sprout,
  Thermometer,
  Trash2,
  Waves,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

// ======================================
// TYPES
// ======================================

type Priority = 'high' | 'medium' | 'normal';

type Category =
  | 'temperature'
  | 'humidity'
  | 'moisture'
  | 'water'
  | 'disease'
  | 'pest'
  | 'weather'
  | 'battery'
  | 'system'
  | 'growth';

type FilterType = 'all' | 'unread' | Priority;

type AlertItem = {
  id: string;
  type: Priority;
  category: Category;
  message: string;
  confidence?: number;
  timestamp: number;
  location: string;
  isRead: boolean;
  source: 'database' | 'sensor';
};

type SensorData = {
  temp?: unknown;
  temperature?: unknown;
  humidity?: unknown;
  moisture?: unknown;
  soilMoisture?: unknown;
  waterLevel?: unknown;
  water_level?: unknown;
};

type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'error';

type SensorStatus =
  | 'normal'
  | 'warning'
  | 'critical'
  | 'unknown';

const ALERTS_PATH = 'alerts';
const FIELD_PATH = 'field';

// These are example thresholds.
// Adjust for your sensors and paddy field.

const THRESHOLDS = {
  temperatureLow: 20,
  temperatureHigh: 35,
  humidityLow: 50,
  humidityHigh: 90,
  moistureLow: 40,
  moistureCritical: 25,
  waterLow: 25,
  waterHigh: 90,
};

const priorityStyles = {
  high: {
    label: 'High Priority',
    badge: 'bg-red-100 text-red-700',
    border: 'border-l-red-500',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  medium: {
    label: 'Medium Priority',
    badge: 'bg-amber-100 text-amber-700',
    border: 'border-l-amber-500',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  normal: {
    label: 'Normal',
    badge: 'bg-green-100 text-green-700',
    border: 'border-l-green-500',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
};

// ======================================
// HELPERS
// ======================================

function toNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result) ? result : null;
}

function getReading(
  data: SensorData | null,
  keys: (keyof SensorData)[]
): number | null {
  if (!data) return null;

  for (const key of keys) {
    const value = toNumber(data[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e11 ? value * 1000 : value;
  }

  if (typeof value === 'string') {
    const numeric = Number(value);

    if (value.trim() && Number.isFinite(numeric)) {
      return numeric < 1e11 ? numeric * 1000 : numeric;
    }

    const parsed = Date.parse(value);

    if (!Number.isNaN(parsed)) return parsed;
  }

  return Date.now();
}

function timeAgo(timestamp: number, now: number) {
  const seconds = Math.max(
    0,
    Math.floor((now - timestamp) / 1000)
  );

  if (seconds < 60) return 'Just now';

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min ago`;
  }

  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} hr ago`;
  }

  return new Date(timestamp).toLocaleDateString();
}

function getCategoryIcon(category: Category) {
  switch (category) {
    case 'temperature':
      return <Thermometer className="h-5 w-5" />;

    case 'humidity':
      return <Droplets className="h-5 w-5" />;

    case 'moisture':
      return <Sprout className="h-5 w-5" />;

    case 'water':
      return <Waves className="h-5 w-5" />;

    case 'disease':
      return <Leaf className="h-5 w-5" />;

    case 'pest':
      return <Bug className="h-5 w-5" />;

    case 'weather':
      return <CloudRain className="h-5 w-5" />;

    case 'battery':
      return <Battery className="h-5 w-5" />;

    case 'growth':
      return <Sprout className="h-5 w-5" />;

    default:
      return <Wifi className="h-5 w-5" />;
  }
}

function parseDatabaseAlerts(data: unknown): AlertItem[] {
  if (!data || typeof data !== 'object') {
    return [];
  }

  return Object.entries(
    data as Record<string, unknown>
  ).flatMap(([id, raw]) => {
    if (!raw || typeof raw !== 'object') {
      return [];
    }

    const item = raw as Record<string, unknown>;

    const rawPriority = item.type ?? item.priority;

    const type: Priority =
      rawPriority === 'high' ||
        rawPriority === 'medium' ||
        rawPriority === 'normal'
        ? rawPriority
        : 'normal';

    const categories: Category[] = [
      'temperature',
      'humidity',
      'moisture',
      'water',
      'disease',
      'pest',
      'weather',
      'battery',
      'system',
      'growth',
    ];

    const category: Category = categories.includes(
      item.category as Category
    )
      ? (item.category as Category)
      : 'system';

    return [
      {
        id,
        type,
        category,
        message: String(
          item.message ??
          item.title ??
          'New farm notification'
        ),
        confidence:
          toNumber(item.confidence) ?? undefined,
        timestamp: getTimestamp(
          item.timestamp ?? item.createdAt ?? item.time
        ),
        location: String(
          item.location ?? 'Main Field'
        ),
        isRead: item.isRead === true,
        source: 'database' as const,
      },
    ];
  });
}

// ======================================
// SENSOR STATUS
// ======================================

function temperatureStatus(value: number | null): SensorStatus {
  if (value === null) return 'unknown';

  if (value > THRESHOLDS.temperatureHigh) {
    return 'critical';
  }

  if (value < THRESHOLDS.temperatureLow) {
    return 'warning';
  }

  return 'normal';
}

function humidityStatus(value: number | null): SensorStatus {
  if (value === null) return 'unknown';

  if (
    value > THRESHOLDS.humidityHigh ||
    value < THRESHOLDS.humidityLow
  ) {
    return 'warning';
  }

  return 'normal';
}

function moistureStatus(value: number | null): SensorStatus {
  if (value === null) return 'unknown';

  if (value < THRESHOLDS.moistureCritical) {
    return 'critical';
  }

  if (value < THRESHOLDS.moistureLow) {
    return 'warning';
  }

  return 'normal';
}

function waterStatus(value: number | null): SensorStatus {
  if (value === null) return 'unknown';

  if (value < THRESHOLDS.waterLow) {
    return 'critical';
  }

  if (value > THRESHOLDS.waterHigh) {
    return 'warning';
  }

  return 'normal';
}

// ======================================
// GENERATE SENSOR ALERTS
// ======================================

function generateSensorAlerts(
  data: SensorData | null,
  timestamp: number
): AlertItem[] {
  if (!data) return [];

  const alerts: AlertItem[] = [];

  const temp = getReading(data, [
    'temp',
    'temperature',
  ]);

  const humidity = getReading(data, ['humidity']);

  const moisture = getReading(data, [
    'moisture',
    'soilMoisture',
  ]);

  const waterLevel = getReading(data, [
    'waterLevel',
    'water_level',
  ]);

  const addAlert = (
    id: string,
    type: Priority,
    category: Category,
    message: string
  ) => {
    alerts.push({
      id,
      type,
      category,
      message,
      timestamp,
      location: 'Main Field',
      isRead: false,
      source: 'sensor',
    });
  };

  // TEMPERATURE

  if (temp !== null) {
    if (temp > THRESHOLDS.temperatureHigh) {
      addAlert(
        'sensor-temperature-high',
        'high',
        'temperature',
        `High temperature detected: ${temp}°C. Monitor crop heat stress.`
      );
    } else if (temp < THRESHOLDS.temperatureLow) {
      addAlert(
        'sensor-temperature-low',
        'medium',
        'temperature',
        `Low temperature detected: ${temp}°C. Check crop conditions.`
      );
    }
  }

  // HUMIDITY

  if (humidity !== null) {
    if (humidity > THRESHOLDS.humidityHigh) {
      addAlert(
        'sensor-humidity-high',
        'medium',
        'humidity',
        `High humidity detected: ${humidity}%. Monitor for disease-favouring conditions.`
      );
    } else if (humidity < THRESHOLDS.humidityLow) {
      addAlert(
        'sensor-humidity-low',
        'medium',
        'humidity',
        `Low humidity detected: ${humidity}%. Monitor crop water stress.`
      );
    }
  }

  // SOIL MOISTURE

  if (moisture !== null) {
    if (moisture < THRESHOLDS.moistureCritical) {
      addAlert(
        'sensor-moisture-critical',
        'high',
        'moisture',
        `Critical soil moisture: ${moisture}%. Check irrigation immediately.`
      );
    } else if (moisture < THRESHOLDS.moistureLow) {
      addAlert(
        'sensor-moisture-low',
        'medium',
        'moisture',
        `Soil moisture is ${moisture}%. Field may need water.`
      );
    }
  }

  // WATER LEVEL

  if (waterLevel !== null) {
    if (waterLevel < THRESHOLDS.waterLow) {
      addAlert(
        'sensor-water-low',
        'high',
        'water',
        `Low water level: ${waterLevel}%. Check irrigation supply.`
      );
    } else if (waterLevel > THRESHOLDS.waterHigh) {
      addAlert(
        'sensor-water-high',
        'medium',
        'water',
        `High water level: ${waterLevel}%. Check drainage conditions.`
      );
    }
  }

  return alerts;
}

// ======================================
// SENSOR CARD
// ======================================

type SensorCardProps = {
  title: string;
  value: number | null;
  unit: string;
  status: SensorStatus;
  statusText: string;
  icon: React.ReactNode;
  accent: string;
  decimals?: number;
};

function SensorCard({
  title,
  value,
  unit,
  status,
  statusText,
  icon,
  accent,
  decimals = 1,
}: SensorCardProps) {
  const statusClasses = {
    normal: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
    critical: 'bg-red-50 text-red-700',
    unknown: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900">
              {value === null
                ? '--'
                : Number(value.toFixed(decimals))}
            </span>

            <span className="text-base font-medium text-slate-500">
              {value === null ? '' : unit}
            </span>
          </div>
        </div>

        <div className={`rounded-xl p-3 ${accent}`}>
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${statusClasses[status]}`}
        >
          {status === 'normal' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : status === 'unknown' ? (
            <WifiOff className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}

          {statusText}
        </span>
      </div>
    </div>
  );
}

// ======================================
// MAIN COMPONENT
// ======================================

export function AlertsNotifications() {
  const [dbAlerts, setDbAlerts] = useState<AlertItem[]>([]);

  const [fieldData, setFieldData] =
    useState<SensorData | null>(null);

  const [sensorTime, setSensorTime] = useState(Date.now());

  const [selectedFilter, setSelectedFilter] =
    useState<FilterType>('all');

  const [search, setSearch] = useState('');

  const [now, setNow] = useState(Date.now());

  const [dbStatus, setDbStatus] =
    useState<ConnectionStatus>('connecting');

  const [sensorConnection, setSensorConnection] =
    useState<ConnectionStatus>('connecting');

  const [error, setError] = useState('');

  const [toast, setToast] = useState<AlertItem | null>(null);

  const [sensorRead, setSensorRead] =
    useState<string[]>([]);

  const [dismissedSensors, setDismissedSensors] =
    useState<string[]>([]);

  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>(
      typeof Notification === 'undefined'
        ? 'denied'
        : Notification.permission
    );

  const initializedDb = useRef(false);

  const initializedSensor = useRef(false);

  const previousDbIds = useRef(new Set<string>());

  const previousSensorIds = useRef(new Set<string>());

  // ====================================
  // CLOCK
  // ====================================

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 15000);

    return () => window.clearInterval(timer);
  }, []);

  // ====================================
  // NOTIFICATION HANDLER
  // ====================================

  function showNotification(alert: AlertItem) {
    setToast(alert);

    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(
          `AgroEye - ${alert.type.toUpperCase()} Alert`,
          {
            body: alert.message,
            tag: alert.id,
          }
        );
      } catch (e) {
        console.warn(
          'Browser notification unavailable:',
          e
        );
      }
    }
  }

  // ====================================
  // LIVE FIREBASE ALERTS
  // ====================================

  useEffect(() => {
    const unsubscribe = onValue(
      ref(db, ALERTS_PATH),
      snapshot => {
        const next = parseDatabaseAlerts(
          snapshot.val()
        ).sort(
          (a, b) => b.timestamp - a.timestamp
        );

        if (initializedDb.current) {
          const newAlerts = next.filter(
            alert =>
              !previousDbIds.current.has(alert.id) &&
              !alert.isRead
          );

          if (newAlerts.length > 0) {
            showNotification(newAlerts[0]);
          }
        }

        previousDbIds.current = new Set(
          next.map(alert => alert.id)
        );

        initializedDb.current = true;

        setDbAlerts(next);
        setDbStatus('connected');
      },
      e => {
        setDbStatus('error');
        setError(
          `Firebase alerts error: ${e.message}`
        );
      }
    );

    return unsubscribe;
  }, []);

  // ====================================
  // LIVE FIREBASE SENSOR DATA
  // ====================================

  useEffect(() => {
    const unsubscribe = onValue(
      ref(db, FIELD_PATH),
      snapshot => {
        const data =
          snapshot.val() as SensorData | null;

        const timestamp = Date.now();

        const currentAlerts =
          generateSensorAlerts(data, timestamp);

        const currentIds = new Set(
          currentAlerts.map(alert => alert.id)
        );

        if (initializedSensor.current) {
          const newAlerts = currentAlerts.filter(
            alert =>
              !previousSensorIds.current.has(
                alert.id
              )
          );

          if (newAlerts.length > 0) {
            showNotification(newAlerts[0]);
          }
        }

        previousSensorIds.current = currentIds;

        initializedSensor.current = true;

        setFieldData(data);
        setSensorTime(timestamp);
        setSensorConnection('connected');

        setSensorRead(previous =>
          previous.filter(id => currentIds.has(id))
        );

        setDismissedSensors(previous =>
          previous.filter(id => currentIds.has(id))
        );
      },
      e => {
        setSensorConnection('error');
        setError(
          `Firebase sensor error: ${e.message}`
        );
      }
    );

    return unsubscribe;
  }, []);

  // ====================================
  // LIVE SENSOR READINGS
  // ====================================

  const temperature = getReading(fieldData, [
    'temp',
    'temperature',
  ]);

  const humidity = getReading(fieldData, [
    'humidity',
  ]);

  const moisture = getReading(fieldData, [
    'moisture',
    'soilMoisture',
  ]);

  const waterLevel = getReading(fieldData, [
    'waterLevel',
    'water_level',
  ]);

  const tempState = temperatureStatus(temperature);
  const humidityState = humidityStatus(humidity);
  const moistureState = moistureStatus(moisture);
  const waterState = waterStatus(waterLevel);

  // ====================================
  // ACTIVE SENSOR ALERTS
  // ====================================

  const activeSensorAlerts = useMemo(
    () =>
      generateSensorAlerts(
        fieldData,
        sensorTime
      )
        .filter(
          alert =>
            !dismissedSensors.includes(alert.id)
        )
        .map(alert => ({
          ...alert,
          isRead: sensorRead.includes(alert.id),
        })),
    [
      fieldData,
      sensorTime,
      sensorRead,
      dismissedSensors,
    ]
  );

  // ====================================
  // ALL ALERTS
  // ====================================

  const alerts = useMemo(
    () =>
      [
        ...dbAlerts,
        ...activeSensorAlerts,
      ].sort(
        (a, b) => b.timestamp - a.timestamp
      ),
    [dbAlerts, activeSensorAlerts]
  );

  const filteredAlerts = alerts.filter(alert => {
    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'unread'
        ? !alert.isRead
        : alert.type === selectedFilter);

    const matchesSearch =
      `${alert.message} ${alert.category} ${alert.location}`
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const unreadCount = alerts.filter(
    alert => !alert.isRead
  ).length;

  const highCount = alerts.filter(
    alert => alert.type === 'high'
  ).length;

  const mediumCount = alerts.filter(
    alert => alert.type === 'medium'
  ).length;

  const normalCount = alerts.filter(
    alert => alert.type === 'normal'
  ).length;

  // ====================================
  // MARK AS READ
  // ====================================

  async function markAsRead(alert: AlertItem) {
    if (alert.source === 'sensor') {
      setSensorRead(previous => [
        ...new Set([...previous, alert.id]),
      ]);
      return;
    }

    try {
      await update(
        ref(db, `${ALERTS_PATH}/${alert.id}`),
        { isRead: true }
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  // ====================================
  // DELETE / DISMISS
  // ====================================

  async function deleteAlert(alert: AlertItem) {
    if (alert.source === 'sensor') {
      setDismissedSensors(previous => [
        ...new Set([...previous, alert.id]),
      ]);
      return;
    }

    try {
      await remove(
        ref(db, `${ALERTS_PATH}/${alert.id}`)
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  // ====================================
  // MARK ALL READ
  // ====================================

  async function markAllAsRead() {
    setSensorRead(previous => [
      ...new Set([
        ...previous,
        ...activeSensorAlerts.map(alert => alert.id),
      ]),
    ]);

    const changes: Record<string, boolean> = {};

    dbAlerts
      .filter(alert => !alert.isRead)
      .forEach(alert => {
        changes[
          `${ALERTS_PATH}/${alert.id}/isRead`
        ] = true;
      });

    if (Object.keys(changes).length > 0) {
      try {
        await update(ref(db), changes);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : String(e)
        );
      }
    }
  }

  // ====================================
  // ENABLE BROWSER NOTIFICATIONS
  // ====================================

  async function enableBrowserNotifications() {
    if (typeof Notification === 'undefined') {
      setError(
        'Browser notifications are not supported.'
      );
      return;
    }

    try {
      const permission =
        await Notification.requestPermission();

      setNotificationPermission(permission);
    } catch {
      setError(
        'Notification permission failed. Use HTTPS or localhost.'
      );
    }
  }

  const filterOptions: {
    id: FilterType;
    label: string;
    count: number;
  }[] = [
      {
        id: 'all',
        label: 'All Alerts',
        count: alerts.length,
      },
      {
        id: 'unread',
        label: 'Unread',
        count: unreadCount,
      },
      {
        id: 'high',
        label: 'High',
        count: highCount,
      },
      {
        id: 'medium',
        label: 'Medium',
        count: mediumCount,
      },
      {
        id: 'normal',
        label: 'Normal',
        count: normalCount,
      },
    ];

  // ====================================
  // UI
  // ====================================

  return (
    <div className="min-h-screen bg-[#f4faf7] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div className="flex items-center gap-3">

            <div className="relative rounded-2xl bg-emerald-600 p-3 text-white shadow-lg shadow-emerald-100">

              <BellRing className="h-7 w-7" />

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
              )}

            </div>

            <div>
              <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
                Alerts & Notifications
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Live paddy field monitoring and smart alerts
              </p>
            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            {notificationPermission !== 'granted' && (
              <button
                onClick={() =>
                  void enableBrowserNotifications()
                }
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                <Bell className="h-4 w-4" />
                Enable Notifications
              </button>
            )}

            <button
              onClick={() => void markAllAsRead()}
              disabled={unreadCount === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </button>

          </div>
        </div>

        {/* LIVE CONNECTION */}

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm shadow-sm">

          <span
            className={`flex items-center gap-2 ${dbStatus === 'connected'
              ? 'text-green-700'
              : dbStatus === 'error'
                ? 'text-red-600'
                : 'text-amber-600'
              }`}
          >
            <Radio className="h-4 w-4" />
            Alerts:
            {dbStatus === 'connected'
              ? ' Live'
              : dbStatus === 'error'
                ? ' Disconnected'
                : ' Connecting'}
          </span>

          <span
            className={`flex items-center gap-2 ${sensorConnection === 'connected'
              ? 'text-green-700'
              : sensorConnection === 'error'
                ? 'text-red-600'
                : 'text-amber-600'
              }`}
          >
            {sensorConnection === 'connected' ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}

            Sensors:
            {sensorConnection === 'connected'
              ? ' Live'
              : sensorConnection === 'error'
                ? ' Disconnected'
                : ' Connecting'}
          </span>

          <span className="ml-auto text-xs text-slate-400">
            Firebase Real-time Monitoring
          </span>

        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{error}</span>

            <button onClick={() => setError('')}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* SENSOR CARDS */}

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-emerald-950">
                Live Sensor Monitoring
              </h2>

              <p className="text-sm text-slate-500">
                Current field environmental conditions
              </p>
            </div>

            <span className="flex items-center gap-2 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live Updates
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <SensorCard
              title="Temperature"
              value={temperature}
              unit="°C"
              status={tempState}
              statusText={
                tempState === 'normal'
                  ? 'Normal range'
                  : tempState === 'critical'
                    ? 'High Temperature'
                    : tempState === 'warning'
                      ? 'Low Temperature'
                      : 'No reading'
              }
              icon={<Thermometer className="h-6 w-6" />}
              accent="bg-orange-100 text-orange-600"
            />

            <SensorCard
              title="Humidity"
              value={humidity}
              unit="%"
              status={humidityState}
              statusText={
                humidityState === 'normal'
                  ? 'Good level'
                  : humidityState === 'warning'
                    ? 'Check humidity'
                    : 'No reading'
              }
              icon={<Droplets className="h-6 w-6" />}
              accent="bg-sky-100 text-sky-600"
            />

            <SensorCard
              title="Soil Moisture"
              value={moisture}
              unit="%"
              status={moistureState}
              statusText={
                moistureState === 'normal'
                  ? 'Optimal moisture'
                  : moistureState === 'critical'
                    ? 'Critical - Needs Water'
                    : moistureState === 'warning'
                      ? 'Needs Water'
                      : 'No reading'
              }
              icon={<Sprout className="h-6 w-6" />}
              accent="bg-emerald-100 text-emerald-600"
              decimals={0}
            />

            <SensorCard
              title="Water Level"
              value={waterLevel}
              unit="%"
              status={waterState}
              statusText={
                waterState === 'normal'
                  ? 'Good water level'
                  : waterState === 'critical'
                    ? 'Low Water Level'
                    : waterState === 'warning'
                      ? 'High Water Level'
                      : 'No reading'
              }
              icon={<Waves className="h-6 w-6" />}
              accent="bg-cyan-100 text-cyan-600"
              decimals={0}
            />

          </div>
        </div>

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

          {[
            {
              title: 'Total Alerts',
              count: alerts.length,
              icon: Activity,
              color: 'bg-blue-50 text-blue-700',
            },
            {
              title: 'Unread',
              count: unreadCount,
              icon: Bell,
              color: 'bg-violet-50 text-violet-700',
            },
            {
              title: 'High Priority',
              count: highCount,
              icon: AlertTriangle,
              color: 'bg-red-50 text-red-700',
            },
            {
              title: 'Medium Priority',
              count: mediumCount,
              icon: AlertCircle,
              color: 'bg-amber-50 text-amber-700',
            },
          ].map(card => (
            <div
              key={card.title}
              className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {card.title}
                </p>

                <span className={`rounded-xl p-2 ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </span>
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {card.count}
              </p>
            </div>
          ))}
        </div>

        {/* FILTER AND SEARCH */}

        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">

          <div className="mb-4 flex items-center gap-2 font-semibold text-emerald-900">
            <Filter className="h-4 w-4" />
            Filter Notifications
          </div>

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

            <div className="flex flex-wrap gap-2">

              {filterOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() =>
                    setSelectedFilter(option.id)
                  }
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedFilter === option.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                >
                  {option.label} ({option.count})
                </button>
              ))}

            </div>

            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search alerts..."
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

          </div>
        </div>

        {/* ALERT LIST */}

        <div className="space-y-3">

          {filteredAlerts.length === 0 ? (
            <div className="rounded-2xl border border-emerald-100 bg-white p-12 text-center">

              <ShieldCheck className="mx-auto h-12 w-12 text-emerald-500" />

              <h3 className="mt-4 text-lg font-bold text-emerald-900">
                No Alerts Found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                No notifications match your current filter.
              </p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const style =
                priorityStyles[alert.type];

              return (
                <div
                  key={`${alert.source}-${alert.id}`}
                  className={`rounded-2xl border border-l-4 border-slate-100 bg-white p-5 shadow-sm ${style.border}`}
                >
                  <div className="flex items-start gap-4">

                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.iconBg} ${style.iconColor}`}
                    >
                      {getCategoryIcon(alert.category)}
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-2">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}
                        >
                          {style.label}
                        </span>

                        {!alert.isRead && (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            New
                          </span>
                        )}

                        {alert.source === 'sensor' && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Live Sensor
                          </span>
                        )}

                      </div>

                      <p className="mt-3 font-medium text-slate-800">
                        {alert.message}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">

                        <span className="flex items-center gap-1 capitalize">
                          {getCategoryIcon(alert.category)}
                          {alert.category}
                        </span>

                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {alert.location}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock3 className="h-4 w-4" />
                          {timeAgo(alert.timestamp, now)}
                        </span>

                        {alert.confidence !== undefined && (
                          <span>
                            Confidence: {alert.confidence}%
                          </span>
                        )}

                      </div>
                    </div>

                    <div className="flex gap-1">

                      {!alert.isRead && (
                        <button
                          title="Mark as read"
                          onClick={() =>
                            void markAsRead(alert)
                          }
                          className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        title={
                          alert.source === 'sensor'
                            ? 'Dismiss alert'
                            : 'Delete alert'
                        }
                        onClick={() =>
                          void deleteAlert(alert)
                        }
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800">

          <span className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Monitoring all four field sensors
          </span>

          <span>
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </span>

        </div>

      </div>

      {/* NEW ALERT TOAST */}

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 w-[calc(100%-2.5rem)] max-w-sm rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl"
        >
          <div className="flex items-start gap-3">

            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <BellRing className="h-5 w-5" />
            </div>

            <div className="flex-1">
              <p className="font-bold text-emerald-900">
                New AgroEye Alert
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => setToast(null)}
              className="text-slate-500"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
