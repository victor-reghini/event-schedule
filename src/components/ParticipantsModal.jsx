import React, { useState } from 'react';
import {
  Users,
  X,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Share2,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { useI18n } from '../services/i18n';
import Avatar from './Avatar';

export default function ParticipantsModal({
  event,
  currentUser,
  isOrganizer,
  onClose,
  onRemoveParticipant,
  onOpenShare
}) {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');

  const participants = event.participants || [];
  const organizerId = event.organizer?.id;

  const filteredParticipants = participants.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.email && p.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              {t('brandTitle')}
            </div>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={22} color="var(--primary)" />
              {t('participants')} ({participants.length})
            </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} title={t('btnCancel')}>
            <X size={20} />
          </button>
        </div>

        {isOrganizer && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-sm)',
            padding: '0.65rem 0.85rem',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0 }} />
            <span>
              <strong>Modo Organizador:</strong> Você tem permissão para gerenciar a lista e remover participantes indesejados deste evento.
            </span>
          </div>
        )}

        {/* Busca */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar participante por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        {/* Lista de Participantes */}
        <div style={{
          maxHeight: 320,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          paddingRight: '0.25rem',
          marginBottom: '1.25rem'
        }}>
          {filteredParticipants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Nenhum participante encontrado com esse termo.
            </div>
          ) : (
            filteredParticipants.map(p => {
              const isOrg = p.id === organizerId;
              const hasVoted = (p.customIntervals && p.customIntervals.length > 0) ||
                (p.availabilities && Object.keys(p.availabilities).length > 0);

              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.85rem',
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <Avatar
                      src={p.avatar}
                      name={p.name}
                      size={40}
                      border={isOrg ? '2px solid #f59e0b' : '1px solid var(--border-color)'}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {p.name}
                        </span>
                        {isOrg && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '0.1rem 0.4rem',
                            borderRadius: 4
                          }}>
                            {t('organizer')}
                          </span>
                        )}
                        {p.id === currentUser?.id && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '0.1rem 0.4rem',
                            borderRadius: 4
                          }}>
                            {t('you')}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.email}
                      </div>
                      <div style={{ fontSize: '0.72rem', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {hasVoted ? (
                          <span style={{ color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircle2 size={12} color="#16a34a" /> Disponibilidade registrada
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={12} /> Aguardando voto
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ação de Remoção exclusiva do Organizador */}
                  {isOrganizer && !isOrg && (
                    <button
                      type="button"
                      onClick={() => onRemoveParticipant(p.id, p.name)}
                      title={`Remover ${p.name} do evento`}
                      style={{
                        padding: '0.4rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#dc2626',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#dc2626';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fef2f2';
                        e.currentTarget.style.color = '#dc2626';
                      }}
                    >
                      <Trash2 size={14} />
                      Remover
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
          {onOpenShare && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                onClose();
                onOpenShare();
              }}
              style={{ fontSize: '0.85rem' }}
            >
              <Share2 size={16} />
              Convidar Mais Pessoas
            </button>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{ fontSize: '0.85rem', marginLeft: 'auto' }}
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
