/////////////////////
/// map utilities ///
/////////////////////
/***
** coordinate calclations
** and user interactions
*/

/**
* returns current grid resolution*/
function calcReso() {
	//var rf = parseFloat($("#reso-slider").val());
	//return (1/lastTransformState.scale)*resoFactor;
	//console.log((1/(leafly.getZoom()+1)) * resoFactor);
	//return (1/(leafly.getZoom()+1)) * resoFactor;

	var b = leafly.getBounds();
	var r = (b._northEast.lng - b._southWest.lng) / 360 * resoFactor;
	return r;
}

/**
* keep map bounds and min/max tile in global object for efficency
* (object is reset whenever a new plot drawmap is calculated, so should be ok) */
function drawWhat() {
	if(drawdat.bounds === undefined) { drawdat.bounds = getBounds(true); }
	if(drawdat.mmt === undefined) { drawdat.mmt = getMinMaxTile(drawdat.bounds); }
}

/**
* returns the current map bounds (rectangle of the currently visible map area)
* as real coordinate intervalls int the range [{min: -180, max: 180},{min: -90, max: 90}] */
function getBounds(enforce) {
	/*var tx = (-lastTransformState.translate[0]/canvasW)*360,
		ty = (-lastTransformState.translate[1]/canvasH)*180;

	var xmin = (tx)/lastTransformState.scale+C_WMIN,
		ymin = (ty)/lastTransformState.scale+C_HMIN,
		bth = M_BOUNDING_THRESHOLD/(lastTransformState.scale/2);

	var bounds = [{
		min: xmin - bth,
		max: xmin+(C_WMAX-C_WMIN)/lastTransformState.scale + bth
	},{
		min: -(ymin+(C_HMAX-C_HMIN)/lastTransformState.scale) - bth,
		max: -ymin + bth
	}];*/
	var b = leafly.getBounds();
	var bounds = [{min: b._southWest.lng, max: b._northEast.lng},
				  {min: b._southWest.lat, max: b._northEast.lat}];

	// boundary enforcement
	if(enforce === true) {
		if(bounds[0].min < C_WMIN) { bounds[0].min = C_WMIN; }
		if(bounds[0].min > C_WMAX) { bounds[0].min = C_WMAX; }
		if(bounds[0].max < C_WMIN) { bounds[0].max = C_WMIN; }
		if(bounds[0].max > C_WMAX) { bounds[0].max = C_WMAX; }

		if(bounds[1].min < C_HMIN) { bounds[1].min = C_HMIN; }
		if(bounds[1].min > C_HMAX) { bounds[1].min = C_HMAX; }
		if(bounds[1].max < C_HMIN) { bounds[1].max = C_HMIN; }
		if(bounds[1].max > C_HMAX) { bounds[1].max = C_HMAX; }
	}

	return bounds;
}

/**
* returns min and max tile index for given or current bounds */
function getMinMaxTile(mAE) {
	if(mAE === undefined) { mAE = getBounds(true); }

	var tMin = 0;
	while(mAE[0].min > (C_WMIN+(tMin+1)*current_datsel.tile_width)) {
		tMin++;
	}
	var tMax = tMin;
	while(mAE[0].max > (C_WMIN+(tMax+1)*current_datsel.tile_width)) {
		tMax++;
	}
	return { min: tMin, max: tMax };
}

/**
* returns the index value for the cell of a grid with given resolution
* where the given geocoordinate pair lies in*/
function coord2index(longi, lati, reso) {
	if(longi === C_WMAX) longi -= reso;	// prevent 
	if(lati  === C_HMAX) lati  -= reso; // out of bounds cells
	//var proj = leafly.latLngToContainerPoint([lati,longi]);

	return (Math.floor(lati/reso)*((C_WMAX-C_WMIN)/reso) + Math.floor(longi/reso));
}

/**
* returns the geo coordinates for a given index
* (for the bottom left corner of the gridcells rect)*/
function index2geoCoord(i, reso) {
	if(reso === undefined) { reso = drawdat.reso; }
	var cpr = (C_WMAX-C_WMIN)/reso;

	var rowpos = (i-cpr/2)%cpr;
	if(rowpos<0) rowpos += cpr;
	rowpos -= cpr/2;

	var lbx = (rowpos*reso),//+(C_WMIN), //+reso/2,
		lby = ((Math.floor((+i+cpr/2)/cpr)*reso)); //*(-1));//+(-C_HMIN); //+reso/2;

	return [lby,lbx];
}

/**
* returns the canvas rendering coordinates for a given index 
* (for the bottom left corner of the gridscells rect) */
function index2canvasCoord(i, reso) {
	// get geocoordinates
	var gc = index2geoCoord(i, reso);
	// canvas normalization
	var lbx = ((gc[0]+(-C_WMIN)) / 360) * canvasW,
		lby = (((gc[1]*(-1))+(-C_HMIN)) / 180) * canvasH;
	return [lbx,lby];
}

