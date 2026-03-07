// 测试高频错词功能
async function testHighErrorFeature() {
  console.log('=== 测试高频错词功能 ===\n');

  // 模拟单词数据
  const testWords = [
    { id: 1, word: 'apple', correctCount: 2, errorCount: 5, bookIds: ['default'] }, // 正确率 28.6%, 错误5次
    { id: 2, word: 'banana', correctCount: 8, errorCount: 2, bookIds: ['default'] }, // 正确率 80%, 错误2次
    { id: 3, word: 'cherry', correctCount: 1, errorCount: 4, bookIds: ['default'] }, // 正确率 20%, 错误4次
    { id: 4, word: 'date', correctCount: 10, errorCount: 0, bookIds: ['default'] }, // 正确率 100%, 错误0次
    { id: 5, word: 'elderberry', correctCount: 3, errorCount: 3, bookIds: ['default'] }, // 正确率 50%, 错误3次
  ];

  // 默认设置
  const settings = {
    minPracticeCount: 5,        // 最少练习5次
    accuracyThreshold: 60,      // 正确率低于60%
    errorCountThreshold: 3      // 错误次数达到3次
  };

  console.log('高频错词判断标准：');
  console.log(`- 最少练习次数: ${settings.minPracticeCount}次`);
  console.log(`- 正确率阈值: ${settings.accuracyThreshold}%`);
  console.log(`- 错误次数阈值: ${settings.errorCountThreshold}次`);
  console.log('\n测试单词数据：\n');

  testWords.forEach(word => {
    const totalCount = word.correctCount + word.errorCount;
    const accuracy = totalCount > 0 ? (word.correctCount / totalCount * 100).toFixed(1) : 0;

    // 判断是否为高频错词
    const meetsMinPractice = totalCount >= settings.minPracticeCount;
    const meetsAccuracy = accuracy < settings.accuracyThreshold;
    const meetsErrorCount = word.errorCount >= settings.errorCountThreshold;
    const isHighError = meetsMinPractice && meetsAccuracy && meetsErrorCount;

    console.log(`${word.word}:`);
    console.log(`  正确: ${word.correctCount}, 错误: ${word.errorCount}, 总计: ${totalCount}`);
    console.log(`  正确率: ${accuracy}%`);
    console.log(`  满足最少练习: ${meetsMinPractice}, 正确率低于阈值: ${meetsAccuracy}, 错误次数达标: ${meetsErrorCount}`);
    console.log(`  是否为高频错词: ${isHighError ? '是 ⚠️' : '否 ✓'}`);
    console.log('');
  });

  console.log('=== 预期结果 ===');
  console.log('apple: 是高频错词 (练习7次≥5, 正确率28.6%<60%, 错误5次≥3)');
  console.log('banana: 不是 (正确率80%≥60%)');
  console.log('cherry: 是高频错词 (练习5次≥5, 正确率20%<60%, 错误4次≥3)');
  console.log('date: 不是 (错误0次<3)');
  console.log('elderberry: 是高频错词 (练习6次≥5, 正确率50%<60%, 错误3次≥3)');
}

testHighErrorFeature();
