(() => {
  const htmlEl = document.documentElement;
  const themeToggle = document.querySelector('.theme-toggle');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

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

  navToggle?.addEventListener('click', () => {
    const expanded = navLinks?.dataset.expanded === 'true';
    const nextState = String(!expanded);
    navToggle.setAttribute('aria-expanded', nextState);
    if (navLinks) {
      navLinks.dataset.expanded = nextState;
    }
  });

  navLinks?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 960 && navLinks.dataset.expanded === 'true') {
        navToggle?.setAttribute('aria-expanded', 'false');
        navLinks.dataset.expanded = 'false';
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
    }
  });
})();
