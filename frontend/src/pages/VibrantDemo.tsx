import React, { useState } from 'react';
import { Button, Card } from '../components/ui';

const VibrantDemo: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '3rem',
      background: 'var(--color-background)',
      backgroundImage: 'var(--gradient-ambient)'
    }}>
      <div className="bg-aurora" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        gap: '3rem',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        
        {/* Hero Section */}
        <div className="glass-vivid" style={{ 
          padding: '3rem', 
          borderRadius: 'var(--radius-2xl)',
          textAlign: 'center',
          maxWidth: '800px'
        }}>
          <h1 className="gradient-text-rainbow" style={{ 
            fontSize: '4rem', 
            marginBottom: '1rem',
            fontWeight: 800
          }}>
            Vibrant UI Design
          </h1>
          <p className="text-shimmer" style={{ 
            fontSize: '1.5rem',
            marginBottom: '2rem'
          }}>
            Bright, Colorful, and Energetic
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" size="lg" onClick={() => setCount(count + 1)}>
              Primary Button
            </Button>
            <Button variant="neon" size="lg">
              Neon Effect
            </Button>
            <Button variant="outline" size="lg">
              Outline Style
            </Button>
          </div>
          <p style={{ marginTop: '2rem', color: 'var(--color-text-secondary)' }}>
            Clicked {count} times
          </p>
        </div>

        {/* Glassmorphism Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          width: '100%',
          maxWidth: '1200px'
        }}>
          <div className="glass-purple glow-purple" style={{ 
            padding: '2rem', 
            borderRadius: 'var(--radius-xl)' 
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '1rem',
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Purple Glass
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Beautiful glassmorphism with purple tint and glowing effect
            </p>
          </div>

          <div className="glass-pink glow-pink" style={{ 
            padding: '2rem', 
            borderRadius: 'var(--radius-xl)' 
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '1rem',
              color: 'var(--accent-2)'
            }}>
              Pink Glass
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Vibrant pink glassmorphism with stunning glow effect
            </p>
          </div>

          <div className="glass-vivid glow-rainbow" style={{ 
            padding: '2rem', 
            borderRadius: 'var(--radius-xl)' 
          }}>
            <h3 className="gradient-text-vivid" style={{ 
              fontSize: '1.5rem', 
              marginBottom: '1rem'
            }}>
              Rainbow Glass
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Multi-color gradient with rainbow glow effect
            </p>
          </div>
        </div>

        {/* Neon Border Card */}
        <div className="border-neon-rainbow" style={{ 
          padding: '3rem',
          borderRadius: 'var(--radius-2xl)',
          background: 'var(--bg-elevated-1)',
          backdropFilter: 'blur(20px)',
          maxWidth: '800px',
          width: '100%'
        }}>
          <h2 className="text-shimmer" style={{ 
            fontSize: '2.5rem', 
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Neon Rainbow Border
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Button variant="primary" block>Primary</Button>
            <Button variant="secondary" block>Secondary</Button>
            <Button variant="outline" block>Outline</Button>
            <Button variant="ghost" block>Ghost</Button>
            <Button variant="neon" block>Neon</Button>
            <Button variant="error" block>Error</Button>
          </div>
        </div>

        {/* Holographic Section */}
        <div className="holographic" style={{ 
          padding: '3rem',
          borderRadius: 'var(--radius-2xl)',
          maxWidth: '800px',
          width: '100%',
          textAlign: 'center'
        }}>
          <h2 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '1rem',
            color: 'var(--color-text-primary)'
          }}>
            ✨ Holographic Effect ✨
          </h2>
          <p style={{ 
            fontSize: '1.2rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '2rem'
          }}>
            This card has an animated holographic shimmer effect
          </p>
          <Button variant="neon" size="lg">
            Experience Magic
          </Button>
        </div>

        {/* Color Showcase */}
        <div className="glass" style={{ 
          padding: '3rem',
          borderRadius: 'var(--radius-2xl)',
          maxWidth: '800px',
          width: '100%'
        }}>
          <h2 style={{ 
            fontSize: '2rem', 
            marginBottom: '2rem',
            textAlign: 'center',
            color: 'var(--color-text-primary)'
          }}>
            Color Palette
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="shadow-purple" style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent)' 
              }} />
              <div>
                <strong style={{ color: 'var(--accent)' }}>Purple</strong>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Primary Accent</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="shadow-pink" style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-2)' 
              }} />
              <div>
                <strong style={{ color: 'var(--accent-2)' }}>Pink</strong>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Secondary Accent</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="shadow-orange" style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-3)' 
              }} />
              <div>
                <strong style={{ color: 'var(--accent-3)' }}>Orange</strong>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Tertiary Accent</p>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Background Card */}
        <div className="bg-gradient-animated" style={{ 
          padding: '3rem',
          borderRadius: 'var(--radius-2xl)',
          maxWidth: '800px',
          width: '100%',
          textAlign: 'center',
          color: 'white'
        }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 800 }}>
            Animated Gradient
          </h2>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            This background is continuously moving and shifting colors
          </p>
        </div>

      </div>
    </div>
  );
};

export default VibrantDemo;
