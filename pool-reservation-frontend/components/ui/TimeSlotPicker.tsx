'use client';

import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  available: boolean;
  selected?: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  onSelect: (time: string) => void;
  selectedTime?: string;
}

export default function TimeSlotPicker({ slots, onSelect, selectedTime }: TimeSlotPickerProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {slots.map((slot) => (
        <button
          key={slot.time}
          onClick={() => slot.available && onSelect(slot.time)}
          disabled={!slot.available}
          className={cn(
            'px-3 py-2 rounded-lg text-sm font-medium transition-all',
            slot.available
              ? 'hover:bg-primary-50 border border-gray-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
            selectedTime === slot.time &&
              'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'
          )}
        >
          {slot.time}
        </button>
      ))}
    </div>
  );
}
