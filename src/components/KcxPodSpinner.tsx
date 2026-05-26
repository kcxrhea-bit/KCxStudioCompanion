import React from 'react';

interface KcxPodSpinnerProps {
  state?: 'idle' | 'processing' | 'error';
}

export const KcxPodSpinner: React.FC<KcxPodSpinnerProps> = ({ state = 'idle' }) => {
  const getGradient = () => {
    switch (state) {
      case 'idle':
        return { id: 'kcxPodIdle', start: '#00f2fe', end: '#00f2fe' };
      case 'processing':
        return { id: 'kcxPodActive', start: '#ff007f', end: '#00f2fe' };
      case 'error':
        return { id: 'kcxPodError', start: '#ff3d3d', end: '#ff3d3d' };
      default:
        return { id: 'kcxPodIdle', start: '#00f2fe', end: '#00f2fe' };
    }
  };

  const gradient = getGradient();
  const shouldAnimate = state !== 'error';

  return (
    <div className="kcx-pod-spinner">
      <svg
        className="kcx-pod-spinner-svg"
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradient.id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradient.start} stopOpacity="1" />
            <stop offset="100%" stopColor={gradient.end} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Background track ring */}
        <circle
          className="kcx-pod-ring-track"
          cx="16"
          cy="16"
          r="14"
          fill="none"
          stroke="rgba(102, 112, 133, 0.42)"
          strokeWidth="1.25"
        />

        {/* Animated orbital ring */}
        <circle
          className={shouldAnimate ? 'kcx-pod-ring-arc' : 'kcx-pod-ring-arc-stopped'}
          cx="16"
          cy="16"
          r="14"
          fill="none"
          stroke={`url(#${gradient.id})`}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeDasharray="18 56"
        >
          {shouldAnimate && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 16 16"
              to="360 16 16"
              dur="1.9s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* Center core */}
        <circle
          cx="16"
          cy="16"
          r="4"
          fill={gradient.start}
          opacity="0.8"
        />
      </svg>
    </div>
  );
};
