/**
 * build-knowledge-base.js
 * ─────────────────────────
 * Crawls every HTML file under the project root, extracts article
 * text (title, meta, body) from each page, and writes a single
 * knowledge-base.json that the server uses for RAG retrieval.
 *
 * Re-run manually:  npm run build-kb
 * The server also rebuilds automatically when HTML files change.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'knowledge-base.json');

// Directories / files to skip while crawling
const SKIP = new Set(['node_modules', '.git', 'assets', 'scripts']);

/**
 * Recursively collect every .html file under `dir`.
 */
function collectHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Given the raw HTML of a page, extract structured information.
 */
function extractFromHtml(html, filePath) {
  const $ = cheerio.load(html);

  // Page title from <title> tag
  const pageTitle = $('title').text().trim();

  // Meta description
  const metaDesc = $('meta[name="description"]').attr('content') || '';

  // Post-specific fields
  const postTitle = $('.post-title').text().trim();
  const postMeta = $('.post-meta').text().trim(); // e.g. "Hadith criticism"
  const author = $('.author-name').text().trim();

  // Main body text — prefer .post-body, fall back to <main>
  let bodyEl = $('.post-body');
  if (!bodyEl.length) bodyEl = $('main');

  // Strip script/style/nav elements from the clone so we only get content
  const clone = bodyEl.clone();
  clone.find('script, style, nav, header.site-header, footer').remove();

  const bodyText = clone
    .text()
    .replace(/\s+/g, ' ')
    .trim();

  // Derive a relative URL path (useful for citation)
  const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/');

  // Determine topic from path  e.g. pages/topics/hadith-benefits/foo.html → hadith-benefits
  let topic = '';
  const parts = relPath.split('/');
  if (parts.length >= 3 && parts[0] === 'pages' && parts[1] === 'topics') {
    // If it's a topic index page: pages/topics/hadith-benefits.html
    if (parts.length === 3) {
      topic = parts[2].replace('.html', '');
    } else {
      topic = parts[2]; // subfolder name
    }
  }

  return {
    file: relPath,
    topic,
    pageTitle,
    postTitle: postTitle || pageTitle,
    postMeta,
    author: author || 'Khālid al-Ḥāyik',
    metaDescription: metaDesc,
    content: bodyText,
  };
}

/**
 * Build the full knowledge base and write it to disk.
 * Returns the array so the server can consume it directly.
 */
function build() {
  const files = collectHtmlFiles(ROOT);
  console.log(`[KB] Found ${files.length} HTML files`);

  const entries = [];
  for (const f of files) {
    try {
      const html = fs.readFileSync(f, 'utf-8');
      const entry = extractFromHtml(html, f);
      // Only include entries that have meaningful content
      if (entry.content.length > 50) {
        entries.push(entry);
      }
    } catch (err) {
      console.warn(`[KB] Skipping ${f}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(entries, null, 2), 'utf-8');
  console.log(`[KB] Wrote ${entries.length} entries → ${OUTPUT}`);
  return entries;
}

// Run directly
if (require.main === module) {
  build();
}

module.exports = { build, OUTPUT };
