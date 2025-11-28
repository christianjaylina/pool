'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  change,
  color = 'primary',
}: StatCardProps) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
  };

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <p
              className={cn(
                'mt-2 text-sm font-medium',
                change.isPositive ? 'text-success-600' : 'text-danger-600'
              )}
            >
              {change.isPositive ? '+' : ''}{change.value}% from last week
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', colors[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
