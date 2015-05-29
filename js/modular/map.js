/////////////////////////
/// general map logic ///
/////////////////////////
/**
** grid generation and 
** drawing functions 
*/

/** 
* genGrid timeout wrapper*/
function genGrid(reso, mAE, data) {
	if(chart === undefined) { return 0; } // depend on timeline
	clearTimeout(redrawTimer);
	redrawTimer = setTimeout(function() {
		generateGrid(reso, mAE, data);
	}, CALC_TIMEOUT);
}

/**
* Generate data grid for the map
* all parameters optional */
function generateGrid(reso, mAE, data) {
	if(!allow_redraw) { return false; }

	if(data === undefined) { data = current_setsel; } 
	if( mAE === undefined) {  mAE = getBounds(true); }
	if(reso === undefined) { reso = calcReso(); }

	/// main function body
	var worker = function() {
		
		console.log("/~~ generating new grid with resolution "+reso+" ~~\\");
		var bms = new Date();
		var progBM = '';
		console.log("  ~ start iterating data");

		var count = 0;
		cellmap = {}; // reset cellmap

		/// calculate everything we can outside the loop for performance
		setColorScale(reso);

		// get axisExtremes
		var cAE = getTimeSelection();

		// min and max tile
		var mmt = getMinMaxTile(mAE);
		var tMin = mmt.min,
			tMax = mmt.max;
		console.log("  # will iterate over tiles "+tMin+" to "+tMax);
		
		// tile processing direction
		renderRTL = lastMapCenter.lng > (lastMapCenter = leafly.getCenter()).lng;

		/// finish
		var finish = function() {
			//console.log("  |BM| progressive drawing(ms): " + progBM);
			console.log("  |BM| iteration complete ("+(new Date()-bms)+"ms)");
			calcPlotDat(cellmap, reso);
			console.log("  |BM| finished genGrid (total of "+(new Date()-bms)+"ms)");

			var term = data.strings.term || L_DEFAULT_TERM;
			$("#legend").html("<em>inside the visible area</em><br>"+
				//"<span>["+mAE[0].min.toFixed(1)+","+mAE[1].min.toFixed(1)+"]-["+mAE[0].max.toFixed(1)+","+mAE[1].max.toFixed(1)+"]</span><br>"+
				"we have registered a total of<br>"+
				"<em>"+count+" "+data.strings.label+"</em><br>"+
				term.replace("%l", "<em>"+cAE.min+"</em>")
					.replace("%h", "<em>"+cAE.max+"</em>"));

			selectCell(); // urlifyState(); // is always called in selectCell

			console.log("\\~~ grid generation complete~~/ ");
			mutexGenGrid = 0;
			leaflaggrid._redraw();
		};

		/// iterate & aggregate over a single tile
		var iterate = function(offset) {
			if(mutexGenGrid === -1) {	// cancel loop
				mutexGenGrid = 0;		// if new function call
				return 0;				// has been made
			}
			var cellmapprog = {}, a, ti, i, j, k, it;
			if(!renderRTL) { i = tMin + offset; }
					  else { i = tMax - offset; }
			if(i <= tMax && i >= tMin) {	// still work to do	
				it = data.itarraytor[i].length;					// for each map tile in visible area
				while(it--) {										
					j = data.itarraytor[i][it];						// go over each key
					if(j >= cAE.min && j <= cAE.max) {					// if it is in selection range
						k = data.data[i][j].length;
						while(k--) {										// go over each event in key and
							a = data.data[i][j][k];
							if(section_filter(a,mAE)) {							// if it actually lies within map bounds
								ti = coord2index(a[ARR_M_LON],a[ARR_M_LAT],reso);
								if(cellmap[ti] === undefined) {	cellmap[ti] = []; }	// aggregate it on the grid
								cellmap[ti].push([a[ARR_M_I],j]);
								cellmapprog[ti] = cellmap[ti];
								count++;
							}
						}
					}
				}
				// draw each tile after aggregating 
				calcPlotDat(cellmapprog, reso, i);
				leaflaggrid._redraw();
				setTimeout(function() {	iterate(++offset); },1);
			} else { // iterated over all tiles
				finish();
			}
		};
		iterate(0); // kick it off
	};

	// set it all in motion - if no other generation is running
	if(mutexGenGrid === 1) { mutexGenGrid = -1;	}
	var goOn = function() {
		if(mutexGenGrid !== 0) { setTimeout(goOn,10); }
		else {
			mutexGenGrid = 1;
			$("#legend").html("<em>massive calculations...</em>");
			setTimeout(worker,1); //timeout for dom redraw
	}	};
	goOn();
}



////////////////
/// filters ///
//////////////
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

