import { loginSchema } from "@/utils/validations/authSchemas";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, Form, Input, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";

const { Title, Text } = Typography;

const LoginForm = ({ onSubmit, loading }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-10">
        <Title
          level={2}
          className="mb-2! font-bold! text-slate-800! tracking-tight!"
        >
          Đăng nhập
        </Title>
        <Text className="text-slate-500 text-base">
          Chào mừng bạn quay lại hệ thống
        </Text>
      </div>

      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit)}
        size="large"
        className="space-y-1"
      >
        <Form.Item
          validateStatus={errors.email ? "error" : ""}
          help={errors.email?.message}
          className="mb-5!"
        >
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                prefix={<MailOutlined className="text-slate-400 mr-2" />}
                placeholder="Địa chỉ Email"
              />
            )}
          />
        </Form.Item>

        <Form.Item
          validateStatus={errors.password ? "error" : ""}
          help={errors.password?.message}
          className="mb-5!"
        >
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                prefix={<LockOutlined className="text-slate-400 mr-2" />}
                placeholder="Mật khẩu"
              />
            )}
          />
        </Form.Item>

        <div className="flex justify-between items-center mb-8!">
          <Checkbox className="text-slate-600">Ghi nhớ tôi</Checkbox>
          <Link
            to="/auth/forgot-password"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
          >
            Quên mật khẩu?
          </Link>
        </div>

        <Form.Item className="mb-0!">
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            className="rounded-xl font-semibold h-12 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20"
          >
            Đăng nhập
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default LoginForm;
