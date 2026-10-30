import React, { useState } from 'react';
import { X, Clock, MapPin, Video, FileText, Trash2, Check, AlertTriangle } from 'lucide-react';
import { DURATION_OPTIONS } from '../services/templates';
import { useI18n } from '../services/i18n';

export default function EditEventModal({
  event,
  onSave,
  onDelete,
  onClose
}) {
  const { t } = useI18n();

  const [title, setTitle] = useState(event.title || '');
  const [duration, setDuration] = useState(event.duration || 60);
  const [locationType, setLocationType] = useState(event.locationType || 'presencial');
  const [locationDetails, setLocationDetails] = useState(event.locationDetails || '');
  const [description, setDescription] = useState(event.description || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        duration: Number(duration),
        locationType,
        locationDetails: locationDetails.trim(),
        description: description.trim()
      });
      onClose();
    } catch (err) {
      alert(err.message || 'Erro ao salvar alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmMessage = t('confirmDeleteEvent') || `Tem certeza que deseja excluir o evento "${event.title}"? Esta ação não pode ser desfeita.`;
    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      await onDelete(event.id);
      onClose();
    } catch (err) {
      alert(err.message || 'Erro ao excluir evento.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 540 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              {t('editEvent')}
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              {t('editEventSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Título do Evento */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
              Título do Evento *
            </label>
            <input
              type="text"
              required
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Almoço de Confraternização"
              style={{ fontSize: '0.95rem' }}
            />
          </div>

          {/* Duração Estimada */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={15} color="var(--primary)" />
              {t('duration')}
            </label>
            <select
              className="form-input"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ fontSize: '0.9rem', cursor: 'pointer' }}
            >
              {DURATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Localização: Presencial / Online */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={15} color="var(--primary)" />
              {t('location')}
            </label>
            
            {/* Seletor de Tipo de Local */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setLocationType('presencial')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  border: `1.5px solid ${locationType === 'presencial' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: locationType === 'presencial' ? 'var(--primary-light)' : 'white',
                  color: locationType === 'presencial' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                <MapPin size={15} />
                <span>{t('presential')}</span>
              </button>

              <button
                type="button"
                onClick={() => setLocationType('online')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  border: `1.5px solid ${locationType === 'online' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: locationType === 'online' ? 'var(--primary-light)' : 'white',
                  color: locationType === 'online' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                <Video size={15} />
                <span>{t('online')}</span>
              </button>
            </div>

            {/* Detalhes do Local */}
            <input
              type="text"
              className="form-input"
              value={locationDetails}
              onChange={(e) => setLocationDetails(e.target.value)}
              placeholder={locationType === 'online' ? 'Ex: Google Meet / Link da Chamada' : 'Ex: Restaurante, Pizzaria ou Endereço'}
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          {/* Descrição */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 5 }}>
              <FileText size={15} color="var(--primary)" />
              Descrição do Evento
            </label>
            <textarea
              className="form-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instruções, pauta ou detalhes para os participantes..."
              style={{ fontSize: '0.875rem' }}
            />
          </div>

          {/* Ações: Excluir Evento à esquerda, Cancelar e Salvar à direita */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            marginTop: '0.5rem'
          }}>
            <button
              type="button"
              disabled={isDeleting || isSaving}
              onClick={handleDelete}
              style={{
                fontSize: '0.825rem',
                padding: '0.55rem 0.9rem',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: 'var(--radius-sm)',
                color: '#e11d48',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ffe4e6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff1f2'; }}
            >
              <Trash2 size={15} />
              <span>{isDeleting ? 'Excluindo...' : t('deleteEvent')}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={isSaving || isDeleting}
                onClick={onClose}
                style={{ padding: '0.55rem 1rem', fontSize: '0.875rem' }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSaving || isDeleting}
                style={{ padding: '0.55rem 1.25rem', fontSize: '0.875rem' }}
              >
                <Check size={16} />
                <span>{isSaving ? 'Salvando...' : t('btnSaveChanges')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
