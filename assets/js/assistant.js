/**
 * assistant.js — Fully Client-Side AI Chat Widget
 * ─────────────────────────────────────────────────
 * Works on GitHub Pages (no server required).
 *
 * • Loads pre-built knowledge-base.json on first chat open.
 * • Performs TF-IDF retrieval with diacritics normalization.
 * • Calls OpenRouter API directly from the browser.
 */
(() => {
  'use strict';

  // ── Configuration ───────────────────────────────────────────────
  const OR_KEY = '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';

  const MODELS = [
    'openai/gpt-oss-120b:free',
    'openai/gpt-oss-20b:free',
    'qwen/qwen3-coder:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'stepfun/step-3.5-flash:free',
    'upstage/solar-pro-3:free',
    'mistralai/mistral-small-3.1-24b-instruct:free',
    'google/gemma-3-27b-it:free',
    'google/gemma-3-12b-it:free',
    'google/gemma-3n-e4b-it:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'qwen/qwen3-4b:free',
    'z-ai/glm-4.5-air:free',
  ];

  // ── Knowledge base & retrieval state ────────────────────────────
  let knowledgeBase = null;
  let docTokensCache = [];
  let kbLoading = false;
  let kbError = null;

  function kbUrl() {
    const depth = currentPathDepth();
    return '../'.repeat(depth) + 'assets/data/knowledge-base.json';
  }

  async function ensureKB() {
    if (knowledgeBase) return;
    if (kbLoading) {
      while (kbLoading) await new Promise(r => setTimeout(r, 100));
      if (knowledgeBase) return;
      throw new Error(kbError || 'Knowledge base failed to load.');
    }
    kbLoading = true;
    try {
      const res = await fetch(kbUrl());
      if (!res.ok) throw new Error('Could not load knowledge base (HTTP ' + res.status + ')');
      knowledgeBase = await res.json();
      buildDocTokensCache();
      console.log('[Assistant] Loaded ' + knowledgeBase.length + ' KB entries');
    } catch (e) {
      kbError = e.message;
      throw e;
    } finally {
      kbLoading = false;
    }
  }

  // ── Diacritics & tokenisation ───────────────────────────────────
  function stripDiacritics(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  const STOP_WORDS = new Set([
    'the','a','an','and','or','but','is','are','was','were','be','been','being',
    'have','has','had','do','does','did','will','would','shall','should','may',
    'might','can','could','not','no','nor','so','if','then','else','when','where',
    'who','whom','which','what','how','why','that','this','these','those','it',
    'its','he','him','his','she','her','they','them','their','we','us','our',
    'you','your','about','from','into','with','for','on','at','to','by','of','in',
    'up','out','off','over','under','again','further','once','here','there','all',
    'each','every','both','few','more','most','other','some','such','only','own',
    'same','than','too','very','just','also','now','talk','said','say','says',
    'consider','considered','think','thinks','talked','weak','strong',
  ]);

  function tokenize(text) {
    return stripDiacritics(text)
      .toLowerCase()
      .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
      .split(/\s+/)
      .filter(function(t) { return t.length > 2; });
  }

  function tokenizeQuery(text) {
    return tokenize(text).filter(function(t) { return !STOP_WORDS.has(t); });
  }

  function buildDocTokensCache() {
    docTokensCache = knowledgeBase.map(function(entry) {
      var text = entry.postTitle + ' ' + entry.postTitle + ' ' + entry.postMeta + ' ' + entry.metaDescription + ' ' + entry.content;
      return new Set(tokenize(text));
    });
  }

  function docFrequency(term) {
    var count = 0;
    for (var i = 0; i < docTokensCache.length; i++) {
      for (var dt of docTokensCache[i]) {
        if (dt.includes(term) || term.includes(dt)) { count++; break; }
      }
    }
    return count || 1;
  }

  function scoreDocs(query) {
    var qTokens = tokenizeQuery(query);
    if (qTokens.length === 0) {
      var allTokens = tokenize(query);
      if (allTokens.length === 0) return knowledgeBase.slice(0, 5);
      return scoreDocsWithTokens(allTokens);
    }
    return scoreDocsWithTokens(qTokens);
  }

  function scoreDocsWithTokens(qTokens) {
    var N = knowledgeBase.length;
    var tokenWeights = qTokens.map(function(qt) {
      var df = docFrequency(qt);
      return { token: qt, weight: Math.log(N / df) + 1 };
    });

    var scored = knowledgeBase.map(function(entry, idx) {
      var docSet = docTokensCache[idx];
      var weightedScore = 0;
      var maxWeight = 0;

      for (var i = 0; i < tokenWeights.length; i++) {
        var qt = tokenWeights[i].token;
        var weight = tokenWeights[i].weight;
        maxWeight += weight;
        for (var dt of docSet) {
          if (dt === qt) { weightedScore += weight; break; }
          else if (dt.includes(qt) || qt.includes(dt)) { weightedScore += weight * 0.7; break; }
        }
      }
      return { entry: entry, score: maxWeight > 0 ? weightedScore / maxWeight : 0 };
    });

    scored.sort(function(a, b) { return b.score - a.score; });
    return scored.filter(function(s) { return s.score > 0.05; }).slice(0, 6).map(function(s) { return s.entry; });
  }

  // ── System prompt builder ───────────────────────────────────────
  function buildSystemPrompt(userQuestion, relevantDocs) {
    var contextChunks = relevantDocs.map(function(doc, i) {
      var snippet = doc.content.length > 2000
        ? doc.content.slice(0, 2000) + '…'
        : doc.content;
      return '\n--- Document ' + (i + 1) + ' ---\nTitle: ' + doc.postTitle +
        '\nTopic: ' + (doc.topic || doc.postMeta || 'General') +
        '\nAuthor: ' + doc.author +
        '\nSource: ' + doc.file + '\n\n' + snippet + '\n';
    }).join('\n');

    return 'You are the official AI scholarly assistant for the website of Shaykh Dr. Khālid ibn Maḥmūd al-Ḥāyik (خالد الحايك), a renowned muḥaddith and scholar of ḥadīth sciences.\n\nSTRICT RULES:\n1. You may ONLY answer based on the content from Shaykh Khālid\'s translated works provided below as context documents.\n2. If the user\'s question cannot be answered from the provided context, respond politely: "I don\'t have information about that in the available works of Shaykh Khālid. Please try rephrasing your question or browse the topics on the website."\n3. NEVER fabricate, hallucinate, or invent information not present in the provided context.\n4. When you answer, cite which article/document the information comes from by its title.\n5. Maintain an academic, respectful, and scholarly tone befitting Islamic scholarship.\n6. You may answer in English or Arabic depending on the language the user asks in.\n7. Keep answers focused and relevant. Use quotations from the source material where appropriate.\n\nCONTEXT DOCUMENTS FROM SHAYKH KHĀLID\'S WORKS:\n' + contextChunks + '\n\nUSER\'S QUESTION:\n' + userQuestion + '\n\nProvide a well-structured, accurate answer based ONLY on the context above.';
  }

  // ── OpenRouter API call with model fallback ─────────────────────
  async function callLLM(systemPrompt, chatHistory, userMessage) {
    var messages = [{ role: 'system', content: systemPrompt }];
    var recent = chatHistory.slice(-10);
    for (var i = 0; i < recent.length; i++) {
      messages.push({
        role: recent[i].role === 'user' ? 'user' : 'assistant',
        content: recent[i].text,
      });
    }
    messages.push({ role: 'user', content: userMessage });

    for (var m = 0; m < MODELS.length; m++) {
      var model = MODELS[m];
      try {
        var res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + OR_KEY,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': "Shaykh Khalid's Scholarly Assistant",
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: 2048,
            temperature: 0.3,
          }),
        });

        if (!res.ok) {
          console.warn('[Assistant] ' + model + ' → ' + res.status);
          continue;
        }

        var data = await res.json();
        var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (text) {
          console.log('[Assistant] Success with ' + model);
          return text;
        }
      } catch (e) {
        console.warn('[Assistant] ' + model + ' error:', e.message);
      }
    }
    throw new Error('All AI models are temporarily unavailable. Please try again in a minute.');
  }

  // ── Inject HTML ─────────────────────────────────────────────────
  var widget = document.createElement('div');
  widget.id = 'ai-assistant';
  widget.innerHTML = '<button class="assistant-fab" aria-label="Open AI Assistant" title="Ask the Shaykh\'s Assistant"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg></button>' +
    '<div class="assistant-panel" role="dialog" aria-label="AI Assistant">' +
      '<div class="assistant-header">' +
        '<div class="assistant-header-info">' +
          '<div class="assistant-header-icon">📖</div>' +
          '<div class="assistant-header-text"><h4>Shaykh\'s Assistant</h4><span>Powered by Shaykh Khālid\'s works</span></div>' +
        '</div>' +
        '<button class="assistant-close" aria-label="Close assistant">&times;</button>' +
      '</div>' +
      '<div class="assistant-messages">' +
        '<div class="assistant-welcome">' +
          '<h5>Assalāmu ʿalaykum!</h5>' +
          '<p>I can answer questions based on the translated works of<br>' +
          '<strong>Shaykh Dr. Khālid al-Ḥāyik</strong>.<br>' +
          'Ask me about ḥadīth sciences, narrator criticism, heritage verification, and more.</p>' +
        '</div>' +
      '</div>' +
      '<div class="assistant-input-area">' +
        '<input type="text" placeholder="Ask a question…" aria-label="Type your question" />' +
        '<button class="assistant-send" aria-label="Send" disabled>' +
          '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(widget);

  // ── References ──────────────────────────────────────────────────
  var fab = widget.querySelector('.assistant-fab');
  var panel = widget.querySelector('.assistant-panel');
  var closeBtn = widget.querySelector('.assistant-close');
  var messagesEl = widget.querySelector('.assistant-messages');
  var inputEl = widget.querySelector('.assistant-input-area input');
  var sendBtn = widget.querySelector('.assistant-send');
  var welcomeEl = widget.querySelector('.assistant-welcome');

  var conversationHistory = [];
  var isOpen = false;
  var isSending = false;

  // ── Toggle panel ────────────────────────────────────────────────
  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen) inputEl.focus();
  }

  fab.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) togglePanel();
  });

  // ── Input handling ──────────────────────────────────────────────
  inputEl.addEventListener('input', function() {
    sendBtn.disabled = !inputEl.value.trim() || isSending;
  });
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !sendBtn.disabled) sendMessage();
  });
  sendBtn.addEventListener('click', sendMessage);

  // ── Helpers ─────────────────────────────────────────────────────
  function addMessage(text, role, sources) {
    if (welcomeEl && welcomeEl.parentNode) welcomeEl.remove();

    var bubble = document.createElement('div');
    bubble.classList.add('assistant-msg', role);
    bubble.textContent = text;

    if (role === 'bot' && sources && sources.length > 0) {
      var srcDiv = document.createElement('div');
      srcDiv.classList.add('assistant-sources');
      srcDiv.innerHTML = '<strong>Sources</strong>' +
        sources.map(function(s) {
          var href = getRelativePath(s.file);
          return '<a href="' + href + '" title="' + s.title + '">' + s.title + '</a>';
        }).join('<br>');
      bubble.appendChild(srcDiv);
    }

    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function addTyping() {
    var el = document.createElement('div');
    el.classList.add('assistant-typing');
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function getRelativePath(sourceFile) {
    var depth = currentPathDepth();
    var prefix = '';
    for (var i = 0; i < depth; i++) prefix += '../';
    return prefix + sourceFile;
  }

  function currentPathDepth() {
    var p = window.location.pathname.replace(/\\/g, '/');
    var segments = p.split('/').filter(Boolean);
    // Find the 'pages' anchor to determine depth regardless of any base prefix
    var pagesIdx = segments.indexOf('pages');
    if (pagesIdx >= 0) {
      // e.g. /Addyaiya/pages/topics/x.html → 2 levels from pages
      return segments.length - pagesIdx - 1;
    }
    // Root-level pages (index.html etc.) → depth 0
    return 0;
  }

  // ── Send message ────────────────────────────────────────────────
  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || isSending) return;

    isSending = true;
    inputEl.value = '';
    sendBtn.disabled = true;

    addMessage(text, 'user');
    conversationHistory.push({ role: 'user', text: text });

    var typing = addTyping();

    try {
      await ensureKB();

      var relevantDocs = scoreDocs(text);
      var systemPrompt = buildSystemPrompt(text, relevantDocs);
      var reply = await callLLM(systemPrompt, conversationHistory, text);

      typing.remove();
      var sources = relevantDocs.map(function(d) { return { title: d.postTitle, file: d.file }; });
      addMessage(reply, 'bot', sources);
      conversationHistory.push({ role: 'model', text: reply });
    } catch (err) {
      typing.remove();
      addMessage(err.message || 'Something went wrong. Please try again.', 'bot');
      console.error('[Assistant]', err);
    } finally {
      isSending = false;
      sendBtn.disabled = !inputEl.value.trim();
    }
  }
})();
