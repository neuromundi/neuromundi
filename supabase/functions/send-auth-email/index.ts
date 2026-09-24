/**
 * send-auth-email — Auth "Send Email" Hook de Supabase.
 *
 * Supabase Auth (GoTrue) normalmente manda los correos de confirmación /
 * restablecimiento con una plantilla ÚNICA del panel (un solo idioma, inglés
 * por defecto). Este hook intercepta ese envío y manda el correo en el IDIOMA
 * del usuario (11 idiomas), leyendo `lang` de raw_user_meta_data (lo escribe
 * authStore.signUp). Para prestadores (perfiles de pago) añade la nota de que,
 * al confirmar, se les pedirá completar el pago de su membresía.
 *
 * Seguridad: el hook viene firmado por Supabase con Standard Webhooks. La firma
 * se verifica con SEND_EMAIL_HOOK_SECRET (el secreto que genera el panel al
 * activar el hook). El envío usa Resend (misma cuenta que campaign-emails).
 *
 * Despliegue: supabase functions deploy send-auth-email --use-api --no-verify-jwt
 * (Supabase llama al hook SIN JWT de usuario; la autenticidad la da la firma).
 *
 * Secrets requeridos (Supabase → Edge Functions → Secrets):
 *   SEND_EMAIL_HOOK_SECRET  → el secreto del hook (formato v1,whsec_...).
 *   RESEND_API_KEY          → API key de Resend.
 *   CAMPAIGN_FROM           → remitente verificado (opcional; hay valor por defecto).
 *
 * Si el hook falla, GoTrue NO envía el correo y el alta/recuperación se cae:
 * por eso todo va envuelto en try/catch y, ante cualquier fallo, se responde
 * 500 para que Supabase lo reintente/registre. Si necesitas desactivarlo
 * rápido, apaga el hook en el panel y GoTrue vuelve a su plantilla nativa.
 */
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('CAMPAIGN_FROM') ?? 'Neuromundi <admin@admin.neuromundi.com>';
// El enlace de verificación DEBE apuntar al endpoint /auth/v1/verify del proyecto
// Supabase (…​.supabase.co), NO a email_data.site_url (que es el Site URL, p. ej.
// www.neuromundi.com). SUPABASE_URL se inyecta solo en las Edge Functions.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

const RTL = new Set(['ar', 'he']);

type Action = 'signup' | 'recovery' | 'generic';

interface Strings {
  subject: string;
  heading: string;
  intro: string;
  button: string;
  fallback: string;
  ignore: string;
  footer: string;
  pay: string; // solo se usa en signup para prestadores
}

