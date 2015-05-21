/////////////////////////
/// general map logic ///
/////////////////////////
/**
** grid generation and 
** drawing functions 
*/

/**
* timeout wrapper*/
function genGrid(reso, mAE, data) {
	if(chart === undefined) { return 0; } // depend on timeline
	clearTimeout(redrawTimer);
	redrawTimer = setTimeout(function() {
		generateGrid(reso, mAE, data);
	}, CALC_TIMEOUT);
}

/**
* Generate data grid for the map
* parameters optional */
function generateGrid(reso, mAE, data) {

	if(!allow_redraw) { return false; }
	if(data === undefined) { data = current_setsel; } // todo dynamic from filter?
	if( mAE === undefined) {  mAE = getBounds(true); }
	if(reso === undefined) { reso = calcReso(); }


	/// main function body
	var worker = function() { //timeout for dom redraw
		
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

		/*// boundary enforcement
		if(mAE[0].min < C_WMIN) { mAE[0].min = C_WMIN; }
		if(mAE[0].max > C_WMAX) { mAE[0].max = C_WMAX; }
		if(mAE[1].min < C_HMIN) { mAE[1].min = C_HMIN; }
		if(mAE[1].max > C_HMAX) { mAE[1].max = C_HMAX; }*/

		// min and max tile
		var mmt = getMinMaxTile(mAE);
		var tMin = mmt.min,
			tMax = mmt.max;
		console.log("  # will iterate over tiles "+tMin+" to "+tMax);
		

		/// finish
		var finish = function() {
			console.log("  |BM| progressive drawing(ms): " + progBM);
			console.log("  |BM| iteration complete ("+(new Date()-bms)+"ms)");
			//drawPlot(true, cellmap, reso);
			calcPlotDat(cellmap, reso);
			console.log("  |BM| finished genGrid (total of "+(new Date()-bms)+"ms)");

			filledTiles = [tMin+1,tMax-1];

			$("#legend").html("<em>inside the visible area</em><br>"+
				//"<span>["+mAE[0].min.toFixed(1)+","+mAE[1].min.toFixed(1)+"]-["+mAE[0].max.toFixed(1)+","+mAE[1].max.toFixed(1)+"]</span><br>"+
				"we have registered a total of<br>"+
				"<em>"+count+" "+data.parent.label+"</em><br>"+
				"that <em>"+data.strings.term+"</em><br>"+
				"between <em>"+cAE.min+"</em> and <em>"+cAE.max+"</em>");

			selectCell();
			//urlifyState(); // is always called in selectCell

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
			var cellmapprog = {}, l, a, ti, i;
			if(!renderRTL) { i = tMin + offset; }
					  else { i = tMax - offset; }
			if(i <= tMax && i >= tMin) {	// still work to do			// for each map tile in visible area
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
				// draw each tile after aggregating (if not already drawn)
				if(i < filledTiles[0] || i > filledTiles[1]) {
					//progBM += drawPlot(i, cellmapprog, reso) +',';
				}
				setTimeout(function() {
					iterate(++offset);
				},1);
			} else { // iterated over all tiles
				finish();
			}
		};
		iterate(0);
	};

	// set it all in motion - if no other generation is running
	if(mutexGenGrid === 1) { mutexGenGrid = -1;	}
	var goOn = function() {
		if(mutexGenGrid !== 0) { setTimeout(goOn,10); }
		else {
			mutexGenGrid = 1;
			$("#legend").html("<em>massive calculations...</em>");
			setTimeout(worker,1);
	}	};
	goOn();
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
* calculate new plot drawing object */
function calcPlotDat(newmap, reso) {
	if(newmap !== undefined && reso === undefined) { 
		conslole.warn('drawPlot(): newmap given but no resolution. Using old drawing data.');
	} 

	var uMBM = Date.now();

	if(newmap !== undefined && reso !== undefined) { // calculate new drawing map
		var draw = [],
			min = Infinity,
			max = -Infinity;
		
		$.each(newmap, function(k,v) {
			//var c = index2canvasCoord(k, reso);
			var c = index2geoCoord(k,reso);
			//var p = tileMap.latLngToLayerPoint([c[0],c[1]]);

			v = v.length;

			//draw.push([[c[0],c[1]],v]);
			draw.push([c,v]);

			// get extreme values
			if(v<min) { min = v; }
			if(v>max) { max = v; }
		});
		drawdat = {draw: draw, min: min, max: max, reso: reso};
	}
	//if(typeof clear !== "number" && newmap !== undefined) {
		console.log("  ~ drawing "+drawdat.draw.length+" shapes");
		console.log("  # data extreme values - min: "+drawdat.min+", max: "+drawdat.max);
		console.log("  |BM| (dataset generation in "+(new Date()-uMBM)+"ms)");
	//}
}

/**
* draw the grid layer
* [@param clear] clear before drawing, true: everything, false: nothing, i: tile i
* [@param newmap] new cell mapping to derive drawing data from
* [@param reso] required if newmap is given - resolution of new gridmap */
//function drawPlot(clear, newmap, reso) { //TODO remove param?
function drawPlot(leavas, params) {
	if(drawdat.draw === undefined) { return false; }

	// dont redraw the first time when zoom is changed
	// (redraw when it is called again at the end of genGrid)
	//if(lastMapZoom !== (lastMapZoom = leafly.getZoom())) { return false; }
	if(mutexGenGrid !== 0) { return false; }

	// if(clear === undefined) { clear = true; }

	// if(newmap !== undefined && reso === undefined) { 
	// 	conslole.warn('drawPlot(): newmap given but no resolution. Using old drawing data.');
	// } 

	var bm = Date.now();

	var mapctx = params.canvas.getContext('2d');

	// mapctx.save();
	//if(clear === true) {
	mapctx.clearRect(0,0,params.canvas.width, params.canvas.height);
	//}


	// color defs
	/*// TODO color calculation is buggy
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
	}*/
	

	//var canvasRenderBM = new Date();

	// sizes and radii of primitiva
	var bleed = parseFloat($("#bleed-slider").val());// + 1/lastTransformState.scale*0.25; // 1.25; // larger size for bleeding with alpha channel
	// var wx = ((drawdat.reso*canvasW)/360) * bleed,
	// 	wy = ((drawdat.reso*canvasH)/180) * bleed, 
	// 	//rx = ((drawdat.reso*canvasW)/360/2) * bleed,
	// 	//ry = ((drawdat.reso*canvasH)/180/2) * bleed;
	// 	rx = wx/2,
	// 	ry = wy/2;


	//var gb = leafly.getBounds();
	//var ccount = (gb._northEast.lat - gb._southWest.lat) / drawdat.reso;

	var b = leafly.getPixelBounds();
	var r = (b.max.x - b.min.x) / 360 * resoFactor;
	var wx = r*bleed;
	var wy = wx, rx = wx/2, ry = wy/2;
	//wy = r; //params.canvas.height / ccount;
	//
	//

	drawdat.wx = wx;
	drawdat.wy = wy;
	drawdat.rx = rx;
	drawdat.ry = ry;

	var i= -1, n = drawdat.draw.length, d, cx, cy, fc, gradient; // TODO keep only what is used
	//var col;

  	// mapctx.translate(lastTransformState.translate[0],lastTransformState.translate[1]);
  	// mapctx.scale(lastTransformState.scale, lastTransformState.scale);

  	if(typeof clear === "number") {
  		clearTile(clear);
  	}

  	var galph = 1.0 - ((bleed - 1) * 0.15);
  	if(galph > 1) { galph = 1.0; }
  	mapctx.globalAlpha = galph;

	while(++i < n) {
		d = drawdat.draw[i];
		p = leavas._map.latLngToContainerPoint(d[0]);
		// cx = d.x; //d[0][0];
		// cy = d.y; //[0][1];
		//wy =  2*r * (Math.abs(d[0][0])/45);
		//wy = p.y - leavas._map.latLngToContainerPoint([d[0][0]+drawdat.reso,d[0][1]]).y;
		//ry = (p.y - leavas._map.latLngToContainerPoint([d[0][0]+drawdat.reso,d[0][1]]).y) / 2;
		//console.log(d[0], wy);
		//wy = p.y - (128 / Math.PI) * Math.pow(2,leafly.getZoom()) * (Math.PI - Math.log(Math.tan(Math.PI/4 + (p.y-1)/2)));
		//console.log(p.y,wy);

 		//col = d3.rgb(colorScale(d[1]));

		mapctx.fillStyle = //"rgba("+col.r+","+col.g+","+col.b+",0.8)";
		//fc = 
		/*"rgb("+
			Math.floor(rmax -Math.floor(Math.log(d[1])*rlog_factor))+","+
			Math.floor(gmax -Math.floor(Math.log(d[1])*glog_factor))+","+
			Math.floor(bmax -Math.floor(d[1]*blog_factor))+")";//,"+
			//".85)";//((d[1]/drawdat.max)/4+0.6)+")";*/
		colorScale(d[1]);

		/*gradient = ctx.createRadialGradient(cx,cy,rx,cx,cy,0);
		gradient.addColorStop(0,fc+"0)");
		gradient.addColorStop(0.6, fc+"0.4)");
		gradient.addColorStop(0.7, fc+"1)");
		gradient.addColorStop(1,fc+"1)");*/
		//ctx.fillStyle = gradient;

		mapctx.beginPath();
		mapctx.arc(p.x + rx, p.y - rx, rx, 0, TPI);
		mapctx.fill();

		//ctx.fillRect(cx-rx,cy-rx,wx,wy);
		//mapctx.fillRect(p.x,p.y-wy,wx,wy);/*
		//ctx.beginPath();
		//ctx.moveTo(cx,cy);
		//ctx.arc(cx, cy, rx, 0, 2 * Math.PI);
		//ctx.ellipse(cx, cy, rx, ry, 0, 0, 2*Math.PI);
		//ctx.stroke();
		//ctx.fill();
		//*/
	}
	/*if(highlight !== undefined) {
		if(reso === undefined) { reso = drawdat.reso; }
		var c = index2canvasCoord(highlight, reso);

		/*ctx.fillStyle = "rgba(150,250,150,0.3)";
		ctx.beginPath();
		ctx.arc(c[0]+rx,c[1]-ry,rx*2,0,TPI);
		ctx.fill();* /

		mapctx.lineWidth = 2/lastTransformState.scale;
		mapctx.strokeStyle = "rgba(255,127,0,0.75)"; //orange";
		mapctx.strokeRect(c[0],c[1]-wy,wx,wy);
	}*/

	if(typeof clear !== "number") {
		console.log("  |BM| canvas rendering of "+drawdat.draw.length+" shapes took "+(Date.now()-bm)+"ms");
	}
	mapctx.globalAlpha = 1.0;
	mapctx.restore();
	// todo - return benchmark
	return (Date.now()-bm);
}


function highlightCell(c) {

	var x,y,g,p,
		linewidth = 2;

	var wx = drawdat.wx,
		wy = drawdat.wy,
		rx = drawdat.rx,
		ry = drawdat.ry;


	overctx.save();
	overctx.clearRect(0,0,canvasW,canvasH);

	// overctx.translate(lastTransformState.translate[0],lastTransformState.translate[1]);
 //  	overctx.scale(lastTransformState.scale, lastTransformState.scale);

	
	if(selectedCell !== false) {
  		g = index2geoCoord(selectedCell);
  		p = leafly.latLngToContainerPoint(g);
  		x = p.x;
  		y = p.y;

  		wy = y - leafly.latLngToContainerPoint([g[0]+drawdat.reso,g[1]]).y;
		ry = wy/2;

  		overctx.fillStyle = "rgba(255,120,0,0.8)";
		overctx.fillRect(x,y-wy,wx,wy);

		overctx.strokeStyle = "rgba(255,255,255,0.4)";
		overctx.lineWidth = 3/lastTransformState.scale * linewidth;
		overctx.beginPath();
		overctx.ellipse(x+rx,y-ry,rx*1.5,ry*1.5,0,0,TPI);
		overctx.stroke();
		overctx.strokeStyle = "rgba(0,0,0,0.5)";
		overctx.lineWidth = 1/lastTransformState.scale * linewidth;
		overctx.beginPath();
		overctx.ellipse(x+rx,y-ry,rx*1.5,ry*1.5,0,0,TPI);
		overctx.stroke();
  	}

  	/*if(c.constructor === Array) {
		x = c[0];
		y = c[1];
	} else if (typeof c === "number") {*/
	if(c === false) { 
		overctx.restore();
		return false; 
	}
	
	g = index2geoCoord(c);
	p = leafly.latLngToContainerPoint(g);
	x = p.x;
	y = p.y;
	
	wy = y - leafly.latLngToContainerPoint([g[0]+drawdat.reso,g[1]]).y;
	ry = wy/2;

/*	} else {
		console.warn("highlightCell: invalid first argument");
		return false;
	}*/


  	// highlight cell rect
  	overctx.fillStyle = "rgba(255,130,0,0.7)";
	overctx.fillRect(x,y-wy,wx,wy);

	// glow circle
	var gradient = overctx.createRadialGradient(x+rx,y-ry,0, x+rx, y-ry, rx*4);
	gradient.addColorStop(0,"rgba(255,255,255,0.6");
	gradient.addColorStop(0.25, "rgba(255,255,255,0.5");
	gradient.addColorStop(1,"rgba(255,255,255,0.1");
	overctx.fillStyle = gradient;
	overctx.beginPath();
	overctx.ellipse(x+rx,y-ry,rx*4,ry*4,0,0,TPI);
	overctx.fill();

	// text bubble?..
	/*overctx.fillStyle = "rgba(0,0,0,.9)";
	overctx.font = "sans-serif 12pt";
	overctx.fillText("blabla", x, y);*/
	
	overctx.restore();
}

 /**
 * highlight all cells that contain data in key */
function highlightCellsFor(key) {
	var data = current_setsel.data,
		reso = drawdat.reso;

	drawWhat();
	var mmt = drawdat.mmt;

	//var bm = Date.now();

	var i,t,j,ci, cmap = {}, ca = [];

	for(i = mmt.min; i <= mmt.max; i++) {
		if((t = data[i][key]) !== undefined) {
			for(j = 0; j < t.length; j++) {
				ci = coord2index(t[j][ARR_M_LON],t[j][ARR_M_LAT],reso);
				if(cmap[ci] === undefined) {
					cmap[ci] = true;
				}
			}
		}
	}
	$.each(cmap, function(k) {
		ca.push(k);
	});

	overctx.save();
	overctx.clearRect(0,0,canvasW,canvasH);

	overctx.translate(lastTransformState.translate[0],lastTransformState.translate[1]);
  	overctx.scale(lastTransformState.scale, lastTransformState.scale);

  	var wx = drawdat.wx * 1,
		wy = drawdat.wy * 1,
		rx = drawdat.rx * 1,
		ry = drawdat.ry * 1;

	overctx.fillStyle = "rgba(255,255,0,0.4)";
	overctx.strokeStyle = "rgba(255,255,0,1)";
	overctx.lineWidth = rx/4;

  	var cc, x, y;
  	for(i = 0; i< ca.length; i++) {
  		cc = index2canvasCoord(ca[i], reso);
  		x = cc[0];
  		y = cc[1] - wy;
 
  		overctx.beginPath();
  		overctx.rect(x,y,wx,wy);
  		overctx.fill();
  		overctx.stroke();
  	}

  	overctx.restore();
	//console.log(Date.now() - bm + 'ms');
}

function initLeaflet() {
	if(leafly !== undefined) { return false; }

	/*var tileUrl = "http://{s}.sm.mapstack.stamen.com/(toner-lite,$fff[difference],$fff[@23],$fff[hsl-saturation@20])/{z}/{x}/{y}.png";
	tileUrl = "http://{s}.sm.mapstack.stamen.com/((toner-background,$fff[@30],$002266[hsl-color@40]),(toner-labels,$fff[@10]))/{z}/{x}/{y}.png";
	tileUrl = "http://{s}.sm.mapstack.stamen.com/((watercolor,$fff[@30],$fff[hsl-saturation@80])[@50])/{z}/{x}/{y}.png";
	//tileUrl = "http://{s}.sm.mapstack.stamen.com/((watercolor,$fff[@30],$fff[hsl-saturation@80])[@50],toner-labels[@40])/{z}/{x}/{y}.png";
	*/
//http://a.sm.mapstack.stamen.com/(water-mask,$000[@10],$00ff55[hsl-color])/3/3/6.png
//http://b.sm.mapstack.stamen.com/((toner-background,$fff[difference],$fff[@60]),(toner-labels,$000[@10])[@80])/11/330/795.png
	leafly = L.map('leaflet', {
		//maxBounds: [[-90,-180],[90,180]],
		attributionControl: false,
		worldCopyJump: true
		//crs: L.CRS.EPSG4326
	}).setView([0,0], 2);
	leafloor = L.tileLayer();//tileUrl, {
		//noWrap: true,
	    //attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
	//});
	changeTileSrc();
	leafloor.addTo(leafly);
	

	
	
	leafly.on("moveend", function() {
		genGrid();
	}).on("mousemove", function(e) {
		//console.log(e.latlng);
		canvasMouseMove(e);
	}).on("click", function(e) {
		canvasMouseClick(e);
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