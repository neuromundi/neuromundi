-- 0266: quitar permisos que no sirven a nadie y solo son superficie.
--
-- founder_eligible: comprobado que el frontend NO la llama (solo aparece en
-- comentarios). Dentro de la base la usan cuatro funciones, y las cuatro son
-- SECURITY DEFINER, asi que corren como dueño y no necesitan que quien llama
-- tenga el permiso. Se cierra del todo.
--
-- Las otras cuatro son tramites personales que no tienen ningun sentido sin
-- sesion: canjear un codigo, pedir exencion, pedir cuota de fundador, tomar un
-- asiento gratuito. Dos de ellas rechazan explicitamente al que no trae sesion;
-- las otras dos simplemente no encontrarian a nadie. Dejarlas abiertas a
-- anonimos no habilitaba nada, pero las ponia en la lista de lo invocable desde
-- internet sin identificarse. Se quedan solo para quien tiene sesion.

revoke all on function public.founder_eligible(uuid) from public, anon, authenticated;

revoke execute on function public.claim_free_founder_seat()            from public, anon;
revoke execute on function public.solicitar_cuota_fundador(text)       from public, anon;
revoke execute on function public.solicitar_exencion(text, text, text) from public, anon;
revoke execute on function public.redeem_promo_code(text)              from public, anon;

grant execute on function public.claim_free_founder_seat()            to authenticated;
grant execute on function public.solicitar_cuota_fundador(text)       to authenticated;
grant execute on function public.solicitar_exencion(text, text, text) to authenticated;
grant execute on function public.redeem_promo_code(text)              to authenticated;
