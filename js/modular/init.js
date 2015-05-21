///////////////////
/// entry point ///
///////////////////
$(function(){
	// init stuff
	lastTransformState = {scale: 1, translate: [0,0]};

	resoFactor = parseFloat($("#reso-slider").val());
	$("#zoom-slider").attr("min",M_ZOOM_RANGE[0]).attr("max",M_ZOOM_RANGE[1]);
	

	// bind window resize handling
	$(window).resize(function() {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(onResize, 400);
	});

	// zoombehaviour
	zoombh = d3.behavior.zoom().scaleExtent([Math.pow(2,M_ZOOM_RANGE[0]-1), Math.pow(2,M_ZOOM_RANGE[1]-1)]).on("zoom", zoom);

	// setup canvas
	mapcan = d3.select("#map").append("canvas");//.call(zoombh)
		//.on("mousemove", canvasMouseMove).on("click", canvasMouseClick);
	overcan = d3.select("#map").append("canvas").classed("overlay", true);

	// init color scale
	colorScale = d3.scale.log()
		//.domain([0,1,2,3,4,5,6,7,8])
		.range(M_COLOR_SCALE);


	// Load default dataset once ready
	$(document).on("meta_files_ready", function() {
		current_datsel = gdata[0]; // TODO [get from dom] (depends on data management)
		if(!statifyUrl()) {
			$("#filter input")[DEFAULT_DATASET].click(); // select&load initial dataset
		}
		onResize(); // set canvas dimensions
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

	// get new viewport size
	viewportW = $(window).width();
	viewportH = $(window).height();

	// set canvas dimensions
	canvasT = Math.floor($("#map").position().top); 
	canvasL = Math.floor($("#sidebar").width()); //doesen't change but is set here for code maintainability
	canvasW = Math.floor($("#map").width());
	canvasH = Math.floor($("#map").height());
	//d3.selectAll("#map canvas").attr("width", canvasW).attr("height", canvasH);
	$([mapcan.node(),overcan.node()]).attr("width", canvasW).attr("height", canvasH);
	$("#leaflet").css("width", canvasW).css("height",canvasH);
	//mapctx = mapcan.node().getContext("2d");
	overctx = overcan.node().getContext("2d");

	initLeaflet();
	
	genChart();
	genGrid();
}