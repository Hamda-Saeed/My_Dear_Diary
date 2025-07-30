const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const authenticateToken = require('../middleware/auth');

// GET all courses with weekly topics for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('UserId', sql.Int, req.user.userId)
      .query(`
        SELECT c.CourseId, c.Name AS CourseName, c.Code, 
               wt.WeeklyTopicId, wt.WeekNumber, wt.Topic, wt.CreatedAt, wt.IsFavorite, wt.IsDone
        FROM Courses c
        LEFT JOIN WeeklyTopics wt ON c.CourseId = wt.CourseId
        WHERE c.UserId = @UserId
        ORDER BY c.CourseId, wt.WeekNumber
      `);

    const courses = {};
    result.recordset.forEach(row => {
      if (!courses[row.CourseId]) {
        courses[row.CourseId] = {
          CourseId: row.CourseId,
          CourseName: row.CourseName,
          Code: row.Code,
          WeeklyTopics: []
        };
      }
      if (row.WeeklyTopicId) {
        courses[row.CourseId].WeeklyTopics.push({
          WeeklyTopicId: row.WeeklyTopicId,
          WeekNumber: row.WeekNumber,
          Topic: row.Topic,
          CreatedAt: row.CreatedAt,
          IsFavorite: row.IsFavorite,
          IsDone: row.IsDone
        });
      }
    });

    res.json(Object.values(courses));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a weekly topic
router.post('/:courseId', authenticateToken, async (req, res) => {
  const { WeekNumber, Topic } = req.body;
  const { courseId } = req.params;

  try {
    const pool = await poolPromise;

    // Verify ownership
    const check = await pool.request()
      .input('CourseId', sql.Int, courseId)
      .input('UserId', sql.Int, req.user.userId)
      .query('SELECT * FROM Courses WHERE CourseId = @CourseId AND UserId = @UserId');

    if (check.recordset.length === 0) {
      return res.status(403).json({ message: 'You do not own this course' });
    }

    const result = await pool.request()
      .input('CourseId', sql.Int, courseId)
      .input('WeekNumber', sql.Int, WeekNumber)
      .input('Topic', sql.NVarChar, Topic)
      .query(`
        INSERT INTO WeeklyTopics (CourseId, WeekNumber, Topic)
        OUTPUT INSERTED.WeeklyTopicId
        VALUES (@CourseId, @WeekNumber, @Topic)
      `);

    res.json({ WeeklyTopicId: result.recordset[0].WeeklyTopicId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT - Update a topic
router.put('/:weeklyTopicId', authenticateToken, async (req, res) => {
  const { weeklyTopicId } = req.params;
  const { Topic } = req.body;

  try {
    const pool = await poolPromise;

    // Verify topic ownership
    const verify = await pool.request()
      .input('WeeklyTopicId', sql.Int, weeklyTopicId)
      .query(`
        SELECT c.UserId 
        FROM WeeklyTopics wt
        JOIN Courses c ON c.CourseId = wt.CourseId
        WHERE wt.WeeklyTopicId = @WeeklyTopicId
      `);

    if (verify.recordset.length === 0 || verify.recordset[0].UserId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pool.request()
      .input('WeeklyTopicId', sql.Int, weeklyTopicId)
      .input('Topic', sql.NVarChar, Topic)
      .query(`UPDATE WeeklyTopics SET Topic = @Topic WHERE WeeklyTopicId = @WeeklyTopicId`);

    res.json({ message: 'Topic updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH - Update IsFavorite or IsDone for Covered Topics view
router.patch('/:weeklyTopicId', authenticateToken, async (req, res) => {
  const { weeklyTopicId } = req.params;
  const { IsFavorite, IsDone } = req.body;

  try {
    const pool = await poolPromise;

    // Verify topic ownership
    const verify = await pool.request()
      .input('WeeklyTopicId', sql.Int, weeklyTopicId)
      .query(`
        SELECT c.UserId
        FROM WeeklyTopics wt
        JOIN Courses c ON c.CourseId = wt.CourseId
        WHERE wt.WeeklyTopicId = @WeeklyTopicId
      `);

    if (verify.recordset.length === 0 || verify.recordset[0].UserId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pool.request()
      .input('WeeklyTopicId', sql.Int, weeklyTopicId)
      .input('IsFavorite', sql.Bit, IsFavorite)
      .input('IsDone', sql.Bit, IsDone)
      .query(`
        UPDATE WeeklyTopics
        SET IsFavorite = @IsFavorite, IsDone = @IsDone
        WHERE WeeklyTopicId = @WeeklyTopicId
      `);

    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.patch('/:weeklyTopicId/status', authenticateToken, async (req, res) => {
  const { weeklyTopicId } = req.params;
  const { IsFavorite, IsDone } = req.body;

  try {
    const pool = await poolPromise;

    const check = await pool.request()
      .input('WeeklyTopicId', sql.Int, weeklyTopicId)
      .query(`
        SELECT c.UserId
        FROM WeeklyTopics wt
        JOIN Courses c ON c.CourseId = wt.CourseId
        WHERE wt.WeeklyTopicId = @WeeklyTopicId
      `);

    if (check.recordset.length === 0 || check.recordset[0].UserId !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await pool.request()
      .input('WeeklyTopicId', sql.Int, weeklyTopicId)
      .input('IsFavorite', sql.Bit, IsFavorite)
      .input('IsDone', sql.Bit, IsDone)
      .query(`
        UPDATE WeeklyTopics
        SET IsFavorite = @IsFavorite, IsDone = @IsDone
        WHERE WeeklyTopicId = @WeeklyTopicId
      `);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
