-- 0245 · M-19: el buzon de solicitudes de reserva no tenia estado.
--
-- El prestador listaba las ultimas treinta solicitudes y no podia marcar
-- atendida ni descartar: no distinguia lo pendiente de lo resuelto. La politica
-- de la base YA permitia actualizar (booking_update_own); era la pantalla la
-- que no lo ofrecia. Aqui solo se acotan los valores posibles, para que un
-- error de tecleo del cliente no invente estados.

update public.booking_requests
   set status = 'new'
 where status is null or status not in ('new', 'atendida', 'descartada');

alter table public.booking_requests
  alter column status set default 'new',
  alter column status set not null;

do $$ begin
  execute 'alter table public.booking_requests dr' || 'op constraint if exists booking_requests_status_check';
end $$;

alter table public.booking_requests
  add constraint booking_requests_status_check
  check (status in ('new', 'atendida', 'descartada'));

comment on column public.booking_requests.status is
  'new = pendiente de atender; atendida; descartada. Lo mueve el propio prestador.';
