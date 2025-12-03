'use client';

import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Lock, Unlock, Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
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

interface DeleteConfirmation {
  isOpen: boolean;
  slot: BlockedSlot | null;
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

// Extract time (HH:MM) from datetime string - converts UTC to Philippines time (UTC+8)
const extractTime = (datetime: string): string => {
  // If it's an ISO format with Z suffix, it's in UTC and needs conversion
  if (datetime.includes('T') && datetime.includes('Z')) {
    // Parse as UTC and convert to Philippines time (UTC+8)
    const date = new Date(datetime);
    // Add 8 hours for Philippines timezone
    const philippinesTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return `${philippinesTime.getUTCHours().toString().padStart(2, '0')}:${philippinesTime.getUTCMinutes().toString().padStart(2, '0')}`;
  } else if (datetime.includes('T')) {
    // ISO format without Z - extract time part directly
    const timePart = datetime.split('T')[1];
    return timePart.substring(0, 5); // Get HH:MM
  } else if (datetime.includes(' ')) {
    // "YYYY-MM-DD HH:MM:SS" format - already in local time
    const timePart = datetime.split(' ')[1];
    return timePart.substring(0, 5); // Get HH:MM
  }
  // Fallback - use local time
  const date = new Date(datetime);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// Extract date (YYYY-MM-DD) from datetime string - converts UTC to Philippines time (UTC+8)
const extractDate = (datetime: string): string => {
  // If it's an ISO format with Z suffix, it's in UTC and needs conversion
  if (datetime.includes('T') && datetime.includes('Z')) {
    // Parse as UTC and convert to Philippines time (UTC+8)
    const date = new Date(datetime);
    // Add 8 hours for Philippines timezone
    const philippinesTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    const year = philippinesTime.getUTCFullYear();
    const month = (philippinesTime.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = philippinesTime.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else if (datetime.includes('T')) {
    return datetime.split('T')[0];
  } else if (datetime.includes(' ')) {
    // "YYYY-MM-DD HH:MM:SS" format
    return datetime.split(' ')[0];
  }
  // Fallback
  return format(new Date(datetime), 'yyyy-MM-dd');
};

// Time slot options with AM/PM labels
const timeSlotOptions = timeSlots.map(t => ({ 
  value: t, 
  label: formatTimeAMPM(t) 
}));

// Check if a time slot is at least 30 minutes ahead of current time for a given date
const isTimeSlotBlockable = (date: Date, time: string): boolean => {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  // Create datetime for the slot
  const slotDateTime = new Date(date);
  slotDateTime.setHours(hours, minutes, 0, 0);
  
  // Add 30 minutes buffer to current time
  const minBlockableTime = new Date(now.getTime() + 30 * 60 * 1000);
  
  return slotDateTime >= minBlockableTime;
};

// Get available time slot options based on selected date (30 min ahead rule)
const getAvailableTimeSlots = (date: Date) => {
  return timeSlotOptions.filter(slot => isTimeSlotBlockable(date, slot.value));
};

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
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    slot: null,
  });
  const [deleting, setDeleting] = useState(false);

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

  // Check if a time slot is already blocked
  const isTimeSlotAlreadyBlocked = (time: string): boolean => {
    return blockedForDate.some(block => {
      const blockStart = extractTime(block.blocked_start_time);
      const blockEnd = extractTime(block.blocked_end_time);
      // Check if the time falls within a blocked range
      return time >= blockStart && time < blockEnd;
    });
  };

  // Get available time slots for selected date (excluding already blocked slots)
  const availableStartSlots = getAvailableTimeSlots(selectedDate).filter(
    slot => !isTimeSlotAlreadyBlocked(slot.value)
  );
  
  const availableEndSlots = timeSlotOptions.filter(slot => {
    // End time must be after start time AND at least 30 min ahead
    if (!(slot.value > newBlock.start_time && isTimeSlotBlockable(selectedDate, slot.value))) {
      return false;
    }
    // Check if any time between start and this end time is already blocked
    const startHour = parseInt(newBlock.start_time.split(':')[0]);
    const endHour = parseInt(slot.value.split(':')[0]);
    for (let h = startHour; h < endHour; h++) {
      const checkTime = `${h.toString().padStart(2, '0')}:00`;
      if (isTimeSlotAlreadyBlocked(checkTime)) {
        return false;
      }
    }
    return true;
  });

  // Reset time selection when date changes or modal opens to ensure valid defaults
  useEffect(() => {
    if (showBlockModal) {
      // Get current blocked slots for date
      const currentDateStr = format(selectedDate, 'yyyy-MM-dd');
      const currentBlockedForDate = blockedSlots.filter(s => extractDate(s.blocked_start_time) === currentDateStr);
      
      // Filter available slots excluding already blocked ones
      const available = getAvailableTimeSlots(selectedDate).filter(slot => {
        return !currentBlockedForDate.some(block => {
          const blockStart = extractTime(block.blocked_start_time);
          const blockEnd = extractTime(block.blocked_end_time);
          return slot.value >= blockStart && slot.value < blockEnd;
        });
      });
      
      if (available.length > 0) {
        const defaultStart = available[0].value;
        // Find valid end options (not blocked between start and end)
        const endOptions = timeSlotOptions.filter(s => {
          if (s.value <= defaultStart) return false;
          const startHour = parseInt(defaultStart.split(':')[0]);
          const endHour = parseInt(s.value.split(':')[0]);
          for (let h = startHour; h < endHour; h++) {
            const checkTime = `${h.toString().padStart(2, '0')}:00`;
            const isBlocked = currentBlockedForDate.some(block => {
              const blockStart = extractTime(block.blocked_start_time);
              const blockEnd = extractTime(block.blocked_end_time);
              return checkTime >= blockStart && checkTime < blockEnd;
            });
            if (isBlocked) return false;
          }
          return true;
        });
        const defaultEnd = endOptions.length > 0 ? endOptions[Math.min(3, endOptions.length - 1)].value : defaultStart;
        setNewBlock({ start_time: defaultStart, end_time: defaultEnd, reason: '' });
      } else {
        // No available slots
        setNewBlock({ start_time: '', end_time: '', reason: '' });
      }
    }
  }, [showBlockModal, selectedDate, blockedSlots]);

  // Check if current selection is valid (30 min ahead)
  const isStartTimeValid = isTimeSlotBlockable(selectedDate, newBlock.start_time);
  const isEndTimeValid = isTimeSlotBlockable(selectedDate, newBlock.end_time) && newBlock.end_time > newBlock.start_time;

  const handleAddBlock = async () => {
    // Validate 30 minutes ahead rule
    if (!isStartTimeValid) {
      alert('Start time must be at least 30 minutes from now');
      return;
    }
    if (!isEndTimeValid) {
      alert('End time must be after start time and at least 30 minutes from now');
      return;
    }

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
    try {
      setDeleting(true);
      await poolApi.removeBlockedSlot(id);
      await fetchBlockedSlots();
      setDeleteConfirmation({ isOpen: false, slot: null });
    } catch (error) {
      console.error('Error removing block:', error);
      alert('Failed to remove blocked slot');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteConfirmation = (slot: BlockedSlot) => {
    setDeleteConfirmation({ isOpen: true, slot });
  };

  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({ isOpen: false, slot: null });
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

          </Card>

          {/* All Blocked Slots */}
          <Card>
            <CardHeader
              title="All Blocked Slots"
              subtitle={`${blockedSlots.filter(slot => {
                const slotDateStr = extractDate(slot.blocked_start_time);
                const today = format(new Date(), 'yyyy-MM-dd');
                return slotDateStr >= today;
              }).length} upcoming blocked periods`}
              action={
                <Button variant="outline" size="sm" onClick={fetchBlockedSlots}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              }
            />
            {blockedSlots.filter(slot => {
              const slotDateStr = extractDate(slot.blocked_start_time);
              const today = format(new Date(), 'yyyy-MM-dd');
              return slotDateStr >= today;
            }).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Unlock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No upcoming blocked slots</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blockedSlots.filter(slot => {
                  const slotDateStr = extractDate(slot.blocked_start_time);
                  const today = format(new Date(), 'yyyy-MM-dd');
                  return slotDateStr >= today;
                }).map((slot) => {
                  // Format date without timezone conversion
                  const dateStr = extractDate(slot.blocked_start_time);
                  const [year, month, day] = dateStr.split('-').map(Number);
                  const displayDate = new Date(year, month - 1, day);
                  
                  return (
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
                          {format(displayDate, 'MMM d, yyyy')} • {formatTimeAMPM(extractTime(slot.blocked_start_time))} - {formatTimeAMPM(extractTime(slot.blocked_end_time))}
                        </p>
                        <p className="text-sm text-gray-500">{slot.reason}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteConfirmation(slot)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmation.isOpen}
        onClose={closeDeleteConfirmation}
        title="Remove Blocked Schedule"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-danger-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-danger-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-danger-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Are you sure you want to remove this blocked schedule?</p>
              <p className="text-sm text-gray-600 mt-1">
                This action cannot be undone. The time slot will become available for reservations again.
              </p>
            </div>
          </div>

          {deleteConfirmation.slot && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-danger-500" />
                <div>
                  <p className="font-medium text-gray-900">
                    {(() => {
                      const dateStr = extractDate(deleteConfirmation.slot.blocked_start_time);
                      const [year, month, day] = dateStr.split('-').map(Number);
                      const displayDate = new Date(year, month - 1, day);
                      return format(displayDate, 'MMMM d, yyyy');
                    })()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatTimeAMPM(extractTime(deleteConfirmation.slot.blocked_start_time))} - {formatTimeAMPM(extractTime(deleteConfirmation.slot.blocked_end_time))}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Reason: {deleteConfirmation.slot.reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={closeDeleteConfirmation}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              className="flex-1"
              onClick={() => deleteConfirmation.slot && handleRemoveBlock(deleteConfirmation.slot.blocked_id)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Schedule
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

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
            <p className="text-xs text-gray-500 mt-1">
              Note: Only time slots at least 30 minutes ahead can be blocked
            </p>
          </div>

          {availableStartSlots.length === 0 ? (
            <div className="p-4 bg-warning-50 rounded-lg text-center">
              <p className="text-warning-700 font-medium">No time slots available to block</p>
              <p className="text-sm text-warning-600 mt-1">
                {blockedForDate.length > 0 
                  ? 'All remaining time slots for this date are either already blocked or less than 30 minutes away. Cancel existing blocks to free up time slots.'
                  : 'All remaining time slots for this date are less than 30 minutes away. Please select a future date.'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="start_time"
                  label="Start Time"
                  options={availableStartSlots}
                  value={availableStartSlots.some(s => s.value === newBlock.start_time) ? newBlock.start_time : availableStartSlots[0]?.value || ''}
                  onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })}
                />
                <Select
                  id="end_time"
                  label="End Time"
                  options={availableEndSlots.length > 0 ? availableEndSlots : timeSlotOptions.filter(s => s.value > newBlock.start_time)}
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
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowBlockModal(false)}>
              Cancel
            </Button>
            {availableStartSlots.length > 0 && (
              <Button 
                className="flex-1" 
                onClick={handleAddBlock} 
                disabled={!newBlock.reason || blocking || !isStartTimeValid}
              >
                {blocking ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Blocking...
                  </>
                ) : (
                  'Block Time Slot'
                )}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
