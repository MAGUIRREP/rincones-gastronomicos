-- =============================================================
-- Migración 0010: función de ping para el keep-alive
--
-- SE EJECUTA EN EL PROYECTO comunidad-vecinos, donde el endpoint solo
-- dispone de la clave pública (anon). En rincones-gastronomicos no hace
-- falta, porque allí se escribe con la clave de servicio; ejecutarla
-- igualmente no molesta.
--
-- En lugar de dar permiso de escritura sobre la tabla a cualquiera con
-- esa clave, se expone una única función controlada: actualiza la fila
-- del keep-alive y nada más. Así la escritura (que es lo que Supabase
-- cuenta como actividad real) no abre la tabla a modificaciones
-- arbitrarias.
-- =============================================================

create or replace function public.ping_keep_alive(p_source text default 'desconocido')
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
begin
  update public.keep_alive
  set last_ping = now(),
      ping_count = ping_count + 1,
      -- Se limita la longitud: el origen lo manda quien llama.
      source = left(coalesce(p_source, 'desconocido'), 60)
  where id = 1
  returning last_ping into v_last;

  return v_last;
end;
$$;

grant execute on function public.ping_keep_alive(text) to anon, authenticated;
