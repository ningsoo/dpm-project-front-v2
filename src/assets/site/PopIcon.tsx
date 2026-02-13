'use client';

interface PopIconProps {
  size?: number;
  className?: string;
}

export function PopIcon({ size = 64, className = '' }: PopIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={ { overflow: 'visible' } }
    >
      <style>
        {`
          .bubble {
            transition: transform 0.3s ease-out;
          }
          svg:hover .bubble {
            animation: floatUp 0.6s ease-out;
          }
          @keyframes floatUp {
            0% {
              transform: translateY(0);
              opacity: 1;
            }
            100% {
              transform: translateY(-15px);
              opacity: 0;
            }
          }
        `}
      </style>

      <circle cx="35" cy="62" r="9" fill="#E0D5F0" />
      <circle cx="35" cy="62" r="7" fill="#D4C5E8" />
      <circle cx="35" cy="62" r="4" fill="#F0E6FA" opacity="0.6" />

      <circle cx="55" cy="58" r="8" fill="#E0D5F0" />
      <circle cx="55" cy="58" r="6" fill="#D4C5E8" />
      <circle cx="55" cy="58" r="3.5" fill="#F0E6FA" opacity="0.6" />

      <path
        d="M 40 60 Q 42 45, 40 30 Q 39 25, 42 22"
        stroke="#E0D5F0"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M 60 56 Q 63 40, 62 25 Q 61 20, 64 17"
        stroke="#E0D5F0"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M 52 66 Q 54 55, 53 45"
        stroke="#D4C5E8"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M 40 30 Q 50 28, 62 25"
        stroke="#D4C5E8"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        opacity="0.8"
      />

      <path
        d="M 40 35 Q 50 33, 62 30"
        stroke="#F0E6FA"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />

      <g className="bubble">
        <circle cx="25" cy="35" r="3.5" fill="#D4C5E8" opacity="0.7" />
        <circle cx="25" cy="35" r="2" fill="#F0E6FA" opacity="0.8" />
      </g>

      <g className="bubble" style={ { animationDelay: '0.1s' } }>
        <circle cx="72" cy="40" r="4" fill="#E0D5F0" opacity="0.6" />
        <circle cx="72" cy="40" r="2.5" fill="#F0E6FA" opacity="0.7" />
      </g>

      <g className="bubble" style={ { animationDelay: '0.05s' } }>
        <circle cx="68" cy="28" r="3" fill="#D4C5E8" opacity="0.7" />
        <circle cx="68" cy="28" r="1.5" fill="#F0E6FA" opacity="0.6" />
      </g>

      <g className="bubble" style={ { animationDelay: '0.15s' } }>
        <circle cx="30" cy="50" r="2.5" fill="#F0E6FA" opacity="0.7" />
      </g>

      <path
        d="M 20 45 Q 25 43, 30 45"
        stroke="#D4C5E8"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.4"
      />

      <path
        d="M 70 50 Q 75 48, 80 50"
        stroke="#F0E6FA"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.4"
      />

      <circle cx="33" cy="60" r="3" fill="#EBD9F5" opacity="0.7" />
      <circle cx="53" cy="56" r="2.5" fill="#EBD9F5" opacity="0.7" />
      <ellipse cx="46" cy="67" rx="2" ry="1.5" fill="#F0E6FA" opacity="0.6" />
    </svg>
  );
}