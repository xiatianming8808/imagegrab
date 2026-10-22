/* 图提取官网 · 交互脚本（无依赖） */
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var links = Array.prototype.slice.call(document.querySelectorAll('.links a[href^="#"]'));

  /* 吸顶 + 毛玻璃 */
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 12);
    highlight();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* 移动端菜单 */
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  /* 滚动入场 */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          var sibs = Array.prototype.slice.call(el.parentElement.children);
          var i = sibs.indexOf(el);
          el.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
          el.classList.add('in');
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* 导航高亮：按当前滚动位置标记所在区块 */
  var sections = ['intro', 'features', 'install', 'download']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  function highlight() {
    var pos = window.scrollY + 120;
    var current = null;
    sections.forEach(function (s) {
      if (s.offsetTop <= pos) current = s.id;
    });
    links.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }

  onScroll();
})();
