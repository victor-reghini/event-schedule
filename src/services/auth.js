import { supabase } from './supabaseClient';

const DEV_TEST_ACCOUNTS = [
  {
    name: 'Victor Reghini',
    email: 'victor.sincroniza.dev@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    senha: 'senha123'
  },
  {
    name: 'Camila Santos',
    email: 'camila.sincroniza.dev@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    senha: 'senha123'
  },
  {
    name: 'Rodrigo Lima',
    email: 'rodrigo.sincroniza.dev@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    senha: 'senha123'
  }
];

function translateAuthError(message = '') {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (ou desative "Confirm email" em Authentication > Providers > Email no Supabase).';
  }
  if (lower.includes('user already registered')) {
    return 'Este e-mail já está cadastrado. Faça login com sua senha.';
  }
  if (lower.includes('password should be at least')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  if (lower.includes('rate limit')) {
    return 'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.';
  }
  return message || 'Erro ao realizar autenticação.';
}

async function ensureProfileFromAuthUser(authUser) {
  if (!authUser) return null;

  const fallbackName =
    authUser.user_metadata?.name ||
    authUser.user_metadata?.full_name ||
    authUser.email?.split('@')[0] ||
    'Participante';
  const fallbackAvatar = authUser.user_metadata?.avatar_url || '';

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      name: existing.name || fallbackName,
      email: existing.email || authUser.email || '',
      avatar: existing.avatar_url || ''
    };
  }

  const { data: created } = await supabase
    .from('profiles')
    .upsert(
      {
        id: authUser.id,
        name: fallbackName,
        email: authUser.email || '',
        avatar_url: fallbackAvatar
      },
      { onConflict: 'id' }
    )
    .select('id, name, email, avatar_url')
    .single();

  return {
    id: authUser.id,
    name: created?.name || fallbackName,
    email: created?.email || authUser.email || '',
    avatar: created?.avatar_url || fallbackAvatar
  };
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.user) return null;
  return ensureProfileFromAuthUser(data.session.user);
}

export function subscribeToAuth(onSessionChange) {
  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      onSessionChange(null);
      return;
    }
    const profile = await ensureProfileFromAuthUser(session.user);
    onSessionChange(profile);
  });

  return () => {
    data?.subscription?.unsubscribe();
  };
}

export async function loginUser(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPass
  });

  if (error) {
    // Em ambiente DEV, provisiona automaticamente conta de teste no primeiro clique se ainda não existir no banco
    if (import.meta.env.DEV && error.message?.toLowerCase().includes('invalid login credentials')) {
      const devAccount = DEV_TEST_ACCOUNTS.find(
        acc => acc.email === cleanEmail && acc.senha === cleanPass
      );
      if (devAccount) {
        return registerUser(devAccount.name, devAccount.email, devAccount.senha, devAccount.avatar);
      }
    }
    throw new Error(translateAuthError(error.message));
  }

  return ensureProfileFromAuthUser(data.user);
}

export async function registerUser(name, email, password, initialAvatar = '') {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanName || !cleanEmail || !cleanPass) {
    throw new Error('Preencha nome, e-mail e senha para criar a conta.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPass,
    options: {
      data: {
        name: cleanName,
        avatar_url: initialAvatar
      }
    }
  });

  if (error) {
    throw new Error(translateAuthError(error.message));
  }

  if (data?.user && !data?.session) {
    return {
      requiresEmailConfirmation: true,
      email: cleanEmail
    };
  }

  return ensureProfileFromAuthUser(data.user);
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Erro ao encerrar sessão:', error.message);
  }
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { blob: new Blob([bytes], { type: mime }), mime };
}

export async function updateUserAvatar(userId, newAvatar) {
  let finalAvatarUrl = newAvatar || '';

  // Se for imagem recortada localmente (Data URL) ou Blob/File, envia para o Supabase Storage (bucket 'avatars')
  if (typeof newAvatar === 'string' && newAvatar.startsWith('data:image/')) {
    const { blob, mime } = dataUrlToBlob(newAvatar);
    const ext = mime.split('/')[1] || 'jpg';
    const filePath = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        contentType: mime,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Falha ao enviar imagem para o Storage: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    finalAvatarUrl = publicUrlData.publicUrl;
  } else if (newAvatar instanceof Blob) {
    const mime = newAvatar.type || 'image/jpeg';
    const ext = mime.split('/')[1] || 'jpg';
    const filePath = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, newAvatar, {
        contentType: mime,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Falha ao enviar imagem para o Storage: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    finalAvatarUrl = publicUrlData.publicUrl;
  }

  const { data: updatedProfile, error: profileError } = await supabase
    .from('profiles')
    .update({
      avatar_url: finalAvatarUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select('id, name, email, avatar_url')
    .single();

  if (profileError) {
    throw new Error(`Erro ao atualizar perfil: ${profileError.message}`);
  }

  await supabase.auth.updateUser({
    data: { avatar_url: finalAvatarUrl }
  });

  return {
    id: updatedProfile.id,
    name: updatedProfile.name,
    email: updatedProfile.email,
    avatar: updatedProfile.avatar_url || ''
  };
}

export const TEST_CREDENTIALS = DEV_TEST_ACCOUNTS;