// Textos por idioma. signup + recovery; el resto de acciones caen en 'generic'.
const T: Record<string, Record<Action, Strings>> = {
  es: {
    signup: {
      subject: 'Confirma tu correo · Neuromundi',
      heading: '¡Te damos la bienvenida a Neuromundi!',
      intro: 'Para activar tu cuenta, confirma tu correo electrónico con el botón de abajo.',
      button: 'Confirmar mi correo',
      pay: 'Al confirmar, te pediremos completar el pago de tu membresía para activar tu perfil.',
      fallback: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
      ignore: 'Si no creaste esta cuenta, puedes ignorar este mensaje.',
      footer: 'Mensaje automático de Neuromundi. Por favor no respondas a este correo.',
    },
    recovery: {
      subject: 'Restablece tu contraseña · Neuromundi',
      heading: 'Restablece tu contraseña',
      intro: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el botón para continuar.',
      button: 'Restablecer contraseña',
      pay: '',
      fallback: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
      ignore: 'Si no solicitaste esto, ignora este correo; tu contraseña no cambiará.',
      footer: 'Mensaje automático de Neuromundi. Por favor no respondas a este correo.',
    },
    generic: {
      subject: 'Confirma esta acción · Neuromundi',
      heading: 'Confirmación requerida',
      intro: 'Confirma esta acción con el botón de abajo.',
      button: 'Confirmar',
      pay: '',
      fallback: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
      ignore: 'Si no reconoces esta acción, ignora este mensaje.',
      footer: 'Mensaje automático de Neuromundi. Por favor no respondas a este correo.',
    },
  },
  en: {
    signup: {
      subject: 'Confirm your email · Neuromundi',
      heading: 'Welcome to Neuromundi!',
      intro: 'To activate your account, confirm your email with the button below.',
      button: 'Confirm my email',
      pay: "After confirming, we'll ask you to complete your membership payment to activate your profile.",
      fallback: "If the button doesn't work, copy and paste this link into your browser:",
      ignore: "If you didn't create this account, you can ignore this message.",
      footer: "Automated message from Neuromundi. Please don't reply to this email.",
    },
    recovery: {
      subject: 'Reset your password · Neuromundi',
      heading: 'Reset your password',
      intro: 'We received a request to reset your account password. Use the button to continue.',
      button: 'Reset password',
      pay: '',
      fallback: "If the button doesn't work, copy and paste this link into your browser:",
      ignore: "If you didn't request this, ignore this email; your password won't change.",
      footer: "Automated message from Neuromundi. Please don't reply to this email.",
    },
    generic: {
      subject: 'Confirm this action · Neuromundi',
      heading: 'Confirmation required',
      intro: 'Confirm this action with the button below.',
      button: 'Confirm',
      pay: '',
      fallback: "If the button doesn't work, copy and paste this link into your browser:",
      ignore: "If you don't recognize this action, ignore this message.",
      footer: "Automated message from Neuromundi. Please don't reply to this email.",
    },
  },
  fr: {
    signup: {
      subject: 'Confirmez votre e-mail · Neuromundi',
      heading: 'Bienvenue sur Neuromundi !',
      intro: 'Pour activer votre compte, confirmez votre e-mail avec le bouton ci-dessous.',
      button: 'Confirmer mon e-mail',
      pay: 'Après confirmation, nous vous demanderons de finaliser le paiement de votre adhésion pour activer votre profil.',
      fallback: 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :',
      ignore: "Si vous n'avez pas créé ce compte, ignorez ce message.",
      footer: 'Message automatique de Neuromundi. Merci de ne pas répondre.',
    },
    recovery: {
      subject: 'Réinitialisez votre mot de passe · Neuromundi',
      heading: 'Réinitialisez votre mot de passe',
      intro: 'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte. Utilisez le bouton pour continuer.',
      button: 'Réinitialiser le mot de passe',
      pay: '',
      fallback: 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :',
      ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail ; votre mot de passe ne changera pas.",
      footer: 'Message automatique de Neuromundi. Merci de ne pas répondre.',
    },
    generic: {
      subject: 'Confirmez cette action · Neuromundi',
      heading: 'Confirmation requise',
      intro: 'Confirmez cette action avec le bouton ci-dessous.',
      button: 'Confirmer',
      pay: '',
      fallback: 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :',
      ignore: "Si vous ne reconnaissez pas cette action, ignorez ce message.",
      footer: 'Message automatique de Neuromundi. Merci de ne pas répondre.',
    },
  },
  de: {
    signup: {
      subject: 'Bestätige deine E-Mail · Neuromundi',
      heading: 'Willkommen bei Neuromundi!',
      intro: 'Um dein Konto zu aktivieren, bestätige deine E-Mail mit der Schaltfläche unten.',
      button: 'E-Mail bestätigen',
      pay: 'Nach der Bestätigung bitten wir dich, die Zahlung deiner Mitgliedschaft abzuschließen, um dein Profil zu aktivieren.',
      fallback: 'Wenn die Schaltfläche nicht funktioniert, kopiere diesen Link in deinen Browser:',
      ignore: 'Wenn du dieses Konto nicht erstellt hast, kannst du diese Nachricht ignorieren.',
      footer: 'Automatische Nachricht von Neuromundi. Bitte nicht auf diese E-Mail antworten.',
    },
    recovery: {
      subject: 'Setze dein Passwort zurück · Neuromundi',
      heading: 'Passwort zurücksetzen',
      intro: 'Wir haben eine Anfrage zum Zurücksetzen deines Passworts erhalten. Nutze die Schaltfläche, um fortzufahren.',
      button: 'Passwort zurücksetzen',
      pay: '',
      fallback: 'Wenn die Schaltfläche nicht funktioniert, kopiere diesen Link in deinen Browser:',
      ignore: 'Wenn du das nicht angefordert hast, ignoriere diese E-Mail; dein Passwort bleibt unverändert.',
      footer: 'Automatische Nachricht von Neuromundi. Bitte nicht auf diese E-Mail antworten.',
    },
    generic: {
      subject: 'Bestätige diese Aktion · Neuromundi',
      heading: 'Bestätigung erforderlich',
      intro: 'Bestätige diese Aktion mit der Schaltfläche unten.',
      button: 'Bestätigen',
      pay: '',
      fallback: 'Wenn die Schaltfläche nicht funktioniert, kopiere diesen Link in deinen Browser:',
      ignore: 'Wenn du diese Aktion nicht kennst, ignoriere diese Nachricht.',
      footer: 'Automatische Nachricht von Neuromundi. Bitte nicht auf diese E-Mail antworten.',
    },
  },
  it: {
    signup: {
      subject: 'Conferma la tua email · Neuromundi',
      heading: 'Benvenuto su Neuromundi!',
      intro: 'Per attivare il tuo account, conferma la tua email con il pulsante qui sotto.',
      button: 'Conferma la mia email',
      pay: "Dopo la conferma, ti chiederemo di completare il pagamento dell'iscrizione per attivare il tuo profilo.",
      fallback: 'Se il pulsante non funziona, copia e incolla questo link nel browser:',
      ignore: 'Se non hai creato questo account, ignora questo messaggio.',
      footer: 'Messaggio automatico di Neuromundi. Ti preghiamo di non rispondere.',
    },
    recovery: {
      subject: 'Reimposta la password · Neuromundi',
      heading: 'Reimposta la password',
      intro: 'Abbiamo ricevuto una richiesta di reimpostazione della password del tuo account. Usa il pulsante per continuare.',
      button: 'Reimposta password',
      pay: '',
      fallback: 'Se il pulsante non funziona, copia e incolla questo link nel browser:',
      ignore: "Se non hai richiesto questo, ignora l'email; la tua password non cambierà.",
      footer: 'Messaggio automatico di Neuromundi. Ti preghiamo di non rispondere.',
    },
    generic: {
      subject: 'Conferma questa azione · Neuromundi',
      heading: 'Conferma richiesta',
      intro: 'Conferma questa azione con il pulsante qui sotto.',
      button: 'Conferma',
      pay: '',
      fallback: 'Se il pulsante non funziona, copia e incolla questo link nel browser:',
      ignore: 'Se non riconosci questa azione, ignora questo messaggio.',
      footer: 'Messaggio automatico di Neuromundi. Ti preghiamo di non rispondere.',
    },
  },
  pt: {
    signup: {
      subject: 'Confirme seu e-mail · Neuromundi',
      heading: 'Bem-vindo à Neuromundi!',
      intro: 'Para ativar sua conta, confirme seu e-mail com o botão abaixo.',
      button: 'Confirmar meu e-mail',
      pay: 'Após confirmar, pediremos que você conclua o pagamento da sua assinatura para ativar seu perfil.',
      fallback: 'Se o botão não funcionar, copie e cole este link no seu navegador:',
      ignore: 'Se você não criou esta conta, ignore esta mensagem.',
      footer: 'Mensagem automática da Neuromundi. Por favor, não responda a este e-mail.',
    },
    recovery: {
      subject: 'Redefina sua senha · Neuromundi',
      heading: 'Redefina sua senha',
      intro: 'Recebemos uma solicitação para redefinir a senha da sua conta. Use o botão para continuar.',
      button: 'Redefinir senha',
      pay: '',
      fallback: 'Se o botão não funcionar, copie e cole este link no seu navegador:',
      ignore: 'Se você não solicitou isso, ignore este e-mail; sua senha não será alterada.',
      footer: 'Mensagem automática da Neuromundi. Por favor, não responda a este e-mail.',
    },
    generic: {
      subject: 'Confirme esta ação · Neuromundi',
      heading: 'Confirmação necessária',
      intro: 'Confirme esta ação com o botão abaixo.',
      button: 'Confirmar',
      pay: '',
      fallback: 'Se o botão não funcionar, copie e cole este link no seu navegador:',
      ignore: 'Se você não reconhece esta ação, ignore esta mensagem.',
      footer: 'Mensagem automática da Neuromundi. Por favor, não responda a este e-mail.',
    },
  },
  ja: {
    signup: {
      subject: 'メールアドレスの確認 · Neuromundi',
      heading: 'Neuromundi へようこそ！',
      intro: 'アカウントを有効化するには、下のボタンでメールアドレスを確認してください。',
      button: 'メールを確認する',
      pay: '確認後、プロフィールを有効化するために会員費のお支払いをお願いします。',
      fallback: 'ボタンが機能しない場合は、このリンクをブラウザに貼り付けてください:',
      ignore: 'このアカウントに心当たりがない場合は、このメッセージを無視してください。',
      footer: 'Neuromundi の自動送信メールです。返信はできません。',
    },
    recovery: {
      subject: 'パスワードの再設定 · Neuromundi',
      heading: 'パスワードの再設定',
      intro: 'アカウントのパスワード再設定のリクエストを受け付けました。ボタンから続行してください。',
      button: 'パスワードを再設定',
      pay: '',
      fallback: 'ボタンが機能しない場合は、このリンクをブラウザに貼り付けてください:',
      ignore: '心当たりがない場合はこのメールを無視してください。パスワードは変更されません。',
      footer: 'Neuromundi の自動送信メールです。返信はできません。',
    },
    generic: {
      subject: '操作の確認 · Neuromundi',
      heading: '確認が必要です',
      intro: '下のボタンでこの操作を確認してください。',
      button: '確認する',
      pay: '',
      fallback: 'ボタンが機能しない場合は、このリンクをブラウザに貼り付けてください:',
      ignore: 'この操作に心当たりがない場合は、このメッセージを無視してください。',
      footer: 'Neuromundi の自動送信メールです。返信はできません。',
    },
  },
  zh: {
    signup: {
      subject: '确认你的邮箱 · Neuromundi',
      heading: '欢迎加入 Neuromundi！',
      intro: '请点击下方按钮确认邮箱以激活账户。',
      button: '确认我的邮箱',
      pay: '确认后，我们将请你完成会员付款以激活你的资料。',
      fallback: '如果按钮无法使用，请将此链接复制到浏览器打开：',
      ignore: '如果你没有创建此账户，请忽略此邮件。',
      footer: 'Neuromundi 自动发送的邮件，请勿回复。',
    },
    recovery: {
      subject: '重置密码 · Neuromundi',
      heading: '重置密码',
      intro: '我们收到重置账户密码的请求。请点击按钮继续。',
      button: '重置密码',
      pay: '',
      fallback: '如果按钮无法使用，请将此链接复制到浏览器打开：',
      ignore: '如果这不是你发起的，请忽略此邮件；你的密码不会更改。',
      footer: 'Neuromundi 自动发送的邮件，请勿回复。',
    },
    generic: {
      subject: '确认此操作 · Neuromundi',
      heading: '需要确认',
      intro: '请点击下方按钮确认此操作。',
      button: '确认',
      pay: '',
      fallback: '如果按钮无法使用，请将此链接复制到浏览器打开：',
      ignore: '如果你不认识此操作，请忽略此邮件。',
      footer: 'Neuromundi 自动发送的邮件，请勿回复。',
    },
  },
  ar: {
    signup: {
      subject: 'أكّد بريدك الإلكتروني · Neuromundi',
      heading: 'مرحبًا بك في Neuromundi!',
      intro: 'لتفعيل حسابك، أكّد بريدك الإلكتروني عبر الزر أدناه.',
      button: 'تأكيد بريدي',
      pay: 'بعد التأكيد، سنطلب منك إكمال دفع اشتراك عضويتك لتفعيل ملفك.',
      fallback: 'إذا لم يعمل الزر، انسخ هذا الرابط والصقه في متصفحك:',
      ignore: 'إذا لم تنشئ هذا الحساب، يمكنك تجاهل هذه الرسالة.',
      footer: 'رسالة تلقائية من Neuromundi. يرجى عدم الرد.',
    },
    recovery: {
      subject: 'إعادة تعيين كلمة المرور · Neuromundi',
      heading: 'إعادة تعيين كلمة المرور',
      intro: 'تلقّينا طلبًا لإعادة تعيين كلمة مرور حسابك. استخدم الزر للمتابعة.',
      button: 'إعادة تعيين كلمة المرور',
      pay: '',
      fallback: 'إذا لم يعمل الزر، انسخ هذا الرابط والصقه في متصفحك:',
      ignore: 'إذا لم تطلب ذلك، تجاهل هذه الرسالة؛ لن تتغيّر كلمة مرورك.',
      footer: 'رسالة تلقائية من Neuromundi. يرجى عدم الرد.',
    },
    generic: {
      subject: 'أكّد هذا الإجراء · Neuromundi',
      heading: 'التأكيد مطلوب',
      intro: 'أكّد هذا الإجراء عبر الزر أدناه.',
      button: 'تأكيد',
      pay: '',
      fallback: 'إذا لم يعمل الزر، انسخ هذا الرابط والصقه في متصفحك:',
      ignore: 'إذا لم تتعرّف على هذا الإجراء، تجاهل هذه الرسالة.',
      footer: 'رسالة تلقائية من Neuromundi. يرجى عدم الرد.',
    },
  },
  he: {
    signup: {
      subject: 'אישור האימייל שלך · Neuromundi',
      heading: 'ברוך הבא ל-Neuromundi!',
      intro: 'כדי להפעיל את חשבונך, אשר את כתובת האימייל שלך בעזרת הכפתור למטה.',
      button: 'אישור האימייל שלי',
      pay: 'לאחר האישור נבקש ממך להשלים את תשלום המנוי כדי להפעיל את הפרופיל שלך.',
      fallback: 'אם הכפתור אינו פועל, העתק את הקישור והדבק אותו בדפדפן:',
      ignore: 'אם לא יצרת חשבון זה, אפשר להתעלם מהודעה זו.',
      footer: 'הודעה אוטומטית מ-Neuromundi. אין להשיב להודעה זו.',
    },
    recovery: {
      subject: 'איפוס הסיסמה · Neuromundi',
      heading: 'איפוס הסיסמה',
      intro: 'קיבלנו בקשה לאיפוס הסיסמה של חשבונך. השתמש בכפתור כדי להמשיך.',
      button: 'איפוס סיסמה',
      pay: '',
      fallback: 'אם הכפתור אינו פועל, העתק את הקישור והדבק אותו בדפדפן:',
      ignore: 'אם לא ביקשת זאת, התעלם מהודעה זו; הסיסמה שלך לא תשתנה.',
      footer: 'הודעה אוטומטית מ-Neuromundi. אין להשיב להודעה זו.',
    },
    generic: {
      subject: 'אישור פעולה זו · Neuromundi',
      heading: 'נדרש אישור',
      intro: 'אשר פעולה זו בעזרת הכפתור למטה.',
      button: 'אישור',
      pay: '',
      fallback: 'אם הכפתור אינו פועל, העתק את הקישור והדבק אותו בדפדפן:',
      ignore: 'אם אינך מזהה פעולה זו, התעלם מהודעה זו.',
      footer: 'הודעה אוטומטית מ-Neuromundi. אין להשיב להודעה זו.',
    },
  },
  ko: {
    signup: {
      subject: '이메일 확인 · Neuromundi',
      heading: 'Neuromundi에 오신 것을 환영합니다!',
      intro: '계정을 활성화하려면 아래 버튼으로 이메일을 확인하세요.',
      button: '이메일 확인하기',
      pay: '확인 후 프로필 활성화를 위해 멤버십 결제를 요청드립니다.',
      fallback: '버튼이 작동하지 않으면 이 링크를 브라우저에 붙여넣으세요:',
      ignore: '이 계정을 만들지 않았다면 이 메시지를 무시하세요.',
      footer: 'Neuromundi에서 자동으로 보낸 메일입니다. 회신하지 마세요.',
    },
    recovery: {
      subject: '비밀번호 재설정 · Neuromundi',
      heading: '비밀번호 재설정',
      intro: '계정 비밀번호 재설정 요청을 받았습니다. 버튼을 눌러 계속하세요.',
      button: '비밀번호 재설정',
      pay: '',
      fallback: '버튼이 작동하지 않으면 이 링크를 브라우저에 붙여넣으세요:',
      ignore: '요청하지 않았다면 이 메일을 무시하세요. 비밀번호는 변경되지 않습니다.',
      footer: 'Neuromundi에서 자동으로 보낸 메일입니다. 회신하지 마세요.',
    },
    generic: {
      subject: '이 작업 확인 · Neuromundi',
      heading: '확인 필요',
      intro: '아래 버튼으로 이 작업을 확인하세요.',
      button: '확인',
      pay: '',
      fallback: '버튼이 작동하지 않으면 이 링크를 브라우저에 붙여넣으세요:',
      ignore: '이 작업을 인식하지 못하면 이 메시지를 무시하세요.',
      footer: 'Neuromundi에서 자동으로 보낸 메일입니다. 회신하지 마세요.',
    },
  },
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function actionFor(t: string): Action {
  if (t === 'signup') return 'signup';
  if (t === 'recovery') return 'recovery';
  return 'generic';
}

function render(s: Strings, link: string, lang: string, showPay: boolean): string {
  const dir = RTL.has(lang) ? 'rtl' : 'ltr';
  const align = RTL.has(lang) ? 'right' : 'left';
  const payBlock =
    showPay && s.pay
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1e3a5f;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px 14px;">${escapeHtml(
          s.pay,
        )}</p>`
      : '';
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr><td style="padding:28px 28px 8px;text-align:${align};" dir="${dir}">
      <div style="font-size:20px;font-weight:800;color:#0e7490;">Neuromundi</div>
    </td></tr>
    <tr><td style="padding:8px 28px 4px;text-align:${align};" dir="${dir}">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(s.heading)}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(s.intro)}</p>
      ${payBlock}
    </td></tr>
    <tr><td style="padding:4px 28px 20px;text-align:center;">
      <a href="${link}" style="display:inline-block;background:#0e7490;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px;">${escapeHtml(
        s.button,
      )}</a>
    </td></tr>
    <tr><td style="padding:0 28px 20px;text-align:${align};" dir="${dir}">
      <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#64748b;">${escapeHtml(s.fallback)}</p>
      <p style="margin:0 0 20px;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${link}" style="color:#0e7490;">${link}</a></p>
      <p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:#94a3b8;">${escapeHtml(s.ignore)}</p>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">${escapeHtml(s.footer)}</p>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!HOOK_SECRET || !RESEND_API_KEY) {
    console.error('send-auth-email: faltan secrets (HOOK_SECRET/RESEND_API_KEY)');
    return new Response(JSON.stringify({ error: 'server not configured' }), { status: 500 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let data: {
    user: { email: string; user_metadata?: Record<string, unknown> };
    email_data: {
      token_hash: string;
      redirect_to: string;
      email_action_type: string;
      site_url: string;
    };
  };
  try {
    // El secreto del panel viene como "v1,whsec_<base64>"; la librería espera el base64.
    const wh = new Webhook(HOOK_SECRET.replace('v1,whsec_', ''));
    data = wh.verify(payload, headers) as typeof data;
  } catch (e) {
    console.error('send-auth-email: firma inválida', e);
    return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 401 });
  }

  try {
    const meta = data.user.user_metadata ?? {};
    const ed = data.email_data;
    // Idioma: primero el `lang` que viaja en redirect_to (refleja el idioma ACTUAL,
    // clave para el restablecimiento de cuentas viejas sin metadato), luego el de
    // los metadatos del registro, y por último español.
    let redirectLang = '';
    try {
      redirectLang = new URL(ed.redirect_to).searchParams.get('lang')?.slice(0, 2).toLowerCase() ?? '';
    } catch { /* redirect_to podría no ser una URL absoluta */ }
    const metaLang = String(meta.lang ?? '').slice(0, 2).toLowerCase();
    const lang = redirectLang in T ? redirectLang : metaLang in T ? metaLang : 'es';
    const action = actionFor(ed.email_action_type);
    const s = T[lang][action];

    // Prestador de pago = role 'provider' salvo empresa (siempre gratuita).
    const role = String(meta.role ?? '');
    const providerType = String(meta.provider_type ?? '');
    const showPay = action === 'signup' && role === 'provider' && providerType !== 'company';

    // Host del proyecto Supabase (no el site_url). Fallback al site_url por si
    // SUPABASE_URL faltara, aunque siempre está presente en Edge Functions.
    const verifyHost = SUPABASE_URL || ed.site_url;
    const link = `${verifyHost}/auth/v1/verify?token=${encodeURIComponent(
      ed.token_hash,
    )}&type=${encodeURIComponent(ed.email_action_type)}&redirect_to=${encodeURIComponent(ed.redirect_to)}`;

    const html = render(s, link, lang, showPay);

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [data.user.email], subject: s.subject, html }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('send-auth-email: Resend falló', r.status, t);
      return new Response(JSON.stringify({ error: 'send failed' }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-auth-email: error inesperado', e);
    return new Response(JSON.stringify({ error: 'unexpected' }), { status: 500 });
  }
});
