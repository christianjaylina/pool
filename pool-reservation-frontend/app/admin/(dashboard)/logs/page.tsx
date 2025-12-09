'use client';

import { useState, useEffect } from 'react';
import { FileText, Filter, Download, User, Calendar, Settings, UserCheck, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardHeader, Table, Badge, Button, Select } from '@/components/ui';
import { logsApi } from '@/lib/api';

// Format timestamp in Philippines timezone
const formatPHTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

interface LogEntry {
  log_id: number;
  action: string;
  created_at: string;
  fName: string;
  lName: string;
}

const LOGS_PER_PAGE = 10;

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

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

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
  const startIndex = (currentPage - 1) * LOGS_PER_PAGE;
  const endIndex = startIndex + LOGS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter]);

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
      <div className="flex flex-wrap gap-4 items-center justify-between">
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
        <p className="text-sm text-gray-500">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} logs
        </p>
      </div>

      {/* Logs List */}
      <Card padding="none">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No logs found
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedLogs.map((log) => {
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
                        {formatPHTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage = page === 1 || 
                               page === totalPages || 
                               Math.abs(page - currentPage) <= 1;
              
              if (!showPage) {
                // Show ellipsis for gaps
                if (page === 2 && currentPage > 3) {
                  return <span key={page} className="px-2 text-gray-400">...</span>;
                }
                if (page === totalPages - 1 && currentPage < totalPages - 2) {
                  return <span key={page} className="px-2 text-gray-400">...</span>;
                }
                return null;
              }
              
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
