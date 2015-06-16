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
	return (canvasW / M_BASE_GRIDROWS) * resoFactor; 
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
	while(mAE[0].min > (C_WMIN+(tMin+1)*current_datsel.tile_width)) { tMin++; }
	var tMax = tMin;
	while(mAE[0].max > (C_WMIN+(tMax+1)*current_datsel.tile_width)) { tMax++; }
	return { min: tMin, max: tMax };
}

/**
* returns the index value for the cell of a grid with given resolution
* where the given geocoordinate pair lies in*/
function coord2index(longi, lati, reso) {
	var proj = leafly.latLngToContainerPoint(L.latLng(lati,longi));
	return (Math.floor(proj.y/reso)*(canvasW/reso) + Math.floor(proj.x/reso));
}

/**
* returns the index value for given canvas (container) coordinates */
function canvasCoord2index(p, reso) {
	return (Math.floor(p.y/reso)*(canvasW/reso) + Math.floor(p.x/reso));
}

/**
* returns the geo coordinates for a given index
* (for the bottom left corner of the gridcells rect)*/
function index2geoCoord(i, reso) {
	var cc = index2canvasCoord(i, reso);
	var gc = leafly.containerPointToLatLng([cc.x,cc.y]);
	return [gc.lat,gc.lng];
}

/**
* returns the canvas rendering coordinates for a given index 
* (for the top left corner of the gridscells rect) */
function index2canvasCoord(i, reso) {
	var cpr = canvasW / reso;
	return { 
		x: (i%cpr)*reso, 
		y: Math.floor(i/cpr)*reso
	};
}

/**
* wipe it clean */
function clearGrid() {
	var ctx = leaflaggrid._canvas.getContext('2d');
	ctx.clearRect(0,0,canvasW,canvasH);
}

/**
* clears the area of tile i on map canvas */
function clearTile(i) {
	var ctx = leaflaggrid._canvas.getContext('2d');
	var bounds = getBounds();
	var nw = L.latLng(bounds[1].max, current_datsel.tile_width*i),
		se = L.latLng(bounds[1].min, current_datsel.tile_width*(i+1));
	nw = leafly.latLngToContainerPoint(nw);
	se = leafly.latLngToContainerPoint(se);

	ctx.clearRect(nw.x, nw.y, se.x - nw.x, nw.y - se.y);
}

/**
* adjust the currently pointed at container coordinates */
function currentCursorPos(e) {

	var p = e.containerPoint;
	return {
		x: p.x - M_HOVER_OFFSET.l,
		y: p.y - M_HOVER_OFFSET.t
	};
}

/**
* map tooltip */
function canvasMouseMove(e) {
	if(mutexGenGrid !== 0) { return false; } // don't bother while working hard

	var cc = currentCursorPos(e);
	var i = canvasCoord2index(cc, drawdat.reso);
	var cell = cellmap[i];
	// hover highlight
	highlightCell(i);
	
	//$("#hud").text('(' + cc.x.toFixed(5) + ', ' + cc.y.toFixed(5) + ')');

	if(cell !== undefined) {
		var p = index2geoCoord(i, drawdat.reso);
		var x = (p[0] + drawdat.reso/2).toFixed(2),
			y = (p[1] + drawdat.reso/2).toFixed(2);

		// display the info bubble
		clearTimeout(bubbleTimer);
		bubbleTimer = true;
		$bubble.css("opacity","1")
			.css("bottom", (viewportH - e.originalEvent.pageY + M_BUBBLE_OFFSET) + "px")
			.css("right", (viewportW - e.originalEvent.pageX + M_BUBBLE_OFFSET) + "px")
			.html(cell.length +" <em>"+current_setsel.strings.label+"</em><br>"+
				"<span>["+x+", "+y+"]</span>");

	} else if(bubbleTimer === true) {
		// hide the info bubble
		//highlightCell(false);
		bubbleTimer = setTimeout(function() {
			$bubble.css("opacity", "0");
		},250);
	}
}

function canvasMouseClick(e) {
	if(mutexGenGrid !== 0) { return false; } // don't bother while working hard
	var cc = currentCursorPos(e);
	var i = canvasCoord2index(cc, drawdat.reso);
	selectCell(i);
}

/**
* select cell i and fill the infolist table */
function selectCell(i) {
	if(drawdat.draw === undefined) { return false; }
	if(i === undefined) { i = selectedCell; }

	var $tb = $("#infolist"),
		$info = $("#cellinfo-desc>div");
	$tb.html(""); // clear the list

	if(i === false) {
		$info.hide();
		selectedCell = false;
		highlightCell(false);
		urlifyState();
		return true;
	}

	var cell = cellmap[i];

	if(cell === undefined) { selectCell(false);	} else {
		selectedCell = i;
		$info.show();
		var timeout = 0;
		if(cell.length > 100) {
			$info.html("<em>assembling list...</em>");
			timeout = 5;
		}
		setTimeout(function() {

			var p = index2geoCoord(i, drawdat.reso);
			var x = (p[0] + drawdat.reso/2).toFixed(2),
				y = (p[1] + drawdat.reso/2).toFixed(2);

			highlightCell(i,true);
			$tb.html("");
			// TODO recursive timeouts for large arrays (around >5000)
			$.each(cell, function() {
				var q = current_datsel.props.members[this[0]];
				$tb.append("<tr>"+
					"<td><a class=\"q\" href=\"https://www.wikidata.org/wiki/"+q+"\" data-qid=\""+q+"\" target=\"wikidata\">"+q+"</a></td>"+
					"<td>"+this[1]+"</td>"+
				"</tr>");
			});
			$info.html(
				"the <em>selected cell</em> <span>around "+
				"("+ x +", "+ y +")</span> "+
				"contains <em>"+cell.length+"</em> of them:");
			$tb.trigger("scroll");
		}, timeout);
		urlifyState();
	}
}

/**
* infolistScroll Timeout Wrapper*/
function infolistScroll() {
	clearTimeout(infolistTimer);
	infolistTimer = setTimeout(infolistScrollFkt, CALC_TIMEOUT);
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

	// process result of ajax request
	var processLabels = function(data) {
		//console.log(data);
		$.each(data.entities, function() {
			var text = this.id;// + ' (no label)';
			if(this.labels !== undefined) {						// TODO
				if(this.labels[lang] !== undefined) {			// this sanity check is 
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
* determine proper color scale based on current reso*/
function setColorScale(r) {
	if(r === undefined) { r = calcReso(); }
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