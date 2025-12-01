'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Users, ArrowRight, Info, RefreshCw, Ban, CalendarCheck } from 'lucide-react';
import { Card, CardHeader, Calendar, TimeSlotPicker, Button, Select, Modal, Input } from '@/components/ui';
import { poolApi, reservationsApi, usersApi } from '@/lib/api';

interface TimeSlot {
  time: string;
  available: boolean;
  isFull?: boolean;
  isBlocked?: boolean;
  blockReason?: string | null;
  availableSpots?: number;
  currentGuests?: number;
  lessonParticipants?: number;
  maxCapacity?: number;
  hasUserReservation?: boolean;
  userReservationStatus?: string | null;
}

interface SlotStatus {
  time: string;
  currentGuests: number;
  lessonParticipants?: number;
  totalOccupancy?: number;
  maxCapacity: number;
  isFull: boolean;
  isBlocked: boolean;
  blockReason?: string | null;
  availableSpots: number;
  hasUserReservation?: boolean;
  userReservationStatus?: string | null;
}

interface PoolSettings {
  max_people_slot_1?: number;
  max_people_slot_2?: number;
  max_people_slot_3?: number;
  max_people_slot_4?: number;
  max_guests?: number;
}

interface UserProfile {
  maxGuests: number | null;
}

// Helper function to convert 24hr time to 12hr AM/PM format
const formatTimeToAMPM = (time24: string): string => {
  if (!time24 || !time24.includes(':')) return '';
  const [hourStr, minuteStr] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minute} ${period}`;
};

// Base time slots (6 AM to 10 PM)
const BASE_TIME_SLOTS = [
  { time: '06:00', available: true },
  { time: '07:00', available: true },
  { time: '08:00', available: true },
  { time: '09:00', available: true },
  { time: '10:00', available: true },
  { time: '11:00', available: true },
  { time: '12:00', available: true },
  { time: '13:00', available: true },
  { time: '14:00', available: true },
  { time: '15:00', available: true },
  { time: '16:00', available: true },
  { time: '17:00', available: true },
  { time: '18:00', available: true },
  { time: '19:00', available: true },
  { time: '20:00', available: true },
  { time: '21:00', available: true },
  { time: '22:00', available: true },
];

export default function AvailabilityPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [guests, setGuests] = useState('1');
  const [duration, setDuration] = useState('1');
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [poolSettings, setPoolSettings] = useState<PoolSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [slotStatuses, setSlotStatuses] = useState<SlotStatus[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userMaxGuests, setUserMaxGuests] = useState<number | null>(null);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedSlotInfo, setBlockedSlotInfo] = useState<{ time: string; reason: string } | null>(null);

  // Fetch pool settings and user profile on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [poolResponse, userResponse] = await Promise.all([
          poolApi.getPublicSettings(),
          usersApi.getProfile()
        ]);
        setPoolSettings(poolResponse.data);
        setUserMaxGuests(userResponse.data.maxGuests);
      } catch (error) {
        console.error('Error fetching settings:', error);
        // Default to 10 guests if settings can't be fetched
        setPoolSettings({ max_guests: 10 });
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
  }, []);

  // Fetch slot status when date changes
  useEffect(() => {
    const fetchSlotStatus = async () => {
      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const response = await reservationsApi.getSlotStatus(dateStr);
        setSlotStatuses(response.data.slots || []);
      } catch (error) {
        console.error('Error fetching slot status:', error);
        setSlotStatuses([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlotStatus();
  }, [selectedDate, success]); // Re-fetch after successful reservation

  // Generate guest options based on user's max_guests limit (or pool default)
  const guestOptions = useMemo(() => {
    // Use user's personal limit if set, otherwise use pool's default
    const poolMax = poolSettings?.max_guests || 10;
    const maxGuests = userMaxGuests !== null ? Math.min(userMaxGuests, poolMax) : poolMax;
    return Array.from({ length: maxGuests }, (_, i) => ({
      value: String(i + 1),
      label: `${i + 1} Guest${i + 1 > 1 ? 's' : ''}`
    }));
  }, [poolSettings, userMaxGuests]);

  // Update current time every minute to keep time restrictions accurate
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Check if a time slot is available based on current time
  // Requires at least 1 hour advance booking for today's slots
  const isTimeSlotAvailable = (slotTime: string, date: Date): boolean => {
    // If date is in the past, all slots are unavailable
    if (isBefore(startOfDay(date), startOfDay(currentTime))) {
      return false;
    }

    // If not today, slot is available (based on other criteria)
    if (!isToday(date)) {
      return true;
    }

    // For today: check if slot is at least 1 hour from now
    const [slotHour, slotMinute] = slotTime.split(':').map(Number);
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();

    // Convert both to minutes for easier comparison
    const slotInMinutes = slotHour * 60 + slotMinute;
    const currentInMinutes = currentHour * 60 + currentMinute;

    // Require at least 30 minutes advance booking
    return slotInMinutes >= currentInMinutes + 30;
  };

  // Calculate available time slots based on selected date, current time, and slot status
  const timeSlots = useMemo(() => {
    return BASE_TIME_SLOTS.map(slot => {
      const slotStatus = slotStatuses.find(s => s.time === slot.time);
      const timeAvailable = isTimeSlotAvailable(slot.time, selectedDate);
      
      return {
        ...slot,
        available: timeAvailable && !slotStatus?.isFull && !slotStatus?.isBlocked && !slotStatus?.hasUserReservation,
        isFull: slotStatus?.isFull || false,
        isBlocked: slotStatus?.isBlocked || false,
        blockReason: slotStatus?.blockReason || null,
        availableSpots: slotStatus?.availableSpots,
        currentGuests: slotStatus?.currentGuests,
        lessonParticipants: slotStatus?.lessonParticipants,
        maxCapacity: slotStatus?.maxCapacity,
        hasUserReservation: slotStatus?.hasUserReservation || false,
        userReservationStatus: slotStatus?.userReservationStatus || null
      };
    });
  }, [selectedDate, currentTime, slotStatuses]);

  // Handle blocked slot click
  const handleBlockedSlotClick = (slot: TimeSlot) => {
    if (slot.isBlocked) {
      setBlockedSlotInfo({
        time: slot.time,
        reason: slot.blockReason || 'This time slot has been blocked by the administrator.'
      });
      setShowBlockedModal(true);
    }
  };

  const durationOptions = [
    { value: '1', label: '1 Hour' },
    { value: '2', label: '2 Hours' },
    { value: '3', label: '3 Hours' },
  ];

  const calculateEndTime = (startTime: string, hours: number): string => {
    if (!startTime || !startTime.includes(':')) return '';
    const parts = startTime.split(':');
    const hour = parseInt(parts[0], 10) || 0;
    const minute = parseInt(parts[1], 10) || 0;
    const endHour = hour + hours;
    return `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const [isPendingConflict, setIsPendingConflict] = useState(false);

  const handleReserve = async () => {
    if (!selectedTime) return;
    
    setLoading(true);
    setError(null);
    setIsPendingConflict(false);
    try {
      await reservationsApi.create({
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, parseInt(duration)),
        guests: parseInt(guests),
      });
      setSuccess(true);
      setShowConfirmModal(false);
      setSelectedTime('');
    } catch (error: any) {
      console.error('Reservation failed:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create reservation. Please try again.';
      const hasPendingConflict = error.response?.data?.isPendingConflict || false;
      setError(errorMessage);
      setIsPendingConflict(hasPendingConflict);
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pool Availability</h1>
        <p className="text-gray-500 mt-1">Select a date and time to make a reservation</p>
      </div>

      {/* Pool Capacity Info */}
      {poolSettings && (
        <div className="p-4 rounded-xl bg-primary-50 border border-primary-200">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary-600 mt-0.5" />
            <div>
              <p className="font-medium text-primary-900">Pool Capacity Information</p>
              <p className="text-sm text-primary-700 mt-1">
                {userMaxGuests !== null ? (
                  <>Your maximum guests per reservation: <strong>{userMaxGuests} guest{userMaxGuests !== 1 ? 's' : ''}</strong></>
                ) : (
                  <>Maximum guests allowed per reservation: <strong>{poolSettings.max_guests || 10} guests</strong></>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-200 bg-white"></div>
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
          <span className="text-gray-600">Full</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200 border border-gray-300"></div>
          <span className="text-gray-600">Blocked (click for details)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-100"></div>
          <span className="text-gray-600">Past/Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary-100 border border-primary-300"></div>
          <span className="text-gray-600">Your Reservation</span>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 rounded-xl bg-success-50 border border-success-200 text-success-700">
          <p className="font-medium">Reservation request submitted!</p>
          <p className="text-sm mt-1">You'll receive a notification once it's approved.</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={`p-4 rounded-xl border ${isPendingConflict ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <p className="font-medium">{isPendingConflict ? 'Pending Request Exists' : 'Reservation Failed'}</p>
          <p className="text-sm mt-1">{error}</p>
          {isPendingConflict && (
            <p className="text-sm mt-2">
              <a href="/my-reservations" className="underline font-medium hover:no-underline">
                View your pending reservations →
              </a>
            </p>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setSelectedTime('');
              setSuccess(false);
              setError(null);
            }}
          />
        </div>

        {/* Time Slots & Reservation */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title={`Available Times for ${format(selectedDate, 'EEEE, MMMM d')}`}
              subtitle={isToday(selectedDate) 
                ? `Reservations require at least 30 minutes advance booking. Current time: ${format(currentTime, 'h:mm a')}`
                : "Select a time slot to reserve"
              }
            />
            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
                <span className="ml-2 text-gray-500">Loading availability...</span>
              </div>
            ) : (
              <TimeSlotPicker
                slots={timeSlots}
                selectedTime={selectedTime}
                onSelect={setSelectedTime}
                formatTime={formatTimeToAMPM}
                showCapacity={true}
                onBlockedClick={handleBlockedSlotClick}
              />
            )}
          </Card>

          {/* Reservation Options */}
          {selectedTime && (
            <Card>
              <CardHeader title="Reservation Details" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  id="guests"
                  label="Number of Guests"
                  options={guestOptions}
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                />
                <Select
                  id="duration"
                  label="Duration"
                  options={durationOptions}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-3">Reservation Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatTimeToAMPM(selectedTime)} <ArrowRight className="h-3 w-3 inline" />{' '}
                      {formatTimeToAMPM(calculateEndTime(selectedTime, parseInt(duration)))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{guests} guest(s)</span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-4"
                onClick={() => setShowConfirmModal(true)}
              >
                Request Reservation
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Blocked Slot Reason Modal */}
      <Modal
        isOpen={showBlockedModal}
        onClose={() => {
          setShowBlockedModal(false);
          setBlockedSlotInfo(null);
        }}
        title="Time Slot Blocked"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-100 rounded-xl">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <Ban className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {blockedSlotInfo ? formatTimeToAMPM(blockedSlotInfo.time) : ''} is unavailable
              </p>
              <p className="text-sm text-gray-500">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-medium text-amber-800 mb-1">Reason:</p>
            <p className="text-amber-700">
              {blockedSlotInfo?.reason || 'Blocked by administrator'}
            </p>
          </div>

          <p className="text-sm text-gray-500">
            Please select a different time slot for your reservation.
          </p>

          <Button
            className="w-full"
            onClick={() => {
              setShowBlockedModal(false);
              setBlockedSlotInfo(null);
            }}
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Reservation"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to request this reservation?
          </p>
          <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
            <p><strong>Date:</strong> {format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
            <p><strong>Time:</strong> {formatTimeToAMPM(selectedTime)} - {formatTimeToAMPM(calculateEndTime(selectedTime, parseInt(duration)))}</p>
            <p><strong>Guests:</strong> {guests}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleReserve}
              loading={loading}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
