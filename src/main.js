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

  // PageView com mesmo event_id para pixel e CAPI — garante deduplicação no Meta
  const pvEventId = generateEventId('PageView');
  if (typeof fbq !== 'undefined') fbq('track', 'PageView', {}, { eventID: pvEventId });
  sendToTrackCore('PageView', {}, pvEventId);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      updateLanguage(lang);
      window.trackEvent('ChangeLanguage', { language: lang });
    });
  });
});

// ── TRACKING HELPERS

function getMetaCookies() {
  const get = (name) => {
    const m = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return m ? m[2] : undefined;
  };
  return { fbp: get('_fbp'), fbc: get('_fbc') };
}

function generateEventId(event) {
  return `go_${event}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Eventos que valem a pena enviar ao CAPI server-side
const CAPI_EVENTS = new Set(['PageView', 'Lead', 'InitiateCheckout', 'Purchase', 'Contact', 'ViewContent']);

function sendToTrackCore(event, data, eventId) {
  if (!CAPI_EVENTS.has(event)) return;
  const { fbp, fbc } = getMetaCookies();
  const user = {};
  if (fbp) user.fbp = fbp;
  if (fbc) user.fbc = fbc;

  fetch('https://trekglobal.usesyntra.xyz/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: 'tc_syntra_internal',
      event_name: event,
      event_id: eventId,
      url: window.location.href,
      ...(Object.keys(user).length ? { user } : {}),
      custom_data: { ...data, language: currentLang, source: 'go.usesyntra.xyz' },
    }),
    keepalive: true,
  }).catch(() => {});
}

// Contact dedup: mesma localização só dispara UMA vez por sessão
const _contactTracked = new Set();

window.trackEvent = (event, data = {}) => {
  // Dedup: Contact com mesmo content_name só uma vez por sessão
  if (event === 'Contact') {
    const key = data.content_name || 'generic';
    if (_contactTracked.has(key)) return;
    _contactTracked.add(key);
  }

  const payload = { ...data, language: currentLang };
  const eventId = generateEventId(event);

  // TrackCore — CAPI server-side (deduplicado com fbq via event_id)
  sendToTrackCore(event, data, eventId);

  // Meta Pixel — browser-side
  if (typeof fbq !== 'undefined') {
    fbq('track', event, payload, { eventID: eventId });
  }

  // Google Analytics & Ads
  if (typeof gtag !== 'undefined') {
    gtag('event', event, payload);

    if (event === 'Lead') {
      gtag('event', 'conversion', {
        'send_to': 'AW-17046996058/5VesCK3ivMAaENqI0sA_',
        'value': 1.0,
        'currency': 'BRL'
      });
    }
  }
};

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

// ── VSL INTERACTIONS
const vslPlay = document.querySelector('.vsl-play');
if (vslPlay) {
  vslPlay.addEventListener('click', () => {
    window.trackEvent('ViewContent', {content_name: 'vsl_play'});
    alert(currentLang === 'pt' ? 'O vídeo VSL será carregado aqui assim que o link estiver disponível.' : 'The VSL video will be loaded here as soon as the link is available.');
  });
}
