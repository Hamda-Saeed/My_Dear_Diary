const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const authenticateToken = require('../middleware/auth');

// GET all courses for logged-in user
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('UserId', sql.Int, userId)
      .query('SELECT * FROM Courses WHERE UserId = @UserId');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new course
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { Name, Code, OutlineFileUrl } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('UserId', sql.Int, userId)
      .input('Name', sql.NVarChar, Name)
      .input('Code', sql.NVarChar, Code)
      .input('OutlineFileUrl', sql.NVarChar, OutlineFileUrl || null)
      .query(`
        INSERT INTO Courses (UserId, Name, Code, OutlineFileUrl)
        VALUES (@UserId, @Name, @Code, @OutlineFileUrl)
      `);
    res.status(201).json({ message: 'Course created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update course
router.put('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const courseId = req.params.id;
  const { Name, Code, OutlineFileUrl } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('CourseId', sql.Int, courseId)
      .input('UserId', sql.Int, userId)
      .input('Name', sql.NVarChar, Name)
      .input('Code', sql.NVarChar, Code)
      .input('OutlineFileUrl', sql.NVarChar, OutlineFileUrl || null)
      .query(`
        UPDATE Courses
        SET Name = @Name, Code = @Code, OutlineFileUrl = @OutlineFileUrl
        WHERE CourseId = @CourseId AND UserId = @UserId
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Course not found or unauthorized' });
    }
    res.json({ message: 'Course updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE course
router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const courseId = req.params.id;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('CourseId', sql.Int, courseId)
      .input('UserId', sql.Int, userId)
      .query(`
        DELETE FROM Courses
        WHERE CourseId = @CourseId AND UserId = @UserId
      `);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Course not found or unauthorized' });
    }
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
