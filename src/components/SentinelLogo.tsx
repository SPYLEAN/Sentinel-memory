interface SentinelLogoProps {
  size?: number;
  className?: string;
}

export function SentinelLogo({ size = 24, className = '' }: SentinelLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`sentinel-logo-mark ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.3" />
      <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 6" opacity="0.6" />
      <circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="50" cy="50" r="6" fill="currentColor" />
      <line x1="50" y1="6" x2="50" y2="94" stroke="currentColor" strokeWidth="3" opacity="0.4" />
      <line x1="6" y1="50" x2="94" y2="50" stroke="currentColor" strokeWidth="3" opacity="0.4" />
      <path d="M 50 50 L 80 20" stroke="currentColor" strokeWidth="3" opacity="0.9" strokeDasharray="3 3" />
    </svg>
  );
}
