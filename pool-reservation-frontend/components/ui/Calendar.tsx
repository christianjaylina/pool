'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';

interface CalendarProps {
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  minDate?: Date;
  disabledDates?: Date[];
}

export default function Calendar({
  selectedDate,
  onDateSelect,
  minDate = new Date(),
  disabledDates = [],
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const isDisabled = (date: Date) => {
    // Compare only the date portion (ignore time) to allow selecting today
    return (
      isBefore(startOfDay(date), startOfDay(minDate)) ||
      disabledDates.some((d) => isSameDay(d, date))
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
          <div
            key={weekday}
            className="text-center text-xs font-medium text-gray-500 py-2"
          >
            {weekday}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          const disabled = isDisabled(date);
          const selected = selectedDate && isSameDay(date, selectedDate);
          const today = isToday(date);
          const inMonth = isSameMonth(date, currentMonth);

          return (
            <button
              key={idx}
              onClick={() => !disabled && onDateSelect(date)}
              disabled={disabled}
              className={cn(
                'h-10 w-full rounded-lg text-sm font-medium transition-all',
                !inMonth && 'text-gray-300',
                inMonth && !disabled && 'text-gray-900 hover:bg-primary-50',
                disabled && 'text-gray-300 cursor-not-allowed',
                today && !selected && 'ring-2 ring-primary-200',
                selected && 'bg-primary-600 text-white hover:bg-primary-700'
              )}
            >
              {format(date, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
