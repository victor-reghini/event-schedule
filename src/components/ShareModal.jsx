import React, { useState } from 'react';
import { X, Copy, Check, MessageCircle, Share2, Link as LinkIcon, QrCode } from 'lucide-react';

export default function ShareModal({
  event,
  onClose
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}${window.location.pathname}?event=${event.id}`;
  const shareText = `Oi! Estou organizando "${event.title}". Por favor, vote nos seus horários disponíveis para encontrarmos a melhor data para todos: ${shareUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Convide os Participantes
            </div>
            <h2 className="modal-title">Compartilhar Evento</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Envie o link abaixo para seus amigos ou equipe. Cada um poderá marcar suas disponibilidades e sugestões sem complicações.
        </p>

        {/* Campo com Link Copiável */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.4rem',
          marginBottom: '1.25rem'
        }}>
          <input
            type="text"
            readOnly
            value={shareUrl}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '0.5rem',
              fontSize: '0.85rem',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          />
          <button
            className="btn-primary"
            onClick={handleCopy}
            style={{ whiteSpace: 'nowrap' }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>

        {/* Compartilhar direto no WhatsApp */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={handleWhatsApp}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              padding: '0.75rem',
              background: '#25d366',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.95rem',
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)'
            }}
          >
            <MessageCircle size={20} />
            Compartilhar no WhatsApp
          </button>
        </div>

        <div style={{
          background: '#f8fafc',
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          💡 <strong>Dica:</strong> Seus convidados não precisam de senhas complexas. Eles informam apenas o nome e já marcam sua disponibilidade em menos de 30 segundos!
        </div>
      </div>
    </div>
  );
}
