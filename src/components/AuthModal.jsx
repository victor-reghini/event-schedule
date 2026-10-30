import React, { useState } from 'react';
import { Lock, Mail, User, LogIn, UserPlus, KeyRound, AlertCircle, Info } from 'lucide-react';
import { loginUser, registerUser, TEST_CREDENTIALS } from '../services/auth';

export default function AuthModal({
  onAuthSuccess,
  onClose,
  canClose = true
}) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const session = await loginUser(email, password);
        onAuthSuccess(session);
      } else {
        if (!name.trim()) {
          throw new Error('Informe seu nome.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }
        const session = await registerUser(name, email, password);
        if (session?.requiresEmailConfirmation) {
          setTab('login');
          setInfoMessage(
            `Conta criada para ${session.email}. Confirme o link enviado por e-mail antes de entrar.`
          );
          return;
        }
        onAuthSuccess(session);
      }
    } catch (err) {
      setError(err.message || 'Erro ao realizar autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillTestAccount = (testEmail, testSenha) => {
    setEmail(testEmail);
    setPassword(testSenha);
    setError('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 46,
            height: 46,
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem auto'
          }}>
            <Lock size={22} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
            {tab === 'login' ? 'Entrar no Sincroniza' : 'Criar Nova Conta'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {tab === 'login' 
              ? 'Acesse com sua conta para gerenciar e votar em eventos' 
              : 'Cadastre-se rapidamente para participar das votações'}
          </p>
        </div>

        {/* Alternador de Abas: Login / Cadastro */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 4,
          marginBottom: '1.25rem'
        }}>
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              background: tab === 'login' ? 'white' : 'transparent',
              color: tab === 'login' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: tab === 'login' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              background: tab === 'register' ? 'white' : 'transparent',
              color: tab === 'register' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: tab === 'register' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            Cadastrar
          </button>
        </div>

        {infoMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            <Info size={16} />
            <span>{infoMessage}</span>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">E-mail</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <KeyRound size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
          >
            {tab === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
            <span>{loading ? 'Validando...' : (tab === 'login' ? 'Entrar com Senha' : 'Criar Conta')}</span>
          </button>
        </form>

        {/* Guia Rápido de Contas de Teste: Exibido EXCLUSIVAMENTE em ambiente de desenvolvimento */}
        {Boolean(import.meta.env?.DEV) && (
          <div style={{
            marginTop: '1.5rem',
            padding: '0.85rem',
            background: '#f8fafc',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.78rem'
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Info size={14} color="var(--primary)" />
                <span>Contas de Teste (Senha: <code>senha123</code>):</span>
              </div>
              <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.35rem', borderRadius: 4, fontWeight: 700 }}>
                Dev Only
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {TEST_CREDENTIALS.map(tc => (
                <button
                  key={tc.email}
                  type="button"
                  onClick={() => handleFillTestAccount(tc.email, tc.senha)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.35rem 0.5rem',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{tc.name}</span>
                    <span style={{ color: 'var(--text-subtle)', marginLeft: 6 }}>({tc.email})</span>
                  </div>
                  <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.72rem' }}>Preencher</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {canClose && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}
            >
              Fechar sem alterar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
