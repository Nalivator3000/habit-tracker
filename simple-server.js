const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Redirect routes for better UX
app.get('/app', (req, res) => {
  res.redirect('/app.html');
});

app.get('/calendar', (req, res) => {
  res.redirect('/calendar.html');
});

app.get('/auth', (req, res) => {
  res.redirect('/auth.html');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Simple server running for design testing' });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple Habit Tracker Server running on port ${PORT}`);
  console.log(`🎯 Web app: http://localhost:${PORT}/app.html`);
  console.log(`📅 Calendar: http://localhost:${PORT}/calendar.html`);
  console.log(`🔐 Auth: http://localhost:${PORT}/auth.html`);
  console.log(`🎨 Design concept: http://localhost:${PORT}/redesign-concept.html`);
});