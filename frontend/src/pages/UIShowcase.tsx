import React, { useState } from 'react';
import { 
  Button, 
  Card, 
  Badge, 
  Avatar, 
  Progress, 
  Tabs,
  Dropdown,
  Chart,
  StatCard,
  NotificationPanel,
  BottomSheet,
  useToast
} from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';

const UIShowcase: React.FC = () => {
  const { showToast } = useToast();
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  const chartData = [
    { label: 'Mon', value: 65, color: 'var(--accent)' },
    { label: 'Tue', value: 78, color: 'var(--accent)' },
    { label: 'Wed', value: 90, color: 'var(--accent)' },
    { label: 'Thu', value: 45, color: 'var(--accent)' },
    { label: 'Fri', value: 88, color: 'var(--accent)' },
  ];

  const donutData = [
    { label: 'Completed', value: 45, color: 'var(--color-success)' },
    { label: 'In Progress', value: 30, color: 'var(--accent)' },
    { label: 'Pending', value: 25, color: 'var(--color-warning)' },
  ];

  const notifications = [
    {
      id: '1',
      title: 'New Assignment',
      message: 'You have a new assignment in Mathematics',
      time: '5 minutes ago',
      unread: true,
      type: 'info' as const,
      icon: '📝',
    },
    {
      id: '2',
      title: 'Test Results',
      message: 'Your test results are now available',
      time: '1 hour ago',
      unread: true,
      type: 'success' as const,
      icon: '✅',
    },
  ];

  const dropdownItems = [
    { key: '1', label: 'Profile', icon: '👤', onClick: () => showToast('Profile clicked', 'info') },
    { key: '2', label: 'Settings', icon: '⚙️', onClick: () => showToast('Settings clicked', 'info') },
    { key: 'divider', label: '', divider: true },
    { key: '3', label: 'Logout', icon: '🚪', danger: true, onClick: () => showToast('Logged out', 'error') },
  ];

  const tabs = [
    {
      key: 'components',
      label: 'Components',
      icon: '🧩',
      children: (
        <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Buttons */}
          <section>
            <h3 className="h3 mb-4">Buttons</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="neon">Neon</Button>
              <Button variant="error">Error</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button isLoading>Loading</Button>
            </div>
          </section>

          {/* Badges */}
          <section>
            <h3 className="h3 mb-4">Badges</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge variant="default">Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="primary" dot pulse>Live</Badge>
            </div>
          </section>

          {/* Avatars */}
          <section>
            <h3 className="h3 mb-4">Avatars</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Avatar name="John Doe" size="xs" />
              <Avatar name="Jane Smith" size="sm" status="online" />
              <Avatar name="Bob Wilson" size="md" status="away" />
              <Avatar name="Alice Brown" size="lg" status="busy" />
              <Avatar name="Charlie Davis" size="xl" />
            </div>
          </section>

          {/* Progress */}
          <section>
            <h3 className="h3 mb-4">Progress Bars</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Progress value={45} showLabel label="Completion" />
              <Progress value={75} variant="success" showLabel />
              <Progress value={90} variant="warning" striped animated />
              <Progress value={30} variant="error" size="lg" showLabel />
            </div>
          </section>

          {/* Dropdown */}
          <section>
            <h3 className="h3 mb-4">Dropdown</h3>
            <Dropdown items={dropdownItems}>
              <Button variant="outline">Open Menu</Button>
            </Dropdown>
          </section>
        </div>
      ),
    },
    {
      key: 'charts',
      label: 'Charts',
      icon: '📊',
      children: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <Card>
            <Chart data={chartData} type="bar" title="Weekly Activity" />
          </Card>
          <Card>
            <Chart data={donutData} type="donut" title="Task Distribution" />
          </Card>
        </div>
      ),
    },
    {
      key: 'stats',
      label: 'Statistics',
      icon: '📈',
      children: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <StatCard
            title="Total Students"
            value="2,543"
            icon="👥"
            color="primary"
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Active Courses"
            value="42"
            icon="📚"
            color="success"
            trend={{ value: 5, isPositive: true }}
          />
          <StatCard
            title="Pending Tasks"
            value="18"
            icon="⏳"
            color="warning"
            trend={{ value: 3, isPositive: false }}
          />
          <StatCard
            title="Completion Rate"
            value="94%"
            icon="✅"
            color="success"
            trend={{ value: 8, isPositive: true }}
          />
        </div>
      ),
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: '🔔',
      children: (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <NotificationPanel
            notifications={notifications}
            onNotificationClick={(id) => showToast(`Clicked notification ${id}`, 'info')}
            onMarkAllRead={() => showToast('All marked as read', 'success')}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="neon-text-gradient">UI Component Showcase</h1>
        <ThemeToggle />
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Button onClick={() => showToast('Success message!', 'success')}>
          Show Success Toast
        </Button>
        <Button variant="error" onClick={() => showToast('Error occurred!', 'error')}>
          Show Error Toast
        </Button>
        <Button variant="outline" onClick={() => showToast('Warning message!', 'warning')}>
          Show Warning Toast
        </Button>
        <Button variant="secondary" onClick={() => setBottomSheetOpen(true)}>
          Open Bottom Sheet
        </Button>
      </div>

      <Tabs tabs={tabs} defaultActiveKey="components" variant="card" />

      <BottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        title="Bottom Sheet Example"
      >
        <div style={{ padding: '1rem' }}>
          <h4>This is a mobile-friendly bottom sheet!</h4>
          <p>You can drag it to resize or swipe down to close.</p>
          <Button onClick={() => setBottomSheetOpen(false)} block>
            Close
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default UIShowcase;
