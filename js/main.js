/****************************************************
**************** ViziData main.js *******************
*													*
* Application logic									*
*													*
* this application is still under development		*
* hence the code is somewhat messy					*
*****************************************************
*													*
* some TODOS...										*
*	-design is inflexible for concurrency of		*
*    multiple datagroups. but theres only 1 group	*
*    so far anyway... (humans)						*
*													*
*	-concurrent dataset functionality				*
*    manage data in memory							*
*    multiple layers with opacity slider?			*
*    manage active datasets somehow					*
*    keep the timeline selection somehow			*
*													*
*	-delete all the datasets null vals on init!?	*
*													*
*	-the humans_p file is neither loaded nor used   *
*	('-> filter and instance browse capabilities)	*
*													*
*	-map underlay! maybe leaflet integration		*
*	&&/|| some kind of orientation indicator		*
*													*
*	-map repositioning should be more tolerant		*
*	-[remove all the benchmarking console logs]		*
*****************************************************/

//"use strict"; // nazi linter


////////////////////
/// global scope ///
////////////////////

////////////////////
/// pseudo constants
//^^^^^^^^^^^^^^^^^^
// coord parameters
var C_WMIN = -180,
	C_WMAX = 180,
	C_HMIN = -90,
	C_HMAX = 90,

	C_W = C_WMAX-C_WMIN,
	C_H = C_HMAX-C_HMIN;

// map parameters
var M_BOUNDING_THRESHOLD = 10,	// grid clipping tolerance
	M_ZOOM_RANGE = [1,8],		// zoom range (results in svg scale 2^(v-1))
	M_BUBBLE_OFFSET = 5;		// distance of map tooltip from pointer

// DATA
var DATA_DIR = "./data/",
	META_FILES = [
		"humans.json" 
	];
var DEFAULT_DATASET = 0;	// dataset to load up initially

var	ARR_UNDEFINED = null,	// undefined value
	ARR_M_LON = 0,			// longitude
	ARR_M_LAT = 1,			// latitude
	ARR_M_I = 2;			// ref to prop
///_________________
/// pseudo constants
////////////////////

///////////////
/// global vars
//^^^^^^^^^^^^^
var chart,		// Timeline / dataLine
	plotlayer,  // plot drawing layer (<g>)
	bubble,		// popup bubble on map
	zoombh;		// zoomBehavior

var allow_redraw = true,
	colorize = true,
	redrawTimer, // genGrid
	bubbleTimer, // hide map tooltip bubble
	boundsTimer; // forceBounds

var gdata = [],		// global rawdata
	current_datsel,	// slected data group
	current_setsel;	// selected dataset
	
var viewportH,
	viewportW;

var lastTransformState; // remember map scaling (only redraw on changes)
//_____________
/// global vars
///////////////


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

	// setup svg
	zoombh = d3.behavior.zoom().scaleExtent([Math.pow(2,M_ZOOM_RANGE[0]-1), Math.pow(2,M_ZOOM_RANGE[1]-1)]).on("zoom", zoom);
	d3.select("#mapcanvas").append("g").attr("id","maplayer");//experimental
	plotlayer = d3.select("#mapcanvas")
		.attr("viewBox", "-1 -1 "+(C_W+1)+" "+(C_H+1))
			.call(zoombh)
			.append("g")
				.attr("id","heatlayer");


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



//////////////////////
/// data processor ///
//////////////////////
function genChart(data){
	if(data === undefined) { data = current_setsel; } // TODO

	console.log("/~~ generating chart data ~~\\ ");

	var benchmark_chart = new Date();

	var dat_arr = [],
		i,j,d,sum;

	for(i=data.min; i<=data.max; i++) {
		d = data.data[i];
		if(d !== undefined) {
			sum = 0;
			for(j=0; j<d.length; j++) {
				if(d[j] !== ARR_UNDEFINED) {
					sum += d[j].length;
				}
			}
			dat_arr.push([new Date(0,0).setFullYear(i),sum]);
		}
	}

	console.log("  |BM| iterating and sorting finished (took "+(new Date()-benchmark_chart)+"ms)");

	updateChart([{
		data: dat_arr,
		name: data.strings.label
	}]);
	console.log("  |BM| chart creation complete (total of "+(new Date()-benchmark_chart)+"ms");
	console.log("\\~~ finished generating chart ~~/ ");
}


