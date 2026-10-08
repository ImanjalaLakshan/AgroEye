import { useEffect, useMemo, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '../firebase';

import {
  Thermometer,
  Droplets,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Sprout,
  Wind,
  MapPin,
  Wifi,
  Activity,
  ShieldCheck,
  Clock3,
  Leaf,
  TrendingUp,
} from 'lucide-react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

/* =========================================================
   Types
========================================================= */

type AlertType = 'high' | 'medium' | 'normal';

interface AlertItem {
  type: AlertType;
  message: string;
}

interface SensorData {
  temp: number;
  humidity: number;
  moisture: number;
  waterLevel: number;
  lat: number;
  lng: number;
}

interface HistoryItem {
  time: string;
  temp: number;
  moisture: number;
  waterLevel: number;
  humidity: number;
}

/* =========================================================
   Small Components
========================================================= */

function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  iconColor,
  iconBg,
  status,
  statusColor,
}: {
  label: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  status: string;
  statusColor: string;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '18px',
        padding: '20px',
        minHeight: '125px',
        boxShadow: '0 3px 12px rgba(15, 23, 42, 0.05)',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748b',
              marginBottom: '8px',
            }}
          >
            {label}
          </div>

          <div
            style={{
              fontSize: '27px',
              lineHeight: 1,
              fontWeight: 750,
              color: '#0f172a',
              letterSpacing: '-0.5px',
            }}
          >
            {Number.isFinite(value) ? value : 0}
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#94a3b8',
                marginLeft: '4px',
              }}
            >
              {unit}
            </span>
          </div>
        </div>

        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '13px',
            backgroundColor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon
            style={{
              width: '21px',
              height: '21px',
              color: iconColor,
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '14px',
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            display: 'inline-block',
          }}
        />

        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: statusColor,
          }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   Alert Item
========================================================= */

function AlertPill({
  type,
  message,
}: {
  type: AlertType;
  message: string;
}) {
  const colors = {
    high: {
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#dc2626',
      icon: '#ef4444',
    },
    medium: {
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#b45309',
      icon: '#f59e0b',
    },
    normal: {
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#15803d',
      icon: '#22c55e',
    },
  };

  const c = colors[type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '11px 13px',
        borderRadius: '11px',
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
      }}
    >
      <AlertTriangle
        style={{
          width: '15px',
          height: '15px',
          color: c.icon,
          flexShrink: 0,
        }}
      />

      <span
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: c.text,
        }}
      >
        {message}
      </span>
    </div>
  );
}

/* =========================================================
   Health Score
========================================================= */

