/**
 * countryStore — país seleccionado por la persona para segmentar la plataforma.
 *
 * Se guarda el NOMBRE del país (igual que `profiles.country`), para que el
 * directorio y demás secciones filtren por coincidencia directa. Persistido en
 * el dispositivo; cualquier componente puede leerlo con `useCountry()`.
 */
import { create } from 'zustand';

const LS_COUNTRY = 'neuromundi.country';

function read(): string | null {
  try {
    return localStorage.getItem(LS_COUNTRY) || null;
  } catch {
    return null;
  }
}

interface CountryState {
  /** Nombre del país seleccionado, o null = todos los países. */
  country: string | null;
  setCountry: (country: string | null) => void;
}

export const useCountry = create<CountryState>((set) => ({
  country: read(),
  setCountry: (country) => {
    try {
      if (country) localStorage.setItem(LS_COUNTRY, country);
      else localStorage.removeItem(LS_COUNTRY);
    } catch {
      /* almacenamiento no disponible */
    }
    set({ country });
  },
}));
