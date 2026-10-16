-- users.role becomes an enum instead of text with a check constraint.
-- Same values, same default; the database now rejects any other value by type.
create type public.user_role as enum ('fellow', 'admin');

alter table public.users drop constraint users_role_check;
alter table public.users alter column role drop default;
alter table public.users
  alter column role type public.user_role using role::public.user_role;
alter table public.users alter column role set default 'fellow';
