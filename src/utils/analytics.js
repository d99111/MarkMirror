// Analytics and Usage Tracking for MarkMirror Mobile
// Tracks user behavior and document statistics

export class Analytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.events = [];
        this.documentStats = {
            totalEditTime: 0,
            charactersTyped: 0,
            charactersDeleted: 0,
            functionsUsed: {},
            markdownElements: {},
            exportCount: { md: 0, html: 0 },
            importCount: 0,
            themeChanges: 0,
            settingsChanges: 0
        };
        
        this.lastActivityTime = Date.now();
        this.isActive = true;
        this.activityTimer = null;
        
        this.init();
    }

    // Initialize analytics
    init() {
        this.trackEvent('session_start', { sessionId: this.sessionId });
        this.setupActivityTracking();
        this.loadPreviousStats();
        
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('session_pause');
                this.isActive = false;
            } else {
                this.trackEvent('session_resume');
                this.isActive = true;
                this.lastActivityTime = Date.now();
            }
        });

        // Track before unload
        window.addEventListener('beforeunload', () => {
            this.trackEvent('session_end', {
                duration: Date.now() - this.startTime,
                totalEvents: this.events.length
            });
            this.saveStats();
        });
    }

    // Generate unique session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Setup activity tracking
    setupActivityTracking() {
        const updateActivity = () => {
            this.lastActivityTime = Date.now();
            if (!this.isActive) {
                this.isActive = true;
                this.trackEvent('user_active');
            }
        };

        // Track user interactions
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });

        // Check for inactivity every 30 seconds
        this.activityTimer = setInterval(() => {
            const inactiveTime = Date.now() - this.lastActivityTime;
            if (inactiveTime > 30000 && this.isActive) { // 30 seconds
                this.isActive = false;
                this.trackEvent('user_inactive', { inactiveTime });
            }
        }, 30000);
    }

    // Track generic event
    trackEvent(eventType, data = {}) {
        const event = {
            type: eventType,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            data
        };
        
        this.events.push(event);
        console.log('📊 Analytics:', eventType, data);
        
        // Keep only last 1000 events to prevent memory issues
        if (this.events.length > 1000) {
            this.events = this.events.slice(-1000);
        }
    }

    // Track function usage
    trackFunctionUsage(functionName, details = {}) {
        this.documentStats.functionsUsed[functionName] = 
            (this.documentStats.functionsUsed[functionName] || 0) + 1;
        
        this.trackEvent('function_used', {
            function: functionName,
            count: this.documentStats.functionsUsed[functionName],
            ...details
        });
    }

    // Track content changes
    trackContentChange(oldContent, newContent) {
        const oldLength = oldContent.length;
        const newLength = newContent.length;
        const diff = newLength - oldLength;
        
        if (diff > 0) {
            this.documentStats.charactersTyped += diff;
        } else if (diff < 0) {
            this.documentStats.charactersDeleted += Math.abs(diff);
        }
        
        // Analyze Markdown elements
        this.analyzeMarkdownElements(newContent);
        
        this.trackEvent('content_changed', {
            oldLength,
            newLength,
            diff,
            totalTyped: this.documentStats.charactersTyped,
            totalDeleted: this.documentStats.charactersDeleted
        });
    }

    // Analyze Markdown elements in content
    analyzeMarkdownElements(content) {
        const elements = {
            headers: (content.match(/^#{1,6}\s/gm) || []).length,
            bold: (content.match(/\*\*.*?\*\*/g) || []).length,
            italic: (content.match(/\*.*?\*/g) || []).length,
            code_inline: (content.match(/`[^`]+`/g) || []).length,
            code_blocks: (content.match(/```[\s\S]*?```/g) || []).length,
            links: (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length,
            images: (content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || []).length,
            lists: (content.match(/^\s*[-*+]\s/gm) || []).length,
            ordered_lists: (content.match(/^\s*\d+\.\s/gm) || []).length,
            tasks: (content.match(/^\s*[-*+]\s+\[[ x]\]\s/gm) || []).length,
            tables: (content.match(/\|.*\|/g) || []).length,
            blockquotes: (content.match(/^\s*>\s/gm) || []).length,
            horizontal_rules: (content.match(/^[-*_]{3,}$/gm) || []).length
        };
        
        // Update stats
        Object.keys(elements).forEach(element => {
            this.documentStats.markdownElements[element] = elements[element];
        });
    }

    // Track export operations
    trackExport(format, success = true, fileSize = 0) {
        if (success) {
            this.documentStats.exportCount[format] = 
                (this.documentStats.exportCount[format] || 0) + 1;
        }
        
        this.trackEvent('export', {
            format,
            success,
            fileSize,
            totalExports: Object.values(this.documentStats.exportCount).reduce((a, b) => a + b, 0)
        });
        
        this.trackFunctionUsage(`export_${format}`);
    }

    // Track import operations
    trackImport(success = true, fileSize = 0, fileName = '') {
        if (success) {
            this.documentStats.importCount++;
        }
        
        this.trackEvent('import', {
            success,
            fileSize,
            fileName,
            totalImports: this.documentStats.importCount
        });
        
        this.trackFunctionUsage('import');
    }

    // Track theme changes
    trackThemeChange(oldTheme, newTheme) {
        this.documentStats.themeChanges++;
        
        this.trackEvent('theme_changed', {
            oldTheme,
            newTheme,
            totalChanges: this.documentStats.themeChanges
        });
        
        this.trackFunctionUsage('theme_change');
    }

    // Track settings changes
    trackSettingChange(setting, oldValue, newValue) {
        this.documentStats.settingsChanges++;
        
        this.trackEvent('setting_changed', {
            setting,
            oldValue,
            newValue,
            totalChanges: this.documentStats.settingsChanges
        });
        
        this.trackFunctionUsage('settings_change');
    }

    // Get session statistics
    getSessionStats() {
        const sessionDuration = Date.now() - this.startTime;
        const activeTime = this.calculateActiveTime();
        
        return {
            sessionId: this.sessionId,
            duration: sessionDuration,
            activeTime,
            activePercentage: (activeTime / sessionDuration) * 100,
            eventsCount: this.events.length,
            ...this.documentStats
        };
    }

    // Calculate active time (excluding inactive periods)
    calculateActiveTime() {
        let activeTime = 0;
        let lastActiveTime = this.startTime;
        
        this.events.forEach(event => {
            if (event.type === 'user_inactive') {
                activeTime += event.timestamp - lastActiveTime;
            } else if (event.type === 'user_active') {
                lastActiveTime = event.timestamp;
            }
        });
        
        // Add current active period if user is still active
        if (this.isActive) {
            activeTime += Date.now() - lastActiveTime;
        }
        
        return activeTime;
    }

    // Get popular functions
    getPopularFunctions() {
        const functions = Object.entries(this.documentStats.functionsUsed)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        return functions.map(([name, count]) => ({ name, count }));
    }

    // Get Markdown usage statistics
    getMarkdownUsage() {
        const total = Object.values(this.documentStats.markdownElements)
            .reduce((sum, count) => sum + count, 0);
        
        return Object.entries(this.documentStats.markdownElements)
            .map(([element, count]) => ({
                element,
                count,
                percentage: total > 0 ? (count / total) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);
    }

    // Save statistics to localStorage
    saveStats() {
        try {
            const stats = {
                documentStats: this.documentStats,
                lastSession: this.getSessionStats(),
                savedAt: Date.now()
            };
            localStorage.setItem('markmirror-analytics', JSON.stringify(stats));
        } catch (error) {
            console.warn('Failed to save analytics:', error);
        }
    }

    // Load previous statistics
    loadPreviousStats() {
        try {
            const saved = localStorage.getItem('markmirror-analytics');
            if (saved) {
                const data = JSON.parse(saved);
                // Merge with current stats (accumulate over sessions)
                Object.keys(data.documentStats).forEach(key => {
                    if (typeof data.documentStats[key] === 'object') {
                        this.documentStats[key] = { ...data.documentStats[key] };
                    } else {
                        this.documentStats[key] = data.documentStats[key] || 0;
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to load previous analytics:', error);
        }
    }

    // Generate analytics report
    generateReport() {
        const stats = this.getSessionStats();
        const popularFunctions = this.getPopularFunctions();
        const markdownUsage = this.getMarkdownUsage();
        
        return {
            session: {
                duration: this.formatDuration(stats.duration),
                activeTime: this.formatDuration(stats.activeTime),
                activePercentage: Math.round(stats.activePercentage),
                eventsCount: stats.eventsCount
            },
            editing: {
                charactersTyped: stats.charactersTyped,
                charactersDeleted: stats.charactersDeleted,
                netCharacters: stats.charactersTyped - stats.charactersDeleted
            },
            usage: {
                popularFunctions,
                markdownUsage: markdownUsage.slice(0, 5),
                exports: stats.exportCount,
                imports: stats.importCount
            },
            interactions: {
                themeChanges: stats.themeChanges,
                settingsChanges: stats.settingsChanges
            }
        };
    }

    // Format duration in human readable format
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}ч ${minutes % 60}м`;
        } else if (minutes > 0) {
            return `${minutes}м ${seconds % 60}с`;
        } else {
            return `${seconds}с`;
        }
    }

    // Clear all analytics data
    clearData() {
        this.events = [];
        this.documentStats = {
            totalEditTime: 0,
            charactersTyped: 0,
            charactersDeleted: 0,
            functionsUsed: {},
            markdownElements: {},
            exportCount: { md: 0, html: 0 },
            importCount: 0,
            themeChanges: 0,
            settingsChanges: 0
        };
        
        localStorage.removeItem('markmirror-analytics');
        this.trackEvent('analytics_cleared');
    }

    // Destroy analytics (cleanup)
    destroy() {
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
        }
        this.saveStats();
    }
}
