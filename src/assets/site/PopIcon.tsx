'use client';

import { useNonce } from '@/contexts/NonceContext';

interface PopIconProps {
  size?: number;
  className?: string;
}

export function PopIcon({ size = 64, className = '' }: PopIconProps) {
  const nonce = useNonce();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: 'visible' }}
    >
      <style {...(nonce ? { nonce } : {})}>
        {`
          @keyframes pop {
            0%, 100% { transform: translate(0, -14px) scale(1); opacity: 1; }
            50% { transform: translate(0, -14px) scale(1.1); opacity: 0.8; }
          }
          
          @keyframes float {
            0% { transform: translateY(0) scale(1); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-30px) scale(0.5); opacity: 0; }
          }
          
          .pop-main {
            animation: none;
          }
          
          .bubble-1, .bubble-2, .bubble-3, .bubble-4, .bubble-5 {
            opacity: 0;
          }
          
          .sparkle-group {
            opacity: 0;
            transition: opacity 0.2s ease;
          }
          
          svg:hover .sparkle-group {
            opacity: 0.6;
          }
          
          svg:hover .pop-main {
            animation: pop 2s ease-in-out infinite;
          }
          
          svg:hover .bubble-1 { animation: float 3s ease-in-out infinite; }
          svg:hover .bubble-2 { animation: float 3s ease-in-out 0.5s infinite; }
          svg:hover .bubble-3 { animation: float 3s ease-in-out 1s infinite; }
          svg:hover .bubble-4 { animation: float 3s ease-in-out 1.5s infinite; }
          svg:hover .bubble-5 { animation: float 3s ease-in-out 2s infinite; }
          
          /* Light mode colors */
          .pop-gradient-light { stop-color: #434343; }
          .pop-gradient-light-end { stop-color: #555555; }
          .pop-stem { stroke: #1a1a1a; }
          .bubble-light { fill: #777777; }
          .sparkle-light { fill: #999999; }
          
          /* Dark mode colors */
          @media (prefers-color-scheme: dark) {
            .pop-gradient-light { stop-color: #77746a; }
            .pop-gradient-light-end { stop-color: #77746a; }
            .pop-stem { stroke: #77746a; }
            .bubble-light { fill: #666666; }
            .sparkle-light { fill: #888888; }
          }
          
          /* Manual dark mode class support */
          .dark .pop-gradient-light { stop-color: #77746a; }
          .dark .pop-gradient-light-end { stop-color: #77746a; }
          .dark .pop-stem { stroke: #77746a; }
          .dark .bubble-light { fill: #666666; }
          .dark .sparkle-light { fill: #888888; }
        `}
      </style>

      <defs>
        <linearGradient id="popGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" className="pop-gradient-light" />
          <stop offset="100%" className="pop-gradient-light-end" />
        </linearGradient>
        
      </defs>

      {/* Dual eighth notes - solid style with rounded edges */}
      <g className="pop-main" transform="translate(0, -14)">
        {/* Left note head - outline only */}
        <ellipse
          cx="32"
          cy="82"
          rx="11"
          ry="8"
          fill="none"
          stroke="url(#popGradient)"
          strokeWidth="4.0"
          transform="rotate(-28 35 88)"
        />
        {/* Right note head - outline only */}
        <ellipse
          cx="60"
          cy="78"
          rx="11"
          ry="8"
          fill="none"
          stroke="url(#popGradient)"
          strokeWidth="4.0"
          transform="rotate(-28 65 72)"
        />
        {/* Left stem - note head와 접선 방향으로 부드럽게 이어짐 (cubic Bezier) */}
        <path
          d="M 39 78 C 38 68 38 58 36 48"
          stroke="url(#popGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Right stem - note head와 접선 방향으로 부드럽게 이어짐 (cubic Bezier) */}
        <path
          d="M 69 68.8 C 70 65 71 50 72 37"
          stroke="url(#popGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Beam - stem 상단을 직선으로 연결 */}
        <path
          d="M 36 48 L 72 37"
          stroke="url(#popGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Floating bubbles */}
      <g className="bubble-1">
        <circle cx="50" cy="55" r="6" className="bubble-light" opacity="0.8" />
        <circle cx="48" cy="53" r="2" fill="white" opacity="0.4" />
      </g>

      <g className="bubble-2">
        <circle cx="35" cy="50" r="5" className="bubble-light" opacity="0.7" />
        <circle cx="34" cy="49" r="1.5" fill="white" opacity="0.4" />
      </g>

      <g className="bubble-3">
        <circle cx="65" cy="52" r="4.5" className="bubble-light" opacity="0.75" />
        <circle cx="64" cy="51" r="1.5" fill="white" opacity="0.4" />
      </g>

      <g className="bubble-4">
        <circle cx="42" cy="40" r="4" className="bubble-light" opacity="0.65" />
        <circle cx="41" cy="39" r="1" fill="white" opacity="0.4" />
      </g>

      <g className="bubble-5">
        <circle cx="58" cy="38" r="3.5" className="bubble-light" opacity="0.6" />
        <circle cx="57" cy="37" r="1" fill="white" opacity="0.4" />
      </g>

      {/* Sparkles - 호버 시에만 표시 */}
      <g className="sparkle-group sparkle-light">
        <path d="M 30 32 L 31 34 L 33 35 L 31 36 L 30 38 L 29 36 L 27 35 L 29 34 Z" />
        <path d="M 70 30 L 71 32 L 73 33 L 71 34 L 70 36 L 69 34 L 67 33 L 69 32 Z" />
        <path d="M 50 25 L 51 27 L 53 28 L 51 29 L 50 31 L 49 29 L 47 28 L 49 27 Z" />
      </g>
    </svg>
  );
}
