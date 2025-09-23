import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Typography, 
  message, 
  Tabs,
  Space,
  Divider
} from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  LoginOutlined, 
  UserAddOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

const LoginPage = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleLogin = async (values) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        message.success('Đăng nhập thành công!');
        onLogin(data.user, data.token);
      } else {
        message.error(data.error || 'Đăng nhập thất bại');
      }
    } catch (error) {
      message.error('Lỗi kết nối: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values) => {
    try {
      setLoading(true);
      
      if (values.password !== values.confirmPassword) {
        message.error('Mật khẩu xác nhận không khớp');
        return;
      }
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: values.userId,
          password: values.password,
          larkUserId: values.larkUserId
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        message.success('Đăng ký thành công! Vui lòng đăng nhập.');
        form.resetFields();
      } else {
        message.error(data.error || 'Đăng ký thất bại');
      }
    } catch (error) {
      message.error('Lỗi kết nối: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const LoginForm = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleLogin}
      size="large"
    >
      <Form.Item
        name="userId"
        label="User ID"
        rules={[{ required: true, message: 'Vui lòng nhập User ID!' }]}
      >
        <Input 
          prefix={<UserOutlined />} 
          placeholder="Nhập User ID của bạn" 
        />
      </Form.Item>
      
      <Form.Item
        name="password"
        label="Mật khẩu"
        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
      >
        <Input.Password 
          prefix={<LockOutlined />} 
          placeholder="Nhập mật khẩu" 
        />
      </Form.Item>
      
      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={loading}
          block
          icon={<LoginOutlined />}
        >
          Đăng nhập
        </Button>
      </Form.Item>
    </Form>
  );

  const RegisterForm = () => (
    <Form
      layout="vertical"
      onFinish={handleRegister}
      size="large"
    >
      <Form.Item
        name="userId"
        label="User ID"
        rules={[{ required: true, message: 'Vui lòng nhập User ID!' }]}
      >
        <Input 
          prefix={<UserOutlined />} 
          placeholder="Chọn User ID của bạn" 
        />
      </Form.Item>
      
      <Form.Item
        name="larkUserId"
        label="Lark User ID (tùy chọn)"
        rules={[{ message: 'Nhập Lark User ID để đồng bộ với app' }]}
      >
        <Input 
          prefix={<UserOutlined />} 
          placeholder="Lark User ID để đồng bộ" 
        />
      </Form.Item>
      
      <Form.Item
        name="password"
        label="Mật khẩu"
        rules={[
          { required: true, message: 'Vui lòng nhập mật khẩu!' },
          { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
        ]}
      >
        <Input.Password 
          prefix={<LockOutlined />} 
          placeholder="Tạo mật khẩu" 
        />
      </Form.Item>
      
      <Form.Item
        name="confirmPassword"
        label="Xác nhận mật khẩu"
        rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu!' }]}
      >
        <Input.Password 
          prefix={<LockOutlined />} 
          placeholder="Nhập lại mật khẩu" 
        />
      </Form.Item>
      
      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={loading}
          block
          icon={<UserAddOutlined />}
        >
          Đăng ký
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Title level={2} className="text-indigo-600">
            🤖 Lark Bot Dashboard
          </Title>
          <Text type="secondary">
            Đăng nhập để sử dụng các lệnh bot trên web
          </Text>
        </div>
        
        <Card className="shadow-lg border-0 rounded-lg">
          <Tabs 
            defaultActiveKey="login"
            centered
            items={[
              {
                key: 'login',
                label: 'Đăng nhập',
                children: <LoginForm />
              },
              {
                key: 'register',
                label: 'Đăng ký',
                children: <RegisterForm />
              }
            ]}
          />
          
          <Divider />
          
          <div className="text-center">
            <Text type="secondary" className="text-xs">
              💡 Đăng ký để đồng bộ với tài khoản Lark của bạn
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;