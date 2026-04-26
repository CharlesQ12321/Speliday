/**
 * 智拍单词本 - AI SnapWords
 * Main Application Logic
 */

// Database Setup
const db = new Dexie('SnapWordsDB');
db.version(13).stores({
  words: '++id, word, translation, *bookIds, errorCount, correctCount, isReported, createdAt, lastPracticed',
  books: '++id, bookId, bookName, createdAt',
  settings: 'key, value',
  practiceScores: '++id, playerName, totalScore, wordCount, correctCount, createdAt',
  dailyPracticeSessions: '++id, date, completedAt',
  playerProfiles: '++id, playerName, totalPoints, level, lastPlayedAt, avatar',
  // 斗罗大陆等级系统
  playerSpiritPower: '++id, playerId, totalSpiritPower, currentTier, currentLevel, lastUpdated, isBreakthroughReady, breakthroughCompleted',
  // 日常任务系统
  dailyTasks: '++id, playerId, date, taskType, completed, reward',
  // 副本任务系统
  dungeonProgress: '++id, playerId, dungeonId, isBreakthrough, completedCount, lastPlayed',
  // 魂骨系统（阶段四）
  soulBones: '++id, playerId, beastType, slot, isIdentified, isEquipped, obtainedAt'
});

// 数据库升级处理
db.on('populate', () => {
  console.log('数据库初始化完成');
});

// 监听数据库版本变化
db.on('versionchange', (event) => {
  console.log('数据库版本变更，需要刷新页面');
  db.close();
  window.location.reload();
});

// 确保数据库已打开
db.open().catch((err) => {
  console.error('数据库打开失败:', err);
  if (err.name === 'VersionError') {
    // 版本不匹配，删除旧数据库并重新创建
    console.log('数据库版本不匹配，正在重建数据库...');
    Dexie.delete('SnapWordsDB').then(() => {
      console.log('旧数据库已删除，请刷新页面');
      window.location.reload();
    });
  }
});

// 斗罗大陆等级系统配置 - 10 个大阶，100 个小级
const SPIRIT_LEVEL_SYSTEM = {
  tiers: [
    {
      id: 1,
      name: '魂士',
      icon: '🌱',
      color: '#8B4513',
      levels: 10,
      spiritPowerPerLevel: 100,
      cumulativeStart: 0,
      titles: ['武魂觉醒', '初醒者', '凝魂者', '魂力初成', '魂士强者', '魂士巅峰', '准魂师', '半步魂师', '魂力圆满', '魂士极限']
    },
    {
      id: 2,
      name: '魂师',
      icon: '⚔️',
      color: '#4169E1',
      levels: 10,
      spiritPowerPerLevel: 300,
      cumulativeStart: 1000,
      titles: ['正式魂师', '初阶魂师', '中阶魂师', '高阶魂师', '魂师精英', '魂师强者', '魂师巅峰', '准大魂师', '半步大魂师', '魂师极限']
    },
    {
      id: 3,
      name: '大魂师',
      icon: '🛡️',
      color: '#32CD32',
      levels: 10,
      spiritPowerPerLevel: 800,
      cumulativeStart: 4000,
      titles: ['大魂师', '双环魂师', '三环预备者', '大魂师精英', '大魂师强者', '大魂师巅峰', '准魂尊', '半步魂尊', '大魂师圆满', '大魂师极限']
    },
    {
      id: 4,
      name: '魂尊',
      icon: '👑',
      color: '#FFD700',
      levels: 10,
      spiritPowerPerLevel: 2000,
      cumulativeStart: 12000,
      titles: ['魂尊', '三环魂尊', '尊阶强者', '魂尊精英', '魂尊强者', '魂尊巅峰', '准魂宗', '半步魂宗', '魂尊圆满', '魂尊极限']
    },
    {
      id: 5,
      name: '魂宗',
      icon: '🏆',
      color: '#FF4500',
      levels: 10,
      spiritPowerPerLevel: 5000,
      cumulativeStart: 32000,
      titles: ['魂宗', '四环魂宗', '宗派中坚', '魂宗精英', '魂宗强者', '魂宗巅峰', '准魂王', '半步魂王', '魂宗圆满', '魂宗极限']
    },
    {
      id: 6,
      name: '魂王',
      icon: '🔥',
      color: '#DC143C',
      levels: 10,
      spiritPowerPerLevel: 12000,
      cumulativeStart: 82000,
      titles: ['魂王', '五环魂王', '王阶统帅', '魂王精英', '魂王强者', '魂王巅峰', '准魂帝', '半步魂帝', '魂王圆满', '魂王极限']
    },
    {
      id: 7,
      name: '魂帝',
      icon: '💎',
      color: '#9370DB',
      levels: 10,
      spiritPowerPerLevel: 28000,
      cumulativeStart: 202000,
      titles: ['魂帝', '六环魂帝', '帝阶霸主', '魂帝精英', '魂帝强者', '魂帝巅峰', '准魂圣', '半步魂圣', '魂帝圆满', '魂帝极限']
    },
    {
      id: 8,
      name: '魂圣',
      icon: '🌟',
      color: '#00CED1',
      levels: 10,
      spiritPowerPerLevel: 60000,
      cumulativeStart: 482000,
      titles: ['魂圣', '武魂真身', '圣阶强者', '魂圣精英', '魂圣强者', '魂圣巅峰', '准魂斗罗', '半步魂斗罗', '魂圣圆满', '魂圣极限']
    },
    {
      id: 9,
      name: '魂斗罗',
      icon: '🌠',
      color: '#FF6347',
      levels: 10,
      spiritPowerPerLevel: 120000,
      cumulativeStart: 1082000,
      titles: ['魂斗罗', '八环斗罗', '斗罗长老', '魂斗罗精英', '魂斗罗强者', '魂斗罗巅峰', '准封号', '半步封号', '魂斗罗圆满', '魂斗罗极限']
    },
    {
      id: 10,
      name: '封号斗罗',
      icon: '⭐',
      color: '#FFD700',
      levels: 10,
      spiritPowerPerLevel: 300000,
      cumulativeStart: 2282000,
      titles: ['封号斗罗', '超级斗罗', '极限斗罗', '神级斗罗', '斗罗巅峰', '斗罗至尊', '斗罗传说', '斗罗神话', '斗罗永恒', '斗罗至高']
    }
  ]
};

// 兼容旧代码的等级系统映射（自动从斗罗大陆系统生成 100 个小级）
const LEVEL_SYSTEM = {
  levels: SPIRIT_LEVEL_SYSTEM.tiers.flatMap(tier => {
    const levels = [];
    for (let i = 0; i < tier.levels; i++) {
      const globalLevel = (tier.id - 1) * 10 + i + 1;
      levels.push({
        id: globalLevel,
        name: tier.name,
        icon: tier.icon,
        color: tier.color,
        minPoints: tier.cumulativeStart + i * tier.spiritPowerPerLevel,
        maxPoints: tier.cumulativeStart + (i + 1) * tier.spiritPowerPerLevel
      });
    }
    return levels;
  })
};

// 日常任务系统配置
const DAILY_TASK_CONFIG = {
  cultivation: {
    id: 'cultivation',
    name: '武魂修炼',
    description: '完成一次拼写练习',
    icon: '⚔️',
    baseReward: 100,
    checkCompletion: (playerId) => db.dailyTasks.where({ playerId, date: getTodayStr(), taskType: 'cultivation', completed: true }).count()
  },
  wordTraining: {
    id: 'wordTraining',
    name: '单词训练',
    description: '拼写 50 个单词',
    icon: '📖',
    baseReward: 100,
    targetWords: 50
  },
  sentenceTraining: {
    id: 'sentenceTraining',
    name: '学院功课',
    description: '完成一次句子填空',
    icon: '📝',
    baseReward: 100,
    checkCompletion: (playerId) => db.dailyTasks.where({ playerId, date: getTodayStr(), taskType: 'sentenceTraining', completed: true }).count()
  },
  streak: {
    id: 'streak',
    name: '连击挑战',
    description: '达成 10 连击',
    icon: '🔥',
    baseReward: 150,
    targetCombo: 10
  },
  perfect: {
    id: 'perfect',
    name: '完美通关',
    description: '一轮练习全对（≥20 词）',
    icon: '💯',
    baseReward: 200,
    minWords: 20
  }
};

// 获取今天日期字符串 YYYY-MM-DD
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 获取等级系数
function getTierRewardMultiplier(tierId) {
  const multipliers = {
    1: 1.0,   // 魂士
    2: 1.5,   // 魂师
    3: 2.0,   // 大魂师
    4: 3.0,   // 魂尊
    5: 5.0,   // 魂宗
    6: 8.0,   // 魂王
    7: 12.0,  // 魂帝
    8: 18.0,  // 魂圣
    9: 25.0,  // 魂斗罗
    10: 35.0  // 封号斗罗
  };
  return multipliers[tierId] || 1.0;
}

// 获取今日魂力奖励（含等级系数）
function getDailyTaskReward(taskId, tierId) {
  const task = DAILY_TASK_CONFIG[taskId];
  if (!task) return 0;
  return Math.floor(task.baseReward * getTierRewardMultiplier(tierId));
}

// 日常任务系统函数
async function initDailyTasks(playerId) {
  const today = getTodayStr();
  const existingTasks = await db.dailyTasks.where({ playerId, date: today }).toArray();
  
  if (existingTasks.length === 0) {
    const tasks = Object.values(DAILY_TASK_CONFIG).map(task => ({
      playerId,
      date: today,
      taskType: task.id,
      completed: false,
      reward: 0,
      progress: 0
    }));
    await db.dailyTasks.bulkAdd(tasks);
  }
}

// 获取日常任务等级系数（阶段二：任务 2.3）
function getDailyTaskRewardMultiplier(tierId) {
  const multipliers = {
    1: 1.0,   // 魂士
    2: 1.5,   // 魂师
    3: 2.0,   // 大魂师
    4: 3.0,   // 魂尊
    5: 5.0,   // 魂宗
    6: 8.0,   // 魂王
    7: 12.0,  // 魂帝
    8: 18.0,  // 魂圣
    9: 25.0,  // 魂斗罗
    10: 35.0  // 封号斗罗
  };
  return multipliers[tierId] || 1.0;
}

// 计算日常任务奖励（考虑等级系数）
async function calculateDailyTaskReward(taskId, playerId) {
  const config = DAILY_TASK_CONFIG[taskId];
  if (!config) return config.baseReward || 0;
  
  // 获取玩家当前大级
  const spiritInfo = await getPlayerSpiritInfoByPlayerId(playerId);
  const tierId = spiritInfo ? spiritInfo.tierId : 1;
  
  const multiplier = getDailyTaskRewardMultiplier(tierId);
  return Math.floor((config.baseReward || 0) * multiplier);
}

// 领取单个日常任务奖励（手动领取模式）
async function claimDailyTaskReward(playerId, taskType) {
  const today = getTodayStr();
  const task = await db.dailyTasks.where({ playerId, date: today, taskType }).first();
  if (!task) return { success: false, reason: '任务不存在' };
  if (task.completed) return { success: false, reason: '已领取' };
  
  // 检查任务是否满足完成条件
  const config = DAILY_TASK_CONFIG[taskType];
  if (!config) return { success: false, reason: '未知任务' };
  
  // 根据任务类型检查完成条件
  let isCompleted = false;
  if (taskType === 'wordTraining') {
    isCompleted = (task.progress || 0) >= config.targetWords;
  } else if (taskType === 'streak') {
    // 连击挑战需要额外状态追踪，暂时简化为已完成
    isCompleted = task.progress >= config.targetCombo;
  } else {
    // cultivation, sentenceTraining, perfect 通过 completeDailyTask 自动标记
    isCompleted = task.completed;
  }
  
  if (!isCompleted) return { success: false, reason: '任务未完成' };
  
  // 发放奖励
  const result = await completeDailyTask(playerId, taskType);
  return result;
}

// 一键领取全部可领取的日常任务奖励
async function claimAllDailyTaskRewards(playerId) {
  const today = getTodayStr();
  const tasks = await db.dailyTasks.where({ playerId, date: today }).toArray();
  
  if (!tasks.length) return { success: false, reason: '暂无任务' };
  
  let totalReward = 0;
  let claimedCount = 0;
  const results = [];
  
  for (const task of tasks) {
    if (!task.completed) {
      const config = DAILY_TASK_CONFIG[task.taskType];
      if (!config) continue;
      
      // 检查是否满足完成条件
      let canClaim = false;
      if (task.taskType === 'wordTraining') {
        canClaim = (task.progress || 0) >= config.targetWords;
      } else if (task.taskType === 'streak') {
        canClaim = (task.progress || 0) >= config.targetCombo;
      } else {
        canClaim = false; // cultivation, sentenceTraining, perfect 已自动领取
      }
      
      if (canClaim) {
        const result = await completeDailyTask(playerId, task.taskType);
        if (result && result.success) {
          totalReward += result.reward;
          claimedCount++;
          results.push({ taskType: task.taskType, reward: result.reward });
        }
      }
    }
  }
  
  return {
    success: true,
    totalReward,
    claimedCount,
    results
  };
}

async function getDailyTasks(playerId) {
  const today = getTodayStr();
  const tasks = await db.dailyTasks.where({ playerId, date: today }).toArray();
  
  const spiritInfo = await getPlayerSpiritInfoByPlayerId(playerId);
  const tierId = spiritInfo ? spiritInfo.tierId : 1;
  
  return tasks.map(task => {
    const config = DAILY_TASK_CONFIG[task.taskType];
    return {
      ...task,
      name: config.name,
      description: config.description,
      icon: config.icon,
      baseReward: config.baseReward,
      reward: task.completed ? task.reward : getDailyTaskReward(task.taskType, tierId)
    };
  });
}

async function completeDailyTask(playerId, taskType) {
  const today = getTodayStr();
  const task = await db.dailyTasks.where({ playerId, date: today, taskType }).first();
  if (!task || task.completed) return false;
  
  const spiritInfo = await getPlayerSpiritInfoByPlayerId(playerId);
  const tierId = spiritInfo ? spiritInfo.tierId : 1;
  const reward = getDailyTaskReward(taskType, tierId);
  
  await db.dailyTasks.update(task.id, {
    completed: true,
    reward: reward,
    completedAt: Date.now()
  });
  
  // 发放魂力奖励
  const playerProfile = await db.playerProfiles.get(playerId);
  if (playerProfile) {
    await addSpiritPower(playerProfile.playerName, reward, `daily_${taskType}`);
  }
  
  return { success: true, reward };
}

async function getPlayerSpiritInfoByPlayerId(playerId) {
  const spiritProfile = await db.playerSpiritPower.where('playerId').equals(playerId).first();
  if (!spiritProfile) return null;
  // 使用突破状态计算等级
  return calculateSpiritLevel(spiritProfile.totalSpiritPower, spiritProfile.breakthroughCompleted);
}

// 更新单词训练进度
async function updateWordTrainingProgress(playerId, wordCount) {
  const today = getTodayStr();
  let task = await db.dailyTasks.where({ playerId, date: today, taskType: 'wordTraining' }).first();
  if (!task) return;
  
  const newProgress = (task.progress || 0) + wordCount;
  const target = DAILY_TASK_CONFIG.wordTraining.targetWords;
  
  if (newProgress >= target && !task.completed) {
    await completeDailyTask(playerId, 'wordTraining');
  } else {
    await db.dailyTasks.update(task.id, { progress: newProgress });
  }
}

// 副本任务系统配置
const DUNGEONS = [
  {
    id: 'nuoding',
    name: '诺丁学院',
    unlockLevel: 11,
    difficulty: 1,
    pointsMultiplier: 1.2,
    soulBoneDropRate: 0.50,
    requirements: { mode: 'spelling', wordCount: 50, accuracyRequired: 0.65 },
    description: '基础单词拼写，适合新手入门'
  },
  {
    id: 'shilaik',
    name: '史莱克学院',
    unlockLevel: 21,
    difficulty: 2,
    pointsMultiplier: 1.5,
    soulBoneDropRate: 0.55,
    requirements: { mode: 'sentence', wordCount: 25, accuracyRequired: 0.68 },
    description: '句子语境中的单词应用'
  },
  {
    id: 'wuhun',
    name: '武魂殿',
    unlockLevel: 31,
    difficulty: 3,
    pointsMultiplier: 2.0,
    soulBoneDropRate: 0.60,
    requirements: { mode: 'spelling', wordCount: 60, accuracyRequired: 0.72 },
    description: '词汇量要求提升'
  },
  {
    id: 'xingdou',
    name: '星斗大森林',
    unlockLevel: 41,
    difficulty: 4,
    pointsMultiplier: 3.0,
    soulBoneDropRate: 0.65,
    requirements: { mode: 'sentence', wordCount: 30, accuracyRequired: 0.75 },
    description: '长句填空，难度增加'
  },
  {
    id: 'haotian',
    name: '昊天宗',
    unlockLevel: 51,
    difficulty: 5,
    pointsMultiplier: 5.0,
    soulBoneDropRate: 0.70,
    requirements: { mode: 'spelling', wordCount: 80, accuracyRequired: 0.78 },
    description: '大量词汇挑战'
  },
  {
    id: 'haisen',
    name: '海神岛',
    unlockLevel: 61,
    difficulty: 6,
    pointsMultiplier: 8.0,
    soulBoneDropRate: 0.75,
    requirements: { mode: 'sentence', wordCount: 35, accuracyRequired: 0.82 },
    description: '高难度句子填空'
  },
  {
    id: 'shalu',
    name: '杀戮之都',
    unlockLevel: 71,
    difficulty: 7,
    pointsMultiplier: 12.0,
    soulBoneDropRate: 0.80,
    requirements: { mode: 'spelling', wordCount: 100, accuracyRequired: 0.85 },
    description: '极限词汇量挑战'
  },
  {
    id: 'wuhun_city',
    name: '武魂城',
    unlockLevel: 81,
    difficulty: 8,
    pointsMultiplier: 18.0,
    soulBoneDropRate: 0.85,
    requirements: { mode: 'sentence', wordCount: 42, accuracyRequired: 0.88 },
    description: '复杂语境应用'
  },
  {
    id: 'shenjie',
    name: '神界',
    unlockLevel: 91,
    difficulty: 9,
    pointsMultiplier: 25.0,
    soulBoneDropRate: 0.90,
    requirements: { mode: 'spelling', wordCount: 120, accuracyRequired: 0.92 },
    description: '神级挑战，可选择练习模式'
  }
];

// 副本系统函数
async function getDungeonProgress(playerId, dungeonId) {
  let progress = await db.dungeonProgress.where({ playerId, dungeonId }).first();
  if (!progress) {
    const playerSpirit = await getPlayerSpiritInfoByPlayerId(playerId);
    const playerLevel = playerSpirit ? playerSpirit.level : 1;
    const dungeon = DUNGEONS.find(d => d.id === dungeonId);
    const isBreakthrough = dungeon && playerLevel >= dungeon.unlockLevel;
    
    progress = {
      playerId,
      dungeonId,
      isBreakthrough: isBreakthrough || false,
      completedCount: 0,
      lastPlayed: null,
      todayCount: 0
    };
    await db.dungeonProgress.add(progress);
  }
  return progress;
}

async function getAllDungeons(playerId) {
  const playerSpirit = await getPlayerSpiritInfoByPlayerId(playerId);
  let playerLevel = playerSpirit ? playerSpirit.level : 1;
  const needsBreakthrough = playerSpirit ? playerSpirit.needsBreakthrough : false;
  
  // 如果角色需要突破，允许进入下一个大级的突破副本
  // 例如：魂士 Lv.10 满级需要突破 → 允许进入诺丁学院（魂师的突破副本，unlockLevel=11）
  const effectiveLevel = needsBreakthrough ? playerLevel + 1 : playerLevel;
  
  const dungeons = DUNGEONS.map(dungeon => ({
    ...dungeon,
    isUnlocked: effectiveLevel >= dungeon.unlockLevel,
    progress: null
  }));
  
  for (let dungeon of dungeons) {
    if (dungeon.isUnlocked) {
      const progress = await getDungeonProgress(playerId, dungeon.id);
      dungeon.progress = progress;
      dungeon.todayCount = progress.todayCount || 0;
    }
  }
  
  return dungeons;
}

async function completeDungeon(playerId, dungeonId, success, practiceData) {
  const progress = await getDungeonProgress(playerId, dungeonId);
  const dungeon = DUNGEONS.find(d => d.id === dungeonId);
  
  const newTodayCount = (progress.todayCount || 0) + 1;
  
  if (success && practiceData && practiceData.accuracy >= dungeon.requirements.accuracyRequired) {
    const basePoints = practiceData.score || 0;
    const bonusPoints = Math.floor(basePoints * dungeon.pointsMultiplier);
    
    await db.dungeonProgress.update(progress.id, {
      isBreakthrough: false,
      completedCount: progress.completedCount + 1,
      lastPlayed: Date.now(),
      todayCount: newTodayCount
    });
    
    const playerProfile = await db.playerProfiles.get(playerId);
    if (playerProfile) {
      // 副本模式忽略突破限制，允许通过突破任务获得魂力
      await addSpiritPower(playerProfile.playerName, bonusPoints, `dungeon_${dungeonId}`, true);
    }
    
    // ===== 阶段三：魂骨掉落逻辑 =====
    let soulBone = null;
    const wasBreakthrough = progress.isBreakthrough;
    if (Math.random() < dungeon.soulBoneDropRate) {
      soulBone = await generateSoulBone(playerId, dungeon.difficulty);
    }
    
    return { success: true, points: bonusPoints, isBreakthrough: wasBreakthrough, soulBone };
  } else {
    await db.dungeonProgress.update(progress.id, {
      lastPlayed: Date.now(),
      todayCount: newTodayCount
    });
    return { success: false, points: 0 };
  }
}

// ===== 魂骨系统（阶段四预留接口） =====
// 魂骨类型配置
const SOUL_BONE_TYPES = {
  mantuo:   { name: '曼陀罗蛇', color: '#8B008B', icon: '🐍', setSkill: '积分翻倍', setSkillDesc: '练习获得积分翻倍' },
  rougu:    { name: '柔骨兔',   color: '#FF69B4', icon: '🐰', setSkill: '失败重生', setSkillDesc: '拼写错误可重生一次' },
  xiehou:   { name: '邪眸白虎', color: '#FF4500', icon: '🐯', setSkill: '连击不断', setSkillDesc: '连击不会因一次失误中断' },
  youming:  { name: '幽冥灵猫', color: '#4B0082', icon: '🐱', setSkill: '答错不惩罚', setSkillDesc: '答错不会扣分' },
  qibao:    { name: '七宝琉璃', color: '#FFD700', icon: '💎', setSkill: '失败获积分', setSkillDesc: '挑战失败也能获得50%积分' }
};

// 魂骨部位配置（5个部位，根据策划文档）
const SOUL_BONE_SLOTS = ['head', 'body', 'left_arm', 'right_leg', 'external'];
const SOUL_BONE_SLOT_NAMES = {
  head: '头骨', body: '躯干骨', left_arm: '左臂骨',
  right_leg: '右腿骨', external: '外附魂骨'
};

// 魂骨名称配置（5种魂兽 × 5个部位 = 25种魂骨）
const SOUL_BONE_NAMES = {
  mantuo: {
    head: '毒瞳蛇皇颅', body: '龙鳞蛇甲', left_arm: '噬毒蟒臂',
    right_leg: '疾风蛇行靴', external: '蛇魔蛛矛'
  },
  rougu: {
    head: '月魄兔灵冠', body: '玉骨冰肌衣', left_arm: '粉玉柔臂',
    right_leg: '踏月追云靴', external: '冰晶兔绒翼'
  },
  xiehou: {
    head: '霸虎啸天冠', body: '金刚虎躯铠', left_arm: '裂风虎臂',
    right_leg: '狂虎奔雷靴', external: '白虎金刚翼'
  },
  youming: {
    head: '影魅幽魂冠', body: '夜行影魅袍', left_arm: '瞬影猫臂',
    right_leg: '幽灵鬼影迷', external: '幽冥影刃'
  },
  qibao: {
    head: '琉璃幻心冕', body: '七彩云烟铠', left_arm: '玲珑水晶臂',
    right_leg: '流光飞羽靴', external: '七宝玲珑塔'
  }
};

const SOUL_BONE_ATTRIBUTES = [
  { type: 'health', name: '生命', icon: '❤️', min: 5, max: 20 },
  { type: 'knockback', name: '击退', icon: '💥', min: 2, max: 10 },
  { type: 'dodge', name: '闪避', icon: '💨', min: 1, max: 8 },
  { type: 'defense', name: '防御', icon: '🛡️', min: 3, max: 15 },
  { type: 'slow', name: '减速', icon: '❄️', min: 1, max: 5 }
];

// 生成随机魂骨（阶段四：任务 4.2）
async function generateSoulBone(playerId, dungeonDifficulty) {
  const beastTypes = Object.keys(SOUL_BONE_TYPES);
  const beastType = beastTypes[Math.floor(Math.random() * beastTypes.length)];
  const slot = SOUL_BONE_SLOTS[Math.floor(Math.random() * SOUL_BONE_SLOTS.length)];
  const attr = SOUL_BONE_ATTRIBUTES[Math.floor(Math.random() * SOUL_BONE_ATTRIBUTES.length)];
  
  return createSoulBone(playerId, beastType, slot, attr, dungeonDifficulty);
}

// 生成指定魂兽和部位的魂骨（作弊码专用）
async function generateSpecificSoulBone(playerId, beastType, slot) {
  const attr = SOUL_BONE_ATTRIBUTES[Math.floor(Math.random() * SOUL_BONE_ATTRIBUTES.length)];
  return createSoulBone(playerId, beastType, slot, attr, 1);
}

// 创建魂骨（内部函数）
async function createSoulBone(playerId, beastType, slot, attr, dungeonDifficulty) {
  const difficultyMultiplier = 1 + (dungeonDifficulty - 1) * 0.2;
  const value = Math.floor((attr.min + Math.random() * (attr.max - attr.min)) * difficultyMultiplier);
  
  const boneNames = SOUL_BONE_NAMES[beastType];
  const name = boneNames ? (boneNames[slot] || `${SOUL_BONE_TYPES[beastType].name}${SOUL_BONE_SLOT_NAMES[slot]}`) : `${SOUL_BONE_TYPES[beastType].name}${SOUL_BONE_SLOT_NAMES[slot]}`;
  
  const soulBone = {
    playerId,
    beastType,
    beastName: SOUL_BONE_TYPES[beastType].name,
    slot,
    slotName: SOUL_BONE_SLOT_NAMES[slot],
    name,
    attributeType: attr.type,
    attributeName: attr.name,
    attributeIcon: attr.icon,
    attributeValue: value,
    isIdentified: false,
    isEquipped: false,
    obtainedAt: Date.now()
  };
  
  await db.soulBones.add(soulBone);
  return soulBone;
}

// 鉴定魂骨（阶段四：任务 4.3）
async function identifySoulBone(soulBoneId) {
  const bone = await db.soulBones.get(soulBoneId);
  if (!bone || bone.isIdentified) return null;
  
  await db.soulBones.update(soulBoneId, { isIdentified: true });
  return { ...bone, isIdentified: true };
}

// 装备魂骨（阶段四：任务 4.4）
async function equipSoulBone(soulBoneId) {
  const bone = await db.soulBones.get(soulBoneId);
  if (!bone || !bone.isIdentified) return { success: false, reason: '魂骨未鉴定' };
  if (bone.isEquipped) return { success: false, reason: '已装备' };
  
  // 卸下同部位的已装备魂骨
  const sameSlotEquipped = await db.soulBones
    .where('playerId')
    .equals(bone.playerId)
    .and(b => b.slot === bone.slot && b.isEquipped)
    .toArray();
  
  for (const equippedBone of sameSlotEquipped) {
    await db.soulBones.update(equippedBone.id, { isEquipped: false });
  }
  
  // 装备新魂骨
  await db.soulBones.update(soulBoneId, { isEquipped: true });
  return { success: true };
}

// 卸下魂骨
async function unequipSoulBone(soulBoneId) {
  await db.soulBones.update(soulBoneId, { isEquipped: false });
  return { success: true };
}

// 获取玩家已装备的魂骨
async function getEquippedSoulBones(playerId) {
  return await db.soulBones.where({ playerId, isEquipped: true }).toArray();
}

// 获取玩家所有魂骨
async function getPlayerSoulBones(playerId) {
  return await db.soulBones.where('playerId').equals(playerId).toArray();
}

// 计算套装效果（阶段四：任务 4.5）
function getSetBonus(equippedBones) {
  const setCounts = {};
  equippedBones.forEach(bone => {
    if (bone.isEquipped) {
      setCounts[bone.beastType] = (setCounts[bone.beastType] || 0) + 1;
    }
  });
  
  const bonuses = [];
  
  // 检查每种魂兽是否集齐5件激活套装
  Object.keys(setCounts).forEach(beastType => {
    if (setCounts[beastType] >= 5) {
      const beast = SOUL_BONE_TYPES[beastType];
      if (beast) {
        bonuses.push({
          beastType: beastType,
          beastName: beast.name,
          skill: beast.setSkill,
          skillDesc: beast.setSkillDesc,
          icon: beast.icon
        });
      }
    }
  });
  
  // 全套装（5种各1件）额外加成
  if (Object.keys(setCounts).length >= 5) {
    bonuses.push({
      beastType: 'full_set',
      beastName: '全套魂骨',
      skill: '神级套装',
      skillDesc: '所有技能效果提升50%',
      icon: '🌟'
    });
  }
  
  return bonuses;
}

// ========== 阶段六：玩家属性与对战增益 ==========

// 基础玩家属性配置（阶段六：任务 6.1）
const BASE_PLAYER_STATS = {
  health: 1000,       // 基础生命值
  defense: 0,         // 基础防御力
  dodge: 0,           // 基础闪避率（0-1，百分比）
  knockback: 1,       // 基础击退倍率（1 = 100%）
  zombieSlow: 0       // 僵尸减速效果（0-1，百分比）
};

// 计算玩家属性（阶段六：任务 6.1 & 6.2）
async function calculatePlayerStats(playerId) {
  let stats = { ...BASE_PLAYER_STATS };
  
  if (!playerId) {
    console.warn('[calculatePlayerStats] playerId 为空，返回基础属性');
    return stats;
  }
  
  try {
    const bones = await db.soulBones.where('playerId').equals(playerId).toArray();
    console.log('[calculatePlayerStats] playerId:', playerId, '找到', bones.length, '个魂骨');
    
    // 只计算已装备且已鉴定的魂骨属性
    const equippedBones = bones.filter(b => b.isEquipped && b.isIdentified);
    console.log('[calculatePlayerStats] 已装备且已鉴定:', equippedBones.length, '个');
    
    equippedBones.forEach(bone => {
      console.log('[calculatePlayerStats] 处理魂骨:', bone.name, '属性类型:', bone.attributeType, '值:', bone.attributeValue);
      switch (bone.attributeType) {
        case 'health':
          stats.health += bone.attributeValue;
          break;
        case 'defense':
          stats.defense += bone.attributeValue;
          break;
        case 'dodge':
          stats.dodge += bone.attributeValue / 100;
          break;
        case 'knockback':
          stats.knockback += bone.attributeValue / 100;
          break;
        case 'slow':
          stats.zombieSlow += bone.attributeValue / 100;
          break;
        default:
          console.warn('[calculatePlayerStats] 未知属性类型:', bone.attributeType);
      }
    });
    
    stats.dodge = Math.min(stats.dodge, 0.8);
    stats.zombieSlow = Math.min(stats.zombieSlow, 0.5);
    
    console.log('[calculatePlayerStats] 最终属性:', JSON.stringify(stats));
  } catch (err) {
    console.error('[calculatePlayerStats] 计算出错:', err);
  }
  
  return stats;
}

// 获取当前装备魂骨的套装效果（辅助函数）
async function getActiveSetBonuses(playerId) {
  if (!playerId) return [];
  const bones = await db.soulBones.where('playerId').equals(playerId).toArray();
  return getSetBonus(bones);
}

// 伤害计算（阶段六：任务 6.3 - 伤害计算）
function calculateDamage(zombieAttack, playerDefense) {
  const damage = Math.max(0, zombieAttack - playerDefense);
  return damage;
}

// 僵尸攻击处理（阶段六：任务 6.3 - 闪避判定和伤害计算）
function onZombieAttack(playerStats) {
  const zombieBaseAttack = 100;
  const playerDefense = playerStats.defense || 0;
  
  if (Math.random() < playerStats.dodge) {
    return { dodged: true, damage: 0 };
  }
  
  const damage = calculateDamage(zombieBaseAttack, playerDefense);
  return { dodged: false, damage };
}

// 清理重复装备的魂骨（每个部位只能装备一个）
async function cleanupDuplicateEquippedBones() {
  const allProfiles = await db.playerProfiles.toArray();
  let cleanedCount = 0;
  
  for (const profile of allProfiles) {
    const equippedBones = await db.soulBones
      .where('playerId')
      .equals(profile.id)
      .and(b => b.isEquipped)
      .toArray();
    
    // 按部位分组
    const bySlot = {};
    equippedBones.forEach(bone => {
      if (!bySlot[bone.slot]) bySlot[bone.slot] = [];
      bySlot[bone.slot].push(bone);
    });
    
    // 对每个部位，只保留第一个装备的，其余卸下
    for (const slot of Object.keys(bySlot)) {
      const bones = bySlot[slot];
      if (bones.length > 1) {
        // 保留第一个，卸下其余的
        for (let i = 1; i < bones.length; i++) {
          await db.soulBones.update(bones[i].id, { isEquipped: false });
          cleanedCount++;
        }
      }
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`已清理 ${cleanedCount} 个重复装备的魂骨`);
  }
  
  return cleanedCount;
}

