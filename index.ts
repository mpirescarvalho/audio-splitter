import path from "path";
import ffmpeg from "fluent-ffmpeg";

export type SplitAudioParams = {
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

export async function splitAudio(params: SplitAudioParams): Promise<void> {
	return new Promise((resolve, reject) => {
		params.ffmpegPath = params.ffmpegPath || "ffmpeg";
		params.maxNoiseLevel = params.maxNoiseLevel || -40;
		params.minSilenceLength = params.minSilenceLength || 0.2;
		params.minSongLength = params.minSongLength || 20;

		const extensionMatch = params.mergedTrack.match(/\w+$/);
		if (!extensionMatch) throw new Error(`invalid 'mergedTrack' param`);
		const fileExtension = extensionMatch[0];

		let ffmpegCommand = ffmpeg()
			.setFfmpegPath(params.ffmpegPath)
			.input(params.mergedTrack)
			.audioFilters(
				`silencedetect=noise=${params.maxNoiseLevel}dB:d=${params.minSilenceLength}`
			)
			.outputFormat("null");

		ffmpegCommand
			.on("start", (cmdline) => console.log(cmdline))
			.on("end", (_, silenceDetectResult) => {
				const tracks: Array<{
					trackStart: number;
					trackEnd: number;
				}> = [];

				const splitPattern =
					/silence_start: ([\w\.]+)[\s\S]+?silence_end: ([\w\.]+)/g;
				var silenceInfo: RegExpExecArray | null;

				while ((silenceInfo = splitPattern.exec(silenceDetectResult))) {
					const [_, silenceStart, silenceEnd] = silenceInfo;
					const silenceMiddle = (parseInt(silenceEnd) + parseInt(silenceStart)) / 2;
					const trackStart = tracks[tracks.length - 1]?.trackEnd || 0;
					const trackEnd = silenceMiddle;
					const trackLength = trackEnd - trackStart;

					if (trackLength >= params.minSongLength! || tracks.length === 0) {
						tracks.push({
							trackStart,
							trackEnd,
						});
					} else {
						// song is too short -> merge it to the previous one
						const lastTrack = tracks[tracks.length - 1];
						lastTrack.trackEnd = trackEnd;
						tracks[tracks.length - 1] = lastTrack;
					}
				}

				// add last track
				if (tracks.length > 0) {
					tracks.push({
						trackStart: tracks[tracks.length - 1]!.trackEnd,
						trackEnd: 999999,
					});
				}

				// split the tracks
				const promises = tracks.map((track, index) => {
					const trackName =
						params.trackNames?.[index] ||
						`Track ${(index + 1).toString().padStart(2, "0")}`;
					const trackStart = new Date(Math.max(0, track.trackStart * 1000))
						.toISOString()
						.substr(11, 8);
					const trackLength = track.trackEnd - track.trackStart;

					return extractAudio({
						ffmpegPath: params.ffmpegPath!,
						inputTrack: params.mergedTrack,
						start: trackStart,
						length: trackLength,
						artist: params.artist,
						album: params.album,
						outputTrack: `${params.outputDir + trackName}.${fileExtension}`,
					});
				});

				Promise.all(promises)
					.then(() => resolve())
					.catch(reject);
			})
			.on("error", reject)
			.output("-")
			.run();
	});
}

export type ExtractAudioParams = {
	ffmpegPath: string; // path to ffmpeg.exe
	inputTrack: string; // source track
	start: number | string; // start seconds in the source
	length: number; // duration to extract
	artist?: string; // meta info, optional
	album?: string; // meta info, optional
	outputTrack: string; // output track
};

export async function extractAudio(params: ExtractAudioParams): Promise<void> {
	return new Promise((resolve, reject) => {
		const title = path.parse(params.outputTrack).name;

		let ffmpegCommand = ffmpeg()
			.setFfmpegPath(params.ffmpegPath)
			.input(params.inputTrack)
			.setStartTime(params.start)
			.setDuration(params.length)
			.noVideo()
			.addOutputOptions("-metadata", `title="${title}"`);

		if (params.artist) {
			ffmpegCommand = ffmpegCommand.addOutputOptions(
				"-metadata",
				`artist="${params.artist}"`
			);
		}

		if (params.album) {
			ffmpegCommand = ffmpegCommand.addOutputOptions(
				"-metadata",
				`album="${params.album}"`
			);
		}

		ffmpegCommand
			.outputOptions("-c:a", "copy")
			.on("start", (cmdline) => console.log(cmdline))
			.on("end", resolve)
			.on("error", reject)
			.saveToFile(params.outputTrack);
	});
}
