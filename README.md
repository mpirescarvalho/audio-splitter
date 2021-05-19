# Audio Splitter

Simple package to split a merged audio track to parts by silence analysis.

## Prerequisites

To use this project, you need to have a local installation of FFmpeg present on your system. You can download it from https://www.ffmpeg.org/download.html

# Installation

```sh
$ npm i audio-splitter
```

# Example

## Auto split

```js
const { splitAudio } = require("audio-splitter");

splitAudio({
	mergedTrack: "path/to/file.mp3",
	outputDir: "path/to/outdir/",
});
```

# API

## splitAudio(params)

Automatically split audio based on silence analysis.

```typescript
// split audio params
type SplitAudioParams = {
	mergedTrack: string; // source track
	outputDir: string; // directory, where to put the tracks (with all the required slashes)
	ffmpegPath?: string; // path to ffmpeg.exe
	artist?: string; // meta info, optional
	album?: string; // meta info, optional
	trackNames?: string[]; // meta info, optional
	maxNoiseLevel?: number; // silence is defined below this dB value
	minSilenceLength?: number; // (sec) we are searching for silence intervals at least of this lenght
	minSongLength?: number; // (sec) if a track is sorter than this, we merge it to the previous track
};
```

## extractAudio(params)

Manually extract a track

```typescript
// extract audio params
type ExtractAudioParams = {
	ffmpegPath: string; // path to ffmpeg.exe
	inputTrack: string; // source track
	start: number | string; // start seconds in the source
	length: number; // duration to extract
	artist?: string; // meta info, optional
	album?: string; // meta info, optional
	outputTrack: string; // output track
};
```

## Contributing

1. Fork it (<https://github.com/mpirescarvalho/audio-splitter/fork>)
2. Create your feature branch (`git checkout -b feature/awesome`)
3. Commit your changes (`git commit -am 'Add awesome feature'`)
4. Push to the branch (`git push origin feature/awesome`)
5. Create a new Pull Request

## Contact

<a href="https://github.com/mpirescarvalho">
  <img alt="made by Marcelo Carvalho" src="https://img.shields.io/badge/made%20by-Marcelo Carvalho-%237519C1">
</a>
<a href="mailto:mpirescarvalho17@gmail.com">
  <img alt="made by Marcelo Carvalho" src="https://img.shields.io/badge/-mpirescarvalho17@gmail.com-c14438?style=flat-square&logo=Gmail&logoColor=white&link=mailto:mpirescarvalho17@gmail.com" />
</a>
