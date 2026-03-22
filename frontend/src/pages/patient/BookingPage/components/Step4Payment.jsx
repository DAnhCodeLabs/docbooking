import {
  BankOutlined,
  CheckCircleFilled,
  ShopOutlined,
} from "@ant-design/icons";
import { Alert, Button, Typography } from "antd";
import { useState } from "react";

const { Title, Text } = Typography;

const Step4Payment = ({ bookingData, onConfirm, submitting }) => {
  const [paymentMethod, setPaymentMethod] = useState("online");

  return (
    <div className="max-w-2xl mx-auto">
      <Title level={4} className="mb-6! text-gray-800! text-center!">
        Phương thức thanh toán
      </Title>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Lựa chọn Online */}
        <div
          onClick={() => setPaymentMethod("online")}
          className={`
            relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200
            ${paymentMethod === "online" ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"}
          `}
        >
          {paymentMethod === "online" && (
            <CheckCircleFilled className="absolute top-3 right-3 text-blue-500! text-xl!" />
          )}
          <div
            className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center text-xl ${paymentMethod === "online" ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-500"}`}
          >
            <BankOutlined className="m-0!" />
          </div>
          <div
            className={`font-semibold text-lg ${paymentMethod === "online" ? "text-blue-800" : "text-gray-700"}`}
          >
            Trực tuyến
          </div>
          <div className="text-sm text-gray-500 mt-1">
            VNPay, Momo, Thẻ tín dụng
          </div>
        </div>

        {/* Lựa chọn Tại viện */}
        <div
          onClick={() => setPaymentMethod("clinic")}
          className={`
            relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200
            ${paymentMethod === "clinic" ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"}
          `}
        >
          {paymentMethod === "clinic" && (
            <CheckCircleFilled className="absolute top-3 right-3 text-blue-500! text-xl!" />
          )}
          <div
            className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center text-xl ${paymentMethod === "clinic" ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-500"}`}
          >
            <ShopOutlined className="m-0!" />
          </div>
          <div
            className={`font-semibold text-lg ${paymentMethod === "clinic" ? "text-blue-800" : "text-gray-700"}`}
          >
            Tại phòng khám
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Thanh toán tại quầy thu ngân
          </div>
        </div>
      </div>

      <Alert
        message={
          paymentMethod === "online"
            ? "Thanh toán an toàn qua cổng điện tử"
            : "Thanh toán tiện lợi tại cơ sở"
        }
        description={
          paymentMethod === "online"
            ? "Hệ thống sẽ chuyển hướng bạn đến cổng thanh toán VNPay an toàn tuyệt đối. Vui lòng không đóng trình duyệt trong quá trình này."
            : "Bạn vui lòng thanh toán phí khám tại quầy lễ tân trước khi vào gặp bác sĩ."
        }
        type="info"
        showIcon
        className=" mb-8!"
      />

      <div className="bg-gray-800 rounded-xl p-6 text-white flex justify-between items-center mb-6 shadow-md">
        <div>
          <div className="text-gray-300 text-sm font-medium">
            Tổng tiền cần thanh toán
          </div>
          <div className="text-xl font-bold mt-1 text-white">
            {bookingData.doctor?.consultationFee?.toLocaleString()} VNĐ
          </div>
        </div>
      </div>

      <Button
        type="primary"
        size="large"
        block
        onClick={onConfirm}
        loading={submitting}
        disabled={submitting}
        className="h-14!  text-lg! font-semibold! shadow-md! bg-blue-600! hover:bg-blue-700! border-none!"
      >
        {paymentMethod === "online"
          ? "Xác nhận & Thanh toán ngay"
          : "Hoàn tất đặt lịch"}
      </Button>
    </div>
  );
};

export default Step4Payment;
