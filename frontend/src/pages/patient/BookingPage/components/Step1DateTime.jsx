import Loading from "@/components/Loading";
import { Alert, DatePicker, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { bookingApi } from "../bookingApi";

const { Title } = Typography;

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
      const response = await bookingApi.getSlotsByDoctorAndDate(
        doctor._id,
        date.format("YYYY-MM-DD"),
      );
      // response có dạng { schedules: [...] }
      // mỗi schedule có slots (mảng)
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
      scheduleId: slot.scheduleId, // backend có thể trả về scheduleId trong slot
      slotId: slot._id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      date: selectedDate.format("YYYY-MM-DD"),
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Title level={4} className="mb-2! text-gray-800!">
          1. Chọn ngày khám
        </Title>
        <DatePicker
          value={selectedDate}
          onChange={handleDateChange}
          format="DD/MM/YYYY"
          size="large"
          className="w-full!  border-gray-300!"
          disabledDate={(current) =>
            current && current < dayjs().startOf("day")
          }
          placeholder="Vui lòng chọn ngày bạn muốn đến khám"
        />
      </div>

      {selectedDate && (
        <div className="animate-fade-in">
          <Title level={4} className="mb-4! text-gray-800!">
            2. Chọn giờ khám
          </Title>
          {loadingSlots ? (
            <div className="text-center py-8">
              <Loading />
            </div>
          ) : slots.length === 0 ? (
            <Alert message="Chưa có lịch trống" type="warning" showIcon />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {slots.map((slot) => (
                <div
                  key={slot._id}
                  onClick={() => handleSlotSelect(slot)}
                  className={`cursor-pointer border rounded-lg py-3 px-2 text-center transition-all duration-200 ${
                    currentSelected?.slotId === slot._id
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm font-semibold"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {slot.startTime} - {slot.endTime}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Step1DateTime;
