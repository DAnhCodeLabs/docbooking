import { Button, Drawer, Space, Form, Select } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import { useState } from "react";
import DatePickerRange from "./DatePickerRange";

const Filter = ({ filters, values, onChange, onClear, loading }) => {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  const handleApply = () => {
    form.validateFields().then((vals) => {
      onChange(vals);
      onClose();
    });
  };

  const handleClear = () => {
    form.resetFields();
    onClear();
    onClose();
  };

  return (
    <>
      <Button icon={<FilterOutlined />} onClick={showDrawer}>
        Lọc
      </Button>
      <Drawer
        title="Bộ lọc"
        placement="right"
        onClose={onClose}
        open={open}
        width={400}
        footer={
          <Space>
            <Button onClick={handleClear}>Xóa tất cả</Button>
            <Button type="primary" onClick={handleApply} loading={loading}>
              Áp dụng
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" initialValues={values}>
          {filters.map((filter) => {
            switch (filter.type) {
              case "select":
                return (
                  <Form.Item
                    key={filter.name}
                    name={filter.name}
                    label={filter.label}
                  >
                    <Select
                      options={filter.options}
                      mode={filter.multiple ? "multiple" : undefined}
                      allowClear
                    />
                  </Form.Item>
                );
              case "date-range":
                return (
                  <Form.Item
                    key={filter.name}
                    name={filter.name}
                    label={filter.label}
                  >
                    <DatePickerRange style={{ width: "100%" }} />
                  </Form.Item>
                );
              // Có thể thêm các loại khác
              default:
                return null;
            }
          })}
        </Form>
      </Drawer>
    </>
  );
};

export default Filter;
