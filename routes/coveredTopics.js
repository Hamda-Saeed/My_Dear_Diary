const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to authenticate using JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.userId = user.userId;
    next();
  });
}

// GET all WeeklyTopics with user’s CoveredTopic status
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('UserId', sql.Int, req.userId)
      .query(`
        SELECT wt.WeeklyTopicId, wt.Title, wt.Description, wt.WeekNumber,
               ct.CoveredTopicId, ct.IsFavorite, ct.IsRevised
        FROM WeeklyTopics wt
        LEFT JOIN CoveredTopics ct
          ON wt.WeeklyTopicId = ct.WeeklyTopicId AND ct.UserId = @UserId
        ORDER BY wt.WeekNumber
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Toggle or create/update CoveredTopic for a specific topic
router.post('/', authenticateToken, async (req, res) => {
  const { WeeklyTopicId, IsFavorite, IsRevised } = req.body;
  const UserId = req.userId;

  try {
    const pool = await poolPromise;

    // Check if entry exists
    const existing = await pool.request()
      .input('WeeklyTopicId', sql.Int, WeeklyTopicId)
      .input('UserId', sql.Int, UserId)
      .query(`
        SELECT * FROM CoveredTopics
        WHERE WeeklyTopicId = @WeeklyTopicId AND UserId = @UserId
      `);

    if (existing.recordset.length > 0) {
      // Update
      await pool.request()
        .input('IsFavorite', sql.Bit, IsFavorite)
        .input('IsRevised', sql.Bit, IsRevised)
        .input('WeeklyTopicId', sql.Int, WeeklyTopicId)
        .input('UserId', sql.Int, UserId)
        .query(`
          UPDATE CoveredTopics
          SET IsFavorite = @IsFavorite, IsRevised = @IsRevised
          WHERE WeeklyTopicId = @WeeklyTopicId AND UserId = @UserId
        `);
    } else {
      // Insert
      await pool.request()
        .input('WeeklyTopicId', sql.Int, WeeklyTopicId)
        .input('UserId', sql.Int, UserId)
        .input('IsFavorite', sql.Bit, IsFavorite)
        .input('IsRevised', sql.Bit, IsRevised)
        .query(`
          INSERT INTO CoveredTopics (WeeklyTopicId, UserId, IsFavorite, IsRevised)
          VALUES (@WeeklyTopicId, @UserId, @IsFavorite, @IsRevised)
        `);
    }

    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
