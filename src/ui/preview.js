// Preview panel for MarkMirror Mobile
// Handles plain text and HTML preview with synchronized scrolling

import { MarkdownParser } from '../utils/markdownParser.js';

export class PreviewPanel {
    constructor(options = {}) {
        this.options = {
            plainTextContainer: null,
            htmlContainer: null,
            syncScroll: false,
            zoom: 100,
            useExternalParser: false,
            showMarkdownHighlight: true, // New option for Markdown highlighting
            ...options
        };
        
        this.parser = new MarkdownParser();
        this.lastContent = '';
        this.scrollSyncEnabled = this.options.syncScroll;
        this.isScrolling = false;
        
        this.init();
    }

    // Initialize the preview panel
    init() {
        this.setupScrollSync();
        this.updateZoom();
    }

    // Update preview content
    updatePreview(markdownContent) {
        if (markdownContent === this.lastContent) {
            return; // No change, skip update
        }

        this.lastContent = markdownContent;

        // Update plain text preview
        this.updatePlainText(markdownContent);

        // Update HTML preview
        this.updateHTML(markdownContent);

        // Debug: Check if containers have content and can scroll
        this.debugScrollContainers();
    }

    // Update plain text preview
    updatePlainText(content) {
        if (!this.options.plainTextContainer) return;

        // Add statistics header
        const stats = this.getContentStats(content);
        const statsHeader = this.createStatsHeader(stats);

        // Create content with optional enhancements
        const enhancedContent = this.enhancePlainText(content);

        // Update container
        this.options.plainTextContainer.innerHTML = '';
        this.options.plainTextContainer.appendChild(statsHeader);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'plain-text-content';
        contentDiv.style.cssText = `
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: var(--font-family-mono);
            line-height: 1.6;
            padding-top: 0.5rem;
        `;

        if (this.options.showMarkdownHighlight) {
            contentDiv.innerHTML = enhancedContent;
        } else {
            contentDiv.textContent = content;
        }

        this.options.plainTextContainer.appendChild(contentDiv);
    }

