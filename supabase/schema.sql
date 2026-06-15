-- Profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  stripe_customer_id text unique,
  anthropic_api_key text,
  updated_at timestamptz default now()
);

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique,
  plan text not null default 'free', -- free | pro | agency
  status text not null default 'active', -- active | canceled | past_due
  stripe_subscription_id text unique,
  stripe_customer_id text,
  updated_at timestamptz default now()
);

-- Connected platforms
create table if not exists public.connected_platforms (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  platform text not null, -- tiktok | instagram | youtube | twitch | kick
  username text,
  platform_user_id text,
  access_token text,
  refresh_token text,
  connected_at timestamptz default now(),
  unique(user_id, platform)
);

-- Platform stats snapshots (daily)
create table if not exists public.platform_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  platform text not null,
  followers bigint default 0,
  views bigint default 0,
  likes bigint default 0,
  comments bigint default 0,
  shares bigint default 0,
  engagement_rate numeric(5,2),
  recorded_at timestamptz default now()
);
create index if not exists platform_stats_user_platform_idx on public.platform_stats(user_id, platform, recorded_at desc);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.connected_platforms enable row level security;
alter table public.platform_stats enable row level security;

-- Policies: users can only read/write their own data
create policy "profiles_self" on public.profiles for all using (auth.uid() = id);
create policy "subscriptions_self" on public.subscriptions for all using (auth.uid() = user_id);
create policy "connected_platforms_self" on public.connected_platforms for all using (auth.uid() = user_id);
create policy "platform_stats_self" on public.platform_stats for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
