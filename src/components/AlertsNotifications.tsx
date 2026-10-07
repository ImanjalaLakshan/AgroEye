import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Droplets,
  Thermometer,
  Bug,
  Sprout,
  Wind,
  CloudRain,
  Battery,
  Wifi,
  Bell,
  Filter,
  Trash2,
  Eye,
  Clock,
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'high' | 'medium' | 'normal';
  category: 'temperature' | 'moisture' | 'disease' | 'pest' | 'weather' | 'battery' | 'system' | 'growth';
  message: string;
  confidence: number;
  timestamp: string;
  location: string;
  isRead: boolean;
}

const alerts: Alert[] = [
  {
    id: '1',
    type: 'high',
    category: 'disease',
    message: 'Potential disease outbreak detected in Field A3',
    confidence: 87,
    timestamp: '5 mins ago',
    location: 'Field A3',
    isRead: false,
  },
  {
    id: '2',
    type: 'high',
    category: 'temperature',
    message: 'High temperature alert - 38°C detected in Field B2',
    confidence: 92,
    timestamp: '12 mins ago',
    location: 'Field B2',
    isRead: false,
  },
  {
    id: '3',
    type: 'medium',
    category: 'moisture',
    message: 'Soil moisture dropping below optimal level',
    confidence: 78,
    timestamp: '25 mins ago',
    location: 'Field C1',
    isRead: false,
  },
  {
    id: '4',
    type: 'medium',
    category: 'pest',
    message: 'Unusual pest activity detected near irrigation zone',
    confidence: 65,
    timestamp: '45 mins ago',
    location: 'Field A1',
    isRead: true,
  },
  {
    id: '5',
    type: 'high',
    category: 'weather',
    message: 'Heavy rainfall expected in the next 2 hours',
    confidence: 95,
    timestamp: '1 hour ago',
    location: 'All Fields',
    isRead: true,
  },
  {
    id: '6',
    type: 'medium',
    category: 'battery',
    message: 'Sensor battery low in Field D2 - needs replacement',
    confidence: 100,
    timestamp: '2 hours ago',
    location: 'Field D2',
    isRead: true,
  },
  {
    id: '7',
    type: 'normal',
    category: 'growth',
    message: 'Crop growth progressing as expected',
    confidence: 88,
    timestamp: '3 hours ago',
    location: 'Field B1',
    isRead: true,
  },
  {
    id: '8',
    type: 'medium',
    category: 'system',
    message: 'Sensor connection unstable in North Field',
    confidence: 72,
    timestamp: '4 hours ago',
    location: 'Field A2',
    isRead: true,
  },
  {
    id: '9',
    type: 'normal',
    category: 'moisture',
    message: 'Irrigation system activated successfully',
    confidence: 100,
    timestamp: '5 hours ago',
    location: 'Field C2',
    isRead: true,
  },
  {
    id: '10',
    type: 'high',
    category: 'temperature',
    message: 'Temperature fluctuation detected - possible frost risk',
    confidence: 81,
    timestamp: '6 hours ago',
    location: 'Field B3',
    isRead: true,
  },
];

