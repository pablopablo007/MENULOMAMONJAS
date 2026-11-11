-- Tablas de la nube para la app "Loma de Monjas".
-- Pegar y ejecutar UNA vez en Supabase: SQL Editor -> New query -> Run.
--
-- Son una copia de las tablas del celular (SQLite) con una columna extra, user_id:
-- cada cuenta solo puede leer y escribir sus propias filas (Row Level Security).
-- Los ids los pone el celular, por eso la clave primaria es (user_id, id).
-- No hay claves foráneas entre tablas: la nube es una copia y el celular ya valida los datos.

create table if not exists public.categorias (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id bigint not null,
  nombre text not null,
  orden integer not null default 0,
  ejemplo smallint not null default 0,
  primary key (user_id, id)
);

create table if not exists public.productos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id bigint not null,
  categoria_id bigint not null,
  nombre text not null,
  descripcion text,
  precio double precision not null check (precio > 0),
  activo smallint not null default 1,
  created_at text not null,
  ejemplo smallint not null default 0,
  primary key (user_id, id)
);

create table if not exists public.pedidos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id bigint not null,
  numero integer not null,
  fecha text not null,          -- 'yyyy-MM-dd' en hora local del celular
  created_at text not null,     -- fecha-hora ISO (UTC)
  mesa text,
  nota text,
  total double precision not null,
  estado text not null default 'activo' check (estado in ('activo', 'anulado')),
  primary key (user_id, id)
);

create table if not exists public.pedido_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id bigint not null,
  pedido_id bigint not null,
  producto_id bigint not null,
  nombre_producto text not null,
  precio_unitario double precision not null,
  cantidad integer not null check (cantidad > 0),
  nota text,
  subtotal double precision not null,
  primary key (user_id, id)
);

create index if not exists pedidos_fecha_idx on public.pedidos (user_id, fecha);
create index if not exists pedido_items_pedido_idx on public.pedido_items (user_id, pedido_id);

-- Seguridad: solo usuarios con sesión iniciada y solo sus propias filas.
do $$
declare
  t text;
begin
  foreach t in array array['categorias', 'productos', 'pedidos', 'pedido_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "solo_mis_filas" on public.%I', t);
    execute format(
      'create policy "solo_mis_filas" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t
    );
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end
$$;
