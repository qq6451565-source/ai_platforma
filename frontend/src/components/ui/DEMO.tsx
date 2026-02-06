/**
 * Demo Component - Neon Gradient UI Enhancements
 *
 * This file demonstrates the usage of all new UX/UI enhancements
 * implemented for the futuristic Neon Gradient platform.
 */

import React, { useState } from 'react';
import { Button } from './Button';
import { HolographicSkeleton, HolographicCardSkeleton, HolographicTableSkeleton, HolographicListSkeleton } from './HolographicSkeleton';
import { EmptyState } from './EmptyState';
import { message } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';

export const NeonUIDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const showToast = (type: 'success' | 'info' | 'warning' | 'error') => {
    if (type === 'success') message.success('Operation completed successfully!');
    if (type === 'info') message.info('This is an informational message');
    if (type === 'warning') message.warning('This is a warning message');
    if (type === 'error') message.error('An error has occurred!');
  };

  return (
    <div className="neon-ui-demo" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 className="neon-text-gradient" style={{ fontSize: '32px', marginBottom: '32px', textAlign: 'center' }}>
        Neon Gradient UI Enhancements Demo
      </h1>

      {/* Holographic Skeletons */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: '#00ffff', marginBottom: '24px' }}>1. Holographic Shimmer Loading</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          <div>
            <h3 style={{ color: '#fff', marginBottom: '16px' }}>Base Skeletons</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <HolographicSkeleton variant="text" width="100%" height={20} />
              <HolographicSkeleton variant="circular" width={60} height={60} />
              <HolographicSkeleton variant="rectangular" width="100%" height={100} />
            </div>
          </div>

          <div>
            <h3 style={{ color: '#fff', marginBottom: '16px' }}>Card Skeleton</h3>
            <HolographicCardSkeleton />
          </div>

          <div>
            <h3 style={{ color: '#fff', marginBottom: '16px' }}>List Skeleton</h3>
            <HolographicListSkeleton items={3} />
          </div>
        </div>
      </section>

      {/* Empty States */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: '#00ffff', marginBottom: '24px' }}>2. Futuristic Empty States</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <EmptyState
            illustration="no-data"
            title="No Data Found"
            description="There is no data to display at the moment."
          />

          <EmptyState
            illustration="no-results"
            title="No Results Found"
            description="Try adjusting your search criteria."
            action={<Button variant="primary" icon={<ReloadOutlined />}>Clear Filters</Button>}
          />

          <EmptyState
            illustration="no-notifications"
            title="No Notifications"
            description="You're all caught up! Check back later for updates."
          />

          <EmptyState
            illustration="no-connection"
            title="Connection Lost"
            description="Unable to connect to the server. Please check your internet connection."
            action={<Button variant="primary" icon={<ReloadOutlined />}>Retry</Button>}
          />
        </div>
      </section>

      {/* Glowing Toast Notifications */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: '#00ffff', marginBottom: '24px' }}>3. Glowing Toast Notifications</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <Button variant="neon" onClick={() => showToast('success')}>Success Toast</Button>
          <Button variant="outline" onClick={() => showToast('info')}>Info Toast</Button>
          <Button onClick={() => showToast('warning')}>Warning Toast</Button>
          <Button variant="error" onClick={() => showToast('error')}>Error Toast</Button>
        </div>
      </section>

      {/* Table Skeleton */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: '#00ffff', marginBottom: '24px' }}>4. Table Skeleton (Glassmorphic Neon Strips)</h2>
        <HolographicTableSkeleton rows={5} columns={4} />
      </section>

      {/* Form Elements with Neon Focus */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ color: '#00ffff', marginBottom: '24px' }}>5. Form Elements with Neon Cyan Focus</h2>
        <div style={{ background: 'rgba(22, 27, 51, 0.5)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(0, 255, 255, 0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Input Field</label>
              <input
                type="text"
                placeholder="Type to see neon focus..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, rgba(22, 27, 51, 0.6) 0%, rgba(22, 27, 51, 0.4) 100%)',
                  border: '1px solid rgba(0, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#fff',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00ffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 255, 255, 0.15), 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(0, 255, 255, 0.15)';
                  e.target.style.background = 'linear-gradient(135deg, rgba(22, 27, 51, 0.8) 0%, rgba(22, 27, 51, 0.6) 100%)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 255, 255, 0.15)';
                  e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(255, 255, 255, 0.05)';
                  e.target.style.background = 'linear-gradient(135deg, rgba(22, 27, 51, 0.6) 0%, rgba(22, 27, 51, 0.4) 100%)';
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Select Field</label>
              <select
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, rgba(22, 27, 51, 0.6) 0%, rgba(22, 27, 51, 0.4) 100%)',
                  border: '1px solid rgba(0, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#fff',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00ffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 255, 255, 0.15), 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(0, 255, 255, 0.15)';
                  e.target.style.background = 'linear-gradient(135deg, rgba(22, 27, 51, 0.8) 0%, rgba(22, 27, 51, 0.6) 100%)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 255, 255, 0.15)';
                  e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(255, 255, 255, 0.05)';
                  e.target.style.background = 'linear-gradient(135deg, rgba(22, 27, 51, 0.6) 0%, rgba(22, 27, 51, 0.4) 100%)';
                }}
              >
                <option value="">Select an option...</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
                <option value="3">Option 3</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Text Area</label>
            <textarea
              rows={3}
              placeholder="Type to see neon focus..."
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'linear-gradient(135deg, rgba(22, 27, 51, 0.6) 0%, rgba(22, 27, 51, 0.4) 100%)',
                border: '1px solid rgba(0, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#fff',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s',
                outline: 'none',
                resize: 'vertical'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00ffff';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 255, 255, 0.15), 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(0, 255, 255, 0.15)';
                e.target.style.background = 'linear-gradient(135deg, rgba(22, 27, 51, 0.8) 0%, rgba(22, 27, 51, 0.6) 100%)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 255, 255, 0.15)';
                e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(255, 255, 255, 0.05)';
                e.target.style.background = 'linear-gradient(135deg, rgba(22, 27, 51, 0.6) 0%, rgba(22, 27, 51, 0.4) 100%)';
              }}
            />
          </div>
        </div>
      </section>

      {/* Instructions */}
      <section style={{ background: 'rgba(22, 27, 51, 0.5)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(0, 255, 255, 0.1)' }}>
        <h2 style={{ color: '#00ffff', marginBottom: '16px' }}>Additional Features</h2>
        <ul style={{ color: '#e2e8f0', lineHeight: '1.8' }}>
          <li><strong style={{ color: '#00ffff' }}>Neon Scrollbars:</strong> Scroll the page to see cyan thumb with glow and magenta track</li>
          <li><strong style={{ color: '#00ffff' }}>Live Lesson Cinema Mode:</strong> Available in Room.tsx - toggle in top-right corner of live room</li>
          <li><strong style={{ color: '#00ffff' }}>Face Verification Laser Scanner:</strong> Available in FaceStatusIndicator.tsx - active during loading</li>
          <li><strong style={{ color: '#00ffff' }}>GPU Acceleration:</strong> All animations use will-change for smooth 60fps performance</li>
        </ul>
      </section>
    </div>
  );
};

export default NeonUIDemo;
