/////////////////////////
/// general map logic ///
/////////////////////////
/**
* timeout wrapper*/
function genGrid(reso, mAE, data) {
	if(chart === undefined) { return 0; } // depend on timeline
	clearTimeout(redrawTimer);
	redrawTimer = setTimeout(function() {
		generateGrid(reso, mAE, data);
	}, 200);
}

/**
* Generate data grid for the map
* parameters optional */
function generateGrid(reso, mAE, data) {

	/// TODO poperly use global tilemap 

	if(!allow_redraw) { return false; }
	if(data === undefined) { data = current_setsel; } // todo dynamic from filter?
	if( mAE === undefined) {  mAE = getBounds(); }
	if(reso === undefined) { reso = calcReso(); }


	currentGenGrid++;
	var thisGenGrid = currentGenGrid;

	$("#legend").html("<em>massive calculations...</em>");
	setTimeout(function() { //timeout for dom redraw
		console.log("/~~ generating new grid with resolution "+reso+" ~~\\");
		var bms = new Date();
		console.log("  ~ start iterating data");

		var count = 0;
		cellmap = {}; // reset cellmap

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

		var finish = function() {
			console.log("  |BM| iteration complete ("+(new Date()-bms)+"ms)");
			drawPlot(true, cellmap, reso);
			console.log("  |BM| finished genGrid (total of "+(new Date()-bms)+"ms)");

			$("#legend").html("<em>inside the visible area</em><br>"+
				//"<span>["+mAE[0].min.toFixed(1)+","+mAE[1].min.toFixed(1)+"]-["+mAE[0].max.toFixed(1)+","+mAE[1].max.toFixed(1)+"]</span><br>"+
				"we have registered a total of<br>"+
				"<em>"+count+" "+data.parent.label+"</em><br>"+
				"that <em>"+data.strings.term+"</em><br>"+
				"between <em>"+cAE.min+"</em> and <em>"+cAE.max+"</em>");
			$("#export").removeAttr("disabled");

			console.log("\\~~ grid generation complete~~/ ");
		};

		var iterate = function(offset) {
			if(thisGenGrid < currentGenGrid) { return 0; } // cancel if newer genGrid is running
			var cellmapprog = {}, l, a, ti;
			var i = tMin + offset;
			if(i <= tMax) {	// still work to do							// for each map tile in visible area
				for(var j = cAE.min; j <= cAE.max; j++) { 					// go over each key in range
					if(data.data[i][j] !== undefined) {							// if it is defined
						l = data.data[i][j].length;
						for(var k = 0; k < l; k++) {								// go over each event in key and
							a = data.data[i][j][k];
							if(section_filter(a,mAE)) {									// if it actually lies within map bounds
								ti = coord2index(a[ARR_M_LON],a[ARR_M_LAT],reso);
								if(cellmap[ti] === undefined) {	cellmap[ti] = []; }			// aggregate it on the grid
								cellmap[ti].push([a[ARR_M_I],j]);
								cellmapprog[ti] = cellmap[ti];

								count++;
							}
						}
					}
				}
				// draw each tile after aggregating
				drawPlot(false, cellmapprog, reso);
				setTimeout(function() {
					iterate(offset+1);
				},1);

			} else {
				finish();
			}
		};
		iterate(0);

	},1);
}



///////////////
/// filters ///
///////////////

// true if object geo lies within currently visible section
function section_filter(obj,aE){
		return (
			(obj[ARR_M_LAT] >= (aE[1].min)) &&
			(obj[ARR_M_LAT] <= (aE[1].max))	
			
		) && (
			(obj[ARR_M_LON] >= (aE[0].min)) && 
			(obj[ARR_M_LON] <= (aE[0].max))	
		);
}


//////////////////
/// aggregators //
/*/////////////////
function testing_aggregator(tmap,obj,reso) {
	var ti = coord2index(obj[ARR_M_LON],obj[ARR_M_LAT],reso);
	if(tmap[ti] === undefined) {
		tmap[ti] = [];
		tmap[ti].push(obj[2]);
	} else {
		tmap[ti].push(obj[2]);
	}
	return tmap;
}
*/

