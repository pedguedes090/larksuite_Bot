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
  Alert,
  Avatar,
  Dropdown
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  CrownOutlined,
  TeamOutlined,
  DollarOutlined,
  ReloadOutlined,
  SafetyOutlined,
  CodeOutlined,
  LogoutOutlined,
  SyncOutlined
} from '@ant-design/icons';
import LoginPage from './LoginPage';
import CommandInterface from './CommandInterface';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check for existing login
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsAdmin(JSON.parse(savedUser).role === 1);
    }
    
    if (savedToken) {
      fetchData(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setIsAdmin(userData.role === 1);
    fetchData(authToken);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setIsAdmin(false);
    setSelectedMenu('dashboard');
    message.success('Đã đăng xuất thành công');
  };

  const fetchData = async (authToken = token) => {
    try {
      setLoading(true);
      
      // For admin features, check if user is admin and get admin key from URL
      const urlParams = new URLSearchParams(window.location.search);
      const adminKey = urlParams.get('adminKey') || 'admin123';
      
      // Only fetch admin data if user is admin
      if (user && user.role === 1) {
        // Fetch users and stats with admin key
        const [usersResponse, statsResponse] = await Promise.all([
          fetch(`/api/admin/users`, {
            headers: { 'X-Admin-Key': adminKey }
          }),
          fetch(`/api/admin/stats`, {
            headers: { 'X-Admin-Key': adminKey }
          })
        ]);

        if (usersResponse.ok && statsResponse.ok) {
          const [usersData, statsData] = await Promise.all([
            usersResponse.json(),
            statsResponse.json()
          ]);
          
          setUsers(usersData);
          setStats(statsData);
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Không thể tải dữ liệu');
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
      key: 'commands',
      icon: <CodeOutlined />,
      label: 'Commands'
    }
  ];

  // Add admin-only menu items
  if (isAdmin) {
    menuItems.push(
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
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user || !token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile'
    },
    {
      key: 'sync',
      icon: <SyncOutlined />,
      label: 'Sync Lark'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true
    }
  ];

  const handleUserMenuClick = ({ key }) => {
    switch (key) {
      case 'logout':
        handleLogout();
        break;
      case 'sync':
        // TODO: Implement Lark sync
        message.info('Tính năng đồng bộ Lark sẽ được thêm vào');
        break;
      default:
        break;
    }
  };

  const renderContent = () => {
    switch (selectedMenu) {
      case 'dashboard':
        return (
          <div>
            <Title level={2} className="mb-6">Dashboard Overview</Title>
            
            {/* Personal stats for all users */}
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Vai trò"
                    value={user.role === 1 ? 'Admin' : 'User'}
                    prefix={user.role === 1 ? <CrownOutlined className="text-yellow-500" /> : <UserOutlined className="text-blue-500" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Số dư hiện tại"
                    value={user.money || 0}
                    prefix={<DollarOutlined className="text-green-500" />}
                    suffix="xu"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Trạng thái"
                    value="Đang hoạt động"
                    prefix={<SafetyOutlined className="text-green-500" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Lệnh khả dụng"
                    value="Nhiều lệnh"
                    prefix={<CodeOutlined className="text-purple-500" />}
                  />
                </Card>
              </Col>
            </Row>
            
            {/* Admin-only system stats */}
            {isAdmin && stats.totalUsers && (
              <>
                <Title level={3} className="mb-4">System Statistics</Title>
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
              </>
            )}
            
            {/* Quick start guide for regular users */}
            {!isAdmin && (
              <Card title="🚀 Bắt đầu sử dụng" className="mt-4">
                <div className="text-center p-6">
                  <Title level={4}>Chào mừng đến với Lark Bot Dashboard!</Title>
                  <Paragraph>
                    Bạn có thể sử dụng giao diện web để chạy các lệnh bot thay vì phải sử dụng app Lark.
                  </Paragraph>
                  <Space size="large">
                    <Button 
                      type="primary" 
                      size="large"
                      icon={<CodeOutlined />}
                      onClick={() => setSelectedMenu('commands')}
                    >
                      Thử lệnh ngay
                    </Button>
                  </Space>
                </div>
              </Card>
            )}
          </div>
        );
      
      case 'commands':
        return (
          <div>
            <Title level={2} className="mb-6">🎮 Command Interface</Title>
            <CommandInterface user={user} token={token} />
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
            <span className="text-gray-600">
              Xin chào, {user.userId}
              {user.role === 1 && <Tag color="gold" className="ml-2">Admin</Tag>}
            </span>
            <Dropdown
              menu={{ 
                items: userMenuItems,
                onClick: handleUserMenuClick
              }}
              placement="bottomRight"
            >
              <Avatar 
                icon={<UserOutlined />} 
                className="cursor-pointer bg-blue-500"
              />
            </Dropdown>
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