/**
 * Live monitoring dashboard for face verification
 * For admins and teachers to monitor student verification status
 */
import React, { useState } from 'react';
import {
  Card,
  Table,
  Typography,
  Space,
  Statistic,
  Row,
  Col,
  Tag,
  Alert,
  Spin,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { FaceSession, FaceEvent } from '../../api/faceVerification';
import { FaceStatusIndicator } from '../../components/FaceStatusIndicator';
import { adminQueryOptions } from './utils/adminQueryOptions';

const { Title, Text } = Typography;

export const LiveMonitoring: React.FC = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, error } = useQuery({
    ...adminQueryOptions.liveMonitoring(roomName),
    enabled: !!roomName,
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const sessionColumns = [
    {
      title: 'Student',
      dataIndex: 'user_full_name',
      key: 'user_full_name',
      render: (text: string, record: FaceSession) => (
        <Space>
          <UserOutlined />
          <span>{text || record.user_username}</span>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'blue',
          verified: 'green',
          failed: 'red',
          ended: 'default',
        };
        return <Tag color={colorMap[status] || 'default'}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Verifications',
      dataIndex: 'verification_count',
      key: 'verification_count',
      render: (count: number) => <Text>{count}</Text>,
    },
    {
      title: 'Success Rate',
      dataIndex: 'success_rate',
      key: 'success_rate',
      render: (rate: number, record: FaceSession) => (
        <Space>
          <FaceStatusIndicator
            verified={rate >= 70}
            confidence={rate / 100}
            showText={false}
          />
          <Text>{rate.toFixed(1)}%</Text>
        </Space>
      ),
    },
    {
      title: 'Last Check',
      dataIndex: 'last_verification_at',
      key: 'last_verification_at',
      render: (time: string | null) => {
        if (!time) return <Text type="secondary">Never</Text>;
        const date = new Date(time);
        const now = new Date();
        const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffSeconds < 60) {
          return <Text type="success">{diffSeconds}s ago</Text>;
        } else if (diffSeconds < 3600) {
          return <Text>{Math.floor(diffSeconds / 60)}m ago</Text>;
        } else {
          return <Text type="secondary">{Math.floor(diffSeconds / 3600)}h ago</Text>;
        }
      },
    },
  ];

  const alertColumns = [
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => new Date(time).toLocaleTimeString(),
    },
    {
      title: 'Student',
      dataIndex: 'user_full_name',
      key: 'user_full_name',
    },
    {
      title: 'Alert',
      dataIndex: 'event_type',
      key: 'event_type',
      render: (type: string) => {
        const typeMap: Record<string, { color: string; text: string }> = {
          multiple_faces: { color: 'error', text: 'Multiple Faces' },
          no_face: { color: 'warning', text: 'No Face' },
          low_confidence: { color: 'error', text: 'Low Confidence' },
          verification_failure: { color: 'error', text: 'Verification Failed' },
        };
        const alert = typeMap[type] || { color: 'default', text: type };
        return <Tag color={alert.color}>{alert.text}</Tag>;
      },
    },
    {
      title: 'Faces Detected',
      dataIndex: 'faces_detected',
      key: 'faces_detected',
    },
  ];

  if (!roomName) {
    return <Alert message="Room name is required" type="error" />;
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Failed to load monitoring data"
        description={error instanceof Error ? error.message : 'Unknown error'}
        type="error"
        showIcon
      />
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Live Face Verification Monitoring</Title>
      <Text type="secondary">{data.lesson_topic}</Text>

      <Row gutter={16} style={{ marginTop: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Participants"
              value={data.total_participants}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Verified"
              value={data.verified_participants}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Not Verified"
              value={data.total_participants - data.verified_participants}
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Room Status"
              value={data.is_active ? 'Active' : 'Inactive'}
              valueStyle={{ color: data.is_active ? '#3f8600' : '#cf1322' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Participant Sessions"
        style={{ marginTop: '24px' }}
        extra={
          <Space>
            <Tag color={autoRefresh ? 'green' : 'default'}>
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Tag>
          </Space>
        }
      >
        <Table
          columns={sessionColumns}
          dataSource={data.sessions}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {data.recent_alerts && data.recent_alerts.length > 0 && (
        <Card title="Recent Alerts" style={{ marginTop: '24px' }}>
          <Table
            columns={alertColumns}
            dataSource={data.recent_alerts}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )}
    </div>
  );
};

export default LiveMonitoring;
