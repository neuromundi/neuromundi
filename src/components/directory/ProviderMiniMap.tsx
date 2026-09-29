/**
 * ProviderMiniMap — mini-mapa de UN solo pin para el perfil público del
 * prestador (React-Leaflet). Es deliberadamente ligero: sin clustering, sin
 * geolocalización ni "volar a", solo la ubicación fija del prestador. Se carga
 * con `lazy` desde ProviderProfile para no meter Leaflet en el bundle inicial.
 *
 * Accesibilidad: el mapa es complementario; la dirección en texto y los botones
 * "Cómo llegar" (Google Maps / Waze) son la alternativa siempre disponible.
 */
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';

// Misma fuente de tiles y clave que el mapa del directorio (ver MapView.tsx).
const CARTO_KEY = import.meta.env.VITE_CARTO_KEY as string | undefined;
const TILE_URL = `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${
  CARTO_KEY ? `?key=${CARTO_KEY}` : ''
}`;

// Pin SVG (color de marca) como divIcon: evita el problema de las imágenes por
// defecto de Leaflet con los empaquetadores.
const PIN = L.divIcon({
  className: 'neuro-marker',
  html: `<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 10 15 23 15 23s15-13 15-23C30 6.7 23.3 0 15 0z" fill="#0ea5e9"/>
    <circle cx="15" cy="15" r="6" fill="#fff"/>
  </svg>`,
  iconSize: [30, 38],
  iconAnchor: [15, 38],
});

export function ProviderMiniMap({ lat, lng }: { lat: number; lng: number }) {
  const { t } = useTranslation();
  return (
    <div
      role="application"
      aria-label={t('map.aria')}
      className="h-56 w-full overflow-hidden rounded-2xl border border-slate-100"
    >
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={TILE_URL}
        />
        <Marker position={[lat, lng]} icon={PIN} />
      </MapContainer>
    </div>
  );
}

export default ProviderMiniMap;
