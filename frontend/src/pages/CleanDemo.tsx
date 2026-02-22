import React, { useState } from 'react';
import { Button, Card, Badge, Avatar, Progress, Input } from '../components/ui';

const CleanDemo: React.FC = () => {
  const [text, setText] = useState('');

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '3rem',
      background: 'var(--color-background)',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      
      {/* Hero Section */}
      <div style={{ 
        textAlign: 'center',
        marginBottom: '4rem'
      }}>
        <h1 style={{ 
          fontSize: '3rem', 
          marginBottom: '1rem',
          color: 'var(--color-text-primary)',
          fontWeight: 700
        }}>
          Clean & Simple Design
        </h1>
        <p style={{ 
          fontSize: '1.25rem',
          color: 'var(--color-text-secondary)',
          marginBottom: '2rem'
        }}>
          Professional, minimal, and easy to use
        </p>
      </div>

      {/* Buttons Section */}
      <Card style={{ marginBottom: '2rem', padding: '2rem' }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '1.5rem',
          color: 'var(--color-text-primary)'
        }}>
          Buttons
        </h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="neon">Accent</Button>
          <Button variant="error">Delete</Button>
        </div>
      </Card>

      {/* Form Elements */}
      <Card style={{ marginBottom: '2rem', padding: '2rem' }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '1.5rem',
          color: 'var(--color-text-primary)'
        }}>
          Form Elements
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
          <Input 
            placeholder="Enter your name"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Input 
            placeholder="Email address"
            type="email"
          />
          <Input 
            placeholder="Password"
            type="password"
          />
        </div>
      </Card>

      {/* Badges & Avatars */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        <Card style={{ padding: '2rem' }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            marginBottom: '1rem',
            color: 'var(--color-text-primary)'
          }}>
            Badges
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
          </div>
        </Card>

        <Card style={{ padding: '2rem' }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            marginBottom: '1rem',
            color: 'var(--color-text-primary)'
          }}>
            Avatars
          </h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Avatar name="John Doe" size="sm" />
            <Avatar name="Jane Smith" size="md" status="online" />
            <Avatar name="Bob Wilson" size="lg" />
          </div>
        </Card>
      </div>

      {/* Progress Bars */}
      <Card style={{ marginBottom: '2rem', padding: '2rem' }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '1.5rem',
          color: 'var(--color-text-primary)'
        }}>
          Progress Indicators
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Progress value={25} showLabel label="In Progress (25%)" />
          <Progress value={60} variant="success" showLabel label="Completed (60%)" />
          <Progress value={85} variant="warning" showLabel label="Almost Done (85%)" />
        </div>
      </Card>

      {/* Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem'
      }}>
        <Card hover style={{ padding: '2rem' }}>
          <div style={{ 
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            fontSize: '1.5rem'
          }}>
            📊
          </div>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
            Analytics
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Track your progress with detailed analytics and insights.
          </p>
        </Card>

        <Card hover style={{ padding: '2rem' }}>
          <div style={{ 
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-success-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            fontSize: '1.5rem'
          }}>
            ✅
          </div>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
            Tasks
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Manage your tasks efficiently with our simple interface.
          </p>
        </Card>

        <Card hover style={{ padding: '2rem' }}>
          <div style={{ 
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-warning-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            fontSize: '1.5rem'
          }}>
            🔔
          </div>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
            Notifications
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Stay updated with real-time notifications.
          </p>
        </Card>
      </div>

    </div>
  );
};

export default CleanDemo;
