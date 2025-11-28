'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Users, ArrowRight } from 'lucide-react';
import { Card, CardHeader, Calendar, TimeSlotPicker, Button, Select, Modal, Input } from '@/components/ui';
import { poolApi, reservationsApi } from '@/lib/api';

interface TimeSlot {
  time: string;
  available: boolean;
}

// Base time slots (without time restrictions)
const BASE_TIME_SLOTS = [
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

    // Require at least 60 minutes (1 hour) advance booking
    return slotInMinutes >= currentInMinutes + 60;
  };

  // Calculate available time slots based on selected date and current time
  const timeSlots = useMemo(() => {
    return BASE_TIME_SLOTS.map(slot => ({
      ...slot,
      available: slot.available && isTimeSlotAvailable(slot.time, selectedDate)
    }));
  }, [selectedDate, currentTime]);

  const guestOptions = [
    { value: '1', label: '1 Guest' },
    { value: '2', label: '2 Guests' },
    { value: '3', label: '3 Guests' },
    { value: '4', label: '4 Guests' },
  ];

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

  const handleReserve = async () => {
    if (!selectedTime) return;
    
    setLoading(true);
    try {
      await reservationsApi.create({
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedTime,
        end_time: calculateEndTime(selectedTime, parseInt(duration)),
        guests: parseInt(guests),
      });
      setSuccess(true);
      setShowConfirmModal(false);
      setSelectedTime('');
    } catch (error) {
      console.error('Reservation failed:', error);
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

      {/* Success Message */}
      {success && (
        <div className="p-4 rounded-xl bg-success-50 border border-success-200 text-success-700">
          <p className="font-medium">Reservation request submitted!</p>
          <p className="text-sm mt-1">You'll receive a notification once it's approved.</p>
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
            }}
          />
        </div>

        {/* Time Slots & Reservation */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title={`Available Times for ${format(selectedDate, 'EEEE, MMMM d')}`}
              subtitle={isToday(selectedDate) 
                ? `Reservations require at least 1 hour advance booking. Current time: ${format(currentTime, 'h:mm a')}`
                : "Select a time slot to reserve"
              }
            />
            <TimeSlotPicker
              slots={timeSlots}
              selectedTime={selectedTime}
              onSelect={setSelectedTime}
            />
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
                      {selectedTime} <ArrowRight className="h-3 w-3 inline" />{' '}
                      {calculateEndTime(selectedTime, parseInt(duration))}
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
            <p><strong>Time:</strong> {selectedTime} - {calculateEndTime(selectedTime, parseInt(duration))}</p>
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
