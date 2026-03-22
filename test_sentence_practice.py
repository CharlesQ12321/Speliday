from playwright.sync_api import sync_playwright
import time

def test_sentence_practice():
    with sync_playwright() as p:
        # 使用headless模式
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        try:
            # 访问应用
            print("正在访问应用...")
            page.goto('http://localhost:8080')
            page.wait_for_load_state('networkidle')

            # 等待应用初始化
            time.sleep(2)

            # 截图查看初始状态
            page.screenshot(path='test_screenshots/01_initial.png', full_page=True)
            print("已截图：初始页面")

            # 点击练习标签
            print("点击练习标签...")
            practice_nav = page.locator('button.nav-item:has-text("练习")')
            practice_nav.click()
            time.sleep(1)
            page.screenshot(path='test_screenshots/02_practice_page.png', full_page=True)
            print("已截图：练习页面")

            # 点击句子填空按钮
            print("点击句子填空按钮...")
            sentence_btn = page.locator('button:has-text("句子填空")')
            sentence_btn.click()
            time.sleep(1)
            page.screenshot(path='test_screenshots/03_sentence_practice_setup.png', full_page=True)
            print("已截图：句子填空设置页面")

            # 检查句子填空页面元素
            print("\n检查句子填空页面元素...")

            # 检查标题
            title = page.locator('#page-sentence-practice .section-title')
            if title.is_visible():
                print(f"✓ 标题可见: {title.inner_text()}")
            else:
                print("✗ 标题不可见")

            # 检查单词本选择
            book_select = page.locator('#sentence-practice-book-select')
            if book_select.is_visible():
                print("✓ 单词本选择下拉框可见")
            else:
                print("✗ 单词本选择下拉框不可见")

            # 检查练习数量输入
            count_input = page.locator('#sentence-practice-count')
            if count_input.is_visible():
                print("✓ 练习数量输入框可见")
            else:
                print("✗ 练习数量输入框不可见")

            # 检查模式按钮
            random_btn = page.locator('button:has-text("随机抽取")')
            error_btn = page.locator('#page-sentence-practice button:has-text("错词复习")')

            if random_btn.is_visible():
                print("✓ 随机抽取按钮可见")
            else:
                print("✗ 随机抽取按钮不可见")

            if error_btn.is_visible():
                print("✓ 错词复习按钮可见")
            else:
                print("✗ 错词复习按钮不可见")

            print("\n所有基本元素检查完成！")
            print("请手动添加一些单词后测试句子填空功能")

        except Exception as e:
            print(f"测试出错: {e}")
            page.screenshot(path='test_screenshots/error.png', full_page=True)

        finally:
            browser.close()

if __name__ == '__main__':
    import os
    os.makedirs('test_screenshots', exist_ok=True)
    test_sentence_practice()