/**
* timeout wrapper*/
function genGrid(reso, mAE, data) {
	clearTimeout(redrawTimer);
	redrawTimer = setTimeout(function() {
		generateGrid(reso, mAE, data);
	}, 300);
}
/**
* Generate data grid for the map
* parameters optional */
function generateGrid(reso, mAE, data) {

	if(!allow_redraw) { return false; }
	if(data === undefined) { data = current_setsel; } // todo dynamic from filter?
	if( mAE === undefined) {  mAE = getBounds(); }
	if(reso === undefined) { reso = calcReso(); }

	$("#legend").html("<em>massive calculations...</em>");
	setTimeout(function() { //timeout for dom redraw
		console.log("/~~ generating new grid with resolution "+reso+" ~~\\");
		var bms = new Date();
		console.log("  ~ start iterating data");

		var tile_mapping = {};
		var count = 0;

		/// calculate everything we can outside the loop for performance
		// get axisExtremes
		var cAE = chart.xAxis[0].getExtremes();
		cAE.min = new Date(cAE.min).getFullYear();
		cAE.max = new Date(cAE.max).getFullYear();

		// boundary enforcement
		if(mAE[0].min < C_WMIN) { mAE[0].min = C_WMIN; }
		if(mAE[0].max > C_WMAX) { mAE[0].max = C_WMAX; }
		if(mAE[1].min < C_HMIN) { mAE[1].min = C_HMIN; }
		if(mAE[1].max > C_HMAX) { mAE[1].max = C_HMAX; }

		var tMin = 0;
		while(mAE[0].min > (C_WMIN+(tMin+1)*data.parent.tile_width)) {
			tMin++;
		}
		var tMax = tMin;
		while(mAE[0].max > (C_WMIN+(tMax+1)*data.parent.tile_width)) {
			tMax++;
		}
		console.log("  # will iterate over tiles "+tMin+" to "+tMax);

		for(var i = cAE.min; i<=cAE.max; i++) {
			if(data.data[i] !== undefined) {
				for(var j = tMin; j<=tMax; j++) {
					if((data.data[i][j] !== ARR_UNDEFINED) && (data.data[i][j] !== undefined)) {
						for(var k = 0; k<data.data[i][j].length; k++) {
							if(section_filter(data.data[i][j][k],mAE)) {
								tile_mapping = testing_aggregator(tile_mapping,data.data[i][j][k], reso);
								// TODO remove function call for performance?
								count++;
							}
						}
					}
				}
			}
		}

		console.log("  |BM| iteration complete ("+(new Date()-bms)+"ms)");
		drawPlot(tile_mapping, reso);
		console.log("  |BM| finished genGrid (total of "+(new Date()-bms)+"ms)");

		$("#legend").html("<em>in this area</em><br>"+
			//"<span>["+mAE[0].min.toFixed(1)+","+mAE[1].min.toFixed(1)+"]-["+mAE[0].max.toFixed(1)+","+mAE[1].max.toFixed(1)+"]</span><br>"+
			"we have registered a total of<br>"+
			"<em>"+count+" "+data.parent.label+"</em><br>"+
			"that <em>"+data.strings.term+"</em><br>"+
			"between <em>"+cAE.min+"</em> and <em>"+cAE.max+"</em>");
		$("#export").removeAttr("disabled");

		console.log("\\~~ grid generation complete~~/ ");
	},1);
}



///////////////
/// filters ///
///////////////

// true if object geo lies within currently visible section
function section_filter(obj,aE){
		return (
			(obj[ARR_M_LON] >= (aE[0].min)) && 
			(obj[ARR_M_LON] <= (aE[0].max))
		) && (
			(obj[ARR_M_LAT] >= (aE[1].min)) &&
			(obj[ARR_M_LAT] <= (aE[1].max))		
		);
}


