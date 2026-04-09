import cron from "node-cron";
import Appointment from "../models/Appointment.js";
import Payment from "../models/Payment.js";
import Slot from "../models/Slot.js";
import logger from "../utils/logger.js";

/**
 * Atomic helper giống trong service
 */
const atomicUpdateSlot = async (
  slotId,
  currentStatus,
  newStatus,
  additionalUpdate = {},
) => {
  const update = { $set: { status: newStatus, ...additionalUpdate } };
  const slot = await Slot.findOneAndUpdate(
    { _id: slotId, status: currentStatus },
    update,
    { new: true },
  );
  return slot;
};

export const startCleanupPendingPayments = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const expiredAppointments = await Appointment.find({
        status: "pending_payment",
        paymentExpiryAt: { $lte: now },
        isDeleted: false,
      }).select("_id slot paymentMethod");

      for (const apt of expiredAppointments) {
        // Soft delete appointment
        apt.isDeleted = true;
        apt.deletedAt = now;
        apt.status = "cancelled";
        apt.paymentStatus = "failed";
        await apt.save();

        // Giải phóng slot nếu slot vẫn đang pending_payment và appointmentId khớp
        await atomicUpdateSlot(apt.slot, "pending_payment", "available", {
          appointmentId: null,
        });

        // Cập nhật payment
        await Payment.updateOne(
          { appointmentId: apt._id, status: "pending" },
          { $set: { status: "failed", responseCode: "TIMEOUT" } },
        );

        logger.info(`Cleanup: Xóa appointment hết hạn ${apt._id}`);
      }
    } catch (error) {
      logger.error(`Cleanup pending payments error: ${error.message}`);
    }
  });
};