/**
* draw the map layer
* [@param clear] if false, do not clear canvas before drawing
* [@param newmap] new cell mapping to derive drawing data from
* [@param reso] required if newmap is given - resolution of new gridmap 
* [@param highlight] index of cell to highlight */
function drawPlot(clear, newmap, reso, highlight) {
	if(clear === undefined) { clear = true; }

	if(newmap !== undefined && reso === undefined) { 
		conslole.log('|WARNING| newmap given but no resolution. Using old drawing data.');
	} 

	ctx.save();
	if(clear !== false) {
		ctx.clearRect(0,0,canvasW,canvasH);
	}

	var uMBM = new Date();

	if(newmap !== undefined && reso !== undefined) { // calculate new drawing map
		var draw = [],
			min = Infinity,
			max = -Infinity;
		
		$.each(newmap, function(k,v) {
			var c = index2canvasCoord(k, reso);
			v = v.length;

			draw.push([[c[0],c[1]],v]);

			// get extreme values
			if(v<min) { min = v; }
			if(v>max) { max = v; }
		});
		drawdat = {draw: draw, min: min, max: max, reso: reso};
	}
	console.log("  ~ drawing "+drawdat.draw.length+" shapes");
	console.log("  # data extreme values - min: "+drawdat.min+", max: "+drawdat.max);
	console.log("  |BM| (dataset generation in "+(new Date()-uMBM)+"ms)");

	// color defs
	/// TODO color calculation is buggy
		// (using hsl model might be good idea)
	var rmax, gmax, bmax, rlog_factorm, glog_factor, blog_factor;
	if(colorize) {
		rmax = current_setsel.colorScale.min[0];
		rlog_factor = (rmax-current_setsel.colorScale.max[0])/Math.log(drawdat.max);
		gmax = current_setsel.colorScale.min[1];
		glog_factor = (gmax-current_setsel.colorScale.max[1])/Math.log(drawdat.max);
		bmax = current_setsel.colorScale.min[2];
		blog_factor = (bmax-current_setsel.colorScale.max[2])/Math.log(drawdat.max);
	} else {
		bmax = 255; //215;
		blog_factor = bmax/drawdat.max;//Math.log(drawdat.max);
		gmax = 235; //205;
		glog_factor = gmax/Math.log(drawdat.max);
		rmax = 185;//14;
		rlog_factor = rmax/Math.log(drawdat.max);
	}

	var canvasRenderBM = new Date();

	// sizes and radii of primitiva
	var bleed = 1 + 1/lastTransformState.scale*0.25; // 1.25; // larger size for bleeding with alpha channel
	var wx = ((drawdat.reso*canvasW)/360) * bleed,
		wy = ((drawdat.reso*canvasH)/180) * bleed, 
		rx = ((drawdat.reso*canvasW)/360/2) * bleed,
		ry = ((drawdat.reso*canvasH)/180/2) * bleed;

	var i= -1, n = drawdat.draw.length, d, cx, cy, fc, gradient; // TODO keep only what is used

  	ctx.translate(lastTransformState.translate[0],lastTransformState.translate[1]);
  	ctx.scale(lastTransformState.scale, lastTransformState.scale);

	while(++i < n) {
		d = drawdat.draw[i];
		cx = d[0][0];
		cy = d[0][1];
		ctx.fillStyle = 
		//fc = 
		"rgba("+
			Math.floor(rmax -Math.floor(Math.log(d[1])*rlog_factor))+","+
			Math.floor(gmax -Math.floor(Math.log(d[1])*glog_factor))+","+
			Math.floor(bmax -Math.floor(d[1]*blog_factor))+","+
			".85)";//((d[1]/drawdat.max)/4+0.6)+")";

		/*gradient = ctx.createRadialGradient(cx,cy,rx,cx,cy,0);
		gradient.addColorStop(0,fc+"0)");
		gradient.addColorStop(0.6, fc+"0.4)");
		gradient.addColorStop(0.7, fc+"1)");
		gradient.addColorStop(1,fc+"1)");*/
		//ctx.fillStyle = gradient;

		//ctx.fillRect(cx-rx,cy-rx,wx,wy);
		ctx.fillRect(cx,cy-wy,wx,wy);/*
		ctx.beginPath();
		//ctx.moveTo(cx,cy);
		//ctx.arc(cx, cy, rx, 0, 2 * Math.PI);
		ctx.ellipse(cx, cy, rx, ry, 0, 0, 2*Math.PI);
		//ctx.stroke();
		ctx.fill();
		//*/
	}
	if(highlight !== undefined) {
		if(reso === undefined) { reso = drawdat.reso; }
		var c = index2canvasCoord(highlight, reso);

		/*ctx.fillStyle = "rgba(150,250,150,0.3)";
		ctx.beginPath();
		ctx.arc(c[0]+rx,c[1]-ry,rx*2,0,TPI);
		ctx.fill();*/

		ctx.lineWidth = 2/lastTransformState.scale;
		ctx.strokeStyle = "rgba(255,127,0,0.75)"; //orange";
		ctx.strokeRect(c[0],c[1]-wy,wx,wy);
	}

	console.log("  |BM| canvas rendering of "+drawdat.draw.length+" shapes took "+(new Date()-canvasRenderBM)+"ms");
	ctx.restore();
}