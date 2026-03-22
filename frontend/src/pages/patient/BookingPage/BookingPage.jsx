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

const { Title } = Typography;

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
  });

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
      await bookingApi.createAppointment({
        slotId: bookingData.selectedSlot.slotId,
        medicalRecordId: bookingData.patientRecord._id,
        note: bookingData.note,
        symptoms: bookingData.symptoms,
      });
      message.success(
        "Đặt lịch thành công! Vui lòng kiểm tra email để nhận mã QR.",
      );
      navigate("/appointments"); // chuyển sang trang lịch sử đặt lịch
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
    // Nếu là bước cuối (thanh toán), thực hiện tạo appointment
    if (currentStep === 3) {
      try {
        await bookingApi.createAppointment({
          slotId: bookingData.selectedSlot.slotId,
          medicalRecordId: bookingData.patientRecord._id,
          note: bookingData.note,
          symptoms: bookingData.symptoms,
        });
        message.success(
          "Đặt lịch thành công! Vui lòng kiểm tra email để nhận QR code.",
        );
        navigate("/appointments"); // hoặc trang thành công
      } catch (err) {
        message.error("Đặt lịch thất bại. Vui lòng thử lại.");
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const prev = () => setCurrentStep(currentStep - 1);

  const steps = [
    {
      title: "Ngày & Giờ",
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
      title: "Hồ sơ bệnh nhân",
      content: (
        <Step2PatientInfo
          onComplete={(data) =>
            setBookingData((prev) => ({ ...prev, ...data }))
          }
          initialData={bookingData}
        />
      ),
    },
    {
      title: "Xác nhận",
      content: <Step3Confirm bookingData={bookingData} />,
    },
    {
      title: "Thanh toán",
      content: (
        <Step4Payment
          bookingData={bookingData}
          onConfirm={handleConfirmBooking}
          submitting={submitting}
        />
      ),
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
        <div className="mb-8">
          <Title level={2} className="m-0! text-gray-800! font-bold!">
            Đặt lịch khám chuyên gia
          </Title>
          <p className="text-gray-500 mt-2 text-base">
            Vui lòng hoàn thiện các bước dưới đây để xác nhận lịch hẹn của bạn.
          </p>
        </div>

        <Row gutter={[32, 32]}>
          {/* Cột trái: Form đặt lịch */}
          <Col xs={24} lg={16}>
            <Card className="shadow-sm! border-transparent! rounded-2xl! overflow-hidden!">
              <div className="p-2 md:p-6 border-b border-gray-100">
                <Steps
                  current={currentStep}
                  items={steps.map((s) => ({ title: s.title }))}
                  className="mb-2!"
                />
              </div>

              <div className="p-4 md:p-8 min-h-100">
                {steps[currentStep].content}
              </div>

              <div className="px-4 md:px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center rounded-b-2xl">
                {currentStep > 0 ? (
                  <Button size="large" onClick={prev} className=" font-medium!">
                    Quay lại
                  </Button>
                ) : (
                  <div />
                )}{" "}
                {/* Placeholder để đẩy nút Next sang phải */}
                {currentStep < steps.length - 1 && (
                  <Button
                    type="primary"
                    size="large"
                    onClick={next}
                    className=" font-medium! bg-blue-600! hover:bg-blue-700!"
                  >
                    Tiếp tục
                  </Button>
                )}
              </div>
            </Card>

            <Alert
              message={
                <span className="font-semibold text-yellow-800">
                  Lưu ý quan trọng
                </span>
              }
              description="Vui lòng đến khám trước 10-15 phút để làm thủ tục và chuẩn bị hồ sơ. Mang theo CCCD và các giấy tờ y tế liên quan."
              type="warning"
              showIcon
              className="mt-6!  border-yellow-200! bg-yellow-50!"
            />
          </Col>

          {/* Cột phải: Thông tin bác sĩ sticky */}
          <Col xs={24} lg={8}>
            <div className="sticky top-24">
              {loading ? (
                <Card className="shadow-sm! border-gray-200! rounded-2xl! overflow-hidden!">
                  <div className="flex justify-center items-center p-8">
                    <Loading />
                  </div>
                </Card>
              ) : doctor ? (
                <DoctorInfoCard doctor={doctor} />
              ) : (
                <Card className="shadow-sm! border-gray-200! rounded-2xl! overflow-hidden!">
                  <div className="text-center p-8 text-red-500">
                    Không tìm thấy thông tin bác sĩ
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
