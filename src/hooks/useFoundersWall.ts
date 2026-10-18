/**
 * useFoundersWall — muro público de Miembros Fundadores CURADO por el admin.
 * useFoundersWallCountries — países que ya tienen fundadores publicados (selector).
 *
 * Ambos son lectura pública (funcionan con o sin sesión): la RPC founders_wall
 * es SECURITY DEFINER y solo devuelve a quien el admin publicó, uniendo a
 * profiles para el nombre visible y el folio.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Los cinco tipos que admite la restriccion de `founder_members` en la base.
// Estaban tres: una empresa o una organizacion fundadora se habria quedado
// sin etiqueta de tipo en el muro.
export type FounderKindWall =
  | 'families'
  | 'professionals'
  | 'providers'
  | 'companies'
  | 'ngos';

export interface FounderEntry {
  display_name: string;
  member_no: number | null;
  kind: FounderKindWall;
  country: string | null;
  featured: boolean;
  is_company: boolean;
  /**
   * Identificador de la ficha a la que lleva la tarjeta. Viene SOLO cuando esa
   * ficha se puede visitar de verdad en el directorio; para las familias es
   * siempre nulo, porque su perfil es el de una persona particular y el muro no
   * es una puerta a él. La decisión la toma la base (ver migración 0276), no
   * esta pantalla.
   */
  provider_id: string | null;
}

export interface FounderCountry {
  country: string;
  n: number;
}

/** Fundadores publicados. `country` (nombre canónico ES) filtra por país; null = todos. */
export function useFoundersWall(country?: string | null) {
  const [entries, setEntries] = useState<FounderEntry[]>([]);
  // TRES ESTADOS, NO DOS: cargando, vacio y FALLO. Antes el error se miraba y
  // se descartaba en la misma expresion, asi que un fallo de la consulta se
  // pintaba como «no hay nada». (Auditoria 15 oct 2026, hallazgo A-12.)
  const [fallo, setFallo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc('founders_wall_v2', { p_country: country ?? null });
      if (alive) {
        setEntries(error ? [] : ((data as FounderEntry[] | null) ?? []));
        setFallo(!!error);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [country]);

  return { entries, loading, fallo };
}

/** Países con al menos un fundador publicado, para alimentar el selector. */
export function useFoundersWallCountries() {
  const [countries, setCountries] = useState<FounderCountry[]>([]);
  // TRES ESTADOS, NO DOS: cargando, vacio y FALLO. Antes el error se miraba y
  // se descartaba en la misma expresion, asi que un fallo de la consulta se
  // pintaba como «no hay nada». (Auditoria 15 oct 2026, hallazgo A-12.)
  const [fallo, setFallo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc('founders_wall_countries');
      if (alive) {
        setCountries(error ? [] : ((data as FounderCountry[] | null) ?? []));
        setFallo(!!error);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { countries, loading, fallo };
}
