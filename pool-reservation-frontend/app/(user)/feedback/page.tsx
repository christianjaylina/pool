'use client';

import { useState } from 'react';
import { Star, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardHeader, Button, Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';
import { feedbackApi } from '@/lib/api';

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const subjectOptions = [
    { value: '', label: 'Select a topic' },
    { value: 'pool_condition', label: 'Pool Condition' },
    { value: 'reservation_system', label: 'Reservation System' },
    { value: 'staff_service', label: 'Staff Service' },
    { value: 'facilities', label: 'Facilities' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !subject || !message) return;

    setLoading(true);
    setError('');
    
    try {
      await feedbackApi.submit({ subject, message, rating });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center" padding="lg">
          <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-success-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-500 mb-6">
            Your feedback has been submitted successfully. We appreciate your input!
          </p>
          <Button onClick={() => {
            setSubmitted(false);
            setRating(0);
            setSubject('');
            setMessage('');
            setError('');
          }}>
            Submit Another Feedback
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submit Feedback</h1>
        <p className="text-gray-500 mt-1">Help us improve by sharing your experience</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger-700 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Feedback Form */}
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Overall Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          'h-8 w-8 transition-colors',
                          (hoverRating || rating) >= star
                            ? 'fill-warning-500 text-warning-500'
                            : 'text-gray-300'
                        )}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </p>
              </div>

              {/* Subject */}
              <Select
                id="subject"
                label="Subject"
                options={subjectOptions}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your Feedback
                </label>
                <textarea
                  id="message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please share your experience, suggestions, or concerns..."
                  className="input-base resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto"
                loading={loading}
                disabled={!rating || !subject || !message}
              >
                <Send className="h-4 w-4" />
                Submit Feedback
              </Button>
            </form>
          </Card>
        </div>

        {/* Tips */}
        <div className="lg:col-span-1">
          <Card className="bg-gradient-to-br from-primary-50 to-white">
            <CardHeader title="Tips for Great Feedback" />
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="text-primary-600">•</span>
                Be specific about your experience
              </li>
              <li className="flex gap-2">
                <span className="text-primary-600">•</span>
                Include dates if relevant
              </li>
              <li className="flex gap-2">
                <span className="text-primary-600">•</span>
                Suggest improvements when possible
              </li>
              <li className="flex gap-2">
                <span className="text-primary-600">•</span>
                Keep it constructive
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
