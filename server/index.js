const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// In dev, allow the Vite dev server on 5173. In prod, same-origin.
app.use(cors({
  origin: isProd ? false : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/profile',       require('./routes/profile'));
app.use('/api/courses',       require('./routes/courses'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/compliance',    require('./routes/compliance'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/incidents',     require('./routes/incidents'));
app.use('/api/sops',          require('./routes/sops'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// In production, serve the built React app
if (isProd) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  // SPA fallback — let React Router handle all non-API routes
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
