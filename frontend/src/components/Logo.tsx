import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'red' | 'white' | 'gold';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  variant = 'red',
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-[26px] h-[26px]',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-[15px]',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const gradientId = `legendsMark-${variant}`;
  const fill = variant === 'white' ? '#FFFFFF' : variant === 'gold' ? '#C89A3F' : `url(#${gradientId})`;
  const textColor = variant === 'white' ? 'text-white' : variant === 'gold' ? 'text-gold-accent' : 'text-brand-red';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 100 100" className={iconSizes[size]}>
        {variant === 'red' && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#E8203F" />
              <stop offset="1" stopColor="#7A0C1E" />
            </linearGradient>
          </defs>
        )}
        <polygon points="50,6 78,34 50,34" fill={fill} />
        <polygon points="22,34 50,34 50,62" fill={fill} />
        <polygon points="50,38 78,38 50,66" fill={fill} />
        <polygon points="6,50 34,22 34,50" fill={fill} />
        <polygon points="66,50 94,50 66,78" fill={fill} />
        <polygon points="34,66 34,94 50,66" fill={fill} />
      </svg>

      {showText && (
        <span className={`font-extrabold tracking-tight ${textSizes[size]} ${textColor}`}>
          Legends
        </span>
      )}
    </div>
  );
};
