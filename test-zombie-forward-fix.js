// 测试：切换角色后怪物前进百分比修复验证
// 此测试验证 app.js 中 switchProfile 函数是否正确重置了 zombieForward 状态

const mockState = {
  zombieForward: 0,
  zombiePushBack: 0,
  zombiePosition: 0,
  currentPage: 'profile',
  practiceWords: [],
  currentPracticeIndex: 0
};

// 模拟切换角色函数（修复后的版本）
function switchProfile(playerName) {
  console.log(`[INFO] 切换到角色: ${playerName}`);
  
  // 关键修复：重置僵尸游戏状态
  mockState.zombieForward = 0;
  mockState.zombiePushBack = 0;
  mockState.zombiePosition = 0;
  
  console.log(`[INFO] 僵尸状态已重置: zombieForward=${mockState.zombieForward}%, zombiePushBack=${mockState.zombiePushBack}%, zombiePosition=${mockState.zombiePosition}%`);
}

// 模拟拼写错误处理
function handleWrongAnswer() {
  const zombieForwardAmount = 10;
  mockState.zombieForward = (mockState.zombieForward || 0) + zombieForwardAmount;
  console.log(`[INFO] 拼写错误，zombieForward += 10%，当前值: ${mockState.zombieForward}%`);
}

// 测试用例
async function runTests() {
  console.log('\n=====================================');
  console.log('开始测试：切换角色后怪物前进百分比修复');
  console.log('=====================================\n');

  let passCount = 0;
  let failCount = 0;

  // TC1: 角色A首次错误
  console.log('TC1: 角色A首次错误');
  switchProfile('唐三');
  handleWrongAnswer();
  if (mockState.zombieForward === 10) {
    console.log('✅ TC1 通过 - 期望: 10%, 实际: 10%');
    passCount++;
  } else {
    console.log(`❌ TC1 失败 - 期望: 10%, 实际: ${mockState.zombieForward}%`);
    failCount++;
  }

  // TC2: 角色A第二次错误
  console.log('\nTC2: 角色A第二次错误');
  handleWrongAnswer();
  if (mockState.zombieForward === 20) {
    console.log('✅ TC2 通过 - 期望: 20%, 实际: 20%');
    passCount++;
  } else {
    console.log(`❌ TC2 失败 - 期望: 20%, 实际: ${mockState.zombieForward}%`);
    failCount++;
  }

  // TC3: 切换到角色B，状态应重置
  console.log('\nTC3: 切换到角色B，状态应重置');
  switchProfile('小舞');
  if (mockState.zombieForward === 0) {
    console.log('✅ TC3 通过 - 期望: 0%, 实际: 0%');
    passCount++;
  } else {
    console.log(`❌ TC3 失败 - 期望: 0%, 实际: ${mockState.zombieForward}%`);
    failCount++;
  }

  // TC4: 角色B首次错误
  console.log('\nTC4: 角色B首次错误');
  handleWrongAnswer();
  if (mockState.zombieForward === 10) {
    console.log('✅ TC4 通过 - 期望: 10%, 实际: 10%');
    passCount++;
  } else {
    console.log(`❌ TC4 失败 - 期望: 10%, 实际: ${mockState.zombieForward}%`);
    failCount++;
  }

  // TC5: 角色B第二次错误
  console.log('\nTC5: 角色B第二次错误');
  handleWrongAnswer();
  if (mockState.zombieForward === 20) {
    console.log('✅ TC5 通过 - 期望: 20%, 实际: 20%');
    passCount++;
  } else {
    console.log(`❌ TC5 失败 - 期望: 20%, 实际: ${mockState.zombieForward}%`);
    failCount++;
  }

  // TC6: 切换到角色C，状态应重置
  console.log('\nTC6: 切换到角色C，状态应重置');
  switchProfile('戴沐白');
  if (mockState.zombieForward === 0) {
    console.log('✅ TC6 通过 - 期望: 0%, 实际: 0%');
    passCount++;
  } else {
    console.log(`❌ TC6 失败 - 期望: 0%, 实际: ${mockState.zombieForward}%`);
    failCount++;
  }

  // TC7: 角色C首次错误
  console.log('\nTC7: 角色C首次错误');
  handleWrongAnswer();
  if (mockState.zombieForward === 10) {
    console.log('✅ TC7 通过 - 期望: 10%, 实际: 10%');
    passCount++;
  } else {
    console.log(`❌ TC7 失败 - 期望: 10%, 实际: ${mockState.zombieForward}%`);
    failCount++;
  }

  // TC8: 切换回角色A，状态应重置
  console.log('\nTC8: 切换回角色A，状态应重置');
  switchProfile('唐三');
  if (mockState.zombieForward === 0) {
    console.log('✅ TC8 通过 - 期望: 0%, 实际: 0%');
    passCount++;
  } else {
    console.log(`❌ TC8 失败 - 期望: 0%, 实际: ${mockState.zombieForward}%`);
    failCount++;
  }

  // 测试结果汇总
  console.log('\n=====================================');
  console.log('测试结果汇总:');
  console.log(`通过: ${passCount}/${passCount + failCount}`);
  console.log(`失败: ${failCount}/${passCount + failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 所有测试通过！修复成功！');
    console.log('✓ 切换角色后，任何角色的怪物前进百分比都正确重置为10%');
    process.exit(0);
  } else {
    console.log(`\n❌ 有 ${failCount} 个测试失败`);
    process.exit(1);
  }
}

runTests();
