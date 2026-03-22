import { Typography, Card, Divider } from "antd";
import dayjs from "dayjs";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const Step3Confirm = ({ bookingData }) => {
  const { doctor, selectedSlot, patientRecord, isForSelf } = bookingData;

  return (
    <div className="max-w-2xl mx-auto">
      <Title level={4} className="mb-6! text-gray-800! text-center!">
        Kiểm tra lại thông tin lịch hẹn
      </Title>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Thời gian khám */}
        <div className="p-6 bg-blue-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl">
              <CalendarOutlined className="m-0!" />
            </div>
            <div>
              <div className="text-gray-500 text-sm">Ngày khám</div>
              <div className="font-semibold text-gray-800 text-lg">
                {selectedSlot
                  ? dayjs(selectedSlot.date).format("DD/MM/YYYY")
                  : "---"}
              </div>
            </div>
          </div>
          <div className="w-px h-12 bg-blue-200 hidden sm:block"></div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl">
              <ClockCircleOutlined className="m-0!" />
            </div>
            <div>
              <div className="text-gray-500 text-sm">Thời gian</div>
              <div className="font-semibold text-gray-800 text-lg">
                {selectedSlot
                  ? `${selectedSlot.startTime} - ${selectedSlot.endTime}`
                  : "---"}
              </div>
            </div>
          </div>
        </div>

        <Divider className="m-0! border-gray-100!" />

        {/* Thông tin bệnh nhân */}
        <div className="p-6">
          <div className="font-semibold text-gray-800 mb-4 text-base uppercase tracking-wide">
            Thông tin bệnh nhân
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-gray-500 text-sm">Người khám</span>
              <span className="font-medium text-gray-800">
                <UserOutlined className="mr-2 text-gray-400" />
                {patientRecord?.fullName || "---"}
                <span className="text-xs ml-2 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {isForSelf ? "Bản thân" : "Người thân"}
                </span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-sm">Số điện thoại</span>
              <span className="font-medium text-gray-800">
                <PhoneOutlined className="mr-2 text-gray-400" />
                {patientRecord?.phone || "---"}
              </span>
            </div>
            <div className="flex flex-col sm:col-span-2">
              <span className="text-gray-500 text-sm">Địa chỉ</span>
              <span className="font-medium text-gray-800">
                {patientRecord?.address || "---"}
              </span>
            </div>
          </div>
        </div>

        <Divider className="m-0! border-gray-100!" />

        {/* Tổng thanh toán */}
        <div className="p-6 bg-gray-50 flex justify-between items-center">
          <div>
            <div className="text-gray-500 font-medium">Phí khám dự kiến</div>
            <div className="text-xs text-gray-400">
              Chưa bao gồm các phí phát sinh khi khám thực tế
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {doctor.consultationFee?.toLocaleString()} đ
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step3Confirm;
