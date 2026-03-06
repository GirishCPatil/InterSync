require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./utils/db');
const roomHandler = require('./socket/roomHandler');

// Route imports
const userRoutes = require('./routes/userRoutes');
const matchRoutes = require('./routes/matchRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const resumeRoutes = require('./routes/resumeRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// Socket.io setup with CORS
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Serve static frontend files
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
    res.send('Welcome to InterSync API');
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api', matchRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api', resumeRoutes);

// Initialize Socket.io room handler
roomHandler(io);

// Connect DB and start server
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
