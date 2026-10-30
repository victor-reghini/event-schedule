import React, { useState } from 'react';
import { X, Clock, MapPin, Video, FileText, Trash2, Check, AlertTriangle, CalendarRange, CheckSquare, Plus } from 'lucide-react';
import { DURATION_OPTIONS } from '../services/templates';
import { useI18n } from '../services/i18n';

// Gera lista de datas YYYY-MM-DD entre duas datas (inclusive)
function generateDateRangeList(startDateStr, endDateStr) {
  const result = [];
  let curr = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  while (curr <= end) {
    result.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return result;
}

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

  // Período Sugerido: 'range' (período contínuo) ou 'specific' (dias específicos)
  const initialDateMode = event.dateMode || (event.dateRange ? 'range' : 'specific');
  const [dateMode, setDateMode] = useState(initialDateMode);

  const defaultStart = event.dateRange?.start || (event.dates?.[0] || new Date().toISOString().split('T')[0]);
  const defaultEnd = event.dateRange?.end || (event.dates?.[event.dates?.length - 1] || defaultStart);
  const [rangeStart, setRangeStart] = useState(defaultStart);
  const [rangeEnd, setRangeEnd] = useState(defaultEnd);

  const [specificDates, setSpecificDates] = useState(
    Array.isArray(event.dates) && event.dates.length > 0
      ? [...event.dates]
      : [defaultStart]
  );
  const [newDateInput, setNewDateInput] = useState('');

  // Sugestão de horário ideal
  const [suggestedStartTime, setSuggestedStartTime] = useState(event.suggestedTimeWindow?.start || '');
  const [suggestedEndTime, setSuggestedEndTime] = useState(event.suggestedTimeWindow?.end || '');

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddSpecificDate = () => {
    if (newDateInput && !specificDates.includes(newDateInput)) {
      setSpecificDates([...specificDates, newDateInput].sort());
      setNewDateInput('');
    }
  };

  const handleRemoveSpecificDate = (dateToRemove) => {
    if (specificDates.length > 1) {
      setSpecificDates(specificDates.filter(d => d !== dateToRemove));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalDates = [];
    if (dateMode === 'range') {
      if (rangeStart > rangeEnd) {
        alert('A data de início do período deve ser anterior ou igual à data de término.');
        return;
      }
      finalDates = generateDateRangeList(rangeStart, rangeEnd);
    } else {
      finalDates = specificDates;
    }

    if (!finalDates.length) {
      alert('Selecione ao menos um dia para o evento.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        duration: Number(duration),
        locationType,
        locationDetails: locationDetails.trim(),
        description: description.trim(),
        dateMode,
        dateRange: dateMode === 'range' ? { start: rangeStart, end: rangeEnd } : null,
        suggestedTimeWindow: (suggestedStartTime && suggestedEndTime) ? { start: suggestedStartTime, end: suggestedEndTime } : null,
        dates: finalDates
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

          {/* DEFINIÇÃO DO PERÍODO DO EVENTO (INTERVALO OU DIAS ESPECÍFICOS) */}
          <div className="form-group" style={{ margin: 0, background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 5, marginBottom: '0.5rem' }}>
              <CalendarRange size={15} color="var(--primary)" />
              {t('datesWindow')}
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDateMode('range')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: `1.5px solid ${dateMode === 'range' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: dateMode === 'range' ? 'var(--primary-light)' : 'white',
                  color: dateMode === 'range' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                <CalendarRange size={15} />
                Período Contínuo
              </button>

              <button
                type="button"
                onClick={() => setDateMode('specific')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: `1.5px solid ${dateMode === 'specific' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: dateMode === 'specific' ? 'var(--primary-light)' : 'white',
                  color: dateMode === 'specific' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                <CheckSquare size={15} />
                Dias Específicos
              </button>
            </div>

            {dateMode === 'range' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                    Início
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    required
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                    Término
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    required
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                  {specificDates.map(dStr => (
                    <div 
                      key={dStr}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '0.3rem 0.55rem',
                        background: 'white',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.825rem',
                        fontWeight: 600
                      }}
                    >
                      <span>{dStr}</span>
                      {specificDates.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveSpecificDate(dStr)}
                          style={{ color: '#94a3b8', display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="date"
                    className="form-input"
                    style={{ maxWidth: 180, fontSize: '0.85rem' }}
                    value={newDateInput}
                    onChange={(e) => setNewDateInput(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={handleAddSpecificDate}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
                  >
                    <Plus size={14} />
                    Adicionar Dia
                  </button>
                </div>
              </div>
            )}

            {/* Sugestão de Faixa de Horário Preferencial */}
            <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
                Sugestão de Horário Preferencial (Opcional)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>Das:</span>
                  <input
                    type="time"
                    className="form-input"
                    value={suggestedStartTime}
                    onChange={(e) => setSuggestedStartTime(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>Às:</span>
                  <input
                    type="time"
                    className="form-input"
                    value={suggestedEndTime}
                    onChange={(e) => setSuggestedEndTime(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
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
