// 作弊码解析逻辑验证脚本
// 用于验证所有25种作弊码组合是否正确解析

const SOUL_BONE_TYPES = {
  mantuo: { name: '曼陀罗蛇', icon: '🐍', color: '#8B008B' },
  rougu: { name: '柔骨兔', icon: '🐰', color: '#FF69B4' },
  xiehou: { name: '邪眸白虎', icon: '🐯', color: '#FF4500' },
  youming: { name: '幽冥灵猫', icon: '🐱', color: '#4B0082' },
  qibao: { name: '七宝琉璃', icon: '💎', color: '#FFD700' }
};

const SOUL_BONE_SLOTS = ['head', 'body', 'left_arm', 'right_leg', 'external'];
const SOUL_BONE_SLOT_NAMES = {
  head: '头骨',
  body: '躯干骨',
  left_arm: '左臂骨',
  right_leg: '右腿骨',
  external: '外附魂骨'
};

const beastTypes = ['mantuo', 'rougu', 'xiehou', 'youming', 'qibao'];

// 与应用中相同的正则表达式
const cheatRegex = /^hdhg(\d)-(\d)$/;

function parseCheatCode(keyword) {
  // 作弊码：输入 "hdhg" 获得随机魂骨
  if (keyword === 'hdhg') {
    return { valid: true, type: 'random', display: '随机魂骨' };
  }

  // 作弊码：输入 "hdhgx-y" 获得指定魂骨
  const cheatMatch = keyword.match(cheatRegex);
  if (cheatMatch) {
    const colNum = parseInt(cheatMatch[1]);
    const rowNum = parseInt(cheatMatch[2]);

    if (colNum < 1 || colNum > 5 || rowNum < 1 || rowNum > 5) {
      return { valid: false, error: '作弊码格式错误：hdhgx-y，x和y的范围都是1-5' };
    }

    const beastType = beastTypes[colNum - 1];
    const slot = SOUL_BONE_SLOTS[rowNum - 1];
    const beastName = SOUL_BONE_TYPES[beastType].name;
    const slotName = SOUL_BONE_SLOT_NAMES[slot];

    return {
      valid: true,
      type: 'specific',
      colNum,
      rowNum,
      beastType,
      slot,
      beastName,
      slotName,
      display: `${beastName}·${slotName}`
    };
  }

  return { valid: false, error: '不是有效的作弊码' };
}

// 测试所有25种组合
console.log('🔮 魂骨作弊码解析逻辑验证');
console.log('=' .repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

console.log('\n📊 5×5 魂骨表格对照:');
console.log('-'.repeat(60));

// 打印表头
console.log('部位\\魂兽 | ' + beastTypes.map((_, i) => `${i + 1}: ${SOUL_BONE_TYPES[beastTypes[i]].name}`).join(' | '));
console.log('-'.repeat(60));

// 测试每一行
for (let rowNum = 1; rowNum <= 5; rowNum++) {
  const row = [];
  row.push(`${rowNum}: ${SOUL_BONE_SLOT_NAMES[SOUL_BONE_SLOTS[rowNum - 1]]}`);
  
  for (let colNum = 1; colNum <= 5; colNum++) {
    const cheatCode = `hdhg${colNum}-${rowNum}`;
    const result = parseCheatCode(cheatCode);
    
    totalTests++;
    
    if (result.valid && result.type === 'specific') {
      const expectedBeastType = beastTypes[colNum - 1];
      const expectedSlot = SOUL_BONE_SLOTS[rowNum - 1];
      
      if (result.beastType === expectedBeastType && result.slot === expectedSlot) {
        passedTests++;
        row.push(`✅ ${result.display}`);
      } else {
        failedTests++;
        row.push(`❌ 预期:${expectedBeastType}/${expectedSlot} 实际:${result.beastType}/${result.slot}`);
      }
    } else {
      failedTests++;
      row.push(`❌ 解析失败: ${result.error}`);
    }
  }
  
  console.log(row.join(' | '));
}

console.log('\n' + '='.repeat(60));
console.log('📝 测试边界情况:');
console.log('-'.repeat(60));

// 测试边界情况
const edgeCases = [
  { code: 'hdhg', expected: 'random', desc: '随机魂骨' },
  { code: 'hdhg0-1', expected: 'invalid', desc: '列号0（无效）' },
  { code: 'hdhg6-1', expected: 'invalid', desc: '列号6（无效）' },
  { code: 'hdhg1-0', expected: 'invalid', desc: '行号0（无效）' },
  { code: 'hdhg1-6', expected: 'invalid', desc: '行号6（无效）' },
  { code: 'hdhg', expected: 'random', desc: '随机魂骨' },
  { code: 'HDHG1-1', expected: 'specific', desc: '大写（转为小写后有效）' },
  { code: 'hdhg1-1', expected: 'specific', desc: '标准格式' },
  { code: 'hdhg12-3', expected: 'invalid', desc: '双位列号' },
  { code: 'hdhg1-23', expected: 'invalid', desc: '双位行号' },
  { code: 'hdh', expected: 'invalid', desc: '不完整' },
  { code: 'hdhg-', expected: 'invalid', desc: '缺少数字' },
  { code: 'hdhg1-', expected: 'invalid', desc: '缺少行号' },
  { code: 'hdhg-1', expected: 'invalid', desc: '缺少列号' },
  { code: '', expected: 'invalid', desc: '空字符串' },
  { code: 'test', expected: 'invalid', desc: '随机文本' },
];

for (const testCase of edgeCases) {
  const result = parseCheatCode(testCase.code.toLowerCase());
  let actualType = 'invalid';
  if (result.valid) {
    actualType = result.type;
  }
  
  const passed = actualType === testCase.expected;
  if (passed) {
    passedTests++;
  } else {
    failedTests++;
  }
  totalTests++;
  
  console.log(`${passed ? '✅' : '❌'} ${testCase.code || '(空)'} - ${testCase.desc}: 预期=${testCase.expected}, 实际=${actualType}`);
}

console.log('\n' + '='.repeat(60));
console.log('📊 测试结果汇总:');
console.log('-'.repeat(60));
console.log(`总测试数: ${totalTests}`);
console.log(`通过测试: ${passedTests}`);
console.log(`失败测试: ${failedTests}`);
console.log(`成功率: ${Math.round((passedTests / totalTests) * 100)}%`);
console.log('-'.repeat(60));

if (failedTests === 0) {
  console.log('🎉 所有测试通过！作弊码解析逻辑正确！');
  process.exit(0);
} else {
  console.log('⚠️ 存在失败的测试，请检查代码！');
  process.exit(1);
}
