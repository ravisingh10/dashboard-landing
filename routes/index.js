const express = require('express');
const router = express.Router();
const { ServiceLink } = require('../models');
const { Op } = require('sequelize');

// Landing page
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 30; // 3 cards per row, 10 rows
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = {
      active: true,
    };

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

    res.render('index', {
      serviceLinks,
      currentPage: page,
      totalPages,
      search,
      title: 'Dashboard - Home Server',
    });
  } catch (error) {
    console.error('Error loading landing page:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
