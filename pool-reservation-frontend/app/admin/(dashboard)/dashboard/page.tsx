'use client';

import { CalendarCheck, Users, Clock, TrendingUp } from 'lucide-react';
import { Card, CardHeader, StatCard, Badge, Table } from '@/components/ui';
import { format } from 'date-fns';

// Mock data
const stats = [
  { title: 'Total Reservations', value: 156, icon: CalendarCheck, color: 'primary' as const, change: { value: 12, isPositive: true } },
  { title: 'Active Users', value: 42, icon: Users, color: 'success' as const, change: { value: 5, isPositive: true } },
  { title: 'Pending Requests', value: 8, icon: Clock, color: 'warning' as const },
  { title: 'This Week', value: 24, icon: TrendingUp, color: 'primary' as const, change: { value: 8, isPositive: true } },
];

const recentReservations = [
  { id: 1, user: 'John Doe', date: '2025-11-29', time: '10:00 - 12:00', status: 'pending', guests: 2 },
  { id: 2, user: 'Jane Smith', date: '2025-11-29', time: '14:00 - 16:00', status: 'approved', guests: 3 },
  { id: 3, user: 'Bob Wilson', date: '2025-11-30', time: '09:00 - 11:00', status: 'pending', guests: 1 },
  { id: 4, user: 'Alice Brown', date: '2025-11-30', time: '15:00 - 17:00', status: 'approved', guests: 4 },
  { id: 5, user: 'Charlie Davis', date: '2025-12-01', time: '11:00 - 13:00', status: 'rejected', guests: 2 },
];

export default function AdminDashboardPage() {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger'> = {
      approved: 'success',
      pending: 'warning',
      rejected: 'danger',
    };
    return <Badge variant={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Reservations */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Recent Reservations"
              subtitle="Latest booking requests"
              action={
                <a href="/admin/reservations" className="text-sm text-primary-600 hover:text-primary-700">
                  View all →
                </a>
              }
            />
            <Table
              columns={[
                { key: 'user', header: 'User' },
                { key: 'date', header: 'Date' },
                { key: 'time', header: 'Time' },
                { key: 'guests', header: 'Guests' },
                { key: 'status', header: 'Status', render: (r) => getStatusBadge(r.status) },
              ]}
              data={recentReservations}
              keyExtractor={(r) => r.id}
            />
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Quick Actions" />
            <div className="space-y-3">
              <a
                href="/admin/reservations"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-warning-50 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Pending Requests</p>
                  <p className="text-sm text-gray-500">8 reservations await review</p>
                </div>
              </a>
              <a
                href="/admin/schedules"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Manage Schedule</p>
                  <p className="text-sm text-gray-500">Block or free time slots</p>
                </div>
              </a>
              <a
                href="/admin/users"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-success-50 flex items-center justify-center">
                  <Users className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Manage Users</p>
                  <p className="text-sm text-gray-500">Activate/deactivate accounts</p>
                </div>
              </a>
            </div>
          </Card>

          {/* Today's Schedule */}
          <Card>
            <CardHeader title="Today's Schedule" subtitle={format(new Date(), 'EEEE, MMMM d')} />
            <div className="space-y-2">
              {[
                { time: '10:00 - 12:00', user: 'John Doe', guests: 2 },
                { time: '14:00 - 16:00', user: 'Jane Smith', guests: 3 },
                { time: '17:00 - 19:00', user: 'Bob Wilson', guests: 1 },
              ].map((slot, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{slot.time}</p>
                    <p className="text-sm text-gray-500">{slot.user}</p>
                  </div>
                  <Badge variant="info">{slot.guests} guests</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
