import type { ToolkitModule } from './types';

/** Ferramentas — seção AFECÇÕES NEUROLÓGICAS (português). Base: OMS — CIE-11 Cap.08
 *  e IGAP. Orientação geral e de apoio; NÃO substitui a tua equipa médica nem os
 *  serviços de emergência. */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A', slug: 'entender-a-afeccao', icon: 'stethoscope',
    title: 'Entender a afecção', area: 'Informação clara e consulta bem aproveitada',
    summary: 'Palavras sem medo e perguntas que organizam o caminho.',
    sections: [
      { id: 'glosario-af', title: 'Glossário sem medo', blocks: [
        { kind: 'lead', text: 'Alguns termos soam grandes. Aqui contamo-los com calma: descrevem processos e apoios, não definem quem és tu ou o teu familiar.' },
        { kind: 'glossary', items: [
          { term: 'Afecção neurológica', plain: 'Uma condição do sistema nervoso (cérebro, medula ou nervos). Muitas são acompanhadas e a qualidade de vida melhora com apoios.' },
          { term: 'Neurologia', plain: 'A especialidade médica que estuda e trata estas condições.' },
          { term: 'Reabilitação', plain: 'Terapias para recuperar ou compensar funções e ganhar autonomia.' },
          { term: 'Crónico', plain: 'Que acompanha por tempo prolongado; maneja-se, cuida-se e convive-se com ele.' },
          { term: 'Cuidados paliativos', plain: 'Apoios centrados no bem-estar e em aliviar desconfortos; somam qualidade de vida em qualquer etapa.' },
          { term: 'Adesão', plain: 'Seguir o plano combinado (medicação, terapias, consultas) de forma constante.' },
        ] },
      ] },
      { id: 'consulta', title: 'Aproveitar a consulta', blocks: [
        { kind: 'p', text: 'O tempo com a equipa médica é valioso. Chegar com perguntas escritas ajuda a não esquecer o importante.' },
        { kind: 'list', variant: 'check', items: [
          'Que nome tem a afecção e o que significa no dia a dia?',
          'Que sinais devo vigiar e quais são urgentes?',
          'Para que serve cada medicamento e que efeitos esperar?',
          'Que terapias ajudam e com que frequência?',
          'A quem ligo perante uma dúvida ou uma crise?',
        ] },
        { kind: 'callout', tone: 'tip', title: 'Leva alguém', text: 'Quatro ouvidos escutam melhor que dois. Pede resumos por escrito e não hesites em perguntar "pode explicar de outra forma?".' },
      ] },
      { id: 'organizar', title: 'Organizar a informação', blocks: [
        { kind: 'p', text: 'Uma pasta única — física ou digital — com relatórios, exames, medicação e contactos evita repetir a história e agiliza cada atendimento.' },
        { kind: 'resource', file: '/kit/af/pt/carpeta-de-salud.pdf', label: 'Pasta de saúde', description: 'Modelo para reunir diagnósticos, exames, medicação e contactos-chave.' },
      ] },
    ],
  },
  {
    id: 'B', slug: 'reabilitacao-e-terapias', icon: 'activity',
    title: 'Reabilitação e terapias', area: 'Recuperar e compensar funções',
    summary: 'Constância amável, metas realistas e prática em casa.',
    sections: [
      { id: 'tipos', title: 'Tipos de reabilitação', blocks: [
        { kind: 'table', columns: ['Terapia', 'Em que ajuda'], rows: [
          ['Fisioterapia / neurorreabilitação', 'Força, equilíbrio, marcha e mobilidade.'],
          ['Terapia ocupacional', 'Atividades da vida diária e autonomia.'],
          ['Terapia da fala', 'Comunicação, voz e deglutição.'],
          ['Neuropsicologia', 'Memória, atenção e funções executivas.'],
          ['Reabilitação cognitiva', 'Estratégias para pensar e organizar-se melhor.'],
        ] },
      ] },
      { id: 'constancia', title: 'Metas e constância', blocks: [
        { kind: 'steps', items: [
          'Combinem com a equipa metas pequenas e mensuráveis ("caminhar 10 metros com apoio").',
          'Repartam a prática em doses curtas e frequentes, melhor do que sessões exaustivas.',
          'Registem avanços e patamares: os patamares são parte do processo, não um fracasso.',
          'Celebrem cada conquista e ajustem metas com a equipa.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Ritmo próprio', text: 'A recuperação não é linear. Dias bons e menos bons convivem; a constância amável rende mais do que a exigência.' },
      ] },
      { id: 'en-casa', title: 'Praticar em casa', blocks: [
        { kind: 'list', items: [
          'Faz os exercícios indicados pela equipa, sem improvisar a mais.',
          'Integra a prática em rotinas reais: vestir, cozinhar, caminhar até ao pátio.',
          'Cuida da segurança: espaços desimpedidos e calçado firme.',
        ] },
        { kind: 'resource', file: '/kit/af/pt/registro-de-terapias.pdf', label: 'Registo de terapias', description: 'Diário semanal de exercícios, avanços e dúvidas para a próxima sessão.' },
      ] },
    ],
  },
  {
    id: 'C', slug: 'cuidados-diarios-em-casa', icon: 'hearthands',
    title: 'Cuidados diários em casa', area: 'Bem-estar e segurança do dia a dia',
    summary: 'Medicação segura, mobilidade, alimentação e descanso.',
    sections: [
      { id: 'medicacion', title: 'Medicação segura', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Respeita horários e doses; usa alarmes ou uma caixa semanal de comprimidos.',
          'Não suspendas nem mudes doses sem consultar: alguns fármacos exigem ajuste gradual.',
          'Anota efeitos que notes e comenta-os na próxima consulta.',
          'Mantém uma lista atualizada de medicamentos sempre à mão.',
        ] },
        { kind: 'callout', tone: 'care', title: 'Mudanças, com a equipa', text: 'Suspender de repente certos medicamentos — por exemplo, alguns antiepiléticos — pode ser arriscado. Qualquer mudança, combinada com o teu médico.' },
      ] },
      { id: 'movilidad', title: 'Mobilidade e prevenção de quedas', blocks: [
        { kind: 'list', items: [
          'Retira tapetes soltos e cabos; acrescenta boa iluminação.',
          'Barras de apoio na casa de banho e corredores se necessário.',
          'Usa as ajudas indicadas (bengala, andarilho) sem vergonha: dão liberdade.',
          'Mudanças de posição frequentes se se passa muito tempo na cama ou cadeira.',
        ] },
      ] },
      { id: 'alimentacion-descanso', title: 'Alimentação, pele e descanso', blocks: [
        { kind: 'p', text: 'Se há dificuldade em engolir (disfagia), segue as indicações sobre texturas e posição ao comer, e consulta perante tosse ou engasgos frequentes.' },
        { kind: 'list', items: [
          'Cuida da hidratação e de uma alimentação adaptada às indicações.',
          'Verifica a pele nas zonas de apoio para prevenir feridas.',
          'Protege o sono: horários estáveis e ambiente tranquilo.',
        ] },
        { kind: 'resource', file: '/kit/af/pt/plan-de-cuidados.pdf', label: 'Plano de cuidados diário', description: 'Checklist para medicação, mobilidade, alimentação e descanso.' },
      ] },
    ],
  },
  {
    id: 'D', slug: 'sinais-de-alarme-e-emergencias', icon: 'pulse',
    title: 'Sinais de alarme e emergências', area: 'Agir com calma quando urge',
    summary: 'O que vigiar, como responder e quando pedir ajuda urgente.',
    sections: [
      { id: 'cuando-urge', title: 'Quando procurar ajuda urgente', blocks: [
        { kind: 'callout', tone: 'care', title: 'Na dúvida, liga para a emergência', text: 'Este guia é geral e não substitui o plano que a tua equipa te deu nem os serviços de emergência do teu país. Se houver risco de vida, liga de imediato para o número local de emergência.' },
        { kind: 'list', items: [
          'Fraqueza súbita na cara, braço ou perna, dificuldade para falar ou ver (possível AVC): age rápido, cada minuto conta.',
          'Crise (convulsão) que dura mais de 5 minutos ou se repete sem recuperar a consciência.',
          'Dor de cabeça súbita e intensíssima, diferente do habitual.',
          'Febre alta com rigidez da nuca ou confusão.',
          'Dificuldade para respirar, engasgo ou perda de consciência.',
        ] },
      ] },
      { id: 'crisis', title: 'Primeiros socorros numa crise (convulsão)', blocks: [
        { kind: 'steps', items: [
          'Mantém a calma e protege: afasta objetos com que possa magoar-se.',
          'Coloca algo macio sob a cabeça e alivia o que aperte o pescoço.',
          'Não segures com força nem metas nada na boca.',
          'Vira-o de lado (posição de recuperação) para ajudar a respirar.',
          'Cronometra a crise; se passar dos 5 minutos ou se repetir, liga para a emergência.',
          'Acompanha até recuperar e segue o plano indicado pelo médico.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Depois da crise', text: 'É normal a sonolência ou confusão posterior. Fala com voz suave, oferece segurança e regista o que aconteceu para a equipa médica.' },
      ] },
      { id: 'kit-emergencia', title: 'Preparar-se com antecedência', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Um plano de ação escrito pela tua equipa (o que fazer e a quem ligar).',
          'Lista de medicamentos e alergias, visível e atualizada.',
          'Contactos de emergência e do neurologista à mão.',
          'Documento ou pulseira de identificação médica se for recomendado.',
        ] },
        { kind: 'resource', file: '/kit/af/pt/plan-de-emergencia.pdf', label: 'Plano de emergência', description: 'Ficha para preencher com a tua equipa: sinais, passos e contactos-chave.' },
      ] },
    ],
  },
  {
    id: 'E', slug: 'direitos-tramites-e-apoios', icon: 'scale',
    title: 'Direitos, trâmites e apoios', area: 'Deficiência, apoios e cuidar de quem cuida',
    summary: 'A que tens direito e como sustentar o cuidado ao longo do tempo.',
    sections: [
      { id: 'derechos-af', title: 'Tens direito a…', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Atendimento de saúde digno, contínuo e com informação clara.',
          'Reabilitação e aos apoios de que necessitas.',
          'Acessibilidade e ajustes razoáveis no trabalho e na escola.',
          'Trato sem discriminação pela tua condição.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Pedir apoio é um direito', text: 'Os apoios por deficiência não são um favor: existem para igualar oportunidades. Informa-te dos do teu país sem constrangimento.' },
      ] },
      { id: 'tramites', title: 'Trâmites frequentes', blocks: [
        { kind: 'steps', items: [
          'Reúne relatórios médicos atualizados na tua pasta de saúde.',
          'Consulta o reconhecimento ou certificado de deficiência do teu país e os seus benefícios.',
          'Pergunta por apoios de transporte, medicação, terapias ou económicos.',
          'Guarda cópia de cada trâmite e as suas datas de renovação.',
        ] },
      ] },
      { id: 'cuidar-cuidador', title: 'Cuidar de quem cuida', blocks: [
        { kind: 'lead', text: 'O bem-estar da pessoa cuidadora sustenta tudo o resto. Cuidares de ti não é egoísmo: é parte do cuidado.' },
        { kind: 'list', items: [
          'Reparte tarefas e aceita ajuda: ninguém consegue tudo, sempre.',
          'Reserva momentos de descanso e de pausa, mesmo breves.',
          'Procura grupos de apoio entre pares (na Neuromundi tens os Neurocamps).',
          'Pede ajuda profissional se surgirem exaustão, tristeza ou ansiedade prolongadas.',
        ] },
        { kind: 'resource', file: '/kit/af/pt/red-de-apoyo.pdf', label: 'Mapa da rede de apoio', description: 'Modelo para organizar quem ajuda com o quê e os revezamentos de cuidado.' },
      ] },
    ],
  },
];
