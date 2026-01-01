
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "w-12 h-12 lg:w-16 lg:h-16" }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`${className} shadow-xl rounded-[22%]`}
    >
      {/* Background Gradient */}
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <rect width="100" height="100" rx="22" fill="url(#logoGrad)" />
      
      {/* Simplified Laptop/Screen Shape */}
      <rect x="20" y="25" width="60" height="40" rx="4" fill="#1E293B" />
      <rect x="23" y="28" width="54" height="34" rx="2" fill="#334155" />
      
      {/* Code Symbol </> */}
      <path 
        d="M42 38L37 45L42 52M58 38L63 45L58 52M53 36L47 54" 
        stroke="#FACC15" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Floating Elements (Algorithm Nodes) */}
      <circle cx="20" cy="75" r="5" fill="#10B981" filter="url(#glow)" />
      <rect x="32" y="70" width="12" height="10" rx="2" fill="#F59E0B" />
      <path d="M25 75H32" stroke="white" strokeWidth="2" strokeDasharray="2 2" />

      {/* Lightbulb Idea (Simplified) */}
      <circle cx="80" cy="40" r="8" fill="#FDE047" opacity="0.8" />
      <path d="M80 32V30M87 35L89 33M87 45L89 47M73 35L71 33" stroke="#FDE047" strokeWidth="2" />
    </svg>
  );
};

export default Logo;
