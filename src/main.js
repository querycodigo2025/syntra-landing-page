import './style.css'

// Scroll Reveal Logic
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => {
  revealObserver.observe(el);
});

// Navbar background change on scroll
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.style.background = 'rgba(5, 5, 8, 0.95)';
      navbar.style.padding = '1rem 0';
    } else {
      navbar.style.background = 'rgba(5, 5, 8, 0.8)';
      navbar.style.padding = '1.5rem 0';
    }
  }
});

// Marketing Event Tracking Helpers
window.trackEvent = (eventName, params = {}) => {
  console.log(`Tracking Event: ${eventName}`, params);
  
  // Facebook Pixel
  if (window.fbq) {
    window.fbq('track', eventName, params);
  }
  
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
};

// WhatsApp Click Tracking
document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
  link.addEventListener('click', () => {
    window.trackEvent('Contact', {
      method: 'WhatsApp',
      location: link.classList.contains('wpp-floating') ? 'Floating Button' : 'Page Link'
    });
  });
});

// VSL Play Interaction (Placeholder)
const vslPlay = document.querySelector('.play-btn');
if (vslPlay) {
  vslPlay.addEventListener('click', () => {
    window.trackEvent('ViewContent', { content_name: 'VSL' });
    alert('Aqui será carregado o vídeo VSL assim que o link estiver disponível.');
  });
}
