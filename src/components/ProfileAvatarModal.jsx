import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Link,
  Trash2,
  Check,
  X,
  Sparkles,
  User,
  Image as ImageIcon
} from 'lucide-react';
import Avatar, { getInitials } from './Avatar';
import { useI18n } from '../services/i18n';

// Presets divertidos para o usuário escolher com 1 clique
const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
];

export default function ProfileAvatarModal({
  currentUser,
  onClose,
  onSaveAvatar
}) {
  const { t } = useI18n();
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || '');
  const [urlInput, setUrlInput] = useState('');
  const [activeMode, setActiveMode] = useState('upload'); // 'upload' | 'url' | 'presets'
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  if (!currentUser) return null;

  // Processa upload de arquivo local ou câmera do celular
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Redimensiona para no máximo 250x250 para otimizar armazenamento
        const canvas = document.createElement('canvas');
        const maxDim = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedAvatar(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setSelectedAvatar(urlInput.trim());
    setUrlInput('');
  };

  const handleClearPhoto = () => {
    setSelectedAvatar(''); // Ao limpar, ativa as iniciais (ex: Victor Reghini -> VR)
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveAvatar(selectedAvatar);
      onClose();
    } catch (err) {
      alert(err?.message || 'Erro ao salvar foto de perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              {t('profileModalSub')}
            </div>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Camera size={22} color="var(--primary)" />
              {t('profileModalTitle')}
            </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} title={t('btnCancel')}>
            <X size={20} />
          </button>
        </div>

        {/* Prévia Central do Avatar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          marginBottom: '1.25rem'
        }}>
          <div style={{ position: 'relative' }}>
            <Avatar
              src={selectedAvatar}
              name={currentUser.name}
              size={96}
              border="3px solid white"
              style={{ boxShadow: 'var(--shadow-md)' }}
            />
            {selectedAvatar && (
              <button
                type="button"
                onClick={handleClearPhoto}
                title={t('profileRemovePhotoTooltip')}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {selectedAvatar
                ? t('profileActiveCustom')
                : t('profileActiveInitials')}
            </div>
          </div>
        </div>

        {/* Abas de Escolha: Carregar Arquivo | Presets | Link */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.35rem',
          background: '#f1f5f9',
          padding: 4,
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem'
        }}>
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            style={{
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              background: activeMode === 'upload' ? 'white' : 'transparent',
              color: activeMode === 'upload' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeMode === 'upload' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            <Upload size={14} />
            <span>{t('profileUploadTab')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('presets')}
            style={{
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              background: activeMode === 'presets' ? 'white' : 'transparent',
              color: activeMode === 'presets' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeMode === 'presets' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            <Sparkles size={14} />
            <span>{t('profileGalleryTab')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('url')}
            style={{
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              background: activeMode === 'url' ? 'white' : 'transparent',
              color: activeMode === 'url' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeMode === 'url' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            <Link size={14} />
            <span>{t('profileUrlTab')}</span>
          </button>
        </div>

        {/* Conteúdo de Cada Modo */}
        {activeMode === 'upload' && (
          <div style={{ textAlign: 'center', padding: '1rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', background: 'white' }}>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <Upload size={32} color="var(--primary)" style={{ margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
              {t('profileUploadHeading')}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              {t('profileUploadSub')}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
            >
              <Camera size={16} />
              {t('profileSelectImageBtn')}
            </button>
          </div>
        )}

        {activeMode === 'presets' && (
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {t('profileGalleryHeading')}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.65rem'
            }}>
              {AVATAR_PRESETS.map((presetUrl, idx) => {
                const isSelected = selectedAvatar === presetUrl;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(presetUrl)}
                    style={{
                      padding: 4,
                      borderRadius: '50%',
                      border: `2.5px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.12s ease'
                    }}
                  >
                    <img
                      src={presetUrl}
                      alt={`Avatar preset ${idx + 1}`}
                      style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeMode === 'url' && (
          <form onSubmit={handleApplyUrl}>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">{t('profileUrlHeading')}</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://exemplo.com/minha-foto.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Check size={15} /> {t('profileApplyUrlBtn')}
            </button>
          </form>
        )}

        {/* Botão de Usar Iniciais (Remover Foto) */}
        <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleClearPhoto}
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#475569',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <User size={14} /> {t('profileUseInitialsBtn')} ({getInitials(currentUser.name)})
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
            >
              {t('btnCancel')}
            </button>
            <button
              type="button"
              disabled={saving}
              className="btn-primary"
              onClick={handleSave}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1.15rem' }}
            >
              <Check size={16} /> {saving ? 'Salvando...' : t('profileSaveBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
