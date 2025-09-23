import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Input,
  Button,
  List,
  Typography,
  Tag,
  Space,
  AutoComplete,
  message,
  Spin,
  Empty,
  Tooltip,
  Collapse,
  Row,
  Col
} from 'antd';
import {
  SendOutlined,
  ClearOutlined,
  HistoryOutlined,
  CodeOutlined,
  StarOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

const CommandInterface = ({ user, token }) => {
  const [commands, setCommands] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandArgs, setCommandArgs] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const resultContainerRef = useRef(null);

  useEffect(() => {
    fetchCommands();
    fetchHistory();
    loadFavorites();
  }, []);

  const fetchCommands = async () => {
    try {
      const response = await fetch('/api/commands/available', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCommands(data.commands);
      }
    } catch (error) {
      message.error('Không thể tải danh sách lệnh');
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/commands/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCommandHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem(`favorites_${user.userId}`);
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  };

  const saveFavorites = (newFavorites) => {
    localStorage.setItem(`favorites_${user.userId}`, JSON.stringify(newFavorites));
    setFavorites(newFavorites);
  };

  const executeCommand = async () => {
    if (!currentCommand.trim()) {
      message.warning('Vui lòng nhập lệnh');
      return;
    }

    setLoading(true);
    
    try {
      const args = commandArgs.trim() ? commandArgs.trim().split(/\s+/) : [];
      
      const response = await fetch('/api/commands/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          command: currentCommand,
          args: args
        }),
      });
      
      const data = await response.json();
      
      const newResult = {
        id: Date.now(),
        command: `!${currentCommand} ${commandArgs}`.trim(),
        timestamp: new Date().toLocaleString('vi-VN'),
        success: response.ok,
        result: data.result || data.error,
        error: !response.ok
      };
      
      setResults(prev => [newResult, ...prev]);
      
      if (response.ok) {
        message.success('Lệnh đã thực thi thành công');
        setCurrentCommand('');
        setCommandArgs('');
        fetchHistory(); // Refresh history
      } else {
        message.error(data.error || 'Lỗi khi thực thi lệnh');
      }
      
    } catch (error) {
      message.error('Lỗi kết nối: ' + error.message);
    } finally {
      setLoading(false);
      
      // Scroll to top of results
      setTimeout(() => {
        if (resultContainerRef.current) {
          resultContainerRef.current.scrollTop = 0;
        }
      }, 100);
    }
  };

  const addToFavorites = (command) => {
    if (!favorites.includes(command)) {
      const newFavorites = [...favorites, command];
      saveFavorites(newFavorites);
      message.success('Đã thêm vào yêu thích');
    }
  };

  const removeFromFavorites = (command) => {
    const newFavorites = favorites.filter(fav => fav !== command);
    saveFavorites(newFavorites);
    message.success('Đã xóa khỏi yêu thích');
  };

  const clearResults = () => {
    setResults([]);
    message.info('Đã xóa kết quả');
  };

  const commandOptions = commands.map(cmd => ({
    value: cmd.name,
    label: (
      <div>
        <Text strong>{cmd.name}</Text>
        {cmd.adminOnly && <Tag color="red" size="small" className="ml-2">Admin</Tag>}
        <br />
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {cmd.description}
        </Text>
      </div>
    )
  }));

  return (
    <div className="space-y-6">
      {/* Command Input Section */}
      <Card title="🎮 Thực thi lệnh" className="shadow-lg">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={8}>
              <AutoComplete
                value={currentCommand}
                onChange={setCurrentCommand}
                options={commandOptions}
                placeholder="Chọn hoặc nhập tên lệnh"
                filterOption={(inputValue, option) =>
                  option.value.toLowerCase().includes(inputValue.toLowerCase())
                }
                size="large"
              />
            </Col>
            <Col span={12}>
              <Input
                value={commandArgs}
                onChange={(e) => setCommandArgs(e.target.value)}
                placeholder="Tham số lệnh (tùy chọn)"
                size="large"
                onPressEnter={executeCommand}
              />
            </Col>
            <Col span={4}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={executeCommand}
                loading={loading}
                size="large"
                block
              >
                Chạy
              </Button>
            </Col>
          </Row>
          
          {currentCommand && (
            <div className="bg-gray-50 p-3 rounded">
              <Text code>!{currentCommand} {commandArgs}</Text>
              <Button
                type="link"
                size="small"
                icon={<StarOutlined />}
                onClick={() => addToFavorites(currentCommand)}
                disabled={favorites.includes(currentCommand)}
              >
                {favorites.includes(currentCommand) ? 'Đã yêu thích' : 'Thêm yêu thích'}
              </Button>
            </div>
          )}
        </Space>
      </Card>

      {/* Quick Actions */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="⭐ Lệnh yêu thích" size="small">
            {favorites.length > 0 ? (
              <Space wrap>
                {favorites.map(fav => (
                  <Tag
                    key={fav}
                    color="blue"
                    closable
                    onClose={() => removeFromFavorites(fav)}
                    onClick={() => setCurrentCommand(fav)}
                    className="cursor-pointer"
                  >
                    {fav}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">Chưa có lệnh yêu thích</Text>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="📝 Lệnh gần đây" size="small">
            {commandHistory.length > 0 ? (
              <Space wrap>
                {commandHistory.slice(0, 5).map((hist, index) => (
                  <Tag
                    key={index}
                    onClick={() => {
                      setCurrentCommand(hist.command);
                      setCommandArgs(hist.args?.join(' ') || '');
                    }}
                    className="cursor-pointer"
                  >
                    {hist.command}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">Chưa có lịch sử lệnh</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Available Commands */}
      <Card title="📋 Danh sách lệnh có sẵn">
        <Collapse ghost>
          <Panel header="Xem tất cả lệnh" key="1">
            <Row gutter={[16, 16]}>
              {commands.map(cmd => (
                <Col span={8} key={cmd.name}>
                  <Card 
                    size="small" 
                    hoverable
                    onClick={() => setCurrentCommand(cmd.name)}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <Text strong>{cmd.name}</Text>
                        {cmd.adminOnly && <Tag color="red" size="small" className="ml-1">Admin</Tag>}
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {cmd.description}
                        </Text>
                      </div>
                      <PlayCircleOutlined className="text-blue-500" />
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Panel>
        </Collapse>
      </Card>

      {/* Results Section */}
      <Card 
        title="📤 Kết quả lệnh" 
        extra={
          <Button 
            icon={<ClearOutlined />} 
            onClick={clearResults}
            disabled={results.length === 0}
          >
            Xóa kết quả
          </Button>
        }
      >
        <div 
          ref={resultContainerRef}
          className="max-h-96 overflow-y-auto space-y-4"
        >
          {results.length > 0 ? (
            results.map(result => (
              <Card 
                key={result.id} 
                size="small" 
                className={`border-l-4 ${result.error ? 'border-l-red-500 bg-red-50' : 'border-l-green-500 bg-green-50'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <Text code>{result.command}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {result.timestamp}
                  </Text>
                </div>
                <Paragraph className="mb-0 text-sm">
                  <pre className="whitespace-pre-wrap font-mono text-xs bg-white p-2 rounded border">
                    {result.result}
                  </pre>
                </Paragraph>
              </Card>
            ))
          ) : (
            <Empty 
              description="Chưa có kết quả nào"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default CommandInterface;