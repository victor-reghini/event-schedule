import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Plus,
  History,
  LogOut,
  LogIn,
  Camera,
  ChevronDown,
  HelpCircle
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import Avatar from './Avatar';
import { useI18n } from '../services/i18n';

export default function Navbar({
  currentUser,
  onOpenCreate,
  onOpenHistory,
  onOpenAuth,
  onLogout,
  onOpenProfileAvatar,
  eventsCount,
  onStartTour
}) {
  const { t } = useI18n();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Fecha o dropdown ao pressionar Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="brand-logo">
          <div className="brand-icon">
            <Calendar size={20} />
          </div>
          <div className="brand-text-container">
            <span className="brand-name">{t('brandTitle')}</span>
            <span className="brand-tag">{t('brandTag')}</span>
          </div>
        </div>

        <div className="header-actions">
          <LanguageSelector />

          <button
            type="button"
            className="btn-header-tour"
            onClick={onStartTour}
            title={t('tourBtnTooltip')}
            aria-label={t('tourBtn')}
          >
            <HelpCircle size={15} />
            <span className="nav-btn-text">{t('tourBtn')}</span>
          </button>

          <button 
            className="btn-primary btn-header-action" 
            onClick={onOpenCreate}
            title={t('createEvent')}
            aria-label={t('createEvent')}
          >
            <Plus size={16} />
            <span className="nav-btn-text">{t('createEvent')}</span>
          </button>

          {/* Área de Autenticação Segura com Dropdown no Perfil */}
          {currentUser ? (
            <div className="header-user-dropdown" ref={dropdownRef}>
              <button
                type="button"
                className="user-switcher"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                title={`${currentUser.name} (${currentUser.email})`}
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
                style={{
                  cursor: 'pointer',
                  border: isDropdownOpen ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  background: isDropdownOpen ? 'white' : 'var(--bg-subtle)',
                  transition: 'all 0.15s ease',
                  boxShadow: isDropdownOpen ? 'var(--shadow-sm)' : 'none'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Avatar
                    src={currentUser.avatar}
                    name={currentUser.name}
                    size={26}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    background: 'var(--primary)',
                    color: 'white',
                    borderRadius: '50%',
                    width: 12,
                    height: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid white'
                  }}>
                    <Camera size={7} />
                  </div>
                </div>

                <span className="user-name-label">{currentUser.name}</span>

                {currentUser.isOrganizer ? (
                  <span className="badge-role badge-organizer">
                    {t('organizer')}
                  </span>
                ) : (
                  <span className="badge-role badge-guest">
                    {t('guest')}
                  </span>
                )}

                <ChevronDown
                  size={14}
                  style={{
                    color: 'var(--text-muted)',
                    transition: 'transform 0.15s ease',
                    transform: isDropdownOpen ? 'rotate(180deg)' : 'none'
                  }}
                />
              </button>

              {/* Menu Dropdown Flutuante */}
              {isDropdownOpen && (
                <div className="user-dropdown-menu" role="menu">
                  {/* Cabeçalho do Usuário com Foto e E-mail */}
                  <div className="user-dropdown-header">
                    <Avatar
                      src={currentUser.avatar}
                      name={currentUser.name}
                      size={40}
                      border="2px solid white"
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentUser.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentUser.email}
                      </div>
                      <div style={{ marginTop: 2 }}>
                        {currentUser.isOrganizer ? (
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
                            {t('organizer')}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
                            {t('guest')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Opção 1: Acessar Perfil / Alterar Foto de Perfil */}
                  <button
                    type="button"
                    className="user-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenProfileAvatar();
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Camera size={16} color="var(--primary)" />
                      <span>{t('profileModalTitle')}</span>
                    </div>
                  </button>

                  {/* Opção 2: Meus Eventos com contador */}
                  <button
                    type="button"
                    className="user-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenHistory();
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <History size={16} color="#059669" />
                      <span>{t('myEvents')}</span>
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: '#ecfdf5',
                      color: '#065f46',
                      padding: '0.1rem 0.45rem',
                      borderRadius: 10
                    }}>
                      {eventsCount}
                    </span>
                  </button>

                  {/* Opção 3: Tutorial / Como Funciona */}
                  <button
                    type="button"
                    className="user-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onStartTour();
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <HelpCircle size={16} color="var(--primary)" />
                      <span>{t('tourBtn')}</span>
                    </div>
                  </button>

                  <div className="user-dropdown-divider" />

                  {/* Opção 3: Sair da Conta (Logout) */}
                  <button
                    type="button"
                    className="user-dropdown-item danger"
                    role="menuitem"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <LogOut size={16} color="#dc2626" />
                      <span>{t('logout')}</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="btn-secondary btn-header-action btn-login"
              onClick={onOpenAuth}
              style={{ fontWeight: 700, color: 'var(--primary)', borderColor: 'var(--primary-border)' }}
            >
              <LogIn size={16} />
              <span className="nav-btn-text">{t('login')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
