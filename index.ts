import path from "path";
import cp from "child_process";

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
	params.ffmpegPath = params.ffmpegPath || "ffmpeg";
	params.maxNoiseLevel = params.maxNoiseLevel || -40;
	params.minSilenceLength = params.minSilenceLength || 0.2;
	params.minSongLength = params.minSongLength || 20;

	const extensionMatch = params.mergedTrack.match(/\w+$/);
	if (!extensionMatch) throw new Error(`invalid 'mergedTrack' param`);
	const fileExtension = extensionMatch[0];

	var out = cp.spawnSync(
		params.ffmpegPath,
		[
			"-i",
			params.mergedTrack,
			"-af",
			`silencedetect=noise=${params.maxNoiseLevel}dB:d=${params.minSilenceLength}`,
			"-f",
			"null",
			"-",
		],
		{
			stdio: "pipe",
			shell: process.env.ComSpec,
		}
	);

	const outString = out.output.toString();

	const splitPattern = /silence_start: ([\w\.]+)[\s\S]+?silence_end: ([\w\.]+)/g;
	var silenceInfo: RegExpExecArray | null;
	var lastTrackEnd = 0;
	var index = 0;
	while ((silenceInfo = splitPattern.exec(outString))) {
		const [_, silenceStart, silenceEnd] = silenceInfo;
		const silenceMiddle = (parseInt(silenceEnd) - parseInt(silenceStart)) / 2;

		const trackLength = parseInt(silenceStart) - lastTrackEnd;
		if (trackLength < params.minSongLength) {
			// TODO: seems like short trackings is beeing merging in the next one
			// song is too short -> merge it to the previous one
			continue;
		}

		const trackName =
			params.trackNames?.[index] || `Track ${index.toString().padStart(2, "0")}`;
		const trackStart = new Date(Math.max(0, lastTrackEnd * 1000))
			.toISOString()
			.substr(11, 8);

		extractAudio({
			ffmpegPath: params.ffmpegPath,
			inputTrack: params.mergedTrack,
			start: trackStart,
			length: trackLength + silenceMiddle,
			artist: params.artist,
			album: params.album,
			outputTrack: `${params.outputDir + trackName}.${fileExtension}`,
		});

		index++;
		lastTrackEnd = parseInt(silenceEnd) - silenceMiddle;
	}

	const trackName =
		params.trackNames?.[index] || `Track ${index.toString().padStart(2, "0")}`;
	const trackStart = new Date(Math.max(0, lastTrackEnd * 1000))
		.toISOString()
		.substr(11, 8);

	//extract last track
	extractAudio({
		ffmpegPath: params.ffmpegPath,
		inputTrack: params.mergedTrack,
		start: trackStart,
		length: 999999,
		artist: params.artist,
		album: params.album,
		outputTrack: `${params.outputDir + trackName}.${fileExtension}`,
	});
}

export type ExtractAudioParams = {
	ffmpegPath: string;
	inputTrack: string;
	start: number | string;
	length: number;
	artist?: string;
	album?: string;
	outputTrack: string;
};

export function extractAudio(params: ExtractAudioParams) {
	const title = path.parse(params.outputTrack).name;

	const ffmpegOptions = [
		"-ss",
		params.start.toString(),
		"-t",
		params.length.toString(),
		"-i",
		params.inputTrack,
		"-metadata",
		`title="${title}"`,
		params.artist ? `-metadata artist="${params.artist}"` : "",
		params.album ? `-metadata album="${params.album}"` : "",
		"-c:a",
		"copy",
		params.outputTrack,
	].filter((param) => !!param);

	cp.spawnSync(params.ffmpegPath, ffmpegOptions, {
		stdio: "inherit",
		shell: process.env.ComSpec,
	});
}
