-- 0260: subir los cupos de fundador donde la invitacion ya rebasa el cupo.
-- Medido contra el plan: todas las fichas de paga del directorio caen en el cupo
-- 'professionals', porque founder_kind_for() manda ahi a service_provider y clinic;
-- solo 'company', 'merchant' y 'ngo' van a otros cupos.
--   España:  202 invitadas contra 50 de cupo  -> 250 (cifra pedida por Enyoria)
--   Portugal: 49 invitadas contra 25 de cupo  ->  59 (lo necesario mas 20%)
--   Brasil:   77 invitadas contra 80 de cupo  ->  93 (no estaba corto, pero 3 de
--             holgura se agotan con la proxima alta; mismo criterio del 20%)

update public.campaign_config
   set founder_caps_by_country = jsonb_set(
         jsonb_set(
           jsonb_set(founder_caps_by_country, array['España','professionals'],  to_jsonb(250)),
                                              array['Portugal','professionals'], to_jsonb(59)),
                                              array['Brasil','professionals'],   to_jsonb(93)),
       updated_at = now()
 where id = 1;
