// Unit tests for MarkMirror Markdown Parser
// Simple test framework for browser environment

import { MarkdownParser } from '../src/utils/markdownParser.js';

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('🧪 Running MarkMirror Parser Tests...\n');
        
        for (const test of this.tests) {
            try {
                await test.fn();
                console.log(`✅ ${test.name}`);
                this.passed++;
            } catch (error) {
                console.error(`❌ ${test.name}: ${error.message}`);
                this.failed++;
            }
        }
        
        console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    }

    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
        }
    }

    assertContains(text, substring, message = '') {
        if (!text.includes(substring)) {
            throw new Error(`${message}\nExpected "${text}" to contain "${substring}"`);
        }
    }
}

// Create test runner and parser
const runner = new TestRunner();
const parser = new MarkdownParser();

// Test headers
runner.test('Headers - H1 to H6', () => {
    const input = `# Header 1
## Header 2
### Header 3
#### Header 4
##### Header 5
###### Header 6`;
    
    const output = parser.parse(input);
    
    runner.assertContains(output, '<h1>Header 1</h1>');
    runner.assertContains(output, '<h2>Header 2</h2>');
    runner.assertContains(output, '<h3>Header 3</h3>');
    runner.assertContains(output, '<h4>Header 4</h4>');
    runner.assertContains(output, '<h5>Header 5</h5>');
    runner.assertContains(output, '<h6>Header 6</h6>');
});

// Test text formatting
runner.test('Text Formatting - Bold, Italic, Strikethrough', () => {
    const input = `**Bold text**
*Italic text*
~~Strikethrough text~~`;
    
    const output = parser.parse(input);
    
    runner.assertContains(output, '<strong>Bold text</strong>');
    runner.assertContains(output, '<em>Italic text</em>');
    runner.assertContains(output, '<del>Strikethrough text</del>');
});

// Test inline code
runner.test('Inline Code', () => {
    const input = 'This is `inline code` in text.';
    const output = parser.parse(input);
    
    runner.assertContains(output, '<code>inline code</code>');
});

// Test links
runner.test('Links', () => {
    const input = '[Link text](https://example.com)';
    const output = parser.parse(input);
    
    runner.assertContains(output, '<a href="https://example.com">Link text</a>');
});

// Test images
runner.test('Images', () => {
    const input = '![Alt text](image.jpg)';
    const output = parser.parse(input);
    
    runner.assertContains(output, '<img src="image.jpg" alt="Alt text">');
});

// Test unordered lists
runner.test('Unordered Lists', () => {
    const input = `- Item 1
- Item 2
- Item 3`;
    
    const output = parser.parse(input);
    
    runner.assertContains(output, '<ul>');
    runner.assertContains(output, '<li>Item 1</li>');
    runner.assertContains(output, '<li>Item 2</li>');
    runner.assertContains(output, '<li>Item 3</li>');
    runner.assertContains(output, '</ul>');
});

// Test ordered lists
runner.test('Ordered Lists', () => {
    const input = `1. First item
2. Second item
3. Third item`;
    
    const output = parser.parse(input);
    
    runner.assertContains(output, '<ol>');
    runner.assertContains(output, '<li>First item</li>');
    runner.assertContains(output, '<li>Second item</li>');
    runner.assertContains(output, '<li>Third item</li>');
    runner.assertContains(output, '</ol>');
});

// Test task lists
runner.test('Task Lists', () => {
    const input = `- [ ] Unchecked task
- [x] Checked task`;
    
    const output = parser.parse(input);
    
    runner.assertContains(output, '<input type="checkbox" disabled>');
    runner.assertContains(output, '<input type="checkbox" checked disabled>');
    runner.assertContains(output, 'class="task-list-item"');
});

// Test blockquotes
runner.test('Blockquotes', () => {
    const input = '> This is a blockquote';
    const output = parser.parse(input);
    
    runner.assertContains(output, '<blockquote>This is a blockquote</blockquote>');
});

// Test fenced code blocks
runner.test('Fenced Code Blocks', () => {
    const input = `\`\`\`javascript
function hello() {
    console.log("Hello");
}
\`\`\``;
    
    const output = parser.parse(input);
    
    runner.assertContains(output, '<pre><code class="language-javascript">');
    runner.assertContains(output, 'function hello()');
    runner.assertContains(output, '</code></pre>');
});

// Test tables
runner.test('Tables', () => {
    const input = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;
    
    const output = parser.parse(input);
    
    runner.assertContains(output, '<table>');
    runner.assertContains(output, '<thead>');
    runner.assertContains(output, '<th>Header 1</th>');
    runner.assertContains(output, '<th>Header 2</th>');
    runner.assertContains(output, '<tbody>');
    runner.assertContains(output, '<td>Cell 1</td>');
    runner.assertContains(output, '<td>Cell 2</td>');
});

// Test horizontal rules
runner.test('Horizontal Rules', () => {
    const input = '---';
    const output = parser.parse(input);
    
    runner.assertContains(output, '<hr>');
});

// Test paragraphs
runner.test('Paragraphs', () => {
    const input = `First paragraph.

Second paragraph.`;
    
    const output = parser.parse(input);
    
    runner.assertContains(output, '<p>First paragraph.</p>');
    runner.assertContains(output, '<p>Second paragraph.</p>');
});

// Test mixed content
runner.test('Mixed Content', () => {
    const input = `# Title

This is a **bold** paragraph with *italic* text and \`code\`.

- List item 1
- List item 2

> A blockquote

\`\`\`
Code block
\`\`\``;
    
    const output = parser.parse(input);
    
    runner.assertContains(output, '<h1>Title</h1>');
    runner.assertContains(output, '<strong>bold</strong>');
    runner.assertContains(output, '<em>italic</em>');
    runner.assertContains(output, '<code>code</code>');
    runner.assertContains(output, '<ul>');
    runner.assertContains(output, '<blockquote>');
    runner.assertContains(output, '<pre><code>');
});

// Test HTML escaping
runner.test('HTML Escaping', () => {
    const input = 'This contains <script>alert("xss")</script> dangerous content.';
    const output = parser.parse(input);
    
    // Should escape HTML tags
    runner.assertContains(output, '&lt;script&gt;');
    runner.assertContains(output, '&lt;/script&gt;');
});

// Export for browser usage
window.runMarkdownParserTests = () => runner.run();

// Auto-run tests if this is the main module
if (typeof window !== 'undefined' && window.location.search.includes('test=true')) {
    document.addEventListener('DOMContentLoaded', () => {
        runner.run().then(success => {
            if (success) {
                console.log('🎉 All tests passed!');
            } else {
                console.log('💥 Some tests failed!');
            }
        });
    });
}

export { runner, TestRunner };
