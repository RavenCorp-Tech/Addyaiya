# The Official Website of Shaykh Dr. Khālid al-Ḥāyik

This repository hosts the official English-language portal for the works, translations, and scholarly initiatives of Shaykh al-Muḥaddith Khālid ibn Maḥmūd al-Ḥāyik (Abū Ṣuhayb al-Ḥusaynī). The site provides a modern, responsive interface with a default dark theme and a one-click toggle to switch between dark and light modes.

## Project structure

```
index.html                  # Home page with topic navigation and hero overview
assets/
	css/styles.css            # Global styles, theme tokens, layout, and component design
	js/theme.js               # Theme persistence and mobile navigation interactivity
pages/
	books.html                # Books landing page (coming soon overview)
	research.html             # Research landing page (coming soon overview)
	manuscripts.html          # Manuscripts landing page (coming soon overview)
	journal.html              # Journal updates landing page
	contact.html              # Contact form and department selector
	ad-diyaaiyyah.html        # Institute overview and partnership information
	topics/                   # Individual topic collections linked from the home page
		*.html                  # Placeholder topic pages with section-specific context
```

## Getting started

1. Clone the repository:

	 ```bash
	 git clone https://github.com/RavenCorp-Tech/Addyaiya.git
	 ```

2. Open `index.html` in your browser to explore the site locally. No build step is required—the project is a static site.

3. Toggle between dark and light themes using the moon/sun button in the header. Your preference is saved in the browser.

## Adding new content

- Use the existing topic pages in `pages/topics/` as templates for future translations and articles.
- Keep navigation links consistent across pages to ensure the theme toggler and mobile menu continue working.
- When publishing new resources, add summaries to the relevant landing page and update internal links accordingly.

## License

All rights reserved to Dār al-Ḥadīth aḍ-Ḍiyāʾiyyah © 2023.