/**
* returns the aggrid cell index and real coords for a given canvas coordinate pair 
* (!) for real canvas coords (like pointer pos) not virtual (on transformed map)*/
function canvasCoord2geoCoord(x, y){
	var t = lastTransformState;
	return { 
		x: -180 + ((-t.translate[0] + x) / (canvasW * t.scale) * 360),
		y:   90 - ((-t.translate[1] + y) / (canvasH * t.scale) * 180)
	};
}

/**
* clears the area of tile i on map canvas */
function clearTile(i) {
	/*var ppd = canvasW / (C_WMAX - C_WMIN);
	mapctx.clearRect(
		current_datsel.tile_width*i*ppd, 0,		// x, y
		current_datsel.tile_width*ppd, canvasH	// w, h
	);*/

	var mapctx = leaflaggrid._canvas.getContext('2d');

	var bounds = getBounds();
	var nw = L.latLng(bounds[1].max, current_datsel.tile_width*i),
		se = L.latLng(bounds[1].min, current_datsel.tile_width*(i+1));
	nw = leafly.latLngToContainerPoint(nw);
	se = leafly.latLngToContainerPoint(se);

	mapctx.clearRect(nw.x, nw.y, se.x - nw.x, nw.y - se.y);
}

/**
* returns the currently pointed at real canvas coordinates * /
function cco() {
	var s = lastTransformState.scale;
	var x = d3.event.pageX - canvasL - drawdat.wx*s - M_HOVER_OFFSET.l*resoFactor;
	var y = d3.event.pageY - canvasT - drawdat.wy*s - M_HOVER_OFFSET.t*resoFactor;
	return [x,y];
}*/

/**
* adjust the currently pointed at geo coordinates */
function currentCursorPos(e) {
	//console.log(e);
	var z = leafly.getZoom(),
		p = e.containerPoint;
		p.x -= M_HOVER_OFFSET.l;
		p.y -= M_HOVER_OFFSET.t;

	var ll = leafly.containerPointToLatLng(p);
	return { 
		x: ll.lng,
		y: ll.lat
	};
}

/**
* map tooltip */
function canvasMouseMove(e) {
	// doesn't work, fix or ignore, not critical (console errors when map is not ready)
	//if(drawdat === undefined) { return false; } // no drawing, no tooltip!
	if(mutexGenGrid !== 0) { return false; } // don't bother while working hard

	/*var cc = cco();
	var x = cc[0],
		y = cc[1];
	//console.log(d3.event);
	//console.log('Position in canvas: ('+x+','+y+')');
	var gc = canvasCoord2geoCoord(x,y);*/

	var gc = currentCursorPos(e);
	var i = coord2index(gc.x, gc.y, drawdat.reso);
	var cell = cellmap[i];

	// hover highlight
	highlightCell(i);

	$("#hud").text('(' + gc.x.toFixed(5) + ', ' + gc.y.toFixed(5) + ')');

	if(cell !== undefined) {

		var p = index2geoCoord(i);
		var x = (p[0] + drawdat.reso/2).toFixed(2),
			y = (p[1] + drawdat.reso/2).toFixed(2);

		// display the info bubble
		clearTimeout(bubbleTimer);
		$("div#bubble").css("opacity","1")
			.css("bottom", (viewportH - e.originalEvent.pageY + drawdat.wy + M_BUBBLE_OFFSET) + "px")
			.css("right", (viewportW - e.originalEvent.pageX + drawdat.wy + M_BUBBLE_OFFSET*resoFactor) + "px")
			.html(cell.length +" <em>"+current_setsel.strings.label+"</em><br>"+
				"<span>["+x+", "+y+"]</span>");

	} else {
		// hide the info bubble
		//highlightCell(false);
		bubbleTimer = setTimeout(function() {
			$("div#bubble").css("opacity", "0");
		},250);
	}
}

function canvasMouseClick(e) {
	// doesn't work, fix or ignore, not critical (console errors when map is not ready)
	//if(drawdat === undefined) { return false; } // no drawing, no info!
	if(mutexGenGrid !== 0) { return false; } // don't bother while working hard

	/*var cc = cco();
	var x = cc[0],
		y = cc[1];

	var gc = canvasCoord2geoCoord(x,y);*/
	var gc = currentCursorPos(e);
	var i = coord2index(gc.x, gc.y, drawdat.reso);

	selectCell(i);
}

