import type { ToolkitModule } from './types';

/** 工具 — 神经发育板块（中文）。面向陪伴孩子早期发展的家庭，提供一般性、温暖且
 *  非诊断的引导。 */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A', slug: 'fayu-lichengbei', icon: 'sprout',
    title: '发育里程碑', area: '早期发育的观察',
    summary: '按年龄看什么，从容而不比较。',
    sections: [
      { id: 'que-son', title: '里程碑是什么（不是什么）', blocks: [
        { kind: 'lead', text: '里程碑是孩子如何活动、沟通、玩耍和建立关系的大致信号。它是陪伴的指南，不是竞赛，也不是考试。' },
        { kind: 'p', text: '每个孩子都有自己的节奏。年龄区间是平均值：早一点或晚一点通常都在预期之内。重要的是随时间的发展轨迹，而非某一天。' },
        { kind: 'callout', tone: 'calm', title: '是指南针，不是尺子', text: '若有让你担心的地方，你的观察很重要。及早咨询不会给谁"贴标签"，反而打开通向让生活更轻松的支持之门。' },
      ] },
      { id: 'por-edad', title: '按领域观察什么', blocks: [
        { kind: 'p', text: '四个领域一起成长。下表给出常见表现的例子，以及何时适合与信任的专业人员交流。' },
        { kind: 'table', columns: ['领域', '常见表现', '出现以下情况建议咨询'], rows: [
          ['运动', '抬头、坐、爬、走、操作物品。', '12个月时仍无任何方式移动，或身体很僵硬或很松软。'],
          ['沟通', '咿呀、指认、最初的词、组合两个词。', '18个月时没有带意图的词，或没有为请求或分享而指认。'],
          ['社交与情感', '微笑、寻找目光、共享注意、模仿动作。', '不回应名字、回避接触，或失去已具备的能力。'],
          ['认知与游戏', '探索、寻找藏起的物品、假装游戏、解决小挑战。', '约2岁时没有假装游戏，或对探索兴趣很有限。'],
        ], caption: '仅为参考示例；区间因来源与孩子而异。' },
        { kind: 'callout', tone: 'care', title: '不宜等待的信号', text: '失去已获得的能力（不再说话、注视或像以前那样玩）值得尽快就诊，不必惊慌。' },
      ] },
      { id: 'glosario-nd', title: '有帮助的词', blocks: [
        { kind: 'glossary', items: [
          { term: '发育监测', plain: '在每次健康检查中，带着关爱、持续地观察孩子如何成长与学习。' },
          { term: '早期干预', plain: '最初几年的一系列支持，促进发展与亲子联结。' },
          { term: '发展轨迹', plain: '进步随时间的方向；比孤立的一个数据更重要。' },
          { term: '刺激（游戏）', plain: '提供日常体验与游戏，邀请探索，不施加压力。' },
        ] },
        { kind: 'resource', file: '/kit/nd/zh/hitos-por-edad.pdf', label: '按年龄的里程碑', description: '按领域和年龄的可打印表格，含记录用的备注栏。' },
      ] },
    ],
  },
  {
    id: 'B', slug: 'youxi-yu-ciji', icon: 'blocks',
    title: '游戏与刺激', area: '在日常中边玩边学',
    summary: '游戏是引擎：简单的点子，不过度刺激。',
    sections: [
      { id: 'juego-motor', title: '游戏是最好的老师', blocks: [
        { kind: 'lead', text: '不需要昂贵的玩具或屏幕。联结、声音和家里的物品就足以学习。' },
        { kind: 'list', variant: 'check', items: [
          '跟随孩子的兴趣：他看什么，就说出它的名字并一起玩。',
          '少即是多：物品少、回合短、多重复。',
          '说出你们一起做的事："你搭高塔"、"倒了"、"再来"。',
          '等待并观察：留出停顿，让他按自己的节奏回应。',
        ] },
      ] },
      { id: 'ideas-edad', title: '各阶段的点子', blocks: [
        { kind: 'table', columns: ['阶段', '简单游戏', '培养什么'], rows: [
          ['0–12个月', '躲猫猫、带动作的歌、照镜子。', '共享注意、联结、期待。'],
          ['1–2岁', '把物品放进拿出、搭塔、在绘本里指认。', '运动、最初的词、因果。'],
          ['2–3岁', '假装游戏（喂娃娃）、拼插玩具。', '语言、想象、解决问题。'],
          ['3–5岁', '角色扮演（商店、医生）、按颜色或大小分类。', '社交能力、执行功能。'],
        ] },
        { kind: 'callout', tone: 'tip', title: '会教人的日常', text: '洗澡、吃饭和穿衣都是宝贵时机：讲出步骤，提供小选择（"红的还是蓝的？"）。' },
      ] },
      { id: 'sin-sobreestimular', title: '刺激但不过载', blocks: [
        { kind: 'steps', items: [
          '留意疲倦信号：把脸转开、烦躁、揉眼睛。',
          '放慢节奏：减少刺激、放柔声音、只玩一个游戏。',
          '睡前给予平静：调暗灯光、不用屏幕、可预期的作息。',
        ] },
        { kind: 'resource', file: '/kit/nd/zh/ideas-de-juego.pdf', label: '按年龄的游戏点子', description: '简短卡片，含居家、低成本的建议。' },
      ] },
    ],
  },
  {
    id: 'C', slug: 'zunzhong-yanger-yu-lianjie', icon: 'hearthands',
    title: '尊重式养育与联结', area: '发展的情感面',
    summary: '安全的联结，是一切的根基。',
    sections: [
      { id: 'apego', title: '带来安全感的联结', blocks: [
        { kind: 'lead', text: '当孩子感到有人可依靠且可预期，就会敢于探索。爱不会"惯坏"孩子：它托住孩子。' },
        { kind: 'p', text: '回应他的哭、说出他的感受、一起回到平静——他就是这样，一点一点学会从内在自我调节。' },
      ] },
      { id: 'regular-calma', title: '以平静陪伴发脾气', blocks: [
        { kind: 'steps', items: [
          '先让自己平静：深呼吸；你的从容会传递。',
          '把感受说出来："游戏结束了，你很生气"。',
          '给予靠近，而非说教：有时在身边就够了。',
          '风浪过后，修复关系并回到日常，不惩罚、不贴标签。',
        ] },
        { kind: 'callout', tone: 'calm', title: '这不是针对你', text: '发脾气通常是小小的大脑被淹没，而非操纵。自我调节的成熟需要数年。' },
      ] },
      { id: 'sin-comparar', title: '呵护你的目光', blocks: [
        { kind: 'list', items: [
          '不要与兄弟姐妹或别的孩子比较：每个人都有自己的时间表。',
          '赞美努力，而非只看结果："你试了很多次"。',
          '也照顾好自己：得到休息的照护者，陪伴得更好。',
        ] },
        { kind: 'resource', file: '/kit/nd/zh/rutinas-visuales.pdf', label: '居家视觉作息', description: '用于预告一天、减少冲突的支持卡片。' },
      ] },
    ],
  },
  {
    id: 'D', slug: 'jinru-xuexiao', icon: 'graduation',
    title: '走进校园', area: '托育、幼儿园与最初的调整',
    summary: '选择友善的环境，并与学校建立同盟。',
    sections: [
      { id: 'elegir-entorno', title: '选择时看什么', blocks: [
        { kind: 'list', variant: 'check', items: [
          '对孩子和家庭温暖而尊重的态度。',
          '不过度拥挤的班级，以及足够陪伴的成人。',
          '对调整和频繁沟通持开放态度。',
          '可预期的作息，以及不过度刺激的空间。',
        ] },
      ] },
      { id: 'alianza-escuela', title: '家校同盟', blocks: [
        { kind: 'steps', items: [
          '分享家中有效的做法：兴趣、能安抚的方式、疲倦信号。',
          '约定一个简单的沟通渠道（联系本、简短消息）。',
          '几周后安排一次跟进会谈。',
        ] },
        { kind: 'resource', file: '/kit/nd/zh/carta-inicio-escolar.pdf', label: '入学介绍信', description: '介绍你的孩子以及对他有帮助的支持的模板。' },
      ] },
      { id: 'adaptaciones-tempranas', title: '简单的调整', blocks: [
        { kind: 'list', items: [
          '用图片或简短预告来预知变化。',
          '一个用于自我调节的安静角落。',
          '简短的指令，一次一件事。',
          '开始时给予灵活的适应期。',
        ] },
      ] },
    ],
  },
  {
    id: 'E', slug: 'quanli-yu-zuichu-zhichi', icon: 'scale',
    title: '权利与最初的支持', area: '早期干预路径与权利',
    summary: '你享有什么，以及如何开始支持。',
    sections: [
      { id: 'derechos-nd', title: '你有权获得……', blocks: [
        { kind: 'list', variant: 'check', items: [
          '每次健康检查中的发育监测。',
          '清晰、无术语的信息，以及第二意见。',
          '需要时的早期干预服务。',
          '从最初几年起的教育融合。',
        ] },
        { kind: 'callout', tone: 'calm', title: '无需自责', text: '及早寻求支持是关爱之举，不是失败的标志。越早，陪伴通常越简单。' },
      ] },
      { id: 'rutas', title: '如何开始', blocks: [
        { kind: 'steps', items: [
          '就诊前写下你的观察与疑问（使用记录本）。',
          '就发育监测与儿科或社区卫生中心交流。',
          '如适宜，申请一次早期干预评估。',
          '整理你所在地区的支持名录，并保存每份报告。',
        ] },
        { kind: 'glossary', items: [
          { term: '早期干预', plain: '最初几年的支持计划，最好在自然环境（家、学校）中进行。' },
          { term: '报告', plain: '汇总观察与建议的文件；请保存，办理手续时有用。' },
          { term: '融合', plain: '让环境去适应孩子，而不是相反。' },
        ] },
        { kind: 'resource', file: '/kit/nd/zh/directorio-apoyos.pdf', label: '最初支持名录', description: '把联系人、预约与报告整理在一处的模板。' },
      ] },
    ],
  },
];
