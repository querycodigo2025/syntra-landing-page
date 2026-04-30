import './style.css'

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

// ── TRACKING HELPERS
window.trackMeta = (event, data) => {
  console.log(`[META TRACK] ${event}`, data);
  if (typeof fbq !== 'undefined') {
    fbq('track', event, data || {});
  }
};

// ── SCROLL & TIME TRACKING
let tracked50 = false;
window.addEventListener('scroll', () => {
  const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  if (pct > 0.5 && !tracked50) { 
    window.trackMeta('ViewContent', {content_name: 'scroll_50pct'}); 
    tracked50 = true; 
  }
});

setTimeout(() => window.trackMeta('ViewContent', {content_name: 'time_30s'}), 30000);

// ── WHATSAPP CLICKS
document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
  link.addEventListener('click', () => {
    const location = link.classList.contains('floating-wpp') ? 'floating' : 'page';
    window.trackMeta('Contact', {content_name: `whatsapp_${location}`});
  });
});

// ── VSL INTERACTIONS
const vslPlay = document.querySelector('.vsl-play');
if (vslPlay) {
  vslPlay.addEventListener('click', () => {
    window.trackMeta('ViewContent', {content_name: 'vsl_play'});
    alert('O vídeo VSL será carregado aqui assim que o link estiver disponível.');
  });
}
