-- ============================================================================
-- SINCRONIZA • Schema Completo Supabase (Auth + PostgreSQL + RLS + Storage + Realtime)
-- Execute este script inteiro no menu "SQL Editor" -> "New query" do Supabase.
-- ============================================================================

-- 1. PERFIS DE USUÁRIO (Sincronizado com auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger automática ao cadastrar usuário no Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(nullif(excluded.name, ''), public.profiles.name),
        avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. EVENTOS
create table if not exists public.events (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  type text not null default 'encontro',
  emoji text not null default '📅',
  description text default '',
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  location_type text not null default 'presencial',
  location_details text default '',
  duration integer not null default 60,
  dates jsonb not null default '[]'::jsonb,
  time_range jsonb not null default '{"start":"09:00","end":"18:00","step":60}'::jsonb,
  privacy text not null default 'public' check (privacy in ('public', 'private')),
  status text not null default 'voting' check (status in ('voting', 'confirmed', 'completed', 'canceled')),
  confirmed_slot jsonb default null,
  allow_location_suggestions boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_organizer_id on public.events(organizer_id);

-- 3. PARTICIPANTES E DISPONIBILIDADES DO EVENTO
create table if not exists public.event_participants (
  event_id text not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  availabilities jsonb not null default '{}'::jsonb,
  custom_intervals jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists idx_event_participants_user_id on public.event_participants(user_id);

-- 4. SUGESTÕES DE LOCAIS E VOTOS (👍 / 👎)
create table if not exists public.location_suggestions (
  id text primary key default gen_random_uuid()::text,
  event_id text not null references public.events(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  address text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_location_suggestions_event_id on public.location_suggestions(event_id);

create table if not exists public.location_votes (
  location_id text not null references public.location_suggestions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote text not null check (vote in ('approve', 'reject')),
  created_at timestamptz not null default now(),
  primary key (location_id, user_id)
);

-- 5. SUGESTÕES DE HORÁRIOS E VOTOS
create table if not exists public.time_suggestions (
  id text primary key default gen_random_uuid()::text,
  event_id text not null references public.events(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  date text not null,
  start_time text not null,
  end_time text not null,
  title text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_time_suggestions_event_id on public.time_suggestions(event_id);

create table if not exists public.time_suggestion_votes (
  suggestion_id text not null references public.time_suggestions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote text not null check (vote in ('available', 'unavailable')),
  created_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.location_suggestions enable row level security;
alter table public.location_votes enable row level security;
alter table public.time_suggestions enable row level security;
alter table public.time_suggestion_votes enable row level security;

-- Policies: profiles
drop policy if exists "Profiles visiveis para todos" on public.profiles;
create policy "Profiles visiveis para todos"
  on public.profiles for select using (true);

drop policy if exists "Usuario insere proprio perfil" on public.profiles;
create policy "Usuario insere proprio perfil"
  on public.profiles for insert with check ((select auth.uid()) = id);

drop policy if exists "Usuario edita proprio perfil" on public.profiles;
create policy "Usuario edita proprio perfil"
  on public.profiles for update using ((select auth.uid()) = id);

-- Policies: events
drop policy if exists "Eventos visiveis para consulta" on public.events;
create policy "Eventos visiveis para consulta"
  on public.events for select using (true);

drop policy if exists "Usuarios autenticados criam eventos" on public.events;
create policy "Usuarios autenticados criam eventos"
  on public.events for insert with check ((select auth.uid()) = organizer_id);

drop policy if exists "Organizador atualiza evento" on public.events;
create policy "Organizador atualiza evento"
  on public.events for update using ((select auth.uid()) = organizer_id);

drop policy if exists "Organizador remove evento" on public.events;
create policy "Organizador remove evento"
  on public.events for delete using ((select auth.uid()) = organizer_id);

-- Policies: event_participants
drop policy if exists "Participantes visiveis para todos" on public.event_participants;
create policy "Participantes visiveis para todos"
  on public.event_participants for select using (true);

drop policy if exists "Usuario entra no evento" on public.event_participants;
create policy "Usuario entra no evento"
  on public.event_participants for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Usuario edita propria disponibilidade" on public.event_participants;
create policy "Usuario edita propria disponibilidade"
  on public.event_participants for update using ((select auth.uid()) = user_id);

drop policy if exists "Participante sai ou organizador remove" on public.event_participants;
create policy "Participante sai ou organizador remove"
  on public.event_participants for delete using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
  );

-- Policies: location_suggestions
drop policy if exists "Locais sugeridos visiveis para todos" on public.location_suggestions;
create policy "Locais sugeridos visiveis para todos"
  on public.location_suggestions for select using (true);

drop policy if exists "Participantes sugerem locais quando aberto" on public.location_suggestions;
create policy "Participantes sugerem locais quando aberto"
  on public.location_suggestions for insert with check (
    (select auth.uid()) = creator_id
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and (e.allow_location_suggestions = true or e.organizer_id = (select auth.uid()))
    )
  );

drop policy if exists "Criador ou organizador remove local sugerido" on public.location_suggestions;
create policy "Criador ou organizador remove local sugerido"
  on public.location_suggestions for delete using (
    (select auth.uid()) = creator_id
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
  );

-- Policies: location_votes
drop policy if exists "Votos de locais visiveis para todos" on public.location_votes;
create policy "Votos de locais visiveis para todos"
  on public.location_votes for select using (true);

drop policy if exists "Usuario vota em local" on public.location_votes;
create policy "Usuario vota em local"
  on public.location_votes for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Usuario altera proprio voto em local" on public.location_votes;
create policy "Usuario altera proprio voto em local"
  on public.location_votes for update using ((select auth.uid()) = user_id);

drop policy if exists "Usuario remove proprio voto em local" on public.location_votes;
create policy "Usuario remove proprio voto em local"
  on public.location_votes for delete using ((select auth.uid()) = user_id);

-- Policies: time_suggestions
drop policy if exists "Sugestoes de horario visiveis para todos" on public.time_suggestions;
create policy "Sugestoes de horario visiveis para todos"
  on public.time_suggestions for select using (true);

drop policy if exists "Usuario sugere horario" on public.time_suggestions;
create policy "Usuario sugere horario"
  on public.time_suggestions for insert with check ((select auth.uid()) = creator_id);

drop policy if exists "Criador ou organizador remove sugestao de horario" on public.time_suggestions;
create policy "Criador ou organizador remove sugestao de horario"
  on public.time_suggestions for delete using (
    (select auth.uid()) = creator_id
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
  );

-- Policies: time_suggestion_votes
drop policy if exists "Votos de horario visiveis para todos" on public.time_suggestion_votes;
create policy "Votos de horario visiveis para todos"
  on public.time_suggestion_votes for select using (true);

drop policy if exists "Usuario vota em horario" on public.time_suggestion_votes;
create policy "Usuario vota em horario"
  on public.time_suggestion_votes for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Usuario altera voto em horario" on public.time_suggestion_votes;
create policy "Usuario altera voto em horario"
  on public.time_suggestion_votes for update using ((select auth.uid()) = user_id);

drop policy if exists "Usuario remove voto em horario" on public.time_suggestion_votes;
create policy "Usuario remove voto em horario"
  on public.time_suggestion_votes for delete using ((select auth.uid()) = user_id);

-- ============================================================================
-- 7. STORAGE BUCKET PARA AVATARES
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "Avatares publicos para leitura" on storage.objects;
create policy "Avatares publicos para leitura"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Usuario faz upload na propria pasta de avatar" on storage.objects;
create policy "Usuario faz upload na propria pasta de avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Usuario atualiza proprio avatar" on storage.objects;
create policy "Usuario atualiza proprio avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Usuario remove proprio avatar" on storage.objects;
create policy "Usuario remove proprio avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ============================================================================
-- 8. REALTIME (Atualização instantânea de votos e disponibilidades)
-- ============================================================================
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles',
    'events',
    'event_participants',
    'location_suggestions',
    'location_votes',
    'time_suggestions',
    'time_suggestion_votes'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end;
$$;

