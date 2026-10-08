import { useEffect, useMemo, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '../firebase';
import {
  Thermometer, Droplets, Gauge, AlertTriangle, CheckCircle2,
  Sprout, Wind, MapPin, Wifi, Activity, ShieldCheck,
  Clock3, Leaf, TrendingUp
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

type AlertType = 'high' | 'medium' | 'normal';
type DeviceState = 'Online' | 'Offline' | 'Unknown';

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

interface HistoryItem extends SensorData {
  time: string;
}

const HEARTBEAT_TIMEOUT_MS = 60000;

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '18px',
  padding: '20px',
  boxShadow: '0 3px 12px rgba(15,23,42,0.05)',
  minWidth: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#0f172a',
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return 'Good Morning ☀️';
  if (hour >= 12 && hour < 17) return 'Good Afternoon 🌤️';
  if (hour >= 17 && hour < 21) return 'Good Evening 🌇';
  return 'Good Night 🌙';
}

function StatCard({
  label, value, unit, icon: Icon, iconColor, iconBg,
  status, statusColor
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
    <div style={{
      ...cardStyle,
      minHeight: '125px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#64748b',
            marginBottom: '8px'
          }}>
            {label}
          </div>

          <div style={{
            fontSize: '27px',
            fontWeight: 750,
            color: '#0f172a'
          }}>
            {Number.isFinite(value) ? value : 0}
            <span style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#94a3b8',
              marginLeft: '4px'
            }}>
              {unit}
            </span>
          </div>
        </div>

        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '13px',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Icon size={21} color={iconColor} />
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '14px'
      }}>
        <span style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: statusColor
        }} />
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: statusColor
        }}>
          {status}
        </span>
      </div>
    </div>
  );
}

function AlertPill({ type, message }: AlertItem) {
  const colors = {
    high: {
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#dc2626'
    },
    medium: {
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#b45309'
    },
    normal: {
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#15803d'
    }
  };

  const c = colors[type];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '11px 13px',
      borderRadius: '11px',
      background: c.bg,
      border: `1px solid ${c.border}`
    }}>
      <AlertTriangle size={16} color={c.text} />
      <span style={{
        fontSize: '12px',
        fontWeight: 500,
        color: c.text
      }}>
        {message}
      </span>
    </div>
  );
}

