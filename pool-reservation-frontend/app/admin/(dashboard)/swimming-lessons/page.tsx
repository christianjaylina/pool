'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Plus, Trash2, Users, Clock, User, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, Calendar, Button, Modal, Input, Select } from '@/components/ui';
import { swimmingLessonsApi, poolApi } from '@/lib/api';

interface SwimmingLesson {
  lesson_id: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  participants: number;
  instructor_name: string | null;
  notes: string | null;
  created_at: string;
  created_by_fName?: string;
  created_by_lName?: string;
}

interface DeleteConfirmation {
  isOpen: boolean;
  lesson: SwimmingLesson | null;
}

interface BlockedSlot {
  blocked_id: number;
  blocked_start_time: string;
  blocked_end_time: string;
  reason: string;
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

// Helper to format time to AM/PM
const formatTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${minutes || '00'} ${period}`;
};

// Helper to format date - handles both "YYYY-MM-DD" and full datetime strings
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Invalid date';
  try {
    const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.substring(0, 10);
    const date = new Date(dateOnly + 'T00:00:00');
    if (isNaN(date.getTime())) return 'Invalid date';
    return format(date, 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
};

// Helper to extract date string for comparison - converts UTC to Philippines time (UTC+8)
const extractDateStr = (dateStr: string) => {
  if (!dateStr) return '';
  
  // Handle MySQL DATE format which comes as "2025-12-02T16:00:00.000Z" (UTC)
  // This actually represents Dec 3rd in Philippines (UTC+8)
  if (typeof dateStr === 'string' && dateStr.includes('T') && dateStr.includes('Z')) {
    const date = new Date(dateStr);
    // Add 8 hours for Philippines timezone
    const philippinesTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    const year = philippinesTime.getUTCFullYear();
    const month = (philippinesTime.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = philippinesTime.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // If it's an ISO string without Z, just extract the date
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  
  // Otherwise take first 10 chars (YYYY-MM-DD)
  if (typeof dateStr === 'string') {
    return dateStr.substring(0, 10);
  }
  
  return '';
};

// Check if lesson is past (comparing date and time)
const isLessonPast = (lessonDate: string, endTime: string) => {
  try {
    // Get current date and time
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Extract the date from lesson
    const lessonDateStr = extractDateStr(lessonDate);
    
    // Extract the end time (handle various formats like "14:00:00" or "14:00")
    let endTimeStr = endTime;
    if (endTime && endTime.length > 5) {
      endTimeStr = endTime.substring(0, 5);
    }
    
    // Compare: if lesson date is before today, it's past
    if (lessonDateStr < todayStr) {
      return true;
    }
    
    // If lesson date is today, compare times
    if (lessonDateStr === todayStr) {
      return endTimeStr <= currentTimeStr;
    }
    
    // Lesson is in the future
    return false;
  } catch (e) {
    console.error('Error in isLessonPast:', e);
    return false;
  }
};

// Extract time (HH:MM) from datetime string - converts UTC to Philippines time (UTC+8)
const extractTime = (datetime: string): string => {
  if (datetime.includes('T') && datetime.includes('Z')) {
    const date = new Date(datetime);
    const philippinesTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return `${philippinesTime.getUTCHours().toString().padStart(2, '0')}:${philippinesTime.getUTCMinutes().toString().padStart(2, '0')}`;
  } else if (datetime.includes('T')) {
    const timePart = datetime.split('T')[1];
    return timePart.substring(0, 5);
  } else if (datetime.includes(' ')) {
    const timePart = datetime.split(' ')[1];
    return timePart.substring(0, 5);
  }
  const date = new Date(datetime);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// Extract date (YYYY-MM-DD) from datetime string - converts UTC to Philippines time (UTC+8)
const extractDate = (datetime: string): string => {
  if (datetime.includes('T') && datetime.includes('Z')) {
    const date = new Date(datetime);
    const philippinesTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    const year = philippinesTime.getUTCFullYear();
    const month = (philippinesTime.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = philippinesTime.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else if (datetime.includes('T')) {
    return datetime.split('T')[0];
  } else if (datetime.includes(' ')) {
    return datetime.split(' ')[0];
  }
  return format(new Date(datetime), 'yyyy-MM-dd');
};

// Check if a time slot is at least 30 minutes ahead of current time for a given date
const isTimeSlotAvailable = (date: Date, time: string): boolean => {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  // Create datetime for the slot
  const slotDateTime = new Date(date);
  slotDateTime.setHours(hours, minutes, 0, 0);
  
  // Add 30 minutes buffer to current time
  const minAvailableTime = new Date(now.getTime() + 30 * 60 * 1000);
  
  return slotDateTime >= minAvailableTime;
};

export default function SwimmingLessonsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [lessons, setLessons] = useState<SwimmingLesson[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  // Create lesson modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    startTime: '',
    endTime: '',
    participants: '',
    instructorName: '',
    notes: ''
  });
  const [createError, setCreateError] = useState('');

  // Delete confirmation modal
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    lesson: null,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const [lessonsResponse, blockedResponse] = await Promise.all([
        swimmingLessonsApi.getAll(),
        poolApi.getBlockedSlots()
      ]);
      console.log('Fetched lessons:', lessonsResponse.data);
      setLessons(lessonsResponse.data);
      setBlockedSlots(blockedResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh only lessons without full page loading
  const refreshLessons = async () => {
    try {
      setRefreshing(true);
      const lessonsResponse = await swimmingLessonsApi.getAll();
      console.log('Refreshed lessons:', lessonsResponse.data);
      setLessons(lessonsResponse.data);
    } catch (error) {
      console.error('Error refreshing lessons:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  // Get lessons for selected date
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const lessonsForDate = lessons.filter(l => extractDateStr(l.lesson_date) === dateStr);

  // Get blocked slots for selected date
  const blockedForDate = blockedSlots.filter(s => extractDate(s.blocked_start_time) === dateStr);

  // Check if a time slot is blocked
  const isTimeBlocked = (time: string): boolean => {
    return blockedForDate.some(block => {
      const blockStart = extractTime(block.blocked_start_time);
      const blockEnd = extractTime(block.blocked_end_time);
      return time >= blockStart && time < blockEnd;
    });
  };

  // Check if a time range overlaps with any blocked slot
  const isTimeRangeBlocked = (startTime: string, endTime: string): boolean => {
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    
    // Check each hour in the range
    for (let hour = startHour; hour < endHour; hour++) {
      const checkTime = `${hour.toString().padStart(2, '0')}:00`;
      if (isTimeBlocked(checkTime)) {
        return true;
      }
    }
    return false;
  };

  // Get upcoming lessons (filter out past)
  const upcomingLessons = lessons.filter(l => {
    const isPast = isLessonPast(l.lesson_date, l.end_time);
    console.log('Lesson check:', { 
      lesson_date: l.lesson_date, 
      end_time: l.end_time, 
      isPast 
    });
    return !isPast;
  });

  // Get available time slots based on selected date (30 min ahead rule and not blocked)
  const getAvailableTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      const value = `${hour.toString().padStart(2, '0')}:00`;
      // Check if slot is available (30 min ahead) and not blocked
      if (isTimeSlotAvailable(selectedDate, value) && !isTimeBlocked(value)) {
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        const period = hour >= 12 ? 'PM' : 'AM';
        const label = `${displayHour}:00 ${period}`;
        slots.push({ value, label });
      }
    }
    return slots;
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    setCreateError('');
    const availableSlots = getAvailableTimeSlots();
    const defaultStart = availableSlots.length > 0 ? availableSlots[0].value : '';
    const startHour = defaultStart ? parseInt(defaultStart.split(':')[0]) : 0;
    const defaultEnd = startHour && startHour + 1 <= 22 ? `${(startHour + 1).toString().padStart(2, '0')}:00` : '';
    setCreateForm({
      startTime: defaultStart,
      endTime: defaultEnd,
      participants: '',
      instructorName: '',
      notes: ''
    });
  };

  const handleCreateLesson = async () => {
    const participantsNum = parseInt(createForm.participants) || 0;
    
    if (!createForm.startTime || !createForm.endTime || !createForm.participants) {
      setCreateError('Please fill in all required fields.');
      return;
    }
    
    if (participantsNum < 1) {
      setCreateError('Number of participants must be at least 1.');
      return;
    }

    // Validate 30 minutes ahead rule
    if (!isTimeSlotAvailable(selectedDate, createForm.startTime)) {
      setCreateError('Start time must be at least 30 minutes from now.');
      return;
    }

    // Validate no blocked slots in the time range
    if (isTimeRangeBlocked(createForm.startTime, createForm.endTime)) {
      setCreateError('Cannot schedule a lesson during blocked time slots.');
      return;
    }
    
    setCreateLoading(true);
    setCreateError('');
    try {
      await swimmingLessonsApi.create({
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        participants: participantsNum,
        instructorName: createForm.instructorName || undefined,
        notes: createForm.notes || undefined
      });
      setShowCreateModal(false);
      await fetchLessons();
    } catch (error: any) {
      setCreateError(error.response?.data?.message || 'Failed to create swimming lesson.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!deleteConfirmation.lesson) return;
    
    try {
      setActionLoading(deleteConfirmation.lesson.lesson_id);
      await swimmingLessonsApi.delete(deleteConfirmation.lesson.lesson_id);
      await fetchLessons();
      setDeleteConfirmation({ isOpen: false, lesson: null });
    } catch (error: any) {
      console.error('Error deleting lesson:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const openDeleteConfirmation = (lesson: SwimmingLesson) => {
    setDeleteConfirmation({ isOpen: true, lesson });
  };

  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({ isOpen: false, lesson: null });
  };

  // Get end time slots (must be after start time and not blocked in between)
  const getEndTimeSlots = () => {
    if (!createForm.startTime) return [];
    const startHour = parseInt(createForm.startTime.split(':')[0]);
    const slots = [];
    for (let hour = startHour + 1; hour <= 22; hour++) {
      const value = `${hour.toString().padStart(2, '0')}:00`;
      // Check if any time between start and this end is blocked
      let hasBlockedSlot = false;
      for (let h = startHour; h < hour; h++) {
        const checkTime = `${h.toString().padStart(2, '0')}:00`;
        if (isTimeBlocked(checkTime)) {
          hasBlockedSlot = true;
          break;
        }
      }
      if (hasBlockedSlot) break; // Stop adding slots after a blocked one
      
      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      const period = hour >= 12 ? 'PM' : 'AM';
      const label = `${displayHour}:00 ${period}`;
      slots.push({ value, label });
    }
    return slots;
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
          <h1 className="text-2xl font-bold text-gray-900">Swimming Lessons</h1>
          <p className="text-gray-500 mt-1">Manage swimming lesson schedules and participants</p>
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

          {/* Info Card */}
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900 text-sm">Priority Booking</h3>
                <p className="text-xs text-blue-700 mt-1">
                  Lesson participants reduce pool capacity for regular guests during scheduled times.
                </p>
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
              subtitle="Swimming lessons for this date"
              action={
                <Button size="sm" onClick={handleOpenCreateModal}>
                  <Plus className="h-4 w-4" />
                  Add Lesson
                </Button>
              }
            />

            {/* Time Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2 mb-6">
              {timeSlots.map((time) => {
                const hasLesson = lessonsForDate.some(l => {
                  const startTime = l.start_time.substring(0, 5);
                  const endTime = l.end_time.substring(0, 5);
                  return time >= startTime && time < endTime;
                });
                const isBlocked = isTimeBlocked(time);
                
                let bgClass = 'bg-success-50 text-success-600 border border-success-200';
                let statusText = 'Open';
                
                if (isBlocked) {
                  bgClass = 'bg-danger-50 text-danger-600 border border-danger-200';
                  statusText = 'Blocked';
                } else if (hasLesson) {
                  bgClass = 'bg-blue-50 text-blue-600 border border-blue-200';
                  statusText = 'Lesson';
                }
                
                return (
                  <div
                    key={time}
                    className={`p-2 rounded-lg text-center text-sm font-medium ${bgClass}`}
                  >
                    {formatTimeAMPM(time)}
                    <div className="text-xs mt-0.5">
                      {statusText}
                    </div>
                  </div>
                );
              })}
            </div>

          </Card>

          {/* All Upcoming Lessons */}
          <Card>
            <CardHeader
              title="All Upcoming Lessons"
              subtitle={`${upcomingLessons.length} upcoming lesson(s)`}
              action={
                <Button variant="outline" size="sm" onClick={refreshLessons} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              }
            />
            {upcomingLessons.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No upcoming swimming lessons</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingLessons.map((lesson) => (
                  <div
                    key={lesson.lesson_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatDate(lesson.lesson_date)} • {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {lesson.participants} participant(s)
                          {lesson.instructor_name && ` • Instructor: ${lesson.instructor_name}`}
                          {lesson.notes && ` • ${lesson.notes}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteConfirmation(lesson)}
                      loading={actionLoading === lesson.lesson_id}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmation.isOpen}
        onClose={closeDeleteConfirmation}
        title="Delete Swimming Lesson"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-danger-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-danger-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-danger-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Are you sure you want to delete this lesson?</p>
              <p className="text-sm text-gray-600 mt-1">
                This will free up pool capacity for regular guests during this time slot.
              </p>
            </div>
          </div>

          {deleteConfirmation.lesson && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">
                    {formatDate(deleteConfirmation.lesson.lesson_date)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatTime(deleteConfirmation.lesson.start_time)} - {formatTime(deleteConfirmation.lesson.end_time)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {deleteConfirmation.lesson.participants} participant(s)
                    {deleteConfirmation.lesson.instructor_name && ` • ${deleteConfirmation.lesson.instructor_name}`}
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
              disabled={actionLoading !== null}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              className="flex-1"
              onClick={handleDeleteLesson}
              disabled={actionLoading !== null}
            >
              {actionLoading !== null ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Lesson
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Lesson Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Swimming Lesson"
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Adding lesson for: <strong>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Note: Only time slots at least 30 minutes ahead can be scheduled
            </p>
          </div>

          {createError && (
            <div className="bg-danger-50 text-danger-700 p-3 rounded-lg text-sm">
              {createError}
            </div>
          )}

          {getAvailableTimeSlots().length === 0 ? (
            <div className="p-4 bg-warning-50 rounded-lg text-center">
              <p className="text-warning-700 font-medium">No time slots available</p>
              <p className="text-sm text-warning-600 mt-1">
                All remaining time slots for this date are less than 30 minutes away. Please select a future date.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="start_time"
                  label="Start Time"
                  options={getAvailableTimeSlots().slice(0, -1)}
                  value={createForm.startTime}
                  onChange={(e) => {
                    const startHour = parseInt(e.target.value.split(':')[0]);
                    const endHour = startHour + 1;
                    setCreateForm(prev => ({
                      ...prev,
                      startTime: e.target.value,
                      endTime: endHour <= 22 ? `${endHour.toString().padStart(2, '0')}:00` : prev.endTime
                    }));
                  }}
                />
                <Select
                  id="end_time"
                  label="End Time"
                  options={getEndTimeSlots()}
                  value={createForm.endTime}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>

              <Input
                id="participants"
                label="Number of Participants"
                type="number"
                value={createForm.participants}
                onChange={(e) => setCreateForm(prev => ({ ...prev, participants: e.target.value }))}
                min="1"
                max="100"
                placeholder="Enter number of participants"
              />

              <Input
                id="instructor_name"
                label="Instructor Name (Optional)"
                placeholder="e.g., Coach John"
                value={createForm.instructorName}
                onChange={(e) => setCreateForm(prev => ({ ...prev, instructorName: e.target.value }))}
              />

              <Input
                id="notes"
                label="Notes (Optional)"
                placeholder="e.g., Kids beginner class, Adult advanced..."
                value={createForm.notes}
                onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCreateModal(false)}
              disabled={createLoading}
            >
              Cancel
            </Button>
            {getAvailableTimeSlots().length > 0 && (
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleCreateLesson}
                loading={createLoading}
              >
                Add Lesson
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
