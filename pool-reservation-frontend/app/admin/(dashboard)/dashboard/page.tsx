'use client';

import { useState, useEffect } from 'react';
import { CalendarCheck, Users, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardHeader, StatCard, Badge, Table, Button } from '@/components/ui';
import { format, isPast } from 'date-fns';
import { reservationsApi, usersApi } from '@/lib/api';

interface Reservation {
  reservation_id: number;
  fName: string;
  lName: string;
  email: string;
  start_time: string;
  end_time: string;
  status: string;
}

export default function AdminDashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reservationsRes, usersRes] = await Promise.all([
        reservationsApi.getAll(),
        usersApi.getAll()
      ]);
      setReservations(reservationsRes.data);
      setUserCount(usersRes.data.length);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper function to get date in Philippines timezone (UTC+8)
  const getPhilippinesDate = (dateTimeStr: string): Date => {
    const date = new Date(dateTimeStr);
    return new Date(date.getTime() + (8 * 60 * 60 * 1000));
  };

  // Check if a reservation is in the past (using Philippines time)
  const isReservationPast = (endTime: string) => {
    const now = new Date();
    const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const phEndTime = getPhilippinesDate(endTime);
    return phEndTime < phNow;
  };

  // Only count pending reservations that are not expired
  const pendingCount = reservations.filter(r => r.status === 'pending' && !isReservationPast(r.end_time)).length;
  const approvedCount = reservations.filter(r => r.status === 'approved').length;
  const totalCount = reservations.length;

  // Recent reservations (last 5)
  const recentReservations = [...reservations]
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .slice(0, 5);

  // Today's approved reservations (in Philippines time)
  const phNow = new Date(new Date().getTime() + (8 * 60 * 60 * 1000));
  const today = format(phNow, 'yyyy-MM-dd');
  const todaysReservations = reservations.filter(r => {
    const phDate = getPhilippinesDate(r.start_time);
    const resDate = format(phDate, 'yyyy-MM-dd');
    return resDate === today && r.status === 'approved';
  });

  const stats = [
    { title: 'Total Reservations', value: totalCount, icon: CalendarCheck, color: 'primary' as const },
    { title: 'Active Users', value: userCount, icon: Users, color: 'success' as const },
    { title: 'Pending Requests', value: pendingCount, icon: Clock, color: 'warning' as const },
    { title: 'Approved', value: approvedCount, icon: TrendingUp, color: 'primary' as const },
  ];

  const getStatusBadge = (status: string, endTime: string) => {
    const past = isReservationPast(endTime);
    
    if (past && status === 'approved') {
      return <Badge variant="default">Completed</Badge>;
    }
    if (past && status === 'pending') {
      return <Badge variant="default">Expired</Badge>;
    }
    
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      approved: 'success',
      pending: 'warning',
      rejected: 'danger',
      cancelled: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const formatTime = (dateTimeStr: string) => {
    const phTime = getPhilippinesDate(dateTimeStr);
    const hours = phTime.getUTCHours();
    const minutes = phTime.getUTCMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDate = (dateTimeStr: string) => {
    const phDate = getPhilippinesDate(dateTimeStr);
    return format(phDate, 'MMM d, yyyy');
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
            {recentReservations.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No reservations yet</p>
            ) : (
              <Table
                columns={[
                  { 
                    key: 'user', 
                    header: 'User', 
                    render: (r) => {
                      const past = isReservationPast(r.end_time);
                      return (
                        <span className={past ? 'line-through text-gray-400' : ''}>
                          {r.fName} {r.lName}
                        </span>
                      );
                    }
                  },
                  { 
                    key: 'date', 
                    header: 'Date', 
                    render: (r) => {
                      const past = isReservationPast(r.end_time);
                      return (
                        <span className={past ? 'line-through text-gray-400' : ''}>
                          {formatDate(r.start_time)}
                        </span>
                      );
                    }
                  },
                  { 
                    key: 'time', 
                    header: 'Time', 
                    render: (r) => {
                      const past = isReservationPast(r.end_time);
                      return (
                        <span className={past ? 'line-through text-gray-400' : ''}>
                          {formatTime(r.start_time)} - {formatTime(r.end_time)}
                        </span>
                      );
                    }
                  },
                  { key: 'status', header: 'Status', render: (r) => getStatusBadge(r.status, r.end_time) },
                ]}
                data={recentReservations}
                keyExtractor={(r) => r.reservation_id}
              />
            )}
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
                  <p className="text-sm text-gray-500">{pendingCount} reservations await review</p>
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
                  <p className="text-sm text-gray-500">{userCount} registered users</p>
                </div>
              </a>
            </div>
          </Card>

          {/* Today's Schedule */}
          <Card>
            <CardHeader title="Today's Schedule" subtitle={format(new Date(), 'EEEE, MMMM d')} />
            {todaysReservations.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No reservations for today</p>
            ) : (
              <div className="space-y-2">
                {todaysReservations.map((slot) => {
                  const past = isReservationPast(slot.end_time);
                  return (
                    <div key={slot.reservation_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className={`font-medium ${past ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </p>
                        <p className={`text-sm ${past ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                          {slot.fName} {slot.lName}
                        </p>
                      </div>
                      {past ? (
                        <Badge variant="default">Completed</Badge>
                      ) : (
                        <Badge variant="success">Approved</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