function HealthScoreCard({
  score,
  alertsCount,
}: {
  score: number;
  alertsCount: number;
}) {
  const scoreColor =
    score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#ef4444';

  const scoreLabel =
    score >= 80 ? 'Healthy Field' : score >= 60 ? 'Needs Attention' : 'Critical';

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '18px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 3px 12px rgba(15,23,42,0.05)',
        padding: '22px',
        height: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Leaf
              style={{
                width: '20px',
                height: '20px',
                color: '#16a34a',
              }}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              Field Health
            </div>

            <div
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                marginTop: '2px',
              }}
            >
              Based on live sensor readings
            </div>
          </div>
        </div>

        <ShieldCheck
          style={{
            width: '20px',
            height: '20px',
            color: scoreColor,
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '22px',
        }}
      >
        <div
          style={{
            width: '94px',
            height: '94px',
            borderRadius: '50%',
            background: `conic-gradient(${scoreColor} ${score * 3.6}deg, #e5e7eb 0deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              {score}%
            </span>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: '17px',
              fontWeight: 750,
              color: scoreColor,
              marginBottom: '5px',
            }}
          >
            {scoreLabel}
          </div>

          <div
            style={{
              fontSize: '12px',
              color: '#64748b',
              lineHeight: 1.6,
            }}
          >
            {alertsCount === 0
              ? 'All monitored conditions are within the expected range.'
              : `${alertsCount} active condition${alertsCount > 1 ? 's' : ''
              } require attention.`}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   IoT Device Status
========================================================= */

function DeviceStatusCard() {
  const devices = [
    { name: 'ESP32 Controller', status: 'Online' },
    { name: 'Temperature Sensor', status: 'Online' },
    { name: 'Humidity Sensor', status: 'Online' },
    { name: 'Soil Moisture Sensor', status: 'Online' },
  ];

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '18px',
        padding: '22px',
        boxShadow: '0 3px 12px rgba(15,23,42,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '18px',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '11px',
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Wifi
            style={{
              width: '19px',
              height: '19px',
              color: '#2563eb',
            }}
          />
        </div>

        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            IoT Device Status
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
            Connected field devices
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '11px',
        }}
      >
        {devices.map((device) => (
          <div
            key={device.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 10px',
              borderRadius: '9px',
              background: '#f8fafc',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Activity
                style={{
                  width: '14px',
                  height: '14px',
                  color: '#16a34a',
                }}
              />

              <span
                style={{
                  fontSize: '11px',
                  color: '#475569',
                  fontWeight: 500,
                }}
              >
                {device.name}
              </span>
            </div>

            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#15803d',
                background: '#dcfce7',
                padding: '4px 7px',
                borderRadius: '999px',
              }}
            >
              ● {device.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   Main Dashboard
========================================================= */

export function Dashboard() {
  const user = auth.currentUser;

  const displayName =
    user?.displayName || user?.email?.split('@')[0] || 'Farmer';

  const [data, setData] = useState<SensorData>({
    temp: 0,
    humidity: 0,
    moisture: 0,
    waterLevel: 0,
    lat: 0,
    lng: 0,
  });

  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [lastUpdated, setLastUpdated] = useState<string>('');

  /* =========================================================
     Firebase Real-Time Data
  ========================================================= */

  useEffect(() => {
    const dataRef = ref(db, 'field');

    const unsubscribe = onValue(dataRef, (snapshot) => {
      const value = snapshot.val();

      if (!value) return;

      const sensorData: SensorData = {
        temp: Number(value.temp) || 0,
        humidity: Number(value.humidity) || 0,
        moisture: Number(value.moisture) || 0,
        waterLevel: Number(value.waterLevel) || 0,
        lat: Number(value.lat) || 0,
        lng: Number(value.lng) || 0,
      };

      setData(sensorData);

      const time = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      setLastUpdated(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );

      setHistory((prev) => [
        ...prev.slice(-14),
        {
          time,
          temp: sensorData.temp,
          moisture: sensorData.moisture,
          waterLevel: sensorData.waterLevel,
          humidity: sensorData.humidity,
        },
      ]);

      const newAlerts: AlertItem[] = [];

      if (sensorData.temp > 35) {
        newAlerts.push({
          type: 'high',
          message: `High Temperature: ${sensorData.temp}°C`,
        });
      }

      if (sensorData.moisture < 30) {
        newAlerts.push({
          type: 'high',
          message: `Low Soil Moisture: ${sensorData.moisture}%`,
        });
      }

      if (sensorData.humidity < 40) {
        newAlerts.push({
          type: 'medium',
          message: `Low Humidity: ${sensorData.humidity}%`,
        });
      }

      if (sensorData.waterLevel < 5) {
        newAlerts.push({
          type: 'high',
          message: `Water Level Too Low: ${sensorData.waterLevel} cm`,
        });
      } else if (sensorData.waterLevel > 20) {
        newAlerts.push({
          type: 'high',
          message: `Water Level Too High: ${sensorData.waterLevel} cm`,
        });
      }

      setAlerts(newAlerts);
    });

    return () => unsubscribe();
  }, []);

  /* =========================================================
     Sensor Status
  ========================================================= */

  const moistureOk = data.moisture > 60;

  const waterOk =
    data.waterLevel >= 5 && data.waterLevel <= 20;

  const temperatureOk = data.temp <= 35;

  const humidityOk = data.humidity >= 40;

  /* =========================================================
     Field Health Score
  ========================================================= */

  const healthScore = useMemo(() => {
    let score = 100;

    if (!temperatureOk) score -= 20;
    if (!humidityOk) score -= 15;
    if (!moistureOk) score -= 30;
    if (!waterOk) score -= 20;

    score -= alerts.length * 5;

    return Math.max(0, Math.min(100, score));
  }, [
    temperatureOk,
    humidityOk,
    moistureOk,
    waterOk,
    alerts.length,
  ]);

  /* =========================================================
     Date
  ========================================================= */

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      className="agro-dashboard-original"
      style={{
        width: '100%',
        minWidth: 0,
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '26px',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        .agro-dashboard-original, .agro-dashboard-original * { box-sizing: border-box; }
        .agro-dashboard-original .agro-grid-child { min-width: 0; }
        @media (max-width: 900px) {
          .agro-dashboard-original .agro-alerts-location {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
        @media (max-width: 700px) {
          .agro-dashboard-original { padding: 14px !important; }
          .agro-dashboard-original .agro-welcome { padding: 20px 17px !important; border-radius: 17px !important; }
          .agro-dashboard-original .agro-welcome h1 { font-size: 21px !important; }
          .agro-dashboard-original .agro-sensor-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; }
          .agro-dashboard-original .agro-health-devices,
          .agro-dashboard-original .agro-alerts-location,
          .agro-dashboard-original .agro-chart-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .agro-dashboard-original .agro-chart-grid > div,
          .agro-dashboard-original .agro-health-devices > div,
          .agro-dashboard-original .agro-alerts-location > div { min-width: 0; }
          .agro-dashboard-original .agro-chart-grid .recharts-responsive-container { min-width: 0; }
        }
        @media (max-width: 390px) {
          .agro-dashboard-original .agro-sensor-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .agro-dashboard-original .agro-welcome h1 { font-size: 19px !important; }
        }
      `}</style>
      {/* =====================================================
          Header
      ===================================================== */}

      <div
        className="agro-welcome"
        style={{
          background:
            'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #16a34a 100%)',
          borderRadius: '22px',
          padding: '26px 28px',
          color: '#ffffff',
          boxShadow: '0 8px 25px rgba(6,78,59,0.18)',
          marginBottom: '22px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '190px',
            height: '190px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            right: '-55px',
            top: '-75px',
          }}
        />

        <div
          style={{
            position: 'absolute',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            right: '100px',
            bottom: '-75px',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <Sprout
                style={{
                  width: '17px',
                  height: '17px',
                  color: '#bbf7d0',
                }}
              />

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#bbf7d0',
                }}
              >
                AGROEYE SMART FARMING
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: '25px',
                fontWeight: 800,
                letterSpacing: '-0.5px',
              }}
            >
              Good Morning, {displayName} 👋
            </h1>

            <p
              style={{
                margin: '7px 0 0',
                color: '#d1fae5',
                fontSize: '13px',
              }}
            >
              Monitor your paddy field and make better farming decisions.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.11)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '10px 14px',
                minWidth: '110px',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  color: '#a7f3d0',
                  marginBottom: '3px',
                }}
              >
                TODAY
              </div>

              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {today}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.11)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '10px 14px',
                minWidth: '105px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '9px',
                  color: '#a7f3d0',
                  marginBottom: '3px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#4ade80',
                  }}
                />
                SYSTEM
              </div>

              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Live & Online
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          Section title
      ===================================================== */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          gap: '10px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 750,
              color: '#0f172a',
            }}
          >
            Live Field Monitoring
          </h2>

          <p
            style={{
              margin: '3px 0 0',
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
            Real-time environmental conditions
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#64748b',
            fontSize: '10px',
          }}
        >
          <Clock3
            style={{
              width: '13px',
              height: '13px',
            }}
          />

          Updated {lastUpdated || 'waiting...'}
        </div>
      </div>

      {/* =====================================================
          Sensor Cards
      ===================================================== */}

      <div
        className="agro-sensor-grid"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(205px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <StatCard
          label="Temperature"
          value={data.temp}
          unit="°C"
          icon={Thermometer}
          iconColor="#ea580c"
          iconBg="#fff7ed"
          status={temperatureOk ? 'Normal range' : 'Too High'}
          statusColor={temperatureOk ? '#16a34a' : '#dc2626'}
        />

        <StatCard
          label="Humidity"
          value={data.humidity}
          unit="%"
          icon={Droplets}
          iconColor="#2563eb"
          iconBg="#eff6ff"
          status={humidityOk ? 'Good level' : 'Too Low'}
          statusColor={humidityOk ? '#16a34a' : '#dc2626'}
        />

        <StatCard
          label="Soil Moisture"
          value={data.moisture}
          unit="%"
          icon={Gauge}
          iconColor={moistureOk ? '#16a34a' : '#dc2626'}
          iconBg={moistureOk ? '#f0fdf4' : '#fef2f2'}
          status={moistureOk ? 'Healthy' : 'Needs Water'}
          statusColor={moistureOk ? '#16a34a' : '#dc2626'}
        />

        <StatCard
          label="Water Level"
          value={data.waterLevel}
          unit="cm"
          icon={Wind}
          iconColor={waterOk ? '#0891b2' : '#dc2626'}
          iconBg={waterOk ? '#ecfeff' : '#fef2f2'}
          status={
            data.waterLevel < 5
              ? 'Too Low'
              : data.waterLevel > 20
                ? 'Too High'
                : 'Optimal'
          }
          statusColor={waterOk ? '#0891b2' : '#dc2626'}
        />
      </div>

      {/* =====================================================
          Health + Device Status
      ===================================================== */}

      <div
        className="agro-health-devices"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <HealthScoreCard
          score={healthScore}
          alertsCount={alerts.length}
        />

        <DeviceStatusCard />
      </div>

      {/* =====================================================
          Alerts + GPS
      ===================================================== */}

      <div
        className="agro-alerts-location"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0, 1fr) minmax(260px, 0.42fr)',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Alerts */}

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '18px',
            padding: '22px',
            boxShadow: '0 3px 12px rgba(15,23,42,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle
                  style={{
                    width: '19px',
                    height: '19px',
                    color: '#ef4444',
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  Live Alerts
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    marginTop: '2px',
                  }}
                >
                  Current field conditions
                </div>
              </div>
            </div>

            {alerts.length > 0 ? (
              <span
                style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '5px 9px',
                  borderRadius: '999px',
                }}
              >
                {alerts.length} Active
              </span>
            ) : (
              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '5px 9px',
                  borderRadius: '999px',
                }}
              >
                All Clear
              </span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2
                style={{
                  width: '19px',
                  height: '19px',
                  color: '#16a34a',
                }}
              />

              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#15803d',
                  }}
                >
                  All systems normal
                </div>

                <div
                  style={{
                    fontSize: '10px',
                    color: '#4ade80',
                    marginTop: '2px',
                  }}
                >
                  No active environmental alerts.
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {alerts.map((alert, index) => (
                <AlertPill
                  key={`${alert.message}-${index}`}
                  {...alert}
                />
              ))}
            </div>
          )}
        </div>

        {/* GPS */}

        <div
          style={{
            background:
              'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)',
            border: '1px solid #dcfce7',
            borderRadius: '18px',
            padding: '22px',
            boxShadow: '0 3px 12px rgba(15,23,42,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '17px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin
                style={{
                  width: '19px',
                  height: '19px',
                  color: '#16a34a',
                }}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                Field Location
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                }}
              >
                GPS sensor coordinates
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '10px',
                padding: '11px',
                border: '1px solid #dcfce7',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  color: '#94a3b8',
                  marginBottom: '4px',
                }}
              >
                LATITUDE
              </div>

              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#166534',
                  wordBreak: 'break-all',
                }}
              >
                {data.lat || '—'}
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                borderRadius: '10px',
                padding: '11px',
                border: '1px solid #dcfce7',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  color: '#94a3b8',
                  marginBottom: '4px',
                }}
              >
                LONGITUDE
              </div>

              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#166534',
                  wordBreak: 'break-all',
                }}
              >
                {data.lng || '—'}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '13px',
              fontSize: '10px',
              color: '#15803d',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#22c55e',
              }}
            />
            GPS data connected
          </div>
        </div>
      </div>

      {/* =====================================================
          Charts Header
      ===================================================== */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          marginBottom: '12px',
        }}
      >
        <TrendingUp
          style={{
            width: '18px',
            height: '18px',
            color: '#16a34a',
          }}
        />

        <div>
          <div
            style={{
              fontSize: '17px',
              fontWeight: 750,
              color: '#0f172a',
            }}
          >
            Sensor Trends
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#94a3b8',
              marginTop: '2px',
            }}
          >
            Latest 15 real-time readings
          </div>
        </div>
      </div>

      {/* =====================================================
          Charts
      ===================================================== */}

      <div
        className="agro-chart-grid"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Temperature / Humidity */}

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '18px',
            padding: '20px',
            boxShadow: '0 3px 12px rgba(15,23,42,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '15px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Thermometer
                style={{
                  width: '16px',
                  height: '16px',
                  color: '#ea580c',
                }}
              />

              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                Temperature & Humidity
              </span>
            </div>

            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#16a34a',
                background: '#f0fdf4',
                padding: '4px 7px',
                borderRadius: '999px',
              }}
            >
              LIVE
            </span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={history}
              margin={{
                top: 5,
                right: 8,
                left: -20,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#eef2f7"
              />

              <XAxis
                dataKey="time"
                tick={{
                  fontSize: 9,
                  fill: '#94a3b8',
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fontSize: 9,
                  fill: '#94a3b8',
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #dcfce7',
                  boxShadow:
                    '0 5px 15px rgba(0,0,0,0.08)',
                  fontSize: '11px',
                }}
              />

              <Legend
                wrapperStyle={{
                  fontSize: '10px',
                  paddingTop: '8px',
                }}
              />

              <Line
                type="monotone"
                dataKey="temp"
                name="Temperature °C"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />

              <Line
                type="monotone"
                dataKey="humidity"
                name="Humidity %"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Soil / Water */}

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '18px',
            padding: '20px',
            boxShadow: '0 3px 12px rgba(15,23,42,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '15px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Droplets
                style={{
                  width: '16px',
                  height: '16px',
                  color: '#16a34a',
                }}
              />

              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                Soil & Water Monitoring
              </span>
            </div>

            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#0891b2',
                background: '#ecfeff',
                padding: '4px 7px',
                borderRadius: '999px',
              }}
            >
              LIVE
            </span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={history}
              margin={{
                top: 5,
                right: 8,
                left: -20,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#eef2f7"
              />

              <XAxis
                dataKey="time"
                tick={{
                  fontSize: 9,
                  fill: '#94a3b8',
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fontSize: 9,
                  fill: '#94a3b8',
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #dcfce7',
                  boxShadow:
                    '0 5px 15px rgba(0,0,0,0.08)',
                  fontSize: '11px',
                }}
              />

              <Legend
                wrapperStyle={{
                  fontSize: '10px',
                  paddingTop: '8px',
                }}
              />

              <Line
                type="monotone"
                dataKey="moisture"
                name="Soil Moisture %"
                stroke="#16a34a"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />

              <Line
                type="monotone"
                dataKey="waterLevel"
                name="Water Level cm"
                stroke="#0891b2"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =====================================================
          Bottom Field Health Overview
      ===================================================== */}

      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '18px',
          padding: '19px 22px',
          boxShadow: '0 3px 12px rgba(15,23,42,0.05)',
          marginBottom: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sprout
              style={{
                width: '20px',
                height: '20px',
                color: '#16a34a',
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              Field Health Overview
            </div>

            <div
              style={{
                fontSize: '10px',
                color: '#94a3b8',
                marginTop: '3px',
              }}
            >
              Real-time sensor condition summary
            </div>
          </div>

          {[
            {
              label: 'Temperature',
              ok: temperatureOk,
            },
            {
              label: 'Humidity',
              ok: humidityOk,
            },
            {
              label: 'Soil Moisture',
              ok: moistureOk,
            },
            {
              label: 'Water Level',
              ok: waterOk,
            },
          ].map(({ label, ok }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 10px',
                background: ok ? '#f0fdf4' : '#fef2f2',
                borderRadius: '999px',
                border: `1px solid ${ok ? '#dcfce7' : '#fecaca'
                  }`,
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: ok
                    ? '#16a34a'
                    : '#ef4444',
                }}
              />

              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: ok ? '#15803d' : '#dc2626',
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* =====================================================
          Footer status
      ===================================================== */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '5px',
          color: '#94a3b8',
          fontSize: '10px',
        }}
      >
        <CheckCircle2
          style={{
            width: '12px',
            height: '12px',
            color: '#22c55e',
          }}
        />

        AgroEye IoT monitoring system · Real-time data connected
      </div>
    </div>
  );
}