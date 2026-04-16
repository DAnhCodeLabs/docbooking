import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'REGISTER',
        'REFRESH_TOKEN',
        'VERIFY_EMAIL',
        'LOGIN',
        'LOGOUT',
        'PASSWORD_RESET',
        'PROFILE_UPDATE',
        'SUBMIT_DOCTOR_PROFILE',
        'APPROVE_DOCTOR_PROFILE',
        'REJECT_DOCTOR_PROFILE',
        'BAN_USER',
        'UNBAN_USER',
        'SOFT_DELETE_USER',
        'HARD_DELETE_USER',
        'CREATE_SPECIALTY',
        'UPDATE_SPECIALTY',
        'DEACTIVATE_SPECIALTY',
        'REACTIVATE_SPECIALTY',
        'CREATE_SCHEDULE',
        'BLOCK_SLOT',
        'UNBLOCK_SLOT',
        'CREATE_LEAVE',
        'CANCEL_LEAVE',
        'APPROVE_CLINIC_LEAD',
        'REJECT_CLINIC_LEAD',
        'LOCK_CLINIC',
        'UNLOCK_CLINIC',
        'SOFT_DELETE_CLINIC',
        'PROFILE_UPDATE',
        'DOCUMENT_ADD',
        'DOCUMENT_REMOVE',
        'ACTIVITY_IMAGE_ADD',
        'ACTIVITY_IMAGE_REMOVE',
        'CREATE_CLINIC_ADMIN',
        'LOCK_CLINIC_ADMIN',
        'UNLOCK_CLINIC_ADMIN',
        'SOFT_DELETE_CLINIC_ADMIN',
        'HARD_DELETE_CLINIC_ADMIN',
        'RESEND_CLINIC_CREDENTIALS',
        'CONFIRM_DOCTOR_BY_CLINIC',
        'REJECT_DOCTOR_BY_CLINIC',
        'COMPLETE_APPOINTMENT',
        'CANCEL_APPOINTMENT',
        'REFUND_PROCESSED',
        'VIEW_CONSULTATION',
        'VIEW_MEDICAL_RECORD',
        'VIEW_APPOINTMENT_HISTORY',
        'VIEW_PAYMENT',
      ],
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'PARTIAL_SUCCESS'],
      required: true,
    },
    ipAddress: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Index
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