//////////////////
/// aggregators //
//////////////////
function testing_aggregator(tmap,obj,reso) {
	var ti = coord2index(obj[ARR_M_LON],obj[ARR_M_LAT],reso);
	if(tmap[ti] === undefined) {
		tmap[ti] = 1;
	} else {
		tmap[ti]++;
	}
	return tmap;
}


///////////////////////////
/// utilities & helpers ///
///////////////////////////

/**
* loads data
* for dataset with given index */
function setSetSel(dsi) { //, callback){
	if(current_datsel.datasets[dsi].data !== undefined) {
		current_setsel = current_datsel.datasets[dsi];
		genChart();
		genGrid();
	} else {
		// loading feedback
		var l = 0;
		var lAnim = setInterval(function(){
		var txt = [
			"loading... &nbsp; &nbsp; ┬──┬﻿",
			"loading... &nbsp; &nbsp; ┬──┬﻿",
			"loading... (°o°） ┬──┬﻿",
			"loading... &nbsp;(°o°）┬──┬﻿",
			"loading... (╯°□°）╯ ┻━┻",
			"loading... (╯°□°）╯︵ ┻━┻",
			"loading... (╯°□°）╯︵ ︵ ┻━┻",
			"loading... (╯°□°）╯︵ ︵ ︵ ┻━┻",
			"loading... ︵ ︵ ︵ ┻━┻",
			"loading... ︵ ︵ ┻━┻",
			"loading... ︵ ┻━┻",
			"loading... &nbsp; &nbsp; ┻━┻ &nbsp; &nbsp; (ツ)",
			"loading... &nbsp; &nbsp; ┻━┻ &nbsp; &nbsp;(ツ)",
			"loading... &nbsp; &nbsp; ┻━┻ &nbsp; (ツ)",
			"loading... &nbsp; &nbsp; ┻━┻ &nbsp;(ツ)",
			"loading... &nbsp; &nbsp; ┬──┬﻿ ¯\\_(ツ)",
			"loading... &nbsp; &nbsp; ┬──┬﻿ (ツ)",
			];
		$("#legend").html(txt[l]);
		l = (l+1)%17;
		},180);

		var lBM = new Date();
		console.log("~~ starting to load dataset "+current_datsel.datasets[dsi].strings.label+" ~~ ");
		$.getJSON(DATA_DIR+gdata[0].datasets[dsi].file, function(data){
			console.log(" |BM| finished loading "+current_datsel.datasets[dsi].strings.label+" data (took "+(new Date()-lBM)+"ms)");
			clearInterval(lAnim);
			
			current_datsel.datasets[dsi].data = data;

			current_setsel = current_datsel.datasets[dsi];
			genChart();
			genGrid();

		});
	}
}


/**
* updates/builds the chart
* (addSeries is bugged so build the chart from the ground)*/
function updateChart(seriez) {
	if(chart !== undefined) { chart.destroy(); }

	chart = new Highcharts.StockChart({
		chart: {
			type: 'spline',
			renderTo: 'chart'
		},
		title: {
			text: null
		},
		credits: {
			enabled: false
		},
		rangeSelector: {
			enabled: true,
			buttons: [{
				type: "year",
				count: 10,
				text: "10y"
			},{
				type: "year",
				count: 100,
				text: "100y"
			},{
				type: "year",
				count: 1000,
				text: "1000y"
			},{
				type: "all",
				text: "all"
			}],
			buttonTheme: {
				width: 80
			}
		},
		legend: {
			enabled: false
		},
		yAxis: {
			floor: 0,
			type: "logarithmic"
		},
		xAxis: {
			type: "linear",
			events: {
				setExtremes: function() {
					clearTimeout(redrawTimer);
					redrawTimer = setTimeout(genGrid, 200); // (!)genGrid adds another timeout
				}
			}
		},
		navigator: {
			margin: 5,
			enabled: true,
			xAxis: {
				type: "linear"
			}
		},
		plotOptions: {
			series: {
				dataGrouping: {
					enabled: true
				}
			}
		},//*/
		tooltip: {
			xDateFormat: "%Y"
		},
		series: seriez
	});

}

