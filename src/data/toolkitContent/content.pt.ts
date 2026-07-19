import type { ToolkitModule } from './types';

export const MODULES: ToolkitModule[] = [
  {
    "id": "A",
    "slug": "gestion-clinico-medica",
    "icon": "stethoscope",
    "title": "Gestão clínico-médica",
    "area": "Especialistas em desenvolvimento e saúde",
    "summary": "Entender palavras, observar com calma e saber a quem recorrer.",
    "sections": [
      {
        "id": "glosario",
        "title": "Glossário desmistificado",
        "blocks": [
          {
            "kind": "lead",
            "text": "Algumas palavras podem soar grandes ou frias. Aqui explicamos com calma: descrevem processos e apoios, nunca quem o seu filho é."
          },
          {
            "kind": "glossary",
            "items": [
              {
                "term": "Avaliação",
                "plain": "Uma série de encontros para conhecer como a pessoa aprende, comunica e se relaciona. Não é uma prova que se passa ou reprova."
              },
              {
                "term": "Diagnóstico",
                "plain": "Um nome que ajuda a orientar os apoios. Descreve uma forma de funcionar; não reduz a pessoa."
              },
              {
                "term": "Neurodivergência",
                "plain": "Uma forma diferente —não inferior— de perceber, pensar e sentir."
              },
              {
                "term": "Integração sensorial",
                "plain": "Acompanhamento para que os sentidos trabalhem com mais calma e o dia a dia seja mais confortável."
              },
              {
                "term": "Encaminhamento",
                "plain": "Quando um profissional propõe somar outro especialista à equipe."
              },
              {
                "term": "Linha de base",
                "plain": "Uma foto do ponto de partida para notar avanços com o tempo."
              },
              {
                "term": "Registro profissional",
                "plain": "O registro que confirma que um profissional está credenciado."
              },
              {
                "term": "Testes padronizados",
                "plain": "Ferramentas de apoio: uma parte da história, nunca toda."
              }
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Lembre-se",
            "text": "Você pode pedir que expliquem qualquer termo quantas vezes precisar. Uma boa equipe fará isso com gosto."
          }
        ]
      },
      {
        "id": "bitacora-abc",
        "title": "Guia do registro ABC",
        "blocks": [
          {
            "kind": "lead",
            "text": "O registro ABC é uma forma simples de observar sem julgar. Ajuda a encontrar padrões e a equipe a acompanhar melhor."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "A — Antecedente: o que acontecia logo antes (lugar, pessoas, atividade, mudanças).",
              "B — Comportamento: o que você observou, em palavras neutras e concretas, sem rótulos.",
              "C — Consequência: o que aconteceu depois e como a situação se acalmou."
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Anote pouco e cedo: umas linhas no momento valem mais que um texto perfeito depois.",
              "Descreva o que veria num vídeo, não o que imagina que sentiu.",
              "Após vários registros, procure padrões: horários, ambientes ou gatilhos que se repetem.",
              "Leve o registro às consultas: é um presente de informação para a equipe."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Sem culpa",
            "text": "O registro não busca “comportar-se bem”. Busca entender necessidades para responder com mais calma e cuidado."
          },
          {
            "kind": "resource",
            "file": "/kit/pt/bitacora-abc.pdf",
            "label": "Registro de observação (ABC)",
            "description": "Modelo para imprimir e registrar antecedentes, comportamento e consequências."
          }
        ]
      },
      {
        "id": "matriz",
        "title": "Matriz de especialidades",
        "blocks": [
          {
            "kind": "p",
            "text": "Cada necessidade costuma ter um tipo de profissional que acompanha melhor. Esta matriz é uma bússola, não uma regra: o apoio costuma ser em equipe."
          },
          {
            "kind": "table",
            "columns": [
              "O que você observa",
              "Quem costuma acompanhar",
              "Em que ajuda"
            ],
            "rows": [
              [
                "Linguagem e comunicação",
                "Fonoaudiologia",
                "Fala, compreensão e comunicação alternativa."
              ],
              [
                "Autonomia e dia a dia",
                "Terapia ocupacional",
                "Vestir-se, comer, escrever e regulação sensorial."
              ],
              [
                "Movimento e postura",
                "Fisioterapia",
                "Força, equilíbrio e coordenação."
              ],
              [
                "Emoções e vínculo",
                "Psicologia",
                "Regulação emocional e estratégias para casa."
              ],
              [
                "Aprendizagem escolar",
                "Psicopedagogia / Ed. especial",
                "Estratégias de estudo e adequações."
              ],
              [
                "Sono, alimentação e saúde",
                "Pediatria / Neuropediatria",
                "Acompanhamento médico e do desenvolvimento."
              ]
            ],
            "caption": "Orientação geral para saber por onde começar."
          },
          {
            "kind": "resource",
            "file": "/kit/pt/matriz-especialidades.pdf",
            "label": "Matriz de especialidades",
            "description": "Tabela para identificar qual profissional acompanha cada necessidade."
          },
          {
            "kind": "resource",
            "file": "/kit/pt/glosario.pdf",
            "label": "Glossário desmistificado",
            "description": "Os termos mais comuns, explicados com palavras simples."
          }
        ]
      }
    ]
  },
  {
    "id": "B",
    "slug": "adaptacion-educativa",
    "icon": "graduation",
    "title": "Adaptação educacional",
    "area": "Escolas e centros inclusivos",
    "summary": "Construir pontes com a escola e conhecer os apoios de acesso.",
    "sections": [
      {
        "id": "carta",
        "title": "Comunicação Escola–Família",
        "blocks": [
          {
            "kind": "lead",
            "text": "Escola e família são uma mesma equipe com um objetivo comum: que seu filho aprenda e se sinta bem. Uma comunicação clara e gentil abre portas."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Comece reconhecendo o que já funciona; a partir daí é mais fácil somar.",
              "Compartilhe o que ajuda em casa: dicas concretas poupam caminho a todos.",
              "Peça e ofereça exemplos observáveis, não rótulos.",
              "Combinem um canal e uma frequência de contato sustentáveis.",
              "Feche cada acordo com quem faz o quê e para quando."
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Sua voz importa",
            "text": "Ninguém conhece seu filho como você. Seu olhar é informação valiosa para a equipe docente."
          },
          {
            "kind": "resource",
            "file": "/kit/pt/carta-escuela-familia.pdf",
            "label": "Modelo de carta Escola–Família",
            "description": "Modelo editável para apresentar necessidades e apoios de forma clara e cordial."
          }
        ]
      },
      {
        "id": "adecuaciones",
        "title": "Adequações de acesso comuns",
        "blocks": [
          {
            "kind": "p",
            "text": "As adequações de acesso removem barreiras para a pessoa mostrar o que sabe. Não baixam as expectativas: nivelam o terreno."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Tempo adicional para responder ou terminar tarefas.",
              "Instruções curtas, uma de cada vez, com apoio visual.",
              "Um lugar com menos distrações ou o uso de fones.",
              "Pausas de movimento combinadas, sem serem vividas como castigo.",
              "Opções para demonstrar o aprendido (oral, desenho, projeto).",
              "Antecipar mudanças de rotina com avisos e apoios visuais."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Comece por pouco",
            "text": "Escolham uma ou duas adequações, testem algumas semanas e ajustem. Pequenas mudanças constantes fazem a diferença."
          },
          {
            "kind": "resource",
            "file": "/kit/pt/adecuaciones-acceso.pdf",
            "label": "Checklist de adequações de acesso",
            "description": "Lista para revisar e combinar apoios com a escola."
          }
        ]
      }
    ]
  },
  {
    "id": "C",
    "slug": "regulacion-sensorial-entorno",
    "icon": "waves",
    "title": "Regulação sensorial e ambiente",
    "area": "Terapia ocupacional e ambientes amáveis",
    "summary": "Ler as necessidades sensoriais e criar espaços previsíveis.",
    "sections": [
      {
        "id": "necesidades",
        "title": "Reconhecer necessidades sensoriais",
        "blocks": [
          {
            "kind": "lead",
            "text": "Cada pessoa vive os sons, as luzes, as texturas ou o movimento à sua maneira. Reconhecer essas necessidades é o primeiro gesto de cuidado."
          },
          {
            "kind": "p",
            "text": "Algumas recebem demais de um sentido (hiper-reatividade) e outras precisam de mais (hiporreatividade). Ambas são válidas."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Tapa os ouvidos, aperta os olhos ou evita certas texturas ou alimentos.",
              "Busca movimento, pressão ou balanço para se acalmar.",
              "Fica sobrecarregado em locais barulhentos, cheios ou muito iluminados.",
              "Tem dificuldade de “voltar à calma” após uma sobrecarga."
            ]
          },
          {
            "kind": "callout",
            "tone": "care",
            "title": "Não são birras",
            "text": "Tapar os ouvidos ou precisar se mover não é mau comportamento: é o corpo pedindo para se regular. Acompanhar vale mais que corrigir."
          }
        ]
      },
      {
        "id": "entorno",
        "title": "Adaptar o ambiente",
        "blocks": [
          {
            "kind": "p",
            "text": "Não se trata de um lar perfeito, mas de um ambiente previsível e amável. Pequenos ajustes reduzem o estresse de todos."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Luz quente e regulável; evite tremeluzir e brilho forte.",
              "Reduza o ruído de fundo; tenha fones ou protetores à mão.",
              "Ofereça texturas e roupas confortáveis; respeite as que não toleram.",
              "Antecipe o dia com rotinas e apoios visuais.",
              "Tenha objetos de regulação (bicho com peso, bola, mordedor)."
            ]
          },
          {
            "kind": "p",
            "text": "Um “canto da calma” é um espaço pequeno e acolhedor para desacelerar, sem ser castigo."
          },
          {
            "kind": "steps",
            "items": [
              "Escolha um canto tranquilo, com pouca luz e ruído.",
              "Acrescente texturas macias, uma almofada e um objeto de regulação favorito.",
              "Apresente como um lugar amável, disponível quando precisar.",
              "Acompanhe sem exigir falar: às vezes basta estar por perto."
            ]
          },
          {
            "kind": "resource",
            "file": "/kit/pt/perfil-sensorial.pdf",
            "label": "Perfil sensorial e plano de ambiente",
            "description": "Guia para registrar preferências sensoriais e planejar ajustes em casa."
          }
        ]
      }
    ]
  },
  {
    "id": "D",
    "slug": "soporte-emocional",
    "icon": "hearthands",
    "title": "Apoio emocional",
    "area": "Apoio a cuidadores e famílias",
    "summary": "Cuidar de quem cuida e acompanhar também os irmãos.",
    "sections": [
      {
        "id": "contencion",
        "title": "Amparo para cuidadores",
        "blocks": [
          {
            "kind": "lead",
            "text": "Você acompanha com todo o seu amor, e isso também cansa. Cuidar de você não é egoísmo: é o que sustenta o cuidado da sua família."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Cansaço que não passa com o descanso.",
              "Irritabilidade, choro fácil ou sensação de “piloto automático”.",
              "Deixar de lado suas necessidades, vínculos ou pausas.",
              "Culpa por descansar ou por sentir o que sente."
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Reserve pausas pequenas e reais, mesmo de dez minutos.",
              "Apoie-se em sua rede: dividir o cuidado também é cuidar.",
              "Fale do que sente com alguém de confiança ou um profissional.",
              "Comemore os pequenos avanços, os seus e os do seu filho."
            ]
          },
          {
            "kind": "callout",
            "tone": "care",
            "title": "Pedir ajuda é cuidar",
            "text": "Você não precisa dar conta de tudo sozinho/a. Buscar apoio é força, não fracasso."
          },
          {
            "kind": "resource",
            "file": "/kit/pt/contencion-cuidadores.pdf",
            "label": "Guia de amparo para cuidadores",
            "description": "Sinais de esgotamento e estratégias suaves de autocuidado e rede."
          }
        ]
      },
      {
        "id": "hermanos",
        "title": "Explicar aos irmãos",
        "blocks": [
          {
            "kind": "lead",
            "text": "Os irmãos também sentem, perguntam e precisam de um lugar. Explicar com honestidade e ternura fortalece os vínculos de toda a família."
          },
          {
            "kind": "list",
            "variant": "bullet",
            "items": [
              "Use palavras simples e adequadas à idade; responda ao que perguntam.",
              "Valide as emoções: podem sentir carinho, ciúme ou raiva, e tudo bem.",
              "Explique que equidade não é dar o mesmo, mas o que cada um precisa.",
              "Convide-os a participar sem responsabilidades de adultos.",
              "Dê a eles momentos a sós com você: também precisam se sentir vistos."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Uma conversa, não um discurso",
            "text": "Não é preciso explicar tudo de uma vez. É um diálogo que cresce com o tempo e com as perguntas."
          },
          {
            "kind": "resource",
            "file": "/kit/pt/explicar-hermanos.pdf",
            "label": "Guia para explicar aos irmãos",
            "description": "Ideias por idade e frases de apoio para conversar em família."
          }
        ]
      }
    ]
  },
  {
    "id": "E",
    "slug": "derechos-y-tramites",
    "icon": "scale",
    "title": "Direitos e trâmites",
    "area": "Orientação sobre direitos e apoios",
    "summary": "Conhecer seus direitos e os apoios disponíveis, em linguagem clara.",
    "sections": [
      {
        "id": "derechos",
        "title": "Seus direitos, com clareza",
        "blocks": [
          {
            "kind": "lead",
            "text": "Conhecer os direitos traz tranquilidade e firmeza para acompanhar. Aqui vão, em linguagem simples, alguns que costumam se aplicar."
          },
          {
            "kind": "list",
            "variant": "check",
            "items": [
              "Educação inclusiva: aprender com os pares, com os apoios necessários.",
              "Não discriminação: ninguém pode ser excluído por sua forma de ser ou funcionar.",
              "Ajustes razoáveis: adaptações para participar em igualdade.",
              "Participação: ser ouvido e considerado nas decisões que o afetam.",
              "Informação acessível: receber explicações claras e compreensíveis."
            ]
          },
          {
            "kind": "callout",
            "tone": "calm",
            "title": "Orientação geral",
            "text": "Nomes e requisitos mudam conforme o país ou a região. Confirme sempre com a autoridade ou uma associação local de confiança."
          }
        ]
      },
      {
        "id": "tramites",
        "title": "Trâmites e apoios frequentes",
        "blocks": [
          {
            "kind": "p",
            "text": "Cada lugar tem seus processos, mas muitos apoios se parecem. Este guia ajuda a saber por onde começar."
          },
          {
            "kind": "table",
            "columns": [
              "Apoio",
              "Costuma servir para",
              "Onde costuma ser feito"
            ],
            "rows": [
              [
                "Certificado de deficiência",
                "Acessar apoios e ajustes",
                "Saúde pública ou autoridade local"
              ],
              [
                "Relatório psicopedagógico",
                "Solicitar adequações escolares",
                "Escola ou profissional credenciado"
              ],
              [
                "Bolsas ou apoios financeiros",
                "Terapias, materiais ou transporte",
                "Programas sociais ou educativos"
              ],
              [
                "Orientação jurídica",
                "Esclarecer dúvidas sobre direitos",
                "Associações ou serviços legais"
              ]
            ]
          },
          {
            "kind": "steps",
            "items": [
              "Reúna documentos básicos: identificação, relatórios e avaliações.",
              "Pergunte requisitos atualizados antes de ir; poupa viagens.",
              "Guarde cópias de tudo que entregar e receber.",
              "Apoie-se em associações locais: conhecem o caminho e acompanham."
            ]
          },
          {
            "kind": "callout",
            "tone": "tip",
            "title": "Não é aconselhamento jurídico",
            "text": "Esta seção é informativa e de acompanhamento. Para o seu caso, busque orientação profissional local."
          },
          {
            "kind": "resource",
            "file": "/kit/pt/tramites-apoyos.pdf",
            "label": "Checklist de trâmites e apoios",
            "description": "Passos e documentos para organizar suas gestões com calma."
          }
        ]
      }
    ]
  }
];