    // Get content statistics
    getContentStats(content) {
        const lines = content.split('\n');
        const words = content.trim() ? content.trim().split(/\s+/) : [];
        const characters = content.length;
        const charactersNoSpaces = content.replace(/\s/g, '').length;

        // Count Markdown elements
        const headers = (content.match(/^#{1,6}\s/gm) || []).length;
        const links = (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;
        const images = (content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || []).length;
        const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
        const inlineCode = (content.match(/`[^`]+`/g) || []).length;
        const lists = (content.match(/^\s*[-*+]\s/gm) || []).length;
        const tasks = (content.match(/^\s*[-*+]\s+\[[ x]\]\s/gm) || []).length;

        return {
            lines: lines.length,
            words: words.length,
            characters,
            charactersNoSpaces,
            headers,
            links,
            images,
            codeBlocks,
            inlineCode,
            lists,
            tasks
        };
    }

    // Create statistics header
    createStatsHeader(stats) {
        const header = document.createElement('div');
        header.className = 'plain-text-stats';
        header.style.cssText = `
            background: var(--bg-tertiary);
            padding: 0.5rem;
            margin: -1rem -1rem 0 -1rem;
            border-bottom: 1px solid var(--border-light);
            font-size: 0.75rem;
            color: var(--text-muted);
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 0.5rem;
        `;

        const statsItems = [
            `📝 ${stats.lines} строк`,
            `🔤 ${stats.words} слов`,
            `📊 ${stats.characters} символов`,
            stats.headers > 0 ? `📋 ${stats.headers} заголовков` : null,
            stats.links > 0 ? `🔗 ${stats.links} ссылок` : null,
            stats.images > 0 ? `🖼️ ${stats.images} изображений` : null,
            stats.codeBlocks > 0 ? `💻 ${stats.codeBlocks} блоков кода` : null,
            stats.lists > 0 ? `📋 ${stats.lists} элементов списка` : null,
            stats.tasks > 0 ? `✅ ${stats.tasks} задач` : null
        ].filter(Boolean);

        header.innerHTML = statsItems.map(item => `<span>${item}</span>`).join('');

        return header;
    }

    // Enhance plain text with subtle Markdown highlighting
    enhancePlainText(content) {
        if (!this.options.showMarkdownHighlight) {
            return content;
        }

        let enhanced = content;

        // Highlight headers
        enhanced = enhanced.replace(/^(#{1,6})\s(.+)$/gm,
            '<span style="color: var(--accent-color); font-weight: bold;">$1</span> <span style="font-weight: bold;">$2</span>');

        // Highlight bold/italic markers
        enhanced = enhanced.replace(/(\*\*|__)(.*?)\1/g,
            '<span style="color: var(--accent-color);">$1</span><strong>$2</strong><span style="color: var(--accent-color);">$1</span>');
        enhanced = enhanced.replace(/(\*|_)(.*?)\1/g,
            '<span style="color: var(--accent-color);">$1</span><em>$2</em><span style="color: var(--accent-color);">$1</span>');

        // Highlight code
        enhanced = enhanced.replace(/(`)(.*?)\1/g,
            '<span style="color: var(--accent-color);">$1</span><code style="background: var(--bg-tertiary); padding: 0.1em 0.3em;">$2</code><span style="color: var(--accent-color);">$1</span>');

        // Highlight links
        enhanced = enhanced.replace(/(\[)(.*?)(\])(\()(.*?)(\))/g,
            '<span style="color: var(--accent-color);">$1</span>$2<span style="color: var(--accent-color);">$3$4</span><span style="color: var(--text-muted);">$5</span><span style="color: var(--accent-color);">$6</span>');

        // Highlight list markers
        enhanced = enhanced.replace(/^(\s*)([-*+])(\s)/gm,
            '$1<span style="color: var(--accent-color); font-weight: bold;">$2</span>$3');

        // Highlight task list markers
        enhanced = enhanced.replace(/^(\s*)([-*+])(\s+)(\[[ x]\])(\s)/gm,
            '$1<span style="color: var(--accent-color); font-weight: bold;">$2</span>$3<span style="color: var(--success-color); font-weight: bold;">$4</span>$5');

        return enhanced;
    }

    // Update HTML preview
    updateHTML(content) {
        if (!this.options.htmlContainer) return;
        
        let html = '';
        
        if (this.options.useExternalParser && typeof marked !== 'undefined') {
            // Use external parser (Marked.js)
            html = marked.parse(content);
        } else {
            // Use custom parser
            html = this.parser.parse(content);
        }
        
        // Sanitize HTML if DOMPurify is available
        if (typeof DOMPurify !== 'undefined') {
            html = DOMPurify.sanitize(html);
        }
        
        this.options.htmlContainer.innerHTML = html;
        
        // Highlight code blocks if highlight.js is available
        if (typeof hljs !== 'undefined') {
            this.options.htmlContainer.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
    }

    // Setup scroll synchronization
    setupScrollSync() {
        if (!this.options.plainTextContainer || !this.options.htmlContainer) {
            console.warn('Preview containers not found for scroll sync');
            return;
        }

        const plainTextEl = this.options.plainTextContainer;
        const htmlEl = this.options.htmlContainer;

        // Ensure containers have proper scrolling styles
        this.ensureScrollableContainers(plainTextEl, htmlEl);

        // Remove existing listeners to prevent duplicates
        if (this.plainTextScrollHandler) {
            plainTextEl.removeEventListener('scroll', this.plainTextScrollHandler);
        }
        if (this.htmlScrollHandler) {
            htmlEl.removeEventListener('scroll', this.htmlScrollHandler);
        }

        // Create scroll handlers
        this.plainTextScrollHandler = () => {
            if (!this.scrollSyncEnabled || this.isScrolling) return;

            this.isScrolling = true;
            const scrollPercentage = this.getScrollPercentage(plainTextEl);
            this.setScrollPercentage(htmlEl, scrollPercentage);

            setTimeout(() => {
                this.isScrolling = false;
            }, 100);
        };

        this.htmlScrollHandler = () => {
            if (!this.scrollSyncEnabled || this.isScrolling) return;

            this.isScrolling = true;
            const scrollPercentage = this.getScrollPercentage(htmlEl);
            this.setScrollPercentage(plainTextEl, scrollPercentage);

            setTimeout(() => {
                this.isScrolling = false;
            }, 100);
        };

        // Add scroll listeners
        plainTextEl.addEventListener('scroll', this.plainTextScrollHandler);
        htmlEl.addEventListener('scroll', this.htmlScrollHandler);

        console.log('Scroll sync setup completed');
    }

    // Ensure containers are properly configured for scrolling
    ensureScrollableContainers(plainTextEl, htmlEl) {
        // Make sure containers have proper height and overflow
        [plainTextEl, htmlEl].forEach((el, index) => {
            const computedStyle = window.getComputedStyle(el);
            const containerName = index === 0 ? 'plainText' : 'html';

            console.log(`Configuring ${containerName} container:`, {
                currentHeight: computedStyle.height,
                currentOverflow: computedStyle.overflowY,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight
            });

            // Force proper styling for scrolling
            el.style.height = 'auto'; // Fixed height to ensure scrolling
            el.style.maxHeight = 'auto';
            el.style.minHeight = '249px';
            el.style.overflowY = 'auto';
            el.style.overflowX = 'hidden';

            // Add visual border for debugging
            el.style.border = '1px solid #ccc';

            console.log(`${containerName} container configured. New scroll info:`, {
                height: el.style.height,
                overflow: el.style.overflowY,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
                canScroll: el.scrollHeight > el.clientHeight
            });
        });
    }

    // Get scroll percentage of an element
    getScrollPercentage(element) {
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;
        
        if (scrollHeight <= clientHeight) {
            return 0;
        }
        
        return scrollTop / (scrollHeight - clientHeight);
    }

    // Set scroll percentage of an element
    setScrollPercentage(element, percentage) {
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        
        element.scrollTop = maxScroll * percentage;
    }

    // Enable/disable scroll synchronization
    setScrollSync(enabled) {
        this.scrollSyncEnabled = enabled;
        this.options.syncScroll = enabled;
    }

    // Update zoom level
    updateZoom(zoom = this.options.zoom) {
        this.options.zoom = zoom;
        
        if (this.options.htmlContainer) {
            this.options.htmlContainer.style.fontSize = `${zoom}%`;
        }
        
        if (this.options.plainTextContainer) {
            this.options.plainTextContainer.style.fontSize = `${zoom}%`;
        }
    }

    // Toggle parser (custom vs external)
    toggleParser(useExternal) {
        this.options.useExternalParser = useExternal;

        // Re-render with new parser
        if (this.lastContent) {
            this.updateHTML(this.lastContent);
        }
    }

    // Toggle Markdown highlighting in plain text
    toggleMarkdownHighlight(enabled) {
        this.options.showMarkdownHighlight = enabled;

        // Re-render plain text with new highlighting
        if (this.lastContent) {
            this.updatePlainText(this.lastContent);
        }
    }

    // Scroll to top
    scrollToTop() {
        if (this.options.plainTextContainer) {
            this.options.plainTextContainer.scrollTop = 0;
        }
        if (this.options.htmlContainer) {
            this.options.htmlContainer.scrollTop = 0;
        }
    }

    // Scroll to bottom
    scrollToBottom() {
        if (this.options.plainTextContainer) {
            const el = this.options.plainTextContainer;
            el.scrollTop = el.scrollHeight - el.clientHeight;
        }
        if (this.options.htmlContainer) {
            const el = this.options.htmlContainer;
            el.scrollTop = el.scrollHeight - el.clientHeight;
        }
    }

    // Scroll to specific position (0-1)
    scrollToPosition(position) {
        if (this.options.plainTextContainer) {
            this.setScrollPercentage(this.options.plainTextContainer, position);
        }
        if (this.options.htmlContainer) {
            this.setScrollPercentage(this.options.htmlContainer, position);
        }
    }

    // Get current scroll position
    getScrollPosition() {
        if (this.options.htmlContainer) {
            return this.getScrollPercentage(this.options.htmlContainer);
        }
        return 0;
    }

    // Clear preview content
    clear() {
        this.lastContent = '';
        
        if (this.options.plainTextContainer) {
            this.options.plainTextContainer.textContent = '';
        }
        
        if (this.options.htmlContainer) {
            this.options.htmlContainer.innerHTML = '';
        }
    }

    // Get preview statistics
    getStats() {
        const content = this.lastContent;
        
        return {
            characters: content.length,
            charactersNoSpaces: content.replace(/\s/g, '').length,
            words: content.trim() ? content.trim().split(/\s+/).length : 0,
            lines: content.split('\n').length,
            paragraphs: content.split(/\n\s*\n/).filter(p => p.trim()).length
        };
    }

    // Export HTML content
    getHTMLContent() {
        return this.options.htmlContainer ? this.options.htmlContainer.innerHTML : '';
    }

    // Export plain text content
    getPlainTextContent() {
        return this.lastContent;
    }

    // Update containers
    updateContainers(plainTextContainer, htmlContainer) {
        this.options.plainTextContainer = plainTextContainer;
        this.options.htmlContainer = htmlContainer;
        this.setupScrollSync();
        
        // Re-render current content
        if (this.lastContent) {
            this.updatePreview(this.lastContent);
        }
    }

    // Debug scroll containers
    debugScrollContainers() {
        if (!this.options.plainTextContainer || !this.options.htmlContainer) {
            return;
        }

        const plainTextEl = this.options.plainTextContainer;
        const htmlEl = this.options.htmlContainer;

        const plainTextInfo = {
            scrollHeight: plainTextEl.scrollHeight,
            clientHeight: plainTextEl.clientHeight,
            canScroll: plainTextEl.scrollHeight > plainTextEl.clientHeight,
            overflowY: window.getComputedStyle(plainTextEl).overflowY
        };

        const htmlInfo = {
            scrollHeight: htmlEl.scrollHeight,
            clientHeight: htmlEl.clientHeight,
            canScroll: htmlEl.scrollHeight > htmlEl.clientHeight,
            overflowY: window.getComputedStyle(htmlEl).overflowY
        };

        console.log('Preview scroll debug:', {
            plainText: plainTextInfo,
            html: htmlInfo,
            syncEnabled: this.scrollSyncEnabled
        });

        // Force scroll visibility if content is long enough
        if (plainTextInfo.scrollHeight > plainTextInfo.clientHeight) {
            plainTextEl.style.overflowY = 'auto';
        }
        if (htmlInfo.scrollHeight > htmlInfo.clientHeight) {
            htmlEl.style.overflowY = 'auto';
        }
    }

    // Destroy the preview panel
    destroy() {
        // Remove event listeners
        if (this.options.plainTextContainer && this.plainTextScrollHandler) {
            this.options.plainTextContainer.removeEventListener('scroll', this.plainTextScrollHandler);
        }
        if (this.options.htmlContainer && this.htmlScrollHandler) {
            this.options.htmlContainer.removeEventListener('scroll', this.htmlScrollHandler);
        }

        // Clear references
        this.plainTextScrollHandler = null;
        this.htmlScrollHandler = null;
        this.options.plainTextContainer = null;
        this.options.htmlContainer = null;
        this.parser = null;
    }
}