//////////////////////
/// drawing logic ///
////////////////////
/**
* calculate new plot drawing object 
* [@param newmap] new cell mapping to derive drawing data from
* [@param reso] required if newmap is given - resolution of new gridmap 
* [@param tile] int if generating for a specific tile, undefined otherwise i*/
function calcPlotDat(newmap, reso, tile) {
	if(newmap !== undefined && reso === undefined) { 
		conslole.warn('drawPlot(): newmap given but no resolution. Using old drawing data.');
	} 

	var uMBM = Date.now();

	if(newmap !== undefined && reso !== undefined) { // calculate new drawing map
		var draw = [],
			min = Infinity,
			max = -Infinity;
		
		$.each(newmap, function(k,v) {
			var c = index2canvasCoord(k,reso);
			v = v.length;
			draw.push([c,v]);

			// get extreme values
			if(v<min) { min = v; }
			if(v>max) { max = v; }
		});
		drawdat = {draw: draw, min: min, max: max, reso: reso};
	}

	drawdat.tile = tile;
	if(tile === undefined) {
		console.log("  ~ drawing "+drawdat.draw.length+" shapes");
		console.log("  # data extreme values - min: "+drawdat.min+", max: "+drawdat.max);
		console.log("  |BM| (dataset generation in "+(new Date()-uMBM)+"ms)");
	}
}

/**
* mapgrid drawing function hooked to leaflet */
function drawPlot(leavas, params) {
	if(drawdat.draw === undefined) { return false; }

	var bm = Date.now();

	var mapctx = params.canvas.getContext('2d');

	// for compensating leaflets css transformation
	var transform = $(params.canvas).css("transform");
	transform = transform.split(",");
	var curAgPos = [
		parseInt(transform[transform.length-2]),  // x
		parseInt(transform[transform.length-1])]; // y
	var dx = curAgPos[0] - lastAgPos[0],
		dy = curAgPos[1] - lastAgPos[1];
	
	// sizes and radii of primitiva
	var bleed = parseFloat($("#bleed-slider").val()),
		wx = drawdat.reso*bleed,
		rx = wx/2,
		rr = drawdat.reso / 2;
	drawdat.wx = wx;
	drawdat.rx = rx;
	drawdat.rr = rr;


	mapctx.save();
	if(drawdat.tile === undefined) {
		mapctx.clearRect(0,0,params.canvas.width, params.canvas.height);
	} else if(typeof drawdat.tile === "number") {
  		clearTile(drawdat.tile);
  	}

  	// apply transparency when overlapping
  	var galph = 1.0 - ((bleed - 1) * 0.15);
  	if(galph > 1) { galph = 1.0; }
  	mapctx.globalAlpha = galph;

	var i= drawdat.draw.length, d, cx, cy;

  	

	while(i--) {
		d = drawdat.draw[i];

		cx = d[0].x - dx + rr;
		cy = d[0].y - dy + rr;

		mapctx.fillStyle = colorScale(d[1]);
		mapctx.beginPath();
		mapctx.arc(cx, cy, rx, 0, TPI);
		mapctx.fill();
	}

	if(drawdat.tile === undefined) {
		console.log("  |BM| canvas rendering of "+drawdat.draw.length+" shapes took "+(Date.now()-bm)+"ms");
	}
	mapctx.globalAlpha = 1.0;
	mapctx.restore();

	lastAgPos = curAgPos;
	//return (Date.now()-bm);
}


function highlightCell(c) {

	var x,y,p,linewidth = 2;
	var wx = drawdat.wx, rx = drawdat.rx, rr = drawdat.rr;

	overctx.save();
	overctx.clearRect(0,0,canvasW,canvasH);

	// highlight the currently selected cell
	if(selectedCell !== false) {
  		p = index2canvasCoord(selectedCell, drawdat.reso);
  		x = p.x + rr;
  		y = p.y + rr;

  		// fill the point
  		overctx.fillStyle = "rgba(255,120,0,0.8)";
		overctx.beginPath();
		overctx.arc(x, y, rx, 0, TPI);
		overctx.fill();
		// draw 2 strokes around it
		overctx.strokeStyle = "rgba(255,255,255,0.4)";
		overctx.lineWidth = 3 * linewidth;
		overctx.beginPath();
		overctx.arc(x,y,rx*1.5,0,TPI);
		overctx.stroke();
		overctx.strokeStyle = "rgba(0,0,0,0.5)";
		overctx.lineWidth = 1 * linewidth;
		overctx.beginPath();
		overctx.arc(x,y,rx*1.5,0,TPI);
		overctx.stroke();
  	}

	if(c === false) { 
		overctx.restore();
		return false; 
	}
	
	// highlight the currently hovered cell
	p = index2canvasCoord(c, drawdat.reso);
	x = p.x + rr;
	y = p.y + rr;
	
	// glow circle
	var gradient = overctx.createRadialGradient(x, y, 0, x, y, wx*2);
	gradient.addColorStop(0,"rgba(255,255,255,0");
	gradient.addColorStop(0.25, "rgba(255,255,255,0.5");
	gradient.addColorStop(1,"rgba(255,255,255,0");
	overctx.fillStyle = gradient;
	overctx.beginPath();
	overctx.arc(x,y,rx*4,0, TPI);
	overctx.fill();
  	// inner fill
  	overctx.fillStyle = "rgba(255,244,10,0.9)";
	overctx.beginPath();
	overctx.arc(x, y, rx, 0, TPI);
	overctx.fill();
	
	overctx.restore();
}

 /**
 * highlight all cells that contain data in key */
