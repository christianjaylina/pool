// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./src/routes/auth'); // Import auth routes\
const reservationRoutes = require('./src/routes/reservations'); // Import reservation routes
const userRoutes = require('./src/routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allow cross-origin requests from the React frontend
app.use(express.json()); // Allows parsing of JSON request bodies

// Root Route (for testing if the server is up)
app.get('/', (req, res) => {
    res.send('Pool Reservation API is running...');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/users', userRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Database connected to ${process.env.DB_NAME}`);
});