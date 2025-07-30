const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { sql, poolPromise } = require('./db'); 
const jwt = require('jsonwebtoken');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/weeklyTopics', require('./routes/weeklyTopics'));
app.use('/api/coveredTopics', require('./routes/coveredTopics'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});
// Root route (optional)
app.get('/', (req, res) => {
  res.send('🎉 Personal Diary Backend is running!');
});

// Signup route
app.post('/signup', async (req, res) => {
  const { Name, Email, Password } = req.body;

  if (!Name || !Email || !Password) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }

  try {
    const pool = await poolPromise;

    // Check if email already exists
    const existing = await pool.request()
      .input('Email', sql.VarChar, Email)
      .query('SELECT * FROM Users WHERE Email = @Email');

    if (existing.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(Password, 10);

    // Insert new user
    await pool.request()
      .input('Name', sql.VarChar, Name)
      .input('Email', sql.VarChar, Email)
      .input('PasswordHash', sql.VarChar, hashedPassword)
      .query('INSERT INTO Users (Name, Email, PasswordHash) VALUES (@Name, @Email, @PasswordHash)');

    res.json({ success: true, message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { Email, Password } = req.body;

  if (!Email || !Password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('Email', sql.VarChar, Email)
      .query('SELECT * FROM Users WHERE Email = @Email');

    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(Password, user.PasswordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }



    // Generate JWT token (valid for 7 days)
    const token = jwt.sign(
      { userId: user.UserId },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.Id,
        name: user.Name,
        email: user.Email,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
