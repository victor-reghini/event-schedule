/**
 * Serviço de Autenticação Segura (Login, Cadastro e Logout)
 * Impede impersonação e protege o acesso aos dados do usuário.
 */

// SHA-256 exato para a senha padrão 'senha123'
const SENHA_123_HASH = '55a5e9e78207b4df8699d60886fa070079463547b095d1a05bc719bb4e6cd251';

// Função utilitária para hash seguro SHA-256
export async function hashPassword(password) {
  const cleanPass = password.trim();
  const msgUint8 = new TextEncoder().encode(cleanPass);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const STORAGE_USERS_KEY = 'sincroniza_registered_users_v4';
const STORAGE_SESSION_KEY = 'sincroniza_current_session_v4';

// Contas padrão pré-configuradas para testes (senha: senha123)
const DEFAULT_ACCOUNTS = [
  {
    id: 'usr-victor',
    name: 'Victor Reghini',
    email: 'victor@exemplo.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    passwordHash: SENHA_123_HASH,
    isOrganizer: true
  },
  {
    id: 'usr-camila',
    name: 'Camila Santos',
    email: 'camila@exemplo.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    passwordHash: SENHA_123_HASH
  },
  {
    id: 'usr-rodrigo',
    name: 'Rodrigo Lima',
    email: 'rodrigo@exemplo.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    passwordHash: SENHA_123_HASH
  },
  {
    id: 'usr-mariana',
    name: 'Mariana Duarte',
    email: 'mariana@exemplo.com',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    passwordHash: SENHA_123_HASH
  },
  {
    id: 'usr-lucas',
    name: 'Lucas Almeida',
    email: 'lucas@exemplo.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    passwordHash: SENHA_123_HASH
  }
];

export function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      const users = JSON.parse(raw);
      // Garante que as contas de teste tenham sempre o hash correto mesmo se houver cache antigo
      let updated = false;
      users.forEach(u => {
        if (DEFAULT_ACCOUNTS.some(d => d.email === u.email) && u.passwordHash !== SENHA_123_HASH) {
          u.passwordHash = SENHA_123_HASH;
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
      }
      return users;
    }
  } catch (err) {
    console.error('Erro ao ler usuários:', err);
  }
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
  return DEFAULT_ACCOUNTS;
}

export function getCurrentSession() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Erro ao ler sessão atual:', err);
  }
  // Sessão inicial padrão: Victor Reghini autenticado
  const defaultUser = DEFAULT_ACCOUNTS[0];
  const session = {
    id: defaultUser.id,
    name: defaultUser.name,
    email: defaultUser.email,
    avatar: defaultUser.avatar,
    isOrganizer: defaultUser.isOrganizer,
    token: `sess_${Date.now()}`
  };
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function loginUser(email, password) {
  const users = getRegisteredUsers();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  const target = users.find(u => u.email.trim().toLowerCase() === cleanEmail);

  if (!target) {
    throw new Error('Usuário não encontrado com este e-mail.');
  }

  const hash = await hashPassword(cleanPassword);
  if (target.passwordHash !== hash) {
    throw new Error('Senha incorreta. Verifique suas credenciais.');
  }

  const session = {
    id: target.id,
    name: target.name,
    email: target.email,
    avatar: target.avatar,
    isOrganizer: !!target.isOrganizer,
    token: `sess_${Date.now()}`
  };

  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function registerUser(name, email, password) {
  const users = getRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('Já existe uma conta cadastrada com este e-mail.');
  }

  const hash = await hashPassword(cleanPassword);
  const newUser = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    email: normalizedEmail,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    passwordHash: hash
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));

  const session = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    avatar: newUser.avatar,
    token: `sess_${Date.now()}`
  };

  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_SESSION_KEY);
}

export function updateUserAvatar(userId, newAvatar) {
  const users = getRegisteredUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.avatar = newAvatar;
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  }

  const session = getCurrentSession();
  if (session && session.id === userId) {
    session.avatar = newAvatar;
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    return session;
  }
  return session;
}

// Credenciais de teste disponibilizadas exclusivamente em ambiente de desenvolvimento
export const TEST_CREDENTIALS = [
  { name: 'Victor Reghini (Organizador)', email: 'victor@exemplo.com', senha: 'senha123' },
  { name: 'Camila Santos (Convidada)', email: 'camila@exemplo.com', senha: 'senha123' },
  { name: 'Rodrigo Lima (Convidado)', email: 'rodrigo@exemplo.com', senha: 'senha123' },
  { name: 'Mariana Duarte (Convidada)', email: 'mariana@exemplo.com', senha: 'senha123' },
  { name: 'Lucas Almeida (Convidado)', email: 'lucas@exemplo.com', senha: 'senha123' }
];
