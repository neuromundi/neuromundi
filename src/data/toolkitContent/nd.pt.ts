import type { ToolkitModule } from './types';

/** Ferramentas — seção NEURODESENVOLVIMENTO (português). Orientação geral, calorosa
 *  e NÃO diagnóstica para famílias que acompanham o desenvolvimento infantil. */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A', slug: 'marcos-do-desenvolvimento', icon: 'sprout',
    title: 'Marcos do desenvolvimento', area: 'Vigilância do desenvolvimento precoce',
    summary: 'O que observar por idade, com calma e sem comparar.',
    sections: [
      { id: 'que-son', title: 'O que são os marcos (e o que não são)', blocks: [
        { kind: 'lead', text: 'Os marcos são sinais aproximados de como uma criança se move, comunica, brinca e se relaciona. São um guia para acompanhar, não uma corrida nem um exame.' },
        { kind: 'p', text: 'Cada criança tem o seu próprio ritmo. As faixas etárias são médias: chegar um pouco antes ou depois costuma estar dentro do esperado. O que vale é a trajetória ao longo do tempo, não um único dia.' },
        { kind: 'callout', tone: 'calm', title: 'Uma bússola, não uma régua', text: 'Se algo te preocupa, a tua observação conta. Pedir orientação cedo não "rotula" ninguém: abre portas a apoios que facilitam a vida.' },
      ] },
      { id: 'por-edad', title: 'O que observar, por área', blocks: [
        { kind: 'p', text: 'Quatro áreas crescem juntas. Esta tabela dá exemplos do que costuma aparecer e quando convém conversar com um profissional de confiança.' },
        { kind: 'table', columns: ['Área', 'O que costuma aparecer', 'Convém consultar se…'], rows: [
          ['Motor', 'Sustenta a cabeça, senta, engatinha, anda, manipula objetos.', 'Aos 12 meses não se desloca de nenhuma forma, ou o corpo parece muito rígido ou muito mole.'],
          ['Comunicação', 'Balbucia, aponta, primeiras palavras, junta duas palavras.', 'Aos 18 meses não usa palavras com intenção ou não aponta para pedir ou mostrar.'],
          ['Social e afetiva', 'Sorri, busca o olhar, partilha atenção, imita gestos.', 'Não responde ao nome, evita o contacto ou perde habilidades que já tinha.'],
          ['Cognitiva e brincadeira', 'Explora, procura objetos escondidos, brinca de faz de conta, resolve pequenos desafios.', 'Sem brincadeira de faz de conta por volta dos 2 anos, ou interesse muito limitado em explorar.'],
        ], caption: 'Exemplos orientativos; as faixas variam entre fontes e entre crianças.' },
        { kind: 'callout', tone: 'care', title: 'Um sinal para não esperar', text: 'Perder habilidades já conquistadas (deixar de falar, olhar ou brincar como antes) merece uma consulta breve, sem alarme.' },
      ] },
      { id: 'glosario-nd', title: 'Palavras que ajudam', blocks: [
        { kind: 'glossary', items: [
          { term: 'Vigilância do desenvolvimento', plain: 'Observar com carinho e de forma contínua como cresce e aprende, em cada consulta de saúde.' },
          { term: 'Intervenção precoce', plain: 'Conjunto de apoios nos primeiros anos que potenciam o desenvolvimento e o vínculo.' },
          { term: 'Trajetória', plain: 'A direção dos avanços no tempo; importa mais do que um dado isolado.' },
          { term: 'Estimulação', plain: 'Oferecer experiências do dia a dia e brincadeira que convidam a explorar, sem pressão.' },
        ] },
        { kind: 'resource', file: '/kit/nd/pt/hitos-por-edad.pdf', label: 'Marcos por idade', description: 'Tabela imprimível por áreas e idades para o teu diário, com espaço para notas.' },
      ] },
    ],
  },
  {
    id: 'B', slug: 'brincadeira-e-estimulacao', icon: 'blocks',
    title: 'Brincadeira e estimulação', area: 'Aprender brincando no dia a dia',
    summary: 'A brincadeira é o motor: ideias simples, sem sobre-estimular.',
    sections: [
      { id: 'juego-motor', title: 'A brincadeira, a melhor mestra', blocks: [
        { kind: 'lead', text: 'Não são precisos brinquedos caros nem ecrãs. O vínculo, a voz e os objetos de casa bastam para aprender.' },
        { kind: 'list', variant: 'check', items: [
          'Segue o interesse da criança: se olha para algo, nomeia-o e brinca com isso.',
          'Menos é mais: poucos objetos, turnos curtos e muitas repetições.',
          'Nomeia o que ambos fazem: "sobes a torre", "cai", "outra vez".',
          'Espera e observa: deixa pausas para que responda ao seu ritmo.',
        ] },
      ] },
      { id: 'ideas-edad', title: 'Ideias por etapa', blocks: [
        { kind: 'table', columns: ['Etapa', 'Brincadeira simples', 'O que fortalece'], rows: [
          ['0–12 meses', 'Cucu, canções com gestos, olhar-se ao espelho.', 'Atenção partilhada, vínculo, antecipação.'],
          ['1–2 anos', 'Pôr e tirar objetos, torres, apontar em livros.', 'Motricidade, primeiras palavras, causa-efeito.'],
          ['2–3 anos', 'Faz de conta (dar de comer ao boneco), encaixes.', 'Linguagem, imaginação, resolução de problemas.'],
          ['3–5 anos', 'Papéis (loja, médico), classificar por cor ou tamanho.', 'Habilidades sociais, funções executivas.'],
        ] },
        { kind: 'callout', tone: 'tip', title: 'Rotinas que ensinam', text: 'O banho, a comida e vestir-se são ouro: narra os passos e oferece pequenas escolhas ("a vermelha ou a azul?").' },
      ] },
      { id: 'sin-sobreestimular', title: 'Estimular sem saturar', blocks: [
        { kind: 'steps', items: [
          'Observa sinais de cansaço: vira a cara, inquieta-se, esfrega os olhos.',
          'Abranda o ritmo: menos estímulos, voz suave, uma só brincadeira.',
          'Oferece calma antes de dormir: luz baixa, sem ecrãs, rotina previsível.',
        ] },
        { kind: 'resource', file: '/kit/nd/pt/ideas-de-juego.pdf', label: 'Ideias de brincadeira por idade', description: 'Fichas breves com propostas caseiras e de baixo custo.' },
      ] },
    ],
  },
  {
    id: 'C', slug: 'parentalidade-respeitosa-e-vinculo', icon: 'hearthands',
    title: 'Parentalidade respeitosa e vínculo', area: 'O lado afetivo do desenvolvimento',
    summary: 'Um vínculo seguro é a base sobre a qual tudo se constrói.',
    sections: [
      { id: 'apego', title: 'Um vínculo que dá segurança', blocks: [
        { kind: 'lead', text: 'Quando uma criança sente que há alguém disponível e previsível, atreve-se a explorar. O afeto não "mima em excesso": sustenta.' },
        { kind: 'p', text: 'Responder ao choro, nomear o que sente e voltar à calma juntos são a forma como aprende, aos poucos, a regular-se por dentro.' },
      ] },
      { id: 'regular-calma', title: 'Acompanhar a birra com calma', blocks: [
        { kind: 'steps', items: [
          'Primeiro a tua calma: respira; a tua tranquilidade é contagiosa.',
          'Põe em palavras: "estás muito zangado porque a brincadeira acabou".',
          'Oferece proximidade, não um sermão: às vezes basta estar ao lado.',
          'Quando passar a onda, repara e volta à rotina, sem castigos nem rótulos.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Não é contra ti', text: 'A birra costuma ser um cérebro pequeno sobrecarregado, não manipulação. Amadurecer a autorregulação leva anos.' },
      ] },
      { id: 'sin-comparar', title: 'Cuidar o olhar', blocks: [
        { kind: 'list', items: [
          'Evita comparar com irmãos ou outras crianças: cada um tem o seu calendário.',
          'Celebra o esforço, não só a conquista: "tentaste muitas vezes".',
          'Cuida também de ti: um cuidador descansado acompanha melhor.',
        ] },
        { kind: 'resource', file: '/kit/nd/pt/rutinas-visuales.pdf', label: 'Rotinas visuais para casa', description: 'Cartões de apoio para antecipar o dia e reduzir conflitos.' },
      ] },
    ],
  },
  {
    id: 'D', slug: 'entrada-na-escola', icon: 'graduation',
    title: 'Entrada no mundo escolar', area: 'Creche, pré-escola e primeiras adaptações',
    summary: 'Escolher um ambiente amável e construir aliança com a escola.',
    sections: [
      { id: 'elegir-entorno', title: 'O que observar ao escolher', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Trato caloroso e respeitoso com as crianças e as famílias.',
          'Grupos não sobrelotados e adultos suficientes para acompanhar.',
          'Abertura a adaptações e à comunicação frequente.',
          'Rotinas previsíveis e espaços que não sobre-estimulem.',
        ] },
      ] },
      { id: 'alianza-escuela', title: 'Aliança escola–família', blocks: [
        { kind: 'steps', items: [
          'Partilha o que funciona em casa: interesses, calmantes, sinais de cansaço.',
          'Combinem um canal simples de comunicação (caderno, mensagens curtas).',
          'Marquem uma reunião de acompanhamento nas primeiras semanas.',
        ] },
        { kind: 'resource', file: '/kit/nd/pt/carta-inicio-escolar.pdf', label: 'Carta de início escolar', description: 'Modelo para apresentar o teu filho ou filha e os apoios que ajudam.' },
      ] },
      { id: 'adaptaciones-tempranas', title: 'Adaptações simples', blocks: [
        { kind: 'list', items: [
          'Antecipar mudanças com imagens ou avisos curtos.',
          'Um cantinho de calma para se autorregular.',
          'Instruções breves e uma coisa de cada vez.',
          'Período de adaptação flexível no início.',
        ] },
      ] },
    ],
  },
  {
    id: 'E', slug: 'direitos-e-primeiros-apoios', icon: 'scale',
    title: 'Direitos e primeiros apoios', area: 'Rotas de intervenção precoce e direitos',
    summary: 'A que tens direito e como iniciar os apoios.',
    sections: [
      { id: 'derechos-nd', title: 'Tens direito a…', blocks: [
        { kind: 'list', variant: 'check', items: [
          'Vigilância do desenvolvimento em cada consulta de saúde.',
          'Informação clara, sem jargão, e a uma segunda opinião.',
          'Serviços de intervenção precoce quando necessários.',
          'Inclusão educativa desde os primeiros anos.',
        ] },
        { kind: 'callout', tone: 'calm', title: 'Sem culpas', text: 'Procurar apoio cedo é um ato de cuidado, não um sinal de fracasso. Quanto antes, mais simples costuma ser acompanhar.' },
      ] },
      { id: 'rutas', title: 'Como começar', blocks: [
        { kind: 'steps', items: [
          'Anota as tuas observações e dúvidas antes da consulta (usa o diário).',
          'Fala com a pediatria ou o centro de saúde sobre a vigilância do desenvolvimento.',
          'Pede, se for o caso, uma avaliação de intervenção precoce.',
          'Reúne o diretório de apoios da tua zona e guarda cada relatório.',
        ] },
        { kind: 'glossary', items: [
          { term: 'Intervenção precoce', plain: 'Programa de apoios nos primeiros anos, idealmente em ambientes naturais (casa, escola).' },
          { term: 'Relatório', plain: 'Documento que resume observações e recomendações; guarda-o, serve para trâmites.' },
          { term: 'Inclusão', plain: 'Que o ambiente se adapte à criança, e não o contrário.' },
        ] },
        { kind: 'resource', file: '/kit/nd/pt/directorio-apoyos.pdf', label: 'Diretório de primeiros apoios', description: 'Modelo para organizar contactos, consultas e relatórios num só lugar.' },
      ] },
    ],
  },
];
