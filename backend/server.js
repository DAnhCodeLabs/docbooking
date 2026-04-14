import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createServer } from 'http';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { z } from 'zod';
import connectDB from './src/config/db.js';
import { startCleanupPendingPayments } from './src/cron/cleanupPendingPayments.js';
import { startUnbanCronJob } from './src/cron/unbanCron.js';
import errorHandler from './src/middlewares/errorHandler.js';
import notFound from './src/middlewares/notFound.js';
import adminDoctorRoutes from './src/modules/admin/admin.doctor.routes.js';
import adminAuthRoutes from './src/modules/admin/admin.routes.js';
import { removeSlotIndex } from './src/modules/appointment/appointment.init.js';
import appointmentRoutes from './src/modules/appointment/appointment.routes.js';
import authRoutes from './src/modules/auth/auth.routes.js';
import clinicLeadRoutes from './src/modules/clinicLead/clinicLead.routes.js';
import clinicDashboardRoutes from './src/modules/dashboard/clinicDashboard/clinicDashboard.routes.js';
import doctorRoutes from './src/modules/doctor/doctor.routes.js';
import leaveRoutes from './src/modules/leave/leave.routes.js';
import medicalRecordRoutes from './src/modules/medicalRecord/medicalRecord.routes.js';
import paymentRoutes from './src/modules/payment/payment.routes.js';
import scheduleRoutes from './src/modules/schedule/schedule.routes.js';
import specialtyRoutes from './src/modules/specialty/specialty.routes.js';
import ApiError from './src/utils/ApiError.js'; // Thêm import ApiError
import sendSuccess from './src/utils/response.js';
import reviewRoutes from './src/modules/review/review.routes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ==================== MIDDLEWARE ====================

// Bảo mật HTTP headers
app.use(helmet());

// CORS

app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((u) => u.trim())
        : [];

      if (process.env.NODE_ENV === 'development') {
        if (!origin) return callback(null, true);
        if (
          origin.includes('.ngrok-free.dev') || // ← Ngrok 2026
          origin.startsWith('http://192.168.') ||
          origin.startsWith('http://10.') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1')
        ) {
          return callback(null, true);
        }
      }

      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Bị chặn bởi CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Nén response
app.use(compression());

// Ghi log request
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Parse cookie
app.use(cookieParser());

// Parse JSON và URL-encoded (giới hạn 10mb cho upload)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Giới hạn tốc độ request cho tất cả API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    statusCode: 429,
    message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ==================== ROUTES ====================

// Route kiểm tra server
app.get('/', (req, res) => {
  res.send('Hệ thống đặt lịch khám bệnh online - Backend đang hoạt động!');
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// API health chi tiết (có thể dùng cho monitoring)
app.get('/api/health', (req, res) => {
  sendSuccess(res, StatusCodes.OK, 'Server is healthy', {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Route mẫu throw lỗi (chỉ dùng trong development)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/test-error', (req, res, next) => {
    next(new ApiError(StatusCodes.BAD_REQUEST, 'This is a test error'));
  });

  // Route mẫu validation dùng Zod
  app.post('/api/test-validation', (req, res, next) => {
    const schema = z.object({ email: z.string().email() });
    try {
      schema.parse(req.body);
      sendSuccess(res, StatusCodes.OK, 'Validation passed');
    } catch (error) {
      next(error);
    }
  });
}

// ==================== API ROUTES (sẽ được thêm sau) ====================
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminDoctorRoutes);
app.use('/api/specialties', specialtyRoutes);
app.use('/api/clinic-leads', clinicLeadRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/clinic-admin', clinicDashboardRoutes);
app.use('/api/reviews', reviewRoutes);

// ==================== XỬ LÝ 404 VÀ LỖI ====================

// Middleware bắt route không tồn tại (phải đặt sau tất cả routes)
app.use(notFound);

// Middleware xử lý lỗi tập trung (phải đặt cuối cùng)
app.use(errorHandler);

// ==================== KHỞI ĐỘNG SERVER ====================

const startServer = async () => {
  try {
    await connectDB();
    await removeSlotIndex();
    startUnbanCronJob();
    startCleanupPendingPayments();
    const PORT = process.env.PORT || 8000;
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(
        `Server running on port ${PORT} (${process.env.NODE_ENV} mode)`
      );
      console.log(`→ Truy cập từ mạng LAN: http://192.168.1.4:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// ==================== GRACEFUL SHUTDOWN ====================
const gracefulShutdown = (signal) => {
  console.log(
    `\n${signal} received. Closing HTTP server and database connections...`
  );

  httpServer.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection
      .close(false)
      .then(() => {
        console.log('MongoDB connection closed.');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Error during MongoDB close:', err);
        process.exit(1);
      });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error(
      'Could not close connections in time, forcefully shutting down'
    );
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
