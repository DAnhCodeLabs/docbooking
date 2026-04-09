import Loading from "@/components/Loading";
import { httpGet } from "@/services/http"; // thêm import
import { Button, Result, Spin } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmPayment = async () => {
      const responseCode = searchParams.get("vnp_ResponseCode");
      const transactionNo = searchParams.get("vnp_TransactionNo");
      const amount = searchParams.get("vnp_Amount");
      const orderInfo = searchParams.get("vnp_OrderInfo");

      // Gửi request xác nhận thanh toán về backend
      try {
        const params = Object.fromEntries(searchParams.entries());
        await httpGet("/payments/confirm", params, false);
        // Nếu không có lỗi (không vào catch), coi như thành công
        setStatus("success");
        setMessage("Thanh toán thành công! Lịch hẹn của bạn đã được xác nhận.");
      } catch (error) {
        setStatus("error");
        setMessage(error?.message || "Có lỗi xảy ra khi xác nhận thanh toán.");
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Result
        status={status}
        title={
          status === "success" ? "Thanh toán thành công" : "Thanh toán thất bại"
        }
        subTitle={message}
        extra={[
          <Button
            type="primary"
            key="appointments"
            onClick={() => navigate("/appointments")}
          >
            Xem lịch hẹn
          </Button>,
          <Button key="home" onClick={() => navigate("/")}>
            Về trang chủ
          </Button>,
        ]}
      />
    </div>
  );
};

export default PaymentResultPage;
