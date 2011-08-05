// npm install gd and promised-io into a node_modules directory
var sys  = require('sys');
var fs   = require('fs');
var path = require('path');
var gd   = require('gd/gd');
var promise   = require('promised-io/promise');

// TODO: accept cmd arg or config for input directory
var usage = "sheet.js path/to/icons";

var args = process.argv.slice(1); 
if(args[0].match(/\.js$/)){
  args.shift(); // ignore the application's filename
}

var cwd = process.cwd(); 
var indir = (args.shift() || cwd).replace(/\/$/, '');
var target = args.shift() || indir+'/sprite.png';

// TODO: config or read source images for width/height	
// define icons sizes
var icon_width = 24;
var icon_height = 24;

var	files = [], 
	sequence = null;
	
function run() {
	// remove preexisting output file at the target path
	if (path.exists(target)) 
	  fs.unlink(target);

	// populate the files array with paths to all .png images
	fs.readdir(indir, function(err, filenames){
		files = filenames.filter(function(name){
			return name.charAt(0) != '.' 
				&& /\.(png)$/.test(name);
		}).map(function(name){
			return indir + "/" + name;
		});
		// filter out the target png file if it was already in there
    if(files.indexOf(target) > -1){
      files.splice(files.indexOf(target), 1);
    }
		// console.log("got files: \n" + files.join("\n"));

		return createSheet(files, target, {});
	});
}

function createSheet(files, dest, options) {

	// TODO: support variable heights
	var file = null, 
		count = files.length, 
		i = 0, 
		target_png = gd.createTrueColor(icon_width, icon_height * count);

  target_png.saveAlpha(1);
  target_png.alphaBlending(0);

	console.log("target_png created");

	// on object to manage an async sequence. 
	// TODO: can use https://github.com/sfoster/dojo-samiam/blob/master/sandbox/Sequence.js ? 
	var sequence = {
		start: function(){
			console.log("start sequence");
			console.log("target_png has width:height: " + icon_width +" : "+ icon_height * count);
			this.next();
		},
		next: function(){
			var file = files.shift();
			// console.log("next, with: " + file);
			if(file) {
				copyIntoImage(target_png, file, i++)
					.then(sequence.next);
			} else {
				sequence.atlast();
			}
		},
		atlast: function(){
			// finally 
			// target_png.savePng(target, 1, gd.noop);

			// create our final output image.
			var result = target_png.savePng(target, 1, gd.noop);
			console.log("wrote output to: " + target);
		}.bind(this)
	};
	sequence.start();
}

function copyIntoImage(target_png, sourcefile, i){
	
	var pr = promise.Promise();
	gd.openPng(sourcefile, function(sourcePng, path) {
		// console.log("source img: " + sourcefile + ", copy to: 0/"+ (i * icon_height));
		sourcePng.copy(
			target_png, // into where (?)
			0,	// destination x
			i * icon_height,	// destination y
			0,	// source x
			0,	// source y
			icon_width, // width/height to copy
			icon_height
		);
		console.log(
			"\tbackground-position: " + 0 +" "+ (i * icon_height * -1) +"px;"
			+"\t"
			+"/* "+sourcefile+" */"
			);
		// release mem for the source icon img
		sourcePng.destroy();

		// indicate completion of this async operation
		// by resolving the promise we returned earlier
		pr.resolve(path + " copied");
	});

	// return a promise, which we'll resolve when the openPng is done
	return pr;
}

if(require.main === module) {
	console.log("indir: " + indir);
	console.log("target: " + target);
	run();
}