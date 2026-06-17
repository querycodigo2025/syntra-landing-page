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

// ── UTM CAPTURE — lê parâmetros da URL uma vez no carregamento
const _utms = (() => {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source:   p.get('utm_source')   || '',
    utm_medium:   p.get('utm_medium')   || '',
    utm_campaign: p.get('utm_campaign') || '',
    landing_page_url: window.location.href,
  };
})();

// ── LEAD MODAL — captura nome + WhatsApp obrigatórios, e-mail opcional
window.openLeadModal = function(e, contentName) {
  if (e) e.preventDefault();
  const modal = document.getElementById('lead-modal');
  if (modal) { modal.style.display = 'flex'; modal.dataset.source = contentName || ''; }
};

window.submitLeadForm = async function() {
  const name  = (document.getElementById('lf-name')?.value  || '').trim();
  const phone = (document.getElementById('lf-phone')?.value || '').replace(/\D/g, '');
  const email = (document.getElementById('lf-email')?.value || '').trim();

  if (!name || phone.length < 10) {
    alert('Por favor, informe seu nome e WhatsApp com DDD.');
    return;
  }

  const btn = document.getElementById('lf-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Aguarde...'; }

  const modal  = document.getElementById('lead-modal');
  const source = modal?.dataset.source || 'modal_whatsapp';
  const { fbp, fbc } = getMetaCookies();

  try {
    // Salva lead no Syntra AI + dispara evento para TrackCore → Meta CAPI
    await fetch('https://ofumwooahtvyyqexqylh.supabase.co/functions/v1/capture-landing-lead', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdW13b29haHR2eXlxZXhxeWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MTk3MjAsImV4cCI6MjA1OTA5NTcyMH0.ykdOSGFvqBcIzHJFdRJvj2JDhBkpS_EwGEKK9GVxpI4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdW13b29haHR2eXlxZXhxeWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MTk3MjAsImV4cCI6MjA1OTA5NTcyMH0.ykdOSGFvqBcIzHJFdRJvj2JDhBkpS_EwGEKK9GVxpI4',
      },
      body: JSON.stringify({ name, phone, email: email || undefined, ...(_utms), fbp, fbc, source }),
      keepalive: true,
    });
  } catch (_) {}

  // Pixel Meta browser-side (dedup com CAPI via event_id)
  const eventId = generateEventId('Lead');
  if (typeof fbq !== 'undefined') fbq('track', 'Lead', { content_name: source }, { eventID: eventId });
  if (typeof gtag !== 'undefined') {
    gtag('event', 'Lead', { content_name: source });
    gtag('event', 'conversion', { send_to: 'AW-17046996058/5VesCK3ivMAaENqI0sA_', value: 1.0, currency: 'BRL' });
  }

  if (modal) modal.style.display = 'none';

  // Abre WhatsApp imediatamente — sem nova tela
  const msg = encodeURIComponent(`Olá! Meu nome é ${name} e quero conhecer a Syntra.`);
  window.open(`https://wa.me/5548988018690?text=${msg}`, '_blank');

  if (btn) { btn.disabled = false; btn.textContent = 'Continuar para demonstração'; }
};

// Intercepta TODOS os links WhatsApp da página
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href*="api.whatsapp.com"], a[href*="wa.me"]').forEach(link => {
    if (link.classList.contains('floating-wpp')) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = document.getElementById('lead-modal');
      if (modal) {
        modal.style.display = 'flex';
        modal.dataset.source = link.dataset.source || link.getAttribute('data-i18n') || 'page_whatsapp';
      }
    });
  });
});

// ── VSL — overlay ao fim do vídeo + botão fixo durante reprodução
document.addEventListener('DOMContentLoaded', () => {
  const vslVideo   = document.getElementById('vsl-video');
  const overlay    = document.getElementById('vsl-end-overlay');
  const belowBtn   = document.getElementById('vsl-below-btn');
  const postCta    = document.getElementById('vsl-post-cta');

  if (!vslVideo) return;

  // Botão abaixo aparece quando o vídeo começa
  vslVideo.addEventListener('play', () => {
    if (belowBtn) belowBtn.style.display = 'block';
  });

  // Ao fim do vídeo: exibe overlay sobre o player + CTA abaixo
  vslVideo.addEventListener('ended', () => {
    if (overlay)  { overlay.style.display  = 'flex'; }
    if (postCta)  { postCta.style.display  = 'block'; }
    if (belowBtn) { belowBtn.style.display = 'none'; }
    window.trackEvent('ViewContent', { content_name: 'vsl_completed' });
  });

  // Esconde overlay se o usuário clicar em play novamente
  vslVideo.addEventListener('play', () => {
    if (overlay) overlay.style.display = 'none';
  });
});
