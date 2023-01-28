Overlay Vincent (https://knowyourmeme.com/memes/confused-travolta) on any
video/image with your browser using ffmpeg wasm
(https://github.com/ffmpegwasm/ffmpeg.wasm).

# Install

Broken symlinks need to be resolved by adding missing files in the
`./assets/vincent` directory (I'm not including them in the repo since I do not
own them).

Also note that Vincent can be replaced with any other green screen video of
your liking.

The other symlinks can be resolved with `./vincent-cli install`.

See `./vincent-cli --help` to build, serve & dev.

# How it works

ffmpeg (https://ffmpeg.org/) is pulled by your browser as a WebAssembly binary
and used to generate a new video/image right from your browser.

This has a few advantages but the most interesting ones (IMO):
- pictures / videos never leave the client computer
- video processing can require quite a lot of resources, especially when
  dealing with multiple concurrent users, but here computing is completely
  offloaded on the user's own machine.
- server side setup is dead simple, it's a simple file server.

More info on ffmpeg wasm here: https://github.com/ffmpegwasm/ffmpeg.wasm
