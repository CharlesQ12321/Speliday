/**
 * 智拍单词本 - AI SnapWords
 * Main Application Logic
 */

// Database Setup
const db = new Dexie('SnapWordsDB');
db.version(6).stores({
  words: '++id, word, translation, *bookIds, errorCount, correctCount, isReported, createdAt, lastPracticed',
  books: '++id, bookId, bookName, createdAt',
  settings: 'key, value',
  practiceScores: '++id, playerName, totalScore, wordCount, correctCount, createdAt',
  dailyPracticeSessions: '++id, date, completedAt'
});

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
    key: 'd54dc5bab2624d67b0525a82958b7ca9.F5u7mVKLCD5NHQt5',  // 内置API Key
    url: ''
  },
  // Camera and Image Processing
  mediaStream: null,
  currentCameraFacing: 'environment',
  currentImageData: null,
  currentRotation: 0,
  // 连续正确拼写计数
  consecutiveCorrectCount: 0,
  // 练习积分
  practiceScore: 0,
  // 本次练习总单词数
  totalWordsInPractice: 0,
  // 本次练习正确数
  correctWordsInPractice: 0
};

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
    this.showToast('欢迎使用智拍单词本！', 'success');
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
    const selects = ['target-book', 'practice-book-select'];
    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (!select) return;
      
      // Keep first option for 'all' if it's practice select
      const currentValue = select.value;
      select.innerHTML = selectId === 'practice-book-select' 
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
    state.currentPage = page;
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Update pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
    });
    document.getElementById(`page-${page}`).classList.add('active');
    
    // Refresh data
    if (page === 'library') {
      this.renderLibrary();
    } else if (page === 'stats') {
      this.renderStats();
    } else if (page === 'home') {
      this.updateStats();
      this.renderRecentWords();
    } else if (page === 'settings') {
      // 加载高频错词设置
      this.loadHighErrorSettingsToPage();
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

    // Handle duplicates
    for (const dup of duplicates) {
      const action = confirm(`单词 "${dup.word}" 已存在（释义：${dup.existing.translation}）。是否将该单词添加到当前单词本？`);
      if (action) {
        // 将新单词本添加到现有单词的 bookIds 中
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
      }
    }

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
    state.correctWordsInPractice = 0; // 重置正确数

    // 隐藏设置区域
    document.getElementById('practice-setup').style.display = 'none';

    // 显示练习区域
    document.getElementById('practice-area').style.display = 'block';

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

    const isCorrect = input === word.word.toLowerCase();

    if (isCorrect) {
      // 增加连续正确计数
      state.consecutiveCorrectCount++;
      
      // 计算本次得分：第1次1分，每次+1分，最高5分
      const pointsEarned = Math.min(state.consecutiveCorrectCount, 5);
      state.practiceScore += pointsEarned;
      state.correctWordsInPractice++;
      
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
      // 拼写错误，重置连续正确计数
      state.consecutiveCorrectCount = 0;
      
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
      } else {
        state.wrongWordsInRound[existingIndex] = updatedWordData;
      }

      // Highlight differences
      const highlighted = this.highlightDifferences(input, word.word);

      feedback.innerHTML = `
        <div>❌ 回答错误</div>
        <div>你的答案: ${highlighted}</div>
        <div class="correct-word">正确: ${word.word}</div>
      `;
      feedback.className = 'practice-feedback incorrect show';

      // Update button to next
      btn.textContent = '下一词';
      btn.onclick = () => {
        state.currentPracticeIndex++;
        this.showNextWord();
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
      <div>总单词数: ${state.totalWordsInPractice}</div>
      <div>正确数: ${state.correctWordsInPractice}</div>
      <div>正确率: ${Math.round((state.correctWordsInPractice / state.totalWordsInPractice) * 100)}%</div>
    `;
    
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

    this.closePracticeCompleteModal();
    this.endPractice();
    this.updateStats();
    this.showToast('成绩已保存！', 'success');
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
    document.getElementById('practice-setup').style.display = 'block';
    document.getElementById('practice-area').style.display = 'none';
    state.practiceWords = [];
    state.currentPracticeIndex = 0;
    state.wrongWordsInRound = [];
    state.practiceScore = 0;
    state.totalWordsInPractice = 0;
    state.correctWordsInPractice = 0;
    state.consecutiveCorrectCount = 0;
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

  // 渲染练习成绩列表
  async renderPracticeScores() {
    const container = document.getElementById('practice-scores-list');
    if (!container) return;

    // 获取所有成绩，按分数降序排列
    const scores = await db.practiceScores
      .orderBy('totalScore')
      .reverse()
      .limit(20)
      .toArray();

    if (scores.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏆</div>
          <div class="empty-title">暂无成绩记录</div>
          <div class="empty-subtitle">完成练习后成绩将显示在这里</div>
        </div>
      `;
      return;
    }

    // 按分数分组显示
    const sortedScores = scores.sort((a, b) => b.totalScore - a.totalScore);
    
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${sortedScores.map((score, index) => {
          const rank = index + 1;
          let rankBadge = '';
          if (rank === 1) rankBadge = '🥇';
          else if (rank === 2) rankBadge = '🥈';
          else if (rank === 3) rankBadge = '🥉';
          else rankBadge = `<span style="color: var(--text-muted); font-weight: 600;">#${rank}</span>`;
          
          const date = new Date(score.createdAt).toLocaleDateString('zh-CN');
          const accuracy = Math.round((score.correctCount / score.wordCount) * 100);
          
          return `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="font-size: 24px; min-width: 36px; text-align: center;">${rankBadge}</div>
              <div style="flex: 1;">
                <div style="font-weight: 600; color: var(--text-primary); font-size: 16px;">${score.playerName}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${date} · ${score.wordCount}词 · 正确率${accuracy}%</div>
              </div>
              <div style="font-size: 24px; font-weight: 700; color: var(--primary);">${score.totalScore}</div>
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
    
    const data = {
      words: sanitizedWords,
      books: sanitizedBooks,
      practiceScores: scores,
      exportDate: new Date().toISOString(),
      version: '1.2'
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
    document.getElementById('import-file').click();
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
      
      // Confirm
      if (!confirm(`确定要导入 ${data.words.length} 个单词吗？这将覆盖现有数据。`)) {
        return;
      }
      
      // Clear existing data
      await db.words.clear();
      await db.books.clear();
      await db.practiceScores.clear();
      
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
      
      await this.loadBooks();
      await this.loadWords();
      this.updateStats();
      this.renderRecentWords();
      this.renderBookTabs();
      
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
    if (!confirm('确定要清除所有数据吗？此操作不可恢复！')) return;
    if (!confirm('再次确认：所有单词和练习记录将被删除！')) return;
    
    await db.words.clear();
    await db.books.clear();
    await db.practiceScores.clear();
    await db.dailyPracticeSessions.clear();
    await this.initDatabase();
    await this.loadBooks();
    await this.loadWords();
    
    this.updateStats();
    this.renderRecentWords();
    this.renderBookTabs();
    this.renderLibrary();
    this.renderStats();
    
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
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {
    console.log('Service Worker registration failed:', err);
  });
}
