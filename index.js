/**
 * This javascript snippet is able to split a merged audio track to parts by silence analysis
 * It is based on ffmpeg (https://ffmpeg.org), especially on the silencedetect filter (https://ffmpeg.org/ffmpeg-filters.html#silencedetect)
 *
 * Assumptions:
 * - nodejs is installed
 * - ffmpeg is installed
 * 
 * Usage:
 * - fill the options object
 * - run "node splitter"
 * 
 */
const cp = require('child_process');

// to be filled
var options = {
	mergedTrack: "songs.mp3", // required
	outputDir: "out/", // directory, where to put the tracks (with all the required slashes)
	ffmpegPath: "ffmpeg", // path to ffmpeg.exe
	artist: "ARTIST", // meta info, optional
	album: "ALBUM", // meta info, optional
	trackNames: [], // meta info, optional
	maxNoiseLevel: -40, // silence is defined below this dB value
	minSilenceLength: 1.4, // (sec) we are searching for silence intervals at least of this lenght
	minSongLength: 20 // (sec) if a track is sorter than this, we merge it to the previous track
};

// variables, utilities
var pattern = /silence_start: ([\w\.]+)[\s\S]+?silence_end: ([\w\.]+)/g;
var extension = options.mergedTrack.match(/\w+$/)[0];
var detectCommand = options.ffmpegPath + ' -i "' + options.mergedTrack + '" -af silencedetect=noise=' + options.maxNoiseLevel + 'dB:d=' + options.minSilenceLength + ' -f null -';
var convertCommand = function(i, secStart, secLength) {
	var ss = new Date(Math.max(0, parseInt(secStart * 1000)-1)).toISOString().substr(11, 8);	
	var trackName = options.trackNames[i-1] || ("song" + (i<10?"0"+i:i));
	return options.ffmpegPath + ' -ss "' + ss + '" -t ' + parseInt(secLength+3) + ' -i "' + options.mergedTrack 
		+ '" -metadata title="' + trackName + '" -metadata artist="' + options.artist + '" -metadata album="' + options.artist 
		+ '" -c:a copy "' + options.outputDir + trackName + "." + extension + '"';
};

// running silence detection
console.info("Start splitting, options: ");
for(var key in options)
	console.log("  " + key + " = " + options[key]);
console.log("\Running silence detection, waiting for the output (be patient):\n  " + detectCommand + "\n");
var out = cp.spawnSync(detectCommand, {
	stdio: "pipe",
	shell: process.env.ComSpec
});
out = out.output.toString();

// extracting tracks
var m, cmd, lastT = 0, counter = 0;
while(m = pattern.exec(out)) {
	var len = m[1] - lastT;
	if (len < options.minSongLength) {
		// song is too short -> merge it to the previous one
		continue;
	}
	cmd = convertCommand(++counter, lastT, len);
	console.log("\n\nExtracting track:\n  " + cmd + "\n");
	cp.spawnSync(cmd, {
		stdio: "inherit",
		shell: process.env.ComSpec
	});
	lastT = m[2];
};

// extracting last track
cmd = convertCommand(++counter, lastT, 9999);
console.log("\n\nRunning command:\n  " + cmd + "\n");
cp.spawnSync(cmd, {
	stdio: "inherit",
	shell: process.env.ComSpec
});

console.info("\nAll done.");