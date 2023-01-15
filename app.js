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

let inputFile;
updateInputFile(fileInputElt.files[0]);

fileInputElt.addEventListener('change', onFileSelection);
runElt.addEventListener('click', () => vincentify(inputFile));

const ffmpeg = createFFmpeg({ log: true, corePath, workerPath, wasmPath });
// Launch async processes ASAP, await them later
const ffmpegLoadPromise = ffmpeg.load();
const vincentFilePromise = fetchFile(vincentGreenScreenUrl);
const fieldsetElt = document.getElementById('ext-fieldset');
const extToEltMap = new Map();
const extensions = ['mp4', 'webm', 'gif'];
for (const ext of extensions) {
  const labelElt = document.createElement('label');
  const inputElt = document.createElement('input');
  inputElt.type = 'radio';
  inputElt.name = 'extension';
  labelElt.append(inputElt, ext);
  fieldsetElt.append(labelElt);
  extToEltMap.set(ext, inputElt);
}
extToEltMap.get('mp4').checked = true;

/** @param {string} status */
function updateStatus(status) {
  statusElt.textContent = status;
}

/** @returns {string} */
function getChosenExtType() {
  for (const [ext, elt] of extToEltMap) {
    if (elt.checked) {
      return ext;
    }
  }
}

/** @param {ArrayBufferLike} buffer */
function createResultElt(buffer) {
  const id = 'result-elt';
  document.getElementById(id)?.remove();
  const ext = getChosenExtType();
  const [tag, mimeType] = ext === 'gif'
    ? ['img', 'image']
    : ['video', 'video']
  ;
  const elt = document.createElement(tag);
  elt.id = id;
  elt.src = URL.createObjectURL(new Blob([buffer], { type: `${mimeType}/${ext}` }));
  if (tag === 'video') {
    elt.loop = true;
    elt.controls = true;
  }
  return elt;
}

/** @param {File} file */
async function vincentify(file) {
  runElt.disabled = true;
  updateStatus('Vincentifying, please wait...');
  const filePromise = fetchFile(file);
  await ffmpegLoadPromise;
  ffmpeg.FS('writeFile', vincentFileName, await vincentFilePromise);
  ffmpeg.FS('writeFile', file.name, await filePromise);

  const ext = getChosenExtType();
  const outputFilename = `output.${ext}`;
  // scaling to speed up processing & to make sure the height can be divided
  // by 2 (which is required by libx264)
  await ffmpeg.run(
    '-i', file.name,
    '-i', vincentFileName,
    '-filter_complex',
    `[0:v]scale=-2:200[input];
     [1:v]scale=-2:200,colorkey=0x00ff00:0.3:0.2[vincent];
     [input][vincent]overlay=shortest=1[out]`,
    '-map', '[out]',
    outputFilename
  );
  updateStatus('Completed vincentification');
  const outputData = ffmpeg.FS('readFile', outputFilename);
  const resultElt = createResultElt(outputData.buffer);
  bodyElt.prepend(resultElt);
  runElt.disabled = false;
}

/** @param {File | undefined} file */
function updateInputFile(file) {
  const isValid = file !== undefined;
  if (isValid) {
    inputFile = file;
    updateStatus(`Ready to vincentify ${file.name}`);
  } else {
    updateStatus('Please select an mp4/gif file to start');
  }
  runElt.disabled = !isValid;
}

/** @param {Event} event */
function onFileSelection({ target: { files: [file] } }) {
  updateInputFile(file);
}
