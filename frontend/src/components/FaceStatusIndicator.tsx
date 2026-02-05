/**
 * Face verification status indicator component
 */
import React from 'react';
import { Badge, Tooltip } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  WarningOutlined,
  LoadingOutlined 
} from '@ant-design/icons';

export interface FaceStatusIndicatorProps {
  verified?: boolean;
  confidence?: number;
  faces_detected?: number;
  event_type?: string;
  loading?: boolean;
  showText?: boolean;
}

export const FaceStatusIndicator: React.FC<FaceStatusIndicatorProps> = ({
  verified,
  confidence,
  faces_detected,
  event_type,
  loading = false,
  showText = true,
}) => {
  if (loading) {
    return (
      <Badge status="processing" text={showText ? 'Verifying...' : undefined}>
        <LoadingOutlined style={{ fontSize: 16, color: '#1890ff' }} />
      </Badge>
    );
  }

  if (verified) {
    const text = showText 
      ? `Verified (${Math.round((confidence || 0) * 100)}%)` 
      : undefined;
    
    return (
      <Tooltip title={`Confidence: ${Math.round((confidence || 0) * 100)}%`}>
        <Badge status="success" text={text}>
          <CheckCircleOutlined style={{ fontSize: 16, color: '#52c41a' }} />
        </Badge>
      </Tooltip>
    );
  }

  if (event_type === 'no_face') {
    return (
      <Tooltip title="No face detected">
        <Badge status="warning" text={showText ? 'No Face' : undefined}>
          <WarningOutlined style={{ fontSize: 16, color: '#faad14' }} />
        </Badge>
      </Tooltip>
    );
  }

  if (event_type === 'multiple_faces') {
    return (
      <Tooltip title={`Multiple faces detected (${faces_detected})`}>
        <Badge status="error" text={showText ? 'Multiple Faces' : undefined}>
          <WarningOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />
        </Badge>
      </Tooltip>
    );
  }

  if (event_type === 'low_confidence') {
    return (
      <Tooltip title={`Low confidence (${Math.round((confidence || 0) * 100)}%)`}>
        <Badge status="error" text={showText ? 'Verification Failed' : undefined}>
          <CloseCircleOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />
        </Badge>
      </Tooltip>
    );
  }

  return (
    <Badge status="default" text={showText ? 'Not Verified' : undefined}>
      <CloseCircleOutlined style={{ fontSize: 16, color: '#d9d9d9' }} />
    </Badge>
  );
};
