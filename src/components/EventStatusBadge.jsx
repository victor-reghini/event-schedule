import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  CheckCheck,
  XCircle,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import { useI18n } from '../services/i18n';

export default function EventStatusBadge({
  status = 'voting',
  size = 'md',
  style = {},
  className = '',
  showPendingSuffix = true,
  isOrganizer = false,
  onStatusChange = null,
  align = 'left'
}) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Fecha o popover ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Fecha o popover ao pressionar Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const getStatusConfig = (st) => {
    switch (st) {
      case 'confirmed':
        return {
          label: t('statusConfirmed') || 'Confirmado',
          icon: <CheckCircle2 size={size === 'sm' ? 12 : 14} />,
          bg: '#dcfce7',
          color: '#166534',
          border: '1px solid #86efac'
        };
      case 'completed':
        return {
          label: t('statusCompleted') || 'Encerrado',
          icon: <CheckCheck size={size === 'sm' ? 12 : 14} />,
          bg: '#f1f5f9',
          color: '#475569',
          border: '1px solid #cbd5e1'
        };
      case 'canceled':
        return {
          label: t('statusCanceled') || 'Cancelado',
          icon: <XCircle size={size === 'sm' ? 12 : 14} />,
          bg: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fca5a5'
        };
      case 'voting':
      default:
        return {
          label: showPendingSuffix
            ? (t('statusVotingPending') || 'Em Votação (Pendente)')
            : (t('statusVoting') || 'Em Votação'),
          icon: <Clock size={size === 'sm' ? 12 : 14} />,
          bg: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fde68a'
        };
    }
  };

  const config = getStatusConfig(status);

  const sizeStyles = {
    sm: {
      fontSize: '0.7rem',
      padding: '0.15rem 0.5rem',
      gap: '0.25rem'
    },
    md: {
      fontSize: '0.76rem',
      padding: '0.24rem 0.65rem',
      gap: '0.35rem'
    },
    lg: {
      fontSize: '0.85rem',
      padding: '0.35rem 0.8rem',
      gap: '0.45rem'
    }
  }[size] || {};

  // Se não for organizador ou não tiver handler de mudança, exibe o badge fixo
  if (!isOrganizer || !onStatusChange) {
    return (
      <span
        className={`event-status-badge status-${status} ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontWeight: 700,
          borderRadius: 'var(--radius-full)',
          backgroundColor: config.bg,
          color: config.color,
          border: config.border,
          letterSpacing: '0.2px',
          lineHeight: 1.2,
          userSelect: 'none',
          flexShrink: 0,
          ...sizeStyles,
          ...style
        }}
      >
        {config.icon}
        <span>{config.label}</span>
      </span>
    );
  }

  const statusOptions = [
    {
      value: 'voting',
      label: t('statusVotingPending') || 'Em Votação (Pendente)',
      sub: t('statusVotingSub') || 'Aberto para receber disponibilidades',
      icon: <Clock size={13} />,
      iconBg: '#fef3c7',
      iconColor: '#92400e'
    },
    {
      value: 'confirmed',
      label: t('statusConfirmed') || 'Confirmado',
      sub: t('statusConfirmedSub') || 'Data e horário oficial definidos',
      icon: <CheckCircle2 size={13} />,
      iconBg: '#dcfce7',
      iconColor: '#166534'
    },
    {
      value: 'completed',
      label: t('statusCompleted') || 'Encerrado',
      sub: t('statusCompletedSub') || 'Concluído, encerra novas respostas',
      icon: <CheckCheck size={13} />,
      iconBg: '#f1f5f9',
      iconColor: '#475569'
    },
    {
      value: 'canceled',
      label: t('statusCanceled') || 'Cancelado',
      sub: t('statusCanceledSub') || 'Cancelado pelo organizador',
      icon: <XCircle size={13} />,
      iconBg: '#fee2e2',
      iconColor: '#991b1b'
    }
  ];

  return (
    <div
      className="event-status-badge-container"
      ref={containerRef}
      style={{ display: 'inline-flex', position: 'relative' }}
    >
      <button
        type="button"
        className={`event-status-badge status-${status} interactive ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        title={t('statusBadgeTooltip') || 'Clique para alterar o status do evento'}
        aria-haspopup="true"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontWeight: 700,
          borderRadius: 'var(--radius-full)',
          backgroundColor: config.bg,
          color: config.color,
          border: config.border,
          letterSpacing: '0.2px',
          lineHeight: 1.2,
          userSelect: 'none',
          flexShrink: 0,
          cursor: 'pointer',
          ...sizeStyles,
          ...style
        }}
      >
        {config.icon}
        <span>{config.label}</span>
        <ChevronDown
          size={size === 'sm' ? 11 : 13}
          style={{
            marginLeft: 1,
            transition: 'transform 0.15s ease',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            opacity: 0.85
          }}
        />
      </button>

      {/* Popup / Popover Flutuante para Alteração do Status */}
      {isOpen && (
        <div
          className={`status-popover-menu ${align === 'right' ? 'align-right' : ''}`}
          style={{
            ...(align === 'right' ? { left: 'auto', right: 0 } : {}),
            zIndex: 9999
          }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            padding: '0.5rem 0.85rem',
            background: '#f8fafc',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <span>{t('statusChangeHeader') || 'Alterar Status do Evento'}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: 2,
                display: 'flex'
              }}
              title={t('btnCancel')}
            >
              <X size={13} />
            </button>
          </div>

          <div style={{ padding: '0.25rem 0' }}>
            {statusOptions.map(opt => {
              const isCurrent = opt.value === status;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`status-popover-item ${isCurrent ? 'active' : ''}`}
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    onStatusChange(opt.value);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: opt.iconBg,
                      color: opt.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {opt.icon}
                    </span>
                    <div>
                      <div style={{
                        fontWeight: 700,
                        fontSize: '0.825rem',
                        color: isCurrent ? 'var(--primary)' : 'var(--text-main)'
                      }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                        {opt.sub}
                      </div>
                    </div>
                  </div>
                  {isCurrent && (
                    <Check size={15} color="var(--primary)" style={{ flexShrink: 0, marginLeft: 6 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
