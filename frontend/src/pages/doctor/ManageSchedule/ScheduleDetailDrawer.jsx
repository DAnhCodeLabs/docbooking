import { useState, useEffect } from "react";
import { Drawer, Button, Typography, Spin } from "antd";
import {
  LockOutlined,
  UnlockOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { scheduleApi } from "./scheduleApi";
import Loading from "@/components/Loading";

const { Text } = Typography;

const ScheduleDetailDrawer = ({ visible, onClose, schedule }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    if (visible && schedule) {
      const fetchSlots = async () => {
        setLoading(true);
        try {
          // Master Dev: Sử dụng Service
          const res = await scheduleApi.getScheduleSlots(schedule._id);
          setSlots(res?.slots || []);
        } catch (error) {
          // Lỗi đã được xử lý chung
        } finally {
          setLoading(false);
        }
      };
      fetchSlots();
    } else {
      setSlots([]);
    }
  }, [visible, schedule]);

  const handleToggleSlot = async (slot, action) => {
    setTogglingId(slot._id);
    try {
      // Master Dev: Sử dụng Service
      await scheduleApi.toggleSlotStatus(slot._id, action);
      setSlots((prev) =>
        prev.map((s) =>
          s._id === slot._id
            ? { ...s, status: action === "block" ? "blocked" : "available" }
            : s,
        ),
      );
    } catch (error) {
      // Lỗi đã được xử lý chung
    } finally {
      setTogglingId(null);
    }
  };

  const bookedCount = slots.filter((s) => s.status === "booked").length;
  const blockedCount = slots.filter((s) => s.status === "blocked").length;
  const availableCount = slots.filter((s) => s.status === "available").length;

  return (
    <Drawer
      title={
        <span className="text-lg! font-bold! text-slate-800!">
          Chi tiết Ca khám
        </span>
      }
      width={650}
      open={visible}
      onClose={onClose}
      styles={{ body: { padding: 0, backgroundColor: "#f8fafc" } }}
      footer={null}
    >
      <div className="flex flex-col h-full animate-fade-in">
        {/* HEADER */}
        <div className="bg-white p-6 border-b border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-blue-100">
              <CalendarOutlined className="text-blue-600!" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 m-0">
                {schedule
                  ? dayjs(schedule.date).format("DD/MM/YYYY")
                  : "--/--/----"}
              </h3>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Lịch làm việc cá nhân
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-6">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              <div className="text-2xl font-bold text-slate-700">
                {slots.length}
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mt-1">
                Tổng ca
              </div>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {availableCount}
              </div>
              <div className="text-xs text-emerald-600 uppercase tracking-wide font-semibold mt-1">
                Trống
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {bookedCount}
              </div>
              <div className="text-xs text-blue-600 uppercase tracking-wide font-semibold mt-1">
                Đã đặt
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-center">
              <div className="text-2xl font-bold text-red-500">
                {blockedCount}
              </div>
              <div className="text-xs text-red-500 uppercase tracking-wide font-semibold mt-1">
                Đã khóa
              </div>
            </div>
          </div>
        </div>

        {/* DANH SÁCH CA KHÁM */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <ClockCircleOutlined className="text-blue-500" /> DANH SÁCH CA KHÁM
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loading/>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              Ngày này chưa có ca khám nào được tạo.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {slots.map((slot) => {
                const isBooked = slot.status === "booked";
                const isBlocked = slot.status === "blocked";
                const isAvailable = slot.status === "available";
                const isProcessing = togglingId === slot._id;

                return (
                  <div
                    key={slot._id}
                    className={`relative p-3 rounded-xl border transition-all duration-300 flex flex-col justify-between h-24
                      ${isAvailable ? "bg-white border-emerald-200 shadow-sm hover:shadow-md hover:border-emerald-400" : ""}
                      ${isBooked ? "bg-blue-50 border-blue-200" : ""}
                      ${isBlocked ? "bg-slate-100 border-slate-200 opacity-70" : ""}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div
                        className={`text-base font-bold ${isAvailable ? "text-slate-800" : isBooked ? "text-blue-700" : "text-slate-500 line-through"}`}
                      >
                        {slot.startTime}
                      </div>
                      {isBooked && (
                        <UserOutlined className="text-blue-500 text-lg" />
                      )}
                      {isAvailable && (
                        <CheckCircleOutlined className="text-emerald-500 text-lg" />
                      )}
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      Đến {slot.endTime}
                    </div>

                    {!isBooked && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <Button
                          type="text"
                          loading={isProcessing}
                          icon={
                            isBlocked ? (
                              <UnlockOutlined className="text-emerald-600!" />
                            ) : (
                              <LockOutlined className="text-red-500!" />
                            )
                          }
                          onClick={() =>
                            handleToggleSlot(
                              slot,
                              isBlocked ? "unblock" : "block",
                            )
                          }
                          className={`font-semibold! ${isBlocked ? "text-emerald-600! hover:bg-emerald-50!" : "text-red-500! hover:bg-red-50!"}`}
                        >
                          {isBlocked ? "Mở khóa ca" : "Khóa ca này"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default ScheduleDetailDrawer;
