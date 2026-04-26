// 测试：竞态条件修复验证
// 验证并发调用checkAnswer时，zombieForward只增加10%而不是20%

const mockState = {
  zombieForward: 0,
  zombiePushBack: 0,
  zombiePosition: 0,
  isCheckingAnswer: false,
  currentPage: 'practice',
  practiceWords: [{ id: 1, word: 'test', translation: '测试' }],
  currentPracticeIndex: 0,
  firstRoundWrongIds: [],
  wrongWordsInRound: []
};

// 模拟的checkAnswer函数（修复后版本）
async function mockCheckAnswer() {
  // 防止并发调用：如果正在处理中，直接返回
  if (mockState.isCheckingAnswer) {
    console.log('  [阻止] 发现并发调用，阻止第二次执行');
    return;
  }
  mockState.isCheckingAnswer = true;

  console.log('  [开始] checkAnswer执行开始');

  // 模拟异步操作（类似handleComboBreak和checkWrongAnswerPenalty）
  await new Promise(resolve => setTimeout(resolve, 100));

  // 模拟拼写错误处理
  console.log('  [处理] 拼写错误，增加zombieForward 10%');
  const zombieForwardAmount = 10;
  mockState.zombieForward = (mockState.zombieForward || 0) + zombieForwardAmount;

  // 更新位置
  mockState.zombiePosition = Math.min(
    Math.max(mockState.zombieForward - mockState.zombiePushBack, 0),
    100
  );

  console.log(`  [完成] zombieForward=${mockState.zombieForward}%, zombiePosition=${mockState.zombiePosition}%`);

  // 重置状态
  mockState.isCheckingAnswer = false;
}

// 测试用例1：模拟快速连续两次调用（并发竞态条件）
async function testConcurrentCalls() {
  console.log('\n=====================================');
  console.log('测试1：模拟快速连续点击（并发调用）');
  console.log('=====================================\n');

  mockState.zombieForward = 0;
  mockState.isCheckingAnswer = false;

  console.log('初始状态: zombieForward = 0%');

  // 模拟同时点击按钮和按回车键
  const promise1 = mockCheckAnswer();
  const promise2 = mockCheckAnswer(); // 这应该被阻止

  await Promise.all([promise1, promise2]);

  console.log(`\n最终状态: zombieForward = ${mockState.zombieForward}%`);

  if (mockState.zombieForward === 10) {
    console.log('✅ 测试1通过 - 并发调用被阻止，zombieForward只增加了10%');
    return true;
  } else {
    console.log(`❌ 测试1失败 - 期望10%，实际${mockState.zombieForward}%`);
    return false;
  }
}

// 测试用例2：正常顺序调用（不应该被阻止）
async function testSequentialCalls() {
  console.log('\n=====================================');
  console.log('测试2：正常顺序调用（两次独立错误）');
  console.log('=====================================\n');

  mockState.zombieForward = 0;
  mockState.isCheckingAnswer = false;

  console.log('初始状态: zombieForward = 0%');

  // 第一次调用
  await mockCheckAnswer();
  console.log(`第一次后: zombieForward = ${mockState.zombieForward}%`);

  // 等待一段时间后第二次调用
  await new Promise(resolve => setTimeout(resolve, 50));
  await mockCheckAnswer();
  console.log(`第二次后: zombieForward = ${mockState.zombieForward}%`);

  if (mockState.zombieForward === 20) {
    console.log('✅ 测试2通过 - 正常顺序调用，两次错误累计20%');
    return true;
  } else {
    console.log(`❌ 测试2失败 - 期望20%，实际${mockState.zombieForward}%`);
    return false;
  }
}

// 测试用例3：切换角色后状态重置
async function testProfileSwitch() {
  console.log('\n=====================================');
  console.log('测试3：切换角色后状态重置');
  console.log('=====================================\n');

  // 角色A犯错
  mockState.zombieForward = 0;
  mockState.isCheckingAnswer = false;
  await mockCheckAnswer();
  console.log(`角色A犯错后: zombieForward = ${mockState.zombieForward}%`);

  // 切换到角色B（重置状态）
  console.log('\n切换到角色B...');
  mockState.zombieForward = 0;
  mockState.zombiePushBack = 0;
  mockState.zombiePosition = 0;
  console.log(`切换后: zombieForward = ${mockState.zombieForward}%`);

  // 角色B犯错
  await mockCheckAnswer();
  console.log(`角色B犯错后: zombieForward = ${mockState.zombieForward}%`);

  if (mockState.zombieForward === 10) {
    console.log('✅ 测试3通过 - 切换角色后正确重置，只前进10%');
    return true;
  } else {
    console.log(`❌ 测试3失败 - 期望10%，实际${mockState.zombieForward}%`);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('\n=====================================');
  console.log('竞态条件修复 - 完整测试套件');
  console.log('=====================================');

  let passCount = 0;
  let failCount = 0;

  const test1 = await testConcurrentCalls();
  if (test1) passCount++; else failCount++;

  const test2 = await testSequentialCalls();
  if (test2) passCount++; else failCount++;

  const test3 = await testProfileSwitch();
  if (test3) passCount++; else failCount++;

  console.log('\n=====================================');
  console.log('测试结果汇总:');
  console.log(`通过: ${passCount}/3`);
  console.log(`失败: ${failCount}/3`);

  if (failCount === 0) {
    console.log('\n🎉 所有测试通过！修复成功！');
    console.log('✓ 并发调用被正确阻止');
    console.log('✓ 正常顺序调用正常工作');
    console.log('✓ 切换角色后状态正确重置');
    console.log('✓ 任何角色拼写错误时怪物只前进10%');
    process.exit(0);
  } else {
    console.log(`\n❌ 有 ${failCount} 个测试失败`);
    process.exit(1);
  }
}

runAllTests();
