// Analytics Panel UI for MarkMirror Mobile
// Displays usage statistics and metrics

export class AnalyticsPanel {
    constructor(analytics) {
        this.analytics = analytics;
        this.isVisible = false;
        this.updateInterval = null;
    }

    // Create analytics panel HTML
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'analytics-panel';
        panel.className = 'analytics-panel hidden';
        
        panel.innerHTML = `
            <div class="analytics-content">
                <div class="analytics-header">
                    <h3>📊 Аналитика использования</h3>
                    <div class="analytics-controls">
                        <button id="refresh-analytics" class="btn btn-small" title="Обновить данные">🔄</button>
                        <button id="export-analytics" class="btn btn-small" title="Экспорт статистики">📤</button>
                        <button id="clear-analytics" class="btn btn-small btn-danger" title="Очистить данные">🗑️</button>
                        <button id="close-analytics" class="btn btn-icon">✕</button>
                    </div>
                </div>
                
                <div class="analytics-body">
                    <div class="analytics-grid">
                        <!-- Session Info -->
                        <div class="analytics-card">
                            <h4>🕒 Текущая сессия</h4>
                            <div id="session-stats" class="stats-content"></div>
                        </div>
                        
                        <!-- Editing Stats -->
                        <div class="analytics-card">
                            <h4>✏️ Редактирование</h4>
                            <div id="editing-stats" class="stats-content"></div>
                        </div>
                        
                        <!-- Popular Functions -->
                        <div class="analytics-card">
                            <h4>🔥 Популярные функции</h4>
                            <div id="functions-stats" class="stats-content"></div>
                        </div>
                        
                        <!-- Markdown Usage -->
                        <div class="analytics-card">
                            <h4>📝 Использование Markdown</h4>
                            <div id="markdown-stats" class="stats-content"></div>
                        </div>
                        
                        <!-- Export/Import -->
                        <div class="analytics-card">
                            <h4>💾 Экспорт/Импорт</h4>
                            <div id="export-stats" class="stats-content"></div>
                        </div>
                        
                        <!-- Real-time Chart -->
                        <div class="analytics-card full-width">
                            <h4>📈 Активность в реальном времени</h4>
                            <div id="activity-chart" class="chart-container"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return panel;
    }

    // Show analytics panel
    show() {
        if (!document.getElementById('analytics-panel')) {
            const panel = this.createPanel();
            document.body.appendChild(panel);
            this.setupEventListeners();
        }
        
        const panel = document.getElementById('analytics-panel');
        panel.classList.remove('hidden');
        this.isVisible = true;
        
        this.updateDisplay();
        this.startAutoUpdate();
    }

    // Hide analytics panel
    hide() {
        const panel = document.getElementById('analytics-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
        this.isVisible = false;
        this.stopAutoUpdate();
    }

    // Setup event listeners
    setupEventListeners() {
        const panel = document.getElementById('analytics-panel');
        
        // Close button
        panel.querySelector('#close-analytics').addEventListener('click', () => {
            this.hide();
        });
        
        // Refresh button
        panel.querySelector('#refresh-analytics').addEventListener('click', () => {
            this.updateDisplay();
            this.analytics.trackFunctionUsage('analytics_refresh');
        });
        
        // Export button
        panel.querySelector('#export-analytics').addEventListener('click', () => {
            this.exportAnalytics();
            this.analytics.trackFunctionUsage('analytics_export');
        });
        
        // Clear button
        panel.querySelector('#clear-analytics').addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите очистить все данные аналитики?')) {
                this.analytics.clearData();
                this.updateDisplay();
                this.analytics.trackFunctionUsage('analytics_clear');
            }
        });
        
        // Close on outside click
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                this.hide();
            }
        });
    }

    // Update display with current data
    updateDisplay() {
        const report = this.analytics.generateReport();
        
        this.updateSessionStats(report.session);
        this.updateEditingStats(report.editing);
        this.updateFunctionsStats(report.usage.popularFunctions);
        this.updateMarkdownStats(report.usage.markdownUsage);
        this.updateExportStats(report.usage);
        this.updateActivityChart();
    }

    // Update session statistics
    updateSessionStats(session) {
        const container = document.getElementById('session-stats');
        if (!container) return;
        
        container.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Длительность:</span>
                <span class="stat-value">${session.duration}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Активное время:</span>
                <span class="stat-value">${session.activeTime}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Активность:</span>
                <span class="stat-value">${session.activePercentage}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">События:</span>
                <span class="stat-value">${session.eventsCount}</span>
            </div>
        `;
    }

    // Update editing statistics
    updateEditingStats(editing) {
        const container = document.getElementById('editing-stats');
        if (!container) return;
        
        container.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Набрано символов:</span>
                <span class="stat-value">${editing.charactersTyped.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Удалено символов:</span>
                <span class="stat-value">${editing.charactersDeleted.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Итого символов:</span>
                <span class="stat-value">${editing.netCharacters.toLocaleString()}</span>
            </div>
        `;
    }

    // Update functions statistics
    updateFunctionsStats(functions) {
        const container = document.getElementById('functions-stats');
        if (!container) return;
        
        if (functions.length === 0) {
            container.innerHTML = '<div class="no-data">Нет данных</div>';
            return;
        }
        
        const maxCount = Math.max(...functions.map(f => f.count));
        
        container.innerHTML = functions.map(func => `
            <div class="function-item">
                <div class="function-info">
                    <span class="function-name">${this.formatFunctionName(func.name)}</span>
                    <span class="function-count">${func.count}</span>
                </div>
                <div class="function-bar">
                    <div class="function-progress" style="width: ${(func.count / maxCount) * 100}%"></div>
                </div>
            </div>
        `).join('');
    }

    // Update Markdown statistics
    updateMarkdownStats(markdownUsage) {
        const container = document.getElementById('markdown-stats');
        if (!container) return;
        
        if (markdownUsage.length === 0) {
            container.innerHTML = '<div class="no-data">Нет данных</div>';
            return;
        }
        
        container.innerHTML = markdownUsage.map(item => `
            <div class="markdown-item">
                <div class="markdown-info">
                    <span class="markdown-name">${this.formatMarkdownElement(item.element)}</span>
                    <span class="markdown-count">${item.count}</span>
                </div>
                <div class="markdown-percentage">${Math.round(item.percentage)}%</div>
            </div>
        `).join('');
    }

    // Update export/import statistics
    updateExportStats(usage) {
        const container = document.getElementById('export-stats');
        if (!container) return;
        
        container.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Экспорт .md:</span>
                <span class="stat-value">${usage.exports.md || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Экспорт .html:</span>
                <span class="stat-value">${usage.exports.html || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Импорт файлов:</span>
                <span class="stat-value">${usage.imports || 0}</span>
            </div>
        `;
    }

    // Update activity chart (simple text-based chart)
    updateActivityChart() {
        const container = document.getElementById('activity-chart');
        if (!container) return;
        
        const events = this.analytics.events.slice(-20); // Last 20 events
        
        if (events.length === 0) {
            container.innerHTML = '<div class="no-data">Нет данных активности</div>';
            return;
        }
        
        container.innerHTML = `
            <div class="activity-timeline">
                ${events.map(event => `
                    <div class="activity-event" title="${event.type}">
                        <div class="event-time">${new Date(event.timestamp).toLocaleTimeString()}</div>
                        <div class="event-type">${this.formatEventType(event.type)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Format function names for display
    formatFunctionName(name) {
        const names = {
            'export_md': '📄 Экспорт MD',
            'export_html': '🌐 Экспорт HTML',
            'import': '📁 Импорт',
            'theme_change': '🎨 Смена темы',
            'settings_change': '⚙️ Настройки',
            'analytics_refresh': '🔄 Обновление аналитики',
            'analytics_export': '📤 Экспорт аналитики',
            'analytics_clear': '🗑️ Очистка аналитики'
        };
        return names[name] || name;
    }

    // Format Markdown element names
    formatMarkdownElement(element) {
        const names = {
            'headers': '📋 Заголовки',
            'bold': '🔤 Жирный текст',
            'italic': '📝 Курсив',
            'code_inline': '💻 Inline код',
            'code_blocks': '📦 Блоки кода',
            'links': '🔗 Ссылки',
            'images': '🖼️ Изображения',
            'lists': '📋 Списки',
            'ordered_lists': '🔢 Нумерованные списки',
            'tasks': '✅ Задачи',
            'tables': '📊 Таблицы',
            'blockquotes': '💬 Цитаты',
            'horizontal_rules': '➖ Разделители'
        };
        return names[element] || element;
    }

    // Format event types
    formatEventType(type) {
        const types = {
            'session_start': '🚀 Старт',
            'content_changed': '✏️ Редактирование',
            'function_used': '🔧 Функция',
            'export': '📤 Экспорт',
            'import': '📥 Импорт',
            'theme_changed': '🎨 Тема',
            'setting_changed': '⚙️ Настройка',
            'user_inactive': '😴 Неактивен',
            'user_active': '⚡ Активен'
        };
        return types[type] || type;
    }

    // Export analytics data
    exportAnalytics() {
        const report = this.analytics.generateReport();
        const data = {
            report,
            rawStats: this.analytics.getSessionStats(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `markmirror-analytics-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    // Start auto-update
    startAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            if (this.isVisible) {
                this.updateDisplay();
            }
        }, 5000); // Update every 5 seconds
    }

    // Stop auto-update
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Destroy panel
    destroy() {
        this.stopAutoUpdate();
        const panel = document.getElementById('analytics-panel');
        if (panel) {
            panel.remove();
        }
    }
}