function drawPlot(tm,reso) {
	plotlayer.selectAll("circle").remove();

	var uMBM = new Date();
	var dataset = [];
	var min = Infinity,
		max = -Infinity;

	$.each(tm, function(k,v) {
		var c = index2canvasCoord(k, reso);

		dataset.push([[c[0],c[1]],v]);
		
		// get extreme values
		if(v<min) { min = v; }
		if(v>max) { max = v; }
	});
	console.log("  ~ drawing "+dataset.length+" shapes");
	console.log("  # data extreme values - min: "+min+", max: "+max);
	console.log("  |BM| (dataset generation in "+(new Date()-uMBM)+"ms)");

	// color defs
	if(colorize) {
		var rmax = current_setsel.colorScale.min[0],
			rlog_factor = (rmax-current_setsel.colorScale.max[0])/Math.log(max),
			gmax = current_setsel.colorScale.min[1],
			glog_factor = (gmax-current_setsel.colorScale.max[1])/Math.log(max),
			bmax = current_setsel.colorScale.min[2],
			blog_factor = (bmax-current_setsel.colorScale.max[2])/Math.log(max);
	} else {
		var bmax = 255, //215,
		blog_factor = bmax/max;//Math.log(max),
		gmax = 235, //205,
		glog_factor = gmax/Math.log(max),
		rmax = 185,//14,
		rlog_factor = rmax/Math.log(max);
	}

	
	var plotBM = new Date();

	/*var circles = plotlayer.selectAll("circle")
			.data(dataset);
	circles.exit().remove();
	circles.enter().append("circle");*/

	plotlayer.selectAll("circle")
		.data(dataset)
		.enter()
		.append("circle")
	//circles
		.attr("cx", function(d) { return d[0][0]; })
		.attr("cy", function(d) { return d[0][1]; })
		.attr("r", function(d) { return reso/2; })//(((d[1]/max)*1.2)*(reso/2)+(reso/4)); })*/
		.attr("fill", function(d) { 
			//if(d[1]/max > 0.1) console.log("jo hey it's "+d[1]/max);
			var r = Math.floor(rmax -Math.floor(Math.log(d[1])*rlog_factor));
			var g = Math.floor(gmax -Math.floor(Math.log(d[1])*glog_factor));
			var b = Math.floor(bmax -Math.floor(d[1]*blog_factor));
			return "rgb("+r+","+g+","+b+")"; //rgba(0,"+g+","+b+",1)";
		})
		//.attr("data-value", function(d) { return d[1]; })
		.on("mouseover", function(d) { mouseOver(d); })
		.on("mouseout", function() { mouseOut(); });

	console.log("  |BM| (svg manipulation took "+(new Date()-plotBM)+"ms)");
	console.log("  |BM| plot drawn in "+(new Date()-uMBM)+"ms");
}


function mouseOver(d) {
	clearTimeout(bubbleTimer);
	$("div#bubble").css("opacity","1")
		.css("bottom",((viewportH-d3.event.pageY)+M_BUBBLE_OFFSET)+"px")
		.css("right",((viewportW-d3.event.pageX)+M_BUBBLE_OFFSET)+"px")
		.html(d[1]+" <em>"+current_setsel.strings.label+"</em><br>"+
			"<span>["+(d[0][0]-180).toFixed(2)+", "+(d[0][1]*(-1)+90).toFixed(2)+"]</span>");
}

function mouseOut() {
	clearTimeout(bubbleTimer);
	bubbleTimer = setTimeout(function() {
		$("div#bubble").css("opacity", "0");
	},250);
}


/**
* returns grid resolution*/
function calcReso(t) {
	if(t === undefined) { t = getTransform(); }
	var rf = parseFloat($("#reso-slider").val());
	return (1/t.scale)*rf;
}

