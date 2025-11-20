const express = require('express');
const cors = require('cors');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { nanoid } = require('nanoid');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const file = path.join(__dirname, 'db.json');
const adapter = new FileSync(file);
const db = low(adapter);

// defaults
db.defaults({ listings: [], bookings: [], users: [] }).write();

// Routes
app.get('/api/listings', (req, res) => {
  res.json(db.get('listings').value());
});

app.get('/api/listings/:id', (req, res) => {
  const listing = db.get('listings').find({ id: req.params.id }).value();
  if (!listing) return res.status(404).json({ error: 'Not found' });
  res.json(listing);
});

app.post('/api/bookings', (req, res) => {
  const payload = req.body;
  if (!payload.listingId || !payload.userId || !payload.startDate || !payload.months) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const listing = db.get('listings').find({ id: payload.listingId }).value();
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.availableRooms <= 0) return res.status(400).json({ error: 'No rooms available' });

  const booking = {
    id: nanoid(8),
    listingId: payload.listingId,
    userId: payload.userId,
    startDate: payload.startDate,
    months: payload.months,
    tenantName: payload.tenantName || 'Unknown',
    contact: payload.contact || '',
    createdAt: new Date().toISOString()
  };

  db.get('bookings').push(booking).write();
  db.get('listings')
    .find({ id: payload.listingId })
    .assign({ availableRooms: listing.availableRooms - 1 })
    .write();

  res.json({ success: true, booking });
});

app.get('/api/bookings', (req, res) => {
  res.json(db.get('bookings').value());
});

// Demo login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.get('users').find({ email, password }).value();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: 'token-' + user.id, user });
});

// ---------------------- START SERVER ----------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

