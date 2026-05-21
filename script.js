/* ============================================================
   Theme — light / dark with localStorage
   ============================================================ */
const THEME_STORAGE_KEY = 'site-theme';
const SUPPORTED_THEMES = ['light', 'dark'];
const DEFAULT_THEME = 'light';
const themeToggle = document.querySelector('.theme-toggle');

function getInitialTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (SUPPORTED_THEMES.includes(stored)) return stored;
  return DEFAULT_THEME;
}

function applyTheme(theme) {
  if (!SUPPORTED_THEMES.includes(theme)) theme = DEFAULT_THEME;

  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  if (themeToggle) {
    const nextLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    themeToggle.setAttribute('aria-label', nextLabel);
    themeToggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  }
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

applyTheme(getInitialTheme());

/* ============================================================
   UI interactions
   ============================================================ */
const topbar = document.querySelector('.topbar');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelectorAll('.nav-links a');
const ctaScroll = document.querySelector('[data-scroll]');

menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('active');
  topbar.classList.toggle('menu-open');
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    menuToggle.classList.remove('active');
    topbar.classList.remove('menu-open');
  });
});

if (ctaScroll) {
  ctaScroll.addEventListener('click', () => {
    const target = document.querySelector(ctaScroll.dataset.scroll);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

window.addEventListener(
  'scroll',
  () => {
    if (window.scrollY > 12) {
      topbar.classList.add('scrolled');
    } else {
      topbar.classList.remove('scrolled');
    }
  },
  { passive: true }
);


const revealTargets = document.querySelectorAll(
  '.section-head, .about-grid, .about-panel, .services-grid, .works-grid, .contact-inner'
);

revealTargets.forEach((el) => el.classList.add('reveal'));

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
);

revealTargets.forEach((el) => io.observe(el));

/* ============================================================
   PDF Preview and Credential Modal (View Only)
   ============================================================ */

// PDF Preview - Render first page as thumbnail
async function renderPDFPreview(pdfPath, canvas) {
  try {
    const pdf = await pdfjsLib.getDocument(pdfPath).promise;
    const page = await pdf.getPage(1);
    
    const scale = 2;
    const viewport = page.getViewport({ scale });
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    
    // Remove loader
    canvas.parentElement.querySelector('.pdf-loader').style.display = 'none';
  } catch (error) {
    console.error('Error rendering PDF preview:', error);
    const loader = canvas.parentElement.querySelector('.pdf-loader');
    if (loader) {
      loader.textContent = 'Failed to load';
      loader.style.color = '#999';
    }
  }
}

// Initialize PDF previews
const credentialCards = document.querySelectorAll('.credential-card');
credentialCards.forEach((card) => {
  const pdfPath = card.getAttribute('data-pdf');
  const canvas = card.querySelector('.pdf-preview');
  
  if (pdfPath && canvas) {
    renderPDFPreview(pdfPath, canvas);
  }
});

// ============================================================
// Credential Modal - View Only PDF Viewer
// ============================================================

const credentialModal = document.getElementById('credentialModal');
const credentialModalClose = document.getElementById('credentialModalClose');
const credentialModalTitle = document.getElementById('credentialModalTitle');
const pdfViewer = document.getElementById('pdfViewer');
const pageInfo = document.getElementById('pageInfo');
const pdfPrevPage = document.getElementById('pdfPrevPage');
const pdfNextPage = document.getElementById('pdfNextPage');

let currentPdf = null;
let currentPageNum = 1;
let totalPages = 0;

// Render PDF page
async function renderPDFPage(pdf, pageNum) {
  try {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: context, viewport }).promise;
    
    // Clear previous content
    pdfViewer.innerHTML = '';
    pdfViewer.appendChild(canvas);
    
    // Update page info
    pageInfo.textContent = `Page ${pageNum} of ${totalPages}`;
    
    // Disable prev/next buttons if at start/end
    pdfPrevPage.disabled = pageNum === 1;
    pdfNextPage.disabled = pageNum === totalPages;
    
  } catch (error) {
    console.error('Error rendering PDF page:', error);
    pdfViewer.innerHTML = '<p style="color: var(--text-secondary); padding: 20px;">Failed to load PDF page</p>';
  }
}

// Load PDF
async function loadPDF(pdfPath) {
  try {
    currentPdf = await pdfjsLib.getDocument(pdfPath).promise;
    totalPages = currentPdf.numPages;
    currentPageNum = 1;
    
    await renderPDFPage(currentPdf, 1);
  } catch (error) {
    console.error('Error loading PDF:', error);
    pdfViewer.innerHTML = '<p style="color: var(--text-secondary); padding: 20px;">Unable to load PDF. Make sure the file exists.</p>';
  }
}

// Open credential in modal
credentialCards.forEach((card) => {
  card.addEventListener('click', (e) => {
    e.preventDefault();
    const pdfPath = card.getAttribute('data-pdf');
    const title = card.querySelector('.credential-meta h4').textContent;
    
    if (pdfPath) {
      credentialModalTitle.textContent = title;
      credentialModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      
      loadPDF(pdfPath);
    }
  });
});

// Page navigation
pdfPrevPage.addEventListener('click', () => {
  if (currentPageNum > 1) {
    currentPageNum--;
    renderPDFPage(currentPdf, currentPageNum);
  }
});

pdfNextPage.addEventListener('click', () => {
  if (currentPageNum < totalPages) {
    currentPageNum++;
    renderPDFPage(currentPdf, currentPageNum);
  }
});

// Close modal
credentialModalClose.addEventListener('click', () => {
  credentialModal.classList.remove('active');
  document.body.style.overflow = 'auto';
  currentPdf = null;
});

credentialModal.addEventListener('click', (e) => {
  if (e.target === credentialModal) {
    credentialModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentPdf = null;
  }
});

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && credentialModal.classList.contains('active')) {
    credentialModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentPdf = null;
  }
});

// Disable right-click on credentials (prevent save option)
credentialCards.forEach((card) => {
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
});

pdfViewer.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});
