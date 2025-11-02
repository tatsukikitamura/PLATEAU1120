document.addEventListener('DOMContentLoaded', function() {
  var btn = document.querySelector('button[aria-controls="mainNav"]');
  var nav = document.getElementById('mainNav');
  if (!btn || !nav) return;

  function syncForWidth() {
    if (window.innerWidth >= 768) {
      nav.classList.remove('hidden');
      btn.setAttribute('aria-expanded', 'true');
    } else {
      nav.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  btn.addEventListener('click', function() {
    var isHidden = nav.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', String(!isHidden));
  });

  window.addEventListener('resize', syncForWidth);
  syncForWidth();
});



