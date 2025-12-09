'use client';

import { useState, useEffect } from 'react';
import { Star, MessageSquare, Filter, RefreshCw } from 'lucide-react';
import { Card, CardHeader, Badge, Select, StatCard, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { feedbackApi } from '@/lib/api';

// Format timestamp - DB returns timestamps in PHT (UTC+8)
const formatPHTime = (dateString: string) => {
  // If the string doesn't have timezone info, treat it as PHT
  let dateStr = dateString;
  if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('T')) {
    dateStr = dateString.replace(' ', 'T') + '+08:00';
  }
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

interface Feedback {
  feedback_id: number;
  user_id: number;
  fName: string;
  lName: string;
  email: string;
  subject: string;
  message: string;
  rating: number;
  created_at: string;
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const response = await feedbackApi.getAll();
      setFeedback(response.data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const filteredFeedback = ratingFilter === 'all'
    ? feedback
    : feedback.filter(f => f.rating === parseInt(ratingFilter));

  const averageRating = feedback.length > 0 
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
    : '0.0';

  const ratingOptions = [
    { value: 'all', label: 'All Ratings' },
    { value: '5', label: '5 Stars' },
    { value: '4', label: '4 Stars' },
    { value: '3', label: '3 Stars' },
    { value: '2', label: '2 Stars' },
    { value: '1', label: '1 Star' },
  ];

  const subjectLabels: Record<string, string> = {
    pool_condition: 'Pool Condition',
    reservation_system: 'Reservation System',
    staff_service: 'Staff Service',
    facilities: 'Facilities',
    suggestion: 'Suggestion',
    other: 'Other',
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Renter Feedback</h1>
          <p className="text-gray-500 mt-1">View feedback and ratings from renters</p>
        </div>
        <Button variant="outline" onClick={fetchFeedback}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
                    style={{ width: feedback.length > 0 ? `${(distribution[rating] / feedback.length) * 100}%` : '0%' }}
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
      {filteredFeedback.length === 0 ? (
        <Card className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {feedback.length === 0 ? 'No feedback submitted yet' : 'No feedback found for this rating'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredFeedback.map((item) => (
            <Card key={item.feedback_id}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-medium text-gray-600">
                      A{item.user_id}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">Anonymous{item.user_id}</h3>
                      <Badge variant="info">{subjectLabels[item.subject] || item.subject}</Badge>
                    </div>
                    {renderStars(item.rating)}
                    <p className="text-gray-600 mt-2">{item.message}</p>
                    <p className="text-sm text-gray-400 mt-2">
                      {formatPHTime(item.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
