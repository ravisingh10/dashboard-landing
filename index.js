const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { sequelize, User } = require('./models');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');

app.use('/', indexRoutes);
app.use('/admin', adminRoutes);

// Database initialization and server start
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    await sequelize.sync();
    console.log('Database synchronized.');

    // Create default admin user if none exists
    const userCount = await User.count();
    if (userCount === 0) {
      await User.create({
        userName: 'admin',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        active: true,
      });
      console.log('Default admin user created (username: admin, password: admin123)');
    }

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

initializeDatabase();
