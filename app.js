const waveform = document.querySelector('#waveform');
const barCount = 73;
for (let i = 0; i < barCount; i += 1) {
  const bar = document.createElement('span');
  bar.style.animationDelay = `${(i % 13) * -0.075}s`;
  waveform.append(bar);
}

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('visible'));
}

const soundButton = document.querySelector('#sound-toggle');
const soundLabel = document.querySelector('#sound-label');
const signalStatus = document.querySelector('#signal-status');
const monitor = document.querySelector('.monitor');
const freqReadout = document.querySelector('#freq-readout');
const ampReadout = document.querySelector('#amp-readout');
let audioContext;
let oscillator;
let gain;
let analyser;
let animationFrame;
let barsFrame = 0;

function animateBars() {
  const bars = [...waveform.children];
  const data = new Uint8Array(analyser.frequencyBinCount);
  const draw = () => {
    analyser.getByteFrequencyData(data);
    bars.forEach((bar, index) => {
      const value = data[Math.floor(index / bars.length * data.length)] || 0;
      const wave = Math.abs(Math.sin((index + barsFrame) * 0.18)) * 13;
      bar.style.height = `${Math.max(4, value * 0.36 + wave)}px`;
    });
    barsFrame += 1;
    animationFrame = requestAnimationFrame(draw);
  };
  draw();
}

async function startSignal() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    signalStatus.innerHTML = '<i></i> AUDIO UNAVAILABLE';
    soundLabel.textContent = 'AUDIO UNAVAILABLE';
    soundButton.disabled = true;
    return;
  }
  try {
    audioContext ||= new AudioContextClass();
    if (audioContext.state === 'suspended') await audioContext.resume();
    oscillator = audioContext.createOscillator();
    gain = audioContext.createGain();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    oscillator.type = 'sine';
    oscillator.frequency.value = 440;
    gain.gain.value = 0.035;
    oscillator.connect(gain);
    gain.connect(analyser);
    analyser.connect(audioContext.destination);
    oscillator.start();
    monitor.classList.add('active');
    signalStatus.innerHTML = '<i></i> TRANSMITTING';
    soundLabel.textContent = 'STOP SIGNAL';
    soundButton.setAttribute('aria-pressed', 'true');
    animateBars();
    const started = performance.now();
    const tune = () => {
      if (!oscillator) return;
      const seconds = (performance.now() - started) / 1000;
      const frequency = 440 + Math.sin(seconds * 0.65) * 12;
      oscillator.frequency.setTargetAtTime(frequency, audioContext.currentTime, 0.08);
      freqReadout.textContent = `${frequency.toFixed(1)} HZ`;
      ampReadout.textContent = '−29 DB';
      requestAnimationFrame(tune);
    };
    tune();
  } catch {
    signalStatus.innerHTML = '<i></i> AUDIO UNAVAILABLE';
    soundLabel.textContent = 'AUDIO UNAVAILABLE';
  }
}

function stopSignal() {
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
  }
  if (gain) gain.disconnect();
  if (analyser) analyser.disconnect();
  cancelAnimationFrame(animationFrame);
  [...waveform.children].forEach((bar) => { bar.style.height = '4px'; });
  monitor.classList.remove('active');
  signalStatus.innerHTML = '<i></i> STANDBY';
  soundLabel.textContent = 'ACTIVATE SIGNAL';
  soundButton.setAttribute('aria-pressed', 'false');
  freqReadout.textContent = '440.0 HZ';
  ampReadout.textContent = '— DB';
}

soundButton.addEventListener('click', () => oscillator ? stopSignal() : startSignal());

const feedback = document.querySelector('#puzzle-feedback');
const answerButtons = document.querySelectorAll('.puzzle-answers button');
answerButtons.forEach((button) => button.addEventListener('click', () => {
  answerButtons.forEach((answer) => answer.classList.remove('selected'));
  button.classList.add('selected');
  if (button.dataset.answer === 'crescent') {
    feedback.textContent = 'Signal confirmed. The cycle begins again: crescent follows full.';
    feedback.classList.add('correct');
  } else {
    feedback.textContent = 'Not quite. The illuminated side is growing—what comes after full?';
    feedback.classList.remove('correct');
  }
}));

// Interactive knight puzzle: C3 to D5 is one legal L-shaped move.
const chessBoard = document.querySelector('#chess-board');
const chessFeedback = document.querySelector('#chess-feedback');
const targetSquare = 'd5';
let knightSquare = 'c3';
function renderBoard() {
  chessBoard.replaceChildren();
  for (let rank = 8; rank >= 1; rank -= 1) {
    for (let file = 0; file < 8; file += 1) {
      const name = `${'abcdefgh'[file]}${rank}`;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `chess-square ${(file + rank) % 2 ? 'dark' : 'light'}${name === targetSquare ? ' target' : ''}`;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `${name}${name === knightSquare ? ', knight' : name === targetSquare ? ', target' : ''}`);
      if (name === knightSquare) cell.textContent = '♞';
      if (name === targetSquare) cell.innerHTML += '<span aria-hidden="true">✦</span>';
      cell.addEventListener('click', () => {
        if (name === targetSquare && knightSquare === 'c3') {
          knightSquare = name;
          chessFeedback.textContent = 'Brilliant move. The knight reached the star in one turn!';
          chessFeedback.classList.add('correct');
          renderBoard();
        } else if (name === knightSquare) {
          chessFeedback.textContent = 'The knight is on C3. Find the L-shaped path to D5.';
          chessFeedback.classList.remove('correct');
        } else {
          chessFeedback.textContent = 'Almost. A knight moves two squares one way, then one to the side.';
          chessFeedback.classList.remove('correct');
        }
      });
      chessBoard.append(cell);
    }
  }
}
renderBoard();
document.querySelector('#new-chess').addEventListener('click', () => {
  knightSquare = 'c3';
  chessFeedback.textContent = 'The knight is on C3. Find the L-shaped path to D5.';
  chessFeedback.classList.remove('correct');
  renderBoard();
});

const phrases = [
  { en: 'The universe is full of questions.', de: 'Das Universum ist voller Fragen.', es: 'El universo está lleno de preguntas.' },
  { en: 'Every move creates a new possibility.', de: 'Jeder Zug eröffnet eine neue Möglichkeit.', es: 'Cada movimiento crea una nueva posibilidad.' },
  { en: 'Words can build bridges between worlds.', de: 'Worte können Brücken zwischen Welten bauen.', es: 'Las palabras pueden tender puentes entre mundos.' },
  { en: 'Keep exploring what you do not yet know.', de: 'Erkunde weiter, was du noch nicht kennst.', es: 'Sigue explorando lo que aún no conoces.' }
];
let phraseIndex = 0;
let selectedLanguage = 'de';
function showPhrase() {
  const phrase = phrases[phraseIndex];
  const source = document.querySelector('#source-phrase');
  const translated = document.querySelector('#translated-phrase');
  source.textContent = phrase.en;
  source.lang = 'en';
  source.dir = 'ltr';
  translated.textContent = phrase[selectedLanguage];
  translated.lang = selectedLanguage;
  translated.dir = 'ltr';
  document.querySelector('#word-count').textContent = `FIELD NOTE 0${phraseIndex + 1} / ${phrases.length}`;
}
document.querySelector('#next-phrase').addEventListener('click', () => {
  phraseIndex = (phraseIndex + 1) % phrases.length;
  showPhrase();
});
document.querySelectorAll('.language-tabs button').forEach((button) => button.addEventListener('click', () => {
  selectedLanguage = button.dataset.lang;
  document.querySelectorAll('.language-tabs button').forEach((tab) => tab.classList.toggle('active', tab === button));
  showPhrase();
}));
showPhrase();

// Lightweight 3D-style globe: geographic markers are projected onto a rotating sphere.
const globe = document.querySelector('#birthday-globe');
const gctx = globe.getContext('2d');
const greeting = document.querySelector('#birthday-greeting');
const countryLabel = document.querySelector('#globe-country');
const speakAgain = document.querySelector('#speak-again');
const countries = [
  { name: 'United States', lat: 39, lon: -98, lang: 'en-US', phrase: 'Happy birthday, Arslan!' },
  { name: 'Mexico', lat: 23, lon: -102, lang: 'es-MX', phrase: '¡Feliz cumpleaños, Arslan!' },
  { name: 'Spain', lat: 40, lon: -4, lang: 'es-ES', phrase: '¡Feliz cumpleaños, Arslan!' },
  { name: 'Germany', lat: 51, lon: 10, lang: 'de-DE', phrase: 'Alles Gute zum Geburtstag, Arslan!' },
  { name: 'France', lat: 46, lon: 2, lang: 'fr-FR', phrase: 'Joyeux anniversaire, Arslan !' },
  { name: 'Italy', lat: 42, lon: 12, lang: 'it-IT', phrase: 'Buon compleanno, Arslan!' },
  { name: 'Brazil', lat: -10, lon: -52, lang: 'pt-BR', phrase: 'Feliz aniversário, Arslan!' },
  { name: 'Japan', lat: 36, lon: 138, lang: 'ja-JP', phrase: 'アルスラン、お誕生日おめでとう！' },
  { name: 'Turkey', lat: 39, lon: 35, lang: 'tr-TR', phrase: 'Doğum günün kutlu olsun, Arslan!' },
  { name: 'Iran', lat: 32, lon: 53, lang: 'fa-IR', phrase: 'تولدت مبارک، ارسلان!' },
  { name: 'India', lat: 21, lon: 78, lang: 'hi-IN', phrase: 'जन्मदिन मुबारक हो, अर्सलान!' },
  { name: 'China', lat: 35, lon: 103, lang: 'zh-CN', phrase: '阿尔斯兰，生日快乐！' }
];
let globeRotation = -0.35;
let dragStart = null;
let selectedCountry = null;
function project(lat, lon, radius) {
  const phi = lat * Math.PI / 180;
  const lambda = lon * Math.PI / 180 + globeRotation;
  const x = Math.cos(phi) * Math.sin(lambda);
  const y = Math.sin(phi);
  const z = Math.cos(phi) * Math.cos(lambda);
  if (z < 0) return null;
  const w = globe.clientWidth;
  return { x: w / 2 + x * radius, y: w / 2 - y * radius, z };
}
function drawGlobe() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = globe.clientWidth;
  globe.width = size * dpr;
  globe.height = size * dpr;
  gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  gctx.clearRect(0, 0, size, size);
  const radius = size * .43;
  const cx = size / 2, cy = size / 2;
  const glow = gctx.createRadialGradient(cx - radius * .35, cy - radius * .38, radius * .05, cx, cy, radius * 1.1);
  glow.addColorStop(0, '#2a8ac0'); glow.addColorStop(.48, '#0b467a'); glow.addColorStop(1, '#041326');
  gctx.beginPath(); gctx.arc(cx, cy, radius, 0, Math.PI * 2); gctx.fillStyle = glow; gctx.fill();
  gctx.save(); gctx.beginPath(); gctx.arc(cx, cy, radius, 0, Math.PI * 2); gctx.clip();
  gctx.strokeStyle = 'rgba(98,223,255,.18)'; gctx.lineWidth = 1;
  for (const lat of [-60, -30, 0, 30, 60]) {
    const yy = cy - Math.sin(lat * Math.PI / 180) * radius;
    const rx = Math.cos(lat * Math.PI / 180) * radius;
    gctx.beginPath(); gctx.ellipse(cx, yy, rx, Math.max(2, radius * .11), 0, 0, Math.PI * 2); gctx.stroke();
  }
  for (let offset = -2; offset <= 2; offset++) {
    gctx.beginPath(); gctx.ellipse(cx, cy, Math.max(4, radius * Math.cos(offset * Math.PI / 6)), radius, 0, 0, Math.PI * 2); gctx.stroke();
  }
  // Clean map-like continent silhouettes with simplified internal country borders.
  const continents = [
    [[-168,70],[-145,68],[-128,55],[-124,49],[-117,32],[-105,23],[-98,18],[-83,9],[-78,8],[-76,25],[-60,46],[-66,58],[-95,72],[-130,72]],
    [[-81,12],[-70,9],[-62,-2],[-50,-5],[-43,-22],[-50,-35],[-67,-56],[-75,-42],[-79,-15]],
    [[-11,72],[20,72],[42,60],[60,55],[78,63],[100,70],[130,58],[160,60],[180,48],[160,35],[140,35],[125,22],[110,7],[100,5],[85,20],[72,8],[60,25],[45,35],[35,30],[28,42],[12,38],[-8,44],[-17,57]],
    [[-17,36],[5,37],[32,30],[45,12],[42,-12],[33,-33],[17,-35],[9,-18],[-5,-4],[-14,14]],
    [[112,-11],[130,-10],[145,-18],[153,-28],[145,-39],[128,-36],[114,-25]],
    [[-52,82],[-25,80],[-20,65],[-42,58],[-54,68]]
  ];
  function drawGeoLine(points, close=false) {
    let started=false;
    points.forEach(([lon,lat])=>{const p=project(lat,lon,radius*.985);if(!p){started=false;return;}if(!started){gctx.moveTo(p.x,p.y);started=true;}else gctx.lineTo(p.x,p.y);});
    if(close&&started)gctx.closePath();
  }
  continents.forEach((points,i)=>{gctx.beginPath();drawGeoLine(points,true);gctx.fillStyle=i%2?'rgba(84,191,168,.48)':'rgba(73,177,159,.52)';gctx.fill();gctx.strokeStyle='rgba(167,246,222,.68)';gctx.lineWidth=1;gctx.stroke();});
  const borders = [
    [[-125,49],[-110,49],[-100,49],[-95,49],[-89,47],[-82,45]], [[-117,32],[-110,32],[-105,31],[-100,29],[-97,26]],
    [[-103,23],[-102,17],[-96,16],[-90,16],[-86,21]], [[-70,55],[-66,50],[-60,48],[-55,52],[-58,58]],
    [[-8,50],[-4,54],[1,53]], [[-2,43],[2,43],[4,48],[8,50],[13,54]], [[5,44],[8,46],[12,46],[16,49]], [[7,44],[10,43],[13,42],[16,41]],
    [[27,41],[29,38],[33,36]], [[35,39],[42,38],[45,35],[49,31]], [[45,39],[48,37],[52,37],[55,36]], [[53,39],[56,37],[60,35]],
    [[60,30],[63,29],[66,29],[69,28]], [[68,23],[72,22],[76,20],[80,18]], [[80,35],[84,34],[88,28],[92,27]],
    [[92,22],[98,22],[101,18],[105,18]], [[105,45],[110,42],[115,41],[120,39]], [[123,42],[128,42],[130,39]],
    [[15,-4],[20,-5],[25,-8],[30,-8]], [[20,-18],[25,-18],[29,-22]], [[28,-30],[31,-29],[32,-25]],
    [[115,-22],[122,-25],[130,-25],[137,-29]], [[140,-17],[143,-19],[149,-22]]
  ];
  gctx.beginPath();borders.forEach(line=>drawGeoLine(line));gctx.strokeStyle='rgba(5,27,45,.78)';gctx.lineWidth=1.35;gctx.stroke();
  gctx.restore();
  gctx.beginPath(); gctx.arc(cx,cy,radius,0,Math.PI*2); gctx.strokeStyle='rgba(98,223,255,.55)'; gctx.lineWidth=1.3; gctx.stroke();
  countries.forEach(country=>{const p=project(country.lat,country.lon,radius);country.screen=p;if(!p)return;gctx.beginPath();gctx.arc(p.x,p.y,selectedCountry===country?5:3.4,0,Math.PI*2);gctx.fillStyle=selectedCountry===country?'#fff':'#62dfff';gctx.shadowColor='#62dfff';gctx.shadowBlur=9;gctx.fill();gctx.shadowBlur=0;});
}
function resizeGlobe(){const box=globe.parentElement.getBoundingClientRect();globe.style.width=`${Math.min(box.width,440)}px`;globe.style.height=globe.style.width;drawGlobe();}
function pickCountry(x,y){let best=null,dist=26;countries.forEach(c=>{if(!c.screen)return;const d=Math.hypot(c.screen.x-x,c.screen.y-y);if(d<dist){dist=d;best=c;}});if(best){selectedCountry=best;countryLabel.textContent=`${best.name.toUpperCase()} / ${best.lang}`;greeting.textContent=best.phrase;speakAgain.disabled=false;document.querySelectorAll('.history-card').forEach(card=>card.classList.toggle('country-highlight',card.dataset.tags.includes(best.name.toLowerCase())||best.name==='Iran'&&card.dataset.tags.includes('iran')));drawGlobe();speakGreeting();}}
function speakGreeting(){if(!selectedCountry||!('speechSynthesis'in window))return;speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(selectedCountry.phrase);utterance.lang=selectedCountry.lang;utterance.rate=.86;speechSynthesis.speak(utterance);}
globe.addEventListener('pointerdown',e=>{dragStart={x:e.clientX,y:e.clientY,rotation:globeRotation,moved:false};globe.setPointerCapture(e.pointerId);});
globe.addEventListener('pointermove',e=>{if(!dragStart)return;const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;if(Math.abs(dx)+Math.abs(dy)>5)dragStart.moved=true;if(dragStart.moved){globeRotation=dragStart.rotation+dx/Math.max(globe.clientWidth,1)*3;drawGlobe();}});
globe.addEventListener('pointerup',e=>{if(dragStart&&!dragStart.moved){const r=globe.getBoundingClientRect();pickCountry(e.clientX-r.left,e.clientY-r.top);}dragStart=null;});
globe.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){globeRotation+=(e.key==='ArrowRight'?.18:-.18);drawGlobe();e.preventDefault();}});
speakAgain.addEventListener('click',speakGreeting);
new ResizeObserver(resizeGlobe).observe(globe.parentElement);

document.querySelectorAll('.history-filters button').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.history-filters button').forEach(item=>item.classList.toggle('active',item===button));
  const filter=button.dataset.filter;
  document.querySelectorAll('.history-card').forEach(card=>{card.hidden=filter!=='all'&&!card.dataset.tags.split(' ').includes(filter);});
}));

