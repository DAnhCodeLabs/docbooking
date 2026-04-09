import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Spin,
  Tag,
  Typography
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bookingApi } from "./BookingPage/bookingApi";

const { Title, Text } = Typography;

// Component hiển thị chi tiết lịch hẹn (đã được nâng cấp giao diện)
const AppointmentDetails = ({ data }) => {
  return (
    <Card
      className="shadow-md! border-gray-100! rounded-xl! mt-6! overflow-hidden!"
      bodyStyle={{ padding: 0 }}
    >
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <CheckCircleOutlined className="text-emerald-500 text-lg" />
          <Title level={5} className="m-0! text-gray-800! font-semibold!">
            Thông tin đặt lịch
          </Title>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {/* Mã hồ sơ */}
          <div className="flex flex-col">
            <Text className="text-xs! uppercase tracking-wide text-gray-400! font-medium! mb-1!">
              Mã hồ sơ
            </Text>
            <div className="flex items-center gap-2">
              <Text copyable className="font-mono! text-sm! text-gray-800!">
                {data?._id || "---"}
              </Text>
            </div>
          </div>

          {/* Trạng thái */}
          <div className="flex flex-col">
            <Text className="text-xs! uppercase tracking-wide text-gray-400! font-medium! mb-1!">
              Trạng thái
            </Text>
            <Tag
              color="success"
              className="w-fit! rounded-full! px-3! py-0.5! text-sm! font-medium! m-0!"
            >
              ĐÃ CHECK-IN
            </Tag>
          </div>

          {/* Họ tên bệnh nhân */}
          <div className="flex flex-col">
            <Text className="text-xs! uppercase tracking-wide text-gray-400! font-medium! mb-1!">
              Họ tên bệnh nhân
            </Text>
            <Text strong className="text-gray-800! text-base!">
              {data?.patientName || "---"}
            </Text>
          </div>

          {/* Thời gian hẹn */}
          <div className="flex flex-col">
            <Text className="text-xs! uppercase tracking-wide text-gray-400! font-medium! mb-1!">
              Thời gian hẹn
            </Text>
            <Text className="text-blue-600! font-semibold!">
              {data?.time || "--:--"} •{" "}
              {data?.date ? dayjs(data.date).format("DD/MM/YYYY") : "---"}
            </Text>
          </div>

          {/* Bác sĩ phụ trách */}
          <div className="flex flex-col">
            <Text className="text-xs! uppercase tracking-wide text-gray-400! font-medium! mb-1!">
              Bác sĩ phụ trách
            </Text>
            <Text className="text-gray-700!">{data?.doctorName || "---"}</Text>
          </div>

          {/* Phòng khám */}
          <div className="flex flex-col">
            <Text className="text-xs! uppercase tracking-wide text-gray-400! font-medium! mb-1!">
              Phòng khám / Cơ sở
            </Text>
            <Text className="text-gray-700!">{data?.clinicName || "---"}</Text>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Component chính
const CheckinPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const performCheckin = async () => {
      try {
        const res = await bookingApi.checkin(id);
        if (res && res.success === false) {
          setError(res.message);
        } else {
          setResult(res);
        }
      } catch (err) {
        setError(err?.message || "Lỗi kết nối máy chủ hoặc mã không hợp lệ.");
      } finally {
        setLoading(false);
      }
    };
    performCheckin();
  }, [id]);

  const handleBack = () => navigate("/scan");

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <Title level={3} className="m-0! text-gray-800! font-bold!">
              Kết quả check-in
            </Title>
            <Text className="text-gray-500! text-sm!">
              Xác thực thông tin bệnh nhân từ mã QR
            </Text>
          </div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            className="rounded-lg! h-10! px-4! shadow-sm! border-gray-300! hover:border-blue-400! transition-all!"
          >
            Quay lại quét QR
          </Button>
        </div>

        {/* Nội dung chính */}
        {loading ? (
          <Card className="shadow-lg! border-0! rounded-2xl! text-center! py-12!">
            <div className="flex flex-col items-center gap-4">
              <Spin size="large" />
              <Text className="text-gray-500!">
                Đang truy vấn dữ liệu hệ thống...
              </Text>
            </div>
          </Card>
        ) : error ? (
          <div className="space-y-6">
            <Alert
              message={
                <span className="font-semibold text-red-700">
                  Check-in thất bại
                </span>
              }
              description={error}
              type="error"
              showIcon
              className="rounded-xl! border-red-200! bg-red-50! px-4! py-3!"
            />
            <Card className="shadow-lg! border-0! rounded-2xl! text-center! py-10!">
              <div className="flex flex-col items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                  <ReloadOutlined className="text-amber-500 text-2xl" />
                </div>
                <Text className="text-gray-500! max-w-md! mx-auto!">
                  Vui lòng kiểm tra lại mã QR hoặc yêu cầu bệnh nhân cung cấp
                  lại lịch hẹn.
                </Text>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleBack}
                  className="rounded-lg! h-10! px-6! shadow-sm!"
                >
                  Thử quét lại
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <Alert
              message={
                <span className="font-semibold text-emerald-700">
                  Check-in thành công
                </span>
              }
              description="Hệ thống đã ghi nhận bệnh nhân có mặt. Vui lòng hướng dẫn bệnh nhân đến khu vực chờ."
              type="success"
              showIcon
              className="rounded-xl! border-emerald-200! bg-emerald-50! px-4! py-3!"
            />
            <AppointmentDetails data={result?.data || result} />
            <div className="flex justify-end pt-4">
              <Button
                type="primary"
                onClick={handleBack}
                className="rounded-lg! h-10! px-6! shadow-sm! bg-blue-600! hover:bg-blue-700! border-0!"
              >
                Tiếp tục check-in ca khác
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckinPage;
