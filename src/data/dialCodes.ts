/**
 * dialCodes — directorio de códigos telefónicos internacionales (lada) por país.
 * Usado por el selector de teléfono en el registro. `iso` es ISO-3166 alpha-2,
 * `dial` el prefijo con '+', `name` el nombre en español.
 */
export interface DialCode {
  iso: string;
  dial: string;
  name: string;
}

export const DIAL_CODES: DialCode[] = [
  { iso: 'MX', dial: '+52', name: 'México' },
  { iso: 'AR', dial: '+54', name: 'Argentina' },
  { iso: 'BO', dial: '+591', name: 'Bolivia' },
  { iso: 'BR', dial: '+55', name: 'Brasil' },
  { iso: 'CL', dial: '+56', name: 'Chile' },
  { iso: 'CO', dial: '+57', name: 'Colombia' },
  { iso: 'CR', dial: '+506', name: 'Costa Rica' },
  { iso: 'CU', dial: '+53', name: 'Cuba' },
  { iso: 'EC', dial: '+593', name: 'Ecuador' },
  { iso: 'SV', dial: '+503', name: 'El Salvador' },
  { iso: 'ES', dial: '+34', name: 'España' },
  { iso: 'US', dial: '+1', name: 'Estados Unidos' },
  { iso: 'GT', dial: '+502', name: 'Guatemala' },
  { iso: 'HN', dial: '+504', name: 'Honduras' },
  { iso: 'NI', dial: '+505', name: 'Nicaragua' },
  { iso: 'PA', dial: '+507', name: 'Panamá' },
  { iso: 'PY', dial: '+595', name: 'Paraguay' },
  { iso: 'PE', dial: '+51', name: 'Perú' },
  { iso: 'PR', dial: '+1', name: 'Puerto Rico' },
  { iso: 'DO', dial: '+1', name: 'República Dominicana' },
  { iso: 'UY', dial: '+598', name: 'Uruguay' },
  { iso: 'VE', dial: '+58', name: 'Venezuela' },
  { iso: 'CA', dial: '+1', name: 'Canadá' },
  { iso: 'DE', dial: '+49', name: 'Alemania' },
  { iso: 'FR', dial: '+33', name: 'Francia' },
  { iso: 'IT', dial: '+39', name: 'Italia' },
  { iso: 'PT', dial: '+351', name: 'Portugal' },
  { iso: 'GB', dial: '+44', name: 'Reino Unido' },
  { iso: 'IE', dial: '+353', name: 'Irlanda' },
  { iso: 'NL', dial: '+31', name: 'Países Bajos' },
  { iso: 'BE', dial: '+32', name: 'Bélgica' },
  { iso: 'CH', dial: '+41', name: 'Suiza' },
  { iso: 'AT', dial: '+43', name: 'Austria' },
  { iso: 'SE', dial: '+46', name: 'Suecia' },
  { iso: 'NO', dial: '+47', name: 'Noruega' },
  { iso: 'DK', dial: '+45', name: 'Dinamarca' },
  { iso: 'FI', dial: '+358', name: 'Finlandia' },
  { iso: 'PL', dial: '+48', name: 'Polonia' },
  { iso: 'CZ', dial: '+420', name: 'Chequia' },
  { iso: 'GR', dial: '+30', name: 'Grecia' },
  { iso: 'RO', dial: '+40', name: 'Rumanía' },
  { iso: 'RU', dial: '+7', name: 'Rusia' },
  { iso: 'TR', dial: '+90', name: 'Turquía' },
  { iso: 'UA', dial: '+380', name: 'Ucrania' },
  { iso: 'CN', dial: '+86', name: 'China' },
  { iso: 'JP', dial: '+81', name: 'Japón' },
  { iso: 'KR', dial: '+82', name: 'Corea del Sur' },
  { iso: 'IN', dial: '+91', name: 'India' },
  { iso: 'ID', dial: '+62', name: 'Indonesia' },
  { iso: 'PH', dial: '+63', name: 'Filipinas' },
  { iso: 'TH', dial: '+66', name: 'Tailandia' },
  { iso: 'VN', dial: '+84', name: 'Vietnam' },
  { iso: 'MY', dial: '+60', name: 'Malasia' },
  { iso: 'SG', dial: '+65', name: 'Singapur' },
  { iso: 'AU', dial: '+61', name: 'Australia' },
  { iso: 'NZ', dial: '+64', name: 'Nueva Zelanda' },
  { iso: 'ZA', dial: '+27', name: 'Sudáfrica' },
  { iso: 'NG', dial: '+234', name: 'Nigeria' },
  { iso: 'EG', dial: '+20', name: 'Egipto' },
  { iso: 'MA', dial: '+212', name: 'Marruecos' },
  { iso: 'IL', dial: '+972', name: 'Israel' },
  { iso: 'SA', dial: '+966', name: 'Arabia Saudita' },
  { iso: 'AE', dial: '+971', name: 'Emiratos Árabes Unidos' },
];

/** Código por defecto según la UI (México). */
export const DEFAULT_DIAL = '+52';
