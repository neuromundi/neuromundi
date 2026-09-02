/**
 * sectionStore — sección de la plataforma seleccionada por la persona
 * (Neurodesarrollo / Neurodivergencias / Afecciones neurológicas) para abrir un
 * directorio y un Neurocamp especializados en esa opción.
 *
 * Igual que `countryStore`: se guarda la CLAVE canónica (`profiles.sections`) y
 * se persiste en el dispositivo. `null` = todas las secciones.
 */
import { create } from 'zustand';
import type { SectionValue } from '@/data/sections';

const LS_SECTION = 'neuromundi.section';

function read(): SectionValue | null {
  try {
    const v = localStorage.getItem(LS_SECTION);
    return v === 'neurodesarrollo' || v === 'neurodivergencias' || v === 'afecciones' ? v : null;
  } catch {
    return null;
  }
}

interface SectionState {
  section: SectionValue | null;
  setSection: (section: SectionValue | null) => void;
}

export const useSection = create<SectionState>((set) => ({
  section: read(),
  setSection: (section) => {
    try {
      if (section) localStorage.setItem(LS_SECTION, section);
      else localStorage.removeItem(LS_SECTION);
    } catch {
      /* almacenamiento no disponible */
    }
    set({ section });
  },
}));
