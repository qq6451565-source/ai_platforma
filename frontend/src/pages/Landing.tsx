import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import './Landing.css';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="landing-page">
      <div className="landing-header">
        <div className="landing-logo">LMS</div>
        <LanguageSwitcher />
      </div>

      <div className="landing-content">
        <div className="hero-section">
          <div className="hero-illustration">
            <svg viewBox="0 0 200 200" className="holographic-svg">
              <defs>
                <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00ffff" />
                  <stop offset="50%" stopColor="#ff00ff" />
                  <stop offset="100%" stopColor="#00ffff" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <circle cx="100" cy="100" r="60" fill="none" stroke="url(#neonGradient)" strokeWidth="2" filter="url(#glow)" className="pulse-ring pulse-ring-1" />
              <circle cx="100" cy="100" r="50" fill="none" stroke="url(#neonGradient)" strokeWidth="2" filter="url(#glow)" className="pulse-ring pulse-ring-2" />
              <circle cx="100" cy="100" r="40" fill="none" stroke="url(#neonGradient)" strokeWidth="2" filter="url(#glow)" className="pulse-ring pulse-ring-3" />

              <polygon points="100,50 130,75 130,125 100,150 70,125 70,75" fill="none" stroke="url(#neonGradient)" strokeWidth="2" filter="url(#glow)" className="hexagon-rotate" />

              <circle cx="100" cy="100" r="15" fill="url(#neonGradient)" filter="url(#glow)" className="core-sphere" />

              <line x1="100" y1="40" x2="100" y2="25" stroke="#00ffff" strokeWidth="2" filter="url(#glow)" className="connector connector-1" />
              <line x1="130" y1="75" x2="145" y2="60" stroke="#ff00ff" strokeWidth="2" filter="url(#glow)" className="connector connector-2" />
              <line x1="130" y1="125" x2="145" y2="140" stroke="#00ffff" strokeWidth="2" filter="url(#glow)" className="connector connector-3" />
              <line x1="100" y1="160" x2="100" y2="175" stroke="#ff00ff" strokeWidth="2" filter="url(#glow)" className="connector connector-4" />
              <line x1="70" y1="125" x2="55" y2="140" stroke="#00ffff" strokeWidth="2" filter="url(#glow)" className="connector connector-5" />
              <line x1="70" y1="75" x2="55" y2="60" stroke="#ff00ff" strokeWidth="2" filter="url(#glow)" className="connector connector-6" />

              <circle cx="100" cy="25" r="3" fill="#00ffff" filter="url(#glow)" className="dot-pulse dot-1" />
              <circle cx="145" cy="60" r="3" fill="#ff00ff" filter="url(#glow)" className="dot-pulse dot-2" />
              <circle cx="145" cy="140" r="3" fill="#00ffff" filter="url(#glow)" className="dot-pulse dot-3" />
              <circle cx="100" cy="175" r="3" fill="#ff00ff" filter="url(#glow)" className="dot-pulse dot-4" />
              <circle cx="55" cy="140" r="3" fill="#00ffff" filter="url(#glow)" className="dot-pulse dot-5" />
              <circle cx="55" cy="60" r="3" fill="#ff00ff" filter="url(#glow)" className="dot-pulse dot-6" />
            </svg>
          </div>

          <h1 className="hero-title">
            {t('landing.title')}
          </h1>

          <p className="hero-subtitle">
            {t('landing.subtitle')}
            <br />
            {t('landing.subtitleLine2')}
          </p>

          <div className="cta-buttons">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/login')}
            >
              {t('landing.exploreNow')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/register')}
            >
              {t('landing.getStarted')}
            </Button>
          </div>
        </div>

        <div className="features-grid">
          <Card className="feature-card" hoverable>
            <div className="feature-icon">🚀</div>
            <h3>{t('landing.featureAI.title')}</h3>
            <p>{t('landing.featureAI.description')}</p>
          </Card>
          <Card className="feature-card" hoverable>
            <div className="feature-icon">⚡</div>
            <h3>{t('landing.featureLightning.title')}</h3>
            <p>{t('landing.featureLightning.description')}</p>
          </Card>
          <Card className="feature-card" hoverable>
            <div className="feature-icon">🎯</div>
            <h3>{t('landing.featureAnalytics.title')}</h3>
            <p>{t('landing.featureAnalytics.description')}</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Landing;