/**
* select cell i and fill the infolist table */
function selectCell(i) {
	if(i === undefined) { i = selectedCell; }
	if(i === false) {
		selectedCell = false;
		highlightCell(false);
		urlifyState();
		return false;
	}
	
	var tb = $("#infolist");
	tb.html(""); // clear the list
	//$("#legend div:last-child").remove();

	var cell = cellmap[i];

	if(cell !== undefined) {
		selectedCell = i;
		$("#cellinfo-desc>div").show();
		var timeout = 0;
		if(cell.length > 100) {
			$("#cellinfo-desc>div").html("<em>assembling list...</em>");
			//tb.html("<em>assembling list...</em>");
			timeout = 5;
		}
		setTimeout(function() {

			var p = index2geoCoord(i);
			var x = (p[0] + drawdat.reso/2).toFixed(2),
				y = (p[1] + drawdat.reso/2).toFixed(2);

			highlightCell(i,true);
			//console.log(cell);
			tb.html("");
			// TODO recursive timeouts for large arrays (around >5000)
			$.each(cell, function() {
				var q = current_datsel.props.members[this[0]];
				tb.append("<tr>"+
					"<td><a class=\"q\" href=\"https://www.wikidata.org/wiki/"+q+"\" data-qid=\""+q+"\" target=\"wikidata\">"+q+"</a></td>"+
					"<td>"+this[1]+"</td>"+
				"</tr>");
			});


			$("#cellinfo-desc>div").html(
				"the <em>selected cell</em> <span>around "+
				"("+ x +", "+ y +")</span> "+
				"contains <em>"+cell.length+"</em> of them:");

			tb.trigger("scroll");
		}, timeout);

	} else {
		$("#cellinfo-desc>div").hide();
		selectedCell = false;
		highlightCell(false);
	}
	urlifyState();
}

/**
* infolistScroll Timeout Wrapper*/
function infolistScroll() {
	clearTimeout(infolistTimer);
	infolistTimer = setTimeout(infolistScrollFkt, 200);
}

/**
* infolist scroll handler, fetches labels for visible items */
function infolistScrollFkt() {
	var cellinfo = $("#cellinfo");
	var infolist = $("#infolist");
	var infolistT = cellinfo.position().top + infolist.position().top;
	var infolistB = infolistT + infolist.height();
	var qarray = [];
	var lang = $("#langsel").val();

	infolist.find("a.q").each(function() {
		var t = this.getBoundingClientRect().top;
		if(t >= infolistT && t <= infolistB) {
			qarray.push(this);
		}
	});
	//console.log(qarray);

	// process result of ajax request
	var processLabels = function(data) {
		//console.log(data);
		// TODO error handling
		$.each(data.entities, function() {
			var text = this.id;// + ' (no label)';
			if(this.labels !== undefined) {						// TODO
				if(this.labels[lang] !== undefined) {				// this sanity check is 
					if(this.labels[lang].value !== undefined) {	// probably slightly overkill
						text = this.labels[lang].value;
			}	}	}
			$(qarray).filter('[href$="'+this.id+'"]').removeClass("q").text(text);
		});
	};

	var n = 0, m = 20; // query up to m labels simultaneously
	var qpre = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=',
		qsuf = '&props=labels&languages='+lang+'&languagefallback=&callback=?';
	var i = -1, qstr = qpre;
	while(++i < qarray.length) {
		if(n > 0) {	qstr += '|'; }
		qstr += $(qarray[i]).attr("data-qid");

		if(++n >= m || (i+1 === qarray.length)) { // run a query, reset qstr
			qstr += qsuf;
			$.getJSON(qstr, processLabels);
			qstr = qpre;
			n = 0;
		}
	}
}

/**
* zoom or move the map */
function zoom() {
	/* (not in use)
	if( d3.event.translate[0] !== lastTransformState.translate[0] ||
		d3.event.translate[1] !== lastTransformState.translate[1] ||
		d3.event.scale !== lastTransformState.scale) {

		if(d3.event.scale !== lastTransformState.scale) {
			filledTiles = [9999];
		}

		renderRTL = (d3.event.translate[0] < lastTransformState.translate[0]);		
		lastTransformState = d3.event;
		
		$("#zoom-slider").val((Math.log(d3.event.scale)/Math.log(2)+1).toFixed(1)).trigger("input");

		drawPlot(undefined,undefined); // TODO function parameters (?)
		//forceBounds();

		genGrid();
		updateChartData();
	}
	*/
}

/**
* determine proper color scale based on current reso*/
function setColorScale(r) {
	if(r === undefined) { r= calcReso(); }
	// values determined experimentally for now
	// TODO find a way to automate this

	var max = 15000 * r,
		n = M_COLOR_SCALE.length - 1,
		domain = [1];
	var e = Math.log(max);

	for(var i = 1; i <= n; i++) {
		domain.push(Math.floor(Math.pow(Math.E, (e/n)*i)));
	}
	colorScale.domain(domain);
}

////
/// TODO issue #1
//
/** 
function forceBounds() {
	clearTimeout(boundsTimer);
	boundsTimer = setTimeout(function() {
		forceBoundsFkt();
	},300);
}

function forceBoundsFkt() {
	var b = giveBounds;
	if(b) {
		transitTo(b);
	}
}*/

/**
* returns false if t is in map bounds
* proper bounds otherwise 
*(very anti-elegant function...)* /
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
}*/