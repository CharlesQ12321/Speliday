from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:8080')
    page.wait_for_load_state('networkidle')

    # 检查页面是否正常加载
    title = page.title()
    print(f'页面标题: {title}')

    # 检查高频错词统计是否存在
    try:
        error_words_stat = page.locator('#stat-error-words').text_content()
        print(f'高频错词统计: {error_words_stat}')
    except Exception as e:
        print(f'高频错词统计元素未找到: {e}')

    # 截图查看页面状态
    page.screenshot(path='test_screenshot.png', full_page=True)
    print('截图已保存到 test_screenshot.png')

    browser.close()
