/**
 * TOC Generator Utility - Extract headings from markdown and generate table of contents
 */

import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import type { Heading, Root } from 'mdast';

export interface TOCItem {
  id: string;
  text: string;
  level: number; // 1, 2, 3 for h1, h2, h3
  children?: TOCItem[];
}

/**
 * Slugify a string to create a valid ID
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Extract headings from markdown content and generate TOC structure
 */
export async function generateTOC(markdown: string): Promise<TOCItem[]> {
  const processor = remark();
  const tree = processor.parse(markdown) as Root;
  const headings: Array<{ level: number; text: string }> = [];

  visit(tree, 'heading', (node: Heading) => {
    const text = node.children
      .map((child) => {
        if ('value' in child) {
          return child.value;
        }
        return '';
      })
      .join('')
      .trim();

    if (text) {
      headings.push({ level: node.depth, text });
    }
  });

  // Build nested TOC structure
  const toc: TOCItem[] = [];
  const stack: TOCItem[] = [];

  for (const heading of headings) {
    const item: TOCItem = {
      id: slugify(heading.text),
      text: heading.text,
      level: heading.level,
    };

    // Find the appropriate parent
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      toc.push(item);
    } else {
      const parent = stack[stack.length - 1];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(item);
    }

    stack.push(item);
  }

  return toc;
}

/**
 * Generate unique IDs for all headings in markdown
 * Returns markdown with heading IDs added
 */
export async function addHeadingIds(markdown: string): Promise<string> {
  const processor = remark();
  const tree = processor.parse(markdown) as Root;
  const lines = markdown.split('\n');
  let offset = 0;

  visit(tree, 'heading', (node: Heading) => {
    const text = node.children
      .map((child) => {
        if ('value' in child) {
          return child.value;
        }
        return '';
      })
      .join('')
      .trim();

    if (text) {
      const id = slugify(text);
      const position = node.position;
      if (position && position.start.line) {
        const lineIndex = position.start.line - 1 + offset;
        const headingLine = lines[lineIndex];
        if (headingLine && !headingLine.includes('{#')) {
          lines[lineIndex] = `${headingLine} {#${id}}`;
          offset++;
        }
      }
    }
  });

  return lines.join('\n');
}

