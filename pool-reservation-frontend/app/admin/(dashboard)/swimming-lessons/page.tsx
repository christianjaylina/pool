'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Plus, Trash2, Users, Clock, User, Calendar } from 'lucide-react';
import { Card, CardHeader, Table, Badge, Button, Modal } from '@/components/ui';
import { swimmingLessonsApi } from '@/lib/api';

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

export default function SwimmingLessonsPage() {
  const [lessons, setLessons] = useState<SwimmingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  // Create lesson modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    participants: 5,
    instructorName: '',
    notes: ''
  });
  const [createError, setCreateError] = useState('');

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<SwimmingLesson | null>(null);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await swimmingLessonsApi.getAll();
      setLessons(response.data);
    } catch (error) {
      console.error('Error fetching swimming lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    setCreateError('');
    setCreateForm({
      date: '',
      startTime: '',
      endTime: '',
      participants: 5,
      instructorName: '',
      notes: ''
    });
  };

  const handleCreateLesson = async () => {
    if (!createForm.date || !createForm.startTime || !createForm.endTime || !createForm.participants) {
      setCreateError('Please fill in all required fields.');
      return;
    }
    
    if (createForm.participants < 1) {
      setCreateError('Number of participants must be at least 1.');
      return;
    }
    
    setCreateLoading(true);
    setCreateError('');
    try {
      await swimmingLessonsApi.create({
        date: createForm.date,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        participants: createForm.participants,
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
    if (!lessonToDelete) return;
    
    try {
      setActionLoading(lessonToDelete.lesson_id);
      await swimmingLessonsApi.delete(lessonToDelete.lesson_id);
      await fetchLessons();
      setShowDeleteModal(false);
      setLessonToDelete(null);
    } catch (error: any) {
      console.error('Error deleting lesson:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Generate time slots (6:00 AM - 10:00 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      const value = `${hour.toString().padStart(2, '0')}:00`;
      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      const period = hour >= 12 ? 'PM' : 'AM';
      const label = `${displayHour}:00 ${period}`;
      slots.push({ value, label });
    }
    return slots;
  };

  // Get today's date for min date
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
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
      // If it's a full datetime string, extract just the date part
      const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.substring(0, 10);
      const date = new Date(dateOnly + 'T00:00:00');
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  // Helper to extract date string for comparison
  const extractDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.substring(0, 10);
  };

  // Check if lesson is past
  const isLessonPast = (lessonDate: string, endTime: string) => {
    try {
      const now = new Date();
      const dateOnly = extractDateStr(lessonDate);
      const lessonEnd = new Date(`${dateOnly}T${endTime}`);
      if (isNaN(lessonEnd.getTime())) return false;
      return lessonEnd < now;
    } catch {
      return false;
    }
  };

  // Calculate totals
  const upcomingLessons = lessons.filter(l => !isLessonPast(l.lesson_date, l.end_time));
  const totalParticipants = upcomingLessons.reduce((sum, l) => sum + l.participants, 0);

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
          <p className="text-gray-500 mt-1">
            {upcomingLessons.length > 0 
              ? `${upcomingLessons.length} upcoming lesson(s) with ${totalParticipants} total participants`
              : 'No upcoming swimming lessons scheduled'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={handleOpenCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lesson
          </Button>
          <Button variant="outline" onClick={fetchLessons}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">Priority Booking</h3>
              <p className="text-sm text-blue-700 mt-1">
                Swimming lesson participants are given priority over regular guest reservations. 
                The pool capacity will be reduced by the number of lesson participants during scheduled lessons.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary-100 rounded-lg p-3">
              <Calendar className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Upcoming Lessons</p>
              <p className="text-2xl font-bold text-gray-900">{upcomingLessons.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-success-100 rounded-lg p-3">
              <Users className="h-6 w-6 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Participants</p>
              <p className="text-2xl font-bold text-gray-900">{totalParticipants}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-warning-100 rounded-lg p-3">
              <Clock className="h-6 w-6 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">All Time Lessons</p>
              <p className="text-2xl font-bold text-gray-900">{lessons.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lessons Table */}
      <Card>
        <CardHeader title="All Swimming Lessons" />
        <Table
          columns={[
            { 
              key: 'date', 
              header: 'Date', 
              sortable: true,
              render: (l) => {
                const past = isLessonPast(l.lesson_date, l.end_time);
                return (
                  <span className={past ? 'text-gray-400' : 'font-medium'}>
                    {formatDate(l.lesson_date)}
                  </span>
                );
              }
            },
            { 
              key: 'time', 
              header: 'Time', 
              render: (l) => {
                const past = isLessonPast(l.lesson_date, l.end_time);
                return (
                  <span className={past ? 'text-gray-400' : ''}>
                    {formatTime(l.start_time)} - {formatTime(l.end_time)}
                  </span>
                );
              }
            },
            { 
              key: 'participants', 
              header: 'Participants', 
              render: (l) => {
                const past = isLessonPast(l.lesson_date, l.end_time);
                return (
                  <div className={`flex items-center gap-1.5 ${past ? 'text-gray-400' : ''}`}>
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{l.participants}</span>
                  </div>
                );
              }
            },
            { 
              key: 'instructor', 
              header: 'Instructor', 
              render: (l) => {
                const past = isLessonPast(l.lesson_date, l.end_time);
                return (
                  <div className={`flex items-center gap-1.5 ${past ? 'text-gray-400' : ''}`}>
                    {l.instructor_name ? (
                      <>
                        <User className="h-4 w-4" />
                        <span>{l.instructor_name}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Not specified</span>
                    )}
                  </div>
                );
              }
            },
            { 
              key: 'notes', 
              header: 'Notes', 
              render: (l) => {
                const past = isLessonPast(l.lesson_date, l.end_time);
                return l.notes ? (
                  <span className={`text-sm ${past ? 'text-gray-400' : 'text-gray-600'}`}>
                    {l.notes.length > 30 ? l.notes.substring(0, 30) + '...' : l.notes}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                );
              }
            },
            { 
              key: 'status', 
              header: 'Status', 
              render: (l) => {
                const past = isLessonPast(l.lesson_date, l.end_time);
                return past 
                  ? <Badge variant="default">Completed</Badge>
                  : <Badge variant="success">Upcoming</Badge>;
              }
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (l) => {
                const past = isLessonPast(l.lesson_date, l.end_time);
                
                if (past) {
                  return <span className="text-gray-400 text-sm">-</span>;
                }
                
                return (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger-600 hover:bg-danger-50"
                    onClick={() => {
                      setLessonToDelete(l);
                      setShowDeleteModal(true);
                    }}
                    loading={actionLoading === l.lesson_id}
                    title="Delete Lesson"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                );
              },
            },
          ]}
          data={lessons}
          keyExtractor={(l) => l.lesson_id}
          emptyMessage="No swimming lessons found. Add a lesson to get started."
        />
      </Card>

      {/* Create Lesson Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Swimming Lesson"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Schedule a swimming lesson. The number of participants will reduce the available pool capacity for regular guests during this time.
          </p>

          {createError && (
            <div className="bg-danger-50 text-danger-700 p-3 rounded-lg text-sm">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date <span className="text-danger-500">*</span>
            </label>
            <input
              type="date"
              value={createForm.date}
              onChange={(e) => setCreateForm(prev => ({ ...prev, date: e.target.value }))}
              min={getTodayDate()}
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Time <span className="text-danger-500">*</span>
              </label>
              <select
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
                className="input-base"
              >
                <option value="">-- Select --</option>
                {generateTimeSlots().slice(0, -1).map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                End Time <span className="text-danger-500">*</span>
              </label>
              <select
                value={createForm.endTime}
                onChange={(e) => setCreateForm(prev => ({ ...prev, endTime: e.target.value }))}
                className="input-base"
              >
                <option value="">-- Select --</option>
                {generateTimeSlots().slice(1).map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Number of Participants <span className="text-danger-500">*</span>
            </label>
            <input
              type="number"
              value={createForm.participants}
              onChange={(e) => setCreateForm(prev => ({ ...prev, participants: parseInt(e.target.value) || 1 }))}
              min="1"
              max="100"
              className="input-base"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will reduce pool capacity for regular guests during the lesson time.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Instructor Name <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={createForm.instructorName}
              onChange={(e) => setCreateForm(prev => ({ ...prev, instructorName: e.target.value }))}
              placeholder="e.g., Coach John"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={createForm.notes}
              onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g., Kids beginner class, Adult advanced..."
              className="input-base resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCreateModal(false)}
              disabled={createLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleCreateLesson}
              loading={createLoading}
            >
              Add Lesson
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setLessonToDelete(null);
        }}
        title="Delete Swimming Lesson"
      >
        <div className="space-y-4">
          {lessonToDelete && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p><strong>Date:</strong> {formatDate(lessonToDelete.lesson_date)}</p>
              <p><strong>Time:</strong> {formatTime(lessonToDelete.start_time)} - {formatTime(lessonToDelete.end_time)}</p>
              <p><strong>Participants:</strong> {lessonToDelete.participants}</p>
              {lessonToDelete.instructor_name && (
                <p><strong>Instructor:</strong> {lessonToDelete.instructor_name}</p>
              )}
            </div>
          )}
          <p className="text-gray-600">
            Are you sure you want to delete this swimming lesson? This will free up pool capacity for regular guests during this time slot.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => {
                setShowDeleteModal(false);
                setLessonToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              className="flex-1" 
              onClick={handleDeleteLesson}
              loading={actionLoading === lessonToDelete?.lesson_id}
            >
              Delete Lesson
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