export function AlertsNotifications() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'high' | 'medium' | 'normal'>('all');
  const [alertsList, setAlertsList] = useState(alerts);

  const filteredAlerts = alertsList.filter((alert) =>
    selectedFilter === 'all' ? true : alert.type === selectedFilter
  );

  const unreadCount = alertsList.filter((a) => !a.isRead).length;
  const highCount = alertsList.filter((a) => a.type === 'high').length;
  const mediumCount = alertsList.filter((a) => a.type === 'medium').length;
  const normalCount = alertsList.filter((a) => a.type === 'normal').length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'temperature':
        return <Thermometer className="w-5 h-5" />;
      case 'moisture':
        return <Droplets className="w-5 h-5" />;
      case 'disease':
        return <AlertCircle className="w-5 h-5" />;
      case 'pest':
        return <Bug className="w-5 h-5" />;
      case 'weather':
        return <CloudRain className="w-5 h-5" />;
      case 'battery':
        return <Battery className="w-5 h-5" />;
      case 'system':
        return <Wifi className="w-5 h-5" />;
      case 'growth':
        return <Sprout className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'high':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          textColor: 'text-red-800',
          icon: <AlertTriangle className="w-6 h-6" />,
          label: 'High Priority',
          badgeBg: 'bg-red-500',
        };
      case 'medium':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          textColor: 'text-yellow-800',
          icon: <AlertCircle className="w-6 h-6" />,
          label: 'Medium Priority',
          badgeBg: 'bg-yellow-500',
        };
      case 'normal':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          textColor: 'text-green-800',
          icon: <CheckCircle className="w-6 h-6" />,
          label: 'Normal',
          badgeBg: 'bg-green-500',
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          textColor: 'text-gray-800',
          icon: <Bell className="w-6 h-6" />,
          label: 'Info',
          badgeBg: 'bg-gray-500',
        };
    }
  };

  const markAsRead = (id: string) => {
    setAlertsList((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, isRead: true } : alert))
    );
  };

  const deleteAlert = (id: string) => {
    setAlertsList((prev) => prev.filter((alert) => alert.id !== id));
  };

  const markAllAsRead = () => {
    setAlertsList((prev) => prev.map((alert) => ({ ...alert, isRead: true })));
  };

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <header className="bg-white border-b border-green-100 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-green-800">Alerts & Notifications</h1>
              <p className="text-green-600">Monitor your farm alerts in real-time</p>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  variant="outline"
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Mark all as read
                </Button>
              )}
              <div className="flex items-center gap-2 px-3 py-2 bg-green-600 rounded-lg">
                <Bell className="w-4 h-4 text-white" />
                <span className="text-white">{unreadCount} New</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
        {/* Filter Buttons */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-green-600" />
              <span className="text-green-800">Filter by Priority</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setSelectedFilter('all')}
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                className={
                  selectedFilter === 'all'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'border-green-200 text-green-700 hover:bg-green-50'
                }
              >
                All Alerts ({alertsList.length})
              </Button>
              <Button
                onClick={() => setSelectedFilter('high')}
                variant={selectedFilter === 'high' ? 'default' : 'outline'}
                className={
                  selectedFilter === 'high'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'border-red-200 text-red-700 hover:bg-red-50'
                }
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                High ({highCount})
              </Button>
              <Button
                onClick={() => setSelectedFilter('medium')}
                variant={selectedFilter === 'medium' ? 'default' : 'outline'}
                className={
                  selectedFilter === 'medium'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'border-yellow-200 text-yellow-700 hover:bg-yellow-50'
                }
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Medium ({mediumCount})
              </Button>
              <Button
                onClick={() => setSelectedFilter('normal')}
                variant={selectedFilter === 'normal' ? 'default' : 'outline'}
                className={
                  selectedFilter === 'normal'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'border-green-200 text-green-700 hover:bg-green-50'
                }
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Normal ({normalCount})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-green-800 mb-2">No alerts found</h3>
                <p className="text-green-600">All systems are running normally</p>
              </CardContent>
            </Card>
          ) : (
            filteredAlerts.map((alert) => {
              const config = getTypeConfig(alert.type);
              return (
                <Card
                  key={alert.id}
                  className={`border-l-4 ${config.borderColor} ${!alert.isRead ? 'shadow-lg' : ''}`}
                >
                  <CardContent className={`p-5 ${config.bgColor}`}>
                    <div className="flex items-start gap-4">
                      {/* Priority Icon */}
                      <div className={`${config.iconBg} w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${config.iconColor}`}>
                        {config.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${config.badgeBg} hover:${config.badgeBg}`}>
                              {config.label}
                            </Badge>
                            {!alert.isRead && (
                              <Badge className="bg-blue-500 hover:bg-blue-600">New</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!alert.isRead && (
                              <Button
                                onClick={() => markAsRead(alert.id)}
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 hover:bg-white/50"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              onClick={() => deleteAlert(alert.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 hover:bg-white/50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <p className={`${config.textColor} mb-3`}>{alert.message}</p>

                        <div className="flex items-center gap-4 flex-wrap">
                          {/* Category */}
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <span className={config.iconColor}>{getCategoryIcon(alert.category)}</span>
                            <span className="capitalize">{alert.category}</span>
                          </div>

                          {/* Confidence */}
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-white rounded-full overflow-hidden">
                              <div
                                className={`h-full ${config.badgeBg}`}
                                style={{ width: `${alert.confidence}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-700">{alert.confidence}%</span>
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Wind className="w-4 h-4" />
                            <span>{alert.location}</span>
                          </div>

                          {/* Timestamp */}
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{alert.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Summary Card */}
        {filteredAlerts.length > 0 && (
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-green-600 mb-1">Total Alerts</p>
                  <p className="text-green-800">
                    Showing {filteredAlerts.length} of {alertsList.length} alerts
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center px-4 py-2 bg-red-50 rounded-lg">
                    <p className="text-red-600 text-sm">High</p>
                    <p className="text-red-800">{highCount}</p>
                  </div>
                  <div className="text-center px-4 py-2 bg-yellow-50 rounded-lg">
                    <p className="text-yellow-600 text-sm">Medium</p>
                    <p className="text-yellow-800">{mediumCount}</p>
                  </div>
                  <div className="text-center px-4 py-2 bg-green-50 rounded-lg">
                    <p className="text-green-600 text-sm">Normal</p>
                    <p className="text-green-800">{normalCount}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