function getBounds(t) {
	if(t === undefined) { t = getTransform(); }

	var xmin = (-t.translate[0])/t.scale+C_WMIN,
		ymin = (-t.translate[1])/t.scale+C_HMIN,
		bth = M_BOUNDING_THRESHOLD/(t.scale/2);

	var bounds = [{
		min: xmin - bth,
		max: xmin+(C_WMAX-C_WMIN)/t.scale + bth
	},{
		min: -(ymin+(C_HMAX-C_HMIN)/t.scale) - bth,
		max: -ymin + bth
	}];

	return bounds;
}

/**
* returns the index value for the cell of a grid with given resolution
* where the given coordinate pair lies in*/
function coord2index(longi, lati, reso) {
	if(longi === C_WMAX) longi -= reso;	// prevent 
	if(lati  === C_HMAX) lati  -= reso; // out of bounds tiles

	return (Math.floor(lati/reso)*((C_WMAX-C_WMIN)/reso) + Math.floor(longi/reso));
}

function index2canvasCoord(i, reso) {
	var cpr = (C_WMAX-C_WMIN)/reso;

	var rowpos = (i-cpr/2)%cpr;
	if(rowpos<0) rowpos += cpr;
	rowpos -= cpr/2;

	var lbx = (rowpos*reso)+(-C_WMIN)+reso/2,
		lby = ((Math.floor((+i+cpr/2)/cpr)*reso)*(-1))+(-C_HMIN)+reso/2;
	
	return [lbx,lby];

	/* // Hammer Projection testing
	var lbx = (rowpos*reso),
		lby = (Math.floor((+i+cpr/2)/cpr)*reso);

	var pro = d3.geo.hammer()
    .scale(80)
    .translate([0, 0])
    .precision(.1);
    var ret = pro([lbx,lby]);
    ret[0] += -C_WMIN;
    ret[1] += -C_HMIN;

	return ret; //[lbx,lby];*/
}

/**
* returns the coordinate values for the center of the cell
* with given index in the grid of given resolution*/
function index2coord(i, reso) {
	var cpr = 360/reso;

	var rowpos = (i-cpr/2)%cpr;
	if(rowpos<0) rowpos += cpr;
	rowpos -= cpr/2;

	var lbx = rowpos*reso+reso/2,
		lby = Math.floor((+i+cpr/2)/cpr)*reso+reso/2;

	return [lbx,lby];
}//*/


/**
* zoom the svg */
function zoom() {
	if( d3.event.translate[0] !== lastTransformState.translate[0] ||
		d3.event.translate[1] !== lastTransformState.translate[1] ||
		d3.event.scale !== lastTransformState.scale) {
		plotlayer.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		
		lastTransformState = d3.event;
		
		$("#ctrl-zoom>input").val((Math.log(d3.event.scale)/Math.log(2)+1).toFixed(1));

		forceBounds();
		genGrid();
	}
}

function forceBounds() {
	clearTimeout(boundsTimer);
	boundsTimer = setTimeout(function() {
		forceBoundsFkt();
	},300);
}

function forceBoundsFkt() {
	var b;
	if(b=giveBounds()) {
		transitTo(b);
	}
}

/**
* returns false if t is in map bounds
* proper bounds otherwise 
*(very anti-elegant function...)*/
function giveBounds(t) {
	if(t === undefined) { t = getTransform(); }
	var b = {translate: []};
	var flag = false;

	if(t.translate[0] > 0) { b.translate[0] = 0; flag=true;}
	if(t.translate[1] > 0) { b.translate[1] = 0; flag=true;} 
	if(t.translate[0] < (t.scale-1)*C_W*(-1)) { b.translate[0] = (t.scale-1)*C_W*(-1); flag=true; }
	if(t.translate[1] < (t.scale-1)*C_H*(-1)) { b.translate[1] = (t.scale-1)*C_H*(-1); flag=true; }

	if(flag) {
		if(b.translate[0] === undefined) { b.translate[0] = t.translate[0]; }
		if(b.translate[1] === undefined) { b.translate[1] = t.translate[1]; }
		b.scale = t.scale;
		return b;
	} else {
		return false;
	}
}

