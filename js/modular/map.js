/////////////////////////
/// general map logic ///
/////////////////////////
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


/**
* draw the map layer
*/
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



////////////////////
/// mouse events ///
////////////////////
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
