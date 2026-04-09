import Loading from "@/components/Loading";
import {
  Alert,
  Button,
  Card,
  Col,
  message,
  Row,
  Steps,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bookingApi } from "./bookingApi";
import DoctorInfoCard from "./components/DoctorInfoCard";
import Step1DateTime from "./components/Step1DateTime";
import Step2PatientInfo from "./components/Step2PatientInfo";
import Step3Confirm from "./components/Step3Confirm";
import Step4Payment from "./components/Step4Payment";

const { Title, Text } = Typography;

const BookingPage = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState({
    doctor: null,
    selectedSlot: null,
    patientRecord: null,
    isForSelf: true,
    note: "",
    symptoms: "",
    paymentMethod: "offline",
  });

  const handleStep2Complete = (data) => {
    setBookingData((prev) => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await bookingApi.getDoctorById(doctorId);
        setDoctor(res);
        setBookingData((prev) => ({ ...prev, doctor: res }));
      } catch (err) {
        message.error("Không thể tải thông tin bác sĩ");
        navigate("/doctors");
      } finally {
        setLoading(false);
      }
    };
    if (doctorId) fetchDoctor();
  }, [doctorId, navigate]);

  const handleConfirmBooking = async () => {
    if (!bookingData.selectedSlot || !bookingData.patientRecord) {
      message.warning("Vui lòng chọn đầy đủ thông tin.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        slotId: bookingData.selectedSlot.slotId,
        medicalRecordId: bookingData.patientRecord._id,
        note: bookingData.note,
        symptoms: bookingData.symptoms,
        paymentMethod: bookingData.paymentMethod,
      };

      const response = await bookingApi.createAppointment(payload);
      if (response?.paymentUrl) {
        window.location.href = response.paymentUrl;
      } else {
        message.success(
          "Đặt lịch thành công! Vui lòng kiểm tra email để nhận mã QR.",
        );
        navigate("/appointments");
      }
    } catch (error) {
      message.error(error?.message || "Đặt lịch thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = async () => {
    if (currentStep === 0 && !bookingData.selectedSlot) {
      message.warning("Vui lòng chọn ngày và giờ khám.");
      return;
    }
    if (currentStep === 1 && !bookingData.patientRecord) {
      message.warning("Vui lòng chọn hoặc tạo hồ sơ bệnh nhân.");
      return;
    }
    if (currentStep === 3) {
      handleConfirmBooking();
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const prev = () => setCurrentStep(currentStep - 1);

  const steps = [
    {
      title: "Thời gian",
      content: (
        <Step1DateTime
          doctor={doctor}
          onSelectSlot={(slot) =>
            setBookingData((prev) => ({ ...prev, selectedSlot: slot }))
          }
          selectedSlot={bookingData.selectedSlot}
        />
      ),
    },
    {
      title: "Hồ sơ",
      content: (
        <Step2PatientInfo
          onComplete={handleStep2Complete}
          initialData={bookingData}
        />
      ),
    },
    { title: "Xác nhận", content: <Step3Confirm bookingData={bookingData} /> },
    {
      title: "Thanh toán",
      content: (
        <Step4Payment
          bookingData={bookingData}
          onConfirm={handleConfirmBooking}
          submitting={submitting}
          onPaymentMethodChange={(method) =>
            setBookingData((prev) => ({ ...prev, paymentMethod: method }))
          }
        />
      ),
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-6 md:py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6 md:mb-8 text-center md:text-left">
          <Title level={2} className="m-0! text-gray-800! font-bold!">
            Đặt lịch khám chuyên gia
          </Title>
          <Text className="text-gray-500! mt-2! text-sm! md:text-base! block!">
            Hoàn thiện 4 bước dưới đây để xác nhận lịch hẹn của bạn tại hệ
            thống.
          </Text>
        </div>

        <Row gutter={[24, 24]} className="flex-col-reverse lg:flex-row!">
          {/* Cột trái: Form đặt lịch */}
          <Col xs={24} lg={16}>
            <Card className="shadow-sm! border-gray-100! rounded-2xl! overflow-hidden! p-0! [&>.ant-card-body]:p-0!">
              {/* === BẮT ĐẦU VÙNG STEPPER ĐÃ SỬA === */}
              <div className="p-4 pt-6 md:p-6 lg:px-8 border-b border-gray-100 bg-white">
                <Steps
                  current={currentStep}
                  items={steps.map((s) => ({ title: s.title }))}
                  size="small"
                  responsive={false} // QUAN TRỌNG: Ngăn chặn tự động chuyển thành hàng dọc trên Mobile
                  labelPlacement="vertical" // QUAN TRỌNG: Đẩy Text xuống dưới Icon cho gọn
                  className="mb-0! max-w-2xl! mx-auto!
                    [&_.ant-steps-item-title]:text-[11px]! sm:[&_.ant-steps-item-title]:text-sm!
                    [&_.ant-steps-item-title]:mt-1! md:[&_.ant-steps-item-title]:mt-2!
                    [&_.ant-steps-item-icon]:w-7! [&_.ant-steps-item-icon]:h-7! [&_.ant-steps-item-icon]:leading-6.5!
                    [&_.ant-steps-item-tail]:top-3.25! [&_.ant-steps-item-tail]:mx-0!
                  "
                />
              </div>
              {/* === KẾT THÚC VÙNG STEPPER ĐÃ SỬA === */}

              <div className="p-4 md:p-6 lg:p-8 min-h-100 bg-white">
                {steps[currentStep].content}
              </div>

              {/* Bottom Action Bar */}
              <div className="px-4 md:px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                {currentStep > 0 && (
                  <Button
                    size="large"
                    onClick={prev}
                    disabled={submitting}
                    className="rounded-lg! font-medium!"
                  >
                    Quay lại
                  </Button>
                )}
                {/* Khoảng trống để đẩy nút sang phải nếu không có nút quay lại */}
                <div className="flex-1"></div>

                {/* Chỉ hiển thị nút "Tiếp tục" nếu không phải bước cuối và không phải bước hồ sơ (index=1) */}
                {currentStep < steps.length - 1 && currentStep !== 1 && (
                  <Button
                    type="primary"
                    size="large"
                    onClick={next}
                    className="rounded-lg! font-medium! bg-blue-600! hover:bg-blue-700! border-none! px-6! md:px-8!"
                  >
                    Tiếp tục
                  </Button>
                )}

                {/* Nút Xác nhận chỉ hiển thị ở bước cuối (thanh toán) */}
                {currentStep === steps.length - 1 && (
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleConfirmBooking}
                    loading={submitting}
                    className="rounded-lg! font-medium! bg-green-600! hover:bg-green-700! border-none! px-6! md:px-8!"
                  >
                    Xác nhận
                  </Button>
                )}
              </div>
            </Card>

            <Alert
              message={
                <span className="font-semibold text-orange-800">
                  Lưu ý khi đến khám
                </span>
              }
              description="Vui lòng đến trước 15 phút để làm thủ tục. Nhớ mang theo CCCD và các kết quả xét nghiệm/đơn thuốc cũ (nếu có)."
              type="warning"
              showIcon
              className="mt-6! rounded-xl! border-orange-200! bg-orange-50! py-3!"
            />
          </Col>

          {/* Cột phải: Thông tin bác sĩ */}
          <Col xs={24} lg={8}>
            <div className="sticky top-24">
              {loading ? (
                <Card className="shadow-sm! border-gray-100! rounded-2xl! overflow-hidden!">
                  <div className="flex justify-center items-center p-10">
                    <Loading />
                  </div>
                </Card>
              ) : doctor ? (
                <DoctorInfoCard doctor={doctor} />
              ) : (
                <Card className="shadow-sm! border-gray-100! rounded-2xl! overflow-hidden!">
                  <div className="text-center p-8 text-red-500 font-medium">
                    Không tìm thấy bác sĩ
                  </div>
                </Card>
              )}
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default BookingPage;
