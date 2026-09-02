import type { ToolkitModule } from './types';

/** 工具 — 神经系统疾病板块（中文）。依据：WHO ICD-11 第08章与 IGAP。一般性、支持性
 *  的引导；不能替代你的医疗团队或急救服务。 */
export const MODULES: ToolkitModule[] = [
  {
    id: 'A', slug: 'lijie-jibing', icon: 'stethoscope',
    title: '了解这一疾病', area: '清晰的信息与充分利用的就诊',
    summary: '没有恐惧的词语，以及理清路径的问题。',
    sections: [
      { id: 'glosario-af', title: '没有恐惧的术语', blocks: [
        { kind: 'lead', text: '有些术语听起来很沉重。这里我们平和地讲述：它们描述的是过程与支持，并不定义你或你的家人是谁。' },
        { kind: 'glossary', items: [
          { term: '神经系统疾病', plain: '神经系统（脑、脊髓或神经）的一种状况。许多都能得到陪伴，通过支持提升生活质量。' },
          { term: '神经科（神经病学）', plain: '研究并诊治这些疾病的医学专科。' },
          { term: '康复', plain: '通过治疗恢复或代偿功能、获得自主。' },
          { term: '慢性', plain: '长期相伴；加以管理、照护并与之共处。' },
          { term: '姑息照护', plain: '以舒适与缓解不适为中心的支持；在任何阶段都能增添生活质量。' },
          { term: '依从性', plain: '持续遵循约定的方案（用药、治疗、复诊）。' },
        ] },
      ] },
      { id: 'consulta', title: '充分利用就诊', blocks: [
        { kind: 'p', text: '与医疗团队相处的时间很宝贵。带上写好的问题，有助于不遗漏重要内容。' },
        { kind: 'list', variant: 'check', items: [
          '这一疾病叫什么，在日常生活中意味着什么？',
          '我应留意哪些迹象，哪些属于紧急？',
          '每种药物有什么用，会有哪些作用？',
          '哪些治疗有帮助，多久一次？',
          '遇到疑问或发作时，我该打给谁？',
        ] },
        { kind: 'callout', tone: 'tip', title: '带一个人同去', text: '四只耳朵比两只听得清。请求书面小结，别犹豫问："能换个说法解释吗？"' },
      ] },
      { id: 'organizar', title: '整理信息', blocks: [
        { kind: 'p', text: '一个单一的文件夹——纸质或电子——汇总报告、检查、用药与联系人，可避免反复讲述病史，并加快每次就诊。' },
        { kind: 'resource', file: '/kit/af/zh/carpeta-de-salud.pdf', label: '健康档案夹', description: '用于汇总诊断、检查、用药与关键联系人的模板。' },
      ] },
    ],
  },
  {
    id: 'B', slug: 'kangfu-yu-zhiliao', icon: 'activity',
    title: '康复与治疗', area: '恢复与代偿功能',
    summary: '温和的坚持、现实的目标，以及在家练习。',
    sections: [
      { id: 'tipos', title: '康复的类型', blocks: [
        { kind: 'table', columns: ['治疗', '帮助什么'], rows: [
          ['物理治疗／神经康复', '力量、平衡、步态与活动能力。'],
          ['作业治疗', '日常生活活动与自主。'],
          ['言语治疗', '沟通、发声与吞咽。'],
          ['神经心理', '记忆、注意与执行功能。'],
          ['认知康复', '更好地思考与组织的策略。'],
        ] },
      ] },
      { id: 'constancia', title: '目标与坚持', blocks: [
        { kind: 'steps', items: [
          '与团队约定小而可衡量的目标（"在扶助下走10米"）。',
          '把练习分成短而频繁的小段，胜过令人疲惫的长时段。',
          '记录进步与平台期：平台期是过程的一部分，不是失败。',
          '为每一次达成而庆祝，并与团队调整目标。',
        ] },
        { kind: 'callout', tone: 'calm', title: '自己的节奏', text: '康复并非直线。好日子与更难的日子并存；温和的坚持胜过苛求。' },
      ] },
      { id: 'en-casa', title: '在家练习', blocks: [
        { kind: 'list', items: [
          '按团队指示做练习，不额外自行发挥。',
          '把练习融入真实日常：穿衣、做饭、走到院子。',
          '注意安全：空间通畅、鞋子稳固。',
        ] },
        { kind: 'resource', file: '/kit/af/zh/registro-de-terapias.pdf', label: '治疗记录', description: '每周记录练习、进步以及给下次的疑问。' },
      ] },
    ],
  },
  {
    id: 'C', slug: 'jujia-riChang-zhaohu', icon: 'hearthands',
    title: '居家日常照护', area: '每日的安适与安全',
    summary: '安全用药、活动、饮食与休息。',
    sections: [
      { id: 'medicacion', title: '安全用药', blocks: [
        { kind: 'list', variant: 'check', items: [
          '遵守时间与剂量；用闹钟或每周药盒。',
          '未经咨询不要停药或改量：有些药物需要逐步调整。',
          '记录你注意到的作用，下次就诊时告知。',
          '随手保存一份最新的用药清单。',
        ] },
        { kind: 'callout', tone: 'care', title: '更改须与团队商量', text: '突然停用某些药物——例如部分抗癫痫药——可能有风险。任何更改都要与你的医生商量。' },
      ] },
      { id: 'movilidad', title: '活动与防跌倒', blocks: [
        { kind: 'list', items: [
          '移走松动的地毯与电线；增加良好照明。',
          '需要时在浴室和走廊安装扶手。',
          '大方使用指定的辅具（拐杖、助行器）：它们带来自由。',
          '若长时间卧床或坐着，要经常变换姿势。',
        ] },
      ] },
      { id: 'alimentacion-descanso', title: '饮食、皮肤与休息', blocks: [
        { kind: 'p', text: '若有吞咽困难（吞咽障碍），请遵循关于食物质地与进食姿势的指导，若经常呛咳或误吸请就诊。' },
        { kind: 'list', items: [
          '注意补水，并按指导调整饮食。',
          '检查受压部位的皮肤，预防压疮。',
          '保护睡眠：作息稳定、环境安静。',
        ] },
        { kind: 'resource', file: '/kit/af/zh/plan-de-cuidados.pdf', label: '每日照护计划', description: '用药、活动、饮食与休息的清单。' },
      ] },
    ],
  },
  {
    id: 'D', slug: 'jingjie-xinhao-yu-jinji', icon: 'pulse',
    title: '警示信号与紧急情况', area: '在紧急时刻从容行动',
    summary: '留意什么、如何应对，以及何时寻求紧急帮助。',
    sections: [
      { id: 'cuando-urge', title: '何时寻求紧急帮助', blocks: [
        { kind: 'callout', tone: 'care', title: '拿不准就拨打急救', text: '本指南为一般性内容，不能替代团队给你的方案或你所在国家的急救服务。若有生命危险，请立即拨打当地急救电话。' },
        { kind: 'list', items: [
          '面部、手臂或腿部突然无力，说话或视物困难（可能是中风）：迅速行动，分秒必争。',
          '发作（抽搐）持续超过5分钟，或反复发作而未恢复意识。',
          '突发、极其剧烈、与平时不同的头痛。',
          '高热伴颈部僵硬或意识模糊。',
          '呼吸困难、窒息或意识丧失。',
        ] },
      ] },
      { id: 'crisis', title: '发作（抽搐）时的急救', blocks: [
        { kind: 'steps', items: [
          '保持冷静并保护：移开可能撞伤的物品。',
          '在头下垫软物，松开颈部过紧的衣物。',
          '不要用力按住，也不要往嘴里放任何东西。',
          '让其侧卧（复原体位）以帮助呼吸。',
          '为发作计时：超过5分钟或反复发作，请拨打急救。',
          '陪伴到恢复，并遵循其医生的方案。',
        ] },
        { kind: 'callout', tone: 'calm', title: '发作之后', text: '之后出现困倦或意识模糊是正常的。用柔和的声音给予安心，并记录经过以供医疗团队参考。' },
      ] },
      { id: 'kit-emergencia', title: '提前做好准备', blocks: [
        { kind: 'list', variant: 'check', items: [
          '由团队书写的行动计划（做什么、打给谁）。',
          '用药与过敏清单，醒目且保持更新。',
          '急救联系人与神经科医生的联系方式随手可得。',
          '如有建议，携带医疗身份证件或手环。',
        ] },
        { kind: 'resource', file: '/kit/af/zh/plan-de-emergencia.pdf', label: '应急计划', description: '与团队一起填写的表格：信号、步骤与关键联系人。' },
      ] },
    ],
  },
  {
    id: 'E', slug: 'quanli-shouxu-yu-zhichi', icon: 'scale',
    title: '权利、手续与支持', area: '残障、支持与照顾照护者',
    summary: '你享有什么，以及如何长期支撑照护。',
    sections: [
      { id: 'derechos-af', title: '你有权获得……', blocks: [
        { kind: 'list', variant: 'check', items: [
          '有尊严、连续且信息清晰的医疗照护。',
          '你所需要的康复与支持。',
          '工作与学校中的无障碍与合理便利。',
          '不因你的疾病而受歧视的对待。',
        ] },
        { kind: 'callout', tone: 'calm', title: '寻求支持是一种权利', text: '残障支持不是恩惠：它们的存在是为了让机会更平等。请大方了解你所在国家的相关制度。' },
      ] },
      { id: 'tramites', title: '常见手续', blocks: [
        { kind: 'steps', items: [
          '在你的健康档案夹中汇集最新的诊断报告。',
          '了解你所在国家的残障认定或证件及其福利。',
          '询问交通、用药、治疗或经济方面的支持。',
          '保存每项手续的副本及其更新日期。',
        ] },
      ] },
      { id: 'cuidar-cuidador', title: '照顾照护者', blocks: [
        { kind: 'lead', text: '照护者的安适支撑着其余的一切。照顾自己不是自私：它是照护的一部分。' },
        { kind: 'list', items: [
          '分担任务并接受帮助：没有人能一直包办一切。',
          '留出休息与喘息的时刻，哪怕短暂。',
          '寻找同伴支持团体（在 Neuromundi 有 Neurocamps）。',
          '若持续出现疲惫、悲伤或焦虑，请寻求专业帮助。',
        ] },
        { kind: 'resource', file: '/kit/af/zh/red-de-apoyo.pdf', label: '支持网络图', description: '用于安排谁帮什么以及照护轮替的模板。' },
      ] },
    ],
  },
];
