'use strict';
(() => {
  const translations = {
    bg: {
      title:'Зелени такси · Пловдив в твоя ритъм', description:'Зелени такси — Пловдив в твоя ритъм. Поръчай от приложението или се обади на 032 9999. Хибридни автомобили, денонощен диспечер и истински хора.',
      skip:'Към съдържанието',home:'Зелени такси — начало',navigation:'Основна навигация',brandCity:'ТАКСИ · ПЛОВДИВ',navApp:'Приложението',navAbout:'За Зелените',navTeam:'Карай с нас',
      heroOne:'Пловдив.',heroTwo:'В твоя ритъм.',heroDescription:'До работа. До любимото място. До вкъщи.\nТвоето зелено такси е на едно докосване.',orderApp:'Поръчай от приложението',callDispatcher:'Обади се на диспечер',carCaption:'Познатият цвят. Ново движение.',serviceArea:'Пловдив. Всеки ден, денонощно.',googleShort:'Оценки и отзиви в Google',seeApp:'Виж приложението',
      appOne:'Твоето такси.',appTwo:'Вече в телефона ти.',appDescription:'От адреса до пристигането — всичко за пътуването ти, събрано на едно място.',stepOne:'Избери накъде',stepOneDescription:'Въведи откъде тръгваш и къде отиваш.',stepTwo:'Виж своето такси',stepTwoDescription:'Следи приближаването на автомобила в приложението.',stepThree:'Настани се удобно',stepThreeDescription:'Пътувай. Останалото е по пътя ни.',openApp:'Отвори приложението',installNote:'Директно в браузъра. Без търсене в магазина.',appScreenshot:'Истинският вход в клиентското приложение на Зелени такси',appCaption:'Зелени. С теб, по целия път.',
      aboutOne:'Същите Зелени.',aboutTwo:'Още по-близо.',aboutDescription:'Познаваме града. Познаваме пътя ти. Свързваме удобството на приложението с хората, на които можеш да се обадиш.',hybridTitle:'По-тихо. По-зелено.',hybridDescription:'Хибриден автопарк за ежедневните пътувания в Пловдив.',peopleTitle:'От другата страна е човек.',peopleDescription:'Денонощен диспечер, когато предпочиташ да поръчаш с обаждане.',cityTitle:'За твоя ден. И твоята нощ.',cityDescription:'Ранен старт или късно прибиране — един познат номер за града.',reviewsTitle:'Доброто пътуване оставя следа.',reviewsDescription:'Виж актуалната ни оценка и прочети мненията на пътниците в Google.',readReviews:'Виж отзивите',
      teamOne:'Харесва ти',teamTwo:'да си в движение?',teamDescription:'Застани от другата страна на волана. За работа в екипа на Зелени се свържи директно с нас.',konstantin:'Константин Петров',andrey:'Андрей Нинов',lastTitle:'Накъде отиваме?',footerCity:'Пловдив. В твоя ритъм.',footerBrand:'Зелени такси',orderTaxi:'Поръчай такси',dockApp:'Поръчай онлайн'
    },
    en: {
      title:'Zeleni Taxi · Plovdiv at your pace',description:'Zeleni Taxi — Plovdiv at your pace. Book in the app or call 032 9999. Hybrid cars, a 24-hour dispatcher and real people.',
      skip:'Skip to content',home:'Zeleni Taxi — home',navigation:'Main navigation',brandCity:'TAXI · PLOVDIV',navApp:'The app',navAbout:'About Zeleni',navTeam:'Drive with us',
      heroOne:'Plovdiv.',heroTwo:'At your pace.',heroDescription:'To work. To your favourite spot. Back home.\nYour green taxi is a tap away.',orderApp:'Book in the app',callDispatcher:'Call a dispatcher',carCaption:'A familiar colour. A new way to move.',serviceArea:'Plovdiv. Every day, around the clock.',googleShort:'Ratings & reviews on Google',seeApp:'Discover the app',
      appOne:'Your taxi.',appTwo:'Now in your pocket.',appDescription:'From your address to your arrival — everything for your journey, together in one place.',stepOne:'Choose your destination',stepOneDescription:'Enter your pickup point and where you want to go.',stepTwo:'See your taxi',stepTwoDescription:'Follow your car as it approaches in the app.',stepThree:'Make yourself comfortable',stepThreeDescription:'Enjoy the ride. We will take it from here.',openApp:'Open the app',installNote:'Right in your browser. No app store needed.',appScreenshot:'The actual Bulgarian sign-in screen of the Zeleni Taxi passenger app',appCaption:'Zeleni. With you, all the way.',
      aboutOne:'The same Zeleni.',aboutTwo:'Even closer.',aboutDescription:'We know the city. We know your way. The convenience of an app, backed by people you can call.',hybridTitle:'Quieter. Greener.',hybridDescription:'A hybrid fleet for your everyday journeys in Plovdiv.',peopleTitle:'A real person on the line.',peopleDescription:'A 24-hour dispatcher when you prefer to book with a call.',cityTitle:'For your day. And your night.',cityDescription:'An early start or a late ride home — one familiar number for the city.',reviewsTitle:'A good journey leaves an impression.',reviewsDescription:'See our current rating and read passenger reviews on Google.',readReviews:'Read the reviews',
      teamOne:'Love being',teamTwo:'on the move?',teamDescription:'Take your place behind the wheel. Get in touch with us directly about joining the Zeleni team.',konstantin:'Konstantin Petrov',andrey:'Andrey Ninov',lastTitle:'Where are we going?',footerCity:'Plovdiv. At your pace.',footerBrand:'Zeleni Taxi',orderTaxi:'Book a taxi',dockApp:'Book online'
    }
  };
  function setLanguage(language) {
    const lang = language === 'en' ? 'en' : 'bg';
    const copy = translations[lang];
    document.documentElement.lang = lang;
    document.title = copy.title;
    document.querySelector('meta[name="description"]').content = copy.description;
    document.querySelector('meta[property="og:title"]').content = copy.title;
    document.querySelector('meta[property="og:description"]').content = copy.description;
    document.querySelectorAll('[data-i18n]').forEach(el => { const value = copy[el.dataset.i18n]; if (value) el.textContent = value; });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { const value = copy[el.dataset.i18nAria]; if (value) el.setAttribute('aria-label',value); });
    document.querySelectorAll('[data-i18n-alt]').forEach(el => { const value = copy[el.dataset.i18nAlt]; if (value) el.alt = value; });
    document.querySelectorAll('[data-lang]').forEach(el => el.setAttribute('aria-pressed',String(el.dataset.lang === lang)));
    try { localStorage.setItem('zeleni-site-language',lang); } catch { /* A private browser still has a fully usable language control. */ }
  }
  let savedLanguage = 'bg';
  try { savedLanguage = localStorage.getItem('zeleni-site-language') || 'bg'; } catch { /* Storage is optional. */ }
  setLanguage(savedLanguage);
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click',() => setLanguage(button.dataset.lang)));
  document.getElementById('year').textContent = new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Sofia'}).format(new Date());

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const chapter = document.querySelector('.app-chapter');
  const camera = document.querySelector('.car-camera');
  const phone = document.querySelector('.phone-scene');
  const hero = document.querySelector('.hero');
  const dock = document.querySelector('.mobile-dock');
  const footer = document.querySelector('.last-call');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const clamp = value => Math.max(0,Math.min(1,value));
  let queued = false;
  let previousTheme = '';
  function updateScene() {
    queued = false;
    const vh = innerHeight;
    const scene = chapter.getBoundingClientRect();
    const enter = clamp((vh * .88 - scene.top) / (vh * .62));
    const exit = clamp((scene.bottom - vh * .1) / (vh * .65));
    const darkness = reduced.matches ? 1 : Math.min(enter,exit);
    chapter.style.setProperty('--chapter',darkness.toFixed(3));
    // During the colour crossover, use full-opacity black/white at the WCAG
    // luminance intersection; interpolating the text colour would erase it.
    const rgb = [246-229*darkness,247-220*darkness,242-219*darkness];
    const luminance = rgb.map(value => { const s=value/255; return s<=.04045?s/12.92:((s+.055)/1.055)**2.4; }).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
    const crossover = darkness > .1 && darkness < .9;
    chapter.style.setProperty('--chapter-ink',crossover ? (luminance > .179 ? '#000000' : '#ffffff') : (darkness < .5 ? '#152019' : '#f2f4ec'));
    chapter.style.setProperty('--chapter-copy-opacity',crossover ? '1' : '.7');
    if (!reduced.matches) {
      const heroProgress = clamp(-hero.getBoundingClientRect().top / vh);
      camera.style.setProperty('--car-x',`${(heroProgress * 70).toFixed(1)}px`);
      camera.style.setProperty('--car-y',`${(heroProgress * -23).toFixed(1)}px`);
      camera.style.setProperty('--car-scale',(1 + heroProgress * .06).toFixed(3));
      const progress = clamp((vh - phone.getBoundingClientRect().top) / (vh + phone.offsetHeight));
      phone.style.setProperty('--phone-y',`${(35 - progress * 65).toFixed(1)}px`);
      phone.style.setProperty('--phone-rotate',`${(-9 + progress * 10).toFixed(2)}deg`);
    }
    const theme = scene.top < vh * .25 && scene.bottom > vh * .65 ? '#111b17' : '#f6f7f2';
    if (theme !== previousTheme) { themeMeta.content = theme; previousTheme = theme; }
    dock.classList.toggle('dock-hidden',hero.getBoundingClientRect().bottom > vh * .5 || footer.getBoundingClientRect().top < vh * .85);
  }
  function queueScene() { if (!queued) { queued = true; requestAnimationFrame(updateScene); } }
  addEventListener('scroll',queueScene,{passive:true});
  addEventListener('resize',queueScene,{passive:true});
  addEventListener('pageshow',queueScene);
  reduced.addEventListener('change',queueScene);
  updateScene();
})();
