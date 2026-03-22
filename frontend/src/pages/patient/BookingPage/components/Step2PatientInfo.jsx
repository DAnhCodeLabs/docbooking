import { TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Input, message, Select, Tabs } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { bookingApi } from "../bookingApi";
import Loading from "@/components/Loading";

const { Option } = Select;

const Step2PatientInfo = ({ onComplete, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState(
    initialData?.isForSelf ? "self" : "other",
  );
  const [selectedSelfRecordId, setSelectedSelfRecordId] = useState(null);
  const [selfForm] = Form.useForm();
  const [otherForm] = Form.useForm();
  const [selectedOtherRecordId, setSelectedOtherRecordId] = useState(null);
  const [creatingSelf, setCreatingSelf] = useState(false);
  const [creatingOther, setCreatingOther] = useState(false);

  // Lấy danh sách hồ sơ
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const res = await bookingApi.getMedicalRecords();
        setRecords(res);
        // Nếu có hồ sơ và đang ở tab self, tự động chọn hồ sơ đầu tiên nếu chưa chọn
        if (activeTab === "self" && res.length > 0 && !selectedSelfRecordId) {
          setSelectedSelfRecordId(res[0]._id);
          onComplete({ patientRecord: res[0], isForSelf: true });
        }
      } catch (error) {
        message.error("Không thể tải danh sách hồ sơ");
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [activeTab]); // fetch lại khi chuyển tab? Không cần, nhưng để đảm bảo.

  // Xử lý chọn hồ sơ cho bản thân
  const handleSelectSelfRecord = (recordId) => {
    if (!recordId) {
      setSelectedSelfRecordId(null);
      onComplete({ patientRecord: null, isForSelf: true });
      selfForm.resetFields();
      return;
    }
    const record = records.find((r) => r._id === recordId);
    if (record) {
      setSelectedSelfRecordId(recordId);
      onComplete({ patientRecord: record, isForSelf: true });
      // Điền vào form để hiển thị (nếu muốn)
      selfForm.setFieldsValue({
        fullName: record.fullName,
        phone: record.phone,
        dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
        gender: record.gender,
        cccd: record.cccd,
        address: record.address,
      });
    }
  };

  // Tạo hồ sơ mới cho bản thân
  const handleCreateSelfRecord = async (values) => {
    if (
      !values.fullName ||
      !values.phone ||
      !values.dateOfBirth ||
      !values.gender ||
      !values.cccd
    ) {
      message.warning("Vui lòng nhập đầy đủ thông tin bắt buộc.");
      return;
    }

    setCreatingSelf(true);
    try {
      const newRecord = await bookingApi.createMedicalRecord({
        ...values,
        dateOfBirth: values.dateOfBirth.format("YYYY-MM-DD"),
      });
      setRecords((prev) => [newRecord, ...prev]);
      setSelectedSelfRecordId(newRecord._id);
      onComplete({ patientRecord: newRecord, isForSelf: true });
      selfForm.resetFields();
    } catch (error) {
      message.error(error?.message || "Tạo hồ sơ thất bại");
    } finally {
      setCreatingSelf(false);
    }
  };

  // Xử lý chọn hồ sơ cho người thân (giữ nguyên)
  const handleSelectOtherRecord = (recordId) => {
    if (!recordId) {
      setSelectedOtherRecordId(null);
      onComplete({ patientRecord: null, isForSelf: false });
      otherForm.resetFields();
      return;
    }
    const record = records.find((r) => r._id === recordId);
    if (record) {
      setSelectedOtherRecordId(recordId);
      onComplete({ patientRecord: record, isForSelf: false });
      otherForm.setFieldsValue({
        fullName: record.fullName,
        phone: record.phone,
        dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
        gender: record.gender,
        cccd: record.cccd,
        address: record.address,
      });
    }
  };

  // Tạo hồ sơ mới cho người thân (giữ nguyên)
  const handleCreateOtherRecord = async (values) => {
    if (
      !values.fullName ||
      !values.phone ||
      !values.dateOfBirth ||
      !values.gender ||
      !values.cccd
    ) {
      message.warning("Vui lòng nhập đầy đủ thông tin bắt buộc.");
      return;
    }

    setCreatingOther(true);
    try {
      const newRecord = await bookingApi.createMedicalRecord({
        ...values,
        dateOfBirth: values.dateOfBirth.format("YYYY-MM-DD"),
      });
      setRecords((prev) => [newRecord, ...prev]);
      setSelectedOtherRecordId(newRecord._id);
      onComplete({ patientRecord: newRecord, isForSelf: false });
      otherForm.resetFields();
    } catch (error) {
      message.error(error?.message || "Tạo hồ sơ thất bại");
    } finally {
      setCreatingOther(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    // Reset các state khi chuyển tab
    if (key === "self") {
      setSelectedOtherRecordId(null);
      otherForm.resetFields();
    } else {
      setSelectedSelfRecordId(null);
      selfForm.resetFields();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        type="card"
        className="mb-4!"
        items={[
          {
            key: "self",
            label: (
              <span className="px-4 py-1 text-base">
                <UserOutlined className="mr-2!" />
                Đặt cho tôi
              </span>
            ),
            children: (
              <div className="bg-white p-6 rounded-b-xl rounded-tr-xl border border-gray-200">
                {loading ? (
                  <div className="text-center py-8">
                    <Loading />
                  </div>
                ) : (
                  <>
                    {/* Danh sách hồ sơ có sẵn */}
                    {records.length > 0 && (
                      <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-blue-800 mb-2 font-medium">
                          Chọn hồ sơ của bạn:
                        </div>
                        <Select
                          size="large"
                          placeholder="Chọn hồ sơ..."
                          className="w-full!"
                          onChange={handleSelectSelfRecord}
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

                    {/* Form tạo mới */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <span className="text-gray-400 text-sm font-medium">
                        {records.length > 0
                          ? "Hoặc tạo hồ sơ mới"
                          : "Tạo hồ sơ mới"}
                      </span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>

                    <Form
                      form={selfForm}
                      layout="vertical"
                      onFinish={handleCreateSelfRecord}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                        <Form.Item
                          label="Họ và tên"
                          name="fullName"
                          rules={[
                            { required: true, message: "Vui lòng nhập họ tên" },
                          ]}
                        >
                          <Input
                            size="large"
                            placeholder="Nhập họ tên đầy đủ"
                          />
                        </Form.Item>
                        <Form.Item
                          label="Số điện thoại"
                          name="phone"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng nhập số điện thoại",
                            },
                          ]}
                        >
                          <Input
                            size="large"
                            placeholder="Nhập số điện thoại"
                          />
                        </Form.Item>
                        <Form.Item
                          name="dateOfBirth"
                          label="Ngày sinh"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng chọn ngày sinh",
                            },
                          ]}
                        >
                          <DatePicker
                            size="large"
                            format="DD/MM/YYYY"
                            className="w-full!"
                          />
                        </Form.Item>
                        <Form.Item
                          name="gender"
                          label="Giới tính"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng chọn giới tính",
                            },
                          ]}
                        >
                          <Select size="large" placeholder="Chọn giới tính">
                            <Option value="male">Nam</Option>
                            <Option value="female">Nữ</Option>
                            <Option value="other">Khác</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item
                          name="cccd"
                          label="CCCD / Hộ chiếu"
                          className="md:col-span-2"
                          rules={[
                            { required: true, message: "Vui lòng nhập CCCD" },
                          ]}
                        >
                          <Input size="large" placeholder="Nhập số CCCD" />
                        </Form.Item>
                        <Form.Item
                          name="address"
                          label="Địa chỉ"
                          className="md:col-span-2"
                        >
                          <Input.TextArea
                            rows={3}
                            placeholder="Địa chỉ chi tiết"
                          />
                        </Form.Item>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={creatingSelf}
                          className="bg-blue-600! hover:bg-blue-700!"
                        >
                          Lưu hồ sơ
                        </Button>
                      </div>
                    </Form>
                  </>
                )}
              </div>
            ),
          },
          // Tab "Đặt cho người thân" giữ nguyên (như cũ)
          {
            key: "other",
            label: (
              <span className="px-4 py-1 text-base">
                <TeamOutlined className="mr-2!" />
                Đặt cho người thân
              </span>
            ),
            children: (
              <div className="bg-white p-6 rounded-b-xl rounded-tl-xl border border-gray-200">
                {loading ? (
                  <div className="text-center py-8">
                    <Loading />
                  </div>
                ) : (
                  <>
                    <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-800 mb-2 font-medium">
                        Chọn hồ sơ đã lưu:
                      </div>
                      <Select
                        size="large"
                        placeholder="Chọn người thân..."
                        className="w-full!"
                        onChange={handleSelectOtherRecord}
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
                      <span className="text-gray-400 text-sm font-medium">
                        Hoặc tạo hồ sơ mới
                      </span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>

                    <Form
                      form={otherForm}
                      layout="vertical"
                      onFinish={handleCreateOtherRecord}
                    >
                      {/* ... giữ nguyên các trường như cũ ... */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                        <Form.Item
                          label="Họ và tên"
                          name="fullName"
                          rules={[
                            { required: true, message: "Vui lòng nhập họ tên" },
                          ]}
                        >
                          <Input
                            size="large"
                            placeholder="Nhập họ tên đầy đủ"
                          />
                        </Form.Item>
                        <Form.Item
                          label="Số điện thoại"
                          name="phone"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng nhập số điện thoại",
                            },
                          ]}
                        >
                          <Input
                            size="large"
                            placeholder="Nhập số điện thoại"
                          />
                        </Form.Item>
                        <Form.Item
                          name="dateOfBirth"
                          label="Ngày sinh"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng chọn ngày sinh",
                            },
                          ]}
                        >
                          <DatePicker
                            size="large"
                            format="DD/MM/YYYY"
                            className="w-full!"
                          />
                        </Form.Item>
                        <Form.Item
                          name="gender"
                          label="Giới tính"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng chọn giới tính",
                            },
                          ]}
                        >
                          <Select size="large" placeholder="Chọn giới tính">
                            <Option value="male">Nam</Option>
                            <Option value="female">Nữ</Option>
                            <Option value="other">Khác</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item
                          name="cccd"
                          label="CCCD / Hộ chiếu"
                          className="md:col-span-2"
                          rules={[
                            { required: true, message: "Vui lòng nhập CCCD" },
                          ]}
                        >
                          <Input size="large" placeholder="Nhập số CCCD" />
                        </Form.Item>
                        <Form.Item
                          name="address"
                          label="Địa chỉ"
                          className="md:col-span-2"
                        >
                          <Input.TextArea
                            rows={3}
                            placeholder="Địa chỉ chi tiết"
                          />
                        </Form.Item>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={creatingOther}
                          className="bg-blue-600! hover:bg-blue-700!"
                        >
                          Lưu hồ sơ
                        </Button>
                      </div>
                    </Form>
                  </>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default Step2PatientInfo;
