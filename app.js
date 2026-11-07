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

