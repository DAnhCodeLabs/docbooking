import { Typography, Divider } from "antd";
import dayjs from "dayjs";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  IdcardOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

const Step3Confirm = ({ bookingData }) => {
  const { doctor, selectedSlot, patientRecord, isForSelf, symptoms, note } =
    bookingData;

  return (
    <div className="max-w-2xl mx-auto">
      <Title
        level={5}
        className="mb-6! text-gray-800! text-center! font-semibold!"
      >
        Kiểm tra lại thông tin hồ sơ
      </Title>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Khối Thời gian khám */}
        <div className="p-5 md:p-6 bg-blue-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full translate-x-10 -translate-y-10"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-white/20 text-white rounded-xl flex items-center justify-center text-xl backdrop-blur-sm">
              <CalendarOutlined className="m-0!" />
            </div>
            <div>
              <div className="text-blue-100 text-xs uppercase tracking-wider font-medium mb-0.5">
                Ngày khám
              </div>
              <div className="font-bold text-white text-lg">
                {selectedSlot
                  ? dayjs(selectedSlot.date).format("DD/MM/YYYY")
                  : "---"}
              </div>
            </div>
          </div>
          <div className="w-px h-10 bg-blue-400 hidden sm:block"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-white/20 text-white rounded-xl flex items-center justify-center text-xl backdrop-blur-sm">
              <ClockCircleOutlined className="m-0!" />
            </div>
            <div>
              <div className="text-blue-100 text-xs uppercase tracking-wider font-medium mb-0.5">
                Giờ khám
              </div>
              <div className="font-bold text-white text-lg">
                {selectedSlot
                  ? `${selectedSlot.startTime} - ${selectedSlot.endTime}`
                  : "---"}
              </div>
            </div>
          </div>
        </div>

        {/* Thông tin bệnh nhân */}
        <div className="p-5 md:p-6">
          <div className="font-semibold text-gray-400 text-xs uppercase tracking-widest mb-4">
            Thông tin bệnh nhân
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs mb-1">Họ và tên</span>
              <span className="font-medium text-gray-800 flex items-center">
                <UserOutlined className="mr-2 text-gray-400" />
                {patientRecord?.fullName || "---"}
                <span className="text-[10px] ml-2 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {isForSelf ? "Bản thân" : "Người thân"}
                </span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs mb-1">Số điện thoại</span>
              <span className="font-medium text-gray-800 flex items-center">
                <PhoneOutlined className="mr-2 text-gray-400" />
                {patientRecord?.phone || "---"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs mb-1">
                CCCD / Hộ chiếu
              </span>
              <span className="font-medium text-gray-800 flex items-center">
                <IdcardOutlined className="mr-2 text-gray-400" />
                {patientRecord?.cccd || "---"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs mb-1">Ngày cấp CCCD</span>
              <span className="font-medium text-gray-800">
                {patientRecord?.cccdIssueDate
                  ? dayjs(patientRecord.cccdIssueDate).format("DD/MM/YYYY")
                  : "---"}
              </span>
            </div>
            <div className="flex flex-col sm:col-span-2">
              <span className="text-gray-500 text-xs mb-1">Nơi cấp CCCD</span>
              <span className="font-medium text-gray-800">
                {patientRecord?.cccdIssuePlace || "---"}
              </span>
            </div>
            <div className="flex flex-col sm:col-span-2">
              <span className="text-gray-500 text-xs mb-1">Địa chỉ</span>
              <span className="font-medium text-gray-800 flex items-start">
                <EnvironmentOutlined className="mr-2 mt-0.5 text-gray-400" />
                {patientRecord?.address || "---"}
              </span>
            </div>
          </div>
        </div>

        {/* Thông tin khám bệnh (triệu chứng, ghi chú) */}
        {(symptoms || note) && (
          <>
            <Divider className="m-0! border-gray-100!" />
            <div className="p-5 md:p-6">
              <div className="font-semibold text-gray-800 mb-3 text-base uppercase tracking-wide">
                Thông tin khám bệnh
              </div>
              {symptoms && (
                <div className="mb-3">
                  <span className="text-gray-500 text-sm">
                    Triệu chứng / Bệnh lý
                  </span>
                  <p className="text-gray-800 mt-1 bg-gray-50 p-3 rounded-lg">
                    {symptoms}
                  </p>
                </div>
              )}
              {note && (
                <div>
                  <span className="text-gray-500 text-sm">Ghi chú</span>
                  <p className="text-gray-800 mt-1 bg-gray-50 p-3 rounded-lg">
                    {note}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <Divider className="m-0! border-dashed! border-gray-200!" />

        {/* Tổng thanh toán */}
        <div className="p-5 md:p-6 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="text-gray-800 font-semibold text-base">
              Phí khám chuyên gia
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              * Giá mang tính chất dự kiến, chưa bao gồm các chỉ định cận lâm
              sàng.
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600 bg-white px-4 py-2 rounded-xl border border-green-100 shadow-sm">
            {doctor?.consultationFee?.toLocaleString()} đ
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step3Confirm;
