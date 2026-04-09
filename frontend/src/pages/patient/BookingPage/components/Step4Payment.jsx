import { Alert, Typography } from "antd";
import {
  BankOutlined,
  ShopOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const Step4Payment = ({ bookingData, onPaymentMethodChange }) => {
  return (
    <div className="max-w-2xl mx-auto">
      <Title
        level={5}
        className="mb-6! text-gray-800! text-center! font-semibold!"
      >
        Chọn phương thức thanh toán
      </Title>

      {/* Payment Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Card: Offline */}
        <div
          onClick={() => onPaymentMethodChange("offline")}
          className={`
            relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none
            ${
              bookingData.paymentMethod === "offline"
                ? "border-blue-500 bg-blue-50/50 shadow-sm"
                : "border-gray-200 bg-white hover:border-blue-300"
            }
          `}
        >
          {bookingData.paymentMethod === "offline" && (
            <CheckCircleFilled className="absolute top-4 right-4 text-blue-500! text-xl!" />
          )}
          <div
            className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl ${bookingData.paymentMethod === "offline" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}
          >
            <ShopOutlined className="m-0!" />
          </div>
          <div
            className={`font-bold text-base mb-1 ${bookingData.paymentMethod === "offline" ? "text-blue-900" : "text-gray-800"}`}
          >
            Tại phòng khám
          </div>
          <div className="text-xs text-gray-500 leading-relaxed">
            Thanh toán trực tiếp bằng tiền mặt hoặc quẹt thẻ tại quầy lễ tân khi
            đến khám.
          </div>
        </div>

        {/* Card: Online */}
        <div
          onClick={() => onPaymentMethodChange("online")}
          className={`
            relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none
            ${
              bookingData.paymentMethod === "online"
                ? "border-blue-500 bg-blue-50/50 shadow-sm"
                : "border-gray-200 bg-white hover:border-blue-300"
            }
          `}
        >
          {bookingData.paymentMethod === "online" && (
            <CheckCircleFilled className="absolute top-4 right-4 text-blue-500! text-xl!" />
          )}
          <div
            className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl ${bookingData.paymentMethod === "online" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}
          >
            <BankOutlined className="m-0!" />
          </div>
          <div
            className={`font-bold text-base mb-1 ${bookingData.paymentMethod === "online" ? "text-blue-900" : "text-gray-800"}`}
          >
            Trực tuyến (VNPAY)
          </div>
          <div className="text-xs text-gray-500 leading-relaxed">
            Thanh toán ngay qua ví điện tử, thẻ ATM hoặc thẻ tín dụng để đảm bảo
            giữ chỗ.
          </div>
        </div>
      </div>

      {bookingData.paymentMethod === "online" ? (
        <Alert
          message={
            <span className="font-semibold text-blue-800">
              Cổng thanh toán an toàn
            </span>
          }
          description="Hệ thống sẽ chuyển hướng bạn sang cổng VNPAY. Vui lòng hoàn tất giao dịch trong vòng 15 phút để hệ thống ghi nhận lịch hẹn."
          type="info"
          showIcon
          className="rounded-xl! border-blue-200! bg-blue-50! py-4! mb-6!"
        />
      ) : (
        <Alert
          message={
            <span className="font-semibold text-gray-700">
              Lưu ý thanh toán tại quầy
            </span>
          }
          description="Lịch hẹn của bạn sẽ ở trạng thái 'Chờ xác nhận'. Vui lòng có mặt sớm 15 phút để hoàn tất thủ tục thanh toán."
          type="info"
          showIcon
          className="rounded-xl! border-gray-200! bg-gray-50! py-4! mb-6!"
        />
      )}

      {/* Order Summary Box */}
      <div className="bg-gray-900 rounded-2xl p-5 md:p-6 text-white flex justify-between items-center shadow-lg">
        <div>
          <div className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
            Tổng thanh toán
          </div>
          <div className="text-2xl font-bold text-white">
            {bookingData.doctor?.consultationFee?.toLocaleString()} VNĐ
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step4Payment;
