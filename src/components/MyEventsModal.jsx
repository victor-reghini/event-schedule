import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  CheckCheck,
  XCircle,
  Filter,
  RotateCcw,
  Flag
} from 'lucide-react';
import EventStatusBadge from './EventStatusBadge';
import Avatar from './Avatar';
import { useI18n } from '../services/i18n';

export default function MyEventsModal({
  events,
  currentUser,
  currentEventId,
  onSelectEvent,
  onClose,
  onUpdateEventStatus
}) {
  const { t } = useI18n();

  // Filtro padrão: 'pending' (Pendentes & Ativos), ocultando encerrados e cancelados por padrão
  const [statusFilter, setStatusFilter] = useState('pending');

  // Cálculos de contagem por categoria
  const counts = {
    pending: events.filter(e => e.status === 'voting' || e.status === 'confirmed' || !e.status).length,
    voting: events.filter(e => e.status === 'voting' || !e.status).length,
    confirmed: events.filter(e => e.status === 'confirmed').length,
    completed: events.filter(e => e.status === 'completed').length,
    canceled: events.filter(e => e.status === 'canceled').length,
    all: events.length
  };

  // Filtra a lista de acordo com a aba selecionada
  const filteredEvents = events.filter(evt => {
    const st = evt.status || 'voting';
    if (statusFilter === 'pending') return st === 'voting' || st === 'confirmed';
    if (statusFilter === 'voting') return st === 'voting';
    if (statusFilter === 'confirmed') return st === 'confirmed';
    if (statusFilter === 'completed') return st === 'completed';
    if (statusFilter === 'canceled') return st === 'canceled';
    return true; // 'all'
  });

  const createdByMe = filteredEvents.filter(e => e.organizer?.id === currentUser?.id);
  const participatingIn = filteredEvents.filter(e =>
    e.organizer?.id !== currentUser?.id &&
    e.participants?.some(p => p.id === currentUser?.id)
  );

  const filterTabs = [
    {
      id: 'pending',
      label: t('filterPendingActive'),
      count: counts.pending,
      icon: <Clock size={13} />
    },
    {
      id: 'voting',
      label: t('filterVoting'),
      count: counts.voting,
      icon: <Clock size={13} />
    },
    {
      id: 'confirmed',
      label: t('filterConfirmed'),
      count: counts.confirmed,
      icon: <CheckCircle2 size={13} />
    },
    {
      id: 'completed',
      label: t('filterCompleted'),
      count: counts.completed,
      icon: <CheckCheck size={13} />
    },
    {
      id: 'canceled',
      label: t('filterCanceled'),
      count: counts.canceled,
      icon: <XCircle size={13} />
    },
    {
      id: 'all',
      label: t('filterAll'),
      count: counts.all,
      icon: <Filter size={13} />
    }
  ];


  const renderEventCard = (evt) => {
    const isSelected = evt.id === currentEventId;
    const isOrg = evt.organizer?.id === currentUser?.id;
    const eventStatus = evt.status || 'voting';

    return (
      <div
        key={evt.id}
        onClick={() => {
          onSelectEvent(evt.id);
          onClose();
        }}
        style={{
          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
          background: isSelected ? 'var(--primary-light)' : 'white',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          transition: 'all 0.15s ease',
          boxShadow: isSelected ? '0 0 0 2px var(--primary-border)' : 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', minWidth: 0 }}>
            <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>{evt.emoji || '📅'}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                  {evt.title}
                </span>
                {isSelected && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    background: 'var(--primary)',
                    color: 'white',
                    padding: '0.15rem 0.45rem',
                    borderRadius: 4
                  }}>
                    {t('you')} ({t('organizer')})
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Avatar src={evt.organizer?.avatar} name={evt.organizer?.name} size={16} />
                  <span>{evt.organizer?.name}</span>
                </span>
                <span>•</span>
                <span>⏱️ {Math.floor((evt.duration || 60) / 60)}h</span>
                <span>•</span>
                <span>👥 {evt.participants?.length || 0} {t('participants')}</span>
                {evt.locationDetails && (
                  <>
                    <span>•</span>
                    <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📍 {evt.locationDetails}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}
          >
            <EventStatusBadge
              status={eventStatus}
              size="sm"
              align="right"
              isOrganizer={isOrg}
              onStatusChange={onUpdateEventStatus ? (newStatus) => onUpdateEventStatus(newStatus, evt.id) : null}
            />
            <ArrowRight size={16} color={isSelected ? 'var(--primary)' : '#94a3b8'} style={{ marginTop: 4 }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              {t('myEvents')}
            </div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={22} color="var(--primary)" />
              {t('myEvents')} & Reuniões
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} title={t('btnCancel')}>
            <X size={20} />
          </button>
        </div>

        {/* Barra de Filtro de Status: Pendentes (default), Votação, Confirmados, Encerrados, Cancelados, Todos */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color)',
          WebkitOverflowScrolling: 'touch'
        }}>
          {filterTabs.map(tab => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: isActive ? 'var(--primary)' : 'white',
                  color: isActive ? 'white' : 'var(--text-main)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '0.05rem 0.4rem',
                  borderRadius: 10,
                  background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: isActive ? 'white' : '#475569',
                  fontWeight: 800
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mensagem se o filtro selecionado estiver vazio */}
        {filteredEvents.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '2.5rem 1rem',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-color)',
            marginBottom: '1rem'
          }}>
            <Filter size={32} color="var(--primary)" style={{ margin: '0 auto 0.75rem auto', opacity: 0.7 }} />
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: 4 }}>
              {statusFilter === 'pending'
                ? t('filterEmptyPending')
                : statusFilter === 'completed'
                ? t('filterEmptyCompleted')
                : statusFilter === 'canceled'
                ? t('filterEmptyCanceled')
                : t('filterEmptyGeneral')}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Alterne os filtros acima para visualizar outros eventos.
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStatusFilter('all')}
              style={{ fontSize: '0.8rem', margin: '0 auto' }}
            >
              Ver Todos os Eventos ({counts.all})
            </button>
          </div>
        )}

        {/* Criados por mim */}
        {createdByMe.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              marginBottom: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={17} color="var(--primary)" />
                Eventos que eu criei
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {createdByMe.length} {createdByMe.length === 1 ? 'evento' : 'eventos'}
              </span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {createdByMe.map(renderEventCard)}
            </div>
          </div>
        )}

        {/* Participando */}
        {participatingIn.length > 0 && (
          <div>
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              marginBottom: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={17} color="#059669" />
                Eventos que participo como convidado
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {participatingIn.length} {participatingIn.length === 1 ? 'evento' : 'eventos'}
              </span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {participatingIn.map(renderEventCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
