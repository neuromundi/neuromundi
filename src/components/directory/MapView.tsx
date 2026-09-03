/**
 * MapView — mapa interactivo del directorio (React-Leaflet).
 *
 * Tiles de Carto Light, clustering para densidades altas, markers SVG cuyo color
 * refleja el EVS, popup con mini-ficha, botón "centrar en mi ubicación" (con
 * fallback a CDMX) y círculo de radio. Se sincroniza con la lista: al cambiar
 * `selectedId` vuela al proveedor y abre su popup.
 *
 * Accesibilidad: el mapa es complementario; la lista de proveedores es la
 * alternativa textual y siempre está disponible en el directorio.
 */
import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { LocateFixed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { evsColor, DEFAULT_CENTER } from '@/lib/utils';
import type { ProviderWithRating, ProviderLocation } from '@/types/app';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

/**
 * Tiles de CARTO. Desde agosto de 2026 CARTO exige API key: sin ella, los
 * tiles se sirven con una marca de agua "API KEY REQUIRED" encima del mapa.
 *
 * La clave va en la URL, así que es pública por naturaleza (cualquiera puede
 * verla en las peticiones del navegador) — CARTO la protege atándola al
 * dominio, no ocultándola. Aun así se lee de una variable de entorno para no
 * dejarla escrita en el repositorio. Si la variable no está definida, la URL
 * queda sin `?key=` y el mapa sigue funcionando (con marca de agua).
 */
const CARTO_KEY = import.meta.env.VITE_CARTO_KEY as string | undefined;
const TILE_URL = `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${
  CARTO_KEY ? `?key=${CARTO_KEY}` : ''
}`;

export interface MapViewProps {
  providers: ProviderWithRating[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onViewProfile?: (id: string) => void;
  center?: { lat: number; lng: number } | null;
  radiusKm?: number;
  onLocate?: (coords: { lat: number; lng: number }) => void;
  /** Sucursales de los proveedores; si las hay, se pinta un pin por sucursal. */
  locations?: ProviderLocation[];
}

/** Marker en forma de pin con color según el EVS. */
function buildIcon(score: number | null | undefined): L.DivIcon {
  const color = evsColor(score);
  return L.divIcon({
    className: 'neuro-marker',
    html: `<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10 15 23 15 23s15-13 15-23C30 6.7 23.3 0 15 0z" fill="${color}"/>
      <circle cx="15" cy="15" r="6" fill="#fff"/>
    </svg>`,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });
}

/** Vuela al proveedor seleccionado y abre su popup. */
function FlyToSelected({
  providers,
  selectedId,
  markerRefs,
}: {
  providers: ProviderWithRating[];
  selectedId?: string | null;
  markerRefs: React.MutableRefObject<Map<string, L.Marker>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const p = providers.find((x) => x.id === selectedId);
    if (p?.latitude != null && p?.longitude != null) {
      map.flyTo([p.latitude, p.longitude], 15, { duration: 0.8 });
      markerRefs.current.get(selectedId)?.openPopup();
    }
  }, [selectedId, providers, map, markerRefs]);
  return null;
}

/** Botón flotante para centrar en la ubicación del usuario. */
function LocateButton({ onLocate }: { onLocate?: (c: { lat: number; lng: number }) => void }) {
  const map = useMap();
  const { t } = useTranslation();
  const handle = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.flyTo([coords.lat, coords.lng], 14, { duration: 0.8 });
        onLocate?.(coords);
      },
      () => {
        /* permiso denegado: mantener vista actual, sin forzar */
      },
    );
  };
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={t('map.locate')}
      className="absolute right-3 top-3 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <LocateFixed className="h-5 w-5 text-brand-700" aria-hidden="true" />
    </button>
  );
}

export function MapView({
  providers,
  selectedId,
  onSelect,
  onViewProfile,
  center,
  radiusKm,
  onLocate,
  locations,
}: MapViewProps) {
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  const { t } = useTranslation();

  // Un pin por sucursal con coordenadas; si un proveedor no tiene sucursales
  // geolocalizadas, se usa la coordenada del perfil como respaldo.
  const pins = useMemo(() => {
    const byProvider = new Map<string, ProviderLocation[]>();
    for (const l of locations ?? []) {
      if (l.latitude != null && l.longitude != null) {
        const arr = byProvider.get(l.provider_id) ?? [];
        arr.push(l);
        byProvider.set(l.provider_id, arr);
      }
    }
    const out: {
      key: string;
      providerId: string;
      lat: number;
      lng: number;
      provider: ProviderWithRating;
      label: string | null;
    }[] = [];
    for (const p of providers) {
      const branches = byProvider.get(p.id);
      if (branches && branches.length > 0) {
        for (const b of branches) {
          out.push({ key: b.id, providerId: p.id, lat: b.latitude as number, lng: b.longitude as number, provider: p, label: b.label });
        }
      } else if (p.latitude != null && p.longitude != null) {
        out.push({ key: p.id, providerId: p.id, lat: p.latitude, lng: p.longitude, provider: p, label: null });
      }
    }
    return out;
  }, [providers, locations]);

  // Para FlyToSelected: proveedores con alguna coordenada (perfil o sucursal).
  const withCoords = useMemo(() => {
    const firstByProvider = new Map<string, ProviderWithRating>();
    for (const pin of pins) {
      if (!firstByProvider.has(pin.providerId)) {
        firstByProvider.set(pin.providerId, { ...pin.provider, latitude: pin.lat, longitude: pin.lng });
      }
    }
    return Array.from(firstByProvider.values());
  }, [pins]);

  const initialCenter = center ?? DEFAULT_CENTER;

  return (
    <div
      role="application"
      aria-label={t('map.aria')}
      className="relative h-full w-full overflow-hidden rounded-2xl"
    >
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={12}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={TILE_URL}
        />

        {center && radiusKm && (
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#0ea5e9', fillOpacity: 0.05 }}
          />
        )}

        <MarkerClusterGroup chunkedLoading>
          {pins.map((pin) => (
            <Marker
              key={pin.key}
              position={[pin.lat, pin.lng]}
              icon={buildIcon(pin.provider.rating?.evs_score)}
              ref={(ref) => {
                // El primer pin de cada proveedor sirve para "volar" a él.
                if (ref && !markerRefs.current.has(pin.providerId)) {
                  markerRefs.current.set(pin.providerId, ref);
                }
              }}
              eventHandlers={{ click: () => onSelect?.(pin.providerId) }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-bold text-slate-900">
                    {pin.provider.business_name ?? pin.provider.full_name}
                  </p>
                  {pin.label && <p className="text-sm font-medium text-slate-700">{pin.label}</p>}
                  {pin.provider.city && <p className="text-sm text-slate-500">{pin.provider.city}</p>}
                  <p className="mt-1 text-sm">
                    {t('card.evs')}:{' '}
                    <span className="font-semibold" style={{ color: evsColor(pin.provider.rating?.evs_score) }}>
                      {pin.provider.rating?.evs_score != null ? pin.provider.rating.evs_score.toFixed(1) : t('map.new')}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => onViewProfile?.(pin.providerId)}
                    className="mt-2 font-semibold text-brand-700 underline"
                  >
                    {t('map.viewProfile')}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        <FlyToSelected providers={withCoords} selectedId={selectedId} markerRefs={markerRefs} />
        <LocateButton onLocate={onLocate} />
      </MapContainer>
    </div>
  );
}
