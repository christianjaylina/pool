'use client';

import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  available: boolean;
  selected?: boolean;
  isFull?: boolean;
  isBlocked?: boolean;
  availableSpots?: number;
  currentGuests?: number;
  lessonParticipants?: number;
  maxCapacity?: number;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  onSelect: (time: string) => void;
  selectedTime?: string;
  formatTime?: (time: string) => string;
  showCapacity?: boolean;
}

export default function TimeSlotPicker({ slots, onSelect, selectedTime, formatTime, showCapacity = false }: TimeSlotPickerProps) {
  // Default format function if none provided
  const displayTime = (time: string) => {
    if (formatTime) return formatTime(time);
    return time;
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {slots.map((slot) => {
        const isDisabled = !slot.available || slot.isFull || slot.isBlocked;
        const isSelected = selectedTime === slot.time;
        
        return (
          <button
            key={slot.time}
            onClick={() => !isDisabled && onSelect(slot.time)}
            disabled={isDisabled}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-all relative',
              // Available and selectable
              !isDisabled && !isSelected && 'hover:bg-primary-50 border border-gray-200',
              // Selected state
              isSelected && 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700',
              // Full slot (capacity reached)
              slot.isFull && 'bg-red-100 text-red-500 cursor-not-allowed border border-red-200',
              // Blocked by admin
              slot.isBlocked && 'bg-gray-200 text-gray-400 cursor-not-allowed line-through',
              // Past time or unavailable
              !slot.available && !slot.isFull && !slot.isBlocked && 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
            title={
              slot.isBlocked 
                ? 'Blocked by admin' 
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
            {slot.isFull && (
              <span className="block text-xs mt-0.5 font-semibold">FULL</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