// 获取激活的套装技能列表
function getActiveSetSkills(equippedBones) {
  return getSetBonus(equippedBones).map(b => b.skill);
}

// 检查特定套装技能是否激活
function isSetSkillActive(equippedBones, skillName) {
  const skills = getActiveSetSkills(equippedBones);
  return skills.includes(skillName);
}

// 重置每日副本次数（在登录时检查）
async function resetDungeonDailyCount(playerId) {
  const today = getTodayStr();
  const playerProfile = await db.playerProfiles.get(playerId);
  if (!playerProfile) return;
  
  // 检查并重置角色级别的每日挑战计数
  if (playerProfile.lastChallengeDate !== today) {
    await db.playerProfiles.update(playerId, {
      dailyChallengeCount: 0,
      lastChallengeDate: today
    });
  }
  
  // 同时重置每个副本的进度日期（兼容性处理）
  const progressList = await db.dungeonProgress.where('playerId').equals(playerId).toArray();
  
  for (let progress of progressList) {
    const lastPlayedDate = progress.lastPlayed ? new Date(progress.lastPlayed).toISOString().split('T')[0] : '';
    if (lastPlayedDate !== today) {
      await db.dungeonProgress.update(progress.id, { todayCount: 0 });
    }
  }
}

// Application State
const state = {
  currentPage: 'home',
  currentBook: 'all',
  practiceWords: [],
  currentPracticeIndex: 0,
  wrongWordsInRound: [], // 本轮拼写错误的单词
  recognitionResults: [],
  books: [],
  words: [],
  apiSettings: {
    provider: 'glm',  // 默认使用智谱AI GLM-4.6V-Flash
    key: '0e86562597674fd8a79c5f2c91e7cabf.6S6IOql0iwQ53niW',  // 内置API Key
    url: ''
  },
  // Camera and Image Processing
  mediaStream: null,
  currentCameraFacing: 'environment',
  currentImageData: null,
  currentRotation: 0,
  // 连续正确拼写计数
  consecutiveCorrectCount: 0,
  // 最大连击数（用于日常任务）
  maxCombo: 0,
  // 练习积分
  practiceScore: 0,
  // 副本挑战状态
  isDungeonMode: false,
  currentDungeonId: null,
  currentDungeon: null,
  // 本次练习总单词数
  totalWordsInPractice: 0,
  // 本次练习正确数（仅第一轮）
  correctWordsInPractice: 0,
  // 记录第一轮就答对的单词ID（用于正确率计算）
  firstRoundCorrectIds: [],
  // 记录第一轮总单词数（用于正确率计算，不包含复习轮次）
  firstRoundTotalWords: 0,
  // 记录第一轮答错的单词ID（用于正确率计算）
  firstRoundWrongIds: [],
  // 句子填空练习相关状态
  sentencePracticeWords: [],
  sentencePracticeData: [], // 存储AI生成的句子数据 {word, sentence, chineseTranslation, hiddenWord}
  currentSentenceIndex: 0,
  sentenceWrongWordsInRound: [],
  sentenceConsecutiveCorrectCount: 0,
  sentencePracticeScore: 0,
  sentenceTotalWords: 0,
  sentenceCorrectWords: 0,
  sentenceHintUsed: false,
  sentenceFirstRoundCorrectIds: [], // 记录第一轮就答对的单词 ID，用于正确率计算
  sentenceFirstRoundTotalWords: 0, // 记录第一轮的总单词数（用于正确率计算，不包含复习轮次）
  sentenceFirstRoundWrongIds: [], // 记录第一轮答错的单词 ID（用于正确率计算）
  // 僵尸游戏相关状态
  zombiePosition: 0, // 僵尸位置百分比 (0-100)，0 表示在最右边 (起点)，100 表示到达豌豆
  zombieTotalTime: 0, // 僵尸到达豌豆的总时间 (秒)
  zombieTimer: null, // 僵尸移动计时器
  zombieStartTime: null, // 僵尸开始移动的时间
  zombiePushBack: 0, // 累计被子弹击退的百分比
  zombieForward: 0, // 累计答错前进的百分比
  extraLifeUsed: false, // 柔骨兔套装失败重生是否已使用
  playerStats: null, // 当前玩家属性缓存
};

// 等级系统辅助函数
function calculateLevel(totalPoints) {
  for (let i = LEVEL_SYSTEM.levels.length - 1; i >= 0; i--) {
    const level = LEVEL_SYSTEM.levels[i];
    if (totalPoints >= level.minPoints && totalPoints <= level.maxPoints) {
      return level;
    }
  }
  return LEVEL_SYSTEM.levels[0];
}

function getLevelProgress(totalPoints, level) {
  if (level.maxPoints === Infinity) {
    return 100;
  }
  const prevLevelMin = level.minPoints;
  const currentRange = level.maxPoints - prevLevelMin;
  const progress = ((totalPoints - prevLevelMin) / currentRange) * 100;
  return Math.min(100, Math.max(0, progress));
}

async function getPlayerProfile(playerName) {
  const profile = await db.playerProfiles.where('playerName').equals(playerName).first();
  if (!profile) {
    return null;
  }
  return profile;
}

async function updatePlayerProfile(playerName, pointsEarned) {
  let profile = await getPlayerProfile(playerName);
  
  if (!profile) {
    const level = calculateLevel(pointsEarned);
    profile = {
      playerName: playerName,
      totalPoints: pointsEarned,
      level: level.id,
      lastPlayedAt: Date.now()
    };
    await db.playerProfiles.add(profile);
  } else {
    const newTotal = profile.totalPoints + pointsEarned;
    const newLevel = calculateLevel(newTotal);
    await db.playerProfiles.update(profile.id, {
      totalPoints: newTotal,
      level: newLevel.id,
      lastPlayedAt: Date.now()
    });
    profile.totalPoints = newTotal;
    profile.level = newLevel.id;
  }
  
  return profile;
}

// ===== 斗罗大陆魂力等级系统 =====

function calculateSpiritLevel(totalSpiritPower, breakthroughCompleted = true) {
  let cumulativeRequired = 0;
  
  for (let tier of SPIRIT_LEVEL_SYSTEM.tiers) {
    const tierTotal = tier.levels * tier.spiritPowerPerLevel;
    const tierEnd = cumulativeRequired + tierTotal;
    
    // 检查是否在当前大级范围内（包含边界）
    if (totalSpiritPower <= tierEnd) {
      const remainingInTier = totalSpiritPower - cumulativeRequired;
      let levelInTier = Math.floor(remainingInTier / tier.spiritPowerPerLevel) + 1;
      
      // 确保 levelInTier 不超过 10
      levelInTier = Math.min(levelInTier, tier.levels);
      
      // 如果正好在大级边界，显示当前大级的满级状态
      if (totalSpiritPower === tierEnd) {
        const globalLevel = (tier.id - 1) * 10 + tier.levels;
        const titleIndex = tier.titles.length - 1;
        // 达到大级满级时，如果不是最后一个大级，总是提示需要突破（即使还没超过边界）
        const isMaxTier = tier.id < SPIRIT_LEVEL_SYSTEM.tiers.length;
        const needsBreakthrough = isMaxTier && !breakthroughCompleted;
        
        return {
          tier: tier.name,
          tierId: tier.id,
          tierIcon: tier.icon,
          tierColor: tier.color,
          level: globalLevel,
          levelInTier: tier.levels,
          title: tier.titles[titleIndex],
          currentSpiritPower: tierTotal,
          requiredForLevel: tier.spiritPowerPerLevel,
          progress: 100,
          nextLevelPower: 0,
          isMaxLevel: true,
          needsBreakthrough: needsBreakthrough,
          nextTier: needsBreakthrough ? SPIRIT_LEVEL_SYSTEM.tiers[tier.id] : null
        };
      }
      
      const globalLevel = (tier.id - 1) * 10 + levelInTier;
      const titleIndex = Math.min(levelInTier - 1, tier.titles.length - 1);
      
      // 计算当前小级内的进度
      const spiritPowerForCurrentLevel = (levelInTier - 1) * tier.spiritPowerPerLevel;
      const progressInCurrentLevel = remainingInTier - spiritPowerForCurrentLevel;
      
      // 判断是否达到大级满级
      const isMaxLevel = levelInTier >= tier.levels;
      
      // 需要突破的条件：
      // 1. 达到大级满级（Lv.10）
      // 2. 未完成突破
      // 3. 不是最后一个大级（封号斗罗不需要突破）
      let needsBreakthrough = isMaxLevel && !breakthroughCompleted && tier.id < SPIRIT_LEVEL_SYSTEM.tiers.length;
      
      // 安全保护：如果玩家实际魂力远未达到大级满级要求，强制设为不需要突破
      // 这防止了 breakthroughCompleted 错误设置为 false 时导致的误判
      const tierMaxPower = tier.levels * tier.spiritPowerPerLevel;
      if (remainingInTier < tierMaxPower * 0.5) {
        // 魂力还不到大级满级的一半，绝对不需要突破
        needsBreakthrough = false;
      }
      
      return {
        tier: tier.name,
        tierId: tier.id,
        tierIcon: tier.icon,
        tierColor: tier.color,
        level: globalLevel,
        levelInTier: levelInTier,
        title: tier.titles[titleIndex],
        currentSpiritPower: needsBreakthrough ? tierTotal : progressInCurrentLevel,
        requiredForLevel: tier.spiritPowerPerLevel,
        progress: needsBreakthrough ? 100 : (progressInCurrentLevel / tier.spiritPowerPerLevel) * 100,
        nextLevelPower: needsBreakthrough ? 0 : tier.spiritPowerPerLevel - progressInCurrentLevel,
        isMaxLevel: isMaxLevel,
        needsBreakthrough: needsBreakthrough,
        nextTier: needsBreakthrough ? SPIRIT_LEVEL_SYSTEM.tiers[tier.id] : null
      };
    }
    
    // 如果已完成突破，累加到下一个大级
    if (breakthroughCompleted) {
      cumulativeRequired += tierTotal;
    } else {
      // 如果未突破，但魂力已超过当前大级，锁定在当前大级的满级
      const globalLevel = (tier.id - 1) * 10 + tier.levels;
      const titleIndex = tier.titles.length - 1;
      
      return {
        tier: tier.name,
        tierId: tier.id,
        tierIcon: tier.icon,
        tierColor: tier.color,
        level: globalLevel,
        levelInTier: tier.levels,
        title: tier.titles[titleIndex],
        currentSpiritPower: tierTotal,
        requiredForLevel: tier.spiritPowerPerLevel,
        progress: 100,
        nextLevelPower: 0,
        isMaxLevel: true,
        needsBreakthrough: true,
        nextTier: SPIRIT_LEVEL_SYSTEM.tiers[tier.id] || null
      };
    }
  }
  
  const lastTier = SPIRIT_LEVEL_SYSTEM.tiers[SPIRIT_LEVEL_SYSTEM.tiers.length - 1];
  return {
    tier: lastTier.name,
    tierId: lastTier.id,
    tierIcon: lastTier.icon,
    tierColor: lastTier.color,
    level: 100,
    levelInTier: 10,
    title: lastTier.titles[lastTier.titles.length - 1],
    currentSpiritPower: totalSpiritPower - cumulativeRequired + lastTier.levels * lastTier.spiritPowerPerLevel,
    requiredForLevel: lastTier.spiritPowerPerLevel,
    progress: 100,
    nextLevelPower: 0,
    isMaxLevel: true,
    needsBreakthrough: false,
    nextTier: null
  };
}

// 获取指定大级的满级魂力值（大级边界）
function getTierEndSpiritPower(tierId) {
  let cumulative = 0;
  for (let tier of SPIRIT_LEVEL_SYSTEM.tiers) {
    const tierTotal = tier.levels * tier.spiritPowerPerLevel;
    if (tier.id === tierId) {
      return cumulative + tierTotal;
    }
    cumulative += tierTotal;
  }
  return cumulative;
}

// 检查是否需要突破（大级满级且未完成突破）
function needsBreakthroughCheck(spiritProfile) {
  if (!spiritProfile) return false;
  
  const levelInfo = calculateSpiritLevel(spiritProfile.totalSpiritPower, spiritProfile.breakthroughCompleted);
  return levelInfo.needsBreakthrough;
}

// 完成突破（解锁下一个大级）
async function completeBreakthrough(playerName) {
  const profile = await db.playerProfiles.where('playerName').equals(playerName).first();
  if (!profile) return false;
  
  const spiritProfile = await db.playerSpiritPower.where('playerId').equals(profile.id).first();
  if (!spiritProfile) return false;
  
  // 更新突破状态
  await db.playerSpiritPower.update(spiritProfile.id, {
    breakthroughCompleted: true,
    lastUpdated: Date.now()
  });
  
  return true;
}

async function getSpiritPowerProfile(playerName) {
  const profile = await db.playerProfiles.where('playerName').equals(playerName).first();
  if (!profile) return null;
  
  let spiritProfile = await db.playerSpiritPower.where('playerId').equals(profile.id).first();
  if (!spiritProfile) {
    // 计算正确的等级信息
    const levelInfo = calculateSpiritLevel(profile.totalPoints || 0, true); // 新玩家默认已突破
    spiritProfile = {
      playerId: profile.id,
      totalSpiritPower: profile.totalPoints || 0,
      currentTier: levelInfo.tier,
      currentLevel: levelInfo.level,
      isBreakthroughReady: false,
      breakthroughCompleted: true, // 新玩家默认已突破（魂士 Lv.1 不需要突破）
      lastUpdated: Date.now()
    };
    await db.playerSpiritPower.add(spiritProfile);
  } else {
    // 数据迁移：处理旧记录缺少 breakthroughCompleted 字段的情况
    if (spiritProfile.breakthroughCompleted === undefined || spiritProfile.breakthroughCompleted === null) {
      // 先计算理论等级（假设已突破）
      const theoreticalLevel = calculateSpiritLevel(spiritProfile.totalSpiritPower || 0, true);
      
      // 如果理论等级已达到大级满级，则说明需要突破
      // 旧玩家默认设为需要突破（breakthroughCompleted = false）
      const needsBreakthrough = theoreticalLevel.levelInTier >= 10 && theoreticalLevel.tierId < SPIRIT_LEVEL_SYSTEM.tiers.length;
      
      // 使用突破限制重新计算实际等级
      const actualLevel = calculateSpiritLevel(spiritProfile.totalSpiritPower || 0, !needsBreakthrough);
      
      await db.playerSpiritPower.update(spiritProfile.id, {
        breakthroughCompleted: !needsBreakthrough,
        isBreakthroughReady: needsBreakthrough,
        currentTier: actualLevel.tier,
        currentLevel: actualLevel.level,
        lastUpdated: Date.now()
      });
      
      spiritProfile.breakthroughCompleted = !needsBreakthrough;
      spiritProfile.isBreakthroughReady = needsBreakthrough;
      spiritProfile.currentTier = actualLevel.tier;
      spiritProfile.currentLevel = actualLevel.level;
    } else {
      // 关键修复：每次读取时都验证并修正突破状态
      // 核心原则：未达到满级的角色绝对不应该需要突破
      let correctBreakthroughCompleted = spiritProfile.breakthroughCompleted;
      
      // 计算理论等级（假设已突破）
      const theoreticalLevel = calculateSpiritLevel(profile.totalPoints || 0, true);
      const isMaxLevel = theoreticalLevel.isMaxLevel;
      
      // 调试日志
      console.log(`[突破状态检查] ${profile.playerName}: 总魂力=${profile.totalPoints || 0}, 理论等级=${theoreticalLevel.tier}Lv.${theoreticalLevel.level}, isMaxLevel=${isMaxLevel}, 原breakthroughCompleted=${spiritProfile.breakthroughCompleted}`);
      
      // 关键逻辑：只有达到满级时才可能需要在 future 突破
      // 未达到满级的角色，breakthroughCompleted 必须为 true
      if (!isMaxLevel) {
        // 未达到满级，强制设为 true
        if (spiritProfile.breakthroughCompleted !== true) {
          console.log(`[突破状态修正] ${profile.playerName}: 未达到满级但 breakthroughCompleted=${spiritProfile.breakthroughCompleted}，修正为 true`);
          correctBreakthroughCompleted = true;
        }
      }
      // 达到满级的情况：
      // - 如果 breakthroughCompleted 为 true，说明已经突破过了，保持 true
      // - 如果 breakthroughCompleted 为 false，说明还没突破，保持 false
      
      // 如果突破状态或魂力值不正确，立即修正
      if (spiritProfile.breakthroughCompleted !== correctBreakthroughCompleted || 
          spiritProfile.totalSpiritPower !== (profile.totalPoints || 0)) {
        
        const correctLevelInfo = calculateSpiritLevel(profile.totalPoints || 0, correctBreakthroughCompleted);
        
        await db.playerSpiritPower.update(spiritProfile.id, {
          totalSpiritPower: profile.totalPoints || 0,
          currentTier: correctLevelInfo.tier,
          currentLevel: correctLevelInfo.level,
          isBreakthroughReady: correctLevelInfo.needsBreakthrough,
          breakthroughCompleted: correctBreakthroughCompleted,
          lastUpdated: Date.now()
        });
        
        console.log(`[突破状态更新] ${profile.playerName}: 更新后 breakthroughCompleted=${correctBreakthroughCompleted}, needsBreakthrough=${correctLevelInfo.needsBreakthrough}`);
        
        spiritProfile.totalSpiritPower = profile.totalPoints || 0;
        spiritProfile.currentTier = correctLevelInfo.tier;
        spiritProfile.currentLevel = correctLevelInfo.level;
        spiritProfile.isBreakthroughReady = correctLevelInfo.needsBreakthrough;
        spiritProfile.breakthroughCompleted = correctBreakthroughCompleted;
      }
    }
  }
  return spiritProfile;
}

async function addSpiritPower(playerName, spiritPower, source = 'practice', ignoreBreakthroughLimit = false) {
  const profile = await db.playerProfiles.where('playerName').equals(playerName).first();
  if (!profile) return null;
  
  let spiritProfile = await getSpiritPowerProfile(playerName);
  // 使用突破状态计算等级
  const oldLevel = calculateSpiritLevel(spiritProfile.totalSpiritPower, spiritProfile.breakthroughCompleted);
  
  // 检查是否需要突破：如果未完成突破且已达到大级满级，则阻止魂力增加
  // 副本模式下忽略此限制（因为突破任务本身就是用来完成突破的）
  if (!ignoreBreakthroughLimit && !spiritProfile.breakthroughCompleted) {
    const currentLevelInfo = calculateSpiritLevel(spiritProfile.totalSpiritPower, false);
    if (currentLevelInfo.needsBreakthrough) {
      // 需要突破但未完成，拒绝增加魂力
      return {
        profile: spiritProfile,
        oldLevel: currentLevelInfo,
        newLevel: currentLevelInfo,
        leveledUp: false,
        spiritPowerAdded: 0,
        blocked: true,
        reason: '需要完成突破任务才能继续获得魂力'
      };
    }
  }
  
  // 关键修复：使用 profile.totalPoints 作为准确的魂力基准，避免与 spiritProfile 重复累加
  // 因为 getSpiritPowerProfile 初始化时可能从 profile.totalPoints 复制了值
  const accurateBasePower = profile.totalPoints || 0;
  const newTotal = accurateBasePower + spiritPower;
  
  // 同步更新 playerProfiles 的 totalPoints，确保两个表一致
  await db.playerProfiles.update(profile.id, {
    totalPoints: newTotal,
    lastPlayedAt: Date.now()
  });
  
  // 检测是否需要设置突破状态
  // 如果当前已突破，检查新魂力是否超过当前大级的满级
  let newBreakthroughCompleted = spiritProfile.breakthroughCompleted;
  
  if (spiritProfile.breakthroughCompleted) {
    // 当前已突破，检查新魂力是否达到或超过当前大级的满级
    const currentLevelInfo = calculateSpiritLevel(accurateBasePower, true);
    const newLevelInfo = calculateSpiritLevel(newTotal, true);
    
    // 检测是否需要突破：
    // 1. 新的大级ID > 当前大级ID（已进入下一个大级）
    // 2. 或者新等级达到当前大级满级且魂力已达到或超过大级边界
    const crossedTierBoundary = newLevelInfo.tierId > currentLevelInfo.tierId;
    const reachedMaxLevel = newLevelInfo.isMaxLevel && newTotal >= getTierEndSpiritPower(currentLevelInfo.tierId);
    
    if (crossedTierBoundary || reachedMaxLevel) {
      // 达到大级满级或进入新的大级，需要设置未突破状态
      newBreakthroughCompleted = false;
    }
  }
  
  // 使用新的突破状态计算等级
  const newLevel = calculateSpiritLevel(newTotal, newBreakthroughCompleted);
  
  await db.playerSpiritPower.update(spiritProfile.id, {
    totalSpiritPower: newTotal,
    currentTier: newLevel.tier,
    currentLevel: newLevel.level,
    isBreakthroughReady: newLevel.needsBreakthrough,
    breakthroughCompleted: newBreakthroughCompleted,
    lastUpdated: Date.now()
  });
  
  spiritProfile.totalSpiritPower = newTotal;
  spiritProfile.currentTier = newLevel.tier;
  spiritProfile.currentLevel = newLevel.level;
  spiritProfile.isBreakthroughReady = newLevel.needsBreakthrough;
  spiritProfile.breakthroughCompleted = newBreakthroughCompleted;
  
  const leveledUp = newLevel.level > oldLevel.level;
  
  return {
    profile: spiritProfile,
    oldLevel: oldLevel,
    newLevel: newLevel,
    leveledUp: leveledUp,
    spiritPowerAdded: spiritPower
  };
}

// 获取玩家的魂力信息（便捷函数）
async function getPlayerSpiritInfo(playerName) {
  const spiritProfile = await getSpiritPowerProfile(playerName);
  if (!spiritProfile) return null;
  
  // 使用突破状态计算等级
  const levelInfo = calculateSpiritLevel(spiritProfile.totalSpiritPower, spiritProfile.breakthroughCompleted);
  return {
    ...spiritProfile,
    ...levelInfo
  };
}