function transitTo(t) {
	if(t === undefined) { console.error("transitTo: invalid fkt call, t undefined"); return 0; }

	zoombh.scale(t.scale);
	zoombh.translate(t.translate);

	d3.select("#heatlayer")
		.transition()
		.duration(600)
		.ease("cubic-in-out")
		.attr("transform", "translate("+t.translate+")scale("+t.scale+")");
	genGrid(calcReso(t), getBounds(t));

}

function getZoomTransform(zoom) {
	//if(zoom === undefined) { return 0; }
	var t = getTransform();

	zoom = Math.pow(2,zoom-1); 
	var dz = zoom/t.scale;

	var centerfak  = (dz < 1) ? -(1-dz) : dz-1;

	t.translate[0] = (parseFloat(t.translate[0])*dz)-C_W/2*centerfak;
	t.translate[1] = (parseFloat(t.translate[1])*dz)-C_H/2*centerfak;

	t.scale = zoom;

	var h = giveBounds(t);
	if(h) { t = h; }

	return t;
}


function getTransform(el) {
	if(el === undefined) { el = plotlayer; }
	var t;
	if(el.attr("transform") === null) {
		t = {scale: 1, translate: [0,0]};
	} else {
		t = parseTransform(el.attr("transform"));
	}
	return t;
}

function parseTransform (s) {
    var r = {};
    for (var i in (s = s.match(/(\w+\((\-?\d+\.?\d*,?)+\))/g))) {
        var m = s[i].match(/[\w\.\-]+/g);
        r[m.shift()] = m;
    }
    if(r.scale === undefined) { r.scale = 1; }
    if(r.scale.length !== undefined) { r.scale = r.scale[0]; }
    if(r.translate === undefined) { r.translate = [0,0]; }

    return r;
}



///
// functionality

function setupControlHandlers() {

	// build filter menu
	var fn = function() { setSetSel(this.value); };
	var filter = $("#filter");
	for(var i = 0; i<gdata.length; i++) {
		var fs = $("<fieldset>");
		fs.append('<legend>'+gdata[i].title+'</legend>');
		for(var j=0; j<gdata[i].datasets.length; j++) {
			
			var b = $('<input type="radio" name="radio" value="'+j+'" />')
				.on("change", fn);

			fs.append($('<label>'+gdata[i].datasets[j].strings.label+'</label>').prepend(b));
		}
		filter.append(fs);
	}

	$("#controls input[type=\"range\"]")
		.on("input", function() {
			$(this).next("input[type=\"text\"").val(parseFloat($(this).val()).toFixed(1));
		});
	$("#zoom-slider").on("change", function() {
		transitTo(getZoomTransform($(this).val()));
	});
	$("#reso-slider").on("change", function() {
		genGrid();
	});


	$(window).resize(function() {
		viewportW = $(this).width();
		viewportH = $(this).height();
	});

	$("#export").click(function() {
		$(this).attr("disabled","disabled");
		exportSvg();
	});
}

/**
 * SVG export*/
function exportSvg() {
	$("#export").attr("disabled", "disabled");

    var iframe = $('<iframe>',{css:{display:'none'}})
		.appendTo('body');

    var formHTML = '<form action="" method="post">'+
        '<input type="hidden" name="filename" />'+
        '<input type="hidden" name="content" />'+
        '</form>';

    var body = iframe.prop('contentDocument').body;
    /* don't care about IE
    (iframe.prop('contentDocument') !== undefined) ?
		iframe.prop('contentDocument').body :
        iframe.prop('document').body;	// IE*/
    $(body).html(formHTML);

    var form = $(body).find('form');
    form.attr('action',"export.php");
    form.find('input[name=filename]').val("dataPlot.svg");
    form.find('input[name=content]').val($("#map").html());

    // Submitting the form to export.php. This will
    // cause the file download dialog box to appear.
    form.submit();
}



/////////////////////////////
/// Highcharts Extensions ///
/////////////////////////////

Highcharts.wrap(Highcharts.Chart.prototype, 'pan', function (proceed) {

  proceed.apply(this, Array.prototype.slice.call(arguments, 1));
  genGrid();

});