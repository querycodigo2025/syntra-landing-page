import './style.css'
import { translations } from './translations.js'

// ── LOCALIZATION
let currentLang = localStorage.getItem('lang') || (navigator.language.startsWith('en') ? 'en' : 'pt');

function updateLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });

  // Update button states
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  // Update HTML lang attribute
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
}

// Init language
document.addEventListener('DOMContentLoaded', () => {
  updateLanguage(currentLang);
  
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      updateLanguage(lang);
      window.trackEvent('ChangeLanguage', { language: lang });
    });
  });
});

// ── TRACKING HELPERS
window.trackEvent = (event, data = {}) => {
  const payload = { ...data, language: currentLang };
  console.log(`[TRACKING] ${event}`, payload);

  // Meta Pixel
  if (typeof fbq !== 'undefined') {
    fbq('track', event, payload);
  }

  // Google Analytics & Ads
  if (typeof gtag !== 'undefined') {
    // GA4 Event
    gtag('event', event, payload);

    // Google Ads Conversion Mapping
    if (event === 'Lead' || event === 'Purchase') {
      gtag('event', 'conversion', {
        'send_to': 'AW-17046996058/5VesCK3ivMAaENqI0sA_', 
        'value': 1.0,
        'currency': 'BRL'
      });
    }
  }
};

// Aliases for compatibility with old code if any remains
window.trackMeta = window.trackEvent;

// ── SCROLL REVEAL
const reveals = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 80);
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
reveals.forEach(el => io.observe(el));

// ── HEADER SCROLL
const header = document.querySelector('header');
if (header) {
  window.addEventListener('scroll', () => {
    header.style.padding = window.scrollY > 60 ? '12px 0' : '20px 0';
    header.style.background = window.scrollY > 60 ? 'rgba(5, 5, 8, 0.95)' : 'rgba(5, 5, 8, 0.8)';
  });
}

// ── SCROLL & TIME TRACKING
let tracked50 = false;
window.addEventListener('scroll', () => {
  const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  if (pct > 0.5 && !tracked50) { 
    window.trackEvent('ViewContent', {content_name: 'scroll_50pct'}); 
    tracked50 = true; 
  }
});

setTimeout(() => window.trackEvent('ViewContent', {content_name: 'time_30s'}), 30000);

// ── WHATSAPP CLICKS
document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
  link.addEventListener('click', () => {
    const location = link.classList.contains('floating-wpp') ? 'floating' : 'page';
    window.trackEvent('Contact', {content_name: `whatsapp_${location}`});
  });
});

// ── VSL INTERACTIONS
const vslPlay = document.querySelector('.vsl-play');
if (vslPlay) {
  vslPlay.addEventListener('click', () => {
    window.trackEvent('ViewContent', {content_name: 'vsl_play'});
    alert(currentLang === 'pt' ? 'O vídeo VSL será carregado aqui assim que o link estiver disponível.' : 'The VSL video will be loaded here as soon as the link is available.');
  });
}
