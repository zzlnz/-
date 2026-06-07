const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const houseRoutes = require('./routes/houseRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const leaseRoutes = require('./routes/leaseRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const frontendDir = path.join(__dirname, '..', 'frontend');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(frontendDir));

app.get('/', (req, res) => {
  res.redirect('/pages/auth/login.html');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/uploads', uploadRoutes);

app.use(errorHandler);

module.exports = app;
