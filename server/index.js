const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/courses',       require('./routes/courses'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/compliance',    require('./routes/compliance'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/incidents',     require('./routes/incidents'));
app.use('/api/sops',          require('./routes/sops'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
