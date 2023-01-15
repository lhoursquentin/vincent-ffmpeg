import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

import corePath from './assets/ffmpeg-core.js?url';
import workerPath from './assets/ffmpeg-core.worker.js?url';
import wasmPath from './assets/ffmpeg-core.wasm?url';
import vincentGreenScreenUrl from './assets/vincent-green-screen.webm';

const outputFilename = 'output.mp4';
const vincentFileName = 'vincent-file'; // name doesn't matter much here

const videoElt = document.getElementById('output-video');
const statusElt = document.getElementById('status');
const fileInputElt = document.getElementById('file-input');
fileInputElt.addEventListener('change', vincentify);

const ffmpeg = createFFmpeg({ log: true, corePath, workerPath, wasmPath });
// Launch async processes ASAP, await them later
const ffmpegLoadPromise = ffmpeg.load();
const vincentFilePromise = fetchFile(vincentGreenScreenUrl);

/** @param {string} status */
function updateStatus(status) {
  statusElt.textContent = status;
}

/** @param {Event} event */
async function vincentify({ target: { files: [file] } }) {
  updateStatus('Vincentifying, please wait...');
  const filePromise = fetchFile(file);
  await ffmpegLoadPromise;
  ffmpeg.FS('writeFile', vincentFileName, await vincentFilePromise);
  ffmpeg.FS('writeFile', file.name, await filePromise);

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
  videoElt.src = URL.createObjectURL(new Blob([outputData.buffer], { type: 'video/mp4' }));
}
