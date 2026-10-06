// iPhone/iPad: show how to put the game on the Home Screen (Safari has no install button).
const Install = {
  ua: navigator.userAgent,
  get isIOS() { return /iPhone|iPad|iPod/.test(this.ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  get isIPad() { return /iPad/.test(this.ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  get installed() {
    return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
  },
  // In-app browsers and other iOS browsers can't add to the Home Screen.
  get inSafari() { return this.isIOS && /Safari/.test(this.ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\/|WhatsApp|GSA|Snapchat/.test(this.ua); },
  get wanted() { return this.isIOS && !this.installed; },

  init() {
    const btn = document.getElementById('btn-install'), card = document.getElementById('install');
    const open = e => { e.preventDefault(); e.stopPropagation(); Sound.unlock(); Sound.click(); this.open(); };
    btn.addEventListener('pointerdown', open);
    card.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target === card || e.target.closest('.x')) this.close(); });
  },
  showButton(on) { document.getElementById('btn-install').classList.toggle('hidden', !(on && this.wanted)); },
  open() {
    const card = document.getElementById('install');
    card.classList.toggle('not-safari', !this.inSafari);
    card.classList.toggle('ipad', this.isIPad);
    card.classList.remove('hidden');
  },
  close() { document.getElementById('install').classList.add('hidden'); },
};
