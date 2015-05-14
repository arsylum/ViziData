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
	mapcan = d3.select("#map").append("canvas")//.call(zoombh)
		.on("mousemove", canvasMouseMove).on("click", canvasMouseClick);
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

function initLeaflet() {
	if(leafly !== undefined) { return false; }

	var tileUrl = "http://{s}.sm.mapstack.stamen.com/(toner-lite,$fff[difference],$fff[@23],$fff[hsl-saturation@20])/{z}/{x}/{y}.png";
	tileUrl = "http://{s}.sm.mapstack.stamen.com/((toner-background,$fff[@30],$002266[hsl-color@40]),(toner-labels,$fff[@10]))/{z}/{x}/{y}.png";
//http://a.sm.mapstack.stamen.com/(water-mask,$000[@10],$00ff55[hsl-color])/3/3/6.png
//http://b.sm.mapstack.stamen.com/((toner-background,$fff[difference],$fff[@60]),(toner-labels,$000[@10])[@80])/11/330/795.png
	leafly = L.map('leaflet', {
		maxBounds: [[-90,-180],[90,180]],
		attributionControl: false
		//worldCopyJump: true,
		//crs: L.CRS.EPSG4326
	}).setView([0,0], 2);
	L.tileLayer(tileUrl, {
		//noWrap: true,
	    //attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
	}).addTo(leafly);
	
	leafly.on("moveend", function(e) {
		genGrid();

	});

	leaflaggrid = L.canvasOverlay();
	leaflaggrid
		.drawing(drawPlot)
		.addTo(leafly);

        /*function drawingOnCanvas(canvasOverlay, params) {
        	var bm = Date.now();
            var ctx = params.canvas.getContext('2d');
            ctx.clearRect(0, 0, params.canvas.width, params.canvas.height);
            ctx.fillStyle = "rgba(255,116,0, 0.7)";
            //var dots = [[0,0],[10,10],[20,20]];

            for(var i = 0; i<drawdat.draw.length; i++) {
            	var p = canvasOverlay._map.latLngToContainerPoint(drawdat.draw[i][0]);
            	ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
            }*/
            
// console.log(Date.now() - bm + "ms");
//         }


}

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