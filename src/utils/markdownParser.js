// Custom Markdown Parser for MarkMirror Mobile
// Supports CommonMark + extensions: tables, task-lists, fenced code blocks, inline HTML

export class MarkdownParser {
    constructor(options = {}) {
        this.options = {
            sanitizeHTML: true,
            allowedTags: ['p', 'br', 'strong', 'em', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                         'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                         'details', 'summary', 'kbd', 'mark', 'del', 'ins'],
            ...options
        };
    }

    // Main parse method
    parse(markdown) {
        if (!markdown || typeof markdown !== 'string') {
            return '';
        }

        // Normalize line endings
        const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Split into lines for processing
        const lines = normalized.split('\n');
        
        // Process the markdown
        const html = this.processLines(lines);
        
        // Sanitize if enabled
        return this.options.sanitizeHTML ? this.sanitizeHTML(html) : html;
    }

    // Process lines of markdown
    processLines(lines) {
        const result = [];
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i];
            
            // Skip empty lines at the start
            if (line.trim() === '' && result.length === 0) {
                i++;
                continue;
            }
            
            // Check for block elements
            const blockResult = this.processBlockElement(lines, i);
            if (blockResult) {
                result.push(blockResult.html);
                i = blockResult.nextIndex;
                continue;
            }
            
            // Process as paragraph
            const paragraphResult = this.processParagraph(lines, i);
            result.push(paragraphResult.html);
            i = paragraphResult.nextIndex;
        }
        
        return result.join('\n');
    }

    // Process block elements (headers, lists, code blocks, etc.)
    processBlockElement(lines, startIndex) {
        const line = lines[startIndex];
        
        // Headers
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const text = this.processInlineElements(headerMatch[2]);
            return {
                html: `<h${level}>${text}</h${level}>`,
                nextIndex: startIndex + 1
            };
        }
        
        // Fenced code blocks
        if (line.match(/^```/)) {
            return this.processFencedCodeBlock(lines, startIndex);
        }
        
        // Tables
        if (this.isTableRow(line) && startIndex + 1 < lines.length && this.isTableSeparator(lines[startIndex + 1])) {
            return this.processTable(lines, startIndex);
        }
        
        // Lists
        if (line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/)) {
            return this.processList(lines, startIndex);
        }
        
        // Blockquotes
        if (line.match(/^\s*>\s/)) {
            return this.processBlockquote(lines, startIndex);
        }
        
        // Horizontal rules
        if (line.match(/^\s*[-*_]{3,}\s*$/)) {
            return {
                html: '<hr>',
                nextIndex: startIndex + 1
            };
        }
        
        return null;
    }

    // Process fenced code blocks
    processFencedCodeBlock(lines, startIndex) {
        const startLine = lines[startIndex];
        const langMatch = startLine.match(/^```(\w+)?/);
        const language = langMatch && langMatch[1] ? langMatch[1] : '';
        
        let i = startIndex + 1;
        const codeLines = [];
        
        while (i < lines.length && !lines[i].match(/^```\s*$/)) {
            codeLines.push(lines[i]);
            i++;
        }
        
        const code = this.escapeHTML(codeLines.join('\n'));
        const langClass = language ? ` class="language-${language}"` : '';
        
        return {
            html: `<pre><code${langClass}>${code}</code></pre>`,
            nextIndex: i + 1
        };
    }

    // Process tables
    processTable(lines, startIndex) {
        const tableLines = [];
        let i = startIndex;
        
        // Collect table lines
        while (i < lines.length && this.isTableRow(lines[i])) {
            tableLines.push(lines[i]);
            i++;
        }
        
        if (tableLines.length < 2) return null;
        
        const headerRow = this.parseTableRow(tableLines[0]);
        const separatorRow = tableLines[1];
        const dataRows = tableLines.slice(2).map(row => this.parseTableRow(row));
        
        let html = '<table>\n<thead>\n<tr>\n';
        headerRow.forEach(cell => {
            html += `<th>${this.processInlineElements(cell)}</th>\n`;
        });
        html += '</tr>\n</thead>\n<tbody>\n';
        
        dataRows.forEach(row => {
            html += '<tr>\n';
            row.forEach(cell => {
                html += `<td>${this.processInlineElements(cell)}</td>\n`;
            });
            html += '</tr>\n';
        });
        
        html += '</tbody>\n</table>';
        
        return {
            html,
            nextIndex: i
        };
    }

    // Process lists
    processList(lines, startIndex) {
        const listItems = [];
        let i = startIndex;
        let listType = null;
        
        while (i < lines.length) {
            const line = lines[i];
            const unorderedMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
            const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
            const taskMatch = line.match(/^(\s*)([-*+])\s+\[([ x])\]\s+(.+)$/);
            
            if (taskMatch) {
                const indent = taskMatch[1].length;
                const checked = taskMatch[3] === 'x';
                const content = this.processInlineElements(taskMatch[4]);
                listItems.push({
                    type: 'task',
                    indent,
                    content,
                    checked
                });
                if (!listType) listType = 'ul';
            } else if (unorderedMatch) {
                const indent = unorderedMatch[1].length;
                const content = this.processInlineElements(unorderedMatch[3]);
                listItems.push({
                    type: 'unordered',
                    indent,
                    content
                });
                if (!listType) listType = 'ul';
            } else if (orderedMatch) {
                const indent = orderedMatch[1].length;
                const content = this.processInlineElements(orderedMatch[3]);
                listItems.push({
                    type: 'ordered',
                    indent,
                    content
                });
                if (!listType) listType = 'ol';
            } else {
                break;
            }
            i++;
        }
        
        let html = `<${listType}>\n`;
        listItems.forEach(item => {
            if (item.type === 'task') {
                const checkedAttr = item.checked ? ' checked' : '';
                html += `<li class="task-list-item"><input type="checkbox"${checkedAttr} disabled> ${item.content}</li>\n`;
            } else {
                html += `<li>${item.content}</li>\n`;
            }
        });
        html += `</${listType}>`;
        
        return {
            html,
            nextIndex: i
        };
    }

    // Process blockquotes
    processBlockquote(lines, startIndex) {
        const quoteLines = [];
        let i = startIndex;
        
        while (i < lines.length && lines[i].match(/^\s*>\s/)) {
            const content = lines[i].replace(/^\s*>\s?/, '');
            quoteLines.push(content);
            i++;
        }
        
        const content = this.processInlineElements(quoteLines.join('\n'));
        
        return {
            html: `<blockquote>${content}</blockquote>`,
            nextIndex: i
        };
    }

    // Process paragraph
    processParagraph(lines, startIndex) {
        const paragraphLines = [];
        let i = startIndex;

        while (i < lines.length) {
            const line = lines[i];

            // Stop at empty line or block element
            if (line.trim() === '' || this.processBlockElement(lines, i)) {
                break;
            }

            paragraphLines.push(line);
            i++;
        }

        if (paragraphLines.length === 0) {
            return { html: '', nextIndex: i + 1 };
        }

        // First escape HTML, then process inline elements
        let content = paragraphLines.join(' ');
        content = this.escapeHTMLInText(content);
        content = this.processInlineElements(content);

        return {
            html: `<p>${content}</p>`,
            nextIndex: i
        };
    }

    // Process inline elements (bold, italic, code, links, etc.)
    processInlineElements(text) {
        if (!text) return '';

        // Process in order of precedence - images before links!
        text = this.processInlineCode(text);
        text = this.processImages(text);  // Images first
        text = this.processLinks(text);   // Then links
        text = this.processBoldItalic(text);
        text = this.processStrikethrough(text);
        text = this.processInlineHTML(text);

        return text;
    }

    // Process inline code
    processInlineCode(text) {
        return text.replace(/`([^`]+)`/g, (match, code) => {
            return `<code>${this.escapeHTML(code)}</code>`;
        });
    }

    // Process links
    processLinks(text) {
        return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
            return `<a href="${this.escapeHTML(url)}">${this.escapeHTML(linkText)}</a>`;
        });
    }

    // Process images
    processImages(text) {
        return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
            return `<img src="${this.escapeHTML(src)}" alt="${this.escapeHTML(alt)}">`;
        });
    }

    // Process bold and italic
    processBoldItalic(text) {
        // Bold
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        
        // Italic
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
        
        return text;
    }

    // Process strikethrough
    processStrikethrough(text) {
        return text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    }

    // Process inline HTML (limited set)
    processInlineHTML(text) {
        // Allow specific HTML tags
        const allowedInlineTags = ['kbd', 'mark', 'details', 'summary'];
        
        allowedInlineTags.forEach(tag => {
            const regex = new RegExp(`<${tag}([^>]*)>([^<]*)</${tag}>`, 'gi');
            text = text.replace(regex, (match, attrs, content) => {
                return `<${tag}${attrs}>${content}</${tag}>`;
            });
        });
        
        return text;
    }

    // Helper methods
    isTableRow(line) {
        return line.includes('|') && line.trim().length > 0;
    }

    isTableSeparator(line) {
        return /^\s*\|?[\s\-\|:]+\|?\s*$/.test(line);
    }

    parseTableRow(line) {
        return line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Escape HTML in text while preserving Markdown syntax
    escapeHTMLInText(text) {
        // Temporarily replace Markdown syntax to protect it
        const protectedElements = [];
        let protectedText = text;

        // Protect inline code
        protectedText = protectedText.replace(/`([^`]+)`/g, (match) => {
            const index = protectedElements.length;
            protectedElements.push(match);
            return `__PROTECTED_${index}__`;
        });

        // Protect links
        protectedText = protectedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => {
            const index = protectedElements.length;
            protectedElements.push(match);
            return `__PROTECTED_${index}__`;
        });

        // Protect images
        protectedText = protectedText.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match) => {
            const index = protectedElements.length;
            protectedElements.push(match);
            return `__PROTECTED_${index}__`;
        });

        // Escape HTML in the remaining text
        protectedText = protectedText.replace(/<[^>]+>/g, (match) => {
            return this.escapeHTML(match);
        });

        // Restore protected elements
        protectedElements.forEach((element, index) => {
            protectedText = protectedText.replace(`__PROTECTED_${index}__`, element);
        });

        return protectedText;
    }

    // Basic HTML sanitization
    sanitizeHTML(html) {
        if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(html, {
                ALLOWED_TAGS: this.options.allowedTags
            });
        }

        // Fallback basic sanitization
        return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
}
