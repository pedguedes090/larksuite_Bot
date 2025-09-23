import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Menu, 
  Typography, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  message,
  Spin,
  Alert
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  CrownOutlined,
  TeamOutlined,
  DollarOutlined,
  ReloadOutlined,
  SafetyOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get admin key from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const adminKey = urlParams.get('adminKey') || 'admin123';
      
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users', {
          headers: { 'X-Admin-Key': adminKey }
        }),
        fetch('/api/admin/stats', {
          headers: { 'X-Admin-Key': adminKey }
        })
      ]);
      
      if (usersRes.ok && statsRes.ok) {
        const usersData = await usersRes.json();
        const statsData = await statsRes.json();
        setUsers(usersData);
        setStats(statsData);
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        message.error('Access denied. Admin privileges required.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Failed to fetch data');
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAdmin = async (userId, isAdmin) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const adminKey = urlParams.get('adminKey') || 'admin123';
      
      const response = await fetch('/api/admin/set-admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({ userId, isAdmin })
      });
      
      if (response.ok) {
        message.success(`Admin privileges ${isAdmin ? 'granted' : 'revoked'} successfully`);
        fetchData();
      } else {
        message.error('Failed to update admin privileges');
      }
    } catch (error) {
      message.error('Error updating admin privileges');
    }
  };

  const handleSetMoney = async (userId, amount) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const adminKey = urlParams.get('adminKey') || 'admin123';
      
      const response = await fetch('/api/admin/set-money', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({ userId, amount })
      });
      
      if (response.ok) {
        message.success('Money updated successfully');
        fetchData();
      } else {
        message.error('Failed to update money');
      }
    } catch (error) {
      message.error('Error updating money');
    }
  };

  const userColumns = [
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 200,
      render: (text) => <code className="bg-gray-100 px-2 py-1 rounded">{text}</code>
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role) => (
        <Tag color={role === 1 ? 'gold' : 'blue'} icon={role === 1 ? <CrownOutlined /> : <UserOutlined />}>
          {role === 1 ? 'Admin' : 'User'}
        </Tag>
      )
    },
    {
      title: 'Money',
      dataIndex: 'money',
      key: 'money',
      width: 120,
      render: (money) => (
        <span className="text-green-600 font-semibold">
          {money.toLocaleString('vi-VN')} xu
        </span>
      ),
      sorter: (a, b) => a.money - b.money
    },
    {
      title: 'Commands Used',
      dataIndex: 'commandCount',
      key: 'commandCount',
      width: 120,
      sorter: (a, b) => a.commandCount - b.commandCount
    },
    {
      title: 'Join Date',
      dataIndex: 'joinDate',
      key: 'joinDate',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString('vi-VN')
    },
    {
      title: 'Last Active',
      dataIndex: 'lastActive',
      key: 'lastActive',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString('vi-VN')
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type={record.role === 1 ? 'danger' : 'primary'}
            onClick={() => handleSetAdmin(record.userId, record.role !== 1)}
          >
            {record.role === 1 ? 'Remove Admin' : 'Make Admin'}
          </Button>
          <Button
            size="small"
            onClick={() => {
              const amount = prompt('Enter new money amount:', record.money);
              if (amount !== null && !isNaN(amount)) {
                handleSetMoney(record.userId, parseInt(amount));
              }
            }}
          >
            Set Money
          </Button>
        </Space>
      )
    }
  ];

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: 'User Management'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-96">
          <Alert
            message="Access Denied"
            description="You need admin privileges to access this dashboard."
            type="error"
            showIcon
            icon={<SafetyOutlined />}
          />
          <div className="mt-4 text-center">
            <Button type="primary" onClick={fetchData} icon={<ReloadOutlined />}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (selectedMenu) {
      case 'dashboard':
        return (
          <div>
            <Title level={2} className="mb-6">Dashboard Overview</Title>
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Total Users"
                    value={stats.totalUsers || 0}
                    prefix={<TeamOutlined className="text-blue-500" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Total Admins"
                    value={stats.totalAdmins || 0}
                    prefix={<CrownOutlined className="text-yellow-500" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Total Money"
                    value={stats.totalMoney || 0}
                    prefix={<DollarOutlined className="text-green-500" />}
                    suffix="xu"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Total Commands"
                    value={stats.totalCommands || 0}
                    prefix={<SettingOutlined className="text-purple-500" />}
                  />
                </Card>
              </Col>
            </Row>
            
            <Card title="Recent Users" className="mt-4">
              <Table
                dataSource={users.slice(0, 10)}
                columns={userColumns}
                rowKey="userId"
                pagination={false}
                size="small"
              />
            </Card>
          </div>
        );
      
      case 'users':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <Title level={2}>User Management</Title>
              <Button type="primary" onClick={fetchData} icon={<ReloadOutlined />}>
                Refresh
              </Button>
            </div>
            <Card>
              <Table
                dataSource={users}
                columns={userColumns}
                rowKey="userId"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `Total ${total} users`
                }}
                scroll={{ x: 1200 }}
              />
            </Card>
          </div>
        );
      
      case 'settings':
        return (
          <div>
            <Title level={2} className="mb-6">System Settings</Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="Bot Configuration">
                  <p className="text-gray-600">Bot management and configuration options will be available here.</p>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="System Status">
                  <p className="text-gray-600">System monitoring and health check information.</p>
                </Card>
              </Col>
            </Row>
          </div>
        );
      
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <Layout className="min-h-screen">
      <Sider trigger={null} collapsible collapsed={collapsed} className="bg-white shadow-lg">
        <div className="flex items-center justify-center p-4 border-b">
          <Title level={4} className="m-0 text-center">
            {collapsed ? 'LB' : 'Lark Bot Admin'}
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedMenu]}
          items={menuItems}
          onClick={({ key }) => setSelectedMenu(key)}
          className="border-r-0"
        />
      </Sider>
      
      <Layout>
        <Header className="bg-white shadow-sm px-6 flex items-center justify-between">
          <Button
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg"
          >
            {collapsed ? '▶' : '◀'}
          </Button>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, Admin</span>
          </div>
        </Header>
        
        <Content className="m-6 p-6 bg-white rounded-lg shadow-sm">
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;