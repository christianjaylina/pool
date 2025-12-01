'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Filter, Download, User, Calendar, Settings, UserCheck, RefreshCw } from 'lucide-react';
import { Card, CardHeader, Table, Badge, Button, Select } from '@/components/ui';
import { logsApi } from '@/lib/api';

interface LogEntry {
  log_id: number;
  action: string;
  created_at: string;
  fName: string;
  lName: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await logsApi.getAll();
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Determine log type based on action description
  const getLogType = (action: string | undefined | null): string => {
    if (!action) return 'other';
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('reservation') || lowerAction.includes('approved') || lowerAction.includes('rejected')) {
      return 'reservation';
    }
    if (lowerAction.includes('user') || lowerAction.includes('renter') || lowerAction.includes('activated') || lowerAction.includes('deactivated')) {
      return 'user';
    }
    if (lowerAction.includes('block') || lowerAction.includes('schedule') || lowerAction.includes('setting')) {
      return 'schedule';
    }
    return 'other';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reservation':
        return <Calendar className="h-4 w-4" />;
      case 'user':
        return <UserCheck className="h-4 w-4" />;
      case 'schedule':
        return <Settings className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
      reservation: 'info',
      user: 'success',
      schedule: 'warning',
      other: 'default',
    };
    return (
      <Badge variant={variants[type] || 'default'} className="flex items-center gap-1">
        {getTypeIcon(type)}
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const filteredLogs = typeFilter === 'all'
    ? logs
    : logs.filter(l => getLogType(l.action) === typeFilter);

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'reservation', label: 'Reservations' },
    { value: 'user', label: 'Users' },
    { value: 'schedule', label: 'Schedules' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Logs</h1>
          <p className="text-gray-500 mt-1">Track all administrative actions</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
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
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No logs found
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLogs.map((log) => {
              const logType = getLogType(log.action);
              return (
                <div key={log.log_id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {getTypeIcon(logType)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{log.action || 'No description'}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          By: <span className="text-gray-700">{log.fName} {log.lName}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2 sm:flex-shrink-0">
                      {getTypeBadge(logType)}
                      <p className="text-xs text-gray-400">
                        {format(new Date(log.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Summary Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {typeOptions.slice(1).map((type) => {
          const count = logs.filter(l => getLogType(l.action) === type.value).length;
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
