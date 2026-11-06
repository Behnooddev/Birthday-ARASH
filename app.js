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

