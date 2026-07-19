import type { ToolkitModule } from './types';

export const MODULES: ToolkitModule[] = [
  {
    "id": "A",
    "slug": "gestion-clinico-medica",
    "icon": "stethoscope",
    "title": "Gestión clínico-médica",
    "area": "Especialistas en desarrollo y salud",
    "summary": "Entender palabras, observar con calma y saber a quién acudir.",
    "sections": [
      {
        "id": "glosario",
        "title": "Glosario desmitificado",
        "blocks": [
          {
            "kind": "lead",
            "text": "Algunas palabras pueden sonar grandes o frías. Aquí las contamos con calma: describen procesos y apoyos, nunca definen quién es tu hijo o hija."
          },
          {
            "kind": "glossary",
            "items": [
              {
                "term": "Evaluación",
                "plain": "Una serie de encuentros para conocer cómo aprende, se comunica y se relaciona. No es un examen que se aprueba o se reprueba."
              },
              {
                "term": "Diagnóstico",
                "plain": "Un nombre que ayuda a orientar los apoyos. Describe una forma de funcionar; no reduce a la persona."
              },
              {
                "term": "Neurodivergencia",
                "plain": "Una manera distinta —no menor— de percibir, pensar y sentir."
              },
              {
                "term": "Integración sensorial",
                "plain": "Acompañamiento para que los sentidos trabajen con más calma y el día a día resulte más cómodo."
              },
              {
                "term": "Interconsulta o derivación",
                "plain": "Cuando un profesional propone sumar a otro especialista al equipo."
              },
              {
                "term": "Línea base",
                "plain": "Una foto del punto de partida para notar avances con el tiempo."
              },
              {
                "term": "Cédula profesional",
                "plain": "El registro que confirma que un profesional está acreditado."
              },
              {
                "term": "Pruebas estandarizadas",
                "plain": "Herramientas de apoyo: una parte de la historia, nunca toda."
              }
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Recuerda",
            "text": "Puedes pedir que te expliquen cualquier término las veces que necesites. Un buen equipo lo hará con gusto."
          }
        ]
      },
      {
        "id": "bitacora-abc",
        "title": "Guía de bitácora ABC",
        "blocks": [
          {
            "kind": "lead",
            "text": "La bitácora ABC es una forma sencilla de observar sin juzgar. Ayuda a encontrar patrones y a que el equipo te acompañe mejor."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "A — Antecedente: qué estaba pasando justo antes (lugar, personas, actividad, cambios).",
              "B — Conducta: qué observaste, con palabras neutras y concretas, sin etiquetas.",
              "C — Consecuencia: qué ocurrió después y cómo se calmó la situación."
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Anota poco y pronto: unas líneas en el momento valen más que un texto perfecto después.",
              "Describe lo que verías en un video, no lo que imaginas que sintió.",
              "Después de varios registros, busca patrones: horarios, entornos o detonantes que se repiten.",
              "Lleva la bitácora a las citas: es un regalo de información para el equipo."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Sin culpas",
            "text": "La bitácora no busca “portarse bien”. Busca entender necesidades para responder con más calma y cuidado."
          },
          {
            "kind": "resource",
            "file": "/kit/es/bitacora-abc.pdf",
            "label": "Bitácora de observación (ABC)",
            "description": "Plantilla imprimible para registrar antecedentes, conducta y consecuencias."
          }
        ]
      },
      {
        "id": "matriz",
        "title": "Matriz de especialidades",
        "blocks": [
          {
            "kind": "p",
            "text": "Cada necesidad suele tener un tipo de profesional que la acompaña mejor. Esta matriz es una brújula, no una regla: muchas veces el apoyo se trabaja en equipo."
          },
          {
            "kind": "table",
            "columns": [
              "Lo que observas",
              "Quién suele acompañar",
              "En qué ayuda"
            ],
            "rows": [
              [
                "Lenguaje y comunicación",
                "Fonoaudiología / Logopedia",
                "Habla, comprensión y comunicación alternativa."
              ],
              [
                "Autonomía y día a día",
                "Terapia ocupacional",
                "Vestirse, comer, escribir y regulación sensorial."
              ],
              [
                "Movimiento y postura",
                "Fisioterapia",
                "Fuerza, equilibrio y coordinación."
              ],
              [
                "Emociones y vínculo",
                "Psicología",
                "Regulación emocional y estrategias para casa."
              ],
              [
                "Aprendizaje escolar",
                "Psicopedagogía / Ed. especial",
                "Estrategias de estudio y adecuaciones."
              ],
              [
                "Sueño, alimentación y salud",
                "Pediatría / Neuropediatría",
                "Seguimiento médico y del desarrollo."
              ]
            ],
            "caption": "Orientación general para saber por dónde empezar."
          },
          {
            "kind": "resource",
            "file": "/kit/es/matriz-especialidades.pdf",
            "label": "Matriz de especialidades",
            "description": "Tabla para identificar qué profesional acompaña cada necesidad."
          },
          {
            "kind": "resource",
            "file": "/kit/es/glosario.pdf",
            "label": "Glosario desmitificado",
            "description": "Los términos más comunes, explicados con palabras cercanas."
          }
        ]
      }
    ]
  },
  {
    "id": "B",
    "slug": "adaptacion-educativa",
    "icon": "graduation",
    "title": "Adaptación educativa",
    "area": "Escuelas y centros inclusivos",
    "summary": "Tender puentes con la escuela y conocer los apoyos de acceso.",
    "sections": [
      {
        "id": "carta",
        "title": "Comunicación Escuela–Familia",
        "blocks": [
          {
            "kind": "lead",
            "text": "La escuela y la familia son un mismo equipo con una meta común: que tu hijo o hija aprenda y se sienta a gusto. Una comunicación clara y amable abre puertas."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Empieza reconociendo lo que ya funciona; desde ahí es más fácil sumar.",
              "Comparte lo que ayuda en casa: pistas concretas ahorran camino a todos.",
              "Pide y ofrece ejemplos observables, no etiquetas.",
              "Acuerden un canal y una frecuencia de contacto que sean sostenibles.",
              "Cierra cada acuerdo con quién hace qué y para cuándo."
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Tu voz cuenta",
            "text": "Nadie conoce a tu hijo o hija como tú. Tu mirada es información valiosa para el equipo docente."
          },
          {
            "kind": "resource",
            "file": "/kit/es/carta-escuela-familia.pdf",
            "label": "Plantilla de carta Escuela–Familia",
            "description": "Modelo editable para presentar necesidades y apoyos de forma clara y cordial."
          }
        ]
      },
      {
        "id": "adecuaciones",
        "title": "Adecuaciones de acceso comunes",
        "blocks": [
          {
            "kind": "p",
            "text": "Las adecuaciones de acceso quitan barreras para que la persona muestre lo que sabe. No bajan las expectativas: nivelan el terreno."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Tiempo adicional para responder o terminar tareas.",
              "Instrucciones cortas, una a la vez y con apoyo visual.",
              "Un lugar con menos distractores o el uso de audífonos.",
              "Pausas de movimiento acordadas, sin que se vivan como castigo.",
              "Opciones para demostrar lo aprendido (oral, dibujo, proyecto).",
              "Anticipar cambios de rutina con avisos y apoyos visuales."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Empieza por poco",
            "text": "Elijan una o dos adecuaciones, prueben unas semanas y ajusten. Los pequeños cambios sostenidos hacen la diferencia."
          },
          {
            "kind": "resource",
            "file": "/kit/es/adecuaciones-acceso.pdf",
            "label": "Checklist de adecuaciones de acceso",
            "description": "Lista para revisar y acordar apoyos con la escuela."
          }
        ]
      }
    ]
  },
  {
    "id": "C",
    "slug": "regulacion-sensorial-entorno",
    "icon": "waves",
    "title": "Regulación sensorial y entorno",
    "area": "Terapia ocupacional y entornos amables",
    "summary": "Leer las necesidades sensoriales y crear espacios predecibles.",
    "sections": [
      {
        "id": "necesidades",
        "title": "Reconocer necesidades sensoriales",
        "blocks": [
          {
            "kind": "lead",
            "text": "Cada persona vive los sonidos, las luces, las texturas o el movimiento de una manera propia. Reconocer esas necesidades es el primer gesto de cuidado."
          },
          {
            "kind": "p",
            "text": "Algunas personas reciben demasiada información de un sentido (hiperreactividad) y otras necesitan más para sentirse presentes (hiporreactividad). Ambas son válidas."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Se tapa los oídos, entrecierra los ojos o evita ciertas texturas o alimentos.",
              "Busca movimiento, presión o balanceo para calmarse.",
              "Se abruma en lugares con mucho ruido, gente o luz intensa.",
              "Le cuesta “volver a la calma” tras una sobrecarga."
            ]
          },
          {
            "kind": "callout",
            "tone": "care",
            "title": "No son caprichos",
            "text": "Cubrirse los oídos o necesitar moverse no es portarse mal: es el cuerpo pidiendo regularse. Acompañar vale más que corregir."
          }
        ]
      },
      {
        "id": "entorno",
        "title": "Adaptar el entorno",
        "blocks": [
          {
            "kind": "p",
            "text": "No se trata de un hogar perfecto, sino de un entorno predecible y amable. Pequeños ajustes reducen el estrés de todos."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Luz cálida y regulable; evita parpadeos y brillos fuertes.",
              "Baja el ruido de fondo; ten a mano audífonos o tapones si ayudan.",
              "Ofrece texturas y ropa cómodas; respeta las que no toleran.",
              "Anticipa el día con rutinas y apoyos visuales.",
              "Ten objetos de regulación disponibles (peluche con peso, pelota, mordedor)."
            ]
          },
          {
            "kind": "p",
            "text": "Un “rincón de calma” es un espacio pequeño y acogedor al que acudir para bajar revoluciones, sin que sea un castigo."
          },
          {
            "kind": "steps",
            "items": [
              "Elige un rincón tranquilo, con poca luz y ruido.",
              "Suma texturas suaves, un cojín y un objeto de regulación favorito.",
              "Preséntalo como un lugar amable, disponible cuando se necesite.",
              "Acompaña sin exigir hablar: a veces solo hace falta estar cerca."
            ]
          },
          {
            "kind": "resource",
            "file": "/kit/es/perfil-sensorial.pdf",
            "label": "Perfil sensorial y plan de entorno",
            "description": "Guía para registrar preferencias sensoriales y planear ajustes en casa."
          }
        ]
      }
    ]
  },
  {
    "id": "D",
    "slug": "soporte-emocional",
    "icon": "hearthands",
    "title": "Soporte emocional",
    "area": "Acompañamiento para cuidadores y familias",
    "summary": "Cuidar a quien cuida y acompañar también a los hermanos.",
    "sections": [
      {
        "id": "contencion",
        "title": "Contención para cuidadores",
        "blocks": [
          {
            "kind": "lead",
            "text": "Acompañas con todo tu amor, y eso también cansa. Cuidar de ti no es egoísmo: es lo que sostiene el cuidado de tu familia."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Cansancio que no se va con el descanso.",
              "Irritabilidad, llanto fácil o sensación de “estar en piloto automático”.",
              "Dejar de lado tus propias necesidades, vínculos o pausas.",
              "Culpa por descansar o por sentir lo que sientes."
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Reserva pausas pequeñas y reales, aunque sean de diez minutos.",
              "Apóyate en tu red: repartir el cuidado también es cuidar.",
              "Habla de lo que sientes con alguien de confianza o un profesional.",
              "Celebra los avances pequeños, los tuyos y los de tu hijo o hija."
            ]
          },
          {
            "kind": "callout",
            "tone": "care",
            "title": "Pedir ayuda es cuidar",
            "text": "No tienes que poder con todo, ni sola ni solo. Buscar apoyo es una forma de fortaleza, no de fallo."
          },
          {
            "kind": "resource",
            "file": "/kit/es/contencion-cuidadores.pdf",
            "label": "Guía de contención para cuidadores",
            "description": "Señales de agotamiento y estrategias suaves de autocuidado y red de apoyo."
          }
        ]
      },
      {
        "id": "hermanos",
        "title": "Explicar a los hermanos",
        "blocks": [
          {
            "kind": "lead",
            "text": "Los hermanos también sienten, preguntan y necesitan un lugar. Explicarles con honestidad y ternura fortalece los vínculos de toda la familia."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Usa palabras sencillas y adecuadas a su edad; responde lo que preguntan.",
              "Valida sus emociones: pueden sentir cariño, celos o enojo, y está bien.",
              "Explica que equidad no es dar lo mismo, sino lo que cada quien necesita.",
              "Invítales a participar sin cargarles responsabilidades de personas adultas.",
              "Regálales momentos a solas contigo: también necesitan sentirse vistos."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Una conversación, no un discurso",
            "text": "No hace falta explicarlo todo de una vez. Es un diálogo que crece con el tiempo y con sus preguntas."
          },
          {
            "kind": "resource",
            "file": "/kit/es/explicar-hermanos.pdf",
            "label": "Protocolo para explicar a los hermanos",
            "description": "Ideas por edades y frases de apoyo para conversar en familia."
          }
        ]
      }
    ]
  },
  {
    "id": "E",
    "slug": "derechos-y-tramites",
    "icon": "scale",
    "title": "Derechos y trámites",
    "area": "Orientación en derechos y apoyos",
    "summary": "Conocer tus derechos y los apoyos disponibles, en lenguaje claro.",
    "sections": [
      {
        "id": "derechos",
        "title": "Tus derechos, en claro",
        "blocks": [
          {
            "kind": "lead",
            "text": "Conocer los derechos da tranquilidad y firmeza para acompañar. Aquí van, en lenguaje sencillo, algunos que suelen aplicar."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Educación inclusiva: aprender junto a sus pares, con los apoyos necesarios.",
              "No discriminación: nadie puede ser excluido por su forma de ser o funcionar.",
              "Ajustes razonables: adaptaciones para participar en igualdad de condiciones.",
              "Participación: ser escuchado y tomado en cuenta en las decisiones que le afectan.",
              "Información accesible: recibir explicaciones claras y comprensibles."
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Orientación general",
            "text": "Los nombres y requisitos cambian según el país o la región. Confirma siempre con la autoridad o una asociación local de confianza."
          }
        ]
      },
      {
        "id": "tramites",
        "title": "Trámites y apoyos frecuentes",
        "blocks": [
          {
            "kind": "p",
            "text": "Cada lugar tiene sus procesos, pero muchos apoyos se parecen. Esta guía te ayuda a saber por dónde empezar."
          },
          {
            "kind": "table",
            "columns": [
              "Apoyo",
              "Suele servir para",
              "Dónde suele gestionarse"
            ],
            "rows": [
              [
                "Certificado o constancia de discapacidad",
                "Acceder a apoyos y ajustes",
                "Salud pública o autoridad local"
              ],
              [
                "Informe psicopedagógico",
                "Solicitar adecuaciones escolares",
                "Escuela o profesional acreditado"
              ],
              [
                "Becas o apoyos económicos",
                "Terapias, materiales o transporte",
                "Programas sociales o educativos"
              ],
              [
                "Orientación jurídica",
                "Resolver dudas sobre derechos",
                "Asociaciones o servicios legales"
              ]
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Reúne documentos básicos: identificación, informes y evaluaciones.",
              "Pregunta requisitos actualizados antes de acudir; ahorra viajes.",
              "Guarda copias de todo lo que entregues y recibas.",
              "Apóyate en asociaciones locales: conocen el camino y acompañan."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "No es asesoría legal",
            "text": "Esta sección es informativa y de acompañamiento. Para tu caso concreto, busca orientación profesional en tu localidad."
          },
          {
            "kind": "resource",
            "file": "/kit/es/tramites-apoyos.pdf",
            "label": "Checklist de trámites y apoyos",
            "description": "Pasos y documentos para organizar tus gestiones con calma."
          }
        ]
      }
    ]
  }
];
