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
  const SCROLL_THRESHOLD = 120;
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

    const currentY = window.scrollY;
    const navExpanded = navLinks?.dataset.expanded === 'true';
    const scrollingDown = currentY > lastScrollY;
    const beyondThreshold = currentY > SCROLL_THRESHOLD;

    if (!navExpanded && scrollingDown && beyondThreshold && !headerHidden) {
      header.classList.add('is-hidden');
      headerHidden = true;
    } else if ((navExpanded || !scrollingDown || !beyondThreshold) && headerHidden) {
      header.classList.remove('is-hidden');
      headerHidden = false;
    }

    lastScrollY = Math.max(currentY, 0);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeaderVisibility);
      ticking = true;
    }
  });

  placeThemeToggle();

  updateHeaderVisibility();
})();
