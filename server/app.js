const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { clientUrl, nodeEnv, uploadDir } = require('./config/env');
const sanitize = require('./middleware/sanitize');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const recruiterRoutes = require('./routes/recruiterRoutes');
const companyRoutes = require('./routes/companyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(sanitize);

if (nodeEnv !== 'test') {
  app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));
}

// Only profile photos and company logos are publicly servable images.
// Resumes are never exposed through static hosting — see resumeRoutes.
app.use('/uploads/photos', express.static(path.join(__dirname, uploadDir, 'photos')));
app.use('/uploads/logos', express.static(path.join(__dirname, uploadDir, 'logos')));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/recruiters', recruiterRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
