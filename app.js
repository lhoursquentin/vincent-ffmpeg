import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import corePath from './assets/ffmpeg-core.js?url'
import wasmPath from './assets/ffmpeg-core.wasm?url'
import workerPath from './assets/ffmpeg-core.worker.js?url'
let ffmpeg = null;

const transcode = async ({ target: { files } }) => {
  if (ffmpeg === null) {
    ffmpeg = createFFmpeg({ log: true, corePath, workerPath, wasmPath });
  }
  const message = document.getElementById('message');
  const bgFile = files[0];
  const vincentFile = files[1];
  message.innerHTML = 'Loading ffmpeg-core.js';
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }
  ffmpeg.FS('writeFile', bgFile.name, await fetchFile(bgFile));
  ffmpeg.FS('writeFile', vincentFile.name, await fetchFile(vincentFile));
  message.innerHTML = 'Start transcoding';
  const outputFilename = 'output.mp4';
  await ffmpeg.run(
    '-i',
    bgFile.name,
    '-i',
    vincentFile.name,
    '-filter_complex',
    `[0:v]scale=-2:200[input];
     [1:v]scale=-2:200,colorkey=0x00ff00:0.3:0.2[vincent];
     [input][vincent]overlay=shortest=1[out]`,
    '-map', '[out]',
    outputFilename
  );
  message.innerHTML = 'Complete transcoding';
  const data = ffmpeg.FS('readFile', outputFilename);

  const video = document.getElementById('output-video');
  video.src = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
}
const elm = document.getElementById('uploader');
elm.addEventListener('change', transcode);

