import { useEffect, useState } from 'react';
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

/* ── tiny helper card ── */
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
  status?: string;
  statusColor?: string;
}) {
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '14px',
      padding: '20px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
      border: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        backgroundColor: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon style={{ width: '22px', height: '22px', color: iconColor }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
          {value}<span style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af', marginLeft: '2px' }}>{unit}</span>
        </div>
        {status && (
          <div style={{ fontSize: '11px', marginTop: '3px', color: statusColor || '#16a34a', fontWeight: 500 }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── alert pill ── */
function AlertPill({ type, message }: { type: 'high' | 'medium' | 'normal'; message: string }) {
  const colors = {
    high: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '#ef4444' },
    medium: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', icon: '#f59e0b' },
    normal: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', icon: '#22c55e' },
  };
  const c = colors[type];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderRadius: '9px',
      backgroundColor: c.bg, border: `1px solid ${c.border}`,
    }}>
      <AlertTriangle style={{ width: '15px', height: '15px', color: c.icon, flexShrink: 0 }} />
      <span style={{ fontSize: '13px', color: c.text }}>{message}</span>
    </div>
  );
}

export function Dashboard() {
  const user = auth.currentUser;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Farmer';

  const [data, setData] = useState({ temp: 0, humidity: 0, moisture: 0, waterLevel: 0, lat: 0, lng: 0 });
  const [alerts, setAlerts] = useState<{ type: 'high' | 'medium' | 'normal'; message: string }[]>([]);
  const [history, setHistory] = useState<{ time: string; temp: number; moisture: number; waterLevel: number; humidity: number }[]>([]);

  useEffect(() => {
    const dataRef = ref(db, 'field');
    onValue(dataRef, (snapshot) => {
      const value = snapshot.val();
      if (!value) return;
      setData(value);

      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setHistory(prev => [...prev.slice(-14), {
        time,
        temp: value.temp,
        moisture: value.moisture,
        waterLevel: value.waterLevel,
        humidity: value.humidity,
      }]);

      const newAlerts: typeof alerts = [];
      if (value.temp > 35) newAlerts.push({ type: 'high', message: `High Temperature: ${value.temp}°C` });
      if (value.moisture < 30) newAlerts.push({ type: 'high', message: `Low Soil Moisture: ${value.moisture}%` });
      if (value.humidity < 40) newAlerts.push({ type: 'medium', message: `Low Humidity: ${value.humidity}%` });
      if (value.waterLevel < 5) newAlerts.push({ type: 'high', message: `Water Level Too Low: ${value.waterLevel} cm` });
      else if (value.waterLevel > 20) newAlerts.push({ type: 'high', message: `Water Level Too High: ${value.waterLevel} cm` });
      setAlerts(newAlerts);
    });
  }, []);

  const moistureOk = data.moisture > 60;
  const waterOk = data.waterLevel >= 5 && data.waterLevel <= 20;

  return (
    <div className="agro-dashboard" style={{
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'flex', flexDirection: 'column', gap: '22px',
    }}>

      {/* ── Greeting banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
        borderRadius: '16px',
        padding: '22px 26px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 16px rgba(20,83,45,0.22)',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <div style={{ color: '#86efac', fontSize: '13px', marginBottom: '4px' }}>Welcome back 👋</div>
          <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>
            Hello, {displayName}
          </h1>
          <p style={{ color: '#bbf7d0', fontSize: '12px', margin: '4px 0 0' }}>
            Monitor your crops, field and environment for a healthier harvest.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 16px',
            textAlign: 'center',
          }}>
            <div style={{ color: '#86efac', fontSize: '10px', marginBottom: '2px' }}>TEMPERATURE</div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>{data.temp}°C</div>
          </div>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 16px',
            textAlign: 'center',
          }}>
            <div style={{ color: '#86efac', fontSize: '10px', marginBottom: '2px' }}>HUMIDITY</div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>{data.humidity}%</div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="agro-stats" style={{ display: 'grid', gap: '14px' }}>
        <StatCard
          label="Temperature"
          value={data.temp} unit="°C"
          icon={Thermometer} iconColor="#f97316" iconBg="#fff7ed"
          status={data.temp > 35 ? '⚠ Too High' : 'Normal range'}
          statusColor={data.temp > 35 ? '#dc2626' : '#16a34a'}
        />
        <StatCard
          label="Humidity"
          value={data.humidity} unit="%"
          icon={Droplets} iconColor="#3b82f6" iconBg="#eff6ff"
          status={data.humidity < 40 ? '⚠ Too Low' : 'Good'}
          statusColor={data.humidity < 40 ? '#b45309' : '#16a34a'}
        />
        <StatCard
          label="Soil Moisture"
          value={data.moisture} unit="%"
          icon={Gauge} iconColor={moistureOk ? '#16a34a' : '#ef4444'} iconBg={moistureOk ? '#f0fdf4' : '#fef2f2'}
          status={moistureOk ? 'Healthy' : 'Needs Water'}
          statusColor={moistureOk ? '#16a34a' : '#dc2626'}
        />
        <StatCard
          label="Water Level"
          value={data.waterLevel} unit=" cm"
          icon={Wind} iconColor={waterOk ? '#0891b2' : '#ef4444'} iconBg={waterOk ? '#ecfeff' : '#fef2f2'}
          status={data.waterLevel < 5 ? 'Too Low' : data.waterLevel > 20 ? 'Too High' : 'Optimal'}
          statusColor={waterOk ? '#0891b2' : '#dc2626'}
        />
      </div>

      {/* ── Alerts + GPS row ── */}
      <div className="agro-alerts-gps" style={{ display: 'grid', gap: '16px', alignItems: 'start' }}>
        {/* Alerts */}
        <div style={{
          backgroundColor: '#fff', borderRadius: '14px', padding: '20px', minWidth: 0,
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle style={{ width: '15px', height: '15px', color: '#ef4444' }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>Live Alerts</span>
            {alerts.length > 0 && (
              <span style={{
                marginLeft: 'auto', backgroundColor: '#fef2f2', color: '#dc2626',
                fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
              }}>
                {alerts.length} Active
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontSize: '13px' }}>
              <CheckCircle2 style={{ width: '16px', height: '16px' }} />
              All systems normal — no active alerts
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alerts.map((a, i) => <AlertPill key={i} {...a} />)}
            </div>
          )}
        </div>

        {/* GPS chip */}
        <div style={{
          backgroundColor: '#fff', borderRadius: '14px', padding: '20px', minWidth: 0,
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9',
          minWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#f0fdf4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MapPin style={{ width: '14px', height: '14px', color: '#16a34a' }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>GPS Location</span>
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Latitude</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#14532d', marginBottom: '10px', overflowWrap: 'anywhere' }}>{data.lat || '—'}</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Longitude</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#14532d', overflowWrap: 'anywhere' }}>{data.lng || '—'}</div>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="agro-charts" style={{ display: 'grid', gap: '16px' }}>
        {/* Temp + Humidity */}
        <div style={{
          backgroundColor: '#fff', borderRadius: '14px', padding: '20px', minWidth: 0,
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Thermometer style={{ width: '16px', height: '16px', color: '#f97316' }} />
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>Temperature & Humidity Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #dcfce7', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line dataKey="temp" name="Temp (°C)" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line dataKey="humidity" name="Humidity (%)" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Moisture + Water */}
        <div style={{
          backgroundColor: '#fff', borderRadius: '14px', padding: '20px', minWidth: 0,
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Droplets style={{ width: '16px', height: '16px', color: '#16a34a' }} />
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>Soil Moisture & Water Level</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #dcfce7', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line dataKey="moisture" name="Moisture (%)" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line dataKey="waterLevel" name="Water (cm)" stroke="#0891b2" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Field Health summary bar ── */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '14px', padding: '18px 22px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
      }}>
        <Sprout style={{ width: '20px', height: '20px', color: '#16a34a', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>Field Health Overview</div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Real-time sensor data · auto-updates every 5 s</div>
        </div>
        {[
          { label: 'Temperature', ok: data.temp <= 35 },
          { label: 'Humidity', ok: data.humidity >= 40 },
          { label: 'Soil Moisture', ok: moistureOk },
          { label: 'Water Level', ok: waterOk },
        ].map(({ label, ok }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: ok ? '#16a34a' : '#ef4444',
            }} />
            <span style={{ fontSize: '12px', color: '#374151' }}>{label}</span>
          </div>
        ))}
      </div>


      <style>{`
        .agro-dashboard { box-sizing: border-box; width: 100%; min-width: 0; }
        .agro-dashboard * { box-sizing: border-box; }
        .agro-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .agro-alerts-gps { grid-template-columns: minmax(0, 1fr) minmax(0, 260px); }
        .agro-charts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .agro-charts > div, .agro-alerts-gps > div { min-width: 0; }
        @media (max-width: 1199px) {
          .agro-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .agro-charts { grid-template-columns: minmax(0, 1fr); }
        }
        @media (max-width: 699px) {
          .agro-dashboard { padding: 14px !important; gap: 16px !important; }
          .agro-stats, .agro-alerts-gps, .agro-charts {
            grid-template-columns: minmax(0, 1fr);
          }
          .agro-dashboard .recharts-responsive-container { min-width: 0; }
        }
      `}</style>
    </div>
  );
}