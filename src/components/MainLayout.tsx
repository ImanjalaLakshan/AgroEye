
import { useState } from 'react';

import {
  LayoutDashboard,
  Map,
  Radio,
  Bell,
  Settings,
  Sprout,
  Menu,
  X,
  LogOut,
  Shield,
  ChevronRight,
  ScanSearch,
} from 'lucide-react';

import { Dashboard } from './Dashboard';
import { SensorMonitoring } from './SensorMonitoring';
import { AlertsNotifications } from './AlertsNotifications';
import { CheckDiseases } from './CheckDiseases';
import { AdminPanel } from './AdminPanel';
import { Settings as SettingsPage } from './Settings';
import { auth } from '../firebase';

type View =
  | 'dashboard'
  | 'sensors'
  | 'alerts'
  | 'diseases'
  | 'admin'
  | 'settings';

interface MainLayoutProps {
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const viewLabels: Record<View, string> = {
  dashboard: 'Dashboard',
  sensors: 'Sensors',
  alerts: 'Alerts',
  diseases: 'Check Diseases',
  admin: 'Admin Panel',
  settings: 'Settings',
};

const viewSubtitles: Record<View, string> = {
  dashboard:
    'Monitor your crops, field and environment for a healthier harvest.',
  sensors:
    'View and manage your IoT sensor data in real-time.',
  alerts:
    "Stay informed about your farm's condition.",
  diseases:
    'Detect paddy diseases using camera and gallery images.',
  admin:
    'Manage datasets, users and system settings.',
  settings:
    'Manage your account and application preferences.',
};

export function MainLayout({
  onLogout,
  darkMode,
  toggleDarkMode,
}: MainLayoutProps) {
  const [currentView, setCurrentView] =
    useState<View>('dashboard');

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const user = auth.currentUser;

  const displayName =
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'User';

  const initials = displayName
    .slice(0, 2)
    .toUpperCase();

  const today = new Date().toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );

  const navItems = [
    {
      id: 'dashboard' as View,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'sensors' as View,
      label: 'Sensors',
      icon: Radio,
    },
    {
      id: 'alerts' as View,
      label: 'Alerts',
      icon: Bell,
    },
    {
      id: 'diseases' as View,
      label: 'Check Diseases',
      icon: ScanSearch,
    },
    {
      id: 'admin' as View,
      label: 'Admin Panel',
      icon: Shield,
    },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;

      case 'sensors':
        return <SensorMonitoring />;

      case 'alerts':
        return <AlertsNotifications />;

      case 'diseases':
        return <CheckDiseases />;

      case 'admin':
        return <AdminPanel />;

      case 'settings':
        return (
          <SettingsPage
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
        );

      default:
        return <Dashboard />;
    }
  };

  const navigate = (view: View) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  const sidebarBg = '#14532d';
  const sidebarActive = '#16a34a';
  const sidebarText = '#86efac';
  const sidebarTextActive = '#ffffff';

  return (
    <div
      className="agro-shell"
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f0fdf4',
        fontFamily:
          'Inter, system-ui, sans-serif',
      }}
    >
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor:
              'rgba(0,0,0,0.5)',
            zIndex: 40,
          }}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className="agro-sidebar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100%',
          width: '220px',
          backgroundColor: sidebarBg,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition:
            'transform 0.25s ease',
          transform: sidebarOpen
            ? 'translateX(0)'
            : undefined,
          boxShadow:
            '4px 0 20px rgba(0,0,0,0.2)',
        }}
      >
        {/* LOGO */}
        <div
          style={{
            padding: '22px 18px 18px',
            borderBottom:
              '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
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
                borderRadius: '10px',
                backgroundColor:
                  sidebarActive,
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'center',
                boxShadow:
                  '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <Sprout
                style={{
                  width: '22px',
                  height: '22px',
                  color: '#fff',
                }}
              />
            </div>

            <div>
              <div
                style={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '16px',
                }}
              >
                AgroEye
              </div>

              <div
                style={{
                  color: sidebarText,
                  fontSize: '10px',
                }}
              >
                Smart Farming Monitor
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              setSidebarOpen(false)
            }
            style={{
              color: sidebarText,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: sidebarOpen
                ? 'block'
                : 'none',
            }}
          >
            <X
              style={{
                width: '18px',
                height: '18px',
              }}
            />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav
          style={{
            flex: 1,
            padding: '14px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {navItems.map(
            ({ id, label, icon: Icon }) => {
              const active =
                currentView === id;

              return (
                <button
                  key={id}
                  onClick={() =>
                    navigate(id)
                  }
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    padding: '10px 13px',
                    borderRadius: '9px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor:
                      active
                        ? sidebarActive
                        : 'transparent',
                    color: active
                      ? sidebarTextActive
                      : sidebarText,
                    fontWeight: active
                      ? 600
                      : 400,
                    fontSize: '13.5px',
                    transition:
                      'background 0.15s, color 0.15s',
                    textAlign: 'left',
                    boxShadow: active
                      ? '0 2px 8px rgba(22,163,74,0.4)'
                      : 'none',
                  }}
                >
                  <Icon
                    style={{
                      width: '17px',
                      height: '17px',
                      flexShrink: 0,
                    }}
                  />

                  <span
                    style={{
                      flex: 1,
                    }}
                  >
                    {label}
                  </span>

                  {active && (
                    <ChevronRight
                      style={{
                        width: '13px',
                        height: '13px',
                        opacity: 0.7,
                      }}
                    />
                  )}
                </button>
              );
            }
          )}
        </nav>

        {/* BOTTOM MENU */}
        <div
          style={{
            padding: '10px',
            borderTop:
              '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* SETTINGS */}
          <button
            onClick={() =>
              navigate('settings')
            }
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              padding: '10px 13px',
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor:
                currentView === 'settings'
                  ? sidebarActive
                  : 'transparent',
              color:
                currentView === 'settings'
                  ? sidebarTextActive
                  : sidebarText,
              fontWeight:
                currentView === 'settings'
                  ? 600
                  : 400,
              fontSize: '13.5px',
              transition:
                'background 0.15s',
              textAlign: 'left',
              marginBottom: '2px',
            }}
          >
            <Settings
              style={{
                width: '17px',
                height: '17px',
              }}
            />

            <span>Settings</span>
          </button>

          {/* LOGOUT */}
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              padding: '10px 13px',
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor:
                'transparent',
              color: '#fca5a5',
              fontSize: '13.5px',
              transition:
                'background 0.15s',
              textAlign: 'left',
            }}
          >
            <LogOut
              style={{
                width: '17px',
                height: '17px',
              }}
            />

            <span>Logout</span>
          </button>

          {/* USER CARD */}
          <div
            style={{
              marginTop: '10px',
              padding: '10px 11px',
              borderRadius: '9px',
              backgroundColor:
                'rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor:
                  sidebarActive,
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '12px',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div
              style={{
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow:
                    'ellipsis',
                }}
              >
                {displayName}
              </div>

              <div
                style={{
                  color: sidebarText,
                  fontSize: '10px',
                }}
              >
                Farmer
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div
        className="agro-main"
        style={{
          flex: 1,
          marginLeft: '220px',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* TOP HEADER */}
        <header
          className="agro-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            backgroundColor: '#fff',
            borderBottom:
              '1px solid #dcfce7',
            padding: '0 24px',
            height: '62px',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            boxShadow:
              '0 1px 6px rgba(0,0,0,0.05)',
          }}
        >
          {/* LEFT HEADER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              onClick={() =>
                setSidebarOpen(true)
              }
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#15803d',
                padding: '5px',
                display: 'none',
              }}
              className="mobile-hamburger"
            >
              <Menu
                style={{
                  width: '22px',
                  height: '22px',
                }}
              />
            </button>

            <div>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: '#14532d',
                  lineHeight: 1.2,
                }}
              >
                {viewLabels[currentView]}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: '#9ca3af',
                  lineHeight: 1,
                }}
              >
                {viewSubtitles[currentView]}
              </div>
            </div>
          </div>

          {/* RIGHT HEADER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* DATE */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor:
                  '#f0fdf4',
                padding: '5px 11px',
                borderRadius: '7px',
                border:
                  '1px solid #bbf7d0',
              }}
            >
              <Map
                style={{
                  width: '13px',
                  height: '13px',
                  color: '#16a34a',
                }}
              />

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#15803d',
                }}
              >
                {today}
              </span>
            </div>

            {/* ALERT BELL */}
            <button
              onClick={() =>
                navigate('alerts')
              }
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                color: '#15803d',
              }}
            >
              <Bell
                style={{
                  width: '19px',
                  height: '19px',
                }}
              />

              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  right: '3px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor:
                    '#ef4444',
                  border:
                    '1.5px solid #fff',
                }}
              />
            </button>

            {/* USER AVATAR */}
            <div
              onClick={() =>
                navigate('settings')
              }
              style={{
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                backgroundColor:
                  '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow:
                  '0 2px 6px rgba(22,163,74,0.3)',
              }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main
          className="agro-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {renderView()}
        </main>

        {/* FOOTER */}
        <footer
          style={{
            textAlign: 'center',
            padding: '8px',
            fontSize: '11px',
            color: '#9ca3af',
            borderTop:
              '1px solid #f3f4f6',
            backgroundColor: '#fff',
          }}
        >
          Better Insights for a Greener Tomorrow ·
          AgroEye v1.0.0
        </footer>
      </div>

      {/* RESPONSIVE CSS */}
      <style>{`
        .agro-shell {
          width: 100%;
          min-width: 0;
        }

        .agro-main,
        .agro-content {
          min-width: 0;
        }

        @media (max-width: 1023px) {
          .agro-sidebar {
            transform: ${sidebarOpen
          ? 'translateX(0)'
          : 'translateX(-105%)'
        } !important;
          }

          .agro-main {
            margin-left: 0 !important;
            width: 100%;
          }

          .mobile-hamburger {
            display: flex !important;
          }
        }

        @media (max-width: 640px) {
          .agro-header {
            padding: 0 12px !important;
            gap: 8px;
          }

          .agro-header > div {
            min-width: 0;
          }

          .agro-header > div:first-child > div:last-child > div:last-child {
            display: none;
          }

          .agro-header > div:last-child > div:first-child {
            display: none !important;
          }

          .agro-content {
            overflow-x: hidden;
          }
        }
      `}</style>
    </div>
  );
}
