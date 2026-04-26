// 自动化测试：验证魂骨属性加成是否正确计算
// 使用方法：在浏览器控制台中运行此脚本

(async function testSoulBoneBonus() {
  console.log('========== 开始测试魂骨属性加成 ==========');
  
  // 1. 创建测试角色
  console.log('\n[步骤1] 创建测试角色...');
  let testProfile = await db.playerProfiles.where('playerName').equals('魂骨测试').first();
  if (!testProfile) {
    const id = await db.playerProfiles.add({
      playerName: '魂骨测试',
      totalPoints: 0,
      level: 1,
      lastPlayedAt: Date.now()
    });
    testProfile = await db.playerProfiles.get(id);
    console.log('✅ 创建测试角色成功, ID:', testProfile.id);
  } else {
    console.log('ℹ️ 使用已存在的测试角色, ID:', testProfile.id);
  }
  
  // 2. 清除旧的魂骨数据
  console.log('\n[步骤2] 清除旧魂骨数据...');
  await db.soulBones.where('playerId').equals(testProfile.id).delete();
  console.log('✅ 已清除旧魂骨');
  
  // 3. 创建测试魂骨
  console.log('\n[步骤3] 创建测试魂骨...');
  const testBones = [
    { beastType: 'mantuo', slot: 'head', attributeType: 'health', attributeValue: 15, isIdentified: true, isEquipped: true, name: '曼陀罗蛇头骨' },
    { beastType: 'mantuo', slot: 'body', attributeType: 'defense', attributeValue: 10, isIdentified: true, isEquipped: true, name: '曼陀罗蛇躯干骨' },
    { beastType: 'rougu', slot: 'left_arm', attributeType: 'dodge', attributeValue: 5, isIdentified: true, isEquipped: true, name: '柔骨兔左臂骨' },
    { beastType: 'xiehou', slot: 'right_leg', attributeType: 'knockback', attributeValue: 8, isIdentified: true, isEquipped: true, name: '邪眸白虎右腿骨' },
    { beastType: 'youming', slot: 'external', attributeType: 'slow', attributeValue: 3, isIdentified: true, isEquipped: true, name: '幽冥灵猫外附魂骨' },
    // 未装备的魂骨（不应该计入）
    { beastType: 'qibao', slot: 'head', attributeType: 'health', attributeValue: 100, isIdentified: true, isEquipped: false, name: '七宝琉璃头骨' },
    // 未鉴定的魂骨（不应该计入）
    { beastType: 'qibao', slot: 'body', attributeType: 'defense', attributeValue: 100, isIdentified: false, isEquipped: true, name: '七宝琉璃躯干骨' }
  ];
  
  for (const bone of testBones) {
    await db.soulBones.add({
      playerId: testProfile.id,
      beastType: bone.beastType,
      beastName: SOUL_BONE_TYPES[bone.beastType].name,
      slot: bone.slot,
      slotName: SOUL_BONE_SLOT_NAMES[bone.slot],
      name: bone.name,
      attributeType: bone.attributeType,
      attributeName: SOUL_BONE_ATTRIBUTES.find(a => a.type === bone.attributeType).name,
      attributeValue: bone.attributeValue,
      isIdentified: bone.isIdentified,
      isEquipped: bone.isEquipped,
      obtainedAt: Date.now()
    });
  }
  console.log(`✅ 创建了 ${testBones.length} 个魂骨（5个已装备+已鉴定，2个不计入）`);
  
  // 4. 计算预期属性
  console.log('\n[步骤4] 计算预期属性...');
  const BASE_PLAYER_STATS = {
    health: 1000,
    defense: 0,
    dodge: 0,
    knockback: 1,
    zombieSlow: 0
  };
  
  const expectedStats = { ...BASE_PLAYER_STATS };
  // 只计算已装备且已鉴定的魂骨
  const equippedBones = testBones.filter(b => b.isEquipped && b.isIdentified);
  equippedBones.forEach(bone => {
    switch (bone.attributeType) {
      case 'health': expectedStats.health += bone.attributeValue; break;
      case 'defense': expectedStats.defense += bone.attributeValue; break;
      case 'dodge': expectedStats.dodge += bone.attributeValue / 100; break;
      case 'knockback': expectedStats.knockback += bone.attributeValue / 100; break;
      case 'slow': expectedStats.zombieSlow += bone.attributeValue / 100; break;
    }
  });
  expectedStats.dodge = Math.min(expectedStats.dodge, 0.8);
  expectedStats.zombieSlow = Math.min(expectedStats.zombieSlow, 0.5);
  
  console.log('预期属性:');
  console.log('  ❤️ 生命值:', expectedStats.health, '(基础1000 +', expectedStats.health - 1000, ')');
  console.log('  🛡️ 防御力:', expectedStats.defense);
  console.log('  💨 闪避率:', (expectedStats.dodge * 100).toFixed(1) + '%');
  console.log('  💥 击退效果:', (expectedStats.knockback * 100).toFixed(0) + '%');
  console.log('  🐌 僵尸减速:', (expectedStats.zombieSlow * 100).toFixed(1) + '%');
  
  // 5. 调用 calculatePlayerStats 计算实际属性
  console.log('\n[步骤5] 调用 calculatePlayerStats 计算实际属性...');
  const actualStats = await calculatePlayerStats(testProfile.id);
  
  console.log('实际属性:');
  console.log('  ❤️ 生命值:', actualStats.health);
  console.log('  🛡️ 防御力:', actualStats.defense);
  console.log('  💨 闪避率:', (actualStats.dodge * 100).toFixed(1) + '%');
  console.log('  💥 击退效果:', (actualStats.knockback * 100).toFixed(0) + '%');
  console.log('  🐌 僵尸减速:', (actualStats.zombieSlow * 100).toFixed(1) + '%');
  
  // 6. 验证结果
  console.log('\n[步骤6] 验证结果...');
  const tests = [
    { name: '生命值', expected: expectedStats.health, actual: actualStats.health, tolerance: 0.01 },
    { name: '防御力', expected: expectedStats.defense, actual: actualStats.defense, tolerance: 0.01 },
    { name: '闪避率', expected: expectedStats.dodge, actual: actualStats.dodge, tolerance: 0.001 },
    { name: '击退效果', expected: expectedStats.knockback, actual: actualStats.knockback, tolerance: 0.001 },
    { name: '僵尸减速', expected: expectedStats.zombieSlow, actual: actualStats.zombieSlow, tolerance: 0.001 }
  ];
  
  let allPassed = true;
  tests.forEach(test => {
    const diff = Math.abs(test.actual - test.expected);
    const passed = diff < test.tolerance;
    if (!passed) allPassed = false;
    console.log(`  ${passed ? '✅' : '❌'} ${test.name}: 预期=${test.expected}, 实际=${test.actual}, 差异=${diff}`);
  });
  
  // 7. 测试 DOM 更新
  console.log('\n[步骤7] 测试 DOM 更新...');
  const healthEl = document.getElementById('stat-health');
  const defenseEl = document.getElementById('stat-defense');
  const dodgeEl = document.getElementById('stat-dodge');
  const knockbackEl = document.getElementById('stat-knockback');
  const slowEl = document.getElementById('stat-slow');
  
  if (healthEl && defenseEl && dodgeEl && knockbackEl && slowEl) {
    console.log('✅ 所有 DOM 元素存在');
    
    // 调用 renderPlayerBattleStats
    await app.renderPlayerBattleStats(testProfile.id);
    
    // 等待 DOM 更新
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 验证 DOM 值
    console.log('DOM 显示值:');
    console.log('  ❤️ 生命值:', healthEl.textContent);
    console.log('  🛡️ 防御力:', defenseEl.textContent);
    console.log('  💨 闪避率:', dodgeEl.textContent);
    console.log('  💥 击退效果:', knockbackEl.textContent);
    console.log('  🐌 僵尸减速:', slowEl.textContent);
    
    const domHealth = parseInt(healthEl.textContent);
    const domDefense = parseInt(defenseEl.textContent);
    const domDodge = parseFloat(dodgeEl.textContent);
    const domKnockback = parseFloat(knockbackEl.textContent);
    const domSlow = parseFloat(slowEl.textContent);
    
    const domTests = [
      { name: 'DOM生命值', expected: Math.round(expectedStats.health), actual: domHealth },
      { name: 'DOM防御力', expected: Math.round(expectedStats.defense), actual: domDefense },
      { name: 'DOM闪避率', expected: (expectedStats.dodge * 100).toFixed(1) + '%', actual: dodgeEl.textContent },
      { name: 'DOM击退效果', expected: (expectedStats.knockback * 100).toFixed(0) + '%', actual: knockbackEl.textContent },
      { name: 'DOM减速', expected: (expectedStats.zombieSlow * 100).toFixed(1) + '%', actual: slowEl.textContent }
    ];
    
    domTests.forEach(test => {
      const passed = test.expected === test.actual || Math.abs(test.expected - test.actual) < 1;
      if (!passed) allPassed = false;
      console.log(`  ${passed ? '✅' : '❌'} ${test.name}: 预期="${test.expected}", 实际="${test.actual}"`);
    });
  } else {
    console.warn('⚠️ 部分 DOM 元素不存在，跳过 DOM 测试');
  }
  
  // 8. 总结
  console.log('\n========== 测试总结 ==========');
  if (allPassed) {
    console.log('🎉 所有测试通过！魂骨属性加成正确计算并显示。');
  } else {
    console.log('❌ 部分测试失败，请检查上述输出。');
  }
  
  return allPassed;
})();
