import Loading from "@/components/Loading";
import { TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Input, message, Select, Tabs } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { bookingApi } from "../bookingApi";
import { formatDateForBackend } from "@/utils/date";

const { Option } = Select;

const Step2PatientInfo = ({ onComplete, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState(
    initialData?.isForSelf ? "self" : "other",
  );
  const [selectedSelfRecordId, setSelectedSelfRecordId] = useState(null);
  const [selectedOtherRecordId, setSelectedOtherRecordId] = useState(null);

  // State local cho hồ sơ đã chọn/tạo
  const [patientRecord, setPatientRecord] = useState(
    initialData?.patientRecord || null,
  );
  const [isForSelf, setIsForSelf] = useState(
    initialData?.isForSelf !== undefined ? initialData.isForSelf : true,
  );

  // State cho symptoms và note
  const [symptoms, setSymptoms] = useState(initialData?.symptoms || "");
  const [note, setNote] = useState(initialData?.note || "");

  const [selfForm] = Form.useForm();
  const [otherForm] = Form.useForm();

  const [creatingSelf, setCreatingSelf] = useState(false);
  const [creatingOther, setCreatingOther] = useState(false);

  // Lấy danh sách hồ sơ
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const res = await bookingApi.getMedicalRecords();
        setRecords(res);
        // Nếu chưa chọn hồ sơ và có dữ liệu, tự động chọn hồ sơ đầu tiên (chỉ cho tab self)
        if (activeTab === "self" && res.length > 0 && !selectedSelfRecordId) {
          setSelectedSelfRecordId(res[0]._id);
          setPatientRecord(res[0]);
          setIsForSelf(true);
          // Không gọi onComplete ở đây
        }
      } catch (error) {
        message.error("Không thể tải danh sách hồ sơ");
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [activeTab]);

  // Xử lý chọn hồ sơ có sẵn
  const handleSelectRecord = (recordId, isSelf) => {
    const formToUse = isSelf ? selfForm : otherForm;
    const setId = isSelf ? setSelectedSelfRecordId : setSelectedOtherRecordId;

    if (!recordId) {
      setId(null);
      setPatientRecord(null);
      setIsForSelf(isSelf);
      formToUse.resetFields();
      return;
    }

    const record = records.find((r) => r._id === recordId);
    if (record) {
      setId(recordId);
      setPatientRecord(record);
      setIsForSelf(isSelf);
      formToUse.setFieldsValue({
        fullName: record.fullName,
        phone: record.phone,
        dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
        gender: record.gender,
        cccd: record.cccd,
        address: record.address,
        cccdIssueDate: record.cccdIssueDate
          ? dayjs(record.cccdIssueDate)
          : null,
        cccdIssuePlace: record.cccdIssuePlace,
      });
    }
  };

  // Tạo hồ sơ mới
  const handleCreateRecord = async (values, isSelf) => {
    const setCreating = isSelf ? setCreatingSelf : setCreatingOther;
    const setId = isSelf ? setSelectedSelfRecordId : setSelectedOtherRecordId;
    const formToUse = isSelf ? selfForm : otherForm;

    setCreating(true);
    try {
      const newRecord = await bookingApi.createMedicalRecord({
        ...values,
        dateOfBirth: formatDateForBackend(values.dateOfBirth),
        cccdIssueDate: values.cccdIssueDate
          ? formatDateForBackend(values.cccdIssueDate)
          : null,
      });
      setRecords((prev) => [newRecord, ...prev]);
      setId(newRecord._id);
      setPatientRecord(newRecord);
      setIsForSelf(isSelf);
      formToUse.resetFields();
    } catch (error) {
      message.error(error?.message || "Tạo hồ sơ thất bại");
    } finally {
      setCreating(false);
    }
  };

  // Xác nhận và chuyển bước
  const handleConfirm = () => {
    if (!patientRecord) {
      message.warning("Vui lòng chọn hoặc tạo hồ sơ bệnh nhân.");
      return;
    }
    onComplete({
      patientRecord,
      isForSelf: activeTab === "self",
      symptoms,
      note,
    });
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === "self") {
      setSelectedOtherRecordId(null);
      otherForm.resetFields();
    } else {
      setSelectedSelfRecordId(null);
      selfForm.resetFields();
    }
  };

  // Form chung cho cả 2 tab
  const renderForm = (formInstance, isSelf) => (
    <Form
      form={formInstance}
      layout="vertical"
      onFinish={(vals) => handleCreateRecord(vals, isSelf)}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        <Form.Item
          label={<span className="font-medium text-gray-700">Họ và tên</span>}
          name="fullName"
          rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
        >
          <Input
            size="large"
            placeholder="Nhập họ tên đầy đủ"
            className="rounded-xl!"
          />
        </Form.Item>
        <Form.Item
          label={
            <span className="font-medium text-gray-700">Số điện thoại</span>
          }
          name="phone"
          rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}
        >
          <Input
            size="large"
            placeholder="Nhập số điện thoại"
            className="rounded-xl!"
          />
        </Form.Item>
        <Form.Item
          name="dateOfBirth"
          label={<span className="font-medium text-gray-700">Ngày sinh</span>}
          rules={[{ required: true, message: "Vui lòng chọn ngày sinh" }]}
        >
          <DatePicker
            size="large"
            format="DD/MM/YYYY"
            className="w-full! rounded-xl!"
            placeholder="Chọn ngày"
          />
        </Form.Item>
        <Form.Item
          name="gender"
          label={<span className="font-medium text-gray-700">Giới tính</span>}
          rules={[{ required: true, message: "Vui lòng chọn giới tính" }]}
        >
          <Select
            size="large"
            placeholder="Chọn giới tính"
            className="[&>.ant-select-selector]:rounded-xl!"
          >
            <Option value="male">Nam</Option>
            <Option value="female">Nữ</Option>
            <Option value="other">Khác</Option>
          </Select>
        </Form.Item>
        <Form.Item
          name="cccd"
          label={
            <span className="font-medium text-gray-700">CCCD / Hộ chiếu</span>
          }
          className="md:col-span-2"
          rules={[{ required: true, message: "Vui lòng nhập CCCD" }]}
        >
          <Input
            size="large"
            placeholder="Nhập số CCCD"
            className="rounded-xl!"
          />
        </Form.Item>
        {/* Thêm trường ngày cấp và nơi cấp CCCD */}
        <Form.Item
          name="cccdIssueDate"
          label="Ngày cấp CCCD"
          className="md:col-span-1"
        >
          <DatePicker
            size="large"
            format="DD/MM/YYYY"
            className="w-full! rounded-xl!"
            placeholder="Chọn ngày cấp"
          />
        </Form.Item>
        <Form.Item
          name="cccdIssuePlace"
          label="Nơi cấp CCCD"
          className="md:col-span-1"
        >
          <Input
            size="large"
            placeholder="VD: Cục Cảnh sát QLHC về TTXH"
            className="rounded-xl!"
          />
        </Form.Item>
        <Form.Item
          name="address"
          label={
            <span className="font-medium text-gray-700">Địa chỉ hiện tại</span>
          }
          className="md:col-span-2"
        >
          <Input.TextArea
            rows={2}
            placeholder="Số nhà, đường, phường/xã..."
            className="rounded-xl!"
          />
        </Form.Item>
      </div>
      <div className="flex justify-end mt-2">
        <Button
          type="primary"
          htmlType="submit"
          loading={isSelf ? creatingSelf : creatingOther}
          className="bg-blue-600! hover:bg-blue-700! rounded-lg! border-none! px-6!"
        >
          Tạo mới hồ sơ này
        </Button>
      </div>
    </Form>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        type="card"
        className="[&_.ant-tabs-nav::before]:border-gray-200! [&_.ant-tabs-tab]:bg-gray-50! [&_.ant-tabs-tab-active]:bg-white!"
        items={[
          {
            key: "self",
            label: (
              <span className="px-2 md:px-4 py-1 text-sm md:text-base font-medium">
                <UserOutlined className="mr-2!" />
                Đặt cho tôi
              </span>
            ),
            children: (
              <div className="bg-white p-4 md:p-6 rounded-b-2xl rounded-tr-2xl border border-gray-200 shadow-sm -mt-px relative z-10">
                {loading ? (
                  <div className="text-center py-8">
                    <Loading />
                  </div>
                ) : (
                  <>
                    {records.length > 0 && (
                      <div className="mb-6 bg-blue-50/50 p-4 md:p-5 rounded-xl border border-blue-100">
                        <div className="text-sm text-blue-800 mb-2 font-semibold">
                          Chọn hồ sơ có sẵn:
                        </div>
                        <Select
                          size="large"
                          placeholder="Chọn hồ sơ..."
                          className="w-full! [&>.ant-select-selector]:rounded-xl!"
                          onChange={(val) => handleSelectRecord(val, true)}
                          value={selectedSelfRecordId}
                          allowClear
                        >
                          {records.map((rec) => (
                            <Option key={rec._id} value={rec._id}>
                              {rec.fullName} - {rec.phone}
                            </Option>
                          ))}
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <span className="text-gray-400 text-xs md:text-sm font-semibold uppercase tracking-wider">
                        {records.length > 0
                          ? "Hoặc tạo hồ sơ mới"
                          : "Nhập thông tin bệnh nhân"}
                      </span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                    {renderForm(selfForm, true)}
                  </>
                )}
              </div>
            ),
          },
          {
            key: "other",
            label: (
              <span className="px-2 md:px-4 py-1 text-sm md:text-base font-medium">
                <TeamOutlined className="mr-2!" />
                Đặt cho người thân
              </span>
            ),
            children: (
              <div className="bg-white p-4 md:p-6 rounded-b-2xl rounded-tl-2xl border border-gray-200 shadow-sm -mt-px relative z-10">
                {loading ? (
                  <div className="text-center py-8">
                    <Loading />
                  </div>
                ) : (
                  <>
                    <div className="mb-6 bg-blue-50/50 p-4 md:p-5 rounded-xl border border-blue-100">
                      <div className="text-sm text-blue-800 mb-2 font-semibold">
                        Chọn hồ sơ người thân đã lưu:
                      </div>
                      <Select
                        size="large"
                        placeholder="Chọn người thân..."
                        className="w-full! [&>.ant-select-selector]:rounded-xl!"
                        onChange={(val) => handleSelectRecord(val, false)}
                        value={selectedOtherRecordId}
                        allowClear
                      >
                        {records.map((rec) => (
                          <Option key={rec._id} value={rec._id}>
                            {rec.fullName} - {rec.phone}
                          </Option>
                        ))}
                      </Select>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <span className="text-gray-400 text-xs md:text-sm font-semibold uppercase tracking-wider">
                        Hoặc tạo hồ sơ mới
                      </span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                    {renderForm(otherForm, false)}
                  </>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Phần nhập triệu chứng và ghi chú */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="font-semibold text-gray-800 mb-3">
          Thông tin khám bệnh
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả triệu chứng / Bệnh lý
            </label>
            <Input.TextArea
              rows={3}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Vui lòng mô tả các triệu chứng, tiền sử bệnh, lý do khám..."
              className="rounded-xl!"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú thêm
            </label>
            <Input.TextArea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Yêu cầu đặc biệt (nếu có)..."
              className="rounded-xl!"
            />
          </div>
        </div>
      </div>

      {/* Nút xác nhận và tiếp tục */}
      <div className="flex justify-end mt-6">
        <Button
          type="primary"
          size="large"
          onClick={handleConfirm}
          className="bg-blue-600! hover:bg-blue-700! rounded-lg! px-8!"
        >
          Xác nhận và tiếp tục
        </Button>
      </div>
    </div>
  );
};

export default Step2PatientInfo;
