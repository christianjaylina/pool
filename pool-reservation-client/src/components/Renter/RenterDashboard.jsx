import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAvailability, requestReservation } from '../../api/reservationApi';
import { useNavigate } from 'react-router-dom';

const RenterDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State for date selection and availability
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // State for the reservation request form
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Function to fetch availability data from the backend
  const getAvailability = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    setAvailableSlots([]);
    setSelectedSlot(null);

    try {
      const data = await fetchAvailability(date);
      setAvailableSlots(data.availableSlots);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch availability.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data whenever the selectedDate changes
  useEffect(() => {
    getAvailability(selectedDate);
  }, [selectedDate, getAvailability]);

  // Handle reservation submission
  const handleReservationRequest = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const bookingData = {
      date: selectedDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
    };

    try {
      const response = await requestReservation(bookingData);
      setSuccessMessage(response.message);
      
      // Refresh availability list after a successful request
      setTimeout(() => {
        getAvailability(selectedDate); 
        setSelectedSlot(null);
        setSuccessMessage(null);
      }, 3000);

    } catch (err) {
      setError(err.response?.data?.message || 'Reservation failed. Slot may no longer be available.');
      // Refresh availability if conflict occurs
      getAvailability(selectedDate);
    } finally {
      setLoading(false);
    }
  };
  
  // Utility to format date for display
  const formatDateDisplay = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="dashboard-container">
      <h2>Welcome, {user?.fName} ({user?.role})!</h2>
      <p>Pool Reservation Portal - Luxuria Bacaca Resort</p>
      <button onClick={logout}>Log Out</button>
      <button onClick={() => navigate('/renter/history')}>View My Bookings</button>

      ---

      <div className="availability-section">
        <h3>Pool Availability for:</h3>
        
        {/* Date Picker */}
        <input 
          type="date"
          value={selectedDate}
          min={new Date().toISOString().substring(0, 10)} // Prevent booking in the past
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        
        <h4>Slots for {formatDateDisplay(selectedDate)}</h4>

        {loading && <p>Loading availability...</p>}
        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}

        {/* Availability Grid */}
        <div className="slot-grid">
          {availableSlots.length > 0 ? (
            availableSlots.map((slot, index) => (
              <button
                key={index}
                className={`slot-button ${selectedSlot === slot ? 'selected' : ''}`}
                onClick={() => setSelectedSlot(slot)}
                disabled={loading}
              >
                {slot.startTime} - {slot.endTime}
              </button>
            ))
          ) : !loading && <p>No available slots on this day.</p>}
        </div>
      </div>
      
      {/* Reservation Form */}
      {selectedSlot && (
        <form onSubmit={handleReservationRequest} className="reservation-form">
          <h4>Confirm Reservation</h4>
          <p>You are requesting the pool from 
            <strong> {selectedSlot.startTime}</strong> to 
            <strong> {selectedSlot.endTime}</strong> on 
            <strong> {formatDateDisplay(selectedDate)}</strong>.
          </p>
          <p className="note">All reservations are **PENDING** until approved by an Admin.</p>
          <button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Request Reservation'}
          </button>
        </form>
      )}
    </div>
  );
};

export default RenterDashboard;