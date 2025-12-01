'use client';

import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Lock, Unlock, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, Calendar, Button, Modal, Input, Select, Badge } from '@/components/ui';
import { poolApi } from '@/lib/api';

interface BlockedSlot {
  blocked_id: number;
  blocked_start_time: string;
  blocked_end_time: string;
  reason: string;
  admin_user_id: number;
  created_at: string;
}

// Time slots in 24-hour format (for internal use)
const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

// Convert 24-hour time to 12-hour AM/PM format
const formatTimeAMPM = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Extract time (HH:MM) from datetime string
const extractTime = (datetime: string): string => {
  const date = new Date(datetime);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// Extract date (YYYY-MM-DD) from datetime string
const extractDate = (datetime: string): string => {
  return format(new Date(datetime), 'yyyy-MM-dd');
};

// Time slot options with AM/PM labels
const timeSlotOptions = timeSlots.map(t => ({ 
  value: t, 
  label: formatTimeAMPM(t) 
}));

export default function AdminSchedulesPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [newBlock, setNewBlock] = useState({
    start_time: '08:00',
    end_time: '12:00',
    reason: '',
  });

  const fetchBlockedSlots = async () => {
    try {
      setLoading(true);
      const response = await poolApi.getBlockedSlots();
      setBlockedSlots(response.data);
    } catch (error) {
      console.error('Error fetching blocked slots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedSlots();
  }, []);

  // Get blocked slots for selected date
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const blockedForDate = blockedSlots.filter(s => extractDate(s.blocked_start_time) === dateStr);

  const handleAddBlock = async () => {
    try {
      setBlocking(true);
      await poolApi.blockSlot({
        date: dateStr,
        startTime: newBlock.start_time,
        endTime: newBlock.end_time,
        reason: newBlock.reason,
      });
      setShowBlockModal(false);
      setNewBlock({ start_time: '08:00', end_time: '12:00', reason: '' });
      await fetchBlockedSlots();
    } catch (error: any) {
      console.error('Error blocking slot:', error);
      alert(error.response?.data?.message || 'Failed to block time slot');
    } finally {
      setBlocking(false);
    }
  };

  const handleRemoveBlock = async (id: number) => {
    if (!confirm('Are you sure you want to remove this blocked slot?')) return;
    
    try {
      await poolApi.removeBlockedSlot(id);
      await fetchBlockedSlots();
    } catch (error) {
      console.error('Error removing block:', error);
      alert('Failed to remove blocked slot');
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Pool Schedules</h1>
          <p className="text-gray-500 mt-1">Manage pool availability and blocked time slots</p>
        </div>
        <Button onClick={() => setShowBlockModal(true)}>
          <Plus className="h-4 w-4" />
          Block Time Slot
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            minDate={new Date('2024-01-01')}
            disabledDates={[]}
          />
          
          {/* Legend */}
          <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Legend</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary-600" />
                <span className="text-gray-600">Selected Date</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-primary-200" />
                <span className="text-gray-600">Today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selected Date Info */}
          <Card>
            <CardHeader
              title={format(selectedDate, 'EEEE, MMMM d, yyyy')}
              subtitle="Pool schedule for this date"
              action={
                <Button size="sm" onClick={() => setShowBlockModal(true)}>
                  <Lock className="h-4 w-4" />
                  Block Slot
                </Button>
              }
            />

            {/* Time Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2 mb-6">
              {timeSlots.map((time) => {
                const isBlocked = blockedForDate.some(
                  b => time >= extractTime(b.blocked_start_time) && time < extractTime(b.blocked_end_time)
                );
                return (
                  <div
                    key={time}
                    className={`p-2 rounded-lg text-center text-sm font-medium ${
                      isBlocked
                        ? 'bg-danger-50 text-danger-600 border border-danger-200'
                        : 'bg-success-50 text-success-600 border border-success-200'
                    }`}
                  >
                    {formatTimeAMPM(time)}
                    <div className="text-xs mt-0.5">
                      {isBlocked ? 'Blocked' : 'Open'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Blocked Slots for Date */}
            {blockedForDate.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Blocked Time Slots</h4>
                <div className="space-y-2">
                  {blockedForDate.map((slot) => (
                    <div
                      key={slot.blocked_id}
                      className="flex items-center justify-between p-3 bg-danger-50 rounded-lg border border-danger-100"
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-danger-500" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatTimeAMPM(extractTime(slot.blocked_start_time))} - {formatTimeAMPM(extractTime(slot.blocked_end_time))}
                          </p>
                          <p className="text-sm text-gray-600">{slot.reason}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:bg-danger-100"
                        onClick={() => handleRemoveBlock(slot.blocked_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {blockedForDate.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Unlock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No blocked time slots for this date</p>
                <p className="text-sm">All time slots are available for reservations</p>
              </div>
            )}
          </Card>

          {/* All Blocked Slots */}
          <Card>
            <CardHeader
              title="All Blocked Slots"
              subtitle={`${blockedSlots.length} total blocked periods`}
              action={
                <Button variant="outline" size="sm" onClick={fetchBlockedSlots}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              }
            />
            {blockedSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Unlock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No blocked slots</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blockedSlots.map((slot) => (
                  <div
                    key={slot.blocked_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-danger-100 flex items-center justify-center">
                        <Lock className="h-5 w-5 text-danger-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(new Date(slot.blocked_start_time), 'MMM d, yyyy')} • {formatTimeAMPM(extractTime(slot.blocked_start_time))} - {formatTimeAMPM(extractTime(slot.blocked_end_time))}
                        </p>
                        <p className="text-sm text-gray-500">{slot.reason}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBlock(slot.blocked_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Block Time Slot Modal */}
      <Modal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        title="Block Time Slot"
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Blocking for: <strong>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="start_time"
              label="Start Time"
              options={timeSlotOptions}
              value={newBlock.start_time}
              onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })}
            />
            <Select
              id="end_time"
              label="End Time"
              options={timeSlotOptions}
              value={newBlock.end_time}
              onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })}
            />
          </div>

          <Input
            id="reason"
            label="Reason"
            placeholder="e.g., Pool maintenance, Private event..."
            value={newBlock.reason}
            onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
          />

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowBlockModal(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleAddBlock} disabled={!newBlock.reason || blocking}>
              {blocking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Blocking...
                </>
              ) : (
                'Block Time Slot'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