// Initialize App
const app = {
  async init() {
    await this.initDatabase();
    await this.loadSettings();
    await this.loadBooks();
    await this.loadWords();
    this.updateStats();
    this.renderRecentWords();
    this.renderBookTabs();
    this.renderLibrary();
    this.renderStats();
    this.setupEventListeners();
    this.requestFullscreen();
    this.showToast('欢迎使用智拍单词本！', 'success');
  },

  // 请求全屏显示
  requestFullscreen() {
    // 检测是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      // 尝试进入全屏模式
      const docEl = document.documentElement;

      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(err => {
          console.log('全屏请求失败:', err);
        });
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen().catch(err => {
          console.log('全屏请求失败:', err);
        });
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen().catch(err => {
          console.log('全屏请求失败:', err);
        });
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen().catch(err => {
          console.log('全屏请求失败:', err);
        });
      }

      // 隐藏地址栏（iOS Safari）
      window.scrollTo(0, 1);

      // 监听点击事件，用户交互后再次尝试进入全屏
      const enterFullscreen = () => {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen().catch(() => {});
        }
      };

      // 首次点击页面时尝试进入全屏
      document.addEventListener('click', enterFullscreen, { once: true });
      document.addEventListener('touchstart', enterFullscreen, { once: true });
    }
  },

  async initDatabase() {
    // Check if default book exists
    const defaultBook = await db.books.get({ bookId: 'default' });
    if (!defaultBook) {
      await db.books.add({
        bookId: 'default',
        bookName: '默认单词本',
        createdAt: Date.now()
      });
    }
    
    // Create high error book if not exists
    const errorBook = await db.books.get({ bookId: 'high-error' });
    if (!errorBook) {
      await db.books.add({
        bookId: 'high-error',
        bookName: '高频错词本',
        createdAt: Date.now()
      });
    }

    // Create reported words book if not exists
    const reportedBook = await db.books.get({ bookId: 'reported' });
    if (!reportedBook) {
      await db.books.add({
        bookId: 'reported',
        bookName: '报错单词本',
        createdAt: Date.now()
      });
    }

    // 初始化高频错词设置
    await this.initHighErrorSettings();

    // 数据迁移：将旧的 bookId 转换为 bookIds 数组
    await this.migrateBookIdToBookIds();
    
    // 数据迁移：将历史积分数据迁移到玩家档案系统
    await this.migratePlayerProfiles();
  },

  // 初始化高频错词设置
  async initHighErrorSettings() {
    const defaultSettings = {
      minPracticeCount: 5,        // 最少练习次数（低于此次数不计算正确率）
      accuracyThreshold: 60,      // 正确率阈值（%）
      errorCountThreshold: 3      // 错误次数阈值
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      const existing = await db.settings.get({ key: `highError_${key}` });
      if (!existing) {
        await db.settings.add({
          key: `highError_${key}`,
          value: value
        });
      }
    }
  },

  // 数据迁移：将单 bookId 转换为 bookIds 数组
  async migrateBookIdToBookIds() {
    try {
      const words = await db.words.toArray();
      for (const word of words) {
        // 如果单词有 bookId 但没有 bookIds，进行迁移
        if (word.bookId && (!word.bookIds || !Array.isArray(word.bookIds))) {
          await db.words.update(word.id, {
            bookIds: [word.bookId],
            bookId: undefined // 删除旧的 bookId 字段
          });
        }
      }
      console.log('BookId to BookIds migration completed');
    } catch (error) {
      console.error('Migration error:', error);
    }
  },

  // 数据迁移：将历史积分数据迁移到玩家档案系统
  async migratePlayerProfiles() {
    try {
      // 检查是否已经有玩家档案
      const existingProfiles = await db.playerProfiles.count();
      if (existingProfiles > 0) {
        console.log('Player profiles already exist, skipping migration');
        return;
      }

      // 获取所有练习成绩
      const scores = await db.practiceScores.toArray();
      if (scores.length === 0) {
        console.log('No practice scores to migrate');
        return;
      }

      // 按玩家名字分组累加积分
      const playerPoints = {};
      for (const score of scores) {
        if (!playerPoints[score.playerName]) {
          playerPoints[score.playerName] = 0;
        }
        playerPoints[score.playerName] += score.totalScore || 0;
      }

      // 创建玩家档案
      for (const [playerName, totalPoints] of Object.entries(playerPoints)) {
        const level = calculateLevel(totalPoints);
        await db.playerProfiles.add({
          playerName: playerName,
          totalPoints: totalPoints,
          level: level.id,
          lastPlayedAt: Date.now()
        });
      }

      console.log(`Player profiles migration completed. Created ${Object.keys(playerPoints).length} profiles.`);
    } catch (error) {
      console.error('Player profile migration error:', error);
    }
  },

  async loadSettings() {
    // API Key 已内置在代码中，不从本地存储加载
    // 保持默认配置：智谱AI GLM-4.6V-Flash
    console.log('Using built-in API configuration');
  },

  // 加载高频错词设置
  async loadHighErrorSettings() {
    const settings = {};
    const keys = ['minPracticeCount', 'accuracyThreshold', 'errorCountThreshold'];
    
    for (const key of keys) {
      const setting = await db.settings.get({ key: `highError_${key}` });
      settings[key] = setting ? setting.value : this.getDefaultHighErrorSetting(key);
    }
    
    return settings;
  },

  // 获取默认高频错词设置
  getDefaultHighErrorSetting(key) {
    const defaults = {
      minPracticeCount: 5,
      accuracyThreshold: 60,
      errorCountThreshold: 3
    };
    return defaults[key];
  },

  // 保存高频错词设置
  async saveHighErrorSetting(key, value) {
    await db.settings.update(`highError_${key}`, { value: value });
  },

  async loadBooks() {
    state.books = await db.books.toArray();
    this.updateBookSelects();
    this.updateBookDatalist();
    this.updateFilterBookSelect();
  },

  async loadWords() {
    state.words = await db.words.toArray();
  },

  updateBookSelects() {
    const selects = ['target-book', 'practice-book-select', 'sentence-practice-book-select'];
    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (!select) return;

      // Keep first option for 'all' if it's practice select
      const currentValue = select.value;
      select.innerHTML = (selectId === 'practice-book-select' || selectId === 'sentence-practice-book-select')
        ? '<option value="all">全部单词</option>'
        : '';

      state.books.forEach(book => {
        if (book.bookId === 'high-error') return; // Skip high-error book
        const option = document.createElement('option');
        option.value = book.bookId;
        option.textContent = book.bookName;
        select.appendChild(option);
      });

      if (currentValue) select.value = currentValue;
    });
  },

  // 检查单词是否属于某个单词本
  wordBelongsToBook(word, bookId) {
    if (bookId === 'all') return true;
    const bookIds = word.bookIds || [];
    return bookIds.includes(bookId);
  },

  // Navigation
  navigate(page) {
    console.log('navigate 被调用，目标页面:', page);
    state.currentPage = page;
    
    // Update nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
      const onclick = item.getAttribute('onclick');
      if (onclick && onclick.includes(`'${page}'`)) {
        item.classList.add('active');
      }
    });
    
    // Update pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
    });
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) {
      pageEl.classList.add('active');
      console.log('页面已切换到:', page);
    } else {
      console.error('页面元素未找到: page-' + page);
      return;
    }
    
    // Refresh data
    if (page === 'library') {
      this.renderLibrary();
    } else if (page === 'stats') {
      this.renderStats();
    } else if (page === 'home') {
      this.updateStats();
      this.renderRecentWords();
    } else if (page === 'profile') {
      this.renderProfile();
    } else if (page === 'settings') {
      // 加载高频错词设置
      this.loadHighErrorSettingsToPage();
    } else if (page === 'soulbone-warehouse') {
      // 立即渲染魂骨仓库
      console.log('检测到魂骨仓库页面，准备渲染');
      this.renderSoulBoneWarehouseImmediately();
    }
  },

  // Stats
  async updateStats() {
    const totalWords = await db.words.count();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // 统计今日完成的完整练习次数
    const todayPracticeCount = await db.dailyPracticeSessions
      .filter(s => s.completedAt >= today.getTime() && s.completedAt <= todayEnd.getTime())
      .count();

    // 统计高频错词数量（属于 high-error 单词本的单词）
    const allWords = await db.words.toArray();
    const errorWords = allWords.filter(w => {
      const bookIds = w.bookIds || [];
      return bookIds.includes('high-error');
    }).length;
    
    const bookCount = await db.books.count();

    document.getElementById('stat-total-words').textContent = totalWords;
    document.getElementById('stat-today-practice').textContent = todayPracticeCount;
    document.getElementById('stat-error-words').textContent = errorWords;
    document.getElementById('stat-books').textContent = bookCount;
  },

  // Recent Words
  async renderRecentWords() {
    // 加载高频错词设置
    const settings = await this.loadHighErrorSettings();
    
    // 获取所有单词，筛选出高频错词
    const allWords = await db.words.toArray();
    const highErrorWords = allWords.filter(word => {
      const bookIds = word.bookIds || [];
      return bookIds.includes('high-error');
    });
    
    // 按错误次数降序排序，取前5个
    const topErrorWords = highErrorWords
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 5);
    
    const container = document.getElementById('home-error-words');
    
    if (topErrorWords.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎉</div>
          <div class="empty-title">暂无高频错词</div>
          <div class="empty-subtitle">当前设置：正确率低于${settings.accuracyThreshold}%且错误≥${settings.errorCountThreshold}次</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = topErrorWords.map(word => {
      const totalCount = (word.correctCount || 0) + (word.errorCount || 0);
      const accuracy = totalCount > 0 ? Math.round((word.correctCount || 0) / totalCount * 100) : 0;
      return `
      <div class="word-item" onclick="app.viewWordDetail('${word.id}')">
        <div class="word-info">
          <div class="word-text">${word.word}</div>
          <div class="word-translation">${word.translation}</div>
        </div>
        <div class="word-meta">
          <span class="error-badge zero">正确率 ${accuracy}%</span>
          <span class="error-badge">${word.errorCount} 次错误</span>
        </div>
      </div>
    `}).join('');
  },

  // Library
  updateFilterBookSelect() {
    const select = document.getElementById('filter-book');
    if (!select) return;
    
    // 保留当前选中的值
    const currentValue = select.value;
    
    // 重建选项列表
    select.innerHTML = '<option value="all">全部单词本</option>';
    
    state.books.forEach(book => {
      const option = document.createElement('option');
      option.value = book.bookId;
      option.textContent = book.bookName;
      select.appendChild(option);
    });
    
    // 检查之前选中的值是否仍然存在于新的选项列表中
    const optionExists = Array.from(select.options).some(opt => opt.value === currentValue);
    if (optionExists && currentValue !== 'all') {
      select.value = currentValue;
    } else {
      select.value = 'all';
    }
    
    // 强制触发change事件以确保UI更新
    select.dispatchEvent(new Event('change'));
  },

  async filterLibrary() {
    const bookFilter = document.getElementById('filter-book').value;
    const errorFilter = document.getElementById('filter-error-count').value;
    
    // 获取所有单词，然后按单词本筛选
    let words = await db.words.orderBy('word').toArray();
    
    // 先按单词本筛选
    if (bookFilter !== 'all') {
      words = words.filter(word => this.wordBelongsToBook(word, bookFilter));
    }
    
    // 再按错误次数筛选
    if (errorFilter !== 'all') {
      words = words.filter(word => {
        const count = word.errorCount;
        switch (errorFilter) {
          case '0': return count === 0;
          case '1-2': return count >= 1 && count <= 2;
          case '3-5': return count >= 3 && count <= 5;
          case '5+': return count > 5;
          default: return true;
        }
      });
    }
    
    const container = document.getElementById('library-words');
    
    if (words.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <div class="empty-title">暂无符合条件的单词</div>
          <div class="empty-subtitle">尝试调整筛选条件</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = words.map(word => {
      const isReported = word.isReported || (word.bookIds && word.bookIds.includes('reported'));
      return `
      <div class="word-item ${isReported ? 'reported' : ''}">
        <div class="word-info">
          <div class="word-text">${word.word}</div>
          <div class="word-translation">${word.translation}</div>
        </div>
        <div class="word-meta">
          ${isReported ? `<button class="table-btn" onclick="app.unreportWord(${word.id}, event)" title="取消报错" style="background: rgba(239, 68, 68, 0.1); color: var(--error);">⚠️</button>` : ''}
          <span class="error-badge zero">
            ${word.correctCount || 0} 次正确
          </span>
          <span class="error-badge ${word.errorCount === 0 ? 'zero' : ''}">
            ${word.errorCount} 次错误
          </span>
          <button class="table-btn" onclick="app.editWord(${word.id}, event)" title="修改">✏️</button>
          <button class="table-btn" onclick="app.deleteWord(${word.id}, event)" title="删除">🗑️</button>
        </div>
      </div>
    `}).join('');
  },

  async renderLibrary() {
    // 初始化筛选下拉菜单选项
    this.updateFilterBookSelect();

    // 使用筛选功能渲染列表
    await this.filterLibrary();
  },

  async searchWords(query) {
    // 获取当前筛选条件
    const bookFilter = document.getElementById('filter-book').value;
    const errorFilter = document.getElementById('filter-error-count').value;

    // 先获取基础单词列表
    let words = await db.words.orderBy('word').toArray();

    // 按单词本筛选
    if (bookFilter !== 'all') {
      words = words.filter(word => this.wordBelongsToBook(word, bookFilter));
    }

    // 按错误次数筛选
    if (errorFilter !== 'all') {
      words = words.filter(word => {
        const count = word.errorCount;
        switch (errorFilter) {
          case '0': return count === 0;
          case '1-2': return count >= 1 && count <= 2;
          case '3-5': return count >= 3 && count <= 5;
          case '5+': return count > 5;
          default: return true;
        }
      });
    }

    // 再按搜索关键词筛选 - 从首字母开始顺序匹配
    if (query.trim()) {
      const searchQuery = query.toLowerCase().trim();
      words = words.filter(w => {
        const wordLower = w.word.toLowerCase();
        // 检查单词是否以搜索词开头
        if (wordLower.startsWith(searchQuery)) {
          return true;
        }
        // 检查中文释义是否包含搜索词
        if (w.translation.includes(query.trim())) {
          return true;
        }
        return false;
      });
    }

    const container = document.getElementById('library-words');

    if (words.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-subtitle">未找到匹配的单词</div>
        </div>
      `;
      return;
    }

    container.innerHTML = words.map(word => {
      const isReported = word.isReported || (word.bookIds && word.bookIds.includes('reported'));
      return `
      <div class="word-item ${isReported ? 'reported' : ''}">
        <div class="word-info">
          <div class="word-text">${word.word}</div>
          <div class="word-translation">${word.translation}</div>
        </div>
        <div class="word-meta">
          ${isReported ? `<button class="table-btn" onclick="app.unreportWord(${word.id}, event)" title="取消报错" style="background: rgba(239, 68, 68, 0.1); color: var(--error);">⚠️</button>` : ''}
          <span class="error-badge zero">
            ${word.correctCount || 0} 次正确
          </span>
          <span class="error-badge ${word.errorCount === 0 ? 'zero' : ''}">
            ${word.errorCount} 次错误
          </span>
          <button class="table-btn" onclick="app.editWord(${word.id}, event)" title="修改">✏️</button>
          <button class="table-btn" onclick="app.deleteWord(${word.id}, event)" title="删除">🗑️</button>
        </div>
      </div>
    `}).join('');
  },

  async deleteWord(id, event) {
    event.stopPropagation();
    if (!confirm('确定要删除这个单词吗？')) return;

    await db.words.delete(id);
    await this.loadWords();
    await this.renderLibrary();
    this.updateStats();
    this.showToast('单词已删除', 'success');
  },

  // Edit Word
  async editWord(id, event) {
    event.stopPropagation();
    const word = await db.words.get(id);
    if (!word) {
      this.showToast('单词不存在', 'error');
      return;
    }

    document.getElementById('edit-word-id').value = id;
    document.getElementById('edit-word-text').value = word.word;
    document.getElementById('edit-word-translation').value = word.translation;
    document.getElementById('edit-word-modal').classList.add('active');
  },

  closeEditWordModal() {
    document.getElementById('edit-word-modal').classList.remove('active');
    document.getElementById('edit-word-id').value = '';
    document.getElementById('edit-word-text').value = '';
    document.getElementById('edit-word-translation').value = '';
  },

  async saveEditWord() {
    const id = parseInt(document.getElementById('edit-word-id').value);
    const wordText = document.getElementById('edit-word-text').value.trim();
    const translation = document.getElementById('edit-word-translation').value.trim();

    if (!wordText || !translation) {
      this.showToast('请填写完整的单词信息', 'error');
      return;
    }

    // 检查是否有其他单词使用相同的单词文本
    const existing = await db.words.get({ word: wordText });
    if (existing && existing.id !== id) {
      this.showToast('该单词已存在', 'error');
      return;
    }

    await db.words.update(id, {
      word: wordText,
      translation: translation
    });

    this.closeEditWordModal();
    await this.loadWords();
    await this.renderLibrary();
    this.showToast('单词已更新', 'success');
  },

  // Image Source Selection
  openImageSourceModal() {
    document.getElementById('image-source-modal').classList.add('active');
  },

  closeImageSourceModal() {
    document.getElementById('image-source-modal').classList.remove('active');
  },

  chooseFromGallery() {
    this.closeImageSourceModal();
    document.getElementById('camera-input').click();
  },

  // Home Page Image Upload
  async handleHomeImageSelect(input) {
    const file = input.files[0];
    if (!file) return;
    
    // 直接处理图片，跳过图片来源选择
    await this.processImageFile(file);
    
    // 清空 input，允许重复选择同一文件
    input.value = '';
  },

  // Home Page TXT Upload
  async handleHomeTxtSelect(input) {
    const file = input.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.name.endsWith('.txt')) {
      this.showToast('请选择TXT格式的文件', 'error');
      input.value = '';
      return;
    }
    
    // 检查文件大小（最大1MB）
    if (file.size > 1024 * 1024) {
      this.showToast('文件大小超过1MB限制', 'error');
      input.value = '';
      return;
    }
    
    await this.processTxtFile(file);
    
    // 清空 input，允许重复选择同一文件
    input.value = '';
  },

  // Process TXT File
  async processTxtFile(file) {
    this.showLoading('正在读取文件...');
    
    try {
      const text = await this.readTxtFile(file);
      
      if (!text || text.trim().length === 0) {
        this.hideLoading();
        this.showToast('文件内容为空', 'error');
        return;
      }
      
      this.hideLoading();
      this.showLoading('正在AI识别单词...');
      
      // 调用大模型识别文本中的单词
      const results = await this.recognizeWordsFromText(text);
      
      if (results.length === 0) {
        this.hideLoading();
        this.showToast('未能识别到有效的单词', 'error');
        return;
      }
      
      state.recognitionResults = results;
      
      // 打开相机模态框（复用图片识别的结果展示界面）
      document.getElementById('camera-modal').classList.add('active');
      document.getElementById('camera-step-1').style.display = 'none';
      document.getElementById('camera-step-2').style.display = 'block';
      document.getElementById('camera-footer').style.display = 'flex';
      
      // 隐藏图片预览和裁剪相关元素
      document.getElementById('preview-container').style.display = 'none';
      document.getElementById('confirm-area-btn').style.display = 'none';
      
      // 显示识别结果状态
      document.getElementById('recognition-status').style.display = 'block';
      document.getElementById('recognized-count').textContent = results.length;
      
      // 渲染识别结果
      this.renderRecognitionResults();
      
      this.hideLoading();
      this.showToast(`成功识别 ${results.length} 个单词`, 'success');
    } catch (error) {
      this.hideLoading();
      this.showToast('文件处理失败: ' + error.message, 'error');
      console.error(error);
    }
  },

  // Read TXT File
  readTxtFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'UTF-8');
    });
  },

  // Recognize Words from Text using AI
  async recognizeWordsFromText(text) {
    const { provider, key, url } = state.apiSettings;
    
    if (!key) {
      // Demo mode - return mock data
      return this.getMockRecognitionResults();
    }
    
    const prompt = `请从以下文本中提取所有英文单词和对应的中文释义。以JSON格式返回，格式如下：
[
  {"word": "apple", "translation": "n. 苹果"},
  {"word": "run", "translation": "v. 跑，奔跑"},
  {"word": "beautiful", "translation": "adj. 美丽的，漂亮的"}
]
要求：
1. 只返回JSON数组，不要其他文字
2. word字段只包含纯英文字母，不要包含数字、标点或特殊符号
3. translation字段必须包含词性标注（如n., v., adj., adv., prep., conj., pron., art., num., interj.等），格式为"词性. 中文释义"
4. 确保每个单词都准确识别
5. 如果文本中有重复单词，只保留一个

文本内容：
${text}`;

    let response;
    
    if (provider === 'openai') {
      response = await fetch(url || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000
        })
      });
    } else if (provider === 'gemini') {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt }
            ]
          }]
        })
      });
    } else if (provider === 'glm') {
      // GLM-4-Flash API (免费版本)
      response = await fetch(url || 'https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'GLM-4-Flash',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000
        })
      });
    } else if (provider === 'glm4v') {
      // GLM-4V 标准版
      response = await fetch(url || 'https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'glm-4',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000
        })
      });
    } else {
      throw new Error('不支持的API提供商');
    }
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('API Error:', errorData);
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    let content;
    
    if (provider === 'openai' || provider === 'glm' || provider === 'glm4v') {
      content = data.choices[0].message.content;
    } else {
      content = data.candidates[0].content.parts[0].text;
    }
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const results = JSON.parse(jsonMatch[0]);
        // Validate and clean results
        if (Array.isArray(results) && results.length > 0) {
          return results
            .map(item => ({
              word: this.cleanWord(item.word),
              translation: item.translation || ''
            }))
            .filter(item => item.word && item.translation);
        }
      } catch (e) {
        console.error('JSON parse error:', e);
      }
    }
    
    // If no valid JSON found, try to parse line by line
    const lines = content.split('\n').filter(line => line.trim());
    const results = [];
    for (const line of lines) {
      const match = line.match(/["']?word["']?\s*[:=]\s*["']([^"']+)["']/i);
      const transMatch = line.match(/["']?translation["']?\s*[:=]\s*["']([^"']+)["']/i);
      if (match && transMatch) {
        const cleanedWord = this.cleanWord(match[1]);
        if (cleanedWord && transMatch[1]) {
          results.push({ word: cleanedWord, translation: transMatch[1] });
        }
      }
    }
    
    if (results.length > 0) {
      return results;
    }
    
    throw new Error('无法解析识别结果，请重试或手动输入');
  },

  // Camera & AI Recognition
  openCamera() {
    document.getElementById('camera-modal').classList.add('active');
    this.resetCamera();
  },

  closeCamera() {
    document.getElementById('camera-modal').classList.remove('active');
    this.stopCamera();
    this.resetCamera();
  },

  resetCamera() {
    document.getElementById('camera-step-1').style.display = 'block';
    document.getElementById('camera-step-2').style.display = 'none';
    document.getElementById('camera-footer').style.display = 'none';
    document.getElementById('camera-input').value = '';
    document.getElementById('crop-overlay').style.display = 'none';
    
    // 恢复可能隐藏的元素（TXT上传时会隐藏这些）
    const previewContainer = document.getElementById('preview-container');
    const confirmAreaBtn = document.getElementById('confirm-area-btn');
    if (previewContainer) previewContainer.style.display = 'block';
    if (confirmAreaBtn) confirmAreaBtn.style.display = 'inline-flex';
    
    document.getElementById('recognition-status').style.display = 'none';
    state.recognitionResults = [];
    state.currentImageData = null;
    state.currentRotation = 0;
  },

  // Live Camera Functions
  async startCamera() {
    this.closeImageSourceModal();
    
    try {
      state.currentCameraFacing = 'environment'; // 默认后置摄像头
      await this.openCameraStream();
      document.getElementById('live-camera-modal').classList.add('active');
    } catch (error) {
      console.error('无法访问摄像头:', error);
      this.showToast('无法访问摄像头，请检查权限设置', 'error');
      // Fallback to file input
      document.getElementById('camera-input').click();
    }
  },

  async openCameraStream() {
    const constraints = {
      video: {
        facingMode: state.currentCameraFacing,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };

    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(track => track.stop());
    }

    state.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById('live-camera-video');
    video.srcObject = state.mediaStream;
  },

  stopCamera() {
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(track => track.stop());
      state.mediaStream = null;
    }
    document.getElementById('live-camera-modal').classList.remove('active');
  },

  async switchCamera() {
    state.currentCameraFacing = state.currentCameraFacing === 'environment' ? 'user' : 'environment';
    try {
      await this.openCameraStream();
    } catch (error) {
      this.showToast('切换摄像头失败', 'error');
    }
  },

  capturePhoto() {
    const video = document.getElementById('live-camera-video');
    const canvas = document.getElementById('live-camera-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Compress and convert to file
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      this.stopCamera();
      await this.processImageFile(file);
    }, 'image/jpeg', 0.9);
  },

  // Image Processing
  async handleImageSelect(input) {
    const file = input.files[0];
    if (!file) return;
    await this.processImageFile(file);
  },

  async processImageFile(file) {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.showToast('图片大小超过5MB限制，请压缩后重试', 'error');
      return;
    }

    this.showLoading('正在处理图片...');

    try {
      // Compress image
      const compressedImageData = await this.compressImage(file);
      state.currentImageData = compressedImageData;
      
      // Open camera modal and show step 2
      document.getElementById('camera-modal').classList.add('active');
      document.getElementById('camera-step-1').style.display = 'none';
      document.getElementById('camera-step-2').style.display = 'block';
      document.getElementById('camera-footer').style.display = 'flex';
      
      // Show preview
      document.getElementById('preview-image').src = compressedImageData;
      
      // 自动显示裁剪框，让用户选择识别区域
      setTimeout(() => {
        this.showCropArea();
      }, 100);
      
      // 清空之前的结果
      state.recognitionResults = [];
      this.renderRecognitionResults();
      
      this.hideLoading();
      this.showToast('请调整识别区域，然后点击"确认区域"', 'success');
    } catch (error) {
      this.hideLoading();
      this.showToast('图片处理失败: ' + error.message, 'error');
      console.error(error);
    }
  },

  // 显示裁剪区域
  showCropArea() {
    const overlay = document.getElementById('crop-overlay');
    const confirmBtn = document.getElementById('confirm-area-btn');
    
    overlay.style.display = 'block';
    if (confirmBtn) confirmBtn.style.display = 'inline-flex';
    
    // 初始化裁剪区域为整张图片
    setTimeout(() => imageEditor.initCropArea(), 50);
  },

  compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate compressed dimensions
          const maxWidth = 1200;
          const maxHeight = 1200;
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress with quality 0.8
          const compressedData = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedData);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Image Rotation
  rotateImage(degrees) {
    state.currentRotation = (state.currentRotation + degrees) % 360;
    document.getElementById('preview-image').style.transform = `rotate(${state.currentRotation}deg)`;
    // Re-initialize crop area after rotation
    if (document.getElementById('crop-overlay').style.display === 'block') {
      setTimeout(() => imageEditor.initCropArea(), 300);
    }
  },

  // Image Cropping
  toggleCrop() {
    const overlay = document.getElementById('crop-overlay');
    const applyBtn = document.getElementById('apply-crop-btn');
    const cropToggleBtn = document.getElementById('crop-toggle-btn');
    const isVisible = overlay.style.display === 'block';
    
    if (isVisible) {
      overlay.style.display = 'none';
      applyBtn.style.display = 'none';
      cropToggleBtn.innerHTML = '<span>✂️</span> 裁剪';
    } else {
      overlay.style.display = 'block';
      applyBtn.style.display = 'inline-flex';
      cropToggleBtn.innerHTML = '<span>✕</span> 取消裁剪';
      // Initialize crop area with resize handles
      setTimeout(() => imageEditor.initCropArea(), 100);
    }
  },

  // 确认区域并执行识别
  async confirmAreaAndRecognize() {
    this.showLoading('正在识别选中区域...');
    
    try {
      // 裁剪选中区域
      const croppedData = await imageEditor.cropImage(state.currentImageData);
      state.currentImageData = croppedData;
      
      // 更新预览为裁剪后的图片
      document.getElementById('preview-image').src = croppedData;
      
      // 重置旋转
      state.currentRotation = 0;
      document.getElementById('preview-image').style.transform = 'rotate(0deg)';
      
      // 隐藏裁剪框
      document.getElementById('crop-overlay').style.display = 'none';
      
      // 执行AI识别
      const base64Image = croppedData.split(',')[1];
      const results = await this.recognizeWords(base64Image);
      state.recognitionResults = results;
      
      // 渲染结果
      this.renderRecognitionResults();
      
      // 显示识别结果状态
      document.getElementById('recognition-status').style.display = 'block';
      document.getElementById('recognized-count').textContent = results.length;
      
      this.hideLoading();
      this.showToast(`成功识别 ${results.length} 个单词`, 'success');
    } catch (error) {
      this.hideLoading();
      this.showToast('识别失败: ' + error.message, 'error');
      console.error(error);
    }
  },

  async applyCrop() {
    // 已合并到 confirmAreaAndRecognize
    await this.confirmAreaAndRecognize();
  },

  async reRecognizeWords() {
    this.showLoading('正在重新识别...');
    
    try {
      const base64Image = state.currentImageData.split(',')[1];
      const results = await this.recognizeWords(base64Image);
      state.recognitionResults = results;
      this.renderRecognitionResults();
      
      // 更新识别结果状态
      document.getElementById('recognized-count').textContent = results.length;
      
      this.hideLoading();
      this.showToast(`重新识别完成，找到 ${results.length} 个单词`, 'success');
    } catch (error) {
      this.hideLoading();
      this.showToast('识别失败: ' + error.message, 'error');
    }
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // 清理单词，保留英文字母和连词符号
  cleanWord(word) {
    if (!word || typeof word !== 'string') return '';
    // 保留英文字母和连词符号"-"，去除数字、标点、其他特殊符号等
    return word.replace(/[^a-zA-Z-]/g, '').toLowerCase();
  },

  async recognizeWords(base64Image) {
    const { provider, key, url } = state.apiSettings;
    
    if (!key) {
      // Demo mode - return mock data
      return this.getMockRecognitionResults();
    }
    
    const prompt = `请仔细识别图片中的所有英文单词和对应的中文释义。以JSON格式返回，格式如下：
[
  {"word": "apple", "translation": "n. 苹果"},
  {"word": "run", "translation": "v. 跑，奔跑"},
  {"word": "beautiful", "translation": "adj. 美丽的，漂亮的"}
]
要求：
1. 只返回JSON数组，不要其他文字
2. word字段只包含纯英文字母，不要包含数字、标点或特殊符号
3. translation字段必须包含词性标注（如n., v., adj., adv., prep., conj., pron., art., num., interj.等），格式为"词性. 中文释义"
4. 确保每个单词都准确识别`;

    let response;
    
    if (provider === 'openai') {
      response = await fetch(url || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
              ]
            }
          ],
          max_tokens: 2000
        })
      });
    } else if (provider === 'gemini') {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
            ]
          }]
        })
      });
    } else if (provider === 'glm') {
      // GLM-4.6V-Flash API (免费版本)
      // 文档: https://docs.bigmodel.cn/api-reference/模型-api/对话补全#视觉模型
      response = await fetch(url || 'https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'GLM-4.6V-Flash',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
                { type: 'text', text: prompt }
              ]
            }
          ],
          max_tokens: 2000
        })
      });
    } else if (provider === 'glm4v') {
      // GLM-4V 标准版
      response = await fetch(url || 'https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'glm-4v',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
                { type: 'text', text: prompt }
              ]
            }
          ],
          max_tokens: 2000
        })
      });
    } else {
      throw new Error('不支持的API提供商');
    }
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('API Error:', errorData);
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    let content;
    
    if (provider === 'openai' || provider === 'glm') {
      content = data.choices[0].message.content;
    } else {
      content = data.candidates[0].content.parts[0].text;
    }
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const results = JSON.parse(jsonMatch[0]);
        // Validate and clean results
        if (Array.isArray(results) && results.length > 0) {
          return results
            .map(item => ({
              word: this.cleanWord(item.word),
              translation: item.translation || ''
            }))
            .filter(item => item.word && item.translation);
        }
      } catch (e) {
        console.error('JSON parse error:', e);
      }
    }
    
    // If no valid JSON found, try to parse line by line
    const lines = content.split('\n').filter(line => line.trim());
    const results = [];
    for (const line of lines) {
      const match = line.match(/["']?word["']?\s*[:=]\s*["']([^"']+)["']/i);
      const transMatch = line.match(/["']?translation["']?\s*[:=]\s*["']([^"']+)["']/i);
      if (match && transMatch) {
        const cleanedWord = this.cleanWord(match[1]);
        if (cleanedWord && transMatch[1]) {
          results.push({ word: cleanedWord, translation: transMatch[1] });
        }
      }
    }
    
    if (results.length > 0) {
      return results;
    }
    
    throw new Error('无法解析识别结果，请重试或手动输入');
  },

  getMockRecognitionResults() {
    return [
      { word: 'abandon', translation: '放弃，抛弃' },
      { word: 'ability', translation: '能力，才能' },
      { word: 'absolute', translation: '绝对的，完全的' },
      { word: 'academic', translation: '学术的，学院的' },
      { word: 'accept', translation: '接受，认可' }
    ];
  },

  renderRecognitionResults() {
    const tbody = document.getElementById('recognition-tbody');
    tbody.innerHTML = state.recognitionResults.map((item, index) => `
      <tr data-index="${index}">
        <td><input type="text" value="${item.word}" class="word-input" data-field="word"></td>
        <td><input type="text" value="${item.translation}" class="word-input" data-field="translation"></td>
        <td>
          <div class="table-actions">
            <button class="table-btn" onclick="app.removeRecognitionRow(${index})">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  addEmptyRow() {
    state.recognitionResults.push({ word: '', translation: '' });
    this.renderRecognitionResults();
  },

  removeRecognitionRow(index) {
    state.recognitionResults.splice(index, 1);
    this.renderRecognitionResults();
  },

  async confirmImport() {
    // Get updated values from inputs
    const rows = document.querySelectorAll('#recognition-tbody tr');
    const words = [];

    rows.forEach(row => {
      const wordInput = row.querySelector('[data-field="word"]');
      const transInput = row.querySelector('[data-field="translation"]');
      const word = wordInput.value.trim();
      const translation = transInput.value.trim();

      if (word && translation) {
        words.push({ word, translation });
      }
    });

    if (words.length === 0) {
      this.showToast('没有有效的单词可以导入', 'error');
      return;
    }

    const bookId = document.getElementById('target-book').value;
    const duplicates = [];
    const importedWords = [];

    for (const item of words) {
      // Check for duplicates
      const existing = await db.words.get({ word: item.word });

      if (existing) {
        duplicates.push({ ...item, existing });
      } else {
        const newId = await db.words.add({
          word: item.word,
          translation: item.translation,
          bookIds: [bookId],
          errorCount: 0,
          correctCount: 0,
          createdAt: Date.now(),
          lastPracticed: 0
        });
        importedWords.push({
          id: newId,
          word: item.word,
          translation: item.translation,
          bookIds: [bookId],
          errorCount: 0,
          correctCount: 0
        });
      }
    }

    // Handle duplicates with batch modal
    if (duplicates.length > 0) {
      await this.showDuplicateBatchModal(duplicates, bookId, importedWords);
    } else {
      // No duplicates, finish import directly
      this.finishImport(importedWords);
    }
  },

  // Show duplicate batch processing modal
  showDuplicateBatchModal(duplicates, bookId, importedWords) {
    return new Promise((resolve) => {
      this.duplicateBatchData = {
        duplicates,
        bookId,
        importedWords,
        currentIndex: 0,
        resolve
      };

      // Update count
      document.getElementById('duplicate-count').textContent = duplicates.length;

      // Render duplicate list
      this.renderDuplicateList();

      // Show modal
      document.getElementById('duplicate-batch-modal').classList.add('active');
    });
  },

  // Render duplicate list in modal
  renderDuplicateList() {
    const { duplicates } = this.duplicateBatchData;
    const listContainer = document.getElementById('duplicate-list');

    listContainer.innerHTML = duplicates.map((dup, index) => `
      <div class="duplicate-item" data-index="${index}" style="
        padding: 12px;
        background: var(--bg-primary);
        border-radius: var(--radius);
        border: 2px solid var(--border);
        transition: var(--transition);
      ">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <div style="font-weight: 600; font-size: 16px; color: var(--text-primary);">${dup.word}</div>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
              现有释义: ${dup.existing.translation}
            </div>
            <div style="font-size: 13px; color: var(--primary); margin-top: 2px;">
              新释义: ${dup.translation}
            </div>
          </div>
          <span class="duplicate-status" data-index="${index}" style="
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            background: var(--bg-tertiary);
            color: var(--text-secondary);
          ">待处理</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm btn-primary" onclick="app.handleDuplicateItem(${index}, 'replace')" style="flex: 1; padding: 6px 12px; font-size: 13px;">
            替换
          </button>
          <button class="btn btn-sm btn-secondary" onclick="app.handleDuplicateItem(${index}, 'skip')" style="flex: 1; padding: 6px 12px; font-size: 13px;">
            跳过
          </button>
        </div>
      </div>
    `).join('');
  },

  // Handle individual duplicate item action
  async handleDuplicateItem(index, action) {
    const { duplicates, bookId, importedWords } = this.duplicateBatchData;
    const dup = duplicates[index];

    // Update UI for this item
    const itemEl = document.querySelector(`.duplicate-item[data-index="${index}"]`);
    const statusEl = document.querySelector(`.duplicate-status[data-index="${index}"]`);

    if (action === 'replace') {
      // Replace: update existing word
      const existingBookIds = dup.existing.bookIds || [];
      if (!existingBookIds.includes(bookId)) {
        await db.words.update(dup.existing.id, {
          translation: dup.translation,
          bookIds: [...existingBookIds, bookId]
        });
      }
      importedWords.push({
        id: dup.existing.id,
        word: dup.word,
        translation: dup.translation,
        bookIds: [...existingBookIds, bookId],
        errorCount: dup.existing.errorCount || 0,
        correctCount: dup.existing.correctCount || 0
      });

      itemEl.style.borderColor = 'var(--success)';
      itemEl.style.opacity = '0.7';
      statusEl.textContent = '已替换';
      statusEl.style.background = 'var(--success)';
      statusEl.style.color = '#fff';
    } else {
      // Skip: add existing word to practice list
      importedWords.push({
        id: dup.existing.id,
        word: dup.existing.word,
        translation: dup.existing.translation,
        bookIds: dup.existing.bookIds || [],
        errorCount: dup.existing.errorCount || 0,
        correctCount: dup.existing.correctCount || 0
      });
      
      itemEl.style.borderColor = 'var(--text-tertiary)';
      itemEl.style.opacity = '0.5';
      statusEl.textContent = '已跳过';
      statusEl.style.background = 'var(--text-tertiary)';
      statusEl.style.color = '#fff';
    }

    // Disable buttons for this item
    const buttons = itemEl.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);

    // Check if all items are processed
    this.duplicateBatchData.currentIndex++;
    const allProcessed = duplicates.every((_, i) => {
      const el = document.querySelector(`.duplicate-status[data-index="${i}"]`);
      return el && el.textContent !== '待处理';
    });

    if (allProcessed) {
      this.closeDuplicateBatchModal();
      this.duplicateBatchData.resolve();
      this.finishImport(importedWords);
    }
  },

  // Apply batch action to all remaining items
  async applyBatchAction(action) {
    const { duplicates, bookId, importedWords } = this.duplicateBatchData;

    // Mark that we're doing batch action to prevent double call to finishImport
    this.duplicateBatchData.isBatchAction = true;

    for (let i = 0; i < duplicates.length; i++) {
      const statusEl = document.querySelector(`.duplicate-status[data-index="${i}"]`);
      if (statusEl && statusEl.textContent === '待处理') {
        await this.handleDuplicateItem(i, action);
      }
    }

    // Batch action completion is handled by the last handleDuplicateItem call
    // No need to call finishImport here as it's already called when all items are processed
  },

  // Close duplicate batch modal
  closeDuplicateBatchModal() {
    document.getElementById('duplicate-batch-modal').classList.remove('active');
    if (this.duplicateBatchData && this.duplicateBatchData.resolve) {
      this.duplicateBatchData.resolve();
    }
  },

  // Finish import process
  async finishImport(importedWords) {
    this.closeCamera();
    await this.loadWords();
    this.updateStats();
    this.renderRecentWords();
    this.showToast(`成功导入 ${importedWords.length} 个单词`, 'success');

    // Ask if want to practice
    if (importedWords.length > 0 && confirm('是否立即开始拼写练习？')) {
      this.startPracticeWithWords(importedWords);
    }
  },

  // 使用指定单词开始练习
  startPracticeWithWords(words) {
    if (words.length === 0) {
      this.showToast('没有单词可以练习', 'error');
      return;
    }

    // 设置练习单词
    state.practiceWords = this.shuffleArray(words);
    state.currentPracticeIndex = 0;
    state.wrongWordsInRound = []; // 重置本轮错误单词记录
    state.consecutiveCorrectCount = 0; // 重置连续正确计数
    state.practiceScore = 0; // 重置练习积分
    state.totalWordsInPractice = state.practiceWords.length; // 记录总单词数

    // 初始化僵尸游戏状态
    this.initZombieGame(state.practiceWords.length);

    // 切换到练习页面
    state.currentPage = 'practice';

    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelectorAll('.nav-item')[2].classList.add('active'); // 练习按钮

    // 更新页面显示
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
    });
    document.getElementById('page-practice').classList.add('active');

    // 显示练习区域
    document.getElementById('practice-setup').style.display = 'none';
    document.getElementById('practice-area').style.display = 'block';

    // 隐藏底部导航栏
    document.querySelector('.bottom-nav').style.display = 'none';

    // 隐藏 header 并调整内容位置
    document.querySelector('.header').classList.add('hidden');
    document.querySelector('.main-content').classList.add('practice-mode');

    this.showNextWord();
  },

  // Practice
  async startPractice(mode) {
    const bookId = document.getElementById('practice-book-select').value;
    const count = parseInt(document.getElementById('practice-count').value) || 10;

    let words;
    if (mode === 'error') {
      // High error words - 属于 high-error 单词本的单词
      const allWords = await db.words.toArray();
      words = allWords.filter(w => {
        const bookIds = w.bookIds || [];
        return bookIds.includes('high-error');
      });
      if (words.length === 0) {
        this.showToast('没有高频错词，先去练习吧！', 'error');
        return;
      }
    } else if (bookId === 'all') {
      words = await db.words.toArray();
    } else {
      // 获取所有单词，然后筛选属于该单词本的
      words = await db.words.toArray();
      words = words.filter(word => this.wordBelongsToBook(word, bookId));
    }

    if (words.length === 0) {
      this.showToast('所选单词本为空', 'error');
      return;
    }

    // Shuffle and limit
    state.practiceWords = this.shuffleArray(words).slice(0, Math.min(count, words.length));
    state.currentPracticeIndex = 0;
    state.wrongWordsInRound = []; // 重置本轮错误单词记录
    state.consecutiveCorrectCount = 0; // 重置连续正确计数
    state.practiceScore = 0; // 重置练习积分
    state.totalWordsInPractice = state.practiceWords.length; // 记录总单词数
    state.firstRoundTotalWords = state.practiceWords.length; // 记录第一轮总单词数（用于正确率计算）
    state.correctWordsInPractice = 0; // 重置正确数
    state.firstRoundCorrectIds = []; // 重置第一轮正确单词记录
    state.firstRoundWrongIds = []; // 重置第一轮错误单词记录

    // 初始化僵尸游戏状态
    this.initZombieGame(state.practiceWords.length);

    // 隐藏设置区域
    document.getElementById('practice-setup').style.display = 'none';

    // 显示练习区域
    document.getElementById('practice-area').style.display = 'block';

    // 隐藏底部导航栏
    document.querySelector('.bottom-nav').style.display = 'none';

    // 隐藏 header 并调整内容位置
    document.querySelector('.header').classList.add('hidden');
    document.querySelector('.main-content').classList.add('practice-mode');

    // 先显示第一个单词
    this.showNextWord();

    // 启动倒计时动画（纯视觉效果，不影响单词显示）
    this.startPracticeCountdown();
  },

  // 倒数开始仪式 - 纯视觉效果，透明背景叠加在练习内容上
  startPracticeCountdown() {
    const countdownEl = document.getElementById('practice-countdown');
    const numberEl = document.getElementById('practice-countdown-number');
    const textEl = document.querySelector('.practice-countdown-text');

    // 显示倒数动画层（透明背景，底层内容可见）
    countdownEl.style.display = 'flex';

    // 倒数数字
    let count = 3;
    const countdownTexts = ['准备开始', '集中注意力', '即将开始'];

    const updateCountdown = () => {
      if (count > 0) {
        // 更新数字和文字
        numberEl.textContent = count;
        textEl.textContent = countdownTexts[3 - count];

        // 重新触发动画
        numberEl.style.animation = 'none';
        numberEl.offsetHeight; // 强制重绘
        numberEl.style.animation = 'practiceCountdownNumberPulse 1s ease-out';

        count--;
        setTimeout(updateCountdown, 1000);
      } else {
        // 显示 "GO!"
        numberEl.textContent = 'GO!';
        numberEl.classList.add('go-text');
        textEl.textContent = '开始拼写！';

        // 延迟后隐藏倒数层
        setTimeout(() => {
          countdownEl.style.display = 'none';
          numberEl.classList.remove('go-text');
          // 倒计时结束后给输入框设置焦点
          const input = document.getElementById('practice-input');
          if (input) input.focus();
        }, 600);
      }
    };

    // 开始倒数
    updateCountdown();
  },

  // 创建倒数粒子效果 - 在练习区域内
  createPracticeCountdownParticles(container, count = 12) {
    // 获取练习区域的中心位置
    const practiceArea = document.getElementById('practice-area');
    const rect = practiceArea.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'practice-countdown-particle';

      // 随机角度和距离
      const angle = (360 / count) * i + Math.random() * 30;
      const distance = 80 + Math.random() * 100;
      const rad = (angle * Math.PI) / 180;

      const tx = Math.cos(rad) * distance;
      const ty = Math.sin(rad) * distance;

      particle.style.left = centerX + 'px';
      particle.style.top = centerY + 'px';
      particle.style.setProperty('--tx', tx + 'px');
      particle.style.setProperty('--ty', ty + 'px');

      // 随机颜色
      const colors = ['#3B82F6', '#60A5FA', '#10B981', '#34D399', '#F59E0B'];
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];

      container.appendChild(particle);

      // 动画结束后移除
      setTimeout(() => particle.remove(), 1500);
    }
  },

  showNextWord() {
    if (state.currentPracticeIndex >= state.practiceWords.length) {
      // 一轮结束，检查是否有拼写错误的单词
      if (state.wrongWordsInRound.length > 0) {
        // 有错误单词，将它们加入练习列表再次练习
        const wrongCount = state.wrongWordsInRound.length;
        this.showToast(`本轮有 ${wrongCount} 个单词需要复习`, 'info');

        // 将错误单词重新加入练习列表（随机排序）
        state.practiceWords = this.shuffleArray([...state.wrongWordsInRound]);
        state.currentPracticeIndex = 0;
        state.wrongWordsInRound = []; // 清空错误记录，准备新一轮

        // 短暂延迟后显示下一个单词
        setTimeout(() => {
          this.showNextWord();
        }, 1500);
        return;
      }

      // 没有错误单词，练习真正完成
      this.showPracticeCompleteModal();
      return;
    }

    const word = state.practiceWords[state.currentPracticeIndex];
    document.getElementById('practice-translation').textContent = word.translation;
    document.getElementById('practice-input').value = '';
    document.getElementById('practice-input').focus();

    // Update progress
    const progress = ((state.currentPracticeIndex) / state.practiceWords.length) * 100;
    document.getElementById('practice-progress-fill').style.width = `${progress}%`;
    document.getElementById('practice-current').textContent = state.currentPracticeIndex + 1;
    document.getElementById('practice-total').textContent = state.practiceWords.length;

    // Update current score display
    this.updateScoreDisplay();

    // Hide feedback
    const feedback = document.getElementById('practice-feedback');
    feedback.classList.remove('show', 'correct', 'incorrect');

    // Update button
    const btn = document.getElementById('practice-check-btn');
    btn.textContent = '检查';
    btn.onclick = () => this.checkAnswer();

    // 恢复输入框回车事件为检查答案
    const input = document.getElementById('practice-input');
    input.onkeypress = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.checkAnswer();
      }
    };

    // 确保输入框获得焦点
    input.focus();
  },

  // 更新积分显示
  updateScoreDisplay() {
    const scoreEl = document.getElementById('practice-current-score');
    if (scoreEl) {
      scoreEl.textContent = state.practiceScore;
    }
  },

  // 报错当前单词
  async reportWord() {
    const word = state.practiceWords[state.currentPracticeIndex];
    if (!word) {
      this.showToast('当前没有单词可报错', 'error');
      return;
    }

    // 确认是否报错
    if (!confirm(`确定要报错单词 "${word.word}" 吗？\n释义：${word.translation}`)) {
      return;
    }

    try {
      // 标记单词为已报错
      const bookIds = word.bookIds || [];
      if (!bookIds.includes('reported')) {
        bookIds.push('reported');
      }

      await db.words.update(word.id, {
        bookIds: bookIds,
        isReported: true
      });

      this.showToast(`单词 "${word.word}" 已标记为报错`, 'success');

      // 自动进入下一词
      setTimeout(() => {
        state.currentPracticeIndex++;
        this.showNextWord();
      }, 1000);
    } catch (error) {
      console.error('报错失败:', error);
      this.showToast('报错失败，请重试', 'error');
    }
  },

  // 取消报错单词
  async unreportWord(id, event) {
    event.stopPropagation();
    
    try {
      const word = await db.words.get(id);
      if (!word) {
        this.showToast('单词不存在', 'error');
        return;
      }

      // 从 bookIds 中移除 'reported'
      let bookIds = word.bookIds || [];
      bookIds = bookIds.filter(bookId => bookId !== 'reported');

      await db.words.update(id, {
        bookIds: bookIds,
        isReported: false
      });

      this.showToast(`单词 "${word.word}" 已取消报错`, 'success');
      
      // 刷新词库显示
      await this.renderLibrary();
    } catch (error) {
      console.error('取消报错失败:', error);
      this.showToast('取消报错失败，请重试', 'error');
    }
  },

  // 初始化僵尸游戏（阶段六：任务 6.3）
  async initZombieGame(wordCount) {
    const baseTime = wordCount * 7.5; // 每个单词 7.5 秒（原为 15 秒，速度提高1倍）
    const playerId = await this.getCurrentPlayerId();
    const playerStats = await calculatePlayerStats(playerId);
    
    const slowEffect = playerStats.zombieSlow || 0;
    const adjustedTime = baseTime / (1 - slowEffect);
    
    state.zombieTotalTime = adjustedTime;
    state.zombiePosition = 0;
    state.zombieStartTime = Date.now();
    state.zombiePushBack = 0;
    state.zombieForward = 0;
    state.playerStats = playerStats;
    state.playerMaxHealth = playerStats.health;
    state.playerCurrentHealth = playerStats.health;
    state.extraLifeUsed = false;
    state.zombieAttackCount = 0;

    this.updateZombieDisplay();
    this.updatePlayerHealthDisplay();

    if (state.zombieTimer) {
      clearInterval(state.zombieTimer);
    }
    state.zombieTimer = setInterval(() => {
      this.updateZombiePosition();
    }, 100);
  },

  // 更新僵尸位置（基于时间自动前进）
  updateZombiePosition() {
    if (state.zombiePosition >= 100) {
      // 僵尸已到达，停止计时器
      if (state.zombieTimer) {
        clearInterval(state.zombieTimer);
        state.zombieTimer = null;
      }
      this.handleZombieReached();
      return;
    }

    // 计算基于时间的自动前进（不限制在100%，这样击退后还能继续前进）
    const elapsed = (Date.now() - state.zombieStartTime) / 1000; // 已过去秒数
    const progressPercent = (elapsed / state.zombieTotalTime) * 100;

    // 实际位置 = 基础位置 - 累计击退量 + 累计前进量（最终结果限制在0-100）
    const actualPosition = Math.min(Math.max(progressPercent - state.zombiePushBack + state.zombieForward, 0), 100);
    
    // 更新位置
    state.zombiePosition = actualPosition;
    this.updateZombieDisplay();

    // 检查是否到达
    if (state.zombiePosition >= 100) {
      this.handleZombieReached();
    }
  },

  // 游戏结束，清理定时器
  endZombieGame() {
    if (state.zombieTimer) {
      clearInterval(state.zombieTimer);
      state.zombieTimer = null;
    }
  },

  // 更新玩家生命值显示
  updatePlayerHealthDisplay() {
    const healthEl = document.getElementById('player-health-container');
    
    if (healthEl) {
      healthEl.textContent = `${Math.round(state.playerCurrentHealth)} / ${Math.round(state.playerMaxHealth)}`;
    }
  },

  // 更新僵尸显示位置
  updateZombieDisplay() {
    const indicator = document.getElementById('zombie-indicator');
    const track = document.querySelector('.zombie-position-track');
    const progressEl = document.getElementById('zombie-progress');
    if (indicator && track) {
      // 计算轨道宽度，考虑僵尸图像宽度（80px）
      const trackWidth = track.offsetWidth;
      const zombieWidth = 80; // 僵尸图像宽度
      const maxMove = trackWidth - zombieWidth; // 最大可移动距离（像素）

      // state.zombiePosition 是 0-100 的百分比（0=最右边起点，100=到达豌豆）
      // 需要转换为实际的 right 值（像素），然后转为百分比
      const movePixels = (state.zombiePosition / 100) * maxMove;
      const rightPercent = (movePixels / trackWidth) * 100;
      indicator.style.right = `${rightPercent}%`;

      // 更新进度百分比显示
      if (progressEl) {
        progressEl.textContent = `${Math.round(state.zombiePosition)}%`;
      }
    }
  },

  // 僵尸前进（答错时调用）（阶段六：任务 6.3 & 6.4）
  async moveZombieForward() {
    const playerId = await this.getCurrentPlayerId();
    const activeSets = await getActiveSetBonuses(playerId);
    const hasYoumingSet = activeSets.some(s => s.beastType === 'youming');
    
    if (hasYoumingSet) {
      this.showToast('🐱 幽冥灵猫套装触发：答错不惩罚！', 'info');
      return;
    }
    
    const playerStats = state.playerStats || BASE_PLAYER_STATS;
    const dodgeRoll = Math.random();
    
    if (dodgeRoll < playerStats.dodge) {
      this.showToast('💨 闪避成功！僵尸攻击落空', 'success');
      return;
    }
    
    state.zombieForward = (state.zombieForward || 0) + 10;
    this.updateZombiePosition();

    if (state.zombiePosition >= 100) {
      setTimeout(() => this.handleZombieReached(), 500);
    }
  },

  // 击退僵尸（答对时调用）（阶段六：任务 6.3）
  pushZombieBack(basePushDistance = 5) {
    const playerStats = state.playerStats || BASE_PLAYER_STATS;
    const knockbackMultiplier = playerStats.knockback || 1;
    const actualPushDistance = basePushDistance * knockbackMultiplier;
    
    const elapsed = (Date.now() - state.zombieStartTime) / 1000;
    const progressPercent = (elapsed / state.zombieTotalTime) * 100;
    const basePosition = Math.min(progressPercent, 100);
    const currentPosition = Math.max(basePosition - state.zombiePushBack + state.zombieForward, 0);
    
    const maxPushBack = currentPosition + state.zombiePushBack - state.zombieForward;
    const adjustedPushBack = Math.min(actualPushDistance, maxPushBack);
    
    state.zombiePushBack = (state.zombiePushBack || 0) + adjustedPushBack;
    this.updateZombiePosition();
  },

  // 处理僵尸到达豌豆（阶段六：任务 6.4 - 柔骨兔套装失败重生）
  async handleZombieReached() {
    // 僵尸到达终点，直接结束游戏
    if (state.zombieTimer) {
      clearInterval(state.zombieTimer);
      state.zombieTimer = null;
    }

    const indicator = document.getElementById('zombie-indicator');
    if (indicator) {
      indicator.classList.add('reached');
    }

    const playerId = await this.getCurrentPlayerId();
    const hasRouguSet = await this.checkExtraLife(playerId);
    
    if (hasRouguSet && !state.extraLifeUsed) {
      this.applyExtraLife();
      // 重生后重置僵尸位置，继续游戏
      setTimeout(() => {
        state.zombiePosition = 0;
        state.zombieStartTime = Date.now();
        state.zombiePushBack = 0;
        state.zombieForward = 0;
        
        if (indicator) {
          indicator.classList.remove('reached');
        }
        
        this.updateZombieDisplay();
        
        // 重新启动计时器
        state.zombieTimer = setInterval(() => {
          this.updateZombiePosition();
        }, 100);
        
        this.showToast(`🐰 柔骨兔套装触发！重生继续战斗！`, 'success');
      }, 1000);
      return;
    }

    // 没有柔骨兔套装，僵尸到达终点，游戏结束
    this.showToast('🕷️ 僵尸已到达！游戏结束', 'error');
    setTimeout(() => {
      this.showPracticeFailed();
    }, 1500);
  },

  // 显示受伤动画
  showDamageAnimation(damage) {
    const practiceArea = document.getElementById('practice-area');
    if (practiceArea) {
      practiceArea.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => {
        practiceArea.style.animation = '';
      }, 500);
    }
    
    const damageEl = document.createElement('div');
    damageEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 48px;
      font-weight: 900;
      color: #e74c3c;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      z-index: 10000;
      pointer-events: none;
      animation: damageFloat 1.5s ease-out forwards;
    `;
    damageEl.textContent = damage === 0 ? '免疫' : `-${damage}`;
    document.body.appendChild(damageEl);
    
    setTimeout(() => {
      if (document.body.contains(damageEl)) {
        document.body.removeChild(damageEl);
      }
    }, 1500);
  },

  // 显示闪避动画
  showDodgeAnimation() {
    const practiceArea = document.getElementById('practice-area');
    if (practiceArea) {
      practiceArea.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => {
        practiceArea.style.animation = '';
      }, 500);
    }
    
    const dodgeEl = document.createElement('div');
    dodgeEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 36px;
      font-weight: 900;
      color: #3498db;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      z-index: 10000;
      pointer-events: none;
      animation: damageFloat 1.5s ease-out forwards;
    `;
    dodgeEl.textContent = '💨 闪避!';
    document.body.appendChild(dodgeEl);
    
    setTimeout(() => {
      if (document.body.contains(dodgeEl)) {
        document.body.removeChild(dodgeEl);
      }
    }, 1500);
  },

  // 显示玩家受伤动画
  showPlayerDamageAnimation(damage) {
    const practiceArea = document.getElementById('practice-area');
    if (practiceArea) {
      practiceArea.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => {
        practiceArea.style.animation = '';
      }, 500);
    }
    
    // 角色受击动画
    const characterImage = document.getElementById('character-image');
    if (characterImage) {
      characterImage.classList.add('player-hit');
      setTimeout(() => {
        characterImage.classList.remove('player-hit');
      }, 500);
    }
    
    const damageEl = document.createElement('div');
    damageEl.style.cssText = `
      position: fixed;
      top: 40%;
      left: 30%;
      transform: translate(-50%, -50%);
      font-size: 48px;
      font-weight: 900;
      color: #e74c3c;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      z-index: 10000;
      pointer-events: none;
      animation: damageFloat 1.5s ease-out forwards;
    `;
    damageEl.textContent = `-${damage}`;
    document.body.appendChild(damageEl);
    
    setTimeout(() => {
      if (document.body.contains(damageEl)) {
        document.body.removeChild(damageEl);
      }
    }, 1500);
  },

  // 显示免疫动画
  showImmuneAnimation() {
    const immuneEl = document.createElement('div');
    immuneEl.style.cssText = `
      position: fixed;
      top: 40%;
      left: 30%;
      transform: translate(-50%, -50%);
      font-size: 36px;
      font-weight: 900;
      color: #27ae60;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      z-index: 10000;
      pointer-events: none;
      animation: damageFloat 1.5s ease-out forwards;
    `;
    immuneEl.textContent = '🛡️ 免疫!';
    document.body.appendChild(immuneEl);
    
    setTimeout(() => {
      if (document.body.contains(immuneEl)) {
        document.body.removeChild(immuneEl);
      }
    }, 1500);
  },

  // 显示练习失败画面
  showPracticeFailed() {
    // 清理僵尸定时器，防止游戏结束后继续触发
    if (state.zombieTimer) {
      clearInterval(state.zombieTimer);
      state.zombieTimer = null;
    }
    
    const modal = document.getElementById('practice-failed-modal');
    const statsEl = document.getElementById('failed-stats');
    const scoreEl = document.getElementById('failed-score');

    // 显示积分
    if (scoreEl) {
      scoreEl.textContent = state.practiceScore;
    }

    // 统计信息
    const totalWords = state.totalWordsInPractice;
    const correctWords = state.correctWordsInPractice;
    const accuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0;

    statsEl.innerHTML = `
      <div style="display: flex; justify-content: space-around; margin-bottom: 10px;">
        <div>
          <div style="font-size: 24px; font-weight: 700; color: var(--text-primary);">${correctWords}</div>
          <div style="font-size: 12px; color: var(--text-muted);">答对</div>
        </div>
        <div>
          <div style="font-size: 24px; font-weight: 700; color: var(--error);">${totalWords - correctWords}</div>
          <div style="font-size: 12px; color: var(--text-muted);">答错</div>
        </div>
        <div>
          <div style="font-size: 24px; font-weight: 700; color: var(--primary);">${accuracy}%</div>
          <div style="font-size: 12px; color: var(--text-muted);">正确率</div>
        </div>
      </div>
    `;

    // 加载已有玩家名字到 datalist
    this.loadPlayerNamesToDatalist('failed-player-name-datalist');

    modal.classList.add('active');
  },

  // 保存失败练习成绩（阶段六：任务 6.4 - 七宝琉璃套装失败获积分）
  async saveFailedPracticeScore() {
    const playerNameInput = document.getElementById('failed-player-name-input');
    const playerName = playerNameInput.value.trim();

    if (!playerName) {
      this.showToast('请输入您的姓名', 'error');
      return;
    }

    const playerId = await this.getCurrentPlayerId();
    const activeSets = await getActiveSetBonuses(playerId);
    const hasQibaoSet = activeSets.some(s => s.beastType === 'qibao');
    
    let finalPoints = state.practiceScore;
    if (hasQibaoSet) {
      finalPoints = Math.floor(state.practiceScore * 0.5);
      this.showToast(`💎 七宝琉璃套装触发：失败获得 ${finalPoints} 积分（50%）`, 'success');
    }

    await db.practiceScores.add({
      playerName: playerName,
      totalScore: finalPoints,
      wordCount: state.totalWordsInPractice,
      correctCount: state.correctWordsInPractice,
      createdAt: Date.now()
    });

    const oldProfile = await getPlayerProfile(playerName);
    const spiritResult = await addSpiritPower(playerName, finalPoints, 'practice_failed');
    
    if (spiritResult && spiritResult.blocked) {
      this.showToast('⚠️ 突破限制！' + spiritResult.reason, 'error');
      document.getElementById('practice-failed-modal').classList.remove('active');
      await this.renderProfile();
      return;
    }
    
    if (oldProfile && spiritResult) {
      const newLevelInfo = LEVEL_SYSTEM.levels.find(l => l.id === spiritResult.newLevel.level);
      const oldLevelInfo = LEVEL_SYSTEM.levels.find(l => l.id === oldProfile.level);
      if (spiritResult.newLevel.level > oldProfile.level) {
        this.showToast(`恭喜升级！${newLevelInfo ? newLevelInfo.name : ''}`, 'success');
        this.triggerFireworks(8);
      }
    }

    this.showToast('成绩已保存', 'success');

    document.getElementById('practice-failed-modal').classList.remove('active');
    this.endPractice();
  },

  // 跳过保存失败成绩
  skipFailedPracticeScore() {
    document.getElementById('practice-failed-modal').classList.remove('active');
    this.endPractice();
    this.showToast('练习已结束', 'info');
  },

  // 重试练习
  retryPractice() {
    // 关闭失败弹窗
    document.getElementById('practice-failed-modal').classList.remove('active');

    // 重置状态并重新开始
    this.startPractice('random');
  },

  // 播放角色攻击动画
  playAttackAnimation(callback, fireDelay = 0) {
    const characterImg = document.getElementById('character-image');
    if (!characterImg) {
      if (callback) callback();
      return;
    }

    const walkSrc = '角色行走动作.gif';
    const attackSrc = '角色攻击动作.gif';

    if (decodeURI(characterImg.src).includes('角色攻击动作.gif')) return;

    characterImg.src = attackSrc;

    // 在指定延迟后发射子弹
    if (fireDelay > 0) {
      setTimeout(() => {
        if (callback) callback();
      }, fireDelay);
    }

    // 4 秒后恢复行走动画
    setTimeout(() => {
      characterImg.src = walkSrc;
      if (fireDelay === 0 && callback) callback();
    }, 4000);
  },

  // 播放蜘蛛怪物攻击动画
  playSpiderAttackAnimation(callback) {
    const zombieImg = document.getElementById('zombie-image');
    if (!zombieImg) {
      if (callback) callback();
      return;
    }

    const walkSrc = '蜘蛛怪物行走.gif';
    const attackSrc = '蜘蛛怪物攻击.gif';

    if (decodeURI(zombieImg.src).includes('蜘蛛怪物攻击.gif')) return;

    zombieImg.src = attackSrc;

    // 注意：僵尸前进已在 checkAnswer 的错误处理中处理，这里只播放动画
    setTimeout(() => {
      zombieImg.src = walkSrc;
      if (callback) callback();
    }, 2000);
  },

  // 触发子弹动画 - 根据连击数发射多个子弹
  fireBullet(count, onBulletHit) {
    const charactersContainer = document.querySelector('.practice-characters');
    if (!charactersContainer) return;

    const characterImg = document.getElementById('character-image');
    const zombieIndicator = document.getElementById('zombie-indicator');

    // 获取角色图片的位置信息（相对于 practice-characters 容器）
    const charRect = characterImg ? characterImg.getBoundingClientRect() : null;
    const containerRect = charactersContainer.getBoundingClientRect();

    // 获取蜘蛛怪物的位置信息（相对于 practice-characters 容器）
    const zombieRect = zombieIndicator ? zombieIndicator.getBoundingClientRect() : null;

    // 发射多个子弹，每个子弹有延迟
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const bullet = document.getElementById(`bullet-${i}`);
        if (bullet) {
          // 计算起点：角色图片中心位置（相对于容器）
          const startX = charRect ? (charRect.left - containerRect.left + charRect.width / 2) : 0;
          const startPercent = (startX / containerRect.width) * 100;

          // 计算终点：蜘蛛怪物中心位置（相对于容器）
          const endX = zombieRect ? (zombieRect.left - containerRect.left + zombieRect.width / 2) : containerRect.width;
          const endPercent = (endX / containerRect.width) * 100;

          // 设置自定义属性用于动画
          bullet.style.setProperty('--bullet-start', `${startPercent}%`);
          bullet.style.setProperty('--bullet-target', `${endPercent}%`);

          // 设置初始位置为起点
          bullet.style.left = `${startPercent}%`;

          bullet.classList.remove('flying');
          void bullet.offsetWidth;
          bullet.classList.add('flying');

          // 子弹击中时触发回调（动画进行到85%时）
          setTimeout(() => {
            if (onBulletHit) onBulletHit(i);
          }, 425); // 500ms * 0.85 = 425ms

          setTimeout(() => {
            bullet.classList.remove('flying');
          }, 500);
        }
      }, i * 100); // 每个子弹延迟100ms发射
    }
  },

  // 更新积分显示并添加动画
  updateScoreDisplayWithAnimation() {
    const scoreEl = document.getElementById('practice-current-score');
    if (scoreEl) {
      scoreEl.textContent = state.practiceScore;
      scoreEl.classList.add('score-updated');
      setTimeout(() => {
        scoreEl.classList.remove('score-updated');
      }, 500);
    }
  },

  async checkAnswer() {
    const input = document.getElementById('practice-input').value.trim().toLowerCase();
    const word = state.practiceWords[state.currentPracticeIndex];
    const feedback = document.getElementById('practice-feedback');
    const btn = document.getElementById('practice-check-btn');

    if (!input) {
      this.showToast('请输入单词', 'error');
      return;
    }

    // 防止重复提交：如果已经显示反馈，则不再处理
    if (feedback.classList.contains('show')) {
      return;
    }

    // 检查超级作弊码：输入"xxx"立即完成所有单词练习
    if (input === 'xxx') {
      // 计算总得分：单词个数 × 5
      const totalWords = state.practiceWords.length;
      const bonusScore = totalWords * 5;
      state.practiceScore += bonusScore;
      
      // 更新所有单词的练习时间，但不记录正确或错误次数
      for (const practiceWord of state.practiceWords) {
        await db.words.update(practiceWord.id, {
          lastPracticed: Date.now()
        });
        
        // 记录为正确（用于正确率统计）
        if (!state.firstRoundCorrectIds.includes(practiceWord.id)) {
          state.firstRoundCorrectIds.push(practiceWord.id);
        }
      }
      
      // 更新正确数为总单词数
      state.correctWordsInPractice = totalWords;
      
      // 更新积分显示
      this.updateScoreDisplayWithAnimation();
      
      // 显示作弊成功提示
      this.showToast(`🎉 作弊成功！立即完成练习，获得 ${bonusScore} 分奖励`, 'success');
      
      // 直接显示完成界面
      setTimeout(() => {
        this.showPracticeCompleteModal();
      }, 1000);
      
      return;
    }

    // 检查作弊码：输入"zzz"匹配一切答案（不记录正确/错误次数）
    const isCheatCode = input === 'zzz';
    
    // 使用 zz 作弊码时，不记录正确/错误次数，只更新练习时间
    if (isCheatCode) {
      // 增加连续正确计数
      state.consecutiveCorrectCount++;
      
      // 更新最大连击数
      state.maxCombo = Math.max(state.maxCombo, state.consecutiveCorrectCount);

      // 计算本次得分：第 1 次 1 分，每次 +1 分，最高 5 分
      const pointsEarned = Math.min(state.consecutiveCorrectCount, 5);
      state.practiceScore += pointsEarned;

      // 只记录第一轮就答对的单词（用于正确率计算）
      if (!state.firstRoundCorrectIds.includes(word.id) && !state.firstRoundWrongIds.includes(word.id)) {
        state.firstRoundCorrectIds.push(word.id);
        state.correctWordsInPractice++;
      }

      // 触发子弹动画
      const bulletCount = Math.min(state.consecutiveCorrectCount, 5);
      const pushPerBullet = 2;
      this.fireBullet(bulletCount, () => {
        this.pushZombieBack(pushPerBullet);
      });

      // 更新积分显示并添加动画
      this.updateScoreDisplayWithAnimation();

      // 显示赞赏动画
      this.showPraiseAnimation(state.consecutiveCorrectCount);

      feedback.innerHTML = `
        <div>✅ 回答正确！+${pointsEarned}分</div>
        <div class="correct-word">${word.word}</div>
      `;
      feedback.className = 'practice-feedback correct show';

      // 只更新练习时间，不记录正确次数
      await db.words.update(word.id, {
        lastPracticed: Date.now()
      });

      // Auto next after delay
      setTimeout(() => {
        state.currentPracticeIndex++;
        this.showNextWord();
      }, 2000);
      
      await this.checkAndUpdateHighErrorStatus(word.id);
      return;
    }
    
    const isCorrect = input === word.word.toLowerCase();

    if (isCorrect) {
      // 增加连续正确计数
      state.consecutiveCorrectCount++;
      
      // 更新最大连击数
      state.maxCombo = Math.max(state.maxCombo, state.consecutiveCorrectCount);

      // 计算本次得分：第 1 次 1 分，每次 +1 分，最高 5 分
      const pointsEarned = Math.min(state.consecutiveCorrectCount, 5);
      state.practiceScore += pointsEarned;

      // 只记录第一轮就答对的单词（用于正确率计算）
      // 如果这个单词之前答错过，就不计入正确数
      if (!state.firstRoundCorrectIds.includes(word.id) && !state.firstRoundWrongIds.includes(word.id)) {
        state.firstRoundCorrectIds.push(word.id);
        state.correctWordsInPractice++;
      }

      // 播放攻击动画，2 秒后发射子弹
      this.playAttackAnimation(() => {
        // 触发子弹动画（连击数=子弹数，最大 5 个）并击退僵尸（1 个子弹=2%，5 个子弹=10%）
        const bulletCount = Math.min(state.consecutiveCorrectCount, 5);
        const pushPerBullet = 2; // 每个子弹击退 2%
        let hitCount = 0;
        this.fireBullet(bulletCount, (bulletIndex) => {
          // 每个子弹击中时击退僵尸
          hitCount++;
          this.pushZombieBack(pushPerBullet);
        });
      }, 2000);

      // 更新积分显示并添加动画
      this.updateScoreDisplayWithAnimation();

      // 显示赞赏动画
      this.showPraiseAnimation(state.consecutiveCorrectCount);

      feedback.innerHTML = `
        <div>✅ 回答正确！+${pointsEarned}分</div>
        <div class="correct-word">${word.word}</div>
      `;
      feedback.className = 'practice-feedback correct show';

      // Update last practiced and correct count
      const currentWord = await db.words.get(word.id);
      const newCorrectCount = (currentWord?.correctCount || 0) + 1;
      await db.words.update(word.id, {
        lastPracticed: Date.now(),
        correctCount: newCorrectCount
      });

      // Auto next after delay
      setTimeout(() => {
        state.currentPracticeIndex++;
        this.showNextWord();
      }, 2000);
    } else {
      // 拼写错误
      const playerId = await this.getCurrentPlayerId();
      
      // 邪眸白虎套装：连击不断
      await this.handleComboBreak(playerId);
      
      // 幽冥灵猫套装：答错不惩罚
      const noPenalty = await this.checkWrongAnswerPenalty(playerId);

      // 播放蜘蛛攻击动画（仅在未触发答错不惩罚时）
      if (!noPenalty) {
        // 答错惩罚：僵尸前进10%
        const zombieForwardAmount = 10; // 答错僵尸前进10%
        state.zombieForward = (state.zombieForward || 0) + zombieForwardAmount;
        
        // 更新显示（updateZombiePosition 定时器会自动应用 zombieForward 计算位置）
        this.updateZombieDisplay();
        
        // 检查僵尸是否到达终点（100%）
        if (state.zombiePosition >= 100) {
          this.showToast('🕷️ 僵尸已到达！游戏结束', 'error');
          setTimeout(() => {
            this.showPracticeFailed();
          }, 1500);
          return;
        }
        
        // 僵尸发动攻击，立即显示伤害视觉效果
        this.playSpiderAttackAnimation(() => {
          // 动画结束后的回调（目前无需额外操作）
        });
        
        // 立即计算伤害并显示减血效果
        const playerStats = state.playerStats || BASE_PLAYER_STATS;
        const damageResult = onZombieAttack(playerStats);
        
        if (damageResult.dodged) {
          setTimeout(() => {
            this.showToast('💨 闪避成功！僵尸攻击被躲避', 'success');
            this.showDodgeAnimation();
          }, 800);
        } else {
          // 玩家受到伤害 - 立即显示伤害数字
          state.playerCurrentHealth = Math.max(0, state.playerCurrentHealth - damageResult.damage);
          this.updatePlayerHealthDisplay();
          
          if (damageResult.damage > 0) {
            this.showPlayerDamageAnimation(damageResult.damage);
            setTimeout(() => {
              this.showToast(`💔 受到 ${damageResult.damage} 点伤害！剩余生命: ${Math.round(state.playerCurrentHealth)}/${Math.round(state.playerMaxHealth)}`, 'error');
            }, 600);
          } else {
            setTimeout(() => {
              this.showToast('🛡️ 防御太高！僵尸攻击无效', 'success');
              this.showImmuneAnimation();
            }, 600);
          }
          
          // 检查是否生命值耗尽
          if (state.playerCurrentHealth <= 0) {
            setTimeout(() => {
              this.showToast('💀 生命值耗尽！游戏结束', 'error');
              setTimeout(() => {
                this.showPracticeFailed();
              }, 1500);
            }, 1000);
            return;
          }
        }
        
        // 显示受伤反馈
        feedback.innerHTML = `
          <div>❌ 拼写错误</div>
          <div class="correct-word">正确：${word.word}</div>
          <div style="margin-top: 8px; font-size: 13px; color: #e74c3c;">
            僵尸前进 + 攻击！
            ${damageResult.dodged ? '闪避成功！' : `受到伤害: ${damageResult.damage}`}
          </div>
        `;
      } else {
        this.showToast('🐱 幽冥灵猫套装：僵尸未前进！', 'info');
        feedback.innerHTML = `
          <div>❌ 拼写错误</div>
          <div class="correct-word">正确：${word.word}</div>
          <div style="margin-top: 8px; font-size: 13px; color: #27ae60;">
            幽冥灵猫套装保护：无惩罚
          </div>
        `;
      }
      
      feedback.className = 'practice-feedback incorrect show';

      // Increment error count - 先从数据库获取最新值，确保正确累加
      const currentWord = await db.words.get(word.id);
      const newErrorCount = (currentWord?.errorCount || 0) + 1;
      await db.words.update(word.id, {
        errorCount: newErrorCount,
        lastPracticed: Date.now()
      });

      // 记录本轮错误单词（使用更新后的错误次数）
      const existingIndex = state.wrongWordsInRound.findIndex(w => w.id === word.id);
      const updatedWordData = { ...word, errorCount: newErrorCount };
      if (existingIndex === -1) {
        state.wrongWordsInRound.push(updatedWordData);
        // 同时记录到第一轮错误单词列表（用于正确率计算）
        if (!state.firstRoundWrongIds.includes(word.id)) {
          state.firstRoundWrongIds.push(word.id);
        }
      } else {
        state.wrongWordsInRound[existingIndex] = updatedWordData;
      }

      // Update button to next
      btn.textContent = '下一词';
      btn.onclick = () => {
        state.currentPracticeIndex++;
        this.showNextWord();
      };

      // 更新输入框回车事件，直接跳转到下一题
      const inputEl = document.getElementById('practice-input');
      inputEl.onkeypress = (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          state.currentPracticeIndex++;
          this.showNextWord();
        }
      };
    }
    
    // Check if should add to high error book
    await this.checkAndUpdateHighErrorStatus(word.id);
  },

  // 检查并更新高频错词状态
  async checkAndUpdateHighErrorStatus(wordId) {
    const updatedWord = await db.words.get(wordId);
    if (!updatedWord) return;

    // 加载高频错词设置
    const settings = await this.loadHighErrorSettings();
    const { minPracticeCount, accuracyThreshold, errorCountThreshold } = settings;

    // 计算总练习次数
    const totalPracticeCount = (updatedWord.correctCount || 0) + (updatedWord.errorCount || 0);
    
    // 如果练习次数不足，不判断为高频错词
    if (totalPracticeCount < minPracticeCount) return;

    // 计算正确率
    const accuracy = ((updatedWord.correctCount || 0) / totalPracticeCount) * 100;

    // 判断是否满足高频错词条件：正确率低于阈值 且 错误次数达到阈值
    const isHighError = accuracy < accuracyThreshold && updatedWord.errorCount >= errorCountThreshold;

    const currentBookIds = updatedWord.bookIds || [];
    const isInHighErrorBook = currentBookIds.includes('high-error');

    if (isHighError && !isInHighErrorBook) {
      // 添加高频错词标记
      await db.words.update(wordId, {
        bookIds: [...currentBookIds, 'high-error']
      });
    } else if (!isHighError && isInHighErrorBook) {
      // 移除高频错词标记（如果正确率恢复）
      await db.words.update(wordId, {
        bookIds: currentBookIds.filter(id => id !== 'high-error')
      });
    }
  },

  // 显示赞赏动画
  showPraiseAnimation(consecutiveCount) {
    const praiseTexts = [
      { count: 1, text: 'Good', color: '#10B981', fontSize: '48px' },
      { count: 2, text: 'Excellent', color: '#3B82F6', fontSize: '52px' },
      { count: 3, text: 'Outstanding', color: '#8B5CF6', fontSize: '56px' },
      { count: 4, text: 'Brilliant', color: '#F59E0B', fontSize: '60px' },
      { count: 5, text: 'Bravo Combo', color: '#EF4444', fontSize: '64px' }
    ];

    // 根据连续次数确定显示文本
    let praiseConfig;
    if (consecutiveCount >= 5) {
      praiseConfig = praiseTexts[4];
    } else {
      praiseConfig = praiseTexts.find(p => p.count === consecutiveCount) || praiseTexts[0];
    }

    if (!praiseConfig) return;

    // 创建赞赏元素
    const praiseEl = document.createElement('div');
    praiseEl.className = 'praise-animation';
    praiseEl.innerHTML = `
      <div class="praise-text" style="color: ${praiseConfig.color}; font-size: ${praiseConfig.fontSize};">
        ${praiseConfig.text}
      </div>
      ${consecutiveCount >= 2 ? `<div class="praise-streak">${consecutiveCount} 连击!</div>` : ''}
    `;
    document.body.appendChild(praiseEl);

    // 触发烟花效果
    this.triggerFireworks(consecutiveCount);

    // 动画结束后移除元素
    setTimeout(() => {
      praiseEl.remove();
    }, 2500);
  },

  // 加载玩家名字到 datalist
  async loadPlayerNamesToDatalist(datalistId) {
    const datalist = document.getElementById(datalistId);
    if (!datalist) return;
    
    // 清空现有选项
    datalist.innerHTML = '';
    
    try {
      // 从数据库获取所有玩家名字（从 playerProfiles 表读取角色列表）
      const profiles = await db.playerProfiles.toArray();
      
      // 收集所有名字并去重（过滤空值和空白）
      const names = profiles
        .map(p => p.playerName)
        .filter(name => name && name.trim())
        .map(name => name.trim());
      
      // 使用 Set 去重
      const uniqueNames = [...new Set(names)];
      
      // 添加选项到 datalist
      for (const name of uniqueNames) {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
      }
    } catch (error) {
      console.error('加载玩家名字失败:', error);
    }
  },

  // 触发烟花效果
  triggerFireworks(intensity) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const particleCount = Math.min(30 + intensity * 10, 80); // 根据强度增加粒子数量
    const burstCount = intensity >= 5 ? 3 : (intensity >= 3 ? 2 : 1); // 连续次数越高，烟花 burst 越多

    for (let b = 0; b < burstCount; b++) {
      setTimeout(() => {
        this.createFireworkBurst(particleCount, colors);
      }, b * 300);
    }
  },

  // 创建单次烟花爆炸
  createFireworkBurst(particleCount, colors) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'firework-particle';
      
      const color = colors[Math.floor(Math.random() * colors.length)];
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const velocity = 100 + Math.random() * 150;
      const size = 6 + Math.random() * 8;
      
      particle.style.cssText = `
        position: fixed;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        left: ${centerX}px;
        top: ${centerY}px;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color};
      `;
      
      document.body.appendChild(particle);

      // 动画
      const duration = 800 + Math.random() * 600;
      const destinationX = centerX + Math.cos(angle) * velocity;
      const destinationY = centerY + Math.sin(angle) * velocity;

      const animation = particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${destinationX - centerX}px, ${destinationY - centerY}px) scale(0)`, opacity: 0 }
      ], {
        duration: duration,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });

      animation.onfinish = () => particle.remove();
    }
  },

  highlightDifferences(input, correct) {
    let result = '';
    const maxLen = Math.max(input.length, correct.length);
    
    for (let i = 0; i < maxLen; i++) {
      if (input[i] !== correct[i]) {
        result += `<span class="highlight-error">${input[i] || '_'}</span>`;
      } else {
        result += input[i];
      }
    }
    
    return result;
  },

  // 显示练习完成弹窗
  showPracticeCompleteModal() {
    const modal = document.getElementById('practice-complete-modal');
    const scoreDisplay = document.getElementById('complete-score');
    const statsDisplay = document.getElementById('complete-stats');

    scoreDisplay.textContent = state.practiceScore;
    statsDisplay.innerHTML = `
      <div>总单词数: ${state.firstRoundTotalWords}</div>
      <div>正确数: ${state.correctWordsInPractice}</div>
      <div>正确率: ${Math.round((state.correctWordsInPractice / state.firstRoundTotalWords) * 100)}%</div>
    `;
    
    // 加载已有玩家名字到 datalist
    this.loadPlayerNamesToDatalist('player-name-datalist');
    
    modal.classList.add('active');
    
    // 触发庆祝烟花
    this.triggerFireworks(5);
  },

  // 保存练习成绩
  async savePracticeScore() {
    const playerName = document.getElementById('player-name-input').value.trim();

    if (!playerName) {
      this.showToast('请输入姓名', 'error');
      return;
    }

    // 验证：单词数必须大于 0 才能保存成绩
    if (state.totalWordsInPractice <= 0) {
      this.showToast('练习数据无效，无法保存成绩', 'error');
      return;
    }

    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await db.practiceScores.add({
      playerName: playerName,
      totalScore: state.practiceScore,
      wordCount: state.totalWordsInPractice,
      correctCount: state.correctWordsInPractice,
      createdAt: now
    });

    // 记录一次完整的练习完成
    await db.dailyPracticeSessions.add({
      date: today.getTime(),
      completedAt: now
    });

    // 斗罗大陆魂力系统：将积分转换为魂力（应用套装技能后再转换）
    const oldProfile = await getPlayerProfile(playerName);
    const playerProfile = await db.playerProfiles.where('playerName').equals(playerName).first();
    
    // 应用套装技能到积分（曼陀罗蛇套装：积分翻倍）
    let finalScore = state.practiceScore;
    if (playerProfile) {
      finalScore = await this.applySetSkillsToScore(playerProfile.id, state.practiceScore);
    }
    
    const spiritResult = await addSpiritPower(playerName, finalScore, 'practice');
    
    // 检查是否因为需要突破而被阻止（副本模式除外）
    if (spiritResult && spiritResult.blocked) {
      // 如果是副本模式，忽略突破限制，因为突破任务本身就是用来完成突破的
      if (!state.isDungeonMode) {
        this.showToast('⚠️ 突破限制！' + spiritResult.reason, 'error');
        // 显示突破任务页面或提示
        await this.renderProfile();
        return; // 中断后续处理
      }
      // 副本模式下，允许保存成绩，继续处理
    }
    
    // 日常任务追踪
    if (playerProfile) {
      // 1. 武魂修炼：完成一次拼写练习
      await this.trackDailyTask(playerProfile.id, 'cultivation');
      
      // 2. 单词训练：累加单词数
      await updateWordTrainingProgress(playerProfile.id, state.totalWordsInPractice);
      
      // 3. 连击挑战：达成 10 连击
      if (state.maxCombo >= 10) {
        await this.trackDailyTask(playerProfile.id, 'streak');
      }
      
      // 4. 完美通关：一轮全对（≥20 词）
      if (state.wrongWordsInRound.length === 0 && state.totalWordsInPractice >= 20) {
        await this.trackDailyTask(playerProfile.id, 'perfect');
      }
    }
    
    // 检查旧版等级系统是否升级
    let leveledUp = false;
    let newLevelInfo = null;
    if (oldProfile && spiritResult) {
      const oldLevel = LEVEL_SYSTEM.levels.find(l => l.id === oldProfile.level);
      newLevelInfo = LEVEL_SYSTEM.levels.find(l => l.id === spiritResult.newLevel.level);
      if (spiritResult.newLevel.level > oldProfile.level) {
        leveledUp = true;
        this.showToast(`恭喜升级！${newLevelInfo ? newLevelInfo.name : ''}`, 'success');
        this.triggerFireworks(8);
      }
    }
    
    // 斗罗大陆等级升级检测
    if (spiritResult && spiritResult.leveledUp) {
      this.showToast(`🔥 魂力突破！${spiritResult.newLevel.tierIcon} ${spiritResult.newLevel.tier} Lv.${spiritResult.newLevel.level} [${spiritResult.newLevel.title}]`, 'success');
      this.triggerFireworks(12);
    }

    // 副本挑战完成处理
    if (state.isDungeonMode && state.currentDungeonId) {
      await this.handleDungeonCompletion(playerProfile, true, {
        score: state.practiceScore,
        accuracy: state.firstRoundTotalWords > 0 ? state.firstRoundCorrectIds.length / state.firstRoundTotalWords : 0
      });
    }

    this.closePracticeCompleteModal();
    this.endPractice();
    this.updateStats();
    this.showToast('成绩已保存！', 'success');
  },

  // 处理副本完成（阶段三：副本完成结算界面）
  async handleDungeonCompletion(playerProfile, success, practiceData) {
    const dungeonId = state.currentDungeonId;
    const result = await completeDungeon(playerProfile.id, dungeonId, success, practiceData);
    const dungeon = state.currentDungeon;
    
    if (result.success) {
      // 突破成功奖励
      let breakthroughTitle = null;
      let breakthroughBonus = 0;
      
      if (result.isBreakthrough) {
        const breakthroughRewards = {
          'nuoding': { title: '百年魂环', bonusSpiritPower: 500 },
          'shilaik': { title: '百年魂环·精英', bonusSpiritPower: 800 },
          'wuhun': { title: '千年魂环', bonusSpiritPower: 1500 },
          'xingdou': { title: '千年魂环·强力', bonusSpiritPower: 2500 },
          'haotian': { title: '万年魂环', bonusSpiritPower: 5000 },
          'haisen': { title: '万年魂环·海神', bonusSpiritPower: 8000 },
          'shalu': { title: '十万年魂环', bonusSpiritPower: 15000 },
          'wuhun_city': { title: '十万年魂环·神祗', bonusSpiritPower: 25000 },
          'shenjie': { title: '神级魂环', bonusSpiritPower: 50000 }
        };
        
        const reward = breakthroughRewards[dungeon.id];
        if (reward) {
          await addSpiritPower(playerProfile.playerName, reward.bonusSpiritPower, `breakthrough_${dungeon.id}`, true);
          breakthroughTitle = reward.title;
          breakthroughBonus = reward.bonusSpiritPower;
          
          // 记录魂环称号
          const profile = await db.playerProfiles.get(playerProfile.id);
          const currentTitles = profile.breakthroughTitles || [];
          if (!currentTitles.includes(reward.title)) {
            currentTitles.push(reward.title);
            await db.playerProfiles.update(playerProfile.id, { breakthroughTitles: currentTitles });
          }
        }
      }
      
      // 填充结算界面数据
      document.getElementById('dungeon-complete-icon').textContent = result.isBreakthrough ? '⚡' : '⚔️';
      document.getElementById('dungeon-complete-result').textContent = success ? '挑战成功' : '挑战失败';
      document.getElementById('dungeon-complete-result').style.color = success ? 'var(--primary)' : 'var(--danger)';
      document.getElementById('dungeon-complete-name').textContent = dungeon.name;
      document.getElementById('dungeon-complete-points').textContent = `+${result.points}`;
      
      // 统计数据
      const accuracy = practiceData ? Math.round(practiceData.accuracy * 100) : 0;
      const words = practiceData ? practiceData.wordCount || 0 : 0;
      document.getElementById('dungeon-stat-words').textContent = words;
      document.getElementById('dungeon-stat-accuracy').textContent = accuracy + '%';
      
      // 剩余次数
      const progress = await getDungeonProgress(playerProfile.id, dungeonId);
      const remaining = Math.max(0, 3 - (progress.todayCount || 0));
      document.getElementById('dungeon-stat-remaining').textContent = remaining;
      
      // 魂骨掉落显示
      const soulboneEl = document.getElementById('dungeon-complete-soulbone');
      if (result.soulBone) {
        const boneInfo = SOUL_BONE_TYPES[result.soulBone.beastType];
        soulboneEl.style.display = 'block';
        document.getElementById('dungeon-soulbone-name').textContent = `${boneInfo.icon} ${result.soulBone.name}`;
        soulboneEl.querySelector('div:last-child').textContent = `${result.soulBone.attributeIcon} ${result.soulBone.attributeName} +${result.soulBone.attributeValue}`;
      } else {
        soulboneEl.style.display = 'none';
      }
      
      // 突破奖励显示
      const breakthroughEl = document.getElementById('dungeon-complete-breakthrough');
      if (result.isBreakthrough && breakthroughTitle) {
        breakthroughEl.style.display = 'block';
        document.getElementById('dungeon-breakthrough-title').textContent = breakthroughTitle;
        document.getElementById('dungeon-breakthrough-bonus').textContent = `+${breakthroughBonus} 魂力`;
      } else {
        breakthroughEl.style.display = 'none';
      }
      
      // 显示结算弹窗
      document.getElementById('dungeon-complete-modal').classList.add('active');
      this.triggerFireworks(result.isBreakthrough ? 15 : 8);
    } else {
      this.showToast('挑战失败，再接再厉！', 'error');
    }
    
    // 重置副本状态
    state.isDungeonMode = false;
    state.currentDungeonId = null;
    state.currentDungeon = null;
  },
  
  // 关闭副本结算弹窗
  closeDungeonCompleteModal() {
    document.getElementById('dungeon-complete-modal').classList.remove('active');
  },

  // 追踪日常任务（简单任务，直接标记完成）
  async trackDailyTask(playerId, taskType) {
    const today = getTodayStr();
    const task = await db.dailyTasks.where({ playerId, date: today, taskType }).first();
    if (!task || task.completed) return;
    
    await completeDailyTask(playerId, taskType);
  },

  // 关闭练习完成弹窗
  closePracticeCompleteModal() {
    document.getElementById('practice-complete-modal').classList.remove('active');
  },

  // 跳过保存成绩
  skipPracticeScore() {
    this.closePracticeCompleteModal();
    this.endPractice();
    this.showToast('练习已结束', 'info');
  },

  endPractice() {
    // 停止僵尸计时器
    if (state.zombieTimer) {
      clearInterval(state.zombieTimer);
      state.zombieTimer = null;
    }

    document.getElementById('practice-setup').style.display = 'block';
    document.getElementById('practice-area').style.display = 'none';
    // 显示底部导航栏
    document.querySelector('.bottom-nav').style.display = 'flex';
    // 显示 header 并恢复内容位置
    document.querySelector('.header').classList.remove('hidden');
    document.querySelector('.main-content').classList.remove('practice-mode');
    state.practiceWords = [];
    state.currentPracticeIndex = 0;
    state.wrongWordsInRound = [];
    state.practiceScore = 0;
    state.totalWordsInPractice = 0;
    state.correctWordsInPractice = 0;
    state.consecutiveCorrectCount = 0;
    state.firstRoundCorrectIds = [];
    state.firstRoundTotalWords = 0;
    state.firstRoundWrongIds = [];
    state.zombiePosition = 0;
    state.zombieTotalTime = 0;
    state.zombieStartTime = null;
    state.zombiePushBack = 0;
    state.zombieForward = 0;
  },

  exitPractice() {
    // 确认是否退出
    if (confirm('确定要退出练习吗？当前进度将不会保存。')) {
      this.endPractice();
      this.showToast('已退出练习', 'info');
    }
  },

  // Stats
  async renderStats() {
    // Render chart
    this.renderErrorChart();
    // Render practice scores
    this.renderPracticeScores();
  },

  // 渲染个人中心页面
  async renderProfile() {
    // 获取所有玩家档案
    const allProfiles = await db.playerProfiles
      .orderBy('totalPoints')
      .reverse()
      .toArray();
    
    // 更新角色数量
    document.getElementById('profile-player-count').textContent = `共 ${allProfiles.length} 个角色`;
    
    // 渲染角色选择器
    const selectorContainer = document.getElementById('profile-character-selector');
    if (allProfiles.length === 0) {
      selectorContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 14px; width: 100%;">
          暂无角色，请先完成练习并保存成绩
        </div>
      `;
    } else {
      selectorContainer.innerHTML = allProfiles.map((profile, index) => {
        const levelInfo = LEVEL_SYSTEM.levels.find(l => l.id === profile.level);
        const isSelected = index === 0;
        const spiritLevelText = `${profile.totalPoints} 魂力`;
        return `
          <div onclick="app.switchProfile('${profile.playerName}')" 
               style="flex-shrink: 0; padding: 12px 16px; background: ${isSelected ? 'var(--primary)' : 'var(--bg-secondary)'}; 
                      border-radius: var(--radius); border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}; 
                      cursor: pointer; transition: all 0.2s ease; min-width: 120px;"
               onmouseover="this.style.transform='translateY(-2px)'" 
               onmouseout="this.style.transform='translateY(0)'">
            <div style="text-align: center;">
              <div style="font-size: 24px; margin-bottom: 4px;">🌱</div>
              <div style="font-size: 12px; font-weight: 600; color: ${isSelected ? 'white' : 'var(--text-primary)'}; margin-bottom: 4px;">
                ${profile.playerName.substring(0, 6)}${profile.playerName.length > 6 ? '...' : ''}
              </div>
              <div style="font-size: 10px; color: ${isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'};">
                ${spiritLevelText}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
    
    // 获取最近使用的玩家名字（从最近一次练习成绩中获取）
    const recentScore = await db.practiceScores
      .orderBy('createdAt')
      .reverse()
      .first();
    
    const playerName = recentScore ? recentScore.playerName : (allProfiles.length > 0 ? allProfiles[0].playerName : '未登录');
    
    // 获取玩家档案
    let profile = null;
    if (playerName !== '未登录') {
      profile = await getPlayerProfile(playerName);
    }
    
    // 为新角色随机分配一个魂骨（如果还没有魂骨的话）
    if (profile) {
      await this.ensureRandomSoulBone(profile.id);
    }
    
    // 更新玩家信息
    document.getElementById('profile-player-name').textContent = playerName;
    
    if (profile) {
      document.getElementById('profile-total-points').textContent = profile.totalPoints;
      
      // 斗罗大陆魂力等级显示
      const spiritInfo = await getPlayerSpiritInfo(playerName);
      if (spiritInfo) {
        // 更新主等级显示为斗罗大陆等级
        document.getElementById('profile-level-icon').textContent = spiritInfo.tierIcon;
        
        // 显示突破任务提醒横幅
        const breakthroughAlertEl = document.getElementById('profile-breakthrough-alert');
        if (breakthroughAlertEl) {
          breakthroughAlertEl.style.display = spiritInfo.needsBreakthrough ? 'block' : 'none';
        }
        
        // 如果需要突破，显示突破提示
        if (spiritInfo.needsBreakthrough) {
          document.getElementById('profile-level-name').textContent = `${spiritInfo.tier} Lv.${spiritInfo.level} [待突破]`;
          document.getElementById('profile-level-name').style.color = '#FF6B6B';
        } else {
          document.getElementById('profile-level-name').textContent = `${spiritInfo.tier} Lv.${spiritInfo.level}`;
          document.getElementById('profile-level-name').style.color = '';
        }
        
        // 更新总积分区域的等级显示
        document.getElementById('profile-total-level-icon').textContent = spiritInfo.tierIcon;
        if (spiritInfo.needsBreakthrough) {
          document.getElementById('profile-total-level-name').textContent = `${spiritInfo.tier} Lv.${spiritInfo.level} [待突破]`;
        } else {
          document.getElementById('profile-total-level-name').textContent = `${spiritInfo.tier} Lv.${spiritInfo.level}`;
        }
        
        // 显示称号
        const titleEl = document.getElementById('profile-title-display');
        if (titleEl) {
          if (spiritInfo.needsBreakthrough) {
            titleEl.textContent = `[${spiritInfo.title}] - 需要完成突破任务`;
            titleEl.style.color = '#FF6B6B';
          } else {
            titleEl.textContent = `[${spiritInfo.title}]`;
            titleEl.style.color = spiritInfo.tierColor;
          }
        }
        
        // 更新魂力进度条
        document.getElementById('profile-level-progress-bar').style.width = `${spiritInfo.progress}%`;
        
        // 进度显示：如果需要突破，显示突破提示
        if (spiritInfo.needsBreakthrough) {
          const nextTier = SPIRIT_LEVEL_SYSTEM.tiers[spiritInfo.tierId] || null;
          document.getElementById('profile-level-progress-text').textContent = `已满级！需完成突破任务 → ${nextTier ? nextTier.name : '已满级'}`;
        } else {
          document.getElementById('profile-level-progress-text').textContent = `${Math.floor(spiritInfo.currentSpiritPower)}/${spiritInfo.requiredForLevel} 魂力 (${spiritInfo.totalSpiritPower} 总魂力)`;
        }
      }
      
      // 显示头像
      this.displayProfileAvatar(profile.avatar);
    } else {
      document.getElementById('profile-level-icon').textContent = '🌱';
      document.getElementById('profile-level-name').textContent = '魂士 Lv.1';
      document.getElementById('profile-total-points').textContent = '0';
      document.getElementById('profile-total-level-icon').textContent = '🌱';
      document.getElementById('profile-total-level-name').textContent = '魂士 Lv.1';
      document.getElementById('profile-level-progress-bar').style.width = '0%';
      document.getElementById('profile-level-progress-text').textContent = '0/100 魂力';
      this.displayProfileAvatar(null);
    }
    
    // 统计个人数据
    if (playerName !== '未登录') {
      const allScores = await db.practiceScores
        .where('playerName')
        .equals(playerName)
        .toArray();
      
      const totalPractices = allScores.length;
      const totalWords = allScores.reduce((sum, score) => sum + score.wordCount, 0);
      const totalCorrect = allScores.reduce((sum, score) => sum + score.correctCount, 0);
      const accuracy = totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 0;
      
      document.getElementById('profile-total-practices').textContent = totalPractices;
      document.getElementById('profile-total-words').textContent = totalWords;
      document.getElementById('profile-total-correct').textContent = totalCorrect;
      document.getElementById('profile-accuracy').textContent = `${accuracy}%`;
      
      // 显示最近练习记录
      await this.renderProfileRecentPractices(playerName);
      
      // 渲染日常任务
      await this.renderDailyTasks(playerName);
      
      // 渲染副本任务
      await this.renderDungeons(playerName);
      
      // 渲染魂骨快速预览、装备列表、属性加成和对战属性
      const playerProfile = await db.playerProfiles.where('playerName').equals(playerName).first();
      if (playerProfile) {
        await this.renderSoulBoneQuickView(playerProfile.id);
        await this.renderEquippedSoulBones(playerProfile.id);
        await this.renderSoulBoneBonusStats(playerProfile.id);
        await this.renderPlayerBattleStats(playerProfile.id);
      }
    } else {
      // 未登录时也重置对战属性为默认值
      this.resetPlayerBattleStats();
      document.getElementById('profile-total-practices').textContent = '0';
      document.getElementById('profile-total-words').textContent = '0';
      document.getElementById('profile-total-correct').textContent = '0';
      document.getElementById('profile-accuracy').textContent = '0%';
      document.getElementById('profile-recent-practices-card').style.display = 'none';
      document.getElementById('daily-tasks-list').innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">请先登录角色</div>';
      document.getElementById('dungeon-list').innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">请先登录角色</div>';
      
      // 重置魂骨显示
      const equippedListEl = document.getElementById('equipped-soul-bones-list');
      if (equippedListEl) equippedListEl.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted); grid-column: 1 / -1;">请先登录角色</div>';
      
      const bonusStatsEl = document.getElementById('soul-bone-bonus-stats');
      if (bonusStatsEl) bonusStatsEl.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted); width: 100%;">请先登录角色</div>';
      
      // 隐藏魂骨相关区域
      const soulBoneCard = document.querySelector('.soulbone-quickview-card');
      if (soulBoneCard) soulBoneCard.style.display = 'none';
      
      // 重置对战属性为默认值
      this.resetPlayerBattleStats();
    }
  },

  // 重置对战属性为默认值
  resetPlayerBattleStats() {
    const healthEl = document.getElementById('stat-health');
    const defenseEl = document.getElementById('stat-defense');
    const dodgeEl = document.getElementById('stat-dodge');
    const knockbackEl = document.getElementById('stat-knockback');
    const slowEl = document.getElementById('stat-slow');
    
    if (healthEl) healthEl.textContent = Math.round(BASE_PLAYER_STATS.health);
    if (defenseEl) defenseEl.textContent = Math.round(BASE_PLAYER_STATS.defense);
    if (dodgeEl) dodgeEl.textContent = (BASE_PLAYER_STATS.dodge * 100).toFixed(1) + '%';
    if (knockbackEl) knockbackEl.textContent = (BASE_PLAYER_STATS.knockback * 100).toFixed(0) + '%';
    if (slowEl) slowEl.textContent = (BASE_PLAYER_STATS.zombieSlow * 100).toFixed(1) + '%';
    
    // 清空套装效果
    const containerEl = document.getElementById('active-set-bonuses');
    if (containerEl) {
      containerEl.innerHTML = '<div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 13px;">集齐5件同种魂骨激活套装效果</div>';
    }
  },

  // 渲染日常任务
  async renderDailyTasks(playerName) {
    const container = document.getElementById('daily-tasks-list');
    const playerProfile = await db.playerProfiles.where('playerName').equals(playerName).first();
    
    if (!playerProfile) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">请先登录角色</div>';
      return;
    }
    
    // 初始化今日任务
    await initDailyTasks(playerProfile.id);
    
    // 获取任务列表
    const tasks = await getDailyTasks(playerProfile.id);
    
    if (tasks.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">暂无任务</div>';
      return;
    }
    
    // 计算可领取的任务数量
    const claimableTasks = tasks.filter(t => !t.completed && this.isTaskClaimable(t)).length;
    
    let html = '';
    
    // 一键领取按钮（阶段二：任务 2.4）
    if (claimableTasks > 0) {
      html += `
        <div style="text-align: right; margin-bottom: 8px;">
          <button class="btn btn-primary" style="padding: 6px 16px; font-size: 12px;" 
                  onclick="app.claimAllDailyRewards()">
            🎁 一键领取（${claimableTasks} 项可领）
          </button>
        </div>
      `;
    }
    
    html += tasks.map(task => {
      const isCompleted = task.completed;
      const targetWords = DAILY_TASK_CONFIG.wordTraining.targetWords;
      const currentProgress = Math.min(task.progress || 0, targetWords);
      
      // 已完成后显示最终进度，否则显示当前进度
      const progressText = task.taskType === 'wordTraining' ? `${isCompleted ? targetWords : currentProgress}/${targetWords}` : '';
      
      // 判断是否可以领取（已完成但奖励已发放的不显示领取按钮）
      const canClaim = !isCompleted && this.isTaskClaimable(task);
      
      return `
        <div style="background: ${isCompleted ? 'var(--success)' : 'var(--bg-secondary)'}; 
                    border-radius: var(--radius); padding: 12px 16px; 
                    border: 1px solid ${isCompleted ? 'var(--success)' : 'var(--border)'}; 
                    display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <div style="font-size: 24px;">${task.icon}</div>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: ${isCompleted ? 'white' : 'var(--text-primary)'};">${task.name}</div>
            <div style="font-size: 12px; color: ${isCompleted ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'};">
              ${task.description}
              ${progressText ? ` (${progressText})` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            ${isCompleted ? `
              <div style="font-size: 14px; font-weight: 700; color: white;">✓ 已领取</div>
              <div style="font-size: 10px; color: rgba(255,255,255,0.7);">+${task.reward} 魂力</div>
            ` : `
              <div style="font-size: 14px; font-weight: 700; color: var(--primary);">+${task.reward}</div>
              <div style="font-size: 10px; color: var(--text-muted);">魂力</div>
              ${canClaim ? `
                <button class="btn btn-primary" style="padding: 3px 10px; font-size: 10px; margin-top: 4px;" 
                        onclick="app.claimSingleReward('${task.taskType}')">
                  领取
                </button>
              ` : ''}
            `}
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
  },
  
  // 判断任务是否可以领取
  isTaskClaimable(task) {
    const config = DAILY_TASK_CONFIG[task.taskType];
    if (!config) return false;
    
    if (task.taskType === 'wordTraining') {
      return (task.progress || 0) >= config.targetWords;
    } else if (task.taskType === 'streak') {
      return (task.progress || 0) >= config.targetCombo;
    }
    // cultivation, sentenceTraining, perfect 已自动领取
    return false;
  },
  
  // 领取单个任务奖励
  async claimSingleReward(taskType) {
    const playerName = document.getElementById('profile-player-name').textContent.trim();
    const playerProfile = await db.playerProfiles.where('playerName').equals(playerName).first();
    if (!playerProfile) return;
    
    const result = await claimDailyTaskReward(playerProfile.id, taskType);
    if (result && result.success) {
      this.showToast(`领取成功！+${result.reward} 魂力`, 'success');
      this.triggerFireworks(3);
      await this.renderDailyTasks(playerName);
    } else {
      this.showToast(result.reason || '领取失败', 'error');
    }
  },
  
  // 一键领取全部奖励
  async claimAllDailyRewards() {
    const playerName = document.getElementById('profile-player-name').textContent.trim();
    const playerProfile = await db.playerProfiles.where('playerName').equals(playerName).first();
    if (!playerProfile) return;
    
    const result = await claimAllDailyTaskRewards(playerProfile.id);
    if (result && result.success && result.claimedCount > 0) {
      this.showToast(`一键领取成功！共 ${result.claimedCount} 项，+${result.totalReward} 魂力`, 'success');
      this.triggerFireworks(6);
      await this.renderDailyTasks(playerName);
      // 刷新等级信息
      await this.renderProfile();
    } else {
      this.showToast('没有可领取的奖励', 'error');
    }
  },

  // 渲染副本任务
  async renderDungeons(playerName) {
    const container = document.getElementById('dungeon-list');
    const playerProfile = await db.playerProfiles.where('playerName').equals(playerName).first();
    
    if (!playerProfile) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">请先登录角色</div>';
      return;
    }
    
    // 重置每日次数
    await resetDungeonDailyCount(playerProfile.id);
    
    // 获取副本列表
    const dungeons = await getAllDungeons(playerProfile.id);
    
    if (dungeons.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">暂无副本</div>';
      return;
    }
    
    container.innerHTML = dungeons.map(dungeon => {
      const isUnlocked = dungeon.isUnlocked;
      const progress = dungeon.progress;
      const isBreakthrough = progress && progress.isBreakthrough;
      const todayCount = dungeon.todayCount || 0;
      // 突破任务无次数限制
      const canChallenge = isUnlocked && (isBreakthrough || !progress || todayCount < 3);
      
      if (!isUnlocked) {
        return `
          <div style="background: var(--bg-secondary); border-radius: var(--radius); padding: 12px 16px; 
                      border: 1px solid var(--border); opacity: 0.6;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; color: var(--text-muted);">🔒 ${dungeon.name}</div>
                <div style="font-size: 12px; color: var(--text-muted);">解锁条件：${dungeon.unlockLevel} 级</div>
              </div>
            </div>
          </div>
        `;
      }
      
      const modeText = dungeon.requirements.mode === 'spelling' ? '拼写练习' : '句子填空';
      const wordCount = dungeon.requirements.wordCount;
      const accuracy = Math.floor(dungeon.requirements.accuracyRequired * 100);
      
      return `
        <div style="background: ${isBreakthrough ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)' : 'var(--bg-secondary)'}; 
                    border-radius: var(--radius); padding: 12px 16px; 
                    border: 1px solid ${isBreakthrough ? '#ff6b6b' : 'var(--border)'};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${isBreakthrough ? '<span style="font-size: 16px;">⚡</span>' : '<span style="font-size: 16px;">✅</span>'}
              <div>
                <div style="font-weight: 600; color: ${isBreakthrough ? 'white' : 'var(--text-primary)'};">
                  ${dungeon.name} ${isBreakthrough ? '(突破任务)' : ''}
                </div>
                <div style="font-size: 12px; color: ${isBreakthrough ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'};">
                  ${dungeon.description}
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: ${isBreakthrough ? 'white' : 'var(--text-muted)'};">
                今日剩余：${3 - todayCount}/3 次
              </div>
              <div style="font-size: 11px; color: ${isBreakthrough ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'};">
                积分系数：×${dungeon.pointsMultiplier} | 正确率：≥${accuracy}%
              </div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11px; color: ${isBreakthrough ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'};">
              任务要求：${wordCount} 词${modeText}
            </div>
            ${canChallenge ? `
              <button class="btn btn-primary" style="padding: 6px 16px; font-size: 12px;" 
                      onclick="app.startDungeonChallenge('${dungeon.id}')">
                ${isBreakthrough ? '挑战突破' : '挑战'}
              </button>
            ` : `
              <span style="font-size: 11px; color: var(--text-muted);">今日次数已用完</span>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  // 开始副本挑战
  async startDungeonChallenge(dungeonId) {
    // 获取当前选中的角色名称（从角色页面）
    const playerName = document.getElementById('profile-player-name').textContent.trim();
    if (!playerName || playerName === '未登录') {
      this.showToast('请先在"我的"页面选择角色', 'error');
      return;
    }
    
    const playerProfile = await db.playerProfiles.where('playerName').equals(playerName).first();
    if (!playerProfile) {
      this.showToast('请先登录角色', 'error');
      return;
    }
    
    const dungeon = DUNGEONS.find(d => d.id === dungeonId);
    if (!dungeon) {
      this.showToast('副本不存在', 'error');
      return;
    }
    
    // 检查每日次数（突破任务无次数限制）
    const progress = await getDungeonProgress(playerProfile.id, dungeonId);
    const isBreakthrough = progress && progress.isBreakthrough;
    
    if (!isBreakthrough && progress && (progress.todayCount || 0) >= 3) {
      this.showToast('今日挑战次数已用完（突破任务不受限制）', 'error');
      return;
    }
    
    // 记录当前副本挑战状态
    state.isDungeonMode = true;
    state.currentDungeonId = dungeonId;
    state.currentDungeon = dungeon;
    
    this.showToast(`进入 ${dungeon.name} 挑战！`, 'success');
    
    // 自动切换到练习页面
    state.currentPage = 'practice';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-practice').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('onclick') && item.getAttribute('onclick').includes("'practice'")) {
        item.classList.add('active');
      }
    });
    
    // 隐藏底部导航栏（练习模式）
    document.querySelector('.bottom-nav').style.display = 'none';
    
    // 根据副本要求自动启动练习
    await this.autoStartDungeonPractice(dungeon);
  },

  // 自动开始副本练习
  async autoStartDungeonPractice(dungeon) {
    const count = dungeon.requirements.wordCount;
    
    // 隐藏 header 并调整内容位置（与正常练习一致）
    const header = document.querySelector('.header');
    if (header) header.classList.add('hidden');
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.classList.add('practice-mode');
    
    if (dungeon.requirements.mode === 'spelling') {
      // 单词拼写模式
      const words = await db.words.toArray();
      if (words.length === 0) {
        this.showToast('单词库为空，无法开始挑战', 'error');
        this.resetToProfileAfterDungeon();
        return;
      }
      
      state.practiceWords = this.shuffleArray(words).slice(0, Math.min(count, words.length));
      state.currentPracticeIndex = 0;
      state.wrongWordsInRound = [];
      state.consecutiveCorrectCount = 0;
      state.practiceScore = 0;
      state.totalWordsInPractice = state.practiceWords.length;
      state.firstRoundTotalWords = state.practiceWords.length;
      state.correctWordsInPractice = 0;
      state.firstRoundCorrectIds = [];
      state.firstRoundWrongIds = [];
      
      // 初始化僵尸游戏
      this.initZombieGame(state.practiceWords.length);
      
      // 隐藏设置，显示练习区域
      document.getElementById('practice-setup').style.display = 'none';
      document.getElementById('practice-area').style.display = 'block';
      
      // 先显示第一个单词
      this.showNextWord();
      
      // 启动倒计时动画
      this.startPracticeCountdown();
    } else {
      // 句子填空模式
      const words = await db.words.toArray();
      if (words.length === 0) {
        this.showToast('单词库为空，无法开始挑战', 'error');
        this.resetToProfileAfterDungeon();
        return;
      }
      
      state.sentencePracticeWords = this.shuffleArray(words).slice(0, Math.min(count, words.length));
      state.sentenceCurrentIndex = 0;
      state.sentenceWrongWords = [];
      state.sentenceCorrectCount = 0;
      state.sentencePracticeScore = 0;
      state.sentenceTotalWords = state.sentencePracticeWords.length;
      state.sentenceFirstRoundWrongIds = [];
      
      // 隐藏句子练习设置，显示练习区域
      document.getElementById('sentence-practice-setup').style.display = 'none';
      document.getElementById('sentence-practice-area').style.display = 'block';
      
      // 先显示第一个句子单词
      this.showNextSentenceWord();
      
      // 启动倒计时动画
      this.startSentencePracticeCountdown();
    }
  },

  // 副本挑战结束后返回角色页面
  resetToProfileAfterDungeon() {
    state.isDungeonMode = false;
    state.currentDungeonId = null;
    state.currentDungeon = null;
    
    // 恢复底部导航栏
    document.querySelector('.bottom-nav').style.display = '';
    
    // 切换到角色页面
    this.navigate('profile');
  },

  // 切换角色
  async switchProfile(playerName) {
    // 获取玩家档案
    const profile = await getPlayerProfile(playerName);
    
    if (!profile) return;
    
    // 获取魂力等级信息
    const spiritInfo = await getPlayerSpiritInfo(playerName);
    
    // 更新玩家信息
    document.getElementById('profile-player-name').textContent = playerName;
    document.getElementById('profile-total-points').textContent = profile.totalPoints;
    
    if (spiritInfo) {
      // 更新主等级显示为斗罗大陆等级
      document.getElementById('profile-level-icon').textContent = spiritInfo.tierIcon;
      document.getElementById('profile-level-name').textContent = `${spiritInfo.tier} Lv.${spiritInfo.level}`;
      
      // 更新总积分区域的等级显示
      document.getElementById('profile-total-level-icon').textContent = spiritInfo.tierIcon;
      document.getElementById('profile-total-level-name').textContent = `${spiritInfo.tier} Lv.${spiritInfo.level}`;
      
      // 显示称号
      const titleEl = document.getElementById('profile-title-display');
      if (titleEl) {
        titleEl.textContent = `[${spiritInfo.title}]`;
        titleEl.style.color = spiritInfo.tierColor;
      }
      
      // 更新魂力进度条
      document.getElementById('profile-level-progress-bar').style.width = `${spiritInfo.progress}%`;
      document.getElementById('profile-level-progress-text').textContent = `${Math.floor(spiritInfo.currentSpiritPower)}/${spiritInfo.requiredForLevel} 魂力 (${spiritInfo.totalSpiritPower} 总魂力)`;
    }
    
    // 显示头像
    this.displayProfileAvatar(profile.avatar);
    
    // 统计个人数据
    const allScores = await db.practiceScores
      .where('playerName')
      .equals(playerName)
      .toArray();
    
    const totalPractices = allScores.length;
    const totalWords = allScores.reduce((sum, score) => sum + score.wordCount, 0);
    const totalCorrect = allScores.reduce((sum, score) => sum + score.correctCount, 0);
    const accuracy = totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 0;
    
    document.getElementById('profile-total-practices').textContent = totalPractices;
    document.getElementById('profile-total-words').textContent = totalWords;
    document.getElementById('profile-total-correct').textContent = totalCorrect;
    document.getElementById('profile-accuracy').textContent = `${accuracy}%`;
    
    // 显示最近练习记录
    await this.renderProfileRecentPractices(playerName);
    
    // 渲染日常任务
    await this.renderDailyTasks(playerName);
    
    // 渲染副本任务（切换角色时刷新，确保每个角色看到自己的进度）
    await this.renderDungeons(playerName);
    
    // 渲染已装备魂骨和属性加成（确保每个角色显示自己的魂骨）
    await this.renderEquippedSoulBones(profile.id);
    await this.renderSoulBoneBonusStats(profile.id);
    await this.renderSoulBoneQuickView(profile.id);
    await this.renderPlayerBattleStats(profile.id);
    
    // 更新角色选择器的高亮状态
    const selectorContainer = document.getElementById('profile-character-selector');
    const roleCards = selectorContainer.querySelectorAll('div[onclick^="app.switchProfile"]');
    roleCards.forEach(card => {
      const cardPlayerName = card.getAttribute('onclick').match(/'([^']+)'/)[1];
      const isSelected = cardPlayerName === playerName;
      card.style.background = isSelected ? 'var(--primary)' : 'var(--bg-secondary)';
      card.style.borderColor = isSelected ? 'var(--primary)' : 'var(--border)';
      
      const nameDiv = card.querySelector('div:nth-child(2)');
      const levelDiv = card.querySelector('div:nth-child(3)');
      const pointsDiv = card.querySelector('div:nth-child(4)');
      
      if (nameDiv) {
        nameDiv.style.color = isSelected ? 'white' : 'var(--text-primary)';
      }
      if (levelDiv) {
        levelDiv.style.color = isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)';
      }
      if (pointsDiv) {
        pointsDiv.style.color = isSelected ? 'white' : 'var(--primary)';
      }
    });
  },

  // 渲染最近练习记录
  async renderProfileRecentPractices(playerName) {
    const container = document.getElementById('profile-recent-practices');
    const card = document.getElementById('profile-recent-practices-card');
    
    if (!container || !card) return;
    
    const recentScores = await db.practiceScores
      .where('playerName')
      .equals(playerName)
      .reverse()
      .limit(5)
      .toArray();
    
    if (recentScores.length === 0) {
      card.style.display = 'none';
      return;
    }
    
    card.style.display = 'block';
    
    container.innerHTML = recentScores.map((score, index) => {
      const date = new Date(score.createdAt).toLocaleString('zh-CN');
      // 修复：避免除以 0 导致 Infinity
      const accuracy = score.wordCount > 0 
        ? Math.round((score.correctCount / score.wordCount) * 100) 
        : 0;
      const mode = score.mode === 'sentence' ? '句子填空' : '拼写练习';
      
      return `
        <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
          <div style="width: 40px; height: 40px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 16px; flex-shrink: 0;">
            ${score.totalScore}
          </div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">
              ${mode} · ${score.wordCount}词
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">
              ${date} · 正确率${accuracy}%
            </div>
          </div>
          <div style="font-size: 20px; font-weight: 700; color: var(--primary);">
            ${score.totalScore >= 100 ? '🏆' : score.totalScore >= 50 ? '⭐' : '✨'}
          </div>
        </div>
      `;
    }).join('');
  },

  // 删除当前角色
  async deleteCurrentProfile() {
    const playerName = document.getElementById('profile-player-name').textContent;
    
    if (playerName === '未登录') {
      this.showToast('没有可删除的角色', 'error');
      return;
    }
    
    // 确认删除
    if (!confirm(`确定要删除角色"${playerName}"吗？\n\n删除后将清除：\n- 该角色的所有积分和等级\n- 该角色的所有练习记录\n- 该角色的所有魂骨和任务数据\n\n此操作不可恢复！`)) {
      return;
    }
    
    try {
      // 获取玩家档案
      const profile = await getPlayerProfile(playerName);
      if (!profile) {
        this.showToast('角色不存在', 'error');
        return;
      }
      
      const profileId = profile.id;
      
      // 删除该玩家的所有相关数据
      // 1. 删除日常任务
      const dailyTasks = await db.dailyTasks.where('playerId').equals(profileId).toArray();
      for (const task of dailyTasks) {
        await db.dailyTasks.delete(task.id);
      }
      
      // 2. 删除魂骨
      const soulBones = await db.soulBones.where('playerId').equals(profileId).toArray();
      for (const bone of soulBones) {
        await db.soulBones.delete(bone.id);
      }
      
      // 3. 删除魂力档案
      const spiritProfiles = await db.playerSpiritPower.where('playerId').equals(profileId).toArray();
      for (const sp of spiritProfiles) {
        await db.playerSpiritPower.delete(sp.id);
      }
      
      // 4. 删除副本进度
      const dungeonProgress = await db.dungeonProgress.where('playerId').equals(profileId).toArray();
      for (const dp of dungeonProgress) {
        await db.dungeonProgress.delete(dp.id);
      }
      
      // 5. 删除练习成绩
      const scores = await db.practiceScores.where('playerName').equals(playerName).toArray();
      for (const score of scores) {
        await db.practiceScores.delete(score.id);
      }
      
      // 6. 最后删除玩家档案
      await db.playerProfiles.delete(profileId);
      
      this.showToast(`角色"${playerName}"已删除`, 'success');
      
      // 重新渲染个人中心页面
      await this.renderProfile();
      
      // 如果排行榜页面可见，也刷新排行榜
      if (state.currentPage === 'stats') {
        await this.renderPracticeScores();
      }
    } catch (error) {
      console.error('删除角色失败:', error);
      this.showToast('删除失败：' + error.message, 'error');
    }
  },

  // 打开创建角色弹窗
  openCreatePlayerModal() {
    document.getElementById('create-player-modal').classList.add('active');
    document.getElementById('create-player-name').value = '';
    document.getElementById('create-player-name').focus();
  },

  // 关闭创建角色弹窗
  closeCreatePlayerModal() {
    document.getElementById('create-player-modal').classList.remove('active');
  },

  // 创建新角色
  async createNewPlayer() {
    const playerNameInput = document.getElementById('create-player-name');
    const playerName = playerNameInput.value.trim();

    // 验证角色名称
    if (!playerName) {
      this.showToast('请输入角色名称', 'error');
      return;
    }

    if (playerName.length < 2) {
      this.showToast('角色名称至少需要2个字符', 'error');
      return;
    }

    if (playerName.length > 10) {
      this.showToast('角色名称不能超过10个字符', 'error');
      return;
    }

    // 检查角色名是否已存在
    const existingProfile = await getPlayerProfile(playerName);
    if (existingProfile) {
      this.showToast('该角色名称已存在，请使用其他名称', 'error');
      return;
    }

    try {
      // 创建玩家档案
      const profile = {
        playerName: playerName,
        totalPoints: 0,
        level: 1,
        lastPlayedAt: Date.now()
      };
      const profileId = await db.playerProfiles.add(profile);
      profile.id = profileId;

      // 创建魂力档案
      const levelInfo = calculateSpiritLevel(0, true);
      const spiritProfile = {
        playerId: profileId,
        totalSpiritPower: 0,
        currentTier: levelInfo.tier,
        currentLevel: levelInfo.level,
        isBreakthroughReady: false,
        breakthroughCompleted: true,
        lastUpdated: Date.now()
      };
      await db.playerSpiritPower.add(spiritProfile);

      // 初始化日常任务
      await initDailyTasks(profileId);

      this.showToast(`角色"${playerName}"创建成功！`, 'success');
      this.closeCreatePlayerModal();

      // 重新渲染角色页面
      await this.renderProfile();

      // 自动切换到新创建的角色
      await this.switchProfile(playerName);
      
      // 为新创建的角色随机分配一个魂骨（在角色切换后执行）
      try {
        const newProfile = await getPlayerProfile(playerName);
        if (newProfile) {
          const newBone = await generateSoulBone(newProfile.id, 1);
          if (newBone) {
            console.log(`为新角色"${playerName}"随机分配了一个魂骨:`, newBone);
            // 延迟显示获得魂骨的提示
            setTimeout(() => {
              this.showSoulBoneAward(newBone);
            }, 500);
          }
        }
      } catch (boneError) {
        console.error('分配魂骨失败:', boneError);
        // 魂骨分配失败不影响角色创建
      }
    } catch (error) {
      console.error('创建角色失败:', error);
      this.showToast('创建角色失败：' + error.message, 'error');
    }
  },

  // 处理头像上传
  async handleProfileAvatarUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      this.showToast('请选择图片文件', 'error');
      return;
    }
    
    // 检查文件大小（限制 5MB）
    if (file.size > 5 * 1024 * 1024) {
      this.showToast('图片大小不能超过 5MB', 'error');
      return;
    }
    
    try {
      // 读取图片文件
      const imageData = await this.readFileAsDataURL(file);
      
      // 获取当前玩家名字
      const playerName = document.getElementById('profile-player-name').textContent;
      if (playerName === '未登录') {
        this.showToast('请先保存成绩创建角色', 'error');
        return;
      }
      
      // 保存到数据库
      const profile = await getPlayerProfile(playerName);
      if (profile) {
        await db.playerProfiles.update(profile.id, {
          avatar: imageData
        });
      } else {
        // 如果 profile 不存在，创建一个
        const level = calculateLevel(0);
        const newProfile = {
          playerName: playerName,
          totalPoints: 0,
          level: level.id,
          avatar: imageData,
          lastPlayedAt: Date.now()
        };
        await db.playerProfiles.add(newProfile);
      }
      
      // 更新头像显示
      this.displayProfileAvatar(imageData);
      
      this.showToast('头像已更新', 'success');
    } catch (error) {
      console.error('头像上传失败:', error);
      this.showToast('上传失败，请重试', 'error');
    }
    
    // 清空 input，允许重复上传同一文件
    input.value = '';
  },

  // 读取文件为 DataURL
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  },

  // 显示头像
  displayProfileAvatar(imageData) {
    const avatarImage = document.getElementById('profile-avatar-image');
    const avatarDefault = document.getElementById('profile-avatar-default');
    
    if (imageData) {
      avatarImage.src = imageData;
      avatarImage.style.display = 'block';
      avatarDefault.style.display = 'none';
    } else {
      avatarImage.style.display = 'none';
      avatarDefault.style.display = 'block';
    }
  },

  // 渲染练习成绩列表（排行榜）
  async renderPracticeScores() {
    const container = document.getElementById('practice-scores-list');
    if (!container) return;

    // 获取所有玩家档案，按总积分降序排列
    const profiles = await db.playerProfiles
      .orderBy('totalPoints')
      .reverse()
      .toArray();

    if (profiles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏆</div>
          <div class="empty-title">暂无排行榜数据</div>
          <div class="empty-subtitle">完成练习并保存成绩后将显示在这里</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${profiles.map((profile, index) => {
          const rank = index + 1;
          let rankBadge = '';
          if (rank === 1) rankBadge = '🥇';
          else if (rank === 2) rankBadge = '🥈';
          else if (rank === 3) rankBadge = '🥉';
          else rankBadge = `<span style="color: var(--text-muted); font-weight: 600;">#${rank}</span>`;
          
          const levelInfo = LEVEL_SYSTEM.levels.find(l => l.id === profile.level);
          const lastPlayed = new Date(profile.lastPlayedAt).toLocaleDateString('zh-CN');
          
          return `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="font-size: 24px; min-width: 36px; text-align: center;">${rankBadge}</div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="font-weight: 600; color: var(--text-primary); font-size: 16px;">${profile.playerName}</span>
                  <span style="font-size: 14px;">${levelInfo.icon}</span>
                  <span style="font-size: 11px; color: var(--text-muted); padding: 2px 6px; background: var(--bg-secondary); border-radius: 4px;">${levelInfo.name}</span>
                </div>
                <div style="font-size: 12px; color: var(--text-muted);">上次练习：${lastPlayed}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 24px; font-weight: 700; color: var(--primary);">${profile.totalPoints}</div>
                <div style="font-size: 10px; color: var(--text-muted);">总积分</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  async renderErrorChart() {
    const ctx = document.getElementById('error-chart');
    if (!ctx) return;
    
    // Get error distribution
    const words = await db.words.toArray();
    const distribution = {
      '无错误': words.filter(w => w.errorCount === 0).length,
      '1-2次': words.filter(w => w.errorCount >= 1 && w.errorCount <= 2).length,
      '3-5次': words.filter(w => w.errorCount >= 3 && w.errorCount <= 5).length,
      '5次以上': words.filter(w => w.errorCount > 5).length
    };
    
    // Destroy existing chart
    if (window.errorChart) {
      window.errorChart.destroy();
    }
    
    window.errorChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(distribution),
        datasets: [{
          data: Object.values(distribution),
          backgroundColor: [
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#7c3aed'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              padding: 20,
              font: { size: 12 }
            }
          }
        }
      }
    });
  },

  // Data Export/Import
  async exportData() {
    // 获取单词数据并排除 createdAt 和 lastPracticed 属性
    const words = await db.words.toArray();
    const sanitizedWords = words.map(word => ({
      id: word.id,
      word: word.word,
      translation: word.translation,
      bookIds: word.bookIds,
      errorCount: word.errorCount
    }));
    
    // 获取单词本数据并排除 createdAt 属性
    const books = await db.books.toArray();
    const sanitizedBooks = books.map(book => ({
      id: book.id,
      bookId: book.bookId,
      bookName: book.bookName
    }));

    // 获取练习成绩
    const scores = await db.practiceScores.toArray();
    
    // 获取玩家档案（角色数据），排除头像
    const profiles = await db.playerProfiles.toArray();
    const sanitizedProfiles = profiles.map(profile => ({
      id: profile.id,
      playerName: profile.playerName,
      totalPoints: profile.totalPoints,
      level: profile.level,
      levelName: profile.levelName,
      lastPlayedAt: profile.lastPlayedAt
    }));
    
    const data = {
      words: sanitizedWords,
      books: sanitizedBooks,
      practiceScores: scores,
      playerProfiles: sanitizedProfiles,
      exportDate: new Date().toISOString(),
      version: '1.3'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speliday_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('数据已导出', 'success');
  },

  importData() {
    this.triggerImport();
  },

  triggerImport() {
    const fileInput = document.getElementById('import-file');
    if (fileInput) {
      fileInput.click();
    }
  },

  async handleImport(input) {
    const file = input.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.words || !Array.isArray(data.words)) {
        throw new Error('无效的数据格式');
      }
      
      // Count profiles if available
      const profileCount = data.playerProfiles ? data.playerProfiles.length : 0;
      const confirmMsg = profileCount > 0
        ? `确定要导入 ${data.words.length} 个单词和 ${profileCount} 个角色数据吗？这将覆盖现有数据。`
        : `确定要导入 ${data.words.length} 个单词吗？这将覆盖现有数据。`;
      
      // Confirm
      if (!confirm(confirmMsg)) {
        return;
      }
      
      // 保存现有角色头像
      const existingProfiles = await db.playerProfiles.toArray();
      const avatarMap = {};
      for (const profile of existingProfiles) {
        if (profile.avatar) {
          avatarMap[profile.playerName] = profile.avatar;
        }
      }
      
      // Clear existing data
      await db.words.clear();
      await db.books.clear();
      await db.practiceScores.clear();
      await db.playerProfiles.clear();
      
      // Import books
      if (data.books) {
        for (const book of data.books) {
          await db.books.add(book);
        }
      }
      
      // Import words
      for (const word of data.words) {
        await db.words.add(word);
      }

      // Import practice scores
      if (data.practiceScores) {
        for (const score of data.practiceScores) {
          await db.practiceScores.add(score);
        }
      }
      
      // Import player profiles (角色数据和排行榜)，恢复头像
      if (data.playerProfiles) {
        for (const profile of data.playerProfiles) {
          const profileData = { ...profile };
          // 恢复该角色的头像（如果存在）
          if (avatarMap[profile.playerName]) {
            profileData.avatar = avatarMap[profile.playerName];
          }
          await db.playerProfiles.add(profileData);
        }
      }
      
      await this.loadBooks();
      await this.loadWords();
      this.updateStats();
      this.renderRecentWords();
      this.renderBookTabs();
      this.renderStats();
      this.renderProfile();
      
      this.showToast('数据导入成功', 'success');
    } catch (error) {
      this.showToast('导入失败: ' + error.message, 'error');
    }
    
    input.value = '';
  },

  // Settings
  openSettings() {
    document.getElementById('settings-modal').classList.add('active');
  },

  closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
  },

  openApiSettings() {
    document.getElementById('api-modal').classList.add('active');
  },

  closeApiSettings() {
    document.getElementById('api-modal').classList.remove('active');
  },

  openDataModal() {
    document.getElementById('data-modal').classList.add('active');
  },

  closeDataModal() {
    document.getElementById('data-modal').classList.remove('active');
  },

  async saveApiSettings() {
    // API 配置已内置，不允许用户修改
    this.closeApiSettings();
    this.showToast('API配置已内置，无需修改', 'info');
  },

  // Book Management
  async manageBooks() {
    await this.renderBookList();
    document.getElementById('book-modal').classList.add('active');
  },

  closeBookManagement() {
    document.getElementById('book-modal').classList.remove('active');
  },

  async renderBookList() {
    const container = document.getElementById('book-list');
    const books = state.books.filter(b => b.bookId !== 'default' && b.bookId !== 'high-error');
    
    if (books.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-subtitle">暂无自定义单词本</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = books.map(book => `
      <div class="word-item">
        <div class="word-info">
          <div class="word-text">${book.bookName}</div>
        </div>
        <div class="word-meta">
          <button class="table-btn" onclick="app.deleteBook('${book.bookId}')">🗑️</button>
        </div>
      </div>
    `).join('');
  },

  async createBook() {
    const name = document.getElementById('new-book-name').value.trim();
    if (!name) {
      this.showToast('请输入单词本名称', 'error');
      return;
    }
    
    const bookId = 'book_' + Date.now();
    await db.books.add({
      bookId,
      bookName: name,
      createdAt: Date.now()
    });
    
    document.getElementById('new-book-name').value = '';
    await this.loadBooks();
    await this.renderBookList();
    this.renderBookTabs();
    this.updateBookSelects();
    this.showToast('单词本创建成功', 'success');
  },

  async createBookFromInput() {
    const name = document.getElementById('new-book-input').value.trim();
    if (!name) {
      this.showToast('请输入单词本名称', 'error');
      return;
    }
    
    // 检查是否已存在同名单词本
    const existingBook = state.books.find(b => b.bookName === name);
    if (existingBook) {
      this.showToast('该单词本已存在', 'error');
      return;
    }
    
    const bookId = 'book_' + Date.now();
    await db.books.add({
      bookId,
      bookName: name,
      createdAt: Date.now()
    });
    
    document.getElementById('new-book-input').value = '';
    await this.loadBooks();
    await this.renderBookList();
    this.renderBookTabs();
    this.updateBookSelects();
    this.updateFilterBookSelect();
    this.updateBookDatalist();
    this.showToast('单词本创建成功', 'success');
  },

  updateBookDatalist() {
    const datalist = document.getElementById('book-datalist');
    if (!datalist) return;
    
    datalist.innerHTML = state.books.map(book => 
      `<option value="${book.bookName}">`
    ).join('');
  },

  renderBookTabs() {
    this.updateFilterBookSelect();
    this.updateBookDatalist();
  },

  async deleteBookFromInput() {
    const name = document.getElementById('new-book-input').value.trim();
    if (!name) {
      this.showToast('请输入或选择要删除的单词本名称', 'error');
      return;
    }
    
    const book = state.books.find(b => b.bookName === name);
    if (!book) {
      this.showToast('未找到该单词本', 'error');
      return;
    }
    
    if (!confirm(`确定要删除单词本"${name}"吗？其中的单词将从该单词本中移除，如果单词不属于任何其他单词本，则会被移至默认单词本。`)) return;
    
    // 获取所有单词，处理属于该单词本的单词
    const allWords = await db.words.toArray();
    for (const word of allWords) {
      const bookIds = word.bookIds || [];
      if (bookIds.includes(book.bookId)) {
        // 从 bookIds 中移除该单词本
        const newBookIds = bookIds.filter(id => id !== book.bookId);
        // 如果移除后没有单词本了，添加到默认单词本
        if (newBookIds.length === 0) {
          newBookIds.push('default');
        }
        await db.words.update(word.id, { bookIds: newBookIds });
      }
    }
    
    // Delete book
    const bookRecord = await db.books.get({ bookId: book.bookId });
    if (bookRecord) {
      await db.books.delete(bookRecord.id);
    }
    
    document.getElementById('new-book-input').value = '';
    await this.loadBooks();
    
    // 检查当前筛选的单词本是否是被删除的，如果是则重置为'all'
    const filterBookSelect = document.getElementById('filter-book');
    if (filterBookSelect && filterBookSelect.value === book.bookId) {
      filterBookSelect.value = 'all';
    }
    
    await this.renderBookList();
    this.renderBookTabs();
    this.updateBookSelects();
    this.updateFilterBookSelect();
    this.updateBookDatalist();
    this.showToast('单词本删除成功', 'success');
  },

  async deleteBook(bookId) {
    if (!confirm('确定要删除这个单词本吗？其中的单词将从该单词本中移除，如果单词不属于任何其他单词本，则会被移至默认单词本。')) return;
    
    // 获取所有单词，处理属于该单词本的单词
    const allWords = await db.words.toArray();
    for (const word of allWords) {
      const bookIds = word.bookIds || [];
      if (bookIds.includes(bookId)) {
        // 从 bookIds 中移除该单词本
        const newBookIds = bookIds.filter(id => id !== bookId);
        // 如果移除后没有单词本了，添加到默认单词本
        if (newBookIds.length === 0) {
          newBookIds.push('default');
        }
        await db.words.update(word.id, { bookIds: newBookIds });
      }
    }
    
    // Delete book
    const book = await db.books.get({ bookId });
    if (book) {
      await db.books.delete(book.id);
    }
    
    await this.loadBooks();
    await this.renderBookList();
    this.renderBookTabs();
    this.updateBookSelects();
    this.showToast('单词本已删除', 'success');
  },

  async clearAllData() {
    if (!confirm('确定要清除所有数据吗？此操作不可恢复！\n\n将清除：单词、单词本、练习记录、角色积分和等级\n将保留：角色头像')) return;
    if (!confirm('再次确认：所有数据将被删除（头像除外）！')) return;
    
    await db.words.clear();
    await db.books.clear();
    await db.practiceScores.clear();
    await db.dailyPracticeSessions.clear();
    
    // 清除角色数据但保留头像
    const profiles = await db.playerProfiles.toArray();
    for (const profile of profiles) {
      if (profile.avatar) {
        // 保留有头像的角色，只清除其他数据
      await db.playerProfiles.update(profile.id, {
        totalPoints: 0,
        level: 1,
        lastPlayedAt: null
      });
      
      // 同时清除魂力数据
      const spiritProfile = await db.playerSpiritPower.where('playerId').equals(profile.id).first();
      if (spiritProfile) {
        await db.playerSpiritPower.update(spiritProfile.id, {
          totalSpiritPower: 0,
          currentTier: '魂士',
          currentLevel: 1,
          lastUpdated: Date.now()
        });
      }
      } else {
        // 没有头像的角色直接删除
        await db.playerProfiles.delete(profile.id);
      }
    }
    
    await this.initDatabase();
    await this.loadBooks();
    await this.loadWords();
    
    this.updateStats();
    this.renderRecentWords();
    this.renderBookTabs();
    this.renderLibrary();
    this.renderStats();
    this.renderProfile();
    
    this.showToast('所有数据已清除', 'success');
  },

  // Utilities
  showLoading(text = '加载中...') {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').style.display = 'flex';
  },

  hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
  },

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  },

  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  },

  // 高频错词设置 - 更新显示值
  updateHighErrorSettingDisplay(inputId, displayId, suffix) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(displayId);
    if (input && display) {
      display.textContent = input.value + suffix;
    }
  },

  // 高频错词设置 - 加载设置到页面
  async loadHighErrorSettingsToPage() {
    const settings = await this.loadHighErrorSettings();
    
    // 设置滑块值
    document.getElementById('min-practice-count').value = settings.minPracticeCount;
    document.getElementById('accuracy-threshold').value = settings.accuracyThreshold;
    document.getElementById('error-count-threshold').value = settings.errorCountThreshold;
    
    // 更新显示值
    this.updateHighErrorSettingDisplay('min-practice-count', 'min-practice-display', ' 次');
    this.updateHighErrorSettingDisplay('accuracy-threshold', 'accuracy-threshold-display', '%');
    this.updateHighErrorSettingDisplay('error-count-threshold', 'error-count-display', ' 次');
  },

  // 高频错词设置 - 保存设置
  async saveHighErrorSettings() {
    const minPracticeCount = parseInt(document.getElementById('min-practice-count').value);
    const accuracyThreshold = parseInt(document.getElementById('accuracy-threshold').value);
    const errorCountThreshold = parseInt(document.getElementById('error-count-threshold').value);
    
    await this.saveHighErrorSetting('minPracticeCount', minPracticeCount);
    await this.saveHighErrorSetting('accuracyThreshold', accuracyThreshold);
    await this.saveHighErrorSetting('errorCountThreshold', errorCountThreshold);
    
    this.showToast('高频错词设置已保存', 'success');
  },

  setupEventListeners() {
    // Enter key in practice input
    document.getElementById('practice-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const btn = document.getElementById('practice-check-btn');
        // 根据按钮当前文本决定行为
        if (btn && !btn.disabled) {
          btn.click();
        }
      }
    });

    // 练习完成弹窗中的姓名输入框也支持回车保存
    document.getElementById('player-name-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.savePracticeScore();
      }
    });

    // 句子填空练习的输入框回车支持
    document.getElementById('sentence-practice-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const btn = document.getElementById('sentence-check-btn');
        if (btn && !btn.disabled) {
          btn.click();
        }
      }
    });

    // 句子填空完成弹窗中的姓名输入框也支持回车保存
    document.getElementById('sentence-player-name-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveSentencePracticeScore();
      }
    });
  },

  // ==================== 句子填空练习功能 ====================

  // 直接从练习页面进入句子填空练习（使用当前设置）
  async startSentencePracticeDirect() {
    // 获取当前练习页面的设置
    const bookId = document.getElementById('practice-book-select').value;
    const count = parseInt(document.getElementById('practice-count').value) || 10;

    // 切换到句子填空练习页面
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
    });
    document.getElementById('page-sentence-practice').classList.add('active');

    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });

    // 直接开始练习（跳过设置页面）
    await this.startSentencePracticeWithSettings(bookId, count, 'random');
  },

  // 使用指定设置开始句子填空练习
  async startSentencePracticeWithSettings(bookId, count, mode) {
    let words;
    if (mode === 'error') {
      // 高频错词 - 属于 high-error 单词本的单词
      const allWords = await db.words.toArray();
      words = allWords.filter(w => {
        const bookIds = w.bookIds || [];
        return bookIds.includes('high-error');
      });
      if (words.length === 0) {
        this.showToast('没有高频错词，先去练习吧！', 'error');
        // 返回练习页面
        document.querySelectorAll('.page').forEach(p => {
          p.classList.remove('active');
        });
        document.getElementById('page-practice').classList.add('active');
        return;
      }
    } else if (bookId === 'all') {
      words = await db.words.toArray();
    } else {
      // 获取所有单词，然后筛选属于该单词本的
      words = await db.words.toArray();
      words = words.filter(word => this.wordBelongsToBook(word, bookId));
    }

    if (words.length === 0) {
      this.showToast('所选单词本为空', 'error');
      // 返回练习页面
      document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
      });
      document.getElementById('page-practice').classList.add('active');
      return;
    }

    // 打乱并限制数量
    state.sentencePracticeWords = this.shuffleArray(words).slice(0, Math.min(count, words.length));
    state.currentSentenceIndex = 0;
    state.sentenceWrongWordsInRound = [];
    state.sentenceConsecutiveCorrectCount = 0;
    state.sentencePracticeScore = 0;
    state.sentenceTotalWords = state.sentencePracticeWords.length;
    state.sentenceFirstRoundTotalWords = state.sentencePracticeWords.length; // 记录第一轮总单词数（用于正确率计算）
    state.sentenceCorrectWords = 0;
    state.sentenceFirstRoundCorrectIds = []; // 重置第一轮正确单词记录
    state.sentenceFirstRoundWrongIds = []; // 重置第一轮错误单词记录

    // 显示加载提示
    this.showLoading('正在生成句子...');

    try {
      // 为每个单词生成句子
      state.sentencePracticeData = await this.generateSentencesForWords(state.sentencePracticeWords);

      this.hideLoading();

      // 隐藏设置区域，显示练习区域
      document.getElementById('sentence-practice-setup').style.display = 'none';
      document.getElementById('sentence-practice-area').style.display = 'block';

      // 隐藏底部导航栏
      document.querySelector('.bottom-nav').style.display = 'none';

      // 隐藏 header 并调整内容位置
      document.querySelector('.header').classList.add('hidden');
      document.querySelector('.main-content').classList.add('practice-mode');

      // 显示第一个单词
      this.showNextSentence();

      // 启动倒计时动画
      this.startSentencePracticeCountdown();
    } catch (error) {
      this.hideLoading();
      this.showToast('生成句子失败: ' + error.message, 'error');
      console.error(error);
      // 返回练习页面
      document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
      });
      document.getElementById('page-practice').classList.add('active');
    }
  },

  // 打开句子填空练习设置页面（从导航或其他入口使用）
  startSentencePractice() {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
    });

    // 显示句子填空练习页面
    document.getElementById('page-sentence-practice').classList.add('active');

    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });

    // 重置练习区域显示
    document.getElementById('sentence-practice-setup').style.display = 'block';
    document.getElementById('sentence-practice-area').style.display = 'none';

    // 更新单词本选择下拉框
    this.updateBookSelects();
  },

  // 开始句子填空练习模式（从设置页面调用）
  async startSentencePracticeMode(mode) {
    const bookId = document.getElementById('sentence-practice-book-select').value;
    const count = parseInt(document.getElementById('sentence-practice-count').value) || 10;

    await this.startSentencePracticeWithSettings(bookId, count, mode);
  },

  // 为单词列表生成句子
  async generateSentencesForWords(words) {
    const results = [];

    // 批量处理，每批最多5个单词，避免API请求过大
    const batchSize = 5;
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      const batchResults = await this.generateSentenceBatch(batch);
      results.push(...batchResults);
    }

    return results;
  },

  // 批量生成句子
  async generateSentenceBatch(words) {
    const { provider, key, url } = state.apiSettings;

    // 构建单词列表
    const wordList = words.map(w => `${w.word}: ${w.translation}`).join('\n');

    const prompt = `请为以下每个英文单词生成一个包含该单词的英语短句以及对应的中文解释。
要求：
1. 句子要简单易懂，适合英语学习者
2. 句子长度控制在8-15个单词
3. **重要：目标单词在句子中必须保持原始形态，不要变形（如run不要变成runs/running/ran，apple不要变成apples）**
4. 返回JSON数组格式

单词列表：
${wordList}

返回格式示例：
[
  {
    "word": "apple",
    "sentence": "I want to eat an apple today.",
    "chineseTranslation": "我今天想吃一个苹果。",
    "hiddenWord": "apple"
  },
  {
    "word": "run",
    "sentence": "I run in the park every morning.",
    "chineseTranslation": "我每天早上在公园跑步。",
    "hiddenWord": "run"
  }
]

注意：
- word字段是原始单词（从词库中抽取的形态）
- sentence字段是完整英文句子
- chineseTranslation字段是句子的中文翻译
- **hiddenWord字段必须与原始word字段完全一致，不要变形**
- 只返回JSON数组，不要其他文字`;

    let response;

    if (provider === 'glm' || provider === 'glm4v') {
      // 使用GLM-4-Flash API
      response = await fetch(url || 'https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'GLM-4-Flash',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000
        })
      });
    } else if (provider === 'openai') {
      response = await fetch(url || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000
        })
      });
    } else {
      // 如果没有API key，使用模拟数据
      return words.map(w => this.getMockSentenceData(w));
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('API Error:', errorData);
      // 如果API失败，使用模拟数据
      return words.map(w => this.getMockSentenceData(w));
    }

    const data = await response.json();
    let content;

    if (provider === 'openai' || provider === 'glm' || provider === 'glm4v') {
      content = data.choices[0].message.content;
    } else {
      content = data.candidates[0].content.parts[0].text;
    }

    // 提取JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const results = JSON.parse(jsonMatch[0]);
        if (Array.isArray(results) && results.length > 0) {
          // 确保每个结果都有正确的wordId
          return results.map((item, index) => ({
            ...item,
            wordId: words[index]?.id,
            originalWord: words[index]?.word,
            originalTranslation: words[index]?.translation
          }));
        }
      } catch (e) {
        console.error('JSON parse error:', e);
      }
    }

    // 如果解析失败，使用模拟数据
    return words.map(w => this.getMockSentenceData(w));
  },

  // 获取模拟句子数据（当API不可用时使用）
  getMockSentenceData(word) {
    // 根据单词生成简单的模拟句子
    const mockSentences = {
      'apple': { sentence: 'I eat an apple every day.', chineseTranslation: '我每天吃一个苹果。', hiddenWord: 'apple' },
      'book': { sentence: 'She reads a book in the library.', chineseTranslation: '她在图书馆看书。', hiddenWord: 'book' },
      'run': { sentence: 'He runs fast in the morning.', chineseTranslation: '他早上跑得很快。', hiddenWord: 'runs' },
      'happy': { sentence: 'The children are happy today.', chineseTranslation: '孩子们今天很开心。', hiddenWord: 'happy' },
      'water': { sentence: 'Please drink more water.', chineseTranslation: '请多喝水。', hiddenWord: 'water' }
    };

    const mock = mockSentences[word.word.toLowerCase()] || {
      sentence: `This is a sentence with the word ${word.word}.`,
      chineseTranslation: `这是一个包含单词${word.word}的句子。`,
      hiddenWord: word.word
    };

    return {
      word: word.word,
      wordId: word.id,
      originalWord: word.word,
      originalTranslation: word.translation,
      sentence: mock.sentence,
      chineseTranslation: mock.chineseTranslation,
      hiddenWord: mock.hiddenWord
    };
  },

  // 句子填空练习倒计时
  startSentencePracticeCountdown() {
    const countdownEl = document.getElementById('sentence-practice-countdown');
    const numberEl = document.getElementById('sentence-countdown-number');
    const textEl = document.querySelector('#sentence-practice-countdown .practice-countdown-text');

    // 显示倒数动画层
    countdownEl.style.display = 'flex';

    // 倒数数字
    let count = 3;
    const countdownTexts = ['准备开始', '集中注意力', '即将开始'];

    const updateCountdown = () => {
      if (count > 0) {
        // 更新数字和文字
        numberEl.textContent = count;
        textEl.textContent = countdownTexts[3 - count];

        // 重新触发动画
        numberEl.style.animation = 'none';
        numberEl.offsetHeight; // 强制重绘
        numberEl.style.animation = 'practiceCountdownNumberPulse 1s ease-out';

        count--;
        setTimeout(updateCountdown, 1000);
      } else {
        // 显示 "GO!"
        numberEl.textContent = 'GO!';
        numberEl.classList.add('go-text');
        textEl.textContent = '开始填空！';

        // 延迟后隐藏倒数层
        setTimeout(() => {
          countdownEl.style.display = 'none';
          numberEl.classList.remove('go-text');
        }, 600);
      }
    };

    // 开始倒数
    updateCountdown();
  },

  // 显示下一个句子填空
  showNextSentence() {
    if (state.currentSentenceIndex >= state.sentencePracticeData.length) {
      // 一轮结束，检查是否有错误的单词
      if (state.sentenceWrongWordsInRound.length > 0) {
        // 有错误单词，将它们加入练习列表再次练习
        const wrongCount = state.sentenceWrongWordsInRound.length;
        this.showToast(`本轮有 ${wrongCount} 个单词需要复习`, 'info');

        // 直接使用之前的句子数据，不重新生成
        this.reuseWrongSentenceData();
        return;
      }

      // 没有错误单词，练习真正完成
      this.showSentencePracticeCompleteModal();
      return;
    }

    const data = state.sentencePracticeData[state.currentSentenceIndex];
    state.sentenceHintUsed = false;

    // 显示中文释义
    document.getElementById('sentence-chinese-translation').textContent = data.chineseTranslation;

    // 显示英文句子，隐藏目标单词（使用原始单词形态作为占位符提示）
    const hiddenSentence = this.hideWordInSentence(data.sentence, data.hiddenWord, data.originalWord);
    document.getElementById('sentence-english').innerHTML = hiddenSentence;

    // 清空输入框并聚焦
    document.getElementById('sentence-practice-input').value = '';
    document.getElementById('sentence-practice-input').focus();

    // 更新进度
    const progress = ((state.currentSentenceIndex) / state.sentencePracticeData.length) * 100;
    document.getElementById('sentence-practice-progress-fill').style.width = `${progress}%`;
    document.getElementById('sentence-practice-current').textContent = state.currentSentenceIndex + 1;
    document.getElementById('sentence-practice-total').textContent = state.sentencePracticeData.length;

    // 更新积分显示
    this.updateSentenceScoreDisplay();

    // 隐藏反馈
    const feedback = document.getElementById('sentence-practice-feedback');
    feedback.classList.remove('show', 'correct', 'incorrect');

    // 重置按钮
    const btn = document.getElementById('sentence-check-btn');
    btn.innerHTML = '<i class="fa fa-check"></i> 检查';
    btn.onclick = () => this.checkSentenceAnswer();
  },

  // 在句子中隐藏单词，显示为等长的空格占位符
  hideWordInSentence(sentence, hiddenWord, originalWord) {
    // 首先尝试精确匹配 hiddenWord
    let escapedWord = hiddenWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');

    // 如果找不到，尝试匹配原始单词
    if (!regex.test(sentence)) {
      escapedWord = originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    }

    // 如果还是找不到，尝试查找包含原始单词的任何形式（作为子串）
    if (!regex.test(sentence)) {
      // 尝试在句子中查找包含原始单词的单词（如 attract 匹配 attracts）
      const wordBoundaryRegex = new RegExp(`\\b${escapedWord}[a-z]*\\b`, 'gi');
      if (wordBoundaryRegex.test(sentence)) {
        regex = wordBoundaryRegex;
      }
    }

    // 创建与原始单词等长的占位符（每个字母对应一个下划线）
    const placeholder = ' _ '.repeat(originalWord.length).trim();

    // 用占位符替换单词，确保留出足够的空间
    return sentence.replace(regex, `<span style="color: var(--primary); font-weight: 700; border-bottom: 2px solid var(--primary); display: inline-block; min-width: ${originalWord.length * 20}px; text-align: center; letter-spacing: 2px;">${placeholder}</span>`);
  },

  // 直接使用之前的句子数据，不重新生成
  reuseWrongSentenceData() {
    // 从错误单词列表中筛选出之前练习过的句子数据
    const wrongWordIds = state.sentenceWrongWordsInRound.map(w => w.id);
    const reusedData = state.sentencePracticeData.filter(data =>
      wrongWordIds.includes(data.wordId)
    );

    // 如果有未找到的句子数据（理论上不应该发生），使用模拟数据补充
    const foundIds = reusedData.map(d => d.wordId);
    const missingWords = state.sentenceWrongWordsInRound.filter(w => !foundIds.includes(w.id));

    if (missingWords.length > 0) {
      const mockData = missingWords.map(w => this.getMockSentenceData(w));
      reusedData.push(...mockData);
    }

    // 打乱顺序并更新状态
    state.sentencePracticeData = this.shuffleArray([...reusedData]);
    state.currentSentenceIndex = 0;
    state.sentenceWrongWordsInRound = [];

    // 短暂延迟后显示下一个
    setTimeout(() => {
      this.showNextSentence();
    }, 1500);
  },

  // 重新生成错误单词的句子数据（保留用于其他场景）
  async regenerateWrongSentenceData() {
    this.showLoading('正在生成新的句子...');

    try {
      const newData = await this.generateSentencesForWords(state.sentenceWrongWordsInRound);
      state.sentencePracticeData = this.shuffleArray([...newData]);
      state.currentSentenceIndex = 0;
      state.sentenceWrongWordsInRound = [];

      this.hideLoading();
      this.showNextSentence();
    } catch (error) {
      this.hideLoading();
      this.showToast('生成句子失败，使用默认句子', 'error');
      // 使用模拟数据继续
      state.sentencePracticeData = state.sentenceWrongWordsInRound.map(w => this.getMockSentenceData(w));
      state.currentSentenceIndex = 0;
      state.sentenceWrongWordsInRound = [];
      this.showNextSentence();
    }
  },

  // 更新句子填空积分显示
  updateSentenceScoreDisplay() {
    const scoreEl = document.getElementById('sentence-practice-current-score');
    if (scoreEl) {
      scoreEl.textContent = state.sentencePracticeScore;
    }
  },

  // 更新积分显示并添加动画
  updateSentenceScoreDisplayWithAnimation() {
    const scoreEl = document.getElementById('sentence-practice-current-score');
    if (scoreEl) {
      scoreEl.textContent = state.sentencePracticeScore;
      scoreEl.classList.add('score-updated');
      setTimeout(() => {
        scoreEl.classList.remove('score-updated');
      }, 500);
    }
  },

  // 显示提示
  showSentenceHint() {
    if (state.sentenceHintUsed) {
      this.showToast('已经使用过提示了', 'info');
      return;
    }

    const data = state.sentencePracticeData[state.currentSentenceIndex];
    if (!data) return;

    // 显示单词的前几个字母作为提示
    const hint = data.hiddenWord.substring(0, Math.ceil(data.hiddenWord.length / 2));
    document.getElementById('sentence-practice-input').value = hint;
    document.getElementById('sentence-practice-input').focus();

    state.sentenceHintUsed = true;
    this.showToast(`提示: 单词以 "${hint}" 开头`, 'info');
  },

  // 检查句子填空答案
  async checkSentenceAnswer() {
    const input = document.getElementById('sentence-practice-input').value.trim().toLowerCase();
    const data = state.sentencePracticeData[state.currentSentenceIndex];
    const feedback = document.getElementById('sentence-practice-feedback');
    const btn = document.getElementById('sentence-check-btn');

    if (!input) {
      this.showToast('请输入单词', 'error');
      return;
    }

    // 检查超级作弊码：输入"xxx"立即完成所有句子填空练习
    if (input === 'xxx') {
      // 计算总得分：单词个数 × 5
      const totalWords = state.sentencePracticeData.length;
      const bonusScore = totalWords * 5;
      state.sentencePracticeScore += bonusScore;
      
      // 更新所有单词的练习时间，但不记录正确或错误次数
      for (const sentenceData of state.sentencePracticeData) {
        if (sentenceData.wordId) {
          await db.words.update(sentenceData.wordId, {
            lastPracticed: Date.now()
          });
          
          // 记录为正确（用于正确率统计）
          if (!state.sentenceFirstRoundCorrectIds.includes(sentenceData.wordId)) {
            state.sentenceFirstRoundCorrectIds.push(sentenceData.wordId);
          }
        }
      }
      
      // 更新正确数为总单词数
      state.sentenceCorrectWords = totalWords;
      
      // 更新积分显示
      this.updateSentenceScoreDisplayWithAnimation();
      
      // 显示作弊成功提示
      this.showToast(`🎉 作弊成功！立即完成练习，获得 ${bonusScore} 分奖励`, 'success');
      
      // 直接显示完成界面
      setTimeout(() => {
        this.showSentencePracticeCompleteModal();
      }, 1000);
      
      return;
    }

    // 检查作弊码：输入"zzz"匹配一切答案（不记录正确/错误次数）
    const isCheatCode = input === 'zzz';
    
    // 使用 zz 作弊码时，不记录正确/错误次数，只更新练习时间
    if (isCheatCode) {
      // 增加连续正确计数
      state.sentenceConsecutiveCorrectCount++;

      // 计算本次得分：第 1 次 1 分，每次 +1 分，最高 5 分；如果使用提示则只得 1 分
      let pointsEarned;
      if (state.sentenceHintUsed) {
        pointsEarned = 1;
      } else {
        pointsEarned = Math.min(state.sentenceConsecutiveCorrectCount, 5);
      }
      state.sentencePracticeScore += pointsEarned;

      // 只记录第一轮就答对的单词（用于正确率计算）
      if (data.wordId && !state.sentenceFirstRoundCorrectIds.includes(data.wordId) && !state.sentenceFirstRoundWrongIds.includes(data.wordId)) {
        state.sentenceFirstRoundCorrectIds.push(data.wordId);
        state.sentenceCorrectWords++;
      }

      // 更新积分显示并添加动画
      this.updateSentenceScoreDisplayWithAnimation();

      // 显示赞赏动画
      this.showPraiseAnimation(state.sentenceConsecutiveCorrectCount);

      // 显示完整句子（高亮句子中的单词形态）
      const fullSentence = data.sentence.replace(
        new RegExp(`\\b${data.hiddenWord}\\b`, 'gi'),
        `<span style="color: var(--success); font-weight: 700;">${data.hiddenWord}</span>`
      );

      feedback.innerHTML = `
        <div>✅ 回答正确！+${pointsEarned}分</div>
        <div style="margin-top: 8px; font-size: 16px;">${fullSentence}</div>
      `;
      feedback.className = 'practice-feedback correct show';

      // 只更新练习时间，不记录正确次数
      if (data.wordId) {
        await db.words.update(data.wordId, {
          lastPracticed: Date.now()
        });
      }

      // 自动进入下一题
      setTimeout(() => {
        state.currentSentenceIndex++;
        this.showNextSentence();
      }, 2000);
      
      if (data.wordId) {
        await this.checkAndUpdateHighErrorStatus(data.wordId);
      }
      return;
    }
    
    // 检查答案（比较输入和原始单词，不区分大小写）
    // 用户需要输入词库中的原始单词形态
    const isCorrect = input === data.originalWord.toLowerCase();

    if (isCorrect) {
      // 增加连续正确计数
      state.sentenceConsecutiveCorrectCount++;

      // 计算本次得分：第1次1分，每次+1分，最高5分；如果使用提示则只得1分
      let pointsEarned;
      if (state.sentenceHintUsed) {
        pointsEarned = 1;
      } else {
        pointsEarned = Math.min(state.sentenceConsecutiveCorrectCount, 5);
      }
      state.sentencePracticeScore += pointsEarned;

      // 只记录第一轮就答对的单词（用于正确率计算）
      // 如果这个单词之前答错过，就不计入正确数
      if (data.wordId && !state.sentenceFirstRoundCorrectIds.includes(data.wordId) && !state.sentenceFirstRoundWrongIds.includes(data.wordId)) {
        state.sentenceFirstRoundCorrectIds.push(data.wordId);
        state.sentenceCorrectWords++;
      }

      // 更新积分显示并添加动画
      this.updateSentenceScoreDisplayWithAnimation();

      // 显示赞赏动画
      this.showPraiseAnimation(state.sentenceConsecutiveCorrectCount);

      // 显示完整句子（高亮句子中的单词形态）
      const fullSentence = data.sentence.replace(
        new RegExp(`\\b${data.hiddenWord}\\b`, 'gi'),
        `<span style="color: var(--success); font-weight: 700;">${data.hiddenWord}</span>`
      );

      feedback.innerHTML = `
        <div>✅ 回答正确！+${pointsEarned}分</div>
        <div style="margin-top: 8px; font-size: 16px;">${fullSentence}</div>
      `;
      feedback.className = 'practice-feedback correct show';

      // 更新数据库中的正确计数
      if (data.wordId) {
        const currentWord = await db.words.get(data.wordId);
        if (currentWord) {
          const newCorrectCount = (currentWord.correctCount || 0) + 1;
          await db.words.update(data.wordId, {
            lastPracticed: Date.now(),
            correctCount: newCorrectCount
          });
        }
      }

      // 自动进入下一题
      setTimeout(() => {
        state.currentSentenceIndex++;
        this.showNextSentence();
      }, 2000);
    } else {
      // 拼写错误，重置连续正确计数
      state.sentenceConsecutiveCorrectCount = 0;

      // 更新错误计数
      if (data.wordId) {
        const currentWord = await db.words.get(data.wordId);
        if (currentWord) {
          const newErrorCount = (currentWord.errorCount || 0) + 1;
          await db.words.update(data.wordId, {
            errorCount: newErrorCount,
            lastPracticed: Date.now()
          });

          // 记录本轮错误单词（保留原始句子数据）
          const existingIndex = state.sentenceWrongWordsInRound.findIndex(w => w.id === data.wordId);
          const updatedWordData = { ...currentWord, errorCount: newErrorCount };
          if (existingIndex === -1) {
            state.sentenceWrongWordsInRound.push(updatedWordData);
            // 同时记录到第一轮错误单词列表（用于正确率计算）
            if (!state.sentenceFirstRoundWrongIds.includes(data.wordId)) {
              state.sentenceFirstRoundWrongIds.push(data.wordId);
            }
          } else {
            state.sentenceWrongWordsInRound[existingIndex] = updatedWordData;
          }

          // 检查是否需要加入高频错词本
          await this.checkAndUpdateHighErrorStatus(data.wordId);
        }
      }

      // 高亮差异（与原始单词比较）
      const highlighted = this.highlightDifferences(input, data.originalWord);

      feedback.innerHTML = `
        <div>❌ 拼写错误</div>
        <div class="correct-word">正确：${data.originalWord}</div>
        <div style="margin-top: 8px; font-size: 14px; color: var(--text-secondary);">${data.sentence}</div>
      `;
      feedback.className = 'practice-feedback incorrect show';

      // 更新按钮为下一题
      btn.innerHTML = '<i class="fa fa-arrow-right"></i> 下一词';
      btn.onclick = () => {
        state.currentSentenceIndex++;
        this.showNextSentence();
      };
    }
  },

  // 显示句子填空完成弹窗
  showSentencePracticeCompleteModal() {
    const modal = document.getElementById('sentence-practice-complete-modal');
    const scoreDisplay = document.getElementById('sentence-complete-score');
    const statsDisplay = document.getElementById('sentence-complete-stats');

    scoreDisplay.textContent = state.sentencePracticeScore;
    statsDisplay.innerHTML = `
      <div>总单词数: ${state.sentenceFirstRoundTotalWords}</div>
      <div>正确数: ${state.sentenceCorrectWords}</div>
      <div>正确率: ${Math.round((state.sentenceCorrectWords / state.sentenceFirstRoundTotalWords) * 100)}%</div>
    `;

    // 加载已有玩家名字到 datalist
    this.loadPlayerNamesToDatalist('sentence-player-name-datalist');

    modal.classList.add('active');

    // 触发庆祝烟花
    this.triggerFireworks(5);
  },

  // 保存句子填空练习成绩
  async saveSentencePracticeScore() {
    const playerName = document.getElementById('sentence-player-name-input').value.trim();

    if (!playerName) {
      this.showToast('请输入姓名', 'error');
      return;
    }

    // 验证：单词数必须大于 0 才能保存成绩
    if (state.sentenceTotalWords <= 0) {
      this.showToast('练习数据无效，无法保存成绩', 'error');
      return;
    }

    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await db.practiceScores.add({
      playerName: playerName,
      totalScore: state.sentencePracticeScore,
      wordCount: state.sentenceTotalWords,
      correctCount: state.sentenceCorrectWords,
      mode: 'sentence', // 标记为句子填空模式
      createdAt: now
    });

    // 记录一次完整的练习完成
    await db.dailyPracticeSessions.add({
      date: today.getTime(),
      completedAt: now
    });

    // 斗罗大陆魂力系统：将积分转换为魂力（addSpiritPower 会同步更新 playerProfiles）
    const oldProfile = await getPlayerProfile(playerName);
    const spiritResult = await addSpiritPower(playerName, state.sentencePracticeScore, 'sentence_practice');
    
    // 检查是否因为需要突破而被阻止
    if (spiritResult && spiritResult.blocked) {
      this.showToast('⚠️ 突破限制！' + spiritResult.reason, 'error');
      await this.renderProfile();
      return;
    }
    
    // 日常任务追踪
    const playerProfile = await db.playerProfiles.where('playerName').equals(playerName).first();
    if (playerProfile) {
      // 1. 学院功课：完成一次句子填空
      await this.trackDailyTask(playerProfile.id, 'sentenceTraining');
      
      // 2. 单词训练：累加单词数
      await updateWordTrainingProgress(playerProfile.id, state.sentenceTotalWords);
      
      // 3. 连击挑战：达成 10 连击
      if (state.maxCombo >= 10) {
        await this.trackDailyTask(playerProfile.id, 'streak');
      }
      
      // 4. 完美通关：一轮全对（≥20 词）
      if (state.sentenceFirstRoundWrongIds.length === 0 && state.sentenceTotalWords >= 20) {
        await this.trackDailyTask(playerProfile.id, 'perfect');
      }
    }
    
    // 检查旧版等级系统是否升级
    let leveledUp = false;
    let newLevelInfo = null;
    if (oldProfile && spiritResult) {
      const oldLevel = LEVEL_SYSTEM.levels.find(l => l.id === oldProfile.level);
      newLevelInfo = LEVEL_SYSTEM.levels.find(l => l.id === spiritResult.newLevel.level);
      if (spiritResult.newLevel.level > oldProfile.level) {
        leveledUp = true;
        this.showToast(`恭喜升级！${newLevelInfo ? newLevelInfo.name : ''}`, 'success');
        this.triggerFireworks(8);
      }
    }
    
    // 斗罗大陆等级升级检测
    if (spiritResult && spiritResult.leveledUp) {
      this.showToast(`🔥 魂力突破！${spiritResult.newLevel.tierIcon} ${spiritResult.newLevel.tier} Lv.${spiritResult.newLevel.level} [${spiritResult.newLevel.title}]`, 'success');
      this.triggerFireworks(12);
    }

    // 副本挑战完成处理（句子填空模式）
    if (state.isDungeonMode && state.currentDungeonId) {
      await this.handleDungeonCompletion(playerProfile, true, {
        score: state.sentencePracticeScore,
        accuracy: state.sentenceTotalWords > 0 ? state.sentenceCorrectWords / state.sentenceTotalWords : 0
      });
    }

    this.closeSentencePracticeCompleteModal();
    this.endSentencePractice();
    this.updateStats();
    this.showToast('成绩已保存！', 'success');
  },

  // 关闭句子填空完成弹窗
  closeSentencePracticeCompleteModal() {
    document.getElementById('sentence-practice-complete-modal').classList.remove('active');
  },

  // 跳过保存句子填空成绩
  skipSentencePracticeScore() {
    this.closeSentencePracticeCompleteModal();
    this.endSentencePractice();
    this.showToast('练习已结束', 'info');
  },

  // 结束句子填空练习
  endSentencePractice() {
    document.getElementById('sentence-practice-setup').style.display = 'block';
    document.getElementById('sentence-practice-area').style.display = 'none';

    // 显示底部导航栏
    document.querySelector('.bottom-nav').style.display = 'flex';

    // 显示 header 并恢复内容位置
    document.querySelector('.header').classList.remove('hidden');
    document.querySelector('.main-content').classList.remove('practice-mode');

    // 重置状态
    state.sentencePracticeWords = [];
    state.sentencePracticeData = [];
    state.currentSentenceIndex = 0;
    state.sentenceWrongWordsInRound = [];
    state.sentenceConsecutiveCorrectCount = 0;
    state.sentencePracticeScore = 0;
    state.sentenceTotalWords = 0;
    state.sentenceCorrectWords = 0;
    state.sentenceHintUsed = false;
    state.sentenceFirstRoundCorrectIds = [];
    state.sentenceFirstRoundTotalWords = 0;
    state.sentenceFirstRoundWrongIds = [];
  },

  // 退出句子填空练习
  exitSentencePractice() {
    if (confirm('确定要退出练习吗？当前进度将不会保存。')) {
      this.endSentencePractice();
      this.showToast('已退出练习', 'info');
    }
  },

  // ===== 魂骨系统 UI 函数（阶段四/五） =====

  // 打开魂骨图鉴页面（阶段五：任务5.1）
  async openSoulBoneGallery() {
    const playerId = await this.getCurrentPlayerId();
    if (!playerId) {
      this.showToast('请先选择角色', 'warning');
      return;
    }

    this.navigate('soulbone-gallery');
    await this.renderSoulBoneGallery(playerId);
  },

  // 渲染魂骨图鉴（阶段五：任务5.1）
  async renderSoulBoneGallery(playerId) {
    const allBones = await db.soulBones.where('playerId').equals(playerId).toArray();
    const collectedSet = new Set(allBones.map(b => `${b.beastType}_${b.slot}`));

    // 渲染5×5表格
    const tbody = document.getElementById('soulbone-gallery-tbody');
    const slots = SOUL_BONE_SLOTS;
    const beasts = Object.keys(SOUL_BONE_TYPES);

    tbody.innerHTML = slots.map(slot => `
      <tr>
        <td style="padding: 8px; border: 1px solid var(--border); font-weight: 600;">${SOUL_BONE_SLOT_NAMES[slot]}</td>
        ${beasts.map(beast => {
          const key = `${beast}_${slot}`;
          const owned = collectedSet.has(key);
          const boneNames = SOUL_BONE_NAMES[beast];
          const name = boneNames ? (boneNames[slot] || '???') : '???';
          const beastInfo = SOUL_BONE_TYPES[beast];
          return `
            <td class="soulbone-gallery-cell ${owned ? 'owned' : 'not-owned'}" 
                onclick="app.openSoulBoneDetailModal('${beast}', '${slot}')"
                style="color: ${owned ? beastInfo.color : 'var(--text-muted)'};">
              ${owned ? `${beastInfo.icon}<br>${name}` : '???'}
            </td>
          `;
        }).join('')}
      </tr>
    `).join('');

    // 更新收集进度
    const totalCells = beasts.length * slots.length;
    const collectedCount = collectedSet.size;
    document.getElementById('soulbone-gallery-progress').textContent = `已收集：${collectedCount}/${totalCells}`;

    // 渲染套装收集进度
    const setProgressList = document.getElementById('soulbone-set-progress-list');
    setProgressList.innerHTML = beasts.map(beast => {
      const beastInfo = SOUL_BONE_TYPES[beast];
      const ownedCount = allBones.filter(b => b.beastType === beast).length;
      const progress = Math.min(ownedCount / 5 * 100, 100);
      const isActivated = ownedCount >= 5;
      return `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span>${beastInfo.icon} ${beastInfo.name}</span>
            <span>${ownedCount}/5 ${isActivated ? '✓ 已激活' : ''}</span>
          </div>
          <div style="height: 6px; background: rgba(0,0,0,0.1); border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; background: ${beastInfo.color}; width: ${progress}%; transition: width 0.3s;"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  // 打开魂骨详情弹窗（阶段五：任务5.2）
  async openSoulBoneDetailModal(beastType, slot) {
    const playerId = await this.getCurrentPlayerId();
    if (!playerId) return;

    const bones = await db.soulBones
      .where({ playerId, beastType, slot })
      .toArray();

    if (bones.length === 0) {
      this.showToast('还未获得该魂骨', 'info');
      return;
    }

    const beastInfo = SOUL_BONE_TYPES[beastType];
    document.getElementById('soulbone-detail-title').textContent = `${beastInfo.icon} ${beastInfo.name}·${SOUL_BONE_SLOT_NAMES[slot]}`;

    const listEl = document.getElementById('soulbone-detail-list');
    listEl.innerHTML = bones.map((bone, index) => `
      <div style="padding: 12px; background: ${bone.isEquipped ? 'rgba(255,215,0,0.1)' : 'var(--bg-tertiary)'}; border-radius: var(--radius); border: 1px solid ${bone.isEquipped ? '#FFD700' : 'var(--border)'};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 600;">#${index + 1} ${bone.name}</span>
          <div style="display: flex; gap: 4px;">
            ${bone.isEquipped ? '<span style="font-size: 10px; padding: 2px 6px; background: #FFD700; color: #000; border-radius: 4px;">已装备</span>' : ''}
            ${bone.isIdentified ? '<span style="font-size: 10px; padding: 2px 6px; background: #2ecc71; color: #fff; border-radius: 4px;">已鉴定</span>' : '<span style="font-size: 10px; padding: 2px 6px; background: #95a5a6; color: #fff; border-radius: 4px;">未鉴定</span>'}
          </div>
        </div>
        ${bone.isIdentified ? `
          <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 10px;">
            ${bone.attributeIcon} ${bone.attributeName} +${bone.attributeValue}
          </div>
        ` : `
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 10px;">属性未鉴定</div>
        `}
        <div style="display: flex; gap: 8px;">
          ${!bone.isIdentified ? `
            <button class="btn btn-primary" style="flex: 1; padding: 6px; font-size: 12px;" onclick="app.identifySoulBoneWithAnimation(${bone.id})">
              🔮 鉴定
            </button>
          ` : ''}
          ${bone.isEquipped ? `
            <button class="btn btn-outline" style="flex: 1; padding: 6px; font-size: 12px;" onclick="app.unequipSoulBoneAndRefresh(${bone.id}, '${beastType}', '${slot}')">
              卸下
            </button>
          ` : `
            <button class="btn btn-secondary" style="flex: 1; padding: 6px; font-size: 12px;" onclick="app.equipSoulBoneAndRefresh(${bone.id}, '${beastType}', '${slot}')">
              装备
            </button>
          `}
        </div>
      </div>
    `).join('');

    document.getElementById('soulbone-detail-modal').classList.add('active');
  },

  // 关闭魂骨详情弹窗
  closeSoulBoneDetailModal() {
    document.getElementById('soulbone-detail-modal').classList.remove('active');
  },

  // 鉴定魂骨并播放动画（阶段四：任务4.3）
  async identifySoulBoneWithAnimation(soulBoneId) {
    const modal = document.getElementById('soulbone-identify-modal');
    modal.classList.add('active');

    const glowEl = document.getElementById('identify-glow');
    const textEl = document.getElementById('identify-text');
    const resultEl = document.getElementById('identify-result');

    // 重置状态
    glowEl.style.display = 'block';
    textEl.textContent = '鉴定中...';
    textEl.style.display = 'block';
    resultEl.style.display = 'none';

    // 播放鉴定动画（1.5秒）
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 执行鉴定
    const bone = await identifySoulBone(soulBoneId);
    if (!bone) {
      modal.classList.remove('active');
      this.showToast('鉴定失败', 'error');
      return;
    }

    // 显示结果
    glowEl.style.display = 'none';
    textEl.style.display = 'none';
    resultEl.innerHTML = `
      <div style="animation: identifyReveal 0.5s ease-out;">
        <div style="font-size: 48px; margin-bottom: 16px;">${bone.attributeIcon}</div>
        <div style="margin-bottom: 8px;">${bone.name}</div>
        <div style="font-size: 14px; color: #fff;">${bone.attributeName} +${bone.attributeValue}</div>
      </div>
    `;
    resultEl.style.display = 'block';

    // 2秒后关闭
    await new Promise(resolve => setTimeout(resolve, 2000));
    modal.classList.remove('active');

    // 刷新当前页面
    this.refreshSoulBonePages();
  },

  // 装备魂骨并刷新页面
  async equipSoulBoneAndRefresh(soulBoneId, beastType, slot) {
    const result = await equipSoulBone(soulBoneId);
    if (result.success) {
      this.showToast('装备成功', 'success');
      this.refreshSoulBonePages();
    } else {
      this.showToast(result.reason || '装备失败', 'error');
    }
  },

  // 卸下魂骨并刷新页面
  async unequipSoulBoneAndRefresh(soulBoneId, beastType, slot) {
    await unequipSoulBone(soulBoneId);
    this.showToast('已卸下魂骨', 'success');
    this.refreshSoulBonePages();
  },

  // 刷新魂骨相关页面
  async refreshSoulBonePages() {
    const playerId = await this.getCurrentPlayerId();
    if (!playerId) return;

    if (state.currentPage === 'soulbone-gallery') {
      await this.renderSoulBoneGallery(playerId);
    } else if (state.currentPage === 'soulbone-warehouse') {
      await this.renderSoulBoneWarehouse(playerId);
    }

    // 刷新角色页面的魂骨显示
    await this.renderSoulBoneQuickView(playerId);
    await this.renderEquippedSoulBones(playerId);
    await this.renderSoulBoneBonusStats(playerId);
    await this.renderPlayerBattleStats(playerId);
  },

  // 打开魂骨仓库页面（阶段五：任务5.4）
  async openSoulBoneWarehouse() {
    console.log('openSoulBoneWarehouse 被调用');
    const playerId = await this.getCurrentPlayerId();
    console.log('获取到的 playerId:', playerId);
    
    if (!playerId) {
      this.showToast('请先选择角色', 'warning');
      return;
    }

    this.navigate('soulbone-warehouse');
    // navigate() 已经调用了 renderSoulBoneWarehouseImmediately()
    // 现在异步加载真实数据
    setTimeout(() => {
      this.renderSoulBoneWarehouse(playerId);
      this.setupSoulBoneFilterButtons();
    }, 0);
  },

  // 立即渲染魂骨仓库表格（同步，不调用数据库）
  renderSoulBoneWarehouseImmediately() {
    console.log('renderSoulBoneWarehouseImmediately 被调用');
    const tbody = document.getElementById('soulbone-warehouse-tbody');
    if (!tbody) {
      console.error('tbody 未找到');
      return;
    }

    const slots = SOUL_BONE_SLOTS;
    const beasts = Object.keys(SOUL_BONE_TYPES);

    // 清空
    tbody.innerHTML = '';

    // 逐行构建
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const tr = document.createElement('tr');

      // 部位列
      const tdName = document.createElement('td');
      tdName.style.padding = '12px 8px';
      tdName.style.border = '1px solid var(--border)';
      tdName.style.fontWeight = '600';
      tdName.style.textAlign = 'center';
      tdName.style.verticalAlign = 'middle';
      tdName.style.whiteSpace = 'nowrap';
      tdName.style.background = 'var(--bg-secondary)';
      tdName.textContent = SOUL_BONE_SLOT_NAMES[slot];
      tr.appendChild(tdName);

      // 5种魂兽列
      for (let j = 0; j < beasts.length; j++) {
        const beast = beasts[j];
        const beastInfo = SOUL_BONE_TYPES[beast];

        const td = document.createElement('td');
        td.className = 'soulbone-gallery-cell not-owned';
        td.style.padding = '12px 8px';
        td.style.border = '1px solid var(--border)';
        td.style.textAlign = 'center';
        td.style.verticalAlign = 'middle';
        td.style.minHeight = '70px';

        const span = document.createElement('span');
        span.style.display = 'block';
        span.style.padding = '10px 0';
        span.style.fontSize = '12px';
        span.style.color = 'var(--text-muted)';
        span.textContent = '未获得';
        td.appendChild(span);

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }

    console.log('表格立即渲染完成，共 ' + slots.length + ' 行');

    // 同时渲染详情列表为空
    const listEl = document.getElementById('soulbone-warehouse-list');
    if (listEl) {
      listEl.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">暂无魂骨</div>';
    }
  },

  // 检查并随机分配一个魂骨给角色（如果角色还没有魂骨的话）
  async ensureRandomSoulBone(playerId) {
    const existingBones = await db.soulBones.where('playerId').equals(playerId).toArray();
    
    if (existingBones.length === 0) {
      // 随机生成一个魂骨
      const newBone = await generateSoulBone(playerId, 1); // 难度1作为默认难度
      
      if (newBone) {
        console.log(`为角色 ${playerId} 随机分配了一个魂骨:`, newBone);
        // 显示获得魂骨的提示
        this.showSoulBoneAward(newBone);
      }
    }
  },

  // 渲染魂骨仓库（阶段五：任务5.4）- 异步加载真实数据
  async renderSoulBoneWarehouse(playerId, filter = 'all') {
    console.log('renderSoulBoneWarehouse 开始执行, playerId:', playerId, 'filter:', filter);
    
    try {
      let bones = await db.soulBones.where('playerId').equals(playerId).toArray();
      console.log('查询到魂骨数量:', bones.length);
  
      // 应用筛选
      let filteredBones = bones;
      if (filter === 'identified') {
        filteredBones = bones.filter(b => b.isIdentified);
      } else if (filter === 'unidentified') {
        filteredBones = bones.filter(b => !b.isIdentified);
      } else if (filter === 'equipped') {
        filteredBones = bones.filter(b => b.isEquipped);
      } else if (SOUL_BONE_TYPES[filter]) {
        filteredBones = bones.filter(b => b.beastType === filter);
      }
      console.log('筛选后的魂骨数量:', filteredBones.length);
  
      // 更新数量显示
      const countEl = document.getElementById('soulbone-warehouse-count');
      if (countEl) countEl.textContent = `共 ${bones.length} 个`;
  
      // ===== 渲染5×7表格视图（5种魂兽 × 7个部位）=====
      const tbody = document.getElementById('soulbone-warehouse-tbody');
      if (!tbody) {
        console.error('魂骨仓库表格tbody元素未找到');
        return;
      }
      console.log('tbody元素已找到');
      
      const slots = SOUL_BONE_SLOTS;
      const beasts = Object.keys(SOUL_BONE_TYPES);
      console.log('部位数量:', slots.length, '魂兽数量:', beasts.length);

      // 清空表格
      tbody.innerHTML = '';

      // 逐行添加数据
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const tr = document.createElement('tr');
        
        // 部位列
        const th = document.createElement('td');
        th.style.padding = '12px 8px';
        th.style.border = '1px solid var(--border)';
        th.style.fontWeight = '600';
        th.style.textAlign = 'center';
        th.style.verticalAlign = 'middle';
        th.style.whiteSpace = 'nowrap';
        th.style.background = 'var(--bg-secondary)';
        th.textContent = SOUL_BONE_SLOT_NAMES[slot];
        tr.appendChild(th);
        
        // 5种魂兽列
        for (let j = 0; j < beasts.length; j++) {
          const beast = beasts[j];
          const slotBones = filteredBones.filter(b => b.beastType === beast && b.slot === slot);
          const beastInfo = SOUL_BONE_TYPES[beast];
          const boneNames = SOUL_BONE_NAMES[beast];
          const displayName = boneNames ? (boneNames[slot] || '???') : '???';
          
          const td = document.createElement('td');
          td.className = 'soulbone-gallery-cell' + (slotBones.length > 0 ? ' owned' : ' not-owned');
          td.style.padding = '12px 8px';
          td.style.border = '1px solid var(--border)';
          td.style.textAlign = 'center';
          td.style.verticalAlign = 'middle';
          
          if (slotBones.length === 0) {
            const span = document.createElement('span');
            span.textContent = '未获得';
            td.appendChild(span);
          } else {
            td.style.cursor = 'pointer';
            td.onclick = () => this.openSoulBoneDetailModal(beast, slot);
            
            const iconDiv = document.createElement('div');
            iconDiv.style.fontSize = '18px';
            iconDiv.style.marginBottom = '4px';
            iconDiv.textContent = beastInfo.icon;
            td.appendChild(iconDiv);
            
            const nameDiv = document.createElement('div');
            nameDiv.style.fontSize = '11px';
            nameDiv.style.fontWeight = '600';
            nameDiv.style.color = beastInfo.color;
            nameDiv.style.lineHeight = '1.3';
            nameDiv.textContent = displayName;
            td.appendChild(nameDiv);
            
            const countDiv = document.createElement('div');
            countDiv.style.fontSize = '10px';
            countDiv.style.color = 'var(--text-muted)';
            countDiv.style.marginTop = '3px';
            countDiv.textContent = slotBones.length + '个';
            td.appendChild(countDiv);
            
            const displayBones = slotBones.slice(0, 2);
            displayBones.forEach(b => {
              if (b.isEquipped) {
                const eqDiv = document.createElement('div');
                eqDiv.style.fontSize = '9px';
                eqDiv.style.color = '#FFD700';
                eqDiv.style.marginTop = '2px';
                eqDiv.textContent = '★装备';
                td.appendChild(eqDiv);
              }
            });
            
            const remaining = slotBones.length - 2;
            if (remaining > 0) {
              const remDiv = document.createElement('div');
              remDiv.style.fontSize = '10px';
              remDiv.style.color = 'var(--primary)';
              remDiv.style.marginTop = '2px';
              remDiv.textContent = '+' + remaining;
              td.appendChild(remDiv);
            }
          }
          
          tr.appendChild(td);
        }
        
        tbody.appendChild(tr);
      }
  
      console.log('表格已渲染到DOM，共' + slots.length + '行');
  
      // ===== 渲染魂骨详情列表 =====
      const listEl = document.getElementById('soulbone-warehouse-list');
      if (filteredBones.length === 0) {
        if (listEl) listEl.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">暂无匹配的魂骨</div>';
        return;
      }
  
      if (listEl) {
        listEl.innerHTML = '';
        filteredBones.forEach(bone => {
          const beastInfo = SOUL_BONE_TYPES[bone.beastType];
          const itemDiv = document.createElement('div');
          itemDiv.className = 'soulbone-warehouse-item' + (bone.isEquipped ? ' equipped' : '');
          itemDiv.onclick = () => this.openSoulBoneDetailModal(bone.beastType, bone.slot);
          
          const iconDiv = document.createElement('div');
          iconDiv.style.fontSize = '32px';
          iconDiv.textContent = beastInfo.icon;
          itemDiv.appendChild(iconDiv);
          
          const contentDiv = document.createElement('div');
          contentDiv.style.flex = '1';
          
          const nameDiv = document.createElement('div');
          nameDiv.style.fontWeight = '600';
          nameDiv.style.color = beastInfo.color;
          nameDiv.textContent = bone.name;
          contentDiv.appendChild(nameDiv);
          
          const descDiv = document.createElement('div');
          descDiv.style.fontSize = '12px';
          descDiv.style.color = 'var(--text-muted)';
          descDiv.textContent = SOUL_BONE_SLOT_NAMES[bone.slot] + ' · ' + bone.beastName;
          contentDiv.appendChild(descDiv);
          
          if (bone.isIdentified) {
            const attrDiv = document.createElement('div');
            attrDiv.style.fontSize = '13px';
            attrDiv.style.marginTop = '4px';
            attrDiv.textContent = bone.attributeIcon + ' ' + bone.attributeName + ' +' + bone.attributeValue;
            contentDiv.appendChild(attrDiv);
          } else {
            const attrDiv = document.createElement('div');
            attrDiv.style.fontSize = '12px';
            attrDiv.style.color = 'var(--text-muted)';
            attrDiv.textContent = '未鉴定';
            contentDiv.appendChild(attrDiv);
          }
          
          itemDiv.appendChild(contentDiv);
          listEl.appendChild(itemDiv);
        });
      }
      
      console.log('renderSoulBoneWarehouse 执行完成');
    } catch (error) {
      console.error('renderSoulBoneWarehouse 出错:', error);
    }
  },

  // 设置魂骨仓库筛选按钮
  setupSoulBoneFilterButtons() {
    const buttons = document.querySelectorAll('.soulbone-filter-btn');
    buttons.forEach(btn => {
      btn.onclick = async () => {
        // 更新按钮状态
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        const playerId = await this.getCurrentPlayerId();
        if (playerId) {
          await this.renderSoulBoneWarehouse(playerId, filter);
        }
      };
    });
  },

  // 关闭获得魂骨提示弹窗
  closeSoulBoneAwardModal() {
    document.getElementById('soulbone-award-modal').classList.remove('active');
  },

  // 搜索魂骨（按名称搜索或输入"hdhg"获得随机魂骨）
  async searchSoulBones() {
    const input = document.getElementById('soulbone-search-input');
    if (!input) return;

    const keyword = input.value.trim().toLowerCase();

    // 作弊码：输入 "hdhg" 获得随机魂骨
    if (keyword === 'hdhg') {
      const playerId = await this.getCurrentPlayerId();
      if (!playerId) {
        this.showToast('请先选择角色', 'warning');
        return;
      }

      // 随机生成一个魂骨
      const newBone = await generateSoulBone(playerId, 1);
      if (newBone) {
        this.showToast('🎉 获得了神秘魂骨！', 'success');
        // 显示获得魂骨的提示
        this.showSoulBoneAward(newBone);
        // 刷新仓库页面
        const filterBtn = document.querySelector('.soulbone-filter-btn.active');
        const filter = filterBtn ? filterBtn.dataset.filter : 'all';
        await this.renderSoulBoneWarehouse(playerId, filter);
      }
      return;
    }

    // 作弊码：输入 "hdhgx-y" 获得指定魂骨
    // x: 列号(1-5)代表魂兽类型，y: 行号(1-5)代表部位
    // 列号对应：1=曼陀罗蛇, 2=柔骨兔, 3=邪眸白虎, 4=幽冥灵猫, 5=七宝琉璃
    // 行号对应：1=头骨, 2=躯干骨, 3=左臂骨, 4=右腿骨, 5=外附魂骨
    const cheatRegex = /^hdhg(\d)-(\d)$/;
    const cheatMatch = keyword.match(cheatRegex);
    if (cheatMatch) {
      const playerId = await this.getCurrentPlayerId();
      if (!playerId) {
        this.showToast('请先选择角色', 'warning');
        return;
      }

      const colNum = parseInt(cheatMatch[1]); // 列号（魂兽类型）
      const rowNum = parseInt(cheatMatch[2]); // 行号（部位）

      // 验证输入范围
      if (colNum < 1 || colNum > 5 || rowNum < 1 || rowNum > 5) {
        this.showToast('作弊码格式错误：hdhgx-y，x和y的范围都是1-5', 'error');
        return;
      }

      // 列号映射到魂兽类型
      const beastTypes = ['mantuo', 'rougu', 'xiehou', 'youming', 'qibao'];
      const beastType = beastTypes[colNum - 1];
      const beastName = SOUL_BONE_TYPES[beastType].name;

      // 行号映射到部位
      const slot = SOUL_BONE_SLOTS[rowNum - 1];
      const slotName = SOUL_BONE_SLOT_NAMES[slot];

      // 生成指定魂骨
      const newBone = await generateSpecificSoulBone(playerId, beastType, slot);
      if (newBone) {
        this.showToast(`🎉 获得了 ${beastName}·${slotName}！`, 'success');
        // 显示获得魂骨的提示
        this.showSoulBoneAward(newBone);
        // 刷新仓库页面
        const filterBtn = document.querySelector('.soulbone-filter-btn.active');
        const filter = filterBtn ? filterBtn.dataset.filter : 'all';
        await this.renderSoulBoneWarehouse(playerId, filter);
      }
      return;
    }

    // 按名称搜索魂骨
    if (keyword.length === 0) {
      this.showToast('请输入搜索关键词', 'info');
      return;
    }

    const playerId = await this.getCurrentPlayerId();
    if (!playerId) {
      this.showToast('请先选择角色', 'warning');
      return;
    }

    const allBones = await db.soulBones.where('playerId').equals(playerId).toArray();
    const filtered = allBones.filter(bone => 
      bone.name.toLowerCase().includes(keyword) ||
      bone.beastName.toLowerCase().includes(keyword) ||
      SOUL_BONE_SLOT_NAMES[bone.slot].includes(keyword)
    );

    // 渲染搜索结果到列表
    const listEl = document.getElementById('soulbone-warehouse-list');
    if (listEl) {
      if (filtered.length === 0) {
        listEl.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">未找到包含"${keyword}"的魂骨</div>`;
      } else {
        listEl.innerHTML = `<div style="font-size: 13px; color: var(--text-muted); margin-bottom: 10px;">找到 ${filtered.length} 个匹配的魂骨：</div>` +
          filtered.map(bone => {
            const beastInfo = SOUL_BONE_TYPES[bone.beastType];
            return `
              <div class="soulbone-warehouse-item ${bone.isEquipped ? 'equipped' : ''}" onclick="app.openSoulBoneDetailModal('${bone.beastType}', '${bone.slot}')">
                <div style="font-size: 32px;">${beastInfo.icon}</div>
                <div style="flex: 1;">
                  <div style="font-weight: 600; color: ${beastInfo.color};">${bone.name}</div>
                  <div style="font-size: 12px; color: var(--text-muted);">${SOUL_BONE_SLOT_NAMES[bone.slot]} · ${bone.beastName}</div>
                  ${bone.isIdentified ? `
                    <div style="font-size: 13px; margin-top: 4px;">${bone.attributeIcon} ${bone.attributeName} +${bone.attributeValue}</div>
                  ` : '<div style="font-size: 12px; color: var(--text-muted);">未鉴定</div>'}
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  ${bone.isEquipped ? '<span style="font-size: 10px; padding: 2px 6px; background: #FFD700; color: #000; border-radius: 4px;">已装备</span>' : ''}
                </div>
              </div>
            `;
          }).join('');
      }
    }

    this.showToast(`找到 ${filtered.length} 个匹配结果`, 'info');
  },

  // 清除搜索
  clearSoulBoneSearch() {
    const input = document.getElementById('soulbone-search-input');
    if (input) input.value = '';
    // 重新渲染仓库
    this.getCurrentPlayerId().then(playerId => {
      if (playerId) {
        const filterBtn = document.querySelector('.soulbone-filter-btn.active');
        const filter = filterBtn ? filterBtn.dataset.filter : 'all';
        this.renderSoulBoneWarehouse(playerId, filter);
      }
    });
  },

  // 显示获得魂骨提示（阶段四）
  showSoulBoneAward(soulBone) {
    const beastInfo = SOUL_BONE_TYPES[soulBone.beastType];
    document.getElementById('soulbone-award-icon').textContent = beastInfo.icon;
    document.getElementById('soulbone-award-name').textContent = soulBone.name;
    document.getElementById('soulbone-award-desc').textContent = `${soulBone.beastName}·${soulBone.slotName} - 请到魂骨仓库查看`;
    document.getElementById('soulbone-award-modal').classList.add('active');
  },

  // 渲染魂骨快速预览（角色页面）
  async renderSoulBoneQuickView(playerId) {
    const bones = await db.soulBones.where('playerId').equals(playerId).toArray();
    const equipped = bones.filter(b => b.isEquipped);
    const total = bones.length;

    const quickViewEl = document.getElementById('soul-bone-quick-view');
    if (!quickViewEl) return;

    if (total === 0) {
      quickViewEl.textContent = '还未获得魂骨，完成副本挑战获取魂骨吧！';
      return;
    }

    quickViewEl.innerHTML = `
      <div style="margin-bottom: 4px;">共收集 <strong>${total}</strong> 个魂骨，已装备 <strong>${equipped.length}</strong> 个</div>
      ${equipped.length > 0 ? `
        <div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;">
          ${equipped.slice(0, 5).map(bone => {
            const beastInfo = SOUL_BONE_TYPES[bone.beastType];
            return `<span style="font-size: 16px;" title="${bone.name}">${beastInfo.icon}</span>`;
          }).join('')}
        </div>
      ` : ''}
    `;
  },

  // 渲染已装备魂骨列表（角色页面）- 简化文字显示
  async renderEquippedSoulBones(playerId) {
    const bones = await db.soulBones.where('playerId').equals(playerId).toArray();
    const equipped = bones.filter(b => b.isEquipped);

    const listEl = document.getElementById('equipped-soul-bones-list');
    const countEl = document.getElementById('equipped-bones-count');
    if (!listEl) return;

    if (countEl) countEl.textContent = `已装备 ${equipped.length}/5`;

    if (equipped.length === 0) {
      listEl.innerHTML = '<div style="padding: 12px; color: var(--text-muted); font-size: 13px;">还未装备魂骨</div>';
      return;
    }

    // 按部位排序显示，纯文字列表
    const slotOrder = ['head', 'body', 'left_arm', 'right_leg', 'external'];
    const sortedEquipped = [...equipped].sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot));

    listEl.innerHTML = sortedEquipped.map(bone => {
      const beastInfo = SOUL_BONE_TYPES[bone.beastType];
      const slotName = SOUL_BONE_SLOT_NAMES[bone.slot];
      const attrText = bone.isIdentified ? ` [${bone.attributeName}+${bone.attributeValue}]` : ' [未鉴定]';
      return `<div style="font-size: 13px; padding: 4px 0; color: var(--text-secondary);"><span style="color: ${beastInfo.color}; font-weight: 600;">${slotName}：${bone.name}</span>${attrText}</div>`;
    }).join('');
  },

  // 渲染魂骨属性加成（角色页面）- 显示各项属性累加值
  async renderSoulBoneBonusStats(playerId) {
    const bones = await db.soulBones.where('playerId').equals(playerId).toArray();
    const equipped = bones.filter(b => b.isEquipped && b.isIdentified);

    const statsEl = document.getElementById('soul-bone-bonus-stats');
    if (!statsEl) return;

    if (equipped.length === 0) {
      statsEl.innerHTML = '<div style="padding: 12px; color: var(--text-muted); font-size: 13px;">装备魂骨后将显示属性加成</div>';
      return;
    }

    // 计算各项属性总和
    const bonusStats = {
      health: { name: '生命', total: 0, color: '#e74c3c' },
      knockback: { name: '击退', total: 0, color: '#e67e22' },
      dodge: { name: '闪避', total: 0, color: '#3498db' },
      defense: { name: '防御', total: 0, color: '#2ecc71' },
      slow: { name: '减速', total: 0, color: '#9b59b6' }
    };

    equipped.forEach(bone => {
      if (bonusStats[bone.attributeType]) {
        bonusStats[bone.attributeType].total += bone.attributeValue;
      }
    });

    // 过滤出有值的属性
    const activeStats = Object.entries(bonusStats)
      .filter(([_, stat]) => stat.total > 0)
      .map(([key, stat]) => stat);

    if (activeStats.length === 0) {
      statsEl.innerHTML = '<div style="padding: 12px; color: var(--text-muted); font-size: 13px;">暂无属性加成</div>';
      return;
    }

    // 纯文字显示各项属性累加值，用空格分隔
    statsEl.innerHTML = '<div style="font-size: 14px; line-height: 1.8;">' +
      activeStats.map(stat => `<span style="color: ${stat.color}; font-weight: 700;">+${stat.total} ${stat.name}</span>`).join('  ') +
      '</div>';
  },

  // 渲染玩家对战属性（阶段六：任务 6.5）
  async renderPlayerBattleStats(playerId) {
    try {
      console.log('[renderPlayerBattleStats] 开始执行, playerId:', playerId);
      
      // 验证 DOM 元素存在
      const healthEl = document.getElementById('stat-health');
      const defenseEl = document.getElementById('stat-defense');
      const dodgeEl = document.getElementById('stat-dodge');
      const knockbackEl = document.getElementById('stat-knockback');
      const slowEl = document.getElementById('stat-slow');
      
      const allElementsExist = healthEl && defenseEl && dodgeEl && knockbackEl && slowEl;
      console.log('[renderPlayerBattleStats] DOM 元素存在:', allElementsExist, {
        healthEl: !!healthEl,
        defenseEl: !!defenseEl,
        dodgeEl: !!dodgeEl,
        knockbackEl: !!knockbackEl,
        slowEl: !!slowEl
      });
      
      if (!allElementsExist) {
        console.warn('[renderPlayerBattleStats] 部分 DOM 元素不存在，跳过渲染');
        return;
      }
      
      if (!playerId) {
        console.warn('[renderPlayerBattleStats] playerId 为空，重置为基础属性');
        this.resetPlayerBattleStats();
        return;
      }
      
      const stats = await calculatePlayerStats(playerId);
      
      console.log('[renderPlayerBattleStats] 更新 DOM 元素:', JSON.stringify(stats));
      
      healthEl.textContent = Math.round(stats.health);
      defenseEl.textContent = Math.round(stats.defense);
      dodgeEl.textContent = (stats.dodge * 100).toFixed(1) + '%';
      knockbackEl.textContent = (stats.knockback * 100).toFixed(0) + '%';
      slowEl.textContent = (stats.zombieSlow * 100).toFixed(1) + '%';
      
      await this.renderActiveSetBonuses(playerId);
      console.log('[renderPlayerBattleStats] 渲染完成');
    } catch (err) {
      console.error('[renderPlayerBattleStats] 渲染出错:', err);
    }
  },

  // 渲染激活的套装效果（阶段六：任务 6.5）
  async renderActiveSetBonuses(playerId) {
    const containerEl = document.getElementById('active-set-bonuses');
    if (!containerEl) return;
    
    const activeSets = await getActiveSetBonuses(playerId);
    
    if (activeSets.length === 0) {
      containerEl.innerHTML = '<div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 13px;">集齐5件同种魂骨激活套装效果</div>';
      return;
    }
    
    containerEl.innerHTML = activeSets.map(set => `
      <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(243, 156, 18, 0.1); border-radius: 8px; border-left: 3px solid #f39c12;">
        <div style="font-size: 28px;">${set.icon}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #f39c12;">${set.beastName}套装</div>
          <div style="font-size: 12px; color: var(--text-secondary);">${set.skill}：${set.skillDesc}</div>
        </div>
        <div style="font-size: 18px; color: #27ae60;">✅</div>
      </div>
    `).join('');
  },

  // 获取当前角色ID
  async getCurrentPlayerId() {
    const profileName = document.getElementById('profile-player-name')?.textContent;
    if (!profileName || profileName === 'Guest' || profileName === '未登录') {
      return null;
    }

    const profile = await db.playerProfiles.where('playerName').equals(profileName).first();
    return profile ? profile.id : null;
  },

  // ===== 套装技能应用到练习中（阶段四：任务4.5） =====

  // 应用套装技能到积分计算
  async applySetSkillsToScore(playerId, basePoints) {
    if (!playerId) return basePoints;
    
    const equippedBones = await getEquippedSoulBones(playerId);
    const activeSets = getSetBonus(equippedBones);
    
    let finalPoints = basePoints;
    let notifications = [];

    // 曼陀罗蛇套装：积分翻倍
    if (activeSets.find(s => s.beastType === 'mantuo')) {
      finalPoints *= 2;
      notifications.push('🐍 曼陀罗蛇套装触发：积分翻倍！');
    }

    // 七宝琉璃套装：失败获积分（在失败时处理，这里不处理）
    
    if (notifications.length > 0) {
      this.showToast(notifications.join(' '), 'success');
    }

    return Math.floor(finalPoints);
  },

  // 检查失败重生技能（柔骨兔套装）
  async checkExtraLife(playerId) {
    if (!playerId) return false;
    
    const equippedBones = await getEquippedSoulBones(playerId);
    const activeSets = getSetBonus(equippedBones);
    
    return !!activeSets.find(s => s.beastType === 'rougu');
  },

  // 应用失败重生（僵尸退回中间）
  applyExtraLife() {
    state.extraLifeUsed = true;
    state.zombiePosition = Math.max(0, state.zombiePosition - 30);
    this.updateZombiePosition();
    this.showToast('🐰 柔骨兔套装触发：失败重生！僵尸后退30%', 'success');
  },

  // 检查连击不断技能（邪眸白虎套装）
  async handleComboBreak(playerId) {
    if (!playerId) {
      state.consecutiveCorrectCount = 0;
      return;
    }
    
    const equippedBones = await getEquippedSoulBones(playerId);
    const activeSets = getSetBonus(equippedBones);
    
    if (activeSets.find(s => s.beastType === 'xiehou')) {
      // 连击减一而非重置
      state.consecutiveCorrectCount = Math.max(0, state.consecutiveCorrectCount - 1);
      this.showToast('🐯 邪眸白虎套装触发：连击不断！连击-1而非清零', 'info');
    } else {
      // 正常重置
      state.consecutiveCorrectCount = 0;
    }
  },

  // 检查答错不惩罚技能（幽冥灵猫套装）
  async checkWrongAnswerPenalty(playerId) {
    if (!playerId) return false;
    
    const equippedBones = await getEquippedSoulBones(playerId);
    const activeSets = getSetBonus(equippedBones);
    
    if (activeSets.find(s => s.beastType === 'youming')) {
      this.showToast('🐱 幽冥灵猫套装触发：答错不惩罚！', 'info');
      return true;
    }
    return false;
  },

  // 检查失败获积分技能（七宝琉璃套装）
  async applyConsolationPoints(playerId, basePoints) {
    if (!playerId) return 0;
    
    const equippedBones = await getEquippedSoulBones(playerId);
    const activeSets = getSetBonus(equippedBones);
    
    if (activeSets.find(s => s.beastType === 'qibao')) {
      const consolationPoints = Math.floor(basePoints * 0.5);
      this.showToast(`💎 七宝琉璃套装触发：失败获得${consolationPoints}积分！`, 'success');
      return consolationPoints;
    }
    return 0;
  },

  // 获取玩家属性（用于僵尸对战，阶段六预留）
  async getPlayerStats(playerId) {
    if (!playerId) {
      return { health: 1000, defense: 0, dodge: 0, knockback: 1, zombieSlow: 0 };
    }
    
    const equippedBones = await getEquippedSoulBones(playerId);
    let stats = { health: 1000, defense: 0, dodge: 0, knockback: 1, zombieSlow: 0 };
    
    equippedBones.forEach(bone => {
      if (bone.isEquipped && bone.isIdentified) {
        switch (bone.attributeType) {
          case 'health':
            stats.health += bone.attributeValue;
            break;
          case 'defense':
            stats.defense += bone.attributeValue;
            break;
          case 'dodge':
            stats.dodge += bone.attributeValue / 100;
            break;
          case 'knockback':
            stats.knockback += bone.attributeValue / 100;
            break;
          case 'slow':
            stats.zombieSlow += bone.attributeValue / 100;
            break;
        }
      }
    });
    
    return stats;
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await app.init();
  // 清理重复装备的魂骨
  cleanupDuplicateEquippedBones();
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {
    console.log('Service Worker registration failed:', err);
  });
}
