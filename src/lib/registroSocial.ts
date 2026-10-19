/**
 * registroSocial — valores de relleno para completar el perfil de quien entra
 * por Google, LinkedIn o Microsoft.
 *
 * Viven aqui, y no dentro del formulario, por una razon concreta: el 19 de
 * octubre de 2026 el relleno de contrasena ('SocialLogin1') no pasaba la propia
 * exigencia de fortaleza del esquema, y como en ese modo el campo NO se dibuja,
 * el registro se bloqueaba sin mostrar ningun error. Estando aqui, una prueba
 * automatica los valida contra el esquema en cada cambio (src/lib/registroSocial.test.ts).
 */
export const RELLENO_LOGIN_SOCIAL = {
  email: 'social-login@neuromundi.app',
  confirm_email: 'social-login@neuromundi.app',
  password: 'SocialLogin1!',
  confirm_password: 'SocialLogin1!',
} as const;
