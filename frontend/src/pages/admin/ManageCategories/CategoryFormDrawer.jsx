import { Drawer, UploadFile } from "@/components/common";
import { AppstoreAddOutlined, EditOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Input, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const { TextArea } = Input;
const { Text } = Typography;

const categorySchema = z.object({
  name: z.string().min(2, "Tên danh mục phải có ít nhất 2 ký tự"),
  description: z.string().optional(),
});

const CategoryFormDrawer = ({
  open,
  onClose,
  onSubmit,
  initialValues = {},
}) => {
  const [fileList, setFileList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialValues?._id;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        name: initialValues?.name || "",
        description: initialValues?.description || "",
      });

      if (initialValues?.image) {
        setFileList([
          {
            uid: "-1",
            name: "anh-dai-dien.png",
            status: "done",
            url: initialValues.image,
          },
        ]);
      } else {
        setFileList([]);
      }
      setIsSubmitting(false);
    }
  }, [open, initialValues, reset]);

  const handleFormSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      if (data.description) formData.append("description", data.description);

      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append("image", fileList[0].originFileObj);
      }

      await onSubmit(formData);
    } catch (error) {
      console.error("Lỗi submit form:", error);
      message.error("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <span className="flex! items-center! gap-2! text-lg! font-bold! text-slate-800!">
          {isEditing ? (
            <EditOutlined className="text-indigo-600!" />
          ) : (
            <AppstoreAddOutlined className="text-indigo-600!" />
          )}
          {isEditing ? "Sửa danh mục" : "Thêm danh mục mới"}
        </span>
      }
      width={480}
      styles={{ body: { padding: "24px", backgroundColor: "#fcfcfc" } }}
      footer={
        <div className="flex justify-end gap-3 p-2">
          <Button
            onClick={onClose}
            className=" font-semibold! h-10! border-slate-300! text-slate-600! hover:text-slate-800! hover:border-slate-400!"
          >
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            form="category-form"
            loading={isSubmitting}
            className="bg-indigo-600! hover:bg-indigo-700! border-none! font-semibold!  h-10! shadow-sm! shadow-indigo-600/20! px-6!"
          >
            {isEditing ? "Cập nhật" : "Lưu danh mục"}
          </Button>
        </div>
      }
    >
      <Form
        layout="vertical"
        id="category-form"
        onFinish={handleSubmit(handleFormSubmit)}
      >
        <Form.Item
          label={
            <Text className="font-semibold! text-slate-700!">
              Tên danh mục <span className="text-red-500!">*</span>
            </Text>
          }
          required
          validateStatus={errors.name ? "error" : ""}
          help={errors.name?.message}
          className="mb-5!"
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="VD: Khám tổng quát..."
                className="bg-slate-50!  h-11! border-slate-200! hover:border-indigo-400! focus:border-indigo-500! focus:bg-white! transition-colors!"
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={
            <Text className="font-semibold! text-slate-700!">Ảnh đại diện</Text>
          }
          className="mb-5!"
        >
          <div className="bg-white p-4 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 transition-colors flex flex-col items-center justify-center">
            <UploadFile
              fileList={fileList}
              onChange={setFileList}
              maxCount={1}
              listType="picture-card"
              accept="image/*"
            />
            <div className="text-xs text-slate-400 text-center mt-2">
              Định dạng JPG, PNG. <br /> Tối đa 5MB.
            </div>
          </div>
        </Form.Item>

        <Form.Item
          label={
            <Text className="font-semibold! text-slate-700!">
              Mô tả chi tiết
            </Text>
          }
          validateStatus={errors.description ? "error" : ""}
          help={errors.description?.message}
          className="mb-0!"
        >
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                rows={4}
                placeholder="Nhập mô tả cho danh mục..."
                className="bg-slate-50!  border-slate-200! hover:border-indigo-400! focus:border-indigo-500! focus:bg-white! transition-colors! p-3!"
              />
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CategoryFormDrawer;