function HealthScoreCard({
  score, alertsCount
}: {
  score: number;
  alertsCount: number;
}) {
  const color =
    score >= 80 ? '#16a34a' :
      score >= 60 ? '#f59e0b' : '#ef4444';

  const label =
    score >= 80 ? 'Healthy Field' :
      score >= 60 ? 'Needs Attention' : 'Critical';

  return (
    <div style={{ ...cardStyle, height: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            padding: '10px',
            background: '#f0fdf4',
            borderRadius: '11px'
          }}>
            <Leaf size={20} color="#16a34a" />
          </div>
          <div>
            <div style={titleStyle}>Field Health</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Based on live sensor readings
            </div>
          </div>
        </div>
        <ShieldCheck size={20} color={color} />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '22px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          width: '94px',
          height: '94px',
          borderRadius: '50%',
          background: `conic-gradient(${color} ${score * 3.6}deg, #e5e7eb 0deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 800,
            color: '#0f172a'
          }}>
            {score}%
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '120px' }}>
          <div style={{
            fontSize: '17px',
            fontWeight: 750,
            color
          }}>
            {label}
          </div>
          <p style={{
            fontSize: '12px',
            color: '#64748b',
            lineHeight: 1.6
          }}>
            {alertsCount === 0
              ? 'All monitored conditions are within the expected range.'
              : `${alertsCount} active conditions require attention.`}
          </p>
        </div>
      </div>
    </div>
  );
}

function DeviceStatusCard({
  esp32Status,
  sensorFields
}: {
  esp32Status: DeviceState;
  sensorFields: Record<string, boolean>;
}) {
  const devices: { name: string; status: DeviceState }[] = [
    { name: 'ESP32 Controller', status: esp32Status },
    {
      name: 'Temperature Sensor',
      status: esp32Status === 'Online'
        ? sensorFields.temp ? 'Online' : 'Unknown'
        : esp32Status
    },
    {
      name: 'Humidity Sensor',
      status: esp32Status === 'Online'
        ? sensorFields.humidity ? 'Online' : 'Unknown'
        : esp32Status
    },
    {
      name: 'Soil Moisture Sensor',
      status: esp32Status === 'Online'
        ? sensorFields.moisture ? 'Online' : 'Unknown'
        : esp32Status
    }
  ];

  return (
    <div style={cardStyle}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '18px'
      }}>
        <div style={{
          padding: '10px',
          background: '#eff6ff',
          borderRadius: '11px'
        }}>
          <Wifi size={20} color="#2563eb" />
        </div>
        <div>
          <div style={titleStyle}>IoT Device Status</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            Live device connectivity
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '11px'
      }}>
        {devices.map(device => {
          const color =
            device.status === 'Online' ? '#15803d' :
              device.status === 'Offline' ? '#dc2626' : '#b45309';

          return (
            <div key={device.name} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '10px',
              background: '#f8fafc',
              borderRadius: '9px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: 0
              }}>
                <Activity size={14} color={color} />
                <span style={{
                  fontSize: '11px',
                  color: '#475569'
                }}>
                  {device.name}
                </span>
              </div>

              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color,
                background:
                  device.status === 'Online' ? '#dcfce7' :
                    device.status === 'Offline' ? '#fee2e2' : '#fef3c7',
                padding: '4px 8px',
                borderRadius: '999px',
                flexShrink: 0
              }}>
                ● {device.status}
              </span>
            </div>
          );
        })}
      </div>

      <p style={{
        fontSize: '10px',
        color: '#94a3b8',
        marginTop: '12px'
      }}>
        Sensor status is inferred from fresh readings.
        Hardware diagnostics are required to detect individual sensor failures.
      </p>
    </div>
  );
}

function TrendChart({
  title,
  icon: Icon,
  iconColor,
  history,
  lines
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  history: HistoryItem[];
  lines: {
    key: string;
    name: string;
    color: string;
  }[];
}) {
  return (
    <div style={cardStyle}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '15px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Icon size={16} color={iconColor} />
          <span style={{ ...titleStyle, fontSize: '13px' }}>
            {title}
          </span>
        </div>

        <span style={{
          fontSize: '9px',
          fontWeight: 700,
          color: '#16a34a',
          background: '#f0fdf4',
          padding: '4px 7px',
          borderRadius: '999px'
        }}>
          LIVE
        </span>
      </div>

      <div style={{ width: '100%', minWidth: 0, height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={history}
            margin={{ top: 5, right: 8, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#eef2f7"
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #dcfce7',
                fontSize: '11px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />

            {lines.map(line => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Dashboard() {
  const user = auth.currentUser;
  const displayName =
    user?.displayName || user?.email?.split('@')[0] || 'Farmer';

  const [greeting, setGreeting] = useState(getGreeting);
  const [now, setNow] = useState(Date.now());

  const [data, setData] = useState<SensorData>({
    temp: 0,
    humidity: 0,
    moisture: 0,
    waterLevel: 0,
    lat: 0,
    lng: 0
  });

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [hasData, setHasData] = useState(false);

  const [sensorFields, setSensorFields] = useState({
    temp: false,
    humidity: false,
    moisture: false
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreeting());
      setNow(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const connectionRef = ref(db, '.info/connected');

    const unsubscribe = onValue(connectionRef, snapshot => {
      setFirebaseConnected(snapshot.val() === true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const dataRef = ref(db, 'field');

    const unsubscribe = onValue(dataRef, snapshot => {
      const value = snapshot.val();

      if (!value) {
        setHasData(false);
        setLastSeen(null);
        return;
      }

      setHasData(true);

      const sensorData: SensorData = {
        temp: Number(value.temp) || 0,
        humidity: Number(value.humidity) || 0,
        moisture: Number(value.moisture) || 0,
        waterLevel: Number(value.waterLevel) || 0,
        lat: Number(value.lat) || 0,
        lng: Number(value.lng) || 0
      };

      setData(sensorData);

      setSensorFields({
        temp: value.temp !== undefined && value.temp !== null &&
          Number.isFinite(Number(value.temp)),
        humidity: value.humidity !== undefined && value.humidity !== null &&
          Number.isFinite(Number(value.humidity)),
        moisture: value.moisture !== undefined && value.moisture !== null &&
          Number.isFinite(Number(value.moisture))
      });

      const stamp = Number(value.lastSeen);
      setLastSeen(Number.isFinite(stamp) && stamp > 0 ? stamp : null);

      const time = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      setLastUpdated(new Date().toLocaleTimeString());

      setHistory(prev => [
        ...prev.slice(-14),
        { time, ...sensorData }
      ]);

      const newAlerts: AlertItem[] = [];

      if (sensorData.temp > 35) {
        newAlerts.push({
          type: 'high',
          message: `High Temperature: ${sensorData.temp}°C`
        });
      }

      if (sensorData.moisture < 30) {
        newAlerts.push({
          type: 'high',
          message: `Low Soil Moisture: ${sensorData.moisture}%`
        });
      }

      if (sensorData.humidity < 40) {
        newAlerts.push({
          type: 'medium',
          message: `Low Humidity: ${sensorData.humidity}%`
        });
      }

      if (sensorData.waterLevel < 5) {
        newAlerts.push({
          type: 'high',
          message: `Water Level Too Low: ${sensorData.waterLevel} cm`
        });
      } else if (sensorData.waterLevel > 20) {
        newAlerts.push({
          type: 'high',
          message: `Water Level Too High: ${sensorData.waterLevel} cm`
        });
      }

      setAlerts(newAlerts);
    });

    return () => unsubscribe();
  }, []);

  const esp32Status: DeviceState = !firebaseConnected
    ? 'Unknown'
    : lastSeen === null
      ? 'Unknown'
      : now - lastSeen >= 0 &&
        now - lastSeen <= HEARTBEAT_TIMEOUT_MS
        ? 'Online'
        : 'Offline';

  const temperatureOk = data.temp <= 35;
  const humidityOk = data.humidity >= 40;
  const moistureOk = data.moisture > 60;
  const waterOk = data.waterLevel >= 5 && data.waterLevel <= 20;

  const healthScore = useMemo(() => {
    if (!hasData) return 0;

    let score = 100;

    if (!temperatureOk) score -= 20;
    if (!humidityOk) score -= 15;
    if (!moistureOk) score -= 30;
    if (!waterOk) score -= 20;

    score -= alerts.length * 5;

    return Math.max(0, Math.min(100, score));
  }, [
    hasData, temperatureOk, humidityOk,
    moistureOk, waterOk, alerts.length
  ]);

  const today = new Date(now).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const systemStatus =
    !firebaseConnected ? 'Disconnected' :
      esp32Status === 'Online' ? 'Live & Online' :
        esp32Status === 'Offline' ? 'Device Offline' :
          'Checking Device';

  return (
    <div className="agro-dashboard">
      <style>{`
        .agro-dashboard {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 26px;
          box-sizing: border-box;
        }
        .agro-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }
        .agro-health-devices {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .agro-alerts-gps {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, .42fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .agro-charts {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (max-width: 1150px) {
          .agro-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .agro-alerts-gps {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .agro-charts {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        @media (max-width: 700px) {
          .agro-dashboard { padding: 14px; }
          .agro-stats,
          .agro-health-devices,
          .agro-alerts-gps,
          .agro-charts {
            grid-template-columns: minmax(0, 1fr);
          }
          .agro-welcome { padding: 20px !important; }
          .agro-welcome h1 { font-size: 21px !important; }
        }
      `}</style>

      {/* Welcome Banner */}
      <div className="agro-welcome" style={{
        background:
          'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #16a34a 100%)',
        borderRadius: '22px',
        padding: '26px 28px',
        color: '#ffffff',
        boxShadow: '0 8px 25px rgba(6,78,59,0.18)',
        marginBottom: '22px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          width: '190px',
          height: '190px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          right: '-55px',
          top: '-75px'
        }} />

        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <Sprout size={17} color="#bbf7d0" />
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#bbf7d0'
              }}>
                AGROEYE SMART FARMING
              </span>
            </div>

            <h1 style={{
              margin: 0,
              fontSize: '25px',
              fontWeight: 800
            }}>
              {greeting}, {displayName} 👋
            </h1>

            <p style={{
              margin: '7px 0 0',
              color: '#d1fae5',
              fontSize: '13px'
            }}>
              Monitor your paddy field and make better farming decisions.
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.11)',
              borderRadius: '12px',
              padding: '10px 14px'
            }}>
              <div style={{ fontSize: '9px', color: '#a7f3d0' }}>
                TODAY
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>
                {today}
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.11)',
              borderRadius: '12px',
              padding: '10px 14px'
            }}>
              <div style={{ fontSize: '9px', color: '#a7f3d0' }}>
                SYSTEM
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>
                ● {systemStatus}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Monitoring */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        flexWrap: 'wrap',
        marginBottom: '12px'
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '17px',
            fontWeight: 750,
            color: '#0f172a'
          }}>
            Live Field Monitoring
          </h2>
          <p style={{
            margin: '3px 0 0',
            fontSize: '11px',
            color: '#94a3b8'
          }}>
            Real-time environmental conditions
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#64748b',
          fontSize: '10px'
        }}>
          <Clock3 size={13} />
          Updated {lastUpdated || 'waiting...'}
        </div>
      </div>

      <div className="agro-stats">
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
            data.waterLevel < 5 ? 'Too Low' :
              data.waterLevel > 20 ? 'Too High' : 'Optimal'
          }
          statusColor={waterOk ? '#0891b2' : '#dc2626'}
        />
      </div>

      {/* Field Health and Devices */}
      <div className="agro-health-devices">
        <HealthScoreCard
          score={healthScore}
          alertsCount={alerts.length}
        />
        <DeviceStatusCard
          esp32Status={esp32Status}
          sensorFields={sensorFields}
        />
      </div>

      {/* Alerts and GPS */}
      <div className="agro-alerts-gps">
        <div style={cardStyle}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertTriangle size={20} color="#ef4444" />
              <div>
                <div style={titleStyle}>Live Alerts</div>
                <div style={{
                  fontSize: '11px',
                  color: '#94a3b8'
                }}>
                  Current field conditions
                </div>
              </div>
            </div>

            <span style={{
              background: alerts.length ? '#fee2e2' : '#dcfce7',
              color: alerts.length ? '#dc2626' : '#15803d',
              fontSize: '10px',
              fontWeight: 700,
              padding: '5px 9px',
              borderRadius: '999px'
            }}>
              {alerts.length ? `${alerts.length} Active` : 'All Clear'}
            </span>
          </div>

          {!hasData ? (
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Waiting for Firebase sensor readings...
            </p>
          ) : alerts.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '15px'
            }}>
              <CheckCircle2 size={20} color="#16a34a" />
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#15803d'
                }}>
                  All systems normal
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#4ade80'
                }}>
                  No active environmental alerts.
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {alerts.map((alert, index) => (
                <AlertPill key={index} {...alert} />
              ))}
            </div>
          )}
        </div>

        <div style={{
          ...cardStyle,
          background:
            'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)',
          border: '1px solid #dcfce7'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '17px'
          }}>
            <MapPin size={20} color="#16a34a" />
            <div>
              <div style={titleStyle}>Field Location</div>
              <div style={{
                fontSize: '11px',
                color: '#64748b'
              }}>
                GPS sensor coordinates
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '10px'
          }}>
            {[
              { label: 'LATITUDE', value: data.lat },
              { label: 'LONGITUDE', value: data.lng }
            ].map(item => (
              <div key={item.label} style={{
                background: '#ffffff',
                borderRadius: '10px',
                padding: '11px',
                border: '1px solid #dcfce7',
                minWidth: 0
              }}>
                <div style={{
                  fontSize: '9px',
                  color: '#94a3b8',
                  marginBottom: '4px'
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#166534',
                  overflowWrap: 'anywhere'
                }}>
                  {item.value || '—'}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '13px',
            fontSize: '10px',
            color: '#15803d',
            fontWeight: 600
          }}>
            {esp32Status === 'Online'
              ? '● GPS readings available'
              : '● GPS connectivity not verified'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        marginBottom: '12px'
      }}>
        <TrendingUp size={18} color="#16a34a" />
        <div>
          <div style={{
            fontSize: '17px',
            fontWeight: 750,
            color: '#0f172a'
          }}>
            Sensor Trends
          </div>
          <div style={{
            fontSize: '11px',
            color: '#94a3b8'
          }}>
            Latest 15 real-time readings
          </div>
        </div>
      </div>

      <div className="agro-charts">
        <TrendChart
          title="Temperature & Humidity"
          icon={Thermometer}
          iconColor="#ea580c"
          history={history}
          lines={[
            {
              key: 'temp',
              name: 'Temperature °C',
              color: '#f97316'
            },
            {
              key: 'humidity',
              name: 'Humidity %',
              color: '#3b82f6'
            }
          ]}
        />

        <TrendChart
          title="Soil & Water Monitoring"
          icon={Droplets}
          iconColor="#16a34a"
          history={history}
          lines={[
            {
              key: 'moisture',
              name: 'Soil Moisture %',
              color: '#16a34a'
            },
            {
              key: 'waterLevel',
              name: 'Water Level cm',
              color: '#0891b2'
            }
          ]}
        />
      </div>

      {/* Field Health Overview */}
      <div style={{
        ...cardStyle,
        marginBottom: '10px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            padding: '10px',
            borderRadius: '12px',
            background: '#f0fdf4'
          }}>
            <Sprout size={20} color="#16a34a" />
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <div style={titleStyle}>Field Health Overview</div>
            <div style={{
              fontSize: '10px',
              color: '#94a3b8'
            }}>
              Real-time sensor condition summary
            </div>
          </div>

          {[
            { label: 'Temperature', ok: temperatureOk },
            { label: 'Humidity', ok: humidityOk },
            { label: 'Soil Moisture', ok: moistureOk },
            { label: 'Water Level', ok: waterOk }
          ].map(item => (
            <span key={item.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 10px',
              background: !hasData ? '#f1f5f9' :
                item.ok ? '#f0fdf4' : '#fef2f2',
              borderRadius: '999px',
              color: !hasData ? '#64748b' :
                item.ok ? '#15803d' : '#dc2626',
              fontSize: '10px',
              fontWeight: 600
            }}>
              ● {item.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px',
        color: '#94a3b8',
        fontSize: '10px'
      }}>
        <CheckCircle2 size={12} color="#22c55e" />
        AgroEye IoT monitoring system · Firebase Realtime Database
      </div>
    </div>
  );
}