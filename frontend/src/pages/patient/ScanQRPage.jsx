import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CameraOutlined,
  UploadOutlined,
  EnterOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import {
  Alert,
  Button,
  Card,
  Input,
  message,
  Spin,
  Typography,
  Space,
  Divider,
} from "antd";

const { Title, Text } = Typography;

// --- COMPONENT: KHUNG CAMERA ---
const ScannerPanel = ({
  videoRef,
  scanning,
  startScanner,
  stopScanner,
  cameraError,
}) => (
  <Card
    title={
      <span className="font-semibold text-gray-700">
        <CameraOutlined className="mr-2" />
        Quét Camera Trực Tiếp
      </span>
    }
    className="shadow-sm! border-gray-200! rounded-lg! h-full!"
  >
    <div className="flex flex-col items-center">
      {cameraError && (
        <Alert
          message="Lỗi thiết bị"
          description={cameraError}
          type="error"
          showIcon
          className="mb-4! w-full! rounded-md!"
        />
      )}

      <div className="relative w-full aspect-video bg-gray-900 rounded-md overflow-hidden border border-gray-300 flex items-center justify-center mb-4">
        {!scanning && (
          <div className="absolute flex flex-col items-center text-gray-400">
            <CameraOutlined className="text-3xl! mb-2!" />
            <span className="text-sm">Camera đang tắt</span>
          </div>
        )}
        <video
          ref={videoRef}
          className="w-full h-full object-cover relative z-10"
          style={{ display: scanning ? "block" : "none" }}
          playsInline
        />
        {/* Khung focus đơn giản chuẩn công nghiệp */}
        {scanning && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 border border-green-500 relative">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-green-500"></div>
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-green-500"></div>
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-green-500"></div>
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-green-500"></div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full flex gap-3">
        {!scanning ? (
          <Button
            type="primary"
            onClick={startScanner}
            className="flex-1! rounded-md!"
          >
            Bật Camera
          </Button>
        ) : (
          <Button danger onClick={stopScanner} className="flex-1! rounded-md!">
            Tắt Camera
          </Button>
        )}
      </div>
    </div>
  </Card>
);

// --- COMPONENT: PHƯƠNG THỨC THAY THẾ ---
const AlternativePanel = ({
  fileInputRef,
  handleFileSelect,
  processingFile,
  manualId,
  setManualId,
  handleManualSubmit,
}) => (
  <Card
    title={<span className="font-semibold text-gray-700">Xử lý Ngoại lệ</span>}
    className="shadow-sm! border-gray-200! rounded-lg! h-full!"
  >
    <div className="mb-6">
      <Text className="text-sm! text-gray-500! block! mb-2!">
        1. Tải lên tệp chứa mã QR
      </Text>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        icon={<UploadOutlined />}
        onClick={() => fileInputRef.current?.click()}
        disabled={processingFile}
        className="w-full! rounded-md!"
      >
        {processingFile ? "Đang xử lý..." : "Chọn tệp từ máy tính"}
      </Button>
    </div>

    <Divider className="my-4! border-gray-200!" />

    <div>
      <Text className="text-sm! text-gray-500! block! mb-2!">
        2. Nhập thủ công mã ID
      </Text>
      <Space.Compact className="w-full!">
        <Input
          placeholder="Nhập 24 ký tự ID lịch hẹn..."
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
          className="rounded-l-md! font-mono! text-sm!"
        />
        <Button
          type="primary"
          icon={<EnterOutlined />}
          onClick={handleManualSubmit}
          disabled={!manualId.trim()}
          className="rounded-r-md!"
        >
          Xác nhận
        </Button>
      </Space.Compact>
    </div>

    <div className="mt-6 bg-blue-50 p-3 rounded-md border border-blue-100">
      <Text className="text-xs! text-blue-800! block!">
        <strong>Hướng dẫn:</strong> Hệ thống ưu tiên dùng máy quét chuyên dụng
        hoặc camera. Chỉ dùng chức năng tải ảnh/nhập tay khi thiết bị quét gặp
        sự cố.
      </Text>
    </div>
  </Card>
);

// --- COMPONENT CHÍNH ---
const ScanQRPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const codeReader = useRef(new BrowserMultiFormatReader());

  const [scanning, setScanning] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [manualId, setManualId] = useState("");
  const [cameraError, setCameraError] = useState(null);

  const handleScanSuccess = (decodedText) => {
    let appointmentId = null;
    if (decodedText.includes("/checkin/")) {
      appointmentId = decodedText.split("/checkin/")[1]?.split("?")[0];
    } else if (decodedText.match(/^[0-9a-fA-F]{24}$/)) {
      appointmentId = decodedText;
    }

    if (appointmentId) {
      message.success("Nhận diện thành công. Đang tải dữ liệu...");
      stopScanner();
      navigate(`/checkin/${appointmentId}`);
    } else {
      message.error("Mã QR không thuộc hệ thống.");
    }
  };

  const startScanner = async () => {
    if (scanning) return;
    try {
      const video = videoRef.current;
      if (!video) throw new Error("DOM Error");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      video.srcObject = stream;
      await video.play();
      setScanning(true);
      setCameraError(null);

      codeReader.current.decodeFromVideoDevice(
        undefined,
        video,
        (result, err) => {
          if (result) handleScanSuccess(result.getText());
          if (err && !(err instanceof NotFoundException))
            console.warn("Scan warn:", err);
        },
      );
    } catch (err) {
      setCameraError(err.message || "Không thể truy cập Camera.");
    }
  };

  const stopScanner = () => {
    codeReader.current.reset();
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return message.error("Vui lòng chọn file ảnh.");
    setProcessingFile(true);

    try {
      const imgElement = new Image();
      imgElement.src = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        imgElement.onload = resolve;
        imgElement.onerror = reject;
      });
      const result = await codeReader.current.decodeFromImage(imgElement);
      if (result?.getText()) handleScanSuccess(result.getText());
      else throw new Error("No QR");
    } catch (err) {
      message.warning("Không tìm thấy mã QR trong ảnh.");
    } finally {
      setProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleManualSubmit = () => {
    const id = manualId.trim();
    if (!id.match(/^[0-9a-fA-F]{24}$/))
      return message.warning("ID không hợp lệ (Cần 24 ký tự).");
    navigate(`/checkin/${id}`);
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-4">
          <div className="p-2 bg-blue-600 text-white rounded-md">
            <QrcodeOutlined className="text-xl!" />
          </div>
          <div>
            <Title level={4} className="m-0! text-gray-800!">
              Phân hệ Check-in
            </Title>
            <Text className="text-sm! text-gray-500!">
              Quét mã QR để ghi nhận bệnh nhân đến phòng khám
            </Text>
          </div>
        </div>

        {/* Dashboard Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <ScannerPanel
              videoRef={videoRef}
              scanning={scanning}
              startScanner={startScanner}
              stopScanner={stopScanner}
              cameraError={cameraError}
            />
          </div>
          <div className="md:col-span-1">
            <AlternativePanel
              fileInputRef={fileInputRef}
              handleFileSelect={handleFileSelect}
              processingFile={processingFile}
              manualId={manualId}
              setManualId={setManualId}
              handleManualSubmit={handleManualSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanQRPage;
