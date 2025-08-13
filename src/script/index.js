// MarkMirror Mobile - Main Application
// A powerful Markdown editor with dual-panel interface

import { PreviewPanel } from '../ui/preview.js';
import { Storage } from '../utils/storage.js';
import { FileHandler } from '../utils/fileHandler.js';
import { SimpleEditor } from '../ui/simpleEditor.js';
import { Analytics } from '../utils/analytics.js';
import { AnalyticsPanel } from '../ui/analyticsPanel.js';
import { PWAManager } from '../utils/pwa.js';

class MarkMirrorApp {
  constructor() {
    this.editor = null;
    this.preview = null;
    this.storage = new Storage();
    this.fileHandler = new FileHandler();
    this.analytics = new Analytics();
    this.analyticsPanel = new AnalyticsPanel(this.analytics);
    this.pwaManager = new PWAManager();
    this.settings = this.storage.loadSettings();
    this.autoSaveTimer = null;
    this.currentTheme = this.settings.theme;
    this.lastContent = '';

    this.init();
  }

  // Initialize the application
  async init() {
    try {
      this.showLoading(true);

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Initialize components
      this.initializeTheme();
      await this.initializeEditor();
      this.initializePreview();
      this.initializeUI();
      this.loadSavedContent();
      this.setupAutoSave();

      // Force scroll setup after everything is loaded
      setTimeout(() => {
        this.forceScrollSetup();
      }, 1000);

      this.showLoading(false);

      console.log('MarkMirror Mobile initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MarkMirror:', error);
      this.showError('Failed to initialize application');
    }
  }

