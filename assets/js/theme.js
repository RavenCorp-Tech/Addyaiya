(() => {
  const htmlEl = document.documentElement;
  const themeToggle = document.querySelector('.theme-toggle');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  const header = document.querySelector('.site-header');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  let lastScrollY = window.scrollY;
  let headerHidden = false;
  let ticking = false;
  const SCROLL_THRESHOLD_DESKTOP = 120;
  const SCROLL_DELTA_MOBILE = 6; // minimal movement to toggle on mobile
  const originalToggleParent = themeToggle?.parentElement || null;
  const originalToggleNextSibling = themeToggle?.nextElementSibling || null;
  const mobileThemeWrapper = document.createElement('li');
  mobileThemeWrapper.classList.add('nav-theme-toggle-item');
  const mobileThemeContent = document.createElement('div');
  mobileThemeContent.classList.add('nav-theme-toggle');
  mobileThemeWrapper.appendChild(mobileThemeContent);
  const topicLinks = [
    { label: 'Ḥadīth Institute', path: 'pages/topics/hadith-institute.html' },
    { label: 'Heritage Verification', path: 'pages/topics/heritage-verification.html' },
    { label: 'Ḥadīth Benefits', path: 'pages/topics/hadith-benefits.html' },
    { label: 'Methodologies & Criticism', path: 'pages/topics/methodologies-criticism.html' },
    { label: 'Ḥadīth Terminology (Muṣṭalaḥ al-Ḥadīth)', path: 'pages/topics/hadith-terminology.html' },
    { label: 'Biographical Evaluation (ʿUlūm ar-Rijāl)', path: 'pages/topics/biographical-evaluation.html' },
    { label: 'Defects in Ḥadīths (ʿIlal al-Aḥādīth)', path: 'pages/topics/hadith-defects.html' },
    { label: 'Fiqh of Ḥadīth', path: 'pages/topics/fiqh-of-hadith.html' },
    { label: 'Battles & Biographies (Maġāzī and Siyar)', path: 'pages/topics/battles-biographies.html' },
    { label: 'Ḥadīth Schools', path: 'pages/topics/hadith-schools.html' },
    { label: 'Questions & Answers', path: 'pages/topics/questions-answers.html' },
    { label: 'Academic Plagiarism', path: 'pages/topics/academic-plagiarism.html' },
    { label: 'Miscellaneous', path: 'pages/topics/miscellaneous.html' },
    { label: 'Other Sciences', path: 'pages/topics/other-sciences.html' }
  ];
  const HOME_DROPDOWN_ID = 'home-topics-dropdown';
  let homeLinkRef = null;
  let homeDropdownRef = null;
  let homeToggleButtonRef = null;

  const setBodyNavState = (expanded) => {
    if (expanded) {
      document.body.classList.add('nav-open');
    } else {
      document.body.classList.remove('nav-open');
    }
  };

  function getTopicPathPrefix() {
    const normalizedPath = window.location.pathname.replace(/\\/g, '/');
    const depth = Math.max(normalizedPath.split('/').filter(Boolean).length - 1, 0);
    if (depth <= 0) {
      return '';
    }
    return '../'.repeat(depth);
  }

  function syncHomeDropdownState() {
    if (!homeLinkRef) {
      return;
    }
    if (!homeDropdownRef) {
      homeLinkRef.setAttribute('aria-expanded', 'false');
      return;
    }

    const isMobile = window.innerWidth <= 960;
    const dropdownLinks = homeDropdownRef.querySelectorAll('a');
    if (isMobile) {
      if (!homeDropdownRef.hasAttribute('data-expanded')) {
        homeDropdownRef.dataset.expanded = 'false';
      }
      const expanded = homeDropdownRef.dataset.expanded === 'true';
      homeLinkRef.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      homeToggleButtonRef?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      homeDropdownRef.setAttribute('aria-hidden', expanded ? 'false' : 'true');
      dropdownLinks.forEach((link) => {
        if (expanded) {
          link.removeAttribute('tabindex');
        } else {
          link.setAttribute('tabindex', '-1');
        }
      });
    } else {
      homeDropdownRef.removeAttribute('data-expanded');
      homeDropdownRef.removeAttribute('aria-hidden');
      dropdownLinks.forEach((link) => {
        link.removeAttribute('tabindex');
      });
      homeLinkRef.setAttribute('aria-expanded', 'false');
      homeToggleButtonRef?.setAttribute('aria-expanded', 'false');
    }
  }

  const setHomeDropdownExpanded = (expanded) => {
    if (!homeDropdownRef) {
      return;
    }
    if (window.innerWidth > 960) {
      homeDropdownRef.removeAttribute('data-expanded');
    } else {
      homeDropdownRef.dataset.expanded = expanded ? 'true' : 'false';
    }
    syncHomeDropdownState();
  };

  const collapseHomeDropdown = () => {
    setHomeDropdownExpanded(false);
  };

  function createHomeDropdown() {
    if (!navLinks) {
      return;
    }

    const homeAnchor = navLinks.querySelector('li > a[href$="index.html"], li > a[href$="/index.html"]');
    if (!homeAnchor) {
      return;
    }

    const parentItem = homeAnchor.closest('li');
    if (!parentItem) {
      return;
    }

    const existingDropdown = parentItem.querySelector('.dropdown-menu');
    if (existingDropdown) {
      parentItem.classList.add('has-dropdown', 'dropdown');
      homeLinkRef = parentItem.querySelector('.dropdown-header > a') || homeAnchor;
      homeDropdownRef = existingDropdown;
      homeToggleButtonRef = parentItem.querySelector('.dropdown-toggle-button');
      homeDropdownRef.classList.add('dropdown-menu--animated', 'dropdown-menu--home');
      homeLinkRef?.setAttribute('aria-controls', HOME_DROPDOWN_ID);
      if (window.innerWidth <= 960 && !homeDropdownRef.hasAttribute('data-expanded')) {
        homeDropdownRef.dataset.expanded = 'false';
      }
      if (homeToggleButtonRef && !homeToggleButtonRef.hasAttribute('aria-controls')) {
        homeToggleButtonRef.setAttribute('aria-controls', HOME_DROPDOWN_ID);
      }
      setHomeDropdownExpanded(homeDropdownRef.dataset.expanded === 'true');
      return;
    }

    const dropdownHeader = document.createElement('div');
    dropdownHeader.classList.add('dropdown-header');
    parentItem.insertBefore(dropdownHeader, homeAnchor);
    dropdownHeader.appendChild(homeAnchor);

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.classList.add('dropdown-toggle-button');
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.setAttribute('aria-controls', HOME_DROPDOWN_ID);
    toggleButton.setAttribute('aria-label', 'Toggle topics navigation');
    const toggleLabel = document.createElement('span');
    toggleLabel.classList.add('sr-only');
    toggleLabel.textContent = 'Toggle topics navigation';
    toggleButton.appendChild(toggleLabel);
    dropdownHeader.appendChild(toggleButton);

    const dropdown = document.createElement('ul');
  dropdown.classList.add('dropdown-menu', 'dropdown-menu--animated', 'dropdown-menu--home');
    dropdown.id = HOME_DROPDOWN_ID;
    dropdown.dataset.expanded = 'false';
    const prefix = getTopicPathPrefix();

    topicLinks.forEach(({ label, path }) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.textContent = label;
      link.href = prefix + path;
      item.appendChild(link);
      dropdown.appendChild(item);
    });

  parentItem.classList.add('has-dropdown', 'dropdown');
    homeAnchor.setAttribute('aria-haspopup', 'true');
    homeAnchor.setAttribute('aria-controls', HOME_DROPDOWN_ID);
    parentItem.appendChild(dropdown);

    homeLinkRef = homeAnchor;
    homeDropdownRef = dropdown;
    homeToggleButtonRef = toggleButton;

    toggleButton.addEventListener('click', (event) => {
      const isMobile = window.innerWidth <= 960;
      if (!isMobile) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const expanded = homeDropdownRef?.dataset.expanded === 'true';
      setHomeDropdownExpanded(!expanded);
    });

    parentItem.addEventListener('mouseenter', () => {
      if (window.innerWidth > 960) {
        homeLinkRef?.setAttribute('aria-expanded', 'true');
      }
    });

    parentItem.addEventListener('mouseleave', () => {
      if (window.innerWidth > 960) {
        homeLinkRef?.setAttribute('aria-expanded', 'false');
      }
    });

    parentItem.addEventListener('focusin', () => {
      homeLinkRef?.setAttribute('aria-expanded', 'true');
    });

    parentItem.addEventListener('focusout', (event) => {
      if (!parentItem.contains(event.relatedTarget)) {
        if (window.innerWidth > 960) {
          homeLinkRef?.setAttribute('aria-expanded', 'false');
        } else {
          collapseHomeDropdown();
        }
      }
    });

    collapseHomeDropdown();
  }

  const applyTheme = (theme) => {
    const normalizedTheme = theme === 'light' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', normalizedTheme);
    localStorage.setItem('preferred-theme', normalizedTheme);
    if (themeToggle) {
      const isDark = normalizedTheme === 'dark';
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
    }
  };

  const placeThemeToggle = () => {
    if (!themeToggle || !navLinks || !originalToggleParent) {
      return;
    }

    if (window.innerWidth <= 960) {
      if (!mobileThemeWrapper.contains(mobileThemeContent)) {
        mobileThemeWrapper.appendChild(mobileThemeContent);
      }
      if (!mobileThemeContent.contains(themeToggle)) {
        mobileThemeContent.appendChild(themeToggle);
      }
      if (!navLinks.contains(mobileThemeWrapper)) {
        navLinks.appendChild(mobileThemeWrapper);
      }
    } else {
      if (mobileThemeContent.contains(themeToggle)) {
        mobileThemeContent.removeChild(themeToggle);
      }
      if (navLinks.contains(mobileThemeWrapper)) {
        navLinks.removeChild(mobileThemeWrapper);
      }
      if (originalToggleNextSibling && originalToggleNextSibling.parentElement === originalToggleParent) {
        originalToggleParent.insertBefore(themeToggle, originalToggleNextSibling);
      } else {
        originalToggleParent.appendChild(themeToggle);
      }

      syncHomeDropdownState();
    }
  };

  const storedTheme = localStorage.getItem('preferred-theme');
  if (storedTheme) {
    applyTheme(storedTheme);
  } else if (!prefersDark.matches) {
    applyTheme('light');
  }

  prefersDark.addEventListener('change', (event) => {
    const stored = localStorage.getItem('preferred-theme');
    if (stored) return;
    applyTheme(event.matches ? 'dark' : 'light');
  });

  themeToggle?.addEventListener('click', () => {
    const currentTheme = htmlEl.getAttribute('data-theme');
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });

  createHomeDropdown();

  syncHomeDropdownState();

  navToggle?.addEventListener('click', () => {
    const expanded = navLinks?.dataset.expanded === 'true';
    const nextState = String(!expanded);
    navToggle.setAttribute('aria-expanded', nextState);
    if (navLinks) {
      navLinks.dataset.expanded = nextState;
    }
    setBodyNavState(nextState === 'true');
    header?.classList.remove('is-hidden');
    headerHidden = false;
    collapseHomeDropdown();
  });

  navLinks?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 960 && navLinks.dataset.expanded === 'true') {
        navToggle?.setAttribute('aria-expanded', 'false');
        navLinks.dataset.expanded = 'false';
        setBodyNavState(false);
        collapseHomeDropdown();
      }
    });
  });

  const collapseNav = () => {
    if (window.innerWidth > 960) {
      navToggle?.setAttribute('aria-expanded', 'false');
      if (navLinks) {
        navLinks.dataset.expanded = 'false';
      }
    }
    header?.classList.remove('is-hidden');
    headerHidden = false;
    setBodyNavState(false);
    collapseHomeDropdown();
    placeThemeToggle();
  };

  window.addEventListener('resize', collapseNav);
  window.addEventListener('resize', applyMobileFixedHeaderFlag);

  // Mobile fixed header fallback: set a class on <html> and header height var
  function applyMobileFixedHeaderFlag() {
    const isMobile = window.innerWidth <= 960;
    const html = document.documentElement;
    if (isMobile) {
      html.classList.add('mobile-fixed-header');
      if (header) {
        const rect = header.getBoundingClientRect();
        const height = Math.round(rect.height);
        html.style.setProperty('--header-height', height + 'px');
      }
    } else {
      html.classList.remove('mobile-fixed-header');
      html.style.removeProperty('--header-height');
    }
  }

  document.addEventListener('click', (event) => {
    if (
      window.innerWidth <= 960 &&
      navLinks?.dataset.expanded === 'true' &&
      navLinks &&
      navToggle &&
      !navLinks.contains(event.target) &&
      !navToggle.contains(event.target)
    ) {
      navToggle.setAttribute('aria-expanded', 'false');
      navLinks.dataset.expanded = 'false';
      header?.classList.remove('is-hidden');
      headerHidden = false;
      setBodyNavState(false);
      collapseHomeDropdown();
    }
  });

  const updateHeaderVisibility = () => {
    if (!header) {
      ticking = false;
      return;
    }

    const currentY = Math.max(window.scrollY, 0);
    const navExpanded = navLinks?.dataset.expanded === 'true';
    const scrollingDown = currentY > lastScrollY;
    const isMobile = window.innerWidth <= 960;
    const beyondThreshold = currentY > SCROLL_THRESHOLD_DESKTOP;
    const delta = Math.abs(currentY - lastScrollY);

    // Always show if nav is open
    if (navExpanded) {
      if (headerHidden) {
        header.classList.remove('is-hidden');
        headerHidden = false;
      }
      lastScrollY = currentY;
      ticking = false;
      return;
    }

    if (isMobile) {
      // Show when near the very top
      if (currentY <= 2) {
        if (headerHidden) {
          header.classList.remove('is-hidden');
          headerHidden = false;
        }
        lastScrollY = currentY;
        ticking = false;
        return;
      }
      // Hide on scroll down by delta
      if (currentY > lastScrollY + SCROLL_DELTA_MOBILE) {
        if (!headerHidden) {
          header.classList.add('is-hidden');
          headerHidden = true;
        }
        lastScrollY = currentY;
        ticking = false;
        return;
      }
      // Show on scroll up by delta
      if (currentY < lastScrollY - SCROLL_DELTA_MOBILE) {
        if (headerHidden) {
          header.classList.remove('is-hidden');
          headerHidden = false;
        }
        lastScrollY = currentY;
        ticking = false;
        return;
      }
    } else {
      // Desktop: hide on scroll down beyond threshold; show otherwise
      if (scrollingDown && beyondThreshold && !headerHidden) {
        header.classList.add('is-hidden');
        headerHidden = true;
      } else if ((!scrollingDown || !beyondThreshold) && headerHidden) {
        header.classList.remove('is-hidden');
        headerHidden = false;
      }
    }

    lastScrollY = Math.max(currentY, 0);
    ticking = false;
  };

  // On some mobile browsers, RAF scheduling can defer updates; listen twice to ensure responsiveness
  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeaderVisibility);
      ticking = true;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('touchmove', onScroll, { passive: true });

  // Keep lastScrollY consistent across viewport changes
  window.addEventListener('resize', () => {
    lastScrollY = Math.max(window.scrollY, 0);
  }, { passive: true });

  placeThemeToggle();

  updateHeaderVisibility();
  applyMobileFixedHeaderFlag();

  // --- Scroll reveal: apply globally on both desktop and mobile ---
  (function initScrollReveal() {
    const root = document.documentElement;
    root.classList.add('reveal-enabled');

    // Graceful fallback if IntersectionObserver is unavailable
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
        el.classList.add('is-visible');
      });
      return;
    }

  const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      // Start a bit earlier to avoid content appearing too late
      rootMargin: '0px 0px -15% 0px',
      threshold: 0,
    });

    // Auto-tag common content blocks if they don't already have the class
    const candidates = [
      '.hero', '.section-intro', '.topics-grid', '.topic-card',
      '.callout', '.post', '.post-card', '.post-section', '.post-footer',
      // Keep generic main children for smaller pages, but avoid deep post body
      'main > *:not(.post-body)'
    ];
    const seen = new Set();
    candidates.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        el.classList.add('reveal-on-scroll');
        io.observe(el);
      });
    });

    // Safety: if content is still not visible after a brief time, reveal to avoid broken pages
    setTimeout(() => {
      document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
        if (!el.classList.contains('is-visible')) {
          el.classList.add('is-visible');
        }
      });
    }, 2000);
  })();

  // --- Ensure post footer actions exist on article pages (Back + Share) ---
  (function initPostFooterActions() {
    const article = document.querySelector('article.post');
    if (!article) return;

    // Expect posts under /pages/topics/<slug>/<post>.html
    const parts = window.location.pathname.replace(/\\/g, '/').split('/').filter(Boolean);
    const topicsIdx = parts.indexOf('topics');
    if (topicsIdx === -1 || topicsIdx + 1 >= parts.length) return;
    const categorySlug = parts[topicsIdx + 1];

    const categoryTitles = {
      'hadith-benefits': 'Ḥadīth Benefits',
      'hadith-institute': 'Ḥadīth Institute',
      'heritage-verification': 'Heritage Verification',
      'methodologies-criticism': 'Methodologies & Criticism',
      'hadith-terminology': 'Ḥadīth Terminology',
      'biographical-evaluation': 'Biographical Evaluation',
      'hadith-defects': 'Defects in Ḥadīths',
      'fiqh-of-hadith': 'Fiqh of Ḥadīth',
      'battles-biographies': 'Battles & Biographies',
      'hadith-schools': 'Ḥadīth Schools',
      'questions-answers': 'Questions & Answers',
      'academic-plagiarism': 'Academic Plagiarism',
      'miscellaneous': 'Miscellaneous',
      'other-sciences': 'Other Sciences',
    };
    const categoryTitle = categoryTitles[categorySlug] || categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  const backHref = `../${categorySlug}.html`;
  const shareHref = `../../../pages/contact.html`;

    let footer = article.querySelector('.post-footer');
    if (!footer) {
      footer = document.createElement('footer');
      footer.className = 'post-footer';
      article.appendChild(footer);
    }

    // Back button (secondary) - ensure exists and normalized
    let backLink = footer.querySelector('a.button.secondary');
    if (!backLink) {
      backLink = document.createElement('a');
      backLink.className = 'button secondary';
      footer.appendChild(backLink);
    }
    backLink.href = backHref;
    backLink.innerHTML = `&#8592; Back to ${categoryTitle}`;

    // Share feedback (tertiary) - ensure exists and normalized
    let shareLink = footer.querySelector('a.button.tertiary[href*="contact.html"]');
    if (!shareLink) {
      shareLink = document.createElement('a');
      shareLink.className = 'button tertiary';
      footer.appendChild(shareLink);
    }
    shareLink.href = shareHref;
    shareLink.textContent = 'Share feedback';

    // Remove any Home-return links to keep only the two buttons
    footer.querySelectorAll('a.button').forEach((a) => {
      const text = (a.textContent || '').trim().toLowerCase();
      const href = a.getAttribute('href') || '';
      const isBack = a === backLink;
      const isShare = a === shareLink;
      const isHome = /index\.html$/i.test(href) || text.includes('return to home') || text.includes('back to home');
      if (!isBack && !isShare && isHome) {
        a.remove();
      }
    });

    // Optionally enforce only Back and Share remain
    footer.querySelectorAll('a.button').forEach((a) => {
      if (a !== backLink && a !== shareLink) {
        a.remove();
      }
    });

    // Ensure order: Back first, then Share
    footer.appendChild(backLink);
    footer.appendChild(shareLink);
  })();

  // --- Ensure footer credit exists site-wide (without duplicating edited pages)
  (function ensureFooterCredit() {
    const footer = document.querySelector('.site-footer');
    if (!footer) return;
    const hasCredit = !!footer.querySelector('a[href="https://ravencorp-tech.github.io/Adil-Portfolio/"]');
    if (!hasCredit) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = 'https://ravencorp-tech.github.io/Adil-Portfolio/';
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Raven Corp.Tech';
      p.appendChild(document.createTextNode('Site developed by '));
      p.appendChild(a);
      footer.appendChild(p);
    }
  })();

  // --- Contact form: submit via AJAX and show in-page confirmation, avoid Formspree thanks redirect
  (function initContactForm() {
    const form = document.querySelector('.contact-form[action*="formspree.io"]');
    if (!form) return;

    const endpoint = form.getAttribute('action');
    const submitBtn = form.querySelector('button[type="submit"]');

    function showAlert(message, type = 'success') {
      // Remove existing alerts nearby
      form.parentElement?.querySelectorAll('.form-alert').forEach((n) => n.remove());
      const alert = document.createElement('div');
      alert.className = `form-alert ${type}`;
      alert.setAttribute('role', 'status');
      alert.setAttribute('aria-live', 'polite');
      alert.textContent = message;
      // Insert just after the form
      form.insertAdjacentElement('afterend', alert);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' },
        });
        if (resp.ok) {
          form.reset();
          showAlert('Thanks! Your message has been sent. We will get back to you soon.', 'success');
        } else {
          showAlert('Sorry, something went wrong submitting your message. Please try again or email us directly.', 'error');
        }
      } catch (err) {
        showAlert('Network error. Please check your connection and try again.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit inquiry';
        }
      }
    });
  })();
})();
