'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Filter, Download, User, Calendar, Settings, UserCheck } from 'lucide-react';
import { Card, CardHeader, Table, Badge, Button, Select } from '@/components/ui';

interface LogEntry {
  id: number;
  action: string;
  type: 'reservation' | 'user' | 'schedule' | 'auth';
  admin: string;
  target: string;
  details: string;
  timestamp: string;
}

const mockLogs: LogEntry[] = [
  { id: 1, action: 'Approved reservation', type: 'reservation', admin: 'Admin User', target: 'John Doe', details: 'Reservation #123 for Nov 29, 2025', timestamp: '2025-11-28T10:30:00' },
  { id: 2, action: 'Rejected reservation', type: 'reservation', admin: 'Admin User', target: 'Jane Smith', details: 'Reservation #124 - Pool maintenance', timestamp: '2025-11-28T09:15:00' },
  { id: 3, action: 'Deactivated user', type: 'user', admin: 'Admin User', target: 'Bob Wilson', details: 'Account deactivated', timestamp: '2025-11-27T16:45:00' },
  { id: 4, action: 'Blocked time slot', type: 'schedule', admin: 'Admin User', target: 'Pool Schedule', details: 'Nov 30, 10:00-14:00 - Maintenance', timestamp: '2025-11-27T14:20:00' },
  { id: 5, action: 'Activated user', type: 'user', admin: 'Admin User', target: 'Charlie Davis', details: 'Account reactivated', timestamp: '2025-11-27T11:00:00' },
  { id: 6, action: 'Approved reservation', type: 'reservation', admin: 'Admin User', target: 'Alice Brown', details: 'Reservation #125 for Dec 1, 2025', timestamp: '2025-11-26T15:30:00' },
  { id: 7, action: 'Admin login', type: 'auth', admin: 'Admin User', target: 'System', details: 'Successful login', timestamp: '2025-11-26T09:00:00' },
  { id: 8, action: 'Unblocked time slot', type: 'schedule', admin: 'Admin User', target: 'Pool Schedule', details: 'Nov 28, 15:00-17:00', timestamp: '2025-11-25T17:00:00' },
];

export default function AdminLogsPage() {
  const [logs] = useState<LogEntry[]>(mockLogs);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reservation':
        return <Calendar className="h-4 w-4" />;
      case 'user':
        return <UserCheck className="h-4 w-4" />;
      case 'schedule':
        return <Settings className="h-4 w-4" />;
      case 'auth':
        return <User className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
      reservation: 'info',
      user: 'success',
      schedule: 'warning',
      auth: 'default',
    };
    return (
      <Badge variant={variants[type]} className="flex items-center gap-1">
        {getTypeIcon(type)}
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const filteredLogs = typeFilter === 'all'
    ? logs
    : logs.filter(l => l.type === typeFilter);

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'reservation', label: 'Reservations' },
    { value: 'user', label: 'Users' },
    { value: 'schedule', label: 'Schedules' },
    { value: 'auth', label: 'Authentication' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Logs</h1>
          <p className="text-gray-500 mt-1">Track all administrative actions</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">Filter by:</span>
        </div>
        <Select
          id="type"
          options={typeOptions}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Logs List */}
      <Card padding="none">
        <div className="divide-y divide-gray-100">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {getTypeIcon(log.type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{log.action}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Target: <span className="text-gray-700">{log.target}</span>
                    </p>
                    <p className="text-sm text-gray-500">{log.details}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-2 sm:flex-shrink-0">
                  {getTypeBadge(log.type)}
                  <p className="text-xs text-gray-400">
                    {format(new Date(log.timestamp), 'MMM d, yyyy • h:mm a')}
                  </p>
                  <p className="text-xs text-gray-500">by {log.admin}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        {typeOptions.slice(1).map((type) => {
          const count = logs.filter(l => l.type === type.value).length;
          return (
            <Card key={type.value} className="text-center" padding="md">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-2">
                {getTypeIcon(type.value)}
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500">{type.label}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
