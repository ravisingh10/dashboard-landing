const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User, ServiceLink } = require('../models');
const authMiddleware = require('../middleware/auth');
const { Op } = require('sequelize');
require('dotenv').config();

// Login page (GET)
router.get('/login', (req, res) => {
  res.render('admin/login', { title: 'Admin Login', error: null });
});

// Login (POST)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { userName: username, active: true } });

    if (!user) {
      return res.render('admin/login', { title: 'Admin Login', error: 'Invalid credentials' });
    }

    const isValid = await user.validatePassword(password);

    if (!isValid) {
      return res.render('admin/login', { title: 'Admin Login', error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, userName: user.userName },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.redirect('/admin/settings');
  } catch (error) {
    console.error('Login error:', error);
    res.render('admin/login', { title: 'Admin Login', error: 'An error occurred' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/admin/login');
});

// Admin settings page
router.get('/settings', authMiddleware, (req, res) => {
  res.render('admin/settings', { title: 'Admin Settings', user: req.user });
});

// Create Service Link (GET)
router.get('/service-link/create', authMiddleware, (req, res) => {
  res.render('admin/service-link-create', { title: 'Create Service Link', user: req.user, error: null });
});

// Create Service Link (POST)
router.post('/service-link/create', authMiddleware, async (req, res) => {
  try {
    const { title, description, url, active } = req.body;

    await ServiceLink.create({
      title,
      description,
      url,
      active: active === 'on',
    });

    res.redirect('/admin/service-link/list');
  } catch (error) {
    console.error('Error creating service link:', error);
    res.render('admin/service-link-create', { 
      title: 'Create Service Link', 
      user: req.user, 
      error: 'Error creating service link' 
    });
  }
});

// List Service Links
router.get('/service-link/list', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: serviceLinks } = await ServiceLink.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    const totalPages = Math.ceil(count / limit);

    res.render('admin/service-link-list', {
      serviceLinks,
      currentPage: page,
      totalPages,
      search,
      title: 'Service Links',
      user: req.user,
    });
  } catch (error) {
    console.error('Error loading service links:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Update Service Link (GET)
router.get('/service-link/edit/:id', authMiddleware, async (req, res) => {
  try {
    const serviceLink = await ServiceLink.findByPk(req.params.id);

    if (!serviceLink) {
      return res.status(404).send('Service Link not found');
    }

    res.render('admin/service-link-edit', {
      serviceLink,
      title: 'Edit Service Link',
      user: req.user,
      error: null,
    });
  } catch (error) {
    console.error('Error loading service link:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Update Service Link (POST)
router.post('/service-link/edit/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, url, active } = req.body;
    const serviceLink = await ServiceLink.findByPk(req.params.id);

    if (!serviceLink) {
      return res.status(404).send('Service Link not found');
    }

    await serviceLink.update({
      title,
      description,
      url,
      active: active === 'on',
    });

    res.redirect('/admin/service-link/list');
  } catch (error) {
    console.error('Error updating service link:', error);
    const serviceLink = await ServiceLink.findByPk(req.params.id);
    res.render('admin/service-link-edit', {
      serviceLink,
      title: 'Edit Service Link',
      user: req.user,
      error: 'Error updating service link',
    });
  }
});

// List Users
router.get('/user/list', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { userName: { [Op.like]: `%${search}%` } },
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password'] },
    });

    const totalPages = Math.ceil(count / limit);

    res.render('admin/user-list', {
      users,
      currentPage: page,
      totalPages,
      search,
      title: 'Users',
      user: req.user,
    });
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Create User (GET)
router.get('/user/create', authMiddleware, (req, res) => {
  res.render('admin/user-create', { title: 'Create User', user: req.user, error: null });
});

// Create User (POST)
router.post('/user/create', authMiddleware, async (req, res) => {
  try {
    const { userName, firstName, lastName, password, active } = req.body;

    await User.create({
      userName,
      firstName,
      lastName,
      password,
      active: active === 'on',
    });

    res.redirect('/admin/user/list');
  } catch (error) {
    console.error('Error creating user:', error);
    res.render('admin/user-create', {
      title: 'Create User',
      user: req.user,
      error: 'Error creating user',
    });
  }
});

// Update User (GET)
router.get('/user/edit/:id', authMiddleware, async (req, res) => {
  try {
    const editUser = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });

    if (!editUser) {
      return res.status(404).send('User not found');
    }

    res.render('admin/user-edit', {
      editUser,
      title: 'Edit User',
      user: req.user,
      error: null,
    });
  } catch (error) {
    console.error('Error loading user:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Update User (POST)
router.post('/user/edit/:id', authMiddleware, async (req, res) => {
  try {
    const { userName, firstName, lastName, password, active } = req.body;
    const editUser = await User.findByPk(req.params.id);

    if (!editUser) {
      return res.status(404).send('User not found');
    }

    const updateData = {
      userName,
      firstName,
      lastName,
      active: active === 'on',
    };

    // Only update password if provided
    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    await editUser.update(updateData);

    res.redirect('/admin/user/list');
  } catch (error) {
    console.error('Error updating user:', error);
    const editUser = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    res.render('admin/user-edit', {
      editUser,
      title: 'Edit User',
      user: req.user,
      error: 'Error updating user',
    });
  }
});

module.exports = router;
