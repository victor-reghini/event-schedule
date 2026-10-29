import React, { useState } from 'react';

// Gera cor de fundo estável e agradável a partir do nome
function getColorFromName(name) {
  if (!name) return '#3b82f6';
  const colors = [
    '#2563eb', // blue
    '#7c3aed', // violet
    '#db2777', // pink
    '#ea580c', // orange
    '#059669', // emerald
    '#0891b2', // cyan
    '#4f46e5', // indigo
    '#d97706', // amber
    '#0284c7'  // sky
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Extrai as iniciais do nome (ex: Victor Reghini -> VR)
export function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toUpperCase();
}

export default function Avatar({
  src,
  name,
  size = 32,
  className = '',
  style = {},
  title,
  alt,
  border = '1px solid white'
}) {
  const [hasError, setHasError] = useState(false);

  const displayInitials = getInitials(name || alt);
  const bgColor = getColorFromName(name || alt);
  const fontSize = Math.max(10, Math.round(size * 0.4));

  if (!src || src.trim() === '' || hasError) {
    return (
      <div
        className={`user-avatar-initials ${className}`}
        title={title || name || alt}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius: '50%',
          backgroundColor: bgColor,
          color: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: `${fontSize}px`,
          letterSpacing: '0.5px',
          userSelect: 'none',
          boxSizing: 'border-box',
          border,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          lineHeight: 1,
          flexShrink: 0,
          ...style
        }}
      >
        {displayInitials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || name || 'Avatar'}
      title={title || name || alt}
      className={`user-avatar-img ${className}`}
      onError={() => setHasError(true)}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        objectFit: 'cover',
        border,
        boxSizing: 'border-box',
        flexShrink: 0,
        ...style
      }}
    />
  );
}
