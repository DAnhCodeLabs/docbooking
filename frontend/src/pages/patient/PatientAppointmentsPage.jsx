import {
  Button,
  Input,
  message,
  Modal,
  Rate,
  Tabs,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { publicApi } from "./publicApi";

import AppointmentTablePatient from "@/components/AppointmentTablePatient";
import { httpGet, httpPost } from "@/services/http";
import { HistoryOutlined, ScheduleOutlined } from "@ant-design/icons";
import AppointmentDetailDrawer from "../dashboard/ManageAppointments/AppointmentDetailDrawer";
import CancelAppointmentModal from "../dashboard/ManageAppointments/CancelAppointmentModal";

const { Title, Text } = Typography;
const { TextArea } = Input;

const statusMap = {
  confirmed: {
    color: "blue",
    text: "Chờ check-in",
    bg: "bg-blue-50",
    textCol: "text-blue-600",
  },
  checked_in: {
    color: "gold",
    text: "Đã check-in",
    bg: "bg-amber-50",
    textCol: "text-amber-600",
  },
  completed: {
    color: "green",
    text: "Hoàn thành",
    bg: "bg-emerald-50",
    textCol: "text-emerald-600",
  },
  cancelled: {
    color: "red",
    text: "Đã hủy",
    bg: "bg-rose-50",
    textCol: "text-rose-600",
  },
};

const PatientAppointmentsPage = () => {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);

  // Review state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedAppointmentForReview, setSelectedAppointmentForReview] =
    useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  const today = dayjs().startOf("day");

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let params = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (activeTab === "upcoming") {
        params.dateFrom = today.format("YYYY-MM-DD");
        params.status = "confirmed,checked_in";
      } else {
        params.status = "completed,cancelled";
      }

      const res = await publicApi.getMyAppointments(params);
      let appointmentsData = res.appointments || [];

      try {
        const reviewsRes = await httpGet("/reviews/my", { limit: 100 });
        const reviewedAppointmentIds = new Set(
          (reviewsRes.reviews || []).map((r) => r.appointmentId?.toString()),
        );
        appointmentsData = appointmentsData.map((apt) => ({
          ...apt,
          reviewed: reviewedAppointmentIds.has(apt._id),
        }));
      } catch (reviewErr) {
        console.error("Không thể lấy danh sách review:", reviewErr);
      }

      setAppointments(appointmentsData);
      setPagination((prev) => ({ ...prev, total: res.total || 0 }));
    } catch (error) {
      console.error("Lỗi lấy danh sách:", error);
      message.error("Không thể tải danh sách lịch hẹn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [activeTab, pagination.current, pagination.pageSize]);

  // --- Handlers ---
  const handleViewDetail = (record) => {
    setSelectedAppointment(record);
    setDetailVisible(true);
  };

  const handleCancelClick = (record) => {
    setAppointmentToCancel(record);
    setCancelModalVisible(true);
  };

  const handleCancelConfirm = async (reason) => {
    if (!appointmentToCancel) return;
    setCancelLoading(true);
    try {
      await publicApi.cancelAppointment(appointmentToCancel._id, reason);
      message.success("Hủy lịch khám thành công.");
      setCancelModalVisible(false);
      setAppointmentToCancel(null);
      fetchAppointments();
      if (
        detailVisible &&
        selectedAppointment?._id === appointmentToCancel._id
      ) {
        setDetailVisible(false);
        setSelectedAppointment(null);
      }
    } catch (error) {
      message.error(
        error?.message || "Hủy lịch thất bại. Vui lòng thử lại sau.",
      );
    } finally {
      setCancelLoading(false);
    }
  };

  // Review handlers
  const handleOpenReviewModal = (record) => {
    setSelectedAppointmentForReview(record);
    setReviewRating(0);
    setReviewComment("");
    setReviewModalVisible(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewRating || reviewRating < 1) {
      message.warning("Vui lòng chọn số sao đánh giá.");
      return;
    }
    if (reviewComment.length > 500) {
      message.warning("Nhận xét không được vượt quá 500 ký tự.");
      return;
    }

    setReviewLoading(true);
    try {
      await httpPost("/reviews", {
        appointmentId: selectedAppointmentForReview._id,
        rating: reviewRating,
        comment: reviewComment,
      });
      setAppointments((prev) =>
        prev.map((apt) =>
          apt._id === selectedAppointmentForReview._id
            ? { ...apt, reviewed: true }
            : apt,
        ),
      );
      setReviewModalVisible(false);
      setSelectedAppointmentForReview(null);
    } catch (error) {
      if (error?.status === 409) {
        message.error("Bạn đã đánh giá lịch hẹn này rồi.");
        setAppointments((prev) =>
          prev.map((apt) =>
            apt._id === selectedAppointmentForReview._id
              ? { ...apt, reviewed: true }
              : apt,
          ),
        );
      } else {
        message.error(error?.message || "Đánh giá thất bại, vui lòng thử lại.");
      }
      setReviewModalVisible(false);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6 md:mb-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
          <div>
            <Title
              level={2}
              className="m-0! text-slate-800! font-bold! tracking-tight!"
            >
              Lịch sử Khám bệnh
            </Title>
            <Text className="text-slate-500! mt-2! block! text-sm!">
              Theo dõi và quản lý hồ sơ y tế, lịch hẹn sắp tới của bạn một cách
              dễ dàng.
            </Text>
          </div>
          <div className="flex gap-2">
            <Tag
              color="blue"
              className="m-0! rounded-full! px-4! py-1.5! border-0! bg-blue-50! text-blue-600! font-semibold! text-sm!"
            >
              Tổng số: {pagination.total} hồ sơ
            </Tag>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              setPagination({ current: 1, pageSize: 10, total: 0 });
            }}
            size="large"
            className="[&_.ant-tabs-nav]:px-6! [&_.ant-tabs-nav]:pt-4! [&_.ant-tabs-nav]:mb-0! [&_.ant-tabs-nav::before]:border-slate-100!"
            items={[
              {
                key: "upcoming",
                label: (
                  <span className="font-medium px-2 text-[15px]">
                    <ScheduleOutlined className="mr-2" />
                    Lịch sắp tới
                  </span>
                ),
                children: (
                  <AppointmentTablePatient
                    appointments={appointments}
                    loading={loading}
                    pagination={pagination}
                    setPagination={setPagination}
                    statusMap={statusMap}
                    onViewDetail={handleViewDetail}
                    onCancelClick={handleCancelClick}
                    onReviewClick={handleOpenReviewModal}
                    isPast={false}
                  />
                ),
              },
              {
                key: "past",
                label: (
                  <span className="font-medium px-2 text-[15px]">
                    <HistoryOutlined className="mr-2" />
                    Lịch đã qua
                  </span>
                ),
                children: (
                  <AppointmentTablePatient
                    appointments={appointments}
                    loading={loading}
                    pagination={pagination}
                    setPagination={setPagination}
                    statusMap={statusMap}
                    onViewDetail={handleViewDetail}
                    onCancelClick={handleCancelClick}
                    onReviewClick={handleOpenReviewModal}
                    isPast={true}
                  />
                ),
              },
            ]}
          />
        </div>

        {/* Drawers & Modals */}
        <AppointmentDetailDrawer
          visible={detailVisible}
          onClose={() => setDetailVisible(false)}
          appointment={selectedAppointment}
        />

        <CancelAppointmentModal
          visible={cancelModalVisible}
          onCancel={() => setCancelModalVisible(false)}
          onConfirm={handleCancelConfirm}
          loading={cancelLoading}
        />

        <Modal
          title={
            <span className="text-lg font-bold text-slate-800">
              Đánh giá chất lượng khám
            </span>
          }
          open={reviewModalVisible}
          onCancel={() => setReviewModalVisible(false)}
          footer={null}
          width={500}
          destroyOnClose
          className="[&_.ant-modal-content]:rounded-2xl! [&_.ant-modal-content]:p-6!"
        >
          <div className="py-2">
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg font-bold">
                {selectedAppointmentForReview?.doctor?.fullName?.charAt(0) ||
                  "BS"}
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-0.5">
                  Bác sĩ phụ trách
                </div>
                <div className="font-bold text-slate-800 text-base">
                  {selectedAppointmentForReview?.doctor?.fullName ||
                    "Chưa cập nhật"}
                </div>
              </div>
            </div>

            <div className="mb-6 text-center">
              <div className="font-semibold text-slate-700 mb-3 text-sm">
                Mức độ hài lòng của bạn
              </div>
              <Rate
                className="text-3xl!"
                value={reviewRating}
                onChange={setReviewRating}
              />
            </div>

            <div className="mb-6">
              <div className="font-semibold text-slate-700 mb-2 text-sm">
                Chia sẻ trải nghiệm (Tùy chọn)
              </div>
              <TextArea
                className="rounded-xl! p-3! border-slate-200! hover:border-blue-400! focus:border-blue-500! focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)]!"
                rows={4}
                maxLength={500}
                showCount
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Dịch vụ, thái độ của bác sĩ, cơ sở vật chất..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                className="rounded-lg! font-medium! h-10! px-6!"
                onClick={() => setReviewModalVisible(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                type="primary"
                className="bg-blue-600! hover:bg-blue-700! rounded-lg! font-medium! h-10! px-6! shadow-none!"
                loading={reviewLoading}
                onClick={handleSubmitReview}
              >
                Gửi đánh giá
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default PatientAppointmentsPage;