  // Initialize theme system
  initializeTheme() {
    // Detect system theme preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Set initial theme
    if (this.settings.theme === 'auto') {
      this.currentTheme = prefersDark ? 'dark' : 'light';
    } else {
      this.currentTheme = this.settings.theme;
    }

    this.applyTheme(this.currentTheme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (this.settings.theme === 'auto') {
        this.currentTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
      }
    });
  }

  // Apply theme to the application
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // Update theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
      themeToggle.title = theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему';
    }
  }

  // Initialize the editor
  async initializeEditor() {
    const container = document.getElementById('editor-container');
    if (!container) {
      throw new Error('Editor container not found');
    }

    // Try to use CodeMirror first, fallback to simple editor
    try {
      // Dynamically import CodeMirror editor
      const { MarkdownEditor } = await import('../ui/editor.js');
      this.editor = new MarkdownEditor(container, {
        theme: this.currentTheme,
        autoComplete: this.settings.autoComplete,
        onChange: content => this.handleContentChange(content),
        onScroll: scrollInfo => this.handleEditorScroll(scrollInfo),
      });
      console.log('CodeMirror editor initialized');
    } catch (error) {
      console.warn('CodeMirror failed to load, using simple editor:', error);
      // Use simple editor as fallback
      this.editor = new SimpleEditor(container, {
        theme: this.currentTheme,
        autoComplete: this.settings.autoComplete,
        onChange: content => this.handleContentChange(content),
        onScroll: scrollInfo => this.handleEditorScroll(scrollInfo),
      });
      console.log('Simple editor initialized');
    }
  }

  // Initialize the preview panel
  initializePreview() {
    const plainTextContainer = document.getElementById('plain-text-output');
    const htmlContainer = document.getElementById('html-output');

    if (!plainTextContainer || !htmlContainer) {
      throw new Error('Preview containers not found');
    }

    this.preview = new PreviewPanel({
      plainTextContainer,
      htmlContainer,
      syncScroll: this.settings.syncScroll,
      zoom: this.settings.previewZoom,
      useExternalParser: this.settings.useExternalParser,
      showMarkdownHighlight: this.settings.markdownHighlight,
    });
  }

  // Initialize UI event handlers
  initializeUI() {
    this.setupFileControls();
    this.setupSettingsPanel();
    this.setupAnalyticsPanel();
    this.setupMobileTabs();
    this.setupHelpModal();
    this.setupKeyboardShortcuts();
  }

  // Setup file control handlers
  setupFileControls() {
    // Import button
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', e => this.handleFileImport(e));
    }

    // Export buttons
    const exportMdBtn = document.getElementById('export-md-btn');
    const exportHtmlBtn = document.getElementById('export-html-btn');

    if (exportMdBtn) {
      exportMdBtn.addEventListener('click', () => this.exportMarkdown());
    }

    if (exportHtmlBtn) {
      exportHtmlBtn.addEventListener('click', () => this.exportHTML());
    }

    // Clear button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearEditor());
    }
  }

  // Setup settings panel
  setupSettingsPanel() {
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');

    if (settingsToggle && settingsPanel) {
      settingsToggle.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
      });

      // Close settings when clicking outside
      document.addEventListener('click', e => {
        if (!settingsPanel.contains(e.target) && !settingsToggle.contains(e.target)) {
          settingsPanel.classList.add('hidden');
        }
      });
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Settings controls
    this.setupSettingsControls();
  }

  // Setup settings controls
  setupSettingsControls() {
    // Auto-complete toggle
    const autoCompleteToggle = document.getElementById('auto-complete-toggle');
    if (autoCompleteToggle) {
      autoCompleteToggle.checked = this.settings.autoComplete;
      autoCompleteToggle.addEventListener('change', e => {
        const oldValue = this.settings.autoComplete;
        this.settings.autoComplete = e.target.checked;
        this.saveSettings();
        if (this.editor) {
          this.editor.toggleAutoComplete(e.target.checked);
        }

        // Track setting change
        if (this.analytics) {
          this.analytics.trackSettingChange('autoComplete', oldValue, e.target.checked);
        }
      });
    }

    // Sync scroll toggle
    const syncScrollToggle = document.getElementById('sync-scroll-toggle');
    if (syncScrollToggle) {
      syncScrollToggle.checked = this.settings.syncScroll;
      syncScrollToggle.addEventListener('change', e => {
        this.settings.syncScroll = e.target.checked;
        this.saveSettings();
        if (this.preview) {
          this.preview.setScrollSync(e.target.checked);
        }
      });
    }

    // External parser toggle
    const externalParserToggle = document.getElementById('use-external-parser-toggle');
    if (externalParserToggle) {
      externalParserToggle.checked = this.settings.useExternalParser;
      externalParserToggle.addEventListener('change', e => {
        this.settings.useExternalParser = e.target.checked;
        this.saveSettings();
        if (this.preview) {
          this.preview.toggleParser(e.target.checked);
        }
      });
    }

    // Embed styles toggle
    const embedStylesToggle = document.getElementById('embed-styles-toggle');
    if (embedStylesToggle) {
      embedStylesToggle.checked = this.settings.embedStyles;
      embedStylesToggle.addEventListener('change', e => {
        this.settings.embedStyles = e.target.checked;
        this.saveSettings();
      });
    }

    // Preview zoom
    const previewZoom = document.getElementById('preview-zoom');
    const zoomValue = document.getElementById('zoom-value');
    if (previewZoom && zoomValue) {
      previewZoom.value = this.settings.previewZoom;
      zoomValue.textContent = `${this.settings.previewZoom}%`;

      previewZoom.addEventListener('input', e => {
        const zoom = parseInt(e.target.value);
        this.settings.previewZoom = zoom;
        zoomValue.textContent = `${zoom}%`;
        this.saveSettings();
        if (this.preview) {
          this.preview.updateZoom(zoom);
        }
      });
    }

    // Markdown highlight toggle
    const markdownHighlightToggle = document.getElementById('markdown-highlight-toggle');
    if (markdownHighlightToggle) {
      markdownHighlightToggle.checked = this.settings.markdownHighlight;
      markdownHighlightToggle.addEventListener('change', e => {
        const oldValue = this.settings.markdownHighlight;
        this.settings.markdownHighlight = e.target.checked;
        this.saveSettings();
        if (this.preview) {
          this.preview.toggleMarkdownHighlight(e.target.checked);
        }

        // Track setting change
        if (this.analytics) {
          this.analytics.trackSettingChange('markdownHighlight', oldValue, e.target.checked);
        }
      });
    }
  }

  // Setup analytics panel
  setupAnalyticsPanel() {
    const analyticsToggle = document.getElementById('analytics-toggle');

    if (analyticsToggle) {
      analyticsToggle.addEventListener('click', () => {
        this.analyticsPanel.show();
        if (this.analytics) {
          this.analytics.trackFunctionUsage('analytics_open');
        }
      });
    }
  }

  // Handle content changes
  handleContentChange(content) {
    // Track content changes for analytics
    if (this.analytics && this.lastContent !== content) {
      this.analytics.trackContentChange(this.lastContent, content);
      this.lastContent = content;
    }

    // Update character count
    const charCount = document.getElementById('char-count');
    if (charCount) {
      const count = content.length;
      charCount.textContent = `${count} символов`;
    }

    // Update preview
    if (this.preview) {
      this.preview.updatePreview(content);
    }

    // Trigger auto-save
    this.scheduleAutoSave();
  }

  // Handle editor scroll
  handleEditorScroll(scrollInfo) {
    // Sync scroll with preview if enabled
    if (this.preview && this.settings.syncScroll && scrollInfo) {
      this.preview.scrollToPosition(scrollInfo.percentage);
    }
  }

  // Schedule auto-save
  scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this.saveContent();
    }, 1000); // Auto-save after 1 second of inactivity
  }

  // Save content to localStorage
  saveContent() {
    if (this.editor) {
      const content = this.editor.getContent();
      this.storage.saveContent(content);
    }
  }

  // Load saved content
  loadSavedContent() {
    const savedContent = this.storage.loadContent();
    if (savedContent && this.editor) {
      this.editor.setContent(savedContent);
    } else if (this.editor) {
      // Load default content for demonstration
      const defaultContent = this.getDefaultContent();
      this.editor.setContent(defaultContent);
    }
  }

  // Get default content for demonstration
  getDefaultContent() {
    return `# Добро пожаловать в MarkMirror Mobile! 🚀

Это **мощный Markdown редактор** с двухпанельным интерфейсом.

## Основные возможности

### ✨ Форматирование текста
- **Жирный текст**
- *Курсивный текст*
- ~~Зачёркнутый текст~~
- \`Встроенный код\`

### 📝 Списки
1. Нумерованный список
2. Второй элемент
3. Третий элемент

- Маркированный список
- Другой элемент
  - Вложенный элемент

### ✅ Задачи
- [ ] Незавершённая задача
- [x] Завершённая задача
- [ ] Ещё одна задача

### 🔗 Ссылки и изображения
[Ссылка на GitHub](https://github.com)
![Пример изображения](https://via.placeholder.com/300x200)

### 📊 Таблицы
| Заголовок 1 | Заголовок 2 | Заголовок 3 |
|-------------|-------------|-------------|
| Ячейка 1    | Ячейка 2    | Ячейка 3    |
| Данные A    | Данные B    | Данные C    |

### 💻 Блоки кода
\`\`\`javascript
function hello() {
    console.log("Привет, мир!");
    return "MarkMirror работает!";
}

hello();
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\`

### 💬 Цитаты
> Это пример цитаты.
> Она может занимать несколько строк
> и отображается с отступом слева.

### 🎯 HTML элементы
<details>
<summary>Раскрывающийся блок</summary>
Это содержимое скрыто по умолчанию и раскрывается при клике.
</details>

<kbd>Ctrl</kbd> + <kbd>S</kbd> - сохранить
<kbd>Ctrl</kbd> + <kbd>O</kbd> - открыть файл

<mark>Выделенный текст</mark> привлекает внимание.

---

## 🛠️ Настройки

Используйте кнопку ⚙️ в правом верхнем углу для настройки:
- Автодополнение Markdown
- Синхронная прокрутка
- Переключение парсера
- Масштаб превью

## 📱 Мобильная поддержка

На мобильных устройствах используйте вкладки "Редактор" и "Превью" для переключения между панелями.

## 🎨 Темы

Нажмите 🌙/☀️ для переключения между светлой и тёмной темами.

---

**Начните редактирование этого текста, чтобы увидеть MarkMirror в действии!**

Попробуйте:
1. Включить синхронную прокрутку в настройках
2. Прокрутить этот текст и посмотреть на превью
3. Экспортировать в HTML или Markdown
4. Импортировать свой .md файл

## 📚 Дополнительные примеры

### Математические формулы (в виде кода)
\`\`\`
E = mc²
a² + b² = c²
∑(i=1 to n) i = n(n+1)/2
\`\`\`

### Диаграммы (текстовые)
\`\`\`
Процесс разработки:
Идея → Планирование → Разработка → Тестирование → Деплой
  ↓         ↓            ↓            ↓           ↓
Анализ → Дизайн → Код → Отладка → Релиз
\`\`\`

### Больше примеров списков

#### Список покупок
- [ ] Хлеб
- [ ] Молоко
- [x] Яйца
- [ ] Сыр
- [x] Масло
- [ ] Овощи
  - [ ] Помидоры
  - [ ] Огурцы
  - [ ] Лук

#### Приоритеты задач
1. **Высокий приоритет**
   - Исправить критические баги
   - Завершить основные функции
2. **Средний приоритет**
   - Улучшить UI/UX
   - Добавить тесты
3. **Низкий приоритет**
   - Оптимизация производительности
   - Документация

### Расширенные таблицы

| Функция | Статус | Приоритет | Исполнитель |
|---------|--------|-----------|-------------|
| Редактор | ✅ Готово | Высокий | Команда A |
| Превью | ✅ Готово | Высокий | Команда A |
| Темы | ✅ Готово | Средний | Команда B |
| Экспорт | ✅ Готово | Средний | Команда B |
| Тесты | 🔄 В работе | Низкий | Команда C |

### Цитаты и примеры

> "Простота — это высшая степень утончённости."
> — Леонардо да Винчи

> "Любой дурак может написать код, который поймёт компьютер.
> Хорошие программисты пишут код, который могут понять люди."
> — Мартин Фаулер

### Длинный блок кода для тестирования скролла

\`\`\`javascript
// Пример сложного JavaScript кода
class MarkdownEditor {
    constructor(options) {
        this.options = {
            theme: 'light',
            autoComplete: true,
            syncScroll: false,
            ...options
        };
        this.init();
    }

    init() {
        this.setupEditor();
        this.setupPreview();
        this.setupEventListeners();
    }

    setupEditor() {
        // Настройка редактора
        console.log('Setting up editor...');
    }

    setupPreview() {
        // Настройка превью
        console.log('Setting up preview...');
    }

    setupEventListeners() {
        // Настройка обработчиков событий
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.save();
            }
        });
    }

    save() {
        console.log('Saving content...');
    }

    export(format) {
        switch(format) {
            case 'md':
                return this.exportMarkdown();
            case 'html':
                return this.exportHTML();
            default:
                throw new Error('Unsupported format');
        }
    }
}
\`\`\`

### Ещё больше контента для скролла

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

### Финальная секция

Этот длинный документ создан специально для тестирования функции синхронной прокрутки. Если вы видите этот текст и можете прокручивать страницу, значит всё работает правильно!

**Проверьте:**
1. ✅ Есть ли скролл в превью панелях?
2. ✅ Работает ли синхронная прокрутка?
3. ✅ Обновляется ли превью при редактировании?

*Удачного использования MarkMirror Mobile!* ✨

---

*Конец документа. Если вы дошли до этого места, скролл точно работает!* 🎉`;
  }

  // Save settings
  saveSettings() {
    this.storage.saveSettings(this.settings);
  }

  // Setup auto-save
  setupAutoSave() {
    // Save content when page is about to unload
    window.addEventListener('beforeunload', () => {
      this.saveContent();
    });

    // Save content periodically
    setInterval(() => {
      this.saveContent();
    }, 30000); // Every 30 seconds
  }

  // Toggle theme
  toggleTheme() {
    const oldTheme = this.settings.theme;

    if (this.settings.theme === 'auto') {
      this.settings.theme = this.currentTheme === 'dark' ? 'light' : 'dark';
    } else {
      this.settings.theme = this.settings.theme === 'dark' ? 'light' : 'dark';
    }

    this.currentTheme = this.settings.theme;
    this.applyTheme(this.currentTheme);
    this.saveSettings();

    // Track theme change
    if (this.analytics) {
      this.analytics.trackThemeChange(oldTheme, this.settings.theme);
    }

    // Update editor theme
    if (this.editor) {
      this.editor.updateTheme(this.currentTheme);
    }
  }

  // Handle file import
  async handleFileImport(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;

      this.showLoading(true);

      const content = await this.fileHandler.readFileAsText(file);

      if (this.editor) {
        this.editor.setContent(content);
      }

      // Clear the file input
      event.target.value = '';

      this.showLoading(false);
      this.showMessage(`Файл "${file.name}" успешно импортирован`);

      // Track import
      if (this.analytics) {
        this.analytics.trackImport(true, file.size, file.name);
      }
    } catch (error) {
      console.error('Import failed:', error);
      this.showError('Ошибка при импорте файла');
      this.showLoading(false);

      // Track failed import
      if (this.analytics) {
        this.analytics.trackImport(false);
      }
    }
  }

  // Export as Markdown
  exportMarkdown() {
    if (!this.editor) return;

    const content = this.editor.getContent();
    const filename = `markmirror-${new Date().toISOString().split('T')[0]}.md`;

    try {
      this.fileHandler.exportMarkdown(content, filename);
      this.showMessage('Markdown файл экспортирован');

      // Track export
      if (this.analytics) {
        this.analytics.trackExport('md', true, content.length);
      }
    } catch (error) {
      this.showError('Ошибка при экспорте Markdown');
      if (this.analytics) {
        this.analytics.trackExport('md', false);
      }
    }
  }

  // Export as HTML
  exportHTML() {
    if (!this.preview) return;

    const htmlContent = this.preview.getHTMLContent();
    const filename = `markmirror-${new Date().toISOString().split('T')[0]}.html`;

    try {
      this.fileHandler.exportHTML(htmlContent, filename, this.settings.embedStyles);
      this.showMessage('HTML файл экспортирован');

      // Track export
      if (this.analytics) {
        this.analytics.trackExport('html', true, htmlContent.length);
      }
    } catch (error) {
      this.showError('Ошибка при экспорте HTML');
      if (this.analytics) {
        this.analytics.trackExport('html', false);
      }
    }
  }

  // Clear editor
  clearEditor() {
    if (confirm('Вы уверены, что хотите очистить редактор? Все несохранённые изменения будут потеряны.')) {
      if (this.editor) {
        this.editor.setContent('');
      }
      if (this.preview) {
        this.preview.clear();
      }
      this.storage.saveContent('');
      this.showMessage('Редактор очищен');
    }
  }

  // Show loading indicator
  showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
      if (show) {
        loading.classList.remove('hidden');
      } else {
        loading.classList.add('hidden');
      }
    }
  }

  // Show message
  showMessage(message, type = 'info') {
    // Simple message implementation
    // In a real app, you might want a toast notification system
    console.log(`${type.toUpperCase()}: ${message}`);

    // You could implement a toast notification here
    // For now, we'll just use a temporary alert-style message
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 1rem;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            z-index: 1000;
            max-width: 300px;
        `;

    document.body.appendChild(messageEl);

    setTimeout(() => {
      messageEl.remove();
    }, 3000);
  }

  // Show error message
  showError(message) {
    this.showMessage(message, 'error');
  }

  // Force scroll setup for debugging
  forceScrollSetup() {
    console.log('🔧 Force scroll setup...');

    if (this.preview) {
      // Re-setup scroll sync
      this.preview.setupScrollSync();

      // Force container configuration
      const plainTextContainer = document.getElementById('plain-text-output');
      const htmlContainer = document.getElementById('html-output');

      if (plainTextContainer && htmlContainer) {
        this.preview.ensureScrollableContainers(plainTextContainer, htmlContainer);
        console.log('✅ Scroll containers configured');
      } else {
        console.error('❌ Preview containers not found');
      }
    }

    // Log current settings
    console.log('Current settings:', {
      syncScroll: this.settings.syncScroll,
      previewZoom: this.settings.previewZoom,
    });
  }

  // Setup mobile tabs
  setupMobileTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const editorPanel = document.querySelector('.editor-panel');
    const previewPanel = document.querySelector('.preview-panel');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        // Update active tab
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show/hide panels
        if (tab === 'editor') {
          editorPanel?.classList.add('active');
          previewPanel?.classList.remove('active');
        } else if (tab === 'preview') {
          editorPanel?.classList.remove('active');
          previewPanel?.classList.add('active');
        }
      });
    });
  }

  // Setup help modal
  setupHelpModal() {
    const helpToggle = document.getElementById('help-toggle');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');
    const helpContent = document.getElementById('help-content');

    if (helpToggle && helpModal) {
      helpToggle.addEventListener('click', () => {
        helpModal.classList.remove('hidden');
        this.loadHelpContent(helpContent);
      });
    }

    if (closeHelp && helpModal) {
      closeHelp.addEventListener('click', () => {
        helpModal.classList.add('hidden');
      });
    }

    // Close modal when clicking outside
    if (helpModal) {
      helpModal.addEventListener('click', e => {
        if (e.target === helpModal) {
          helpModal.classList.add('hidden');
        }
      });
    }
  }

  // Load help content
  loadHelpContent(container) {
    if (!container) return;

    const helpMarkdown = `# Справка по Markdown

## Заголовки
\`\`\`
# Заголовок 1
## Заголовок 2
### Заголовок 3
\`\`\`

## Форматирование текста
\`\`\`
**Жирный текст**
*Курсивный текст*
~~Зачёркнутый текст~~
\`Код\`
\`\`\`

## Списки
\`\`\`
- Элемент списка
- Другой элемент
  - Вложенный элемент

1. Нумерованный список
2. Второй элемент

- [ ] Задача (не выполнена)
- [x] Задача (выполнена)
\`\`\`

## Ссылки и изображения
\`\`\`
[Текст ссылки](https://example.com)
![Альтернативный текст](image.jpg)
\`\`\`

## Таблицы
\`\`\`
| Заголовок 1 | Заголовок 2 |
|-------------|-------------|
| Ячейка 1    | Ячейка 2    |
\`\`\`

## Блоки кода
\`\`\`
\\\`\\\`\\\`javascript
function hello() {
    console.log("Hello, World!");
}
\\\`\\\`\\\`
\`\`\`

## Цитаты
\`\`\`
> Это цитата
> Продолжение цитаты
\`\`\`

## HTML элементы
\`\`\`
<details>
<summary>Раскрывающийся блок</summary>
Содержимое блока
</details>

<kbd>Ctrl</kbd> + <kbd>C</kbd>
<mark>Выделенный текст</mark>
\`\`\`

## 📊 Аналитика и статистика

MarkMirror отслеживает вашу работу с документами:

### Доступ к аналитике:
- Кнопка **📊** в правом верхнем углу
- Горячая клавиша **F2**

### Что отслеживается:
- ⏱️ Время работы с документом
- ✏️ Статистика редактирования (символы, слова)
- 🔥 Популярные функции
- 📝 Использование Markdown элементов
- 💾 Экспорт/импорт файлов

### Конфиденциальность:
- Все данные хранятся только в вашем браузере
- Никакая информация не передается на серверы
- Вы можете очистить данные в любое время

## ⌨️ Горячие клавиши

- **Ctrl/Cmd + S** - Сохранить
- **Ctrl/Cmd + O** - Импорт файла
- **Ctrl/Cmd + E** - Экспорт в Markdown
- **Ctrl/Cmd + Shift + E** - Экспорт в HTML
- **F1** - Справка
- **F2** - Аналитика
- **Esc** - Закрыть модальные окна

## 📱 Установка приложения (PWA)

MarkMirror можно установить как обычное приложение:

### Установка:
- Нажмите кнопку **📱 Установить приложение** в заголовке
- Или используйте меню браузера "Установить приложение"
- На мобильных: "Добавить на главный экран"

### Преимущества установки:
- 🚀 Быстрый запуск с рабочего стола
- 📱 Работа в полноэкранном режиме
- 💾 Офлайн доступ к функциям
- 🔔 Уведомления об обновлениях
- 📂 Ярлыки для быстрых действий

### Офлайн режим:
- Приложение работает без интернета
- Все функции редактирования доступны
- Автосохранение в локальном хранилище
- Синхронизация при восстановлении связи`;

    // Parse and display help content
    if (this.preview) {
      const tempContainer = document.createElement('div');
      tempContainer.className = 'markdown-body';

      // Use the same parser as preview
      const html =
        this.preview.options.useExternalParser && typeof marked !== 'undefined' ? marked.parse(helpMarkdown) : this.preview.parser.parse(helpMarkdown);

      tempContainer.innerHTML = html;
      container.innerHTML = '';
      container.appendChild(tempContainer);
    }
  }

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Ctrl/Cmd + S: Save (prevent default and trigger auto-save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveContent();
        this.showMessage('Содержимое сохранено');
      }

      // Ctrl/Cmd + O: Import file
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        const importFile = document.getElementById('import-file');
        if (importFile) {
          importFile.click();
        }
      }

      // Ctrl/Cmd + E: Export Markdown
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        this.exportMarkdown();
      }

      // Ctrl/Cmd + Shift + E: Export HTML
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.exportHTML();
      }

      // F1: Help
      if (e.key === 'F1') {
        e.preventDefault();
        const helpToggle = document.getElementById('help-toggle');
        if (helpToggle) {
          helpToggle.click();
        }
      }

      // F2: Analytics
      if (e.key === 'F2') {
        e.preventDefault();
        this.analyticsPanel.show();
        if (this.analytics) {
          this.analytics.trackFunctionUsage('analytics_hotkey');
        }
      }

      // Escape: Close modals/panels
      if (e.key === 'Escape') {
        const helpModal = document.getElementById('help-modal');
        const settingsPanel = document.getElementById('settings-panel');

        if (helpModal && !helpModal.classList.contains('hidden')) {
          helpModal.classList.add('hidden');
        } else if (settingsPanel && !settingsPanel.classList.contains('hidden')) {
          settingsPanel.classList.add('hidden');
        }
      }
    });
  }
}

// Initialize the application when the script loads
window.MarkMirrorApp = MarkMirrorApp;
const app = new MarkMirrorApp();

// Make app globally available for debugging
window.app = app;
