'use client';

import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  available: boolean;
  selected?: boolean;
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

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  onSelect: (time: string) => void;
  selectedTime?: string;
  formatTime?: (time: string) => string;
  showCapacity?: boolean;
  onBlockedClick?: (slot: TimeSlot) => void;
}

export default function TimeSlotPicker({ slots, onSelect, selectedTime, formatTime, showCapacity = false, onBlockedClick }: TimeSlotPickerProps) {
  // Default format function if none provided
  const displayTime = (time: string) => {
    if (formatTime) return formatTime(time);
    return time;
  };

  const handleClick = (slot: TimeSlot) => {
    if (slot.isBlocked && onBlockedClick) {
      onBlockedClick(slot);
    } else if (!slot.isFull && slot.available) {
      onSelect(slot.time);
    }
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {slots.map((slot) => {
        const isDisabled = !slot.available || slot.isFull || slot.isBlocked || slot.hasUserReservation;
        const isSelected = selectedTime === slot.time;
        const isClickableBlocked = slot.isBlocked && !!onBlockedClick;
        const hasExistingReservation = slot.hasUserReservation;
        
        return (
          <button
            key={slot.time}
            onClick={() => handleClick(slot)}
            disabled={isDisabled && !isClickableBlocked}
            type="button"
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-all relative',
              // Available and selectable
              !isDisabled && !isSelected && 'hover:bg-primary-50 border border-gray-200',
              // Selected state
              isSelected && 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700',
              // User has existing reservation for this slot
              hasExistingReservation && 'bg-primary-100 text-primary-700 cursor-not-allowed border border-primary-300',
              // Full slot (capacity reached)
              slot.isFull && !slot.isBlocked && !hasExistingReservation && 'bg-red-100 text-red-500 cursor-not-allowed border border-red-200',
              // Blocked by admin - make clickable if handler provided
              slot.isBlocked && isClickableBlocked && 'bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300 line-through border border-gray-300',
              slot.isBlocked && !isClickableBlocked && 'bg-gray-200 text-gray-400 cursor-not-allowed line-through',
              // Past time or unavailable (but not blocked or full or has reservation)
              !slot.available && !slot.isFull && !slot.isBlocked && !hasExistingReservation && 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
            title={
              hasExistingReservation
                ? `You have a ${slot.userReservationStatus} reservation`
                : slot.isBlocked 
                  ? 'Click to see reason' 
                  : slot.isFull 
                    ? 'Fully booked' 
                    : !slot.available 
                      ? 'Not available' 
                      : showCapacity && slot.availableSpots !== undefined
                        ? `${slot.availableSpots} spots available`
                        : undefined
            }
          >
            <span>{displayTime(slot.time)}</span>
            {showCapacity && !isDisabled && slot.availableSpots !== undefined && (
              <span className={cn(
                'block text-xs mt-0.5',
                isSelected ? 'text-primary-100' : 'text-gray-500'
              )}>
                {slot.availableSpots} left
              </span>
            )}
            {hasExistingReservation && (
              <span className="block text-xs mt-0.5 font-semibold uppercase">
                {slot.userReservationStatus === 'pending' ? 'Pending' : 'Reserved'}
              </span>
            )}
            {slot.isFull && !hasExistingReservation && (
              <span className="block text-xs mt-0.5 font-semibold">FULL</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
