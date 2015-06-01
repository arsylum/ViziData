///////////////////
/// entry point ///
///////////////////
$(function(){
	// init stuff
	lastMapCenter = { lat: 0, lng: 0 };

	resoFactor = parseFloat($("#reso-slider").val());
	//$("#zoom-slider").attr("min",M_ZOOM_RANGE[0]).attr("max",M_ZOOM_RANGE[1]);
	
	$bubble = $("#bubble");

	// setup overlay canvas
	overcan = d3.select("#map").append("canvas").classed("overlay", true);
	overctx = overcan.node().getContext("2d");

	// init color scale
	colorScale = d3.scale.log().range(M_COLOR_SCALE);


	/// load all the meta data meta files
	var bmMETA = new Date();
	console.log("~~ started loading the meta files (total of "+META_FILES.length+") ~~ ");

	var callback = function(data) {
		for(var j = 0; j< data.datasets.length; j++) {
			data.datasets[j].parent = data;
		}
		gdata[mfc++] = data;
		if(mfc===META_FILES.length) {
			console.log(" |BM| got all the meta files (took "+(new Date() -bmMETA)+"ms)");
			setupControlHandlers();
			onResize();
			statifyUrl(); // revert state from url parameters and get things going
		}
	};

	var mfc = 0; // meta file counter
	for(var i = 0; i<META_FILES.length; i++) {
		$.getJSON(DATA_DIR+META_FILES[i], callback);
	}
});


////////////////
/// on resize //
////////////////
function onResize() {

	// get new viewport size
	viewportW = $(window).width();
	viewportH = $(window).height();

	var mapcbox = $("#controls-map"),
		tlcbox = $("#controls-timeline");
	if(viewportH < 700) {
		mapcbox.children("h2").addClass("closed");
		mapcbox.children("fieldset").slideUp();
	} else {
		mapcbox.children("h2").removeClass("closed");
		mapcbox.children("fieldset").slideDown();
	}
	if(viewportH < 777) {
		tlcbox.children("h2").addClass("closed");
		tlcbox.children("fieldset").slideUp();
	} else {
		tlcbox.children("h2").removeClass("closed");
		tlcbox.children("fieldset").slideDown();
	}

	// set canvas dimensions
	//canvasT = Math.floor($("#map").position().top); 
	//canvasL = Math.floor($("#sidebar").width()); //doesen't change but is set here for code maintainability
	canvasW = Math.floor($("#map").width());
	canvasH = Math.floor($("#map").height());

	overcan.attr("width", canvasW).attr("height", canvasH);

	$("#leaflet").css("width", canvasW).css("height",canvasH);
	initLeaflet();
	
	genGrid();
	genChart();
}