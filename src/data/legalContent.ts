/**
 * legalContent — contenido de las páginas legales y del Manifiesto, por idioma.
 *
 * Las páginas (Términos, Privacidad, Manifiesto) leen de aquí según el idioma
 * activo de la app, de modo que cambian con el navegador y con el selector de
 * idioma. Español e inglés están completos; el resto de idiomas usa inglés como
 * respaldo hasta contar con la traducción nativa.
 */
export interface LegalSectionData { h: string; p?: string[]; li?: string[] }
export interface LegalDoc { intro: string[]; sections: LegalSectionData[] }
export interface ManifestoData {
  tagline: string;
  lead: string;
  intro: string[];
  principles: { h: string; p: string }[];
  pledgeH: string;
  pledge: string[];
}
export interface LegalBundle { updated: string; terms: LegalDoc; privacy: LegalDoc; manifesto: ManifestoData }

import { legalPt } from './legalPt';
import { legalFr } from './legalFr';
import { legalDe } from './legalDe';
import { legalIt } from './legalIt';
import { legalJa } from './legalJa';
import { legalZh } from './legalZh';

const CONTACT = 'admin@neuromundi.com';
const RESP_ES = 'Neuromundi o sus representantes conforme a la ley';
const RESP_EN = 'Neuromundi or its legal representatives';

const es: LegalBundle = {
  updated: '17 de junio de 2026',
  terms: {
    intro: [
      `Estos Términos y Condiciones ("Términos") regulan el acceso y uso de la plataforma Neuromundi (la "Plataforma"), operada por ${RESP_ES}, con domicilio en Querétaro, México y contacto en ${CONTACT}. Al crear una cuenta o utilizar la Plataforma, aceptas estos Términos en su totalidad.`,
    ],
    sections: [
      { h: '1. Aceptación de los Términos', p: ['El uso de la Plataforma implica la aceptación plena de estos Términos y del Aviso de Privacidad. Si no estás de acuerdo, no debes registrarte ni utilizar la Plataforma. Para registrarte debes marcar expresamente la casilla de aceptación correspondiente.'] },
      { h: '2. Descripción del servicio', p: ['Neuromundi es un directorio que conecta a personas neurodivergentes, padres/madres o tutores y pacientes con prestadores de servicios y proveedores de productos amigables con la neurodivergencia. La Plataforma facilita el descubrimiento, la aplicación de descuentos mediante códigos QR, la calificación de experiencias y la recomendación de productos.', 'Neuromundi actúa como intermediario. Las compras, contrataciones de servicios y la prestación de los mismos se realizan directamente entre el usuario y el proveedor; la Plataforma no es parte de esas relaciones ni procesa pagos por ellas.'] },
      { h: '3. Registro y tipos de cuenta', p: ['Existen cuatro tipos de afiliación: paciente, padre/madre o tutor, prestador de servicios y proveedor de productos. Te comprometes a proporcionar información veraz, completa y actualizada, y a mantener la confidencialidad de tus credenciales. Eres responsable de la actividad realizada desde tu cuenta.', 'Los proveedores son responsables de la exactitud de la información de sus sucursales (dirección, horarios, contacto y ubicación) y de las ofertas y productos que publiquen.'] },
      { h: '4. Uso aceptable', p: ['Al usar la Plataforma te comprometes a no:'], li: ['Publicar información falsa, engañosa o que infrinja derechos de terceros.', 'Usar la Plataforma con fines ilícitos o no autorizados.', 'Intentar vulnerar la seguridad, integridad o disponibilidad del servicio.', 'Recopilar datos de otros usuarios sin su consentimiento.', 'Suplantar la identidad de personas u organizaciones.'] },
      { h: '5. Contenido y conducta de los usuarios', p: ['Eres responsable del contenido que publiques (perfiles, ofertas, productos, comentarios y calificaciones). Nos reservamos el derecho de moderar, ocultar o eliminar contenido que infrinja estos Términos, así como de suspender cuentas, sin que ello genere responsabilidad alguna.', 'Las calificaciones y comentarios deben basarse en experiencias reales y respetuosas. No se permite contenido discriminatorio, difamatorio ni que atente contra la dignidad de las personas.'] },
      { h: '6. Descuentos, canjes y encuestas', p: ['Los descuentos los define y aplica cada proveedor. Neuromundi no garantiza la disponibilidad, vigencia ni cumplimiento de las ofertas. El canje mediante código QR y la posterior encuesta de satisfacción (EVS) tienen fines de calidad y transparencia para la comunidad.'] },
      { h: '7. Tienda Neuromundi', p: ['La Tienda permite a los usuarios ofrecer productos y recursos. Neuromundi no cobra comisión alguna por estas ventas ni promueve la comercialización de los productos: actúa únicamente como espacio de difusión con validación comunitaria. La transacción, el cobro, la entrega, la garantía y la atención posventa se realizan directamente entre quien ofrece el producto y quien lo adquiere, bajo su exclusiva responsabilidad. Los productos publicados quedan sujetos a la aprobación de un administrador antes de mostrarse públicamente, y deben cumplir el Uso aceptable de estos Términos.'] },
      { h: '8. Propiedad intelectual', p: [`La Plataforma, su marca, diseño y código son propiedad de ${RESP_ES} o de sus licenciantes. El contenido que publiques sigue siendo tuyo, pero otorgas a la Plataforma una licencia no exclusiva para mostrarlo y operar el servicio.`] },
      { h: '9. Limitación de responsabilidad', p: ['La Plataforma se ofrece "tal cual". En la máxima medida permitida por la ley aplicable, Neuromundi no será responsable por daños derivados de la relación entre usuarios y proveedores, de la información publicada por terceros, ni de interrupciones del servicio. Nada en estos Términos limita responsabilidades que no puedan excluirse legalmente.'] },
      { h: '10. Modificaciones', p: ['Podemos actualizar estos Términos en cualquier momento. Los cambios relevantes se notificarán por medios razonables. El uso continuado de la Plataforma tras una actualización implica la aceptación de los nuevos Términos.'] },
      { h: '11. Terminación', p: ['Puedes cerrar tu cuenta cuando lo desees. Podemos suspender o cancelar el acceso ante incumplimientos de estos Términos o de la normativa aplicable.'] },
      { h: '12. Ley aplicable y jurisdicción', p: ['Estos Términos se rigen por las leyes de México, Querétaro. Cualquier controversia se someterá a los tribunales competentes de Querétaro, Querétaro, México, salvo disposición legal en contrario.'] },
      { h: '13. Contacto', p: [`Para dudas sobre estos Términos, escríbenos a ${CONTACT}.`] },
    ],
  },
  privacy: {
    intro: [
      `Este Aviso de Privacidad describe cómo ${RESP_ES} ("nosotros") recopila, usa y protege los datos personales de quienes utilizan la plataforma Neuromundi. Contacto del responsable: ${CONTACT}, domicilio Querétaro, México.`,
    ],
    sections: [
      { h: '1. Responsable del tratamiento', p: [`El responsable del tratamiento de tus datos es ${RESP_ES}. Puedes contactarnos para cualquier asunto relacionado con tu privacidad en ${CONTACT}.`] },
      { h: '2. Datos que recopilamos', p: ['Según el tipo de usuario, podemos recabar:'], li: ['Identificación y contacto: nombre completo o razón social, correo electrónico, teléfono, fecha de nacimiento y género (opcional).', 'Datos de salud / neurodivergencia: el tipo de neurodivergencia o padecimiento (propio o del hijo/a). Ver la sección 3.', 'Ubicación: país, estado/provincia, municipalidad/alcaldía y, en el caso de proveedores, direcciones y coordenadas de sucursales.', 'Actividad en la Plataforma: ofertas, canjes, calificaciones, comentarios, recetas y listas.', 'Datos técnicos: los necesarios para operar la sesión y la seguridad de la cuenta.'] },
      { h: '3. Datos personales sensibles', p: ['El tipo de neurodivergencia o padecimiento es un dato personal sensible (relacionado con la salud). Solo lo tratamos con tu consentimiento expreso, otorgado al aceptar este Aviso durante el registro, y con la finalidad de ofrecerte un directorio y recomendaciones pertinentes. Puedes retirar tu consentimiento en cualquier momento (ver sección 8).'] },
      { h: '4. Finalidades del tratamiento', p: ['Usamos tus datos para:'], li: ['Crear y administrar tu cuenta y perfil.', 'Operar el directorio, los descuentos por QR y las encuestas de satisfacción.', 'Mostrar a los proveedores en el mapa (en el caso de sucursales).', 'Mejorar la calidad del servicio y la seguridad de la Plataforma.', 'Cumplir obligaciones legales aplicables.'] },
      { h: '5. Base legal y consentimiento', p: ['El tratamiento se basa en tu consentimiento y en la necesidad de ejecutar la relación derivada del uso de la Plataforma. Para los datos sensibles, la base es tu consentimiento expreso.'] },
      { h: '6. Compartición de datos con terceros', p: ['No vendemos tus datos. Podemos compartirlos con:'], li: ['Proveedores afiliados: al canjear un descuento o interactuar con ellos, comparten la información mínima necesaria para esa interacción.', 'Encargados de tratamiento: servicios de infraestructura que operan la Plataforma (por ejemplo, el proveedor de base de datos y autenticación), bajo obligaciones de confidencialidad.', 'Autoridades: cuando exista obligación legal.'] },
      { h: '7. Conservación de los datos', p: ['Conservamos tus datos mientras tu cuenta esté activa y durante los plazos que exija la normativa aplicable. Después se eliminan o anonimizan.'] },
      { h: '8. Tus derechos', p: [`Puedes solicitar el acceso, rectificación, cancelación u oposición (derechos ARCO o equivalentes), así como la portabilidad y el retiro del consentimiento, escribiendo a ${CONTACT}. Atenderemos tu solicitud conforme a la ley aplicable.`] },
      { h: '9. Seguridad', p: ['Aplicamos medidas técnicas y organizativas razonables para proteger tus datos. La transmisión de información por internet no es completamente infalible; trabajamos para mitigar los riesgos de manera continua.'] },
      { h: '10. Menores de edad', p: ['Las cuentas de tipo "padre/madre o tutor" tratan datos de menores bajo la responsabilidad y el consentimiento de quien ejerce la patria potestad o tutela. No está dirigida a que menores creen cuentas por sí mismos sin dicha representación.'] },
      { h: '11. Cambios al Aviso de Privacidad', p: ['Podemos actualizar este Aviso. Publicaremos la versión vigente en la Plataforma e indicaremos la fecha de última actualización.'] },
      { h: '12. Contacto', p: [`Para ejercer tus derechos o resolver dudas sobre privacidad, contáctanos en ${CONTACT}.`] },
    ],
  },
  manifesto: {
    tagline: 'Encontrar. Conectar. Crecer.',
    lead: 'Vivimos en un mundo diverso, con mentes únicas y ritmos de desarrollo distintos. Durante demasiado tiempo, el camino de la neurodivergencia y del neurodesarrollo se ha recorrido desde la fragmentación, la dispersión de información y, muchas veces, la soledad. Hoy decidimos cambiar esa realidad.',
    intro: [
      'Nace la Comunidad Neuromundi. No somos un simple directorio; somos un movimiento global, un ecosistema vivo de apoyo, orientación y acompañamiento genuino. Somos el primer punto de encuentro donde convergen pacientes, familias, especialistas, educadores y prestadores de servicios, unidos bajo una misma visión.',
      'En Neuromundi, declaramos y defendemos los siguientes principios fundamentales:',
    ],
    principles: [
      { h: '1. Somos un ecosistema indivisible', p: 'Rechazamos los silos. Las personas neurodivergentes y sus familias no son solo receptores, y los profesionales e instituciones no son entidades aisladas. Somos aliados estratégicos. Hemos co-creado este espacio porque entendemos que, para prosperar, la voz de la experiencia en primera persona tiene el mismo valor que el conocimiento clínico o el servicio profesional. Todos somos un solo equipo.' },
      { h: '2. La confianza y el cuidado humano son nuestra brújula', p: 'En un entorno donde abundan las dudas, nosotros ofrecemos certezas. Exigimos y promovemos una transparencia radical. Nuestras relaciones se basan en el cuidado humano, en puntuaciones de experiencia transparentes y en la validación colectiva. Cada recomendación y cada recurso se cimenta en la honestidad y en las vivencias reales de quienes conforman esta comunidad.' },
      { h: '3. La inclusión es acción, no solo un ideal', p: 'No esperamos pasivamente a que el mundo sea más amable; nosotros construimos el entorno seguro, privado e inclusivo que merecemos. Protegemos rigurosamente la dignidad y los datos de nuestra comunidad para garantizar un espacio libre de juicios, donde todos puedan expresarse, buscar ayuda y ofrecer sus servicios con total seguridad y libertad.' },
      { h: '4. El apoyo de calidad debe ser accesible y democratizado', p: 'Encontrar las terapias adecuadas, escuelas inclusivas, servicios de salud, productos validados o espacios de recreación no debería ser un laberinto agotador. Trabajamos en conjunto para centralizar y democratizar el acceso al bienestar, haciendo que la ayuda de calidad sea fácil de encontrar para cualquier persona, en cualquier lugar.' },
      { h: '5. Nuestro destino es crecer juntos', p: 'Reconocemos que el neurodesarrollo es un viaje continuo lleno de desafíos, pero también de triunfos extraordinarios. Aquí no solo buscamos soluciones transitorias; venimos a compartir conocimientos a través de nuestra academia, a aprender de los demás y a celebrar cada paso.' },
    ],
    pledgeH: 'Nuestro compromiso colectivo',
    pledge: [
      'Nos comprometemos a ser más que una plataforma. Prometemos ser el puente que acorta distancias, la red que sostiene cuando hay cansancio, y el impulso que permite a cada individuo alcanzar su máximo potencial. Esta es nuestra declaración de unidad.',
      'Bienvenidos a Neuromundi. Este es tu espacio para crecer con inclusión.',
    ],
  },
};

const en: LegalBundle = {
  updated: 'June 17, 2026',
  terms: {
    intro: [
      `These Terms and Conditions ("Terms") govern access to and use of the Neuromundi platform (the "Platform"), operated by ${RESP_EN}, with address in Querétaro, Mexico and contact at ${CONTACT}. By creating an account or using the Platform, you accept these Terms in full.`,
    ],
    sections: [
      { h: '1. Acceptance of the Terms', p: ['Using the Platform implies full acceptance of these Terms and of the Privacy Notice. If you do not agree, you must not register or use the Platform. To register you must expressly check the corresponding acceptance box.'] },
      { h: '2. Description of the service', p: ['Neuromundi is a directory that connects neurodivergent people, parents or guardians and patients with neurodivergence-friendly service providers and product vendors. The Platform enables discovery, applying discounts via QR codes, rating experiences and recommending products.', 'Neuromundi acts as an intermediary. Purchases, service engagements and their provision take place directly between the user and the provider; the Platform is not a party to those relationships nor does it process payments for them.'] },
      { h: '3. Registration and account types', p: ['There are four membership types: patient, parent or guardian, service provider and product vendor. You agree to provide truthful, complete and up-to-date information, and to keep your credentials confidential. You are responsible for the activity carried out from your account.', 'Providers are responsible for the accuracy of their branch information (address, hours, contact and location) and for the offers and products they publish.'] },
      { h: '4. Acceptable use', p: ['When using the Platform you agree not to:'], li: ['Publish false, misleading or third-party rights-infringing information.', 'Use the Platform for unlawful or unauthorized purposes.', 'Attempt to compromise the security, integrity or availability of the service.', 'Collect other users’ data without their consent.', 'Impersonate people or organizations.'] },
      { h: '5. User content and conduct', p: ['You are responsible for the content you publish (profiles, offers, products, comments and ratings). We reserve the right to moderate, hide or remove content that breaches these Terms, and to suspend accounts, without incurring any liability.', 'Ratings and comments must be based on real, respectful experiences. Discriminatory, defamatory content or content that undermines people’s dignity is not allowed.'] },
      { h: '6. Discounts, redemptions and surveys', p: ['Discounts are defined and applied by each provider. Neuromundi does not guarantee the availability, validity or fulfillment of offers. QR-code redemption and the subsequent satisfaction survey (EVS) serve quality and transparency purposes for the community.'] },
      { h: '7. Neuromundi Store', p: ['The Store lets users offer products and resources. Neuromundi charges no commission on these sales and does not promote the trade of products: it acts solely as a community-validated showcase. The transaction, payment, delivery, warranty and after-sales support take place directly between the seller and the buyer, under their sole responsibility. Published products are subject to administrator approval before being shown publicly, and must comply with the Acceptable Use of these Terms.'] },
      { h: '8. Intellectual property', p: [`The Platform, its brand, design and code belong to ${RESP_EN} or its licensors. Content you publish remains yours, but you grant the Platform a non-exclusive license to display it and operate the service.`] },
      { h: '9. Limitation of liability', p: ['The Platform is provided "as is". To the maximum extent permitted by applicable law, Neuromundi shall not be liable for damages arising from the relationship between users and providers, from information published by third parties, or from service interruptions. Nothing in these Terms limits liabilities that cannot be excluded by law.'] },
      { h: '10. Changes', p: ['We may update these Terms at any time. Material changes will be notified by reasonable means. Continued use of the Platform after an update implies acceptance of the new Terms.'] },
      { h: '11. Termination', p: ['You may close your account whenever you wish. We may suspend or cancel access in the event of breaches of these Terms or applicable regulations.'] },
      { h: '12. Governing law and jurisdiction', p: ['These Terms are governed by the laws of Mexico, Querétaro. Any dispute shall be submitted to the competent courts of Querétaro, Querétaro, Mexico, unless otherwise provided by law.'] },
      { h: '13. Contact', p: [`For questions about these Terms, write to us at ${CONTACT}.`] },
    ],
  },
  privacy: {
    intro: [
      `This Privacy Notice describes how ${RESP_EN} ("we") collects, uses and protects the personal data of those who use the Neuromundi platform. Controller contact: ${CONTACT}, address Querétaro, Mexico.`,
    ],
    sections: [
      { h: '1. Data controller', p: [`The controller of your data is ${RESP_EN}. You can contact us about any privacy matter at ${CONTACT}.`] },
      { h: '2. Data we collect', p: ['Depending on the user type, we may collect:'], li: ['Identification and contact: full name or business name, email, phone, date of birth and gender (optional).', 'Health / neurodivergence data: the type of neurodivergence or condition (your own or your child’s). See section 3.', 'Location: country, state/province, municipality and, for providers, branch addresses and coordinates.', 'Platform activity: offers, redemptions, ratings, comments, prescriptions and lists.', 'Technical data: what is needed to operate the session and account security.'] },
      { h: '3. Sensitive personal data', p: ['The type of neurodivergence or condition is sensitive personal data (health-related). We only process it with your express consent, given when accepting this Notice during registration, and for the purpose of offering you a relevant directory and recommendations. You may withdraw your consent at any time (see section 8).'] },
      { h: '4. Purposes of processing', p: ['We use your data to:'], li: ['Create and manage your account and profile.', 'Operate the directory, QR discounts and satisfaction surveys.', 'Show providers on the map (for branches).', 'Improve service quality and Platform security.', 'Comply with applicable legal obligations.'] },
      { h: '5. Legal basis and consent', p: ['Processing is based on your consent and on the need to carry out the relationship arising from use of the Platform. For sensitive data, the basis is your express consent.'] },
      { h: '6. Sharing data with third parties', p: ['We do not sell your data. We may share it with:'], li: ['Affiliated providers: when redeeming a discount or interacting with them, they share the minimum information necessary for that interaction.', 'Processors: infrastructure services that operate the Platform (for example, the database and authentication provider), under confidentiality obligations.', 'Authorities: where there is a legal obligation.'] },
      { h: '7. Data retention', p: ['We retain your data while your account is active and for the periods required by applicable regulations. Afterwards it is deleted or anonymized.'] },
      { h: '8. Your rights', p: [`You may request access, rectification, cancellation or objection (ARCO rights or equivalents), as well as portability and withdrawal of consent, by writing to ${CONTACT}. We will handle your request in accordance with applicable law.`] },
      { h: '9. Security', p: ['We apply reasonable technical and organizational measures to protect your data. Transmitting information over the internet is not completely infallible; we work continuously to mitigate the risks.'] },
      { h: '10. Minors', p: ['"Parent or guardian" accounts process minors’ data under the responsibility and consent of the person holding parental authority or guardianship. The Platform is not intended for minors to create accounts on their own without such representation.'] },
      { h: '11. Changes to this Privacy Notice', p: ['We may update this Notice. We will publish the current version on the Platform and indicate the date of last update.'] },
      { h: '12. Contact', p: [`To exercise your rights or resolve privacy questions, contact us at ${CONTACT}.`] },
    ],
  },
  manifesto: {
    tagline: 'Find. Connect. Grow.',
    lead: 'We live in a diverse world, with unique minds and different developmental rhythms. For too long, the path of neurodivergence and neurodevelopment has been walked through fragmentation, scattered information and, all too often, loneliness. Today we decide to change that reality.',
    intro: [
      'The Neuromundi Community is born. We are not a simple directory; we are a global movement, a living ecosystem of support, guidance and genuine companionship. We are the first meeting point where patients, families, specialists, educators and service providers converge, united by a shared vision.',
      'At Neuromundi, we declare and defend the following fundamental principles:',
    ],
    principles: [
      { h: '1. We are an indivisible ecosystem', p: 'We reject silos. Neurodivergent people and their families are not merely recipients, and professionals and institutions are not isolated entities. We are strategic allies. We co-created this space because we understand that, to thrive, the voice of first-person experience holds the same value as clinical knowledge or professional service. We are all one team.' },
      { h: '2. Trust and human care are our compass', p: 'In an environment full of doubts, we offer certainty. We demand and promote radical transparency. Our relationships are based on human care, transparent experience scores and collective validation. Every recommendation and every resource is built on honesty and the real experiences of those who make up this community.' },
      { h: '3. Inclusion is action, not just an ideal', p: 'We do not passively wait for the world to become kinder; we build the safe, private and inclusive environment we deserve. We rigorously protect the dignity and data of our community to guarantee a judgment-free space where everyone can express themselves, seek help and offer their services in full safety and freedom.' },
      { h: '4. Quality support must be accessible and democratized', p: 'Finding the right therapies, inclusive schools, health services, validated products or recreational spaces should not be an exhausting maze. We work together to centralize and democratize access to wellbeing, making quality help easy to find for anyone, anywhere.' },
      { h: '5. Our destiny is to grow together', p: 'We recognize that neurodevelopment is a continuous journey full of challenges, but also of extraordinary triumphs. Here we do not just seek temporary solutions; we come to share knowledge through our academy, to learn from others and to celebrate every step.' },
    ],
    pledgeH: 'Our collective pledge',
    pledge: [
      'We commit to being more than a platform. We promise to be the bridge that shortens distances, the net that holds when there is exhaustion, and the drive that allows each individual to reach their full potential. This is our declaration of unity.',
      'Welcome to Neuromundi. This is your space to grow with inclusion.',
    ],
  },
};

export const LEGAL_CONTENT: Record<string, LegalBundle> = { es, en, pt: legalPt, fr: legalFr, de: legalDe, it: legalIt, ja: legalJa, zh: legalZh };

/** Devuelve el contenido legal del idioma dado, con respaldo a inglés. */
export function legalContent(lang: string | undefined): LegalBundle {
  const code = (lang ?? 'en').slice(0, 2);
  return LEGAL_CONTENT[code] ?? LEGAL_CONTENT.en;
}
