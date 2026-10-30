import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Sparkles,
  Lock,
  Unlock,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Award,
  Trash2
} from 'lucide-react';
import Avatar from './Avatar';
import { useI18n } from '../services/i18n';

export default function LocationSuggestionsView({
  event,
  currentUser,
  isOrganizer,
  onToggleAllowSuggestions,
  onAddLocationSuggestion,
  onVoteLocation,
  onSelectOfficialLocation,
  onRemoveLocationSuggestion
}) {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const allowSuggestions = event.allowLocationSuggestions ?? true;
  const suggestions = event.locationSuggestions || [];

  // Ordena por pontuação líquida: (aprovações - reprovações)
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const aVotes = a.votes || {};
    const bVotes = b.votes || {};
    const aScore = Object.values(aVotes).filter(v => v === 'approve').length - Object.values(aVotes).filter(v => v === 'reject').length;
    const bScore = Object.values(bVotes).filter(v => v === 'approve').length - Object.values(bVotes).filter(v => v === 'reject').length;
    return bScore - aScore;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newLocation = {
      id: `loc-${Date.now()}`,
      title: title.trim(),
      address: address.trim(),
      notes: notes.trim(),
      creator: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
      },
      createdAt: new Date().toISOString(),
      votes: {
        [currentUser.id]: 'approve' // Criador automaticamente aprova sua sugestão
      }
    };

    onAddLocationSuggestion(newLocation);
    setIsModalOpen(false);
    setTitle('');
    setAddress('');
    setNotes('');
  };

  return (
    <div className="location-suggestions-section" data-tour="location-suggestions-section">
      {/* Top Header: Controle do Administrador e Local Atual */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={22} color="var(--primary)" />
            Sugestões & Votação de Locais
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Convidados podem sugerir restaurantes, parques ou salas e votar aprovando ou reprovando cada opção.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Toggle do Administrador para abrir/fechar sugestões de locais */}
          {isOrganizer && (
            <button
              onClick={() => onToggleAllowSuggestions(!allowSuggestions)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: `1px solid ${allowSuggestions ? '#86efac' : '#cbd5e1'}`,
                background: allowSuggestions ? '#ecfdf5' : '#f1f5f9',
                color: allowSuggestions ? '#166534' : '#475569'
              }}
              title="Ativar ou desativar o recebimento de novas sugestões de locais"
            >
              {allowSuggestions ? <Unlock size={14} /> : <Lock size={14} />}
              <span>{allowSuggestions ? 'Votação de Locais: Aberta' : 'Votação de Locais: Fechada'}</span>
            </button>
          )}

          {allowSuggestions && currentUser && (
            <button
              className="btn-primary"
              onClick={() => setIsModalOpen(true)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              <Plus size={16} />
              Sugerir Novo Local
            </button>
          )}
        </div>
      </div>

      {/* Local Oficial Atual Definido */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MapPin size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
              Local Oficial Definido no Evento:
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {event.locationDetails || 'Ainda a definir pelo organizador'}
            </div>
          </div>
        </div>

        {!allowSuggestions && (
          <span style={{ fontSize: '0.78rem', color: '#b45309', background: '#fef3c7', padding: '0.2rem 0.6rem', borderRadius: 4, fontWeight: 700 }}>
            🔒 Sugestões encerradas pelo organizador
          </span>
        )}
      </div>

      {/* Lista de Sugestões de Locais com Votação */}
      {sortedSuggestions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
          <MapPin size={40} style={{ opacity: 0.35, margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Nenhum local sugerido ainda</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 420, margin: '0.25rem auto 1.25rem auto' }}>
            {allowSuggestions 
              ? 'Conhece um bom lugar para este evento? Adicione uma sugestão para os outros participantes votarem!' 
              : 'O organizador manteve o local fixo para este evento.'}
          </p>
          {allowSuggestions && currentUser && (
            <button
              className="btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} /> Sugerir Primeiro Local
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sortedSuggestions.map((loc, index) => {
            const votes = loc.votes || {};
            const approvals = Object.entries(votes).filter(([_, v]) => v === 'approve').map(([uid]) => uid);
            const rejections = Object.entries(votes).filter(([_, v]) => v === 'reject').map(([uid]) => uid);
            const myVote = votes[currentUser?.id];

            const approvedParticipants = event.participants.filter(p => approvals.includes(p.id));
            const rejectedParticipants = event.participants.filter(p => rejections.includes(p.id));

            const isCurrentOfficial = event.locationDetails && (
              event.locationDetails.toLowerCase().includes(loc.title.toLowerCase()) ||
              loc.title.toLowerCase().includes(event.locationDetails.toLowerCase())
            );

            return (
              <div
                key={loc.id}
                style={{
                  border: `1px solid ${isCurrentOfficial ? '#86efac' : 'var(--border-color)'}`,
                  background: isCurrentOfficial ? '#f0fdf4' : 'white',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative'
                }}
              >
                {/* Badge de Local Oficial */}
                {isCurrentOfficial && (
                  <div style={{
                    position: 'absolute',
                    top: -10,
                    right: 16,
                    background: '#15803d',
                    color: 'white',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: '0 2px 6px rgba(21, 128, 61, 0.3)'
                  }}>
                    <Award size={13} />
                    LOCAL OFICIAL DO EVENTO
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.65rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={18} color="var(--primary)" />
                      {loc.title}
                    </h3>
                    {loc.address && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        📍 {loc.address}
                      </div>
                    )}
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Avatar src={loc.creator?.avatar} name={loc.creator?.name} size={18} />
                      <span>Sugerido por <strong>{loc.creator?.name}</strong></span>
                    </div>
                  </div>

                  {/* Placar de Votos (Aprovações vs Reprovações) */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'right'
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#166534' }}>
                      👍 {approvals.length} aprovação{approvals.length !== 1 ? 'ões' : ''}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#991b1b' }}>
                      👎 {rejections.length} reprovação{rejections.length !== 1 ? 'ões' : ''}
                    </div>
                  </div>
                </div>

                {/* Justificativa / Observação */}
                {loc.notes && (
                  <div style={{
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    marginBottom: '1rem',
                    fontStyle: 'italic'
                  }}>
                    "{loc.notes}"
                  </div>
                )}

                {/* Lista de Quem Aprovou e Quem Reprovou */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: '0.78rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#166534' }}>Aprovado por:</span>
                    {approvedParticipants.length > 0 ? (
                      approvedParticipants.map(p => (
                        <span key={p.id} className="pill-attendee pill-full">
                          {p.name}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>Nenhuma aprovação</span>
                    )}
                  </div>

                  {rejectedParticipants.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                      <span style={{ fontWeight: 700, color: '#991b1b' }}>Reprovado por:</span>
                      {rejectedParticipants.map(p => (
                        <span key={p.id} className="pill-attendee pill-missing">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ações de Voto do Usuário Logado */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Seu voto:
                    </span>
                    <button
                      type="button"
                      onClick={() => onVoteLocation(loc.id, 'approve')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: `1px solid ${myVote === 'approve' ? 'var(--color-available)' : 'var(--border-color)'}`,
                        background: myVote === 'approve' ? 'var(--color-available-bg)' : 'white',
                        color: myVote === 'approve' ? '#065f46' : 'var(--text-main)'
                      }}
                    >
                      <ThumbsUp size={14} color={myVote === 'approve' ? 'var(--color-available)' : '#64748b'} />
                      Aprovar
                    </button>

                    <button
                      type="button"
                      onClick={() => onVoteLocation(loc.id, 'reject')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: `1px solid ${myVote === 'reject' ? 'var(--color-unavailable)' : 'var(--border-color)'}`,
                        background: myVote === 'reject' ? 'var(--color-unavailable-bg)' : 'white',
                        color: myVote === 'reject' ? '#991b1b' : 'var(--text-main)'
                      }}
                    >
                      <ThumbsDown size={14} color={myVote === 'reject' ? 'var(--color-unavailable)' : '#64748b'} />
                      Reprovar
                    </button>
                  </div>

                  {/* Ação do Administrador: Definir como Local Oficial ou Excluir */}
                  {isOrganizer && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => onSelectOfficialLocation(loc.title, loc.address)}
                        style={{
                          fontSize: '0.825rem',
                          padding: '0.45rem 1rem',
                          background: isCurrentOfficial ? '#15803d' : 'var(--primary)'
                        }}
                      >
                        <Check size={15} />
                        {isCurrentOfficial ? 'Local Oficial Selecionado' : 'Definir como Local Oficial'}
                      </button>

                      {onRemoveLocationSuggestion && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(t('confirmDeleteLocation') || 'Deseja realmente excluir esta sugestão de local?')) {
                              onRemoveLocationSuggestion(loc.id);
                            }
                          }}
                          style={{
                            fontSize: '0.825rem',
                            padding: '0.45rem 0.8rem',
                            background: 'white',
                            border: '1px solid #fecaca',
                            borderRadius: 'var(--radius-sm)',
                            color: '#dc2626',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title={t('btnDeleteLocation') || 'Excluir sugestão de local'}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                        >
                          <Trash2 size={14} />
                          <span>{t('btnDeleteLocation') || 'Excluir'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA SUGERIR NOVO LOCAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Sugestão Coletiva
                </div>
                <h3 className="modal-title">Sugerir Local para o Evento</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome do Local ou Estabelecimento</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Bar do Juarez, Parque Ibirapuera, Pizzaria Camelo..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Endereço, Ponto de Referência ou Link</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Av. Jurema, 300 - Moema (ou link do Google Maps)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Por que você recomenda este lugar?</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Ex: 'Comida boa, ambiente arejado, mesas grandes e fácil de estacionar'..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Cadastrar Sugestão de Local
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
