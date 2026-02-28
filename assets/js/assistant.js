/**
 * assistant.js — Frontend AI Chat Widget
 * ────────────────────────────────────────
 * Injects a floating chat button + panel into the page.
 * Communicates with the Express backend at /api/chat.
 *
 * Included via <script src="assets/js/assistant.js" defer></script>
 * on every page.
 */
(() => {
  'use strict';

  // ── Configuration ───────────────────────────────────────────────
  // Detect backend URL.  In production you'd set this to your server.
  // During development the Express server serves the static files too,
  // so relative URLs work.
  const API_URL = (() => {
    // If served from the Express server, use relative path
    if (location.port === '3000' || location.hostname === 'localhost') {
      return '/api/chat';
    }
    // Fallback: try localhost:3000 (dev scenario where static files
    // are opened directly from disk or another server)
    return 'http://localhost:3000/api/chat';
  })();

  // ── Inject HTML ─────────────────────────────────────────────────
  const widget = document.createElement('div');
  widget.id = 'ai-assistant';
  widget.innerHTML = `
    <!-- Floating button -->
    <button class="assistant-fab" aria-label="Open AI Assistant" title="Ask the Shaykh's Assistant">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/>
        <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
      </svg>
    </button>

    <!-- Chat panel -->
    <div class="assistant-panel" role="dialog" aria-label="AI Assistant">
      <div class="assistant-header">
        <div class="assistant-header-info">
          <div class="assistant-header-icon">📖</div>
          <div class="assistant-header-text">
            <h4>Shaykh's Assistant</h4>
            <span>Powered by Shaykh Khālid's works</span>
          </div>
        </div>
        <button class="assistant-close" aria-label="Close assistant">&times;</button>
      </div>

      <div class="assistant-messages">
        <div class="assistant-welcome">
          <h5>Assalāmu ʿalaykum!</h5>
          <p>I can answer questions based on the translated works of<br>
          <strong>Shaykh Dr. Khālid al-Ḥāyik</strong>.<br>
          Ask me about ḥadīth sciences, narrator criticism, heritage verification, and more.</p>
        </div>
      </div>

      <div class="assistant-input-area">
        <input type="text" placeholder="Ask a question…" aria-label="Type your question" />
        <button class="assistant-send" aria-label="Send" disabled>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  // ── References ──────────────────────────────────────────────────
  const fab = widget.querySelector('.assistant-fab');
  const panel = widget.querySelector('.assistant-panel');
  const closeBtn = widget.querySelector('.assistant-close');
  const messagesEl = widget.querySelector('.assistant-messages');
  const input = widget.querySelector('.assistant-input-area input');
  const sendBtn = widget.querySelector('.assistant-send');
  const welcomeEl = widget.querySelector('.assistant-welcome');

  let conversationHistory = [];
  let isOpen = false;
  let isSending = false;

  // ── Toggle panel ────────────────────────────────────────────────
  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen) {
      input.focus();
    }
  }

  fab.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  // Close with Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) togglePanel();
  });

  // ── Input handling ──────────────────────────────────────────────
  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim() || isSending;
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !sendBtn.disabled) {
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  // ── Helpers: create message bubbles ─────────────────────────────
  function addMessage(text, role, sources) {
    // Remove welcome message on first interaction
    if (welcomeEl && welcomeEl.parentNode) {
      welcomeEl.remove();
    }

    const bubble = document.createElement('div');
    bubble.classList.add('assistant-msg', role);
    bubble.textContent = text;

    // Add source citations for bot messages
    if (role === 'bot' && sources && sources.length > 0) {
      const srcDiv = document.createElement('div');
      srcDiv.classList.add('assistant-sources');
      srcDiv.innerHTML = '<strong>Sources</strong>' +
        sources.map(s => {
          // Build a relative link from the current page to the source file
          const href = getRelativePath(s.file);
          return `<a href="${href}" title="${s.title}">${s.title}</a>`;
        }).join('<br>');
      bubble.appendChild(srcDiv);
    }

    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function addTyping() {
    const el = document.createElement('div');
    el.classList.add('assistant-typing');
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  /**
   * Compute a relative path from the current page to the source file.
   * e.g. if current page is pages/topics/hadith-benefits.html
   * and source is pages/topics/hadith-benefits/foo.html
   * we want "hadith-benefits/foo.html"
   */
  function getRelativePath(sourceFile) {
    // Simple approach: go to the site root and then to the source
    const depth = currentPageDepth();
    const prefix = '../'.repeat(depth);
    return prefix + sourceFile;
  }

  function currentPageDepth() {
    const path = window.location.pathname.replace(/\\/g, '/');
    // Count segments after the base (strip leading /)
    const segments = path.split('/').filter(Boolean);
    // The last segment is the file, so depth = segments.length - 1
    // But we need depth relative to the project root.
    // For pages served from Express at root, index.html is depth 0,
    // pages/books.html is depth 1, pages/topics/x.html is depth 2, etc.

    // If we're at root (index.html or /) → 0
    if (segments.length <= 1) return 0;

    // Try to find where 'pages' starts
    const pagesIdx = segments.indexOf('pages');
    if (pagesIdx >= 0) {
      return segments.length - pagesIdx - 1;
    }
    return segments.length - 1;
  }

  // ── Send message ────────────────────────────────────────────────
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isSending) return;

    isSending = true;
    input.value = '';
    sendBtn.disabled = true;

    addMessage(text, 'user');
    conversationHistory.push({ role: 'user', text });

    const typing = addTyping();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: conversationHistory.slice(-10), // last 10 messages for context
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      typing.remove();

      const reply = data.reply || 'Sorry, I could not generate a response.';
      addMessage(reply, 'bot', data.sources);
      conversationHistory.push({ role: 'model', text: reply });
    } catch (err) {
      typing.remove();
      const errMsg = err.message.includes('capacity')
        ? err.message
        : 'Sorry, I could not reach the assistant server. Please make sure the server is running (npm start).';
      addMessage(errMsg, 'bot');
      console.error('[Assistant]', err);
    } finally {
      isSending = false;
      sendBtn.disabled = !input.value.trim();
    }
  }
})();
