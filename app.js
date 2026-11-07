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
  // Soft stippled landmasses add a map-like texture while remaining lightweight.
  const land = [[-125,25,30,22],[-100,48,22,17],[-75,-8,15,30],[-43,-10,13,28],[-5,52,21,12],[25,10,17,27],[45,30,25,18],[80,48,37,18],[110,10,25,19],[135,-25,15,9],[20,-28,12,14]];
  gctx.fillStyle = 'rgba(98,223,190,.34)';
  for (const [lon,lat,rx,ry] of land) for(let a=-rx;a<=rx;a+=4) for(let b=-ry;b<=ry;b+=4) {
    if ((a*a)/(rx*rx)+(b*b)/(ry*ry)>1) continue;
    const point=project(lat+b,lon+a,radius*.96); if(!point) continue;
    gctx.globalAlpha=.22+point.z*.4; gctx.fillRect(point.x,point.y,2,2);
  }
  gctx.globalAlpha=1; gctx.restore();
  gctx.beginPath(); gctx.arc(cx,cy,radius,0,Math.PI*2); gctx.strokeStyle='rgba(98,223,255,.55)'; gctx.lineWidth=1.3; gctx.stroke();
  countries.forEach(country=>{const p=project(country.lat,country.lon,radius);country.screen=p;if(!p)return;gctx.beginPath();gctx.arc(p.x,p.y,selectedCountry===country?5:3.4,0,Math.PI*2);gctx.fillStyle=selectedCountry===country?'#fff':'#62dfff';gctx.shadowColor='#62dfff';gctx.shadowBlur=9;gctx.fill();gctx.shadowBlur=0;});
}
function resizeGlobe(){const box=globe.parentElement.getBoundingClientRect();globe.style.width=`${Math.min(box.width,440)}px`;globe.style.height=globe.style.width;drawGlobe();}
function pickCountry(x,y){let best=null,dist=20;countries.forEach(c=>{if(!c.screen)return;const d=Math.hypot(c.screen.x-x,c.screen.y-y);if(d<dist){dist=d;best=c;}});if(best){selectedCountry=best;countryLabel.textContent=`${best.name.toUpperCase()} / ${best.lang}`;greeting.textContent=best.phrase;speakAgain.disabled=false;drawGlobe();speakGreeting();}}
function speakGreeting(){if(!selectedCountry||!('speechSynthesis'in window))return;speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(selectedCountry.phrase);utterance.lang=selectedCountry.lang;utterance.rate=.86;speechSynthesis.speak(utterance);}
globe.addEventListener('pointerdown',e=>{dragStart={x:e.clientX,y:e.clientY,rotation:globeRotation,moved:false};globe.setPointerCapture(e.pointerId);});
globe.addEventListener('pointermove',e=>{if(!dragStart)return;const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;if(Math.abs(dx)+Math.abs(dy)>5)dragStart.moved=true;if(dragStart.moved){globeRotation=dragStart.rotation+dx/Math.max(globe.clientWidth,1)*3;drawGlobe();}});
globe.addEventListener('pointerup',e=>{if(dragStart&&!dragStart.moved){const r=globe.getBoundingClientRect();pickCountry(e.clientX-r.left,e.clientY-r.top);}dragStart=null;});
globe.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){globeRotation+=(e.key==='ArrowRight'?.18:-.18);drawGlobe();e.preventDefault();}});
speakAgain.addEventListener('click',speakGreeting);
new ResizeObserver(resizeGlobe).observe(globe.parentElement);

