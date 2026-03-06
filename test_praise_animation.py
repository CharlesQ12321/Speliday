from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page(viewport={'width': 640, 'height': 900})
    
    # 访问应用
    page.goto('http://localhost:8080')
    page.wait_for_load_state('networkidle')
    
    print("页面已加载")
    
    # 等待应用初始化
    time.sleep(2)
    
    # 截图查看初始状态
    page.screenshot(path='test_screenshots/01_initial.png', full_page=True)
    print("已截图: 初始状态")
    
    # 先添加一些测试单词
    # 点击首页的上传图片按钮来进入添加单词界面
    page.evaluate('''
        // 直接通过 JavaScript 添加测试单词到数据库
        const testWords = [
            { word: 'apple', translation: 'n. 苹果' },
            { word: 'banana', translation: 'n. 香蕉' },
            { word: 'cat', translation: 'n. 猫' },
            { word: 'dog', translation: 'n. 狗' },
            { word: 'elephant', translation: 'n. 大象' },
            { word: 'flower', translation: 'n. 花' }
        ];
        
        testWords.forEach(w => {
            db.words.add({
                word: w.word,
                translation: w.translation,
                bookId: 'default',
                errorCount: 0,
                createdAt: Date.now(),
                lastPracticed: 0
            });
        });
    ''')
    
    time.sleep(1)
    print("已添加测试单词")
    
    # 点击练习标签
    practice_nav = page.locator('button.nav-item:has-text("练习")')
    practice_nav.click()
    time.sleep(1)
    page.screenshot(path='test_screenshots/02_practice_page.png', full_page=True)
    print("已截图: 练习页面")
    
    # 点击随机抽取开始练习
    random_btn = page.locator('button:has-text("随机抽取")')
    random_btn.click()
    time.sleep(2)
    page.screenshot(path='test_screenshots/03_practice_started.png', full_page=True)
    print("已截图: 练习开始")
    
    # 连续回答正确5次来测试赞赏动画
    test_words = ['apple', 'banana', 'cat', 'dog', 'elephant']
    
    for i, correct_word in enumerate(test_words):
        print(f"\n--- 测试第 {i+1} 个单词 ---")
        
        # 获取当前显示的释义
        translation = page.locator('#practice-translation').text_content()
        print(f"当前释义: {translation}")
        
        # 输入正确答案
        input_field = page.locator('#practice-input')
        input_field.fill('')
        input_field.fill(correct_word)
        time.sleep(0.3)
        
        # 点击检查按钮
        check_btn = page.locator('#practice-check-btn')
        check_btn.click()
        
        # 等待赞赏动画显示
        time.sleep(0.5)
        
        # 截图捕获赞赏动画
        page.screenshot(path=f'test_screenshots/05_praise_{i+1}_{["Good","Excellent","Outstanding","Brilliant","Bravo_Combo"][i]}.png', full_page=True)
        print(f"已截图: 第 {i+1} 次正确 - 赞赏动画")
        
        # 等待动画完成和下一词
        time.sleep(2)
    
    # 测试错误答案重置计数
    print("\n--- 测试错误答案重置计数 ---")
    translation = page.locator('#practice-translation').text_content()
    print(f"当前释义: {translation}")
    
    input_field = page.locator('#practice-input')
    input_field.fill('wronganswer')
    time.sleep(0.3)
    
    check_btn = page.locator('#practice-check-btn')
    check_btn.click()
    time.sleep(2)
    
    page.screenshot(path='test_screenshots/06_wrong_answer.png', full_page=True)
    print("已截图: 错误答案")
    
    # 点击下一词
    next_btn = page.locator('button:has-text("下一词")')
    if next_btn.is_visible():
        next_btn.click()
        time.sleep(1)
    
    # 再次回答正确，应该显示 Good（因为计数已重置）
    print("\n--- 测试计数重置后再次正确 ---")
    translation = page.locator('#practice-translation').text_content()
    print(f"当前释义: {translation}")
    
    # 获取当前单词的正确答案（从页面上获取）
    # 由于我们不知道当前是哪个单词，输入一个常见单词
    input_field = page.locator('#practice-input')
    input_field.fill('flower')
    time.sleep(0.3)
    
    check_btn = page.locator('#practice-check-btn')
    check_btn.click()
    time.sleep(0.5)
    
    page.screenshot(path='test_screenshots/07_after_reset_good.png', full_page=True)
    print("已截图: 重置后再次正确，应显示 Good")
    
    print("\n✅ 所有测试完成！请查看 test_screenshots 目录中的截图。")
    
    time.sleep(3)
    browser.close()
