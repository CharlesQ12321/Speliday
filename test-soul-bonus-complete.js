// =====================================================
// 魂骨属性加成完整测试脚本
// 使用方法：在浏览器控制台中粘贴并运行此脚本
// =====================================================

(async function testSoulBoneBonusComplete() {
  console.log('%c========== 魂骨属性加成完整测试 ==========', 'color: #667eea; font-size: 18px; font-weight: bold;');
  
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  function assert(condition, testName, message) {
    testResults.total++;
    if (condition) {
      testResults.passed++;
      testResults.details.push(`✅ ${testName}: ${message}`);
      console.log(`%c✅ ${testName}`, 'color: #27ae60;', message);
    } else {
      testResults.failed++;
      testResults.details.push(`❌ ${testName}: ${message}`);
      console.log(`%c❌ ${testName}`, 'color: #e74c3c;', message);
    }
  }

  try {
    // ===================== 步骤 1: 创建测试数据 =====================
    console.log('\n%c[步骤 1] 创建测试数据...', 'color: #667eea; font-size: 14px; font-weight: bold;');
    
    // 清理旧数据
    await db.playerProfiles.where('playerName').equals('魂骨测试').delete();
    
    const playerId = await db.playerProfiles.add({
      playerName: '魂骨测试',
      totalPoints: 0,
      level: 1,
      lastPlayedAt: Date.now()
    });
    
    assert(playerId > 0, '创建角色', `成功创建测试角色, ID: ${playerId}`);
    
    // 清除旧魂骨
    await db.soulBones.where('playerId').equals(playerId).delete();
    
    // 创建测试魂骨（5件已装备+已鉴定）
    const testBones = [
      { beastType: 'mantuo', slot: 'head', attributeType: 'health', attributeValue: 15, name: '曼陀罗蛇头骨' },
      { beastType: 'mantuo', slot: 'body', attributeType: 'defense', attributeValue: 10, name: '曼陀罗蛇躯干骨' },
      { beastType: 'rougu', slot: 'left_arm', attributeType: 'dodge', attributeValue: 5, name: '柔骨兔左臂骨' },
      { beastType: 'xiehou', slot: 'right_leg', attributeType: 'knockback', attributeValue: 8, name: '邪眸白虎右腿骨' },
      { beastType: 'youming', slot: 'external', attributeType: 'slow', attributeValue: 3, name: '幽冥灵猫外附魂骨' }
    ];
    
    for (const bone of testBones) {
      await db.soulBones.add({
        playerId: playerId,
        beastType: bone.beastType,
        beastName: SOUL_BONE_TYPES[bone.beastType].name,
        slot: bone.slot,
        slotName: SOUL_BONE_SLOT_NAMES[bone.slot],
        name: bone.name,
        attributeType: bone.attributeType,
        attributeName: SOUL_BONE_ATTRIBUTES.find(a => a.type === bone.attributeType).name,
        attributeValue: bone.attributeValue,
        isIdentified: true,
        isEquipped: true,
        obtainedAt: Date.now()
      });
    }
    
    assert(true, '创建魂骨', `成功创建 ${testBones.length} 件测试魂骨`);
    
    // 创建不计入加成的魂骨
    await db.soulBones.add({
      playerId: playerId,
      beastType: 'qibao',
      beastName: '七宝琉璃',
      slot: 'head',
      slotName: '头骨',
      name: '七宝琉璃头骨',
      attributeType: 'health',
      attributeName: '生命',
      attributeValue: 100,
      isIdentified: true,
      isEquipped: false, // 未装备
      obtainedAt: Date.now()
    });
    
    await db.soulBones.add({
      playerId: playerId,
      beastType: 'qibao',
      beastName: '七宝琉璃',
      slot: 'body',
      slotName: '躯干骨',
      name: '七宝琉璃躯干骨',
      attributeType: 'defense',
      attributeName: '防御',
      attributeValue: 100,
      isIdentified: false, // 未鉴定
      isEquipped: true,
      obtainedAt: Date.now()
    });
    
    assert(true, '创建不计入魂骨', '创建2件不计入加成的魂骨（未装备+未鉴定）');
    
    // ===================== 步骤 2: 测试属性计算 =====================
    console.log('\n%c[步骤 2] 测试属性计算...', 'color: #667eea; font-size: 14px; font-weight: bold;');
    
    const stats = await calculatePlayerStats(playerId);
    
    // 预期值
    const expectedHealth = 1000 + 15; // 基础1000 + 魂骨15
    const expectedDefense = 0 + 10; // 基础0 + 魂骨10
    const expectedDodge = 0 + 5/100; // 基础0 + 魂骨5%
    const expectedKnockback = 1 + 8/100; // 基础100% + 魂骨8%
    const expectedSlow = 0 + 3/100; // 基础0 + 魂骨3%
    
    assert(
      Math.abs(stats.health - expectedHealth) < 0.01,
      '生命值计算',
      `预期: ${expectedHealth}, 实际: ${stats.health}`
    );
    
    assert(
      Math.abs(stats.defense - expectedDefense) < 0.01,
      '防御力计算',
      `预期: ${expectedDefense}, 实际: ${stats.defense}`
    );
    
    assert(
      Math.abs(stats.dodge - expectedDodge) < 0.001,
      '闪避率计算',
      `预期: ${(expectedDodge * 100).toFixed(1)}%, 实际: ${(stats.dodge * 100).toFixed(1)}%`
    );
    
    assert(
      Math.abs(stats.knockback - expectedKnockback) < 0.001,
      '击退效果计算',
      `预期: ${(expectedKnockback * 100).toFixed(0)}%, 实际: ${(stats.knockback * 100).toFixed(0)}%`
    );
    
    assert(
      Math.abs(stats.zombieSlow - expectedSlow) < 0.001,
      '僵尸减速计算',
      `预期: ${(expectedSlow * 100).toFixed(1)}%, 实际: ${(stats.zombieSlow * 100).toFixed(1)}%`
    );
    
    // ===================== 步骤 3: 测试伤害计算 =====================
    console.log('\n%c[步骤 3] 测试伤害计算...', 'color: #667eea; font-size: 14px; font-weight: bold;');
    
    // 测试闪避
    let dodgeCount = 0;
    const testRounds = 1000;
    for (let i = 0; i < testRounds; i++) {
      const result = onZombieAttack(stats);
      if (result.dodged) dodgeCount++;
    }
    const dodgeRate = dodgeCount / testRounds;
    
    assert(
      Math.abs(dodgeRate - stats.dodge) < 0.05,
      '闪避概率',
      `预期闪避率: ${(stats.dodge * 100).toFixed(1)}%, 实际闪避率: ${(dodgeRate * 100).toFixed(1)}%`
    );
    
    // 测试伤害（不考虑闪避）
    const damageResult = onZombieAttack({ ...stats, dodge: 0 });
    const expectedDamage = Math.max(0, 100 - stats.defense);
    
    assert(
      damageResult.damage === expectedDamage,
      '伤害计算',
      `僵尸攻击100, 防御${stats.defense}, 预期伤害: ${expectedDamage}, 实际伤害: ${damageResult.damage}`
    );
    
    // 测试高防御（伤害应为0）
    const highDefenseStats = { ...stats, defense: 150, dodge: 0 };
    const highDefenseDamage = onZombieAttack(highDefenseStats);
    
    assert(
      highDefenseDamage.damage === 0,
      '高防御减伤',
      `防御150时伤害应为0, 实际: ${highDefenseDamage.damage}`
    );
    
    // ===================== 步骤 4: 测试 DOM 显示 =====================
    console.log('\n%c[步骤 4] 测试 DOM 显示...', 'color: #667eea; font-size: 14px; font-weight: bold;');
    
    // 检查元素是否存在
    const healthEl = document.getElementById('stat-health');
    const defenseEl = document.getElementById('stat-defense');
    const dodgeEl = document.getElementById('stat-dodge');
    const knockbackEl = document.getElementById('stat-knockback');
    const slowEl = document.getElementById('stat-slow');
    
    assert(
      healthEl && defenseEl && dodgeEl && knockbackEl && slowEl,
      'DOM元素存在',
      '所有对战属性DOM元素都存在'
    );
    
    if (healthEl && defenseEl && dodgeEl && knockbackEl && slowEl) {
      // 调用渲染函数
      await app.renderPlayerBattleStats(playerId);
      
      // 等待DOM更新
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 验证显示值
      const displayHealth = parseInt(healthEl.textContent);
      const displayDefense = parseInt(defenseEl.textContent);
      const displayDodge = parseFloat(dodgeEl.textContent);
      const displayKnockback = parseFloat(knockbackEl.textContent);
      const displaySlow = parseFloat(slowEl.textContent);
      
      assert(
        Math.abs(displayHealth - Math.round(expectedHealth)) < 1,
        '生命值显示',
        `预期显示: ${Math.round(expectedHealth)}, 实际显示: ${displayHealth}`
      );
      
      assert(
        Math.abs(displayDefense - Math.round(expectedDefense)) < 1,
        '防御力显示',
        `预期显示: ${Math.round(expectedDefense)}, 实际显示: ${displayDefense}`
      );
      
      assert(
        Math.abs(displayDodge - (expectedDodge * 100)) < 0.5,
        '闪避率显示',
        `预期显示: ${(expectedDodge * 100).toFixed(1)}%, 实际显示: ${dodgeEl.textContent}`
      );
      
      assert(
        Math.abs(displayKnockback - (expectedKnockback * 100)) < 1,
        '击退显示',
        `预期显示: ${(expectedKnockback * 100).toFixed(0)}%, 实际显示: ${knockbackEl.textContent}`
      );
      
      assert(
        Math.abs(displaySlow - (expectedSlow * 100)) < 0.5,
        '减速显示',
        `预期显示: ${(expectedSlow * 100).toFixed(1)}%, 实际显示: ${slowEl.textContent}`
      );
    }
    
    // ===================== 步骤 5: 测试击退倍率 =====================
    console.log('\n%c[步骤 5] 测试击退倍率...', 'color: #667eea; font-size: 14px; font-weight: bold;');
    
    const baseKnockback = 5;
    const actualKnockback = baseKnockback * stats.knockback;
    const expectedKnockbackDistance = 5 * 1.08; // 5 * (1 + 8/100)
    
    assert(
      Math.abs(actualKnockback - expectedKnockbackDistance) < 0.01,
      '击退距离计算',
      `基础击退5%, 倍率${stats.knockback}, 预期实际击退: ${expectedKnockbackDistance.toFixed(2)}%, 实际: ${actualKnockback.toFixed(2)}%`
    );
    
    // ===================== 步骤 6: 测试减速效果 =====================
    console.log('\n%c[步骤 6] 测试减速效果...', 'color: #667eea; font-size: 14px; font-weight: bold;');
    
    const baseTime = 150; // 假设150秒
    const slowEffect = stats.zombieSlow;
    const adjustedTime = baseTime / (1 - slowEffect);
    const expectedAdjustedTime = 150 / (1 - 0.03);
    
    assert(
      Math.abs(adjustedTime - expectedAdjustedTime) < 0.1,
      '减速时间计算',
      `基础时间150秒, 减速${(slowEffect * 100).toFixed(1)}%, 预期调整后: ${expectedAdjustedTime.toFixed(2)}秒, 实际: ${adjustedTime.toFixed(2)}秒`
    );
    
    // ===================== 测试总结 =====================
    console.log('\n%c========== 测试总结 ==========', 'color: #667eea; font-size: 18px; font-weight: bold;');
    console.log(`%c总测试数: ${testResults.total}`, 'color: #667eea; font-size: 16px;');
    console.log(`%c✅ 通过: ${testResults.passed}`, 'color: #27ae60; font-size: 16px; font-weight: bold;');
    console.log(`%c❌ 失败: ${testResults.failed}`, testResults.failed === 0 ? 'color: #27ae60; font-size: 16px;' : 'color: #e74c3c; font-size: 16px; font-weight: bold;');
    
    if (testResults.failed === 0) {
      console.log('%c🎉 所有测试通过！魂骨属性加成系统工作正常！', 'color: #27ae60; font-size: 20px; font-weight: bold;');
    } else {
      console.log('%c⚠️ 部分测试失败，请检查上述输出', 'color: #e74c3c; font-size: 16px; font-weight: bold;');
      console.log('\n失败详情:');
      testResults.details.filter(d => d.startsWith('❌')).forEach(d => console.log('  ' + d));
    }
    
    return testResults;
    
  } catch (err) {
    console.error('%c❌ 测试执行出错:', 'color: #e74c3c; font-size: 16px;', err);
    console.error(err.stack);
    return testResults;
  }
})();
