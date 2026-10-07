import { useState } from 'react';
import { Button } from './ui/button';
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
} from 'lucide-react';
import { Dashboard } from './Dashboard';
import { SensorMonitoring } from './SensorMonitoring';
import { AlertsNotifications } from './AlertsNotifications';
import { AdminPanel } from './AdminPanel';
import { Settings as SettingsPage } from './Settings';

type View = 'dashboard' | 'sensors' | 'alerts' | 'admin' | 'settings';

interface MainLayoutProps {
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export function MainLayout({ onLogout, darkMode, toggleDarkMode }: MainLayoutProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sensors' as View, label: 'Sensors', icon: Radio },
    { id: 'alerts' as View, label: 'Alerts', icon: Bell },
    { id: 'admin' as View, label: 'Admin Panel', icon: Shield },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'sensors':
        return <SensorMonitoring />;
      case 'alerts':
        return <AlertsNotifications />;
      case 'admin':
        return <AdminPanel />;
      case 'settings':
        return <SettingsPage darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-green-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-green-100 z-50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-64`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-green-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-800">AgroEye</span>
            </div>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6 text-green-600" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'text-green-700 hover:bg-green-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-green-100 space-y-2">
            <button
              onClick={() => {
                setCurrentView('settings');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === 'settings'
                  ? 'bg-green-600 text-white'
                  : 'text-green-700 hover:bg-green-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar - Only show on mobile */}
        <header className="bg-white border-b border-green-100 p-4 lg:hidden sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6 text-green-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <span className="text-green-800">AgroEye</span>
            </div>
            <div className="w-6" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Current View */}
        <div>{renderView()}</div>
      </div>
    </div>
  );
}