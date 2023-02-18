import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

import corePath from './assets/ffmpeg-core.js?url';
import workerPath from './assets/ffmpeg-core.worker.js?url';
import wasmPath from './assets/ffmpeg-core.wasm?url';
import vincentGreenScreenUrl from './assets/vincent-green-screen.webm';

const vincentFileName = 'vincent-file'; // name doesn't matter much here

const bodyElt = document.getElementById('body');
const statusElt = document.getElementById('status');
const fileInputElt = document.getElementById('file-input');
const runElt = document.getElementById('run');
const loadingVincentElt = document.getElementById('loading-vincent');
const outputHeightElt = document.getElementById('output-height');
const fieldsetElt = document.getElementById('ext-fieldset');

let inputFile;
updateInputFile(fileInputElt.files[0]);

fileInputElt.addEventListener('change', onFileSelection);
runElt.addEventListener('click', () => vincentify(inputFile));
outputHeightElt.addEventListener('change', ({ target }) => {
  const nb = Number(target.value);
  const min = Number(target.min);
  const step = Number(target.step);
  if (nb < min) {
    target.value = min;
  } else if (nb % step !== 0) {
    target.value = nb - nb % step;
  }
});

const ffmpeg = createFFmpeg({ log: true, corePath, workerPath, wasmPath });
// Launch async processes ASAP, await them later
const ffmpegLoadPromise = ffmpeg.load();
const vincentFilePromise = fetchFile(vincentGreenScreenUrl);

const extToEltMap = new Map();
const videoExtensions = [
  {
    ext: 'mp4',
    speed: 'fast',
    fileSize: 'small',
  },
  {
    ext: 'webm',
    speed: 'slow',
    fileSize: 'small',
  },
];

const imgExtensions = [
  {
    ext: 'webp',
    speed: 'slow',
    fileSize: 'small',
  },
  {
    ext: 'gif',
    speed: 'fast',
    fileSize: 'huge',
  },
];

const extensions = videoExtensions.concat(imgExtensions);
for (const { ext, speed, fileSize } of extensions) {
  const labelElt = document.createElement('label');
  const inputElt = document.createElement('input');
  inputElt.type = 'radio';
  inputElt.name = 'extension';
  labelElt.title = `${speed} to generate, ${fileSize} file size`;
  labelElt.append(inputElt, ext);
  fieldsetElt.append(labelElt);
  extToEltMap.set(ext, inputElt);
}
extToEltMap.get('gif').checked = true;

/** @param {{ message: string, loading?: boolean }} status */
function updateStatus({ message, loading }) {
  statusElt.textContent = message;
  if (loading !== undefined) {
    loadingVincentElt.style.display = loading ? 'block' : 'none';
  }
}

/** @returns {string} */
function getChosenExtType() {
  for (const [ext, elt] of extToEltMap) {
    if (elt.checked) {
      return ext;
    }
  }
}

/**
 * @param {ArrayBufferLike} buffer
 * @param {string} fileName
 */
function createResultElt(buffer, fileName) {
  const ext = getChosenExtType();
  const [tag, mimeType] = imgExtensions.some((imgExtInfo) => imgExtInfo.ext === ext)
    ? ['img', 'image']
    : ['video', 'video']
  ;
  const url = URL.createObjectURL(new Blob([buffer], { type: `${mimeType}/${ext}` }));

  const videoId = 'result-video-elt';
  document.getElementById(videoId)?.remove();
  const videoElt = document.createElement(tag);
  videoElt.id = videoId;
  videoElt.src = url;
  if (tag === 'video') {
    videoElt.loop = true;
    videoElt.controls = true;
  }

  const downloadId = 'result-download-elt';
  document.getElementById(downloadId)?.remove();
  const downloadElt = document.createElement('a');
  downloadElt.id = downloadId;
  downloadElt.href = url;
  downloadElt.download = fileName;
  downloadElt.textContent = 'Download';

  bodyElt.prepend(videoElt, downloadElt);
}

/** @param {File} file */
async function vincentify(file) {
  runElt.disabled = true;
  updateStatus({ message: 'Vincentifying, please wait...', loading: true });
  const filePromise = fetchFile(file);
  await ffmpegLoadPromise;
  ffmpeg.FS('writeFile', vincentFileName, await vincentFilePromise);
  ffmpeg.FS('writeFile', file.name, await filePromise);

  const ext = getChosenExtType();
  const basename = file.name.replace(/(.*)\..*/, '$1');
  const heightPxStr = outputHeightElt.value;
  const outputFilename = `${basename}-vincent.${ext}`;
  // scaling to speed up processing & to make sure the height can be divided
  // by 2 (which is required by libx264)
  await ffmpeg.run(
    '-i', file.name,
    '-i', vincentFileName,
    '-filter_complex',
    `[0:v]scale=-2:${heightPxStr},trim=0:4.2[input];
     [1:v]scale=-2:${heightPxStr},colorkey=0x00ff00:0.3:0.2,trim=0:4.2[vincent];
     [input][vincent]overlay=enable='between(t,0,4.2)'[out]`,
    '-loop', '0', // force looping (default loop setting for webp is 1, no loop)
    '-map', '[out]',
    outputFilename
  );
  updateStatus({ message: 'Completed vincentification', loading: false });
  const outputData = ffmpeg.FS('readFile', outputFilename);

  createResultElt(outputData.buffer, outputFilename);
  runElt.disabled = false;
}

/** @param {File | undefined} file */
function updateInputFile(file) {
  const isValid = file !== undefined;
  if (isValid) {
    inputFile = file;
    updateStatus({ message: `Ready to vincentify ${file.name}` });
  } else {
    updateStatus({ message: 'Please select an image/video file to start' });
  }
  runElt.disabled = !isValid;
}

/** @param {Event} event */
function onFileSelection({ target: { files: [file] } }) {
  updateInputFile(file);
}
