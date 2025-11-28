'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Star, MessageSquare, Filter } from 'lucide-react';
import { Card, CardHeader, Badge, Select, StatCard } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Feedback {
  id: number;
  user: string;
  email: string;
  subject: string;
  message: string;
  rating: number;
  created_at: string;
}

const mockFeedback: Feedback[] = [
  { id: 1, user: 'John Doe', email: 'john@example.com', subject: 'Pool Condition', message: 'The pool was very clean and well-maintained. Great experience!', rating: 5, created_at: '2025-11-28T10:00:00' },
  { id: 2, user: 'Jane Smith', email: 'jane@example.com', subject: 'Reservation System', message: 'The booking process was smooth and intuitive. Love the calendar view!', rating: 4, created_at: '2025-11-27T15:30:00' },
  { id: 3, user: 'Bob Wilson', email: 'bob@example.com', subject: 'Suggestion', message: 'It would be nice to have a mobile app for easier booking on the go.', rating: 4, created_at: '2025-11-26T09:00:00' },
  { id: 4, user: 'Alice Brown', email: 'alice@example.com', subject: 'Facilities', message: 'The changing rooms could use some upgrades. Lockers are a bit old.', rating: 3, created_at: '2025-11-25T14:00:00' },
  { id: 5, user: 'Charlie Davis', email: 'charlie@example.com', subject: 'Staff Service', message: 'The staff were incredibly helpful and friendly. Thank you!', rating: 5, created_at: '2025-11-24T11:00:00' },
  { id: 6, user: 'Eva Green', email: 'eva@example.com', subject: 'Pool Condition', message: 'Water temperature was perfect. Very enjoyable swim session.', rating: 5, created_at: '2025-11-23T16:00:00' },
];

export default function AdminFeedbackPage() {
  const [feedback] = useState<Feedback[]>(mockFeedback);
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  const filteredFeedback = ratingFilter === 'all'
    ? feedback
    : feedback.filter(f => f.rating === parseInt(ratingFilter));

  const averageRating = (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1);

  const ratingOptions = [
    { value: 'all', label: 'All Ratings' },
    { value: '5', label: '5 Stars' },
    { value: '4', label: '4 Stars' },
    { value: '3', label: '3 Stars' },
    { value: '2', label: '2 Stars' },
    { value: '1', label: '1 Star' },
  ];

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= rating ? 'fill-warning-500 text-warning-500' : 'text-gray-300'
          )}
        />
      ))}
    </div>
  );

  const getRatingDistribution = () => {
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedback.forEach(f => distribution[f.rating]++);
    return distribution;
  };

  const distribution = getRatingDistribution();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Renter Feedback</h1>
        <p className="text-gray-500 mt-1">View feedback and ratings from renters</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="text-center" padding="lg">
          <div className="flex justify-center mb-2">
            {renderStars(Math.round(parseFloat(averageRating)))}
          </div>
          <p className="text-3xl font-bold text-gray-900">{averageRating}</p>
          <p className="text-sm text-gray-500">Average Rating</p>
        </Card>
        <StatCard
          title="Total Feedback"
          value={feedback.length}
          icon={MessageSquare}
          color="primary"
        />
        <Card padding="md">
          <h4 className="font-medium text-gray-900 mb-3">Rating Distribution</h4>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-8">{rating}★</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning-500 rounded-full"
                    style={{ width: `${(distribution[rating] / feedback.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-6">{distribution[rating]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Filter className="h-5 w-5 text-gray-400" />
        <Select
          id="rating"
          options={ratingOptions}
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Feedback List */}
      <div className="grid gap-4">
        {filteredFeedback.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-medium text-primary-700">
                    {item.user.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{item.user}</h3>
                    <Badge variant="info">{item.subject}</Badge>
                  </div>
                  {renderStars(item.rating)}
                  <p className="text-gray-600 mt-2">{item.message}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {format(new Date(item.created_at), 'MMM d, yyyy • h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredFeedback.length === 0 && (
        <Card className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No feedback found for this rating</p>
        </Card>
      )}
    </div>
  );
}
