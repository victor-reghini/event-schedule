import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useI18n, LANGUAGES } from '../services/i18n';

export default function LanguageSelector() {
  const { lang, setLang, currentLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="language-selector-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger Button igual ao print do usuário */}
      <button
        type="button"
        className="language-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Selecionar idioma"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.4rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          background: 'white',
          border: '1.5px solid var(--border-color)',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.15s ease',
          minHeight: '38px',
          minWidth: '78px',
          justifyContent: 'space-between'
        }}
      >
        <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{currentLanguage.flag}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>{currentLanguage.short}</span>
        {isOpen ? (
          <ChevronUp size={15} color="var(--text-muted)" />
        ) : (
          <ChevronDown size={15} color="var(--text-muted)" />
        )}
      </button>

      {/* Popover Dropdown idêntico ao screenshot */}
      {isOpen && (
        <div
          className="language-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'white',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            zIndex: 100,
            minWidth: '165px',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'fadeInScale 0.15s ease'
          }}
        >
          {LANGUAGES.map(item => {
            const isSelected = item.code === lang;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setLang(item.code);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isSelected ? '#e0f2fe' : 'transparent',
                  color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{item.flag}</span>
                  <span>{item.name}</span>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: isSelected ? 'var(--primary)' : '#94a3b8',
                  letterSpacing: '0.5px'
                }}>
                  {item.short}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
