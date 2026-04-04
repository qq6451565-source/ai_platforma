/**
 * Face verification status indicator component with laser scanning effect
 */
import React from 'react';
import { Badge, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  LoadingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import './FaceStatusIndicator.css';

export interface FaceStatusIndicatorProps {
  verified?: boolean;
  confidence?: number;
  faces_detected?: number;
  event_type?: string;
  loading?: boolean;
  showText?: boolean;
  enableScanner?: boolean;
}

export const FaceStatusIndicator: React.FC<FaceStatusIndicatorProps> = ({
  verified,
  confidence,
  faces_detected,
  event_type,
  loading = false,
  showText = true,
  enableScanner = true,
}) => {
  const getStatusColor = () => {
    if (verified) return 'var(--color-success)';
    if (event_type === 'no_face') return 'var(--color-warning)';
    if (event_type === 'multiple_faces') return 'var(--color-error)';
    if (event_type === 'low_confidence') return 'var(--color-error)';
    if (loading) return 'var(--color-info)';
    return 'var(--color-text-disabled)';
  };

  const getStatusIcon = () => {
    if (loading) return <LoadingOutlined className="face-status-icon-loading" />;
    if (verified) return <CheckCircleOutlined />;
    if (event_type === 'no_face') return <EyeInvisibleOutlined />;
    if (event_type === 'multiple_faces') return <WarningOutlined />;
    if (event_type === 'low_confidence') return <CloseCircleOutlined />;
    return <CloseCircleOutlined />;
  };

  const getStatusText = () => {
    if (loading) return 'Verifying...';
    if (verified) return `Verified (${Math.round((confidence || 0) * 100)}%)`;
    if (event_type === 'no_face') return 'No Face';
    if (event_type === 'multiple_faces') return 'Multiple Faces';
    if (event_type === 'low_confidence') return 'Verification Failed';
    return 'Not Verified';
  };

  const getTooltipTitle = () => {
    if (loading) return 'Face verification in progress';
    if (verified) return `Confidence: ${Math.round((confidence || 0) * 100)}%`;
    if (event_type === 'no_face') return 'No face detected';
    if (event_type === 'multiple_faces') return `Multiple faces detected (${faces_detected})`;
    if (event_type === 'low_confidence') return `Low confidence (${Math.round((confidence || 0) * 100)}%)`;
    return 'Face verification not started';
  };

  return (
    <div className={`face-status-indicator ${loading ? 'face-status-scanning' : ''}`}>
      {enableScanner && loading && (
        <div className="face-scanner-line animate-laser-scan" />
      )}
      <Tooltip title={getTooltipTitle()}>
        <div className="face-status-content">
          <span
            className="face-status-icon"
            style={{ color: getStatusColor() }}
          >
            {getStatusIcon()}
          </span>
          {showText && (
            <span className="face-status-text">{getStatusText()}</span>
          )}
        </div>
      </Tooltip>
    </div>
  );
};

