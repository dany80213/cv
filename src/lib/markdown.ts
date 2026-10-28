// Markdown -> safe HTML, used at build time for project texts and GitHub READMEs.
// READMEs are third-party-ish content, so everything goes through an allowlist sanitizer.
// Images are dropped on purpose: the site makes no requests to other hosts (see /privacy).
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export interface MarkdownOptions {
  /** owner/name of the GitHub repo, used to resolve relative links in a README. */
  repo?: string;
  branch?: string;
  /** Add this many levels to every heading (a README h1 becomes an h2 on the page). */
  demoteHeadings?: number;
  /** Remove emoji characters from the text. */
  stripEmoji?: boolean;
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function renderMarkdown(md: string, opts: MarkdownOptions = {}): string {
  const { repo, branch = 'HEAD', demoteHeadings = 0, stripEmoji = false } = opts;
  // Emoji are dropped (with their joiners and variation selectors) to match the site's vector-icon style.
  const source = stripEmoji ? md.replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}\ufe0f|[\u200d\ufe0f\u20e3]/gu, '').replace(/[ \t]+$/gm, '') : md;
  // Task list markers ("- [x]") become small drawn boxes: the sanitizer drops <input>, and without them
  // a checklist would no longer show what is done. Fenced code blocks are left alone.
  let fence: string | null = null;
  const withTasks = source
    .split('\n')
    .map((line) => {
      const f = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
      if (f) {
        // A closing fence uses the same character and is at least as long as the opening one.
        if (!fence) fence = f;
        else if (f[0] === fence[0] && f.length >= fence.length) fence = null;
        return line;
      }
      if (fence) return line;
      return line.replace(/^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]\s+/, (_m, lead, mark) =>
        `${lead}<span class="task${mark === ' ' ? '' : ' done'}" role="img" aria-label="${mark === ' ' ? 'da fare' : 'fatto'}"></span> `);
    })
    .join('\n');
  const raw = marked.parse(withTasks, { async: false, gfm: true }) as string;

  const heading = (level: number) => (tag: string, attribs: Record<string, string>) => ({
    tagName: `h${Math.min(6, level + demoteHeadings)}`,
    attribs: {},
  });

  return sanitizeHtml(raw, {
    allowedTags: [
      'span', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'em', 'strong', 'del', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'details', 'summary', 'kbd', 'sub', 'sup',
    ],
    allowedAttributes: { a: ['href', 'title', 'rel', 'target'], code: ['class'], span: ['class', 'role', 'aria-label'], th: ['align'], td: ['align'] },
    allowedClasses: { code: [/^language-[\w-]+$/], span: ['task', 'done'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    // Drop the content of these entirely instead of leaving their text behind.
    nonTextTags: ['script', 'style', 'textarea', 'noscript', 'iframe', 'object', 'embed'],
    transformTags: {
      h1: heading(1), h2: heading(2), h3: heading(3), h4: heading(4), h5: heading(5), h6: heading(6),
      a: (tag, attribs) => {
        let href = attribs.href ?? '';
        if (href && !href.startsWith('#') && !SCHEME.test(href) && !href.startsWith('//') && repo) {
          href = `https://github.com/${repo}/blob/${branch}/${href.replace(/^\.?\//, '')}`;
        }
        const external = /^https?:/i.test(href);
        return {
          tagName: 'a',
          attribs: { ...(href ? { href } : {}), ...(attribs.title ? { title: attribs.title } : {}), ...(external ? { rel: 'noopener noreferrer', target: '_blank' } : {}) },
        };
      },
    },
  });
}
