const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const authenticateToken = require('../middleware/auth');
const { sql, poolPromise } = require('../db');
// Helper function to hash password
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Helper function to compare password
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// CREATE User (Register)
router.post('/', async (req, res) => {
  const { name, email, password, profilePicUrl } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  try {
    const pool = await poolPromise;

    // Check if email already exists
    const existingUser = await pool.request()
      .input('Email', email)
      .query('SELECT UserId FROM Users WHERE Email = @Email');

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await hashPassword(password);

    const result = await pool.request()
      .input('Name', name)
      .input('Email', email)
      .input('PasswordHash', hashedPassword)
      .input('ProfilePicUrl', profilePicUrl || null)
      .query(`
        INSERT INTO Users (Name, Email, PasswordHash, ProfilePicUrl)
        OUTPUT INSERTED.UserId, INSERTED.Name, INSERTED.Email, INSERTED.ProfilePicUrl
        VALUES (@Name, @Email, @PasswordHash, @ProfilePicUrl)
      `);

    res.status(201).json(result.recordset[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// GET current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('UserId', req.user.userId)
      .query('SELECT UserId, Name, Email, ProfilePicUrl FROM Users WHERE UserId = @UserId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE current user
router.put('/me', authenticateToken, async (req, res) => {
  const { name, email, profilePicUrl } = req.body;
  const userId = req.user.userId;

  try {
    const pool = await poolPromise;

    const userResult = await pool.request()
      .input('UserId', userId)
      .query('SELECT * FROM Users WHERE UserId = @UserId');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingUser = userResult.recordset[0];

    // Check if new email already exists for someone else
    if (email && email !== existingUser.Email) {
      const emailCheck = await pool.request()
        .input('Email', email)
        .query('SELECT UserId FROM Users WHERE Email = @Email AND UserId != @UserId');

      if (emailCheck.recordset.length > 0) {
        return res.status(409).json({ message: 'Email already in use by another user' });
      }
    }

    await pool.request()
      .input('UserId', userId)
      .input('Name', name || existingUser.Name)
      .input('Email', email || existingUser.Email)
      .input('ProfilePicUrl', profilePicUrl || existingUser.ProfilePicUrl)
      .query(`
        UPDATE Users
        SET Name = @Name,
            Email = @Email,
            ProfilePicUrl = @ProfilePicUrl
        WHERE UserId = @UserId
      `);

    const forceRelogin = email && email !== existingUser.Email;

    res.json({ message: 'Profile updated', forceRelogin });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// READ all users (for admin purpose, or remove in production)
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT UserId, Name, Email, ProfilePicUrl FROM Users');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// READ single user by ID
router.get('/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('UserId', userId)
      .query('SELECT UserId, Name, Email, ProfilePicUrl FROM Users WHERE UserId = @UserId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE user by ID
router.put('/:id', async (req, res) => {
  const userId = req.params.id;
  const { name, email, password, profilePicUrl } = req.body;

  try {
    const pool = await poolPromise;

    // Check if user exists
    const existingUser = await pool.request()
      .input('UserId', userId)
      .query('SELECT * FROM Users WHERE UserId = @UserId');

    if (existingUser.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If updating email, check for conflicts
    if (email) {
      const emailCheck = await pool.request()
        .input('Email', email)
        .input('UserId', userId)
        .query('SELECT UserId FROM Users WHERE Email = @Email AND UserId != @UserId');

      if (emailCheck.recordset.length > 0) {
        return res.status(409).json({ message: 'Email already in use by another user' });
      }
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await hashPassword(password);
    }

    // Update query with optional fields
    await pool.request()
      .input('UserId', userId)
      .input('Name', name || existingUser.recordset[0].Name)
      .input('Email', email || existingUser.recordset[0].Email)
      .input('ProfilePicUrl', profilePicUrl || existingUser.recordset[0].ProfilePicUrl)
      .input('PasswordHash', hashedPassword || existingUser.recordset[0].PasswordHash)
      .query(`
        UPDATE Users
        SET Name = @Name,
            Email = @Email,
            ProfilePicUrl = @ProfilePicUrl,
            PasswordHash = @PasswordHash
        WHERE UserId = @UserId
      `);

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE user by ID
router.delete('/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('UserId', userId)
      .query('DELETE FROM Users WHERE UserId = @UserId');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
