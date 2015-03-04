///////////////////
/// entry point ///
///////////////////
$(function(){
	// init stuff
	viewportW = $(window).width();
	viewportH = $(window).height();

	lastTransformState = {scale: 1, translate: [0,0]};

	Highcharts.setOptions({
		global: {
			useUTC: false
		}
	});

	$("#zoom-slider").attr("min",M_ZOOM_RANGE[0]).attr("max",M_ZOOM_RANGE[1]);
	$("#freezer>input").on("change", function() {
		allow_redraw = !this.checked;
		if(this.checked) { 
			$("#legend").css("opacity",".5"); 
		} else { 
			$("#legend").css("opacity","1"); 
			genGrid();
		}
		
	});
	$("#colorizer>input").on("change", function() {
		colorize = !this.checked;
		genGrid();
	});

	// bind window resize handling
	$(window).resize(function() {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(onResize, 400);
	});


	// zoombehaviour
	zoombh = d3.behavior.zoom().scaleExtent([Math.pow(2,M_ZOOM_RANGE[0]-1), Math.pow(2,M_ZOOM_RANGE[1]-1)]).on("zoom", zoom);

	// setup canvas
	canvas = d3.select("#map").append("canvas").call(zoombh);
	onResize(); // set canvas dimensions

	// setup svg
	
	/*d3.select("#mapcanvas").append("g").attr("id","maplayer");//experimental
	plotlayer = d3.select("#mapcanvas")
		.attr("viewBox", "-1 -1 "+(C_W+1)+" "+(C_H+1))
			.call(zoombh)
			.append("g")
				.attr("id","heatlayer");*/


	// Load default dataset once ready
	$(document).on("meta_files_ready", function() {
		current_datsel = gdata[0]; // TODO get from dom
		$("#filter input")[DEFAULT_DATASET].click(); // select&load initial dataset
	});

	/// TODO
	// load all the meta data meta files
	var bmMETA = new Date();
	console.log("~~ started loading the meta files (total of "+META_FILES.length+") ~~ ");
	var mfc = 0; // meta file counter
	for(var i = 0; i<META_FILES.length; i++) {
		$.getJSON(DATA_DIR+META_FILES[i], function(data){
			gdata[mfc] = data; // TODO
			for(var j = 0; j<gdata[mfc].datasets.length; j++) {
				gdata[mfc].datasets[j].parent = gdata[mfc];
			}
			mfc++;
			if(mfc===META_FILES.length) {
				console.log(" |BM| got all the meta files (took "+(new Date() -bmMETA)+"ms)");
				setupControlHandlers();
				$(document).trigger("meta_files_ready");
			}
		});
	}
});


////////////////
/// on resize //
////////////////
function onResize() {
	// set canvas dimensions
	canvasW = Math.floor($("#map").width());
	canvasH = Math.floor($("#map").height());
	canvas.attr("width", canvasW).attr("height", canvasH);
	ctx = canvas.node().getContext("2d");
	genGrid();
}