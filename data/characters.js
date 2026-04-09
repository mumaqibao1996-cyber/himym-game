// ==========================================
//  HIMYM Game — Characters Data
// ==========================================

const CHARACTERS = {
  ted: {
    id: 'ted',
    name: 'Ted Mosby',
    shortName: 'Ted',
    role: '建筑师 · 主角',
    emoji: '🧔',
    avatar: 'assets/ted.jpg',
    color: '#a08060',
    isPlayer: true,
  },
  robin: {
    id: 'robin',
    name: 'Robin Scherbatsky',
    shortName: 'Robin',
    role: '新闻主播 · Robin Sparkles',
    emoji: '🎤',
    avatar: 'assets/robin.jpg',
    color: '#e05252',
    colorVar: '--robin-color',
    initialAffinity: 50,
    description: '加拿大来的新闻主播，独立、强势，不想要孩子，也不相信爱情。',
    affinityLevels: {
      0:  '完全陌生',
      20: '刚认识',
      40: '朋友',
      60: '暧昧',
      75: '恋人',
      90: '灵魂伴侣',
    }
  },
  barney: {
    id: 'barney',
    name: 'Barney Stinson',
    shortName: 'Barney',
    role: '西装男 · Swarley',
    emoji: '🤵',
    avatar: 'assets/barney.jpg',
    color: '#2a6aad',
    colorVar: '--barney-color',
    initialAffinity: 75,
    description: '永远穿西装的"传奇"兄弟，Bro Code 的守护者，花花公子外表下藏着真情。',
    affinityLevels: {
      0:  '这人叫啥？',
      30: '认识',
      50: '兄弟',
      70: 'Bro！',
      90: 'Legendary Bro',
    }
  },
  marshall: {
    id: 'marshall',
    name: 'Marshall Eriksen',
    shortName: 'Marshall',
    role: '律师 · Big Fudge',
    emoji: '⚖️',
    avatar: 'assets/marshall.jpg',
    color: '#5db85d',
    colorVar: '--marshall-color',
    initialAffinity: 80,
    description: 'Ted 的室友兼大学好友，憨厚善良的律师，深爱 Lily，相信神秘事物。',
    affinityLevels: {
      0:  '陌生人',
      40: '室友',
      60: '好朋友',
      80: 'Slap Bet 伙伴',
      95: '兄弟情深',
    }
  },
  lily: {
    id: 'lily',
    name: 'Lily Aldrin',
    shortName: 'Lily',
    role: '幼儿园老师 · Red Head',
    emoji: '🎨',
    avatar: 'assets/lily.jpg',
    color: '#e07a30',
    colorVar: '--lily-color',
    initialAffinity: 78,
    description: 'Marshall 的女友兼未婚妻，幼儿园老师，热爱艺术，表面可爱内心极有主见。',
    affinityLevels: {
      0:  '陌生',
      40: '朋友的女友',
      60: '闺蜜级',
      80: '你的铁杆盟友',
      95: '我来给你撮合！',
    }
  },
  tracy: {
    id: 'tracy',
    name: 'Tracy McConnell',
    shortName: 'Tracy',
    role: '黄色雨伞的主人 · The Mother',
    emoji: '☂️',
    avatar: 'assets/tracy.jpg',
    color: '#f4c860',
    colorVar: '--tracy-color',
    initialAffinity: 0,
    locked: true,
    description: '那把黄色雨伞背后的她。Bass 手，糕点师，经济学毕业生——完美的答案。',
    affinityLevels: {
      0:  '尚未相遇',
      20: '偶然邂逅',
      50: '命运相连',
      80: '我的一切',
      100: '我爱你',
    }
  },
  karen: {
    id: 'karen',
    name: 'Karen',
    shortName: 'Karen',
    role: 'Ted 的大学前女友',
    emoji: '🖼️',
    avatar: 'assets/karen.jpg',
    color: '#9b6dcc',
    colorVar: '--karen-color',
    initialAffinity: 30,
    description: 'Ted 大学时代的女友，自诩艺术家，傲慢且多次出轨，让好友们头疼不已。',
    affinityLevels: {
      0:  '彻底决裂',
      20: '尴尬的存在',
      40: '还是分开好',
      60: '或许还有可能？',
    }
  },
  victoria: {
    id: 'victoria',
    name: 'Victoria',
    shortName: 'Victoria',
    role: '蛋糕师 · 那个差点的人',
    emoji: '🎂',
    avatar: 'assets/victoria.jpg',
    color: '#e8a8d4',
    colorVar: '--victoria-color',
    initialAffinity: 0,
    description: '甜蜜的德国蛋糕师，真心爱过 Ted，却因距离和选择而错过。',
    affinityLevels: {
      0:  '尚未认识',
      30: '第一印象',
      60: '心动',
      85: '真爱',
    }
  },
  stella: {
    id: 'stella',
    name: 'Stella Zinman',
    shortName: 'Stella',
    role: '皮肤科医生',
    emoji: '🩺',
    avatar: 'assets/stella.jpg',
    color: '#7ec8c8',
    colorVar: '--stella-color',
    initialAffinity: 0,
    locked: true,
    description: '单身母亲兼皮肤科医生，几乎嫁给 Ted，却在婚礼前选择了前任。',
    affinityLevels: {
      0:  '尚未认识',
      30: '医患关系',
      60: '约会中',
      85: '差点结婚',
    }
  },
};

// 好感度颜色映射
const AFFINITY_COLORS = {
  robin:    'var(--robin-color)',
  barney:   'var(--barney-color)',
  marshall: 'var(--marshall-color)',
  lily:     'var(--lily-color)',
  tracy:    'var(--tracy-color)',
  karen:    'var(--karen-color)',
  victoria: 'var(--victoria-color)',
  stella:   'var(--stella-color)',
};

// 好感度面板显示的角色（主线角色）
const MAIN_AFFINITY_CHARS = ['robin', 'barney', 'marshall', 'lily', 'tracy'];

// 可见角色（人物关系页面显示）
const ALL_CHARS_ORDER = ['robin', 'barney', 'marshall', 'lily', 'tracy', 'karen', 'victoria', 'stella'];
