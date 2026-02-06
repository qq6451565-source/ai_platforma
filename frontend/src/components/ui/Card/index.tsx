import React from 'react';
import './styles.css';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  extra?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  hasBeam?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  extra,
  footer,
  className = '',
  hoverable = false,
  hasBeam = false,
}) => {
  return (
    <div className={`card ${hoverable ? 'card-hover' : ''} ${hasBeam ? 'card-beam' : ''} ${className}`}>
      {hasBeam && <div className="card-beam-effect"></div>}
      {(title || extra) && (
        <div className="card-header">
          {title && <h3 className="h4 m-0">{title}</h3>}
          {extra && <div className="card-extra">{extra}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};
