import type { ToolkitModule } from './types';

/** 도구 — 신경계 질환 섹션(한국어). 근거: WHO ICD-11 제08장과 IGAP. 일반적이고
 *  지지적인 안내이며, 의료진이나 응급 서비스를 대신하지 않습니다. */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A', slug: 'jilhwan-ihaehagi', icon: 'stethoscope',
    title: '질환 이해하기', area: '명확한 정보와 잘 활용한 진료',
    summary: '두려움 없는 말과, 길을 정리해 주는 질문.',
    sections: [
      { id: 'glosario-af', title: '두려움 없는 용어집', blocks: [
        { kind: 'lead', text: '어떤 용어는 크게 들립니다. 여기서는 차분히 전합니다: 이 말들은 과정과 지원을 설명할 뿐, 당신이나 가족이 누구인지 정의하지 않습니다.' },
        { kind: 'glossary', items: [
          { term: '신경계 질환', plain: '신경계(뇌·척수·신경)의 상태. 많은 경우 함께할 수 있고, 지원으로 삶의 질이 좋아집니다.' },
          { term: '신경과(신경학)', plain: '이러한 상태를 연구하고 치료하는 의학 전문 분야.' },
          { term: '재활', plain: '기능을 되찾거나 보완하고 자립을 높이는 치료.' },
          { term: '만성', plain: '오래 함께하는 것; 관리하고 돌보며 더불어 살아갑니다.' },
          { term: '완화 돌봄', plain: '안녕과 불편 완화에 중점을 둔 지원. 어느 단계에서도 삶의 질을 더합니다.' },
          { term: '순응(복약 이행)', plain: '합의한 계획(약·치료·정기 진료)을 꾸준히 따르기.' },
        ] },
      ] },
      { id: 'consulta', title: '진료를 잘 활용하기', blocks: [
        { kind: 'p', text: '의료진과의 시간은 소중합니다. 질문을 적어 가면 중요한 것을 잊지 않게 됩니다.' },
        { kind: 'list', variant: 'check', items: [
          '이 질환의 이름은 무엇이며 일상에서 무엇을 뜻하나요?',
          '어떤 신호를 지켜봐야 하고, 어떤 것이 응급인가요?',
          '각 약은 무엇을 위한 것이고 어떤 작용이 예상되나요?',
          '어떤 치료가 도움이 되고, 얼마나 자주 하나요?',
          '의문이나 발작이 있을 때 누구에게 연락하나요?',
        ] },
        { kind: 'callout', tone: 'tip', title: '누군가와 함께 가기', text: '두 귀보다 네 귀가 낫습니다. 서면 요약을 요청하고 "다른 말로 설명해 주실 수 있나요?"라고 주저 말고 물으세요.' },
      ] },
      { id: 'organizar', title: '정보 정리하기', blocks: [
        { kind: 'p', text: '보고서·검사·약·연락처를 모은 하나의 폴더(종이든 디지털이든)가 있으면 병력을 반복하지 않아도 되고 매 진료가 빨라집니다.' },
        { kind: 'resource', file: '/kit/af/ko/carpeta-de-salud.pdf', label: '건강 폴더', description: '진단·검사·약·주요 연락처를 모으는 서식.' },
      ] },
    ],
  },
  {
    id: 'B', slug: 'jaehwal-gwa-chiryo', icon: 'activity',
    title: '재활과 치료', area: '기능을 되찾고 보완하기',
    summary: '부드러운 꾸준함, 현실적인 목표, 집에서의 연습.',
    sections: [
      { id: 'tipos', title: '재활의 종류', blocks: [
        { kind: 'table', columns: ['치료', '도움 주는 것'], rows: [
          ['물리치료 / 신경재활', '근력·균형·보행·이동.'],
          ['작업치료', '일상생활 활동과 자립.'],
          ['언어치료', '의사소통·발성·삼킴.'],
          ['신경심리', '기억·주의·실행 기능.'],
          ['인지재활', '더 잘 생각하고 정리하는 전략.'],
        ] },
      ] },
      { id: 'constancia', title: '목표와 꾸준함', blocks: [
        { kind: 'steps', items: [
          '팀과 작고 측정 가능한 목표를 정하기("도움받아 10미터 걷기").',
          '지치는 긴 시간보다 짧고 잦은 연습으로 나누기.',
          '진전과 정체기를 기록: 정체기는 과정의 일부이지 실패가 아닙니다.',
          '이룬 것을 하나하나 축하하고 팀과 목표를 조정하기.',
        ] },
        { kind: 'callout', tone: 'calm', title: '자신의 속도', text: '회복은 직선이 아닙니다. 좋은 날과 힘든 날이 함께합니다; 부드러운 꾸준함이 다그침보다 더 이룹니다.' },
      ] },
      { id: 'en-casa', title: '집에서 연습하기', blocks: [
        { kind: 'list', items: [
          '팀이 지시한 운동을 임의로 더 하지 않고 하기.',
          '옷 입기·요리·마당까지 걷기 등 실제 일과에 연습을 녹이기.',
          '안전에 유의: 공간을 비우고 신발은 안정적으로.',
        ] },
        { kind: 'resource', file: '/kit/af/ko/registro-de-terapias.pdf', label: '치료 기록', description: '운동·진전·다음 시간을 위한 질문을 적는 주간 기록.' },
      ] },
    ],
  },
  {
    id: 'C', slug: 'gajeong-ilsang-dolbom', icon: 'hearthands',
    title: '가정에서의 일상 돌봄', area: '매일의 안녕과 안전',
    summary: '안전한 복약, 이동, 식사, 휴식.',
    sections: [
      { id: 'medicacion', title: '안전한 복약', blocks: [
        { kind: 'list', variant: 'check', items: [
          '시간과 용량을 지키기: 알람이나 주간 약통을 쓰기.',
          '상담 없이 중단·변경하지 않기: 일부 약은 점진적 조정이 필요합니다.',
          '느낀 작용을 적어 다음 진료 때 말하기.',
          '최신 복약 목록을 늘 가까이 두기.',
        ] },
        { kind: 'callout', tone: 'care', title: '변경은 팀과 함께', text: '어떤 약(예: 일부 항뇌전증약)을 갑자기 끊으면 위험할 수 있습니다. 어떤 변경이든 의사와 상의하세요.' },
      ] },
      { id: 'movilidad', title: '이동과 낙상 예방', blocks: [
        { kind: 'list', items: [
          '미끄러지는 깔개와 전선을 치우고 조명을 밝게.',
          '필요하면 욕실과 복도에 손잡이를.',
          '지정된 보조기구(지팡이·보행기)를 부끄러워 말고 쓰기: 자유를 줍니다.',
          '침대나 의자에 오래 있으면 자주 자세를 바꾸기.',
        ] },
      ] },
      { id: 'alimentacion-descanso', title: '식사·피부·휴식', blocks: [
        { kind: 'p', text: '삼키기 어려움(연하장애)이 있으면 음식 질감과 식사 자세 지침을 따르고, 잦은 기침이나 사레가 있으면 상담하세요.' },
        { kind: 'list', items: [
          '수분과, 지침에 맞춘 식사에 신경 쓰기.',
          '욕창 예방을 위해 압박 부위 피부를 확인하기.',
          '수면을 지키기: 규칙적인 시간과 조용한 환경.',
        ] },
        { kind: 'resource', file: '/kit/af/ko/plan-de-cuidados.pdf', label: '일일 돌봄 계획', description: '복약·이동·식사·휴식 체크리스트.' },
      ] },
    ],
  },
  {
    id: 'D', slug: 'gyeonggo-sinho-wa-eunggeup', icon: 'pulse',
    title: '경고 신호와 응급', area: '급할 때도 차분히 행동하기',
    summary: '무엇을 지켜보고, 어떻게 대응하며, 언제 긴급 도움을 청할지.',
    sections: [
      { id: 'cuando-urge', title: '긴급 도움을 청할 때', blocks: [
        { kind: 'callout', tone: 'care', title: '의심되면 응급에 전화', text: '이 안내는 일반적이며 팀이 준 계획이나 자국의 응급 서비스를 대신하지 않습니다. 생명 위험이 있으면 즉시 지역 응급번호로 전화하세요.' },
        { kind: 'list', items: [
          '얼굴·팔·다리의 갑작스러운 힘 빠짐, 말이나 시야의 어려움(뇌졸중 가능): 빨리 행동, 1분이 중요합니다.',
          '5분 넘게 지속되거나 의식이 돌아오지 않고 반복되는 발작.',
          '평소와 다른, 갑작스럽고 매우 심한 두통.',
          '고열에 목 경직이나 혼란이 동반.',
          '호흡 곤란, 질식 또는 의식 상실.',
        ] },
      ] },
      { id: 'crisis', title: '발작(경련) 시 응급처치', blocks: [
        { kind: 'steps', items: [
          '침착하게 보호: 부딪힐 만한 물건을 치우기.',
          '머리 밑에 부드러운 것을 두고 목을 조이는 것을 풀기.',
          '억지로 붙잡지 말고 입에 아무것도 넣지 않기.',
          '옆으로 눕히기(회복 자세)로 호흡을 돕기.',
          '발작 시간을 재기: 5분을 넘거나 반복되면 응급에 전화.',
          '회복될 때까지 곁에 있고 의사의 계획을 따르기.',
        ] },
        { kind: 'callout', tone: 'calm', title: '발작 후', text: '이후의 졸림이나 혼란은 정상입니다. 부드러운 목소리로 안심을 주고, 무슨 일이 있었는지 의료진을 위해 기록하세요.' },
      ] },
      { id: 'kit-emergencia', title: '미리 준비하기', blocks: [
        { kind: 'list', variant: 'check', items: [
          '팀이 작성한 행동 계획(무엇을 하고 누구에게 연락할지).',
          '약과 알레르기 목록을 눈에 띄고 최신으로.',
          '응급 연락처와 신경과 의사 연락처를 가까이.',
          '권고되면 의료용 신분 서류나 팔찌를.',
        ] },
        { kind: 'resource', file: '/kit/af/ko/plan-de-emergencia.pdf', label: '응급 계획', description: '팀과 함께 작성하는 양식: 신호·단계·주요 연락처.' },
      ] },
    ],
  },
  {
    id: 'E', slug: 'gwolli-jeolcha-jiwon', icon: 'scale',
    title: '권리·절차·지원', area: '장애, 지원, 돌보는 이 돌보기',
    summary: '무엇을 받을 수 있는지, 돌봄을 어떻게 오래 지탱할지.',
    sections: [
      { id: 'derechos-af', title: '당신은 다음의 권리가 있습니다', blocks: [
        { kind: 'list', variant: 'check', items: [
          '존엄하고 지속적이며 명확한 정보가 있는 의료.',
          '필요한 재활과 지원.',
          '직장과 학교에서의 접근성과 합리적 편의.',
          '질환을 이유로 차별받지 않는 대우.',
        ] },
        { kind: 'callout', tone: 'calm', title: '지원을 청하는 것은 권리', text: '장애 지원은 시혜가 아니라 기회를 고르게 하기 위한 것입니다. 자국의 제도를 부끄러움 없이 알아보세요.' },
      ] },
      { id: 'tramites', title: '자주 하는 절차', blocks: [
        { kind: 'steps', items: [
          '최신 진단서를 건강 폴더에 모으기.',
          '자국의 장애 인정·증명과 그 혜택을 확인하기.',
          '교통·약·치료·경제적 지원에 대해 문의하기.',
          '각 절차의 사본과 갱신일을 보관하기.',
        ] },
      ] },
      { id: 'cuidar-cuidador', title: '돌보는 이를 돌보기', blocks: [
        { kind: 'lead', text: '돌보는 사람의 안녕이 나머지 모두를 지탱합니다. 자신을 돌보는 것은 이기심이 아니라 돌봄의 일부입니다.' },
        { kind: 'list', items: [
          '역할을 나누고 도움을 받아들이기: 아무도 늘 모든 것을 할 수는 없습니다.',
          '짧더라도 휴식과 숨 돌릴 시간을 마련하기.',
          '동료 지지 모임을 찾기(Neuromundi에는 Neurocamps가 있습니다).',
          '피로·슬픔·불안이 지속되면 전문적 도움을 구하기.',
        ] },
        { kind: 'resource', file: '/kit/af/ko/red-de-apoyo.pdf', label: '지원 네트워크 지도', description: '누가 무엇을 돕는지와 돌봄 교대를 정리하는 서식.' },
      ] },
    ],
  },
];