function highlightCellsFor(key) {
	var data = current_setsel.data,	
		reso = drawdat.reso, 
		rx = drawdat.rx,
		rr = drawdat.rr;

	//var bm = Date.now();

	drawWhat();
	var mAE = drawdat.bounds,
		mmt = drawdat.mmt;

	/* supposed to be better and more reliable
	// but actually slower..
	var k, l, ca = [];
	$.each(cellmap, function(k) {
		l = cellmap[k].length;
		while(l-- && (cellmap[k][l][1] !== key)) {}
		if(l >= 0) { ca.push(k); }
	});*/
	// gather all visible cells that have content in key
	var i,t,j,ci, cmap = {}, ca = [];
	for(i = mmt.min; i <= mmt.max; i++) {
		if((t = data[i][key]) !== undefined) {
			j = t.length;
			while(j--) {
				if(section_filter(t[j],mAE)){
					ci = coord2index(t[j][ARR_M_LON],t[j][ARR_M_LAT],reso);
					cmap[ci] = true;
	}	}	}	}
	$.each(cmap, function(k) { ca.push(k); });

	overctx.save();
	overctx.clearRect(0,0,canvasW,canvasH);

	overctx.fillStyle = "rgba(255,255,255,0.7)";
	overctx.strokeStyle = "rgba(0,0,0,1)";
	overctx.lineWidth = rx/2;

  	var x, y, p;
	i = ca.length;
  	while(i--) {
  		p = index2canvasCoord(ca[i], reso);
  		x = p.x + rr;
  		y = p.y + rr;
 
  		overctx.beginPath();
  		overctx.arc(x, y, rx, 0, TPI);
  		overctx.fill();
  		overctx.stroke();
  	}
  	overctx.restore();
	//console.log(Date.now() - bm + 'ms');
}

function initLeaflet() {
	if(leafly !== undefined) { 
		leafly.invalidateSize();
		return false; 
	}

	leafly = L.map('leaflet', {
		//maxBounds: [[-90,-180],[90,180]],
		attributionControl: false,
		worldCopyJump: true
	}).setView([0,0], 2);
	leafly.___eventHandlersAtached = false;

	leafloor = L.tileLayer('', {
		//noWrap: true,
		subdomains: ["a", "b", "c", "d"],
		minZoom: M_ZOOM_RANGE[0],
		maxZoom: M_ZOOM_RANGE[1]
	});
	leafloor.addTo(leafly);
	
	L.control.attribution({prefix: false}).addAttribution(
		'<a id="home-link" target="_top" href="http://maps.stamen.com/">Map tiles</a> by '+
		'<a target="_top" href="http://stamen.com">Stamen Design</a>, '+
		'under <a target="_top" href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. '+
		'Data by <a target="_top" href="http://openstreetmap.org">OpenStreetMap</a>, '+
		'under <a target="_top" href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.')
		.addTo(leafly);
	
	leaflaggrid = L.canvasOverlay();
	leaflaggrid
		.drawing(drawPlot)
		.addTo(leafly);
}

function attachMapHandlers() {
	if(leafly.___eventHandlersAtached === true) {
		console.warn("attachMapHandlers() has been called again.");
		return false;
	}

	leafly.on("movestart", function() {
		selectCell(false);
	}).on("moveend", function() {
		//clearGrid();
		genGrid();
		genChart(); // maybe there is a less destructive way? works fast enough though
	}).on("zoomend", function() {
		drawdat.draw = undefined;
		clearGrid();
	}).on("mousemove", function(e) {
		canvasMouseMove(e);
	}).on("click", function(e) {
		canvasMouseClick(e);
	});
	leafly.___eventHandlersAtached = true;
}

function changeTileSrc() {
	if(leafloor === undefined) { return false; }

	var upre = 'http://{s}.sm.mapstack.stamen.com/',
		usuf = '/{z}/{x}/{y}.png',
		parm = '(',
		url;
	$("#ctrl-maplayer input[type=checkbox]").each(function() {
		if(this.checked) {
			if(parm !== '(') { parm += ','; }
			parm += $(this).attr("data-str");
		}
	});
	if(parm === '(') { url = ''; }
	else { url = upre + parm + ')' + usuf; }
	leafloor.setUrl(url);
}