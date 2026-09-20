import { splitParagraphs } from './paragraphs.mjs';
import { voices } from './voice-config.mjs';
import { deliveryStyles } from './delivery-styles.mjs';
import { getModelDownloadPercent, getModelDownloadTotals } from './model-download.mjs';

const PIPER_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/dist/piper-tts-web.js';
const piperModules = new Map();

const elements = {
  textarea: document.querySelector('#scriptInput'),
  count: document.querySelector('#characterCount'),
  clear: document.querySelector('#clearButton'),
  preview: document.querySelector('#previewButton'),
  generate: document.querySelector('#generateButton'),
  helper: document.querySelector('#helperText'),
  speed: document.querySelector('#speedInput'),
  speedValue: document.querySelector('#speedValue'),
  selectionStatus: document.querySelector('#selectionStatus'),
  voiceList: document.querySelector('#voiceList'),
  voiceCount: document.querySelector('#voiceCount'),
  downloadAll: document.querySelector('#downloadAllButton'),
  downloadStatus: document.querySelector('#downloadStatus'),
  downloadProgress: document.querySelector('#modelDownloadProgress'),
  downloadProgressLabel: document.querySelector('#downloadProgressLabel'),
  downloadProgressPercent: document.querySelector('#downloadProgressPercent'),
  downloadProgressBar: document.querySelector('#downloadProgressBar'),
  styleButtons: [...document.querySelectorAll('.style-option')],
  styleValue: document.querySelector('#styleValue'),
  styleNote: document.querySelector('#styleNote'),
  result: document.querySelector('#resultPanel'),
  resultTitle: document.querySelector('#resultTitle'),
  resultStatus: document.querySelector('#resultStatus'),
  resultEmpty: document.querySelector('#resultEmpty'),
  resultReady: document.querySelector('#resultReady'),
  audio: document.querySelector('#audioPlayer'),
  download: document.querySelector('#downloadButton'),
  audioMeta: document.querySelector('#audioMeta'),
  progress: document.querySelector('#progressState'),
  progressLabel: document.querySelector('#progressLabel'),
  progressPercent: document.querySelector('#progressPercent'),
  progressBar: document.querySelector('#progressBar'),
  progressDetail: document.querySelector('#progressDetail'),
  toast: document.querySelector('#toast'),
};

let selectedVoice = 'en_US-amy-medium';
let selectedStyle = 'professional';
let generatedUrl = null;
let toastTimer = null;
let generating = false;
let downloadingAll = false;
let cachedVoiceIds = new Set();

function getPiperModule(key) {
  if (!piperModules.has(key)) {
    piperModules.set(key, import(`${PIPER_MODULE_URL}?voice=${encodeURIComponent(key)}`));
  }
  return piperModules.get(key);
}

function updateCount() {
  const count = elements.textarea.value.length;
  elements.count.textContent = `${count.toLocaleString()} ${count === 1 ? 'character' : 'characters'}`;
}

function updateSpeed() {
  const speed = Number(elements.speed.value);
  elements.speedValue.textContent = `${speed.toFixed(2).replace(/0$/, '')}×`;
  const percent = ((speed - 0.75) / 0.5) * 100;
  elements.speed.style.background = `linear-gradient(to right, var(--accent) ${percent}%, rgba(245, 246, 240, 0.16) ${percent}%)`;
  if (elements.audio) elements.audio.playbackRate = speed;
}

function voiceKindLabel(kind) {
  return kind === 'multi' ? 'multi-speaker' : kind;
}

function renderVoiceLibrary() {
  elements.voiceList.replaceChildren();
  Object.values(voices).forEach((voice) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'model-list-item';
    option.dataset.voice = voice.id;
    option.setAttribute('role', 'option');
    option.addEventListener('click', () => selectVoice(voice.id));

    const main = document.createElement('span');
    main.className = 'model-list-main';
    const name = document.createElement('span');
    name.className = 'model-list-name';
    name.textContent = voice.name;
    const id = document.createElement('span');
    id.className = 'model-list-id';
    id.textContent = voice.id;
    main.append(name, id);

    const meta = document.createElement('span');
    meta.className = 'model-list-meta';
    meta.textContent = `${voice.quality} · ${voiceKindLabel(voice.kind)}`;
    const cache = document.createElement('span');
    cache.className = 'model-list-cache';
    cache.textContent = 'Not cached';
    meta.append(cache);
    option.append(main, meta);
    elements.voiceList.append(option);
  });
  elements.voiceCount.textContent = `${Object.keys(voices).length} models`;
  updateSelectionUI();
  updateCacheBadges();
}

function updateSelectionUI() {
  const voice = voices[selectedVoice];
  elements.voiceList.querySelectorAll('.model-list-item').forEach((item) => {
    const selected = item.dataset.voice === selectedVoice;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-selected', String(selected));
  });
  elements.selectionStatus.textContent = `Selected: ${voice.name} · ${voiceKindLabel(voice.kind)} · ${voice.quality}`;
  elements.helper.textContent = `${voice.name} selected. Generate to render this model locally.`;
}

function updateCacheBadges() {
  elements.voiceList.querySelectorAll('.model-list-item').forEach((item) => {
    const cached = cachedVoiceIds.has(item.dataset.voice);
    const badge = item.querySelector('.model-list-cache');
    badge.textContent = cached ? 'Cached' : 'Not cached';
    badge.classList.toggle('cached', cached);
  });
  elements.downloadStatus.textContent = `${cachedVoiceIds.size}/${Object.keys(voices).length} cached`;
}

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}

function setModelDownloadProgress(label, percent) {
  elements.downloadProgressLabel.textContent = label;
  elements.downloadProgressPercent.textContent = `${Math.round(percent)}%`;
  elements.downloadProgressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

async function refreshCacheStatus() {
  try {
    const piper = await getPiperModule('download-all');
    cachedVoiceIds = new Set((await piper.stored()).filter((id) => voices[id]));
    updateCacheBadges();
  } catch (error) {
    elements.downloadStatus.textContent = 'Cache status unavailable';
    console.error(error);
  }
}

async function downloadAllModels() {
  if (downloadingAll) return;
  downloadingAll = true;
  updateControlState();
  elements.downloadProgress.hidden = false;

  try {
    const piper = await getPiperModule('download-all');
    cachedVoiceIds = new Set((await piper.stored()).filter((id) => voices[id]));
    updateCacheBadges();
    const totals = getModelDownloadTotals(voices, cachedVoiceIds);
    const { ids: allIds, pendingIds, totalBytes } = totals;
    let completedBytes = totals.completedBytes;

    setModelDownloadProgress(`${cachedVoiceIds.size}/${allIds.length} models ready · ${formatBytes(completedBytes)} of ${formatBytes(totalBytes)}`, (completedBytes / totalBytes) * 100);
    for (let index = 0; index < pendingIds.length; index += 1) {
      const voiceId = pendingIds[index];
      const voice = voices[voiceId];
      setModelDownloadProgress(`Downloading ${index + 1} of ${pendingIds.length}: ${voice.name} · ${voice.quality}…`, (completedBytes / totalBytes) * 100);
      await piper.download(voiceId, (progress) => {
        const percent = getModelDownloadPercent(totalBytes, completedBytes, progress.loaded || 0, voice.modelBytes);
        setModelDownloadProgress(`Downloading ${index + 1} of ${pendingIds.length}: ${voice.name} · ${voice.quality}…`, percent);
      });
      completedBytes += voice.modelBytes + voice.configBytes;
      cachedVoiceIds.add(voiceId);
      updateCacheBadges();
      setModelDownloadProgress(`${cachedVoiceIds.size}/${allIds.length} models ready · ${formatBytes(completedBytes)} of ${formatBytes(totalBytes)}`, (completedBytes / totalBytes) * 100);
    }

    setModelDownloadProgress(`All ${allIds.length} models are ready · ${formatBytes(totalBytes)} cached locally`, 100);
    showToast(pendingIds.length ? 'All Piper models are downloaded and ready.' : 'All Piper models were already cached.');
  } catch (error) {
    console.error(error);
    setModelDownloadProgress(`Download stopped · ${cachedVoiceIds.size} of ${Object.keys(voices).length} models ready`, (cachedVoiceIds.size / Object.keys(voices).length) * 100);
    showToast('Some models could not be downloaded. You can retry safely.');
  } finally {
    downloadingAll = false;
    updateControlState();
    refreshCacheStatus();
  }
}

function updateStyleUI() {
  const style = deliveryStyles[selectedStyle];
  elements.styleButtons.forEach((button) => {
    const selected = button.dataset.style === selectedStyle;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-checked', String(selected));
  });
  elements.styleValue.textContent = style.label;
  elements.styleNote.textContent = style.note;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 4200);
}

function setProgress(label, percent, detail) {
  elements.progressLabel.textContent = label;
  elements.progressPercent.textContent = `${Math.round(percent)}%`;
  elements.progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  elements.progressDetail.textContent = detail;
}

function setGenerating(isGenerating) {
  generating = isGenerating;
  updateControlState();
  elements.result.classList.toggle('generating', isGenerating);
  elements.progress.hidden = !isGenerating;
  elements.resultEmpty.hidden = isGenerating || Boolean(generatedUrl);
  elements.resultReady.hidden = isGenerating || !generatedUrl;
}

function updateControlState() {
  const disabled = generating || downloadingAll;
  elements.generate.disabled = disabled;
  elements.preview.disabled = disabled;
  elements.clear.disabled = disabled;
  elements.downloadAll.disabled = disabled;
  elements.voiceList.querySelectorAll('.model-list-item').forEach((item) => { item.disabled = disabled; });
  elements.styleButtons.forEach((button) => { button.disabled = disabled; });
}

function resetGeneratedAudio() {
  if (generatedUrl) URL.revokeObjectURL(generatedUrl);
  generatedUrl = null;
  elements.audio.removeAttribute('src');
  elements.audio.load();
  elements.result.classList.remove('ready');
  elements.resultReady.hidden = true;
  elements.resultEmpty.hidden = false;
  elements.resultTitle.textContent = 'Ready when you are';
  elements.resultStatus.innerHTML = '<span class="status-dot"></span>Not generated';
}

function selectVoice(voiceId) {
  selectedVoice = voiceId;
  updateSelectionUI();
}

function selectStyle(button) {
  selectedStyle = button.dataset.style;
  updateStyleUI();
  if (elements.audio) elements.audio.volume = 1;
}

function findEnglishVoice(availableVoices) {
  const isFemale = voices[selectedVoice].kind === 'female';
  return availableVoices.find((voice) => {
    const voiceName = voice.name.toLowerCase();
    const femaleName = /samantha|karen|moira|zira|female|victoria|ava|susan/.test(voiceName);
    const maleName = /daniel|alex|tom|fred|male|david|rishi|ryan/.test(voiceName);
    return voice.lang.toLowerCase().startsWith('en') && (isFemale ? femaleName : maleName);
  }) || availableVoices.find((voice) => voice.lang.toLowerCase().startsWith('en'));
}

function nativePreview() {
  const text = elements.textarea.value.trim();
  if (!text) {
    showToast('Add a few words before previewing.');
    elements.textarea.focus();
    return;
  }
  if (!('speechSynthesis' in window)) {
    showToast('Preview is not supported in this browser. Generate the WAV instead.');
    return;
  }

  const availableVoices = window.speechSynthesis.getVoices();
  const preferred = findEnglishVoice(availableVoices);
  const style = deliveryStyles[selectedStyle];

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = Number(elements.speed.value) * style.previewRate;
  utterance.pitch = style.previewPitch * (voices[selectedVoice].kind === 'female' ? 1.03 : 0.97);
  utterance.lang = 'en-US';
  if (preferred) utterance.voice = preferred;
  utterance.onstart = () => { elements.preview.innerHTML = '<span class="play-icon">■</span> Stop preview'; };
  utterance.onend = () => { elements.preview.innerHTML = '<span class="play-icon">▶</span> Preview'; };
  utterance.onerror = () => { elements.preview.innerHTML = '<span class="play-icon">▶</span> Preview'; };
  window.speechSynthesis.speak(utterance);
}

function readAscii(view, offset) {
  return String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
}

async function readPcmWav(blob) {
  const buffer = await blob.arrayBuffer();
  const view = new DataView(buffer);
  let format = null;
  let dataOffset = null;
  let dataSize = 0;
  let offset = 12;

  while (offset + 8 <= view.byteLength) {
    const id = readAscii(view, offset);
    const size = view.getUint32(offset + 4, true);
    if (id === 'fmt ' && size >= 16) {
      format = {
        audioFormat: view.getUint16(offset + 8, true),
        channels: view.getUint16(offset + 10, true),
        sampleRate: view.getUint32(offset + 12, true),
        bitsPerSample: view.getUint16(offset + 22, true),
      };
    } else if (id === 'data') {
      dataOffset = offset + 8;
      dataSize = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }

  if (!format || format.audioFormat !== 1 || format.bitsPerSample !== 16 || dataOffset === null) {
    throw new Error('The voice model returned an unsupported WAV format.');
  }

  const bytes = new Uint8Array(buffer, dataOffset, dataSize);
  return { ...format, data: new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2)) };
}

function encodePcmWav({ sampleRate, channels, data }) {
  const buffer = new ArrayBuffer(44 + data.byteLength);
  const view = new DataView(buffer);
  const writeAscii = (offset, value) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + data.byteLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, data.byteLength, true);
  for (let index = 0; index < data.length; index += 1) view.setInt16(44 + index * 2, data[index], true);
  return new Blob([buffer], { type: 'audio/wav' });
}

function encodeAudioBuffer(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const data = new Int16Array(audioBuffer.length * channels);
  for (let frame = 0; frame < audioBuffer.length; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[frame]));
      data[frame * channels + channel] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
  }
  return encodePcmWav({ sampleRate: audioBuffer.sampleRate, channels, data });
}

async function applyDeliveryStyle(wav) {
  const style = deliveryStyles[selectedStyle];
  if (style.renderRate === 1 && style.volume === 1) return wav;
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineContext) return wav;

  const decoder = new OfflineContext(1, 1, 22050);
  const decoded = await decoder.decodeAudioData(await wav.arrayBuffer());
  const outputFrames = Math.ceil(decoded.length / style.renderRate) + 1;
  const renderer = new OfflineContext(decoded.numberOfChannels, outputFrames, decoded.sampleRate);
  const source = renderer.createBufferSource();
  const gain = renderer.createGain();
  source.buffer = decoded;
  source.playbackRate.value = style.renderRate;
  gain.gain.value = style.volume;
  source.connect(gain).connect(renderer.destination);
  source.start(0);
  return encodeAudioBuffer(await renderer.startRendering());
}

async function synthesizeParagraphs(text, voiceId, onProgress) {
  const paragraphs = splitParagraphs(text);
  const rendered = [];
  const piper = await getPiperModule(voiceId);

  for (let index = 0; index < paragraphs.length; index += 1) {
    onProgress({ type: 'paragraph', index, total: paragraphs.length });
    const paragraphWav = await piper.predict({ text: paragraphs[index], voiceId }, (progress) => {
      const paragraphStart = 12 + (index / paragraphs.length) * 82;
      const paragraphSpan = 82 / paragraphs.length;
      if (progress.url === piper.INFERENCE_PROGRESS_URL) {
        const localPercent = progress.total ? progress.loaded / progress.total : 0.5;
        onProgress({ type: 'rendering', index, total: paragraphs.length, percent: paragraphStart + localPercent * paragraphSpan });
      } else if (progress.total) {
        onProgress({ type: 'downloading', index, total: paragraphs.length, percent: Math.min(11, (progress.loaded / progress.total) * 11) });
      }
    });
    rendered.push(await readPcmWav(paragraphWav));
  }

  const first = rendered[0];
  const pauseFrames = Math.round(first.sampleRate * 0.28);
  const pauseSamples = pauseFrames * first.channels;
  const totalSamples = rendered.reduce((total, item) => total + item.data.length, 0) + pauseSamples * (rendered.length - 1);
  const combined = new Int16Array(totalSamples);
  let writeOffset = 0;

  rendered.forEach((item, index) => {
    if (item.sampleRate !== first.sampleRate || item.channels !== first.channels) {
      throw new Error('The voice model returned inconsistent audio settings.');
    }
    combined.set(item.data, writeOffset);
    writeOffset += item.data.length;
    if (index < rendered.length - 1) writeOffset += pauseSamples;
  });

  return encodePcmWav({ sampleRate: first.sampleRate, channels: first.channels, data: combined });
}

async function generateAudio() {
  const text = elements.textarea.value.trim();
  if (!text) {
    showToast('Add a few words before generating audio.');
    elements.textarea.focus();
    return;
  }

  resetGeneratedAudio();
  const paragraphs = splitParagraphs(text);
  setGenerating(true);
  elements.resultTitle.textContent = `Creating ${voices[selectedVoice].name}'s voice…`;
  elements.resultStatus.innerHTML = '<span class="status-dot"></span>Generating';
  setProgress('Loading the voice model…', 4, 'The first voice load can take a moment. It will be cached by your browser for faster repeats.');

  try {
    const wav = await synthesizeParagraphs(text, selectedVoice, (event) => {
      if (event.type === 'paragraph') {
        setProgress(`Preparing paragraph ${event.index + 1} of ${event.total}…`, 10 + (event.index / event.total) * 4, 'Paragraph breaks are preserved with a short natural pause.');
      } else if (event.type === 'rendering') {
        setProgress(`Rendering paragraph ${event.index + 1} of ${event.total}…`, event.percent, 'Long paragraphs are rendered in local chunks, then joined into one WAV.');
      } else if (event.type === 'downloading') {
        setProgress('Downloading the voice model…', event.percent, 'This one-time download stays on your device. Your script is never sent to a server.');
      }
    });

    setProgress('Applying delivery style…', 96, 'Shaping pace and loudness locally for the selected delivery style.');
    const styledWav = await applyDeliveryStyle(wav);
    generatedUrl = URL.createObjectURL(styledWav);
    elements.audio.src = generatedUrl;
    elements.audio.playbackRate = Number(elements.speed.value);
    elements.audio.volume = 1;
    elements.download.href = generatedUrl;
    elements.download.download = `voiceful-${voices[selectedVoice].kind}-${new Date().toISOString().slice(0, 10)}.wav`;
    elements.audioMeta.textContent = `WAV · ${voices[selectedVoice].name} · ${deliveryStyles[selectedStyle].label} · ${paragraphs.length} ${paragraphs.length === 1 ? 'paragraph' : 'paragraphs'} · ${text.length.toLocaleString()} characters`;
    elements.resultTitle.textContent = 'Your audio is ready';
    elements.resultStatus.innerHTML = '<span class="status-dot"></span>Ready to play';
    elements.result.classList.add('ready');
    elements.helper.textContent = `Generated locally with ${deliveryStyles[selectedStyle].label.toLowerCase()} delivery. Download it as many times as you like.`;
    showToast('Your paragraph-safe WAV is ready to play or download.');
  } catch (error) {
    console.error(error);
    elements.resultTitle.textContent = 'Something interrupted the render';
    elements.resultStatus.innerHTML = '<span class="status-dot"></span>Try again';
    elements.resultEmpty.hidden = false;
    elements.progress.hidden = true;
    elements.helper.textContent = 'The model could not load. Check your connection and try again.';
    showToast('Voice generation did not finish. Please try again.');
  } finally {
    setGenerating(false);
    elements.progress.hidden = true;
    elements.resultReady.hidden = !generatedUrl;
    elements.resultEmpty.hidden = Boolean(generatedUrl);
  }
}

elements.textarea.addEventListener('input', updateCount);
elements.speed.addEventListener('input', updateSpeed);
elements.clear.addEventListener('click', () => {
  elements.textarea.value = '';
  updateCount();
  elements.textarea.focus();
});
elements.styleButtons.forEach((button) => button.addEventListener('click', () => selectStyle(button)));
elements.downloadAll.addEventListener('click', downloadAllModels);
elements.preview.addEventListener('click', () => {
  if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    elements.preview.innerHTML = '<span class="play-icon">▶</span> Preview';
    return;
  }
  nativePreview();
});
elements.generate.addEventListener('click', generateAudio);
elements.download.addEventListener('click', () => {
  if (!generatedUrl) return;
  showToast('Download started.');
});

if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
renderVoiceLibrary();
updateSelectionUI();
updateStyleUI();
updateCount();
updateSpeed();
refreshCacheStatus();
