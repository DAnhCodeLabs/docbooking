import Loading from "@/components/Loading";
import { formatDateForBackend, getTodayUTC } from "@/utils/date";
import { Alert, DatePicker, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { bookingApi } from "../bookingApi";

const { Title, Text } = Typography;

const Step1DateTime = ({
  doctor,
  onSelectSlot,
  selectedSlot: currentSelected,
}) => {
  const [selectedDate, setSelectedDate] = useState(
    currentSelected ? dayjs(currentSelected.date) : null,
  );
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const handleDateChange = async (date) => {
    setSelectedDate(date);
    if (!date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const doctorUserId = doctor.user?._id || doctor._id;
      const response = await bookingApi.getSlotsByDoctorAndDate(
        doctorUserId,
        formatDateForBackend(date),
      );
      const allSlots = response.schedules?.[0]?.slots || [];
      const availableSlots = allSlots.filter((s) => s.status === "available");
      setSlots(availableSlots);
    } catch (error) {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSlotSelect = (slot) => {
    onSelectSlot({
      scheduleId: slot.scheduleId,
      slotId: slot._id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      date: formatDateForBackend(selectedDate),
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Title level={5} className="mb-3! text-gray-800! font-semibold!">
          1. Chọn ngày bạn muốn khám
        </Title>
        <DatePicker
          value={selectedDate}
          onChange={handleDateChange}
          format="DD/MM/YYYY"
          size="large"
          className="w-full! rounded-xl! border-gray-300! hover:border-blue-400! focus:border-blue-500!"
          disabledDate={(current) =>
            current && dayjs(getTodayUTC()).isAfter(current, "day")
          }
          placeholder="VD: 20/11/2026"
        />
      </div>

      {selectedDate && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <Title level={5} className="m-0! text-gray-800! font-semibold!">
              2. Khung giờ khả dụng
            </Title>
            <Text className="text-xs! text-gray-400!">
              {slots.length} ca trống
            </Text>
          </div>

          {loadingSlots ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
              <Loading />
            </div>
          ) : slots.length === 0 ? (
            <Alert
              message="Đã hết lịch khám"
              description="Bác sĩ không có lịch trống trong ngày này. Vui lòng chọn ngày khác."
              type="warning"
              showIcon
              className="rounded-xl! border-orange-200! bg-orange-50!"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {slots.map((slot) => {
                const isSelected = currentSelected?.slotId === slot._id;
                return (
                  <div
                    key={slot._id}
                    onClick={() => handleSlotSelect(slot)}
                    className={`
                      cursor-pointer rounded-xl py-3 px-2 text-center transition-all duration-200 border-2 select-none
                      ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm"
                          : "border-gray-100 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-slate-50"
                      }
                    `}
                  >
                    {slot.startTime} - {slot.endTime}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Step1DateTime;
