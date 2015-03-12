/////////////////////
/// map utilities ///
/////////////////////
/**
* returns current grid resolution*/
function calcReso() {
	var rf = parseFloat($("#reso-slider").val());
	return (1/lastTransformState.scale)*rf;
}

/**
* returns the current map bounds (rectangle of the currently visible map area)
* as real coordinate intervalls int the range [{min: -180, max: 180},{min: -90, max: 90}] */
function getBounds() {
	var tx = (-lastTransformState.translate[0]/canvasW)*360,
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
	}];
	return bounds;
}

/**
* returns the index value for the cell of a grid with given resolution
* where the given real coordinate pair lies in*/
function coord2index(longi, lati, reso) {
	if(longi === C_WMAX) longi -= reso;	// prevent 
	if(lati  === C_HMAX) lati  -= reso; // out of bounds cells

	return (Math.floor(lati/reso)*((C_WMAX-C_WMIN)/reso) + Math.floor(longi/reso));
}
/**
* returns the canvas rendering coordinates for a given index */
function index2canvasCoord(i, reso) {
	var cpr = (C_WMAX-C_WMIN)/reso;

	var rowpos = (i-cpr/2)%cpr;
	if(rowpos<0) rowpos += cpr;
	rowpos -= cpr/2;

	var lbx = (rowpos*reso)+(-C_WMIN), //+reso/2,
		lby = ((Math.floor((+i+cpr/2)/cpr)*reso)*(-1))+(-C_HMIN); //+reso/2;
	
	// canvas normalization
	lbx = (lbx/360)*canvasW;
	lby = (lby/180)*canvasH;

	return [lbx,lby];
}

/**
* returns the aggrid cell index and real coords for a given canvas coordinate pair */
function canvasCoord2geoCoord(x, y){
	var t = lastTransformState;
	return { 
		x: -180 + ((-t.translate[0] + x) / (canvasW * t.scale) * 360),
		y:   90 - ((-t.translate[1] + y) / (canvasH * t.scale) * 180)
	};
}

/**
* map tooltip */
function canvasMouseMove() {
	if(drawdat === undefined) { return false; } // no drawing, no tooltip!

	var x = event.pageX - canvasL;
	var y = event.pageY - canvasT;
	//console.log('Position in canvas: ('+x+','+y+')');
	var gc = canvasCoord2geoCoord(x,y);
	var i = coord2index(gc.x, gc.y, drawdat.reso);
	var cell = cellmap[i];

	if(cell !== undefined) {
		/*console.log(" ~~~~");
		console.log("index: "+i);
		console.log("we have "+cellmap[i].length+" events here: ");
		console.log(cellmap[i]);
		console.log(" ~~~~");*/

		// display the info bubble
		clearTimeout(bubbleTimer);
		$("div#bubble").css("opacity","1")
			.css("bottom", (viewportH - event.pageY + M_BUBBLE_OFFSET) + "px")
			.css("right", (viewportW - event.pageX + M_BUBBLE_OFFSET) + "px")
			.html(cell.length +" <em>"+current_setsel.strings.label+"</em><br>"+
				"<span>["+(gc.x.toFixed(2))+", "+(gc.y.toFixed(2))+"]</span>");

		//TODO we can show more information now!
	} else {
		// hide the info bubble
		clearTimeout(bubbleTimer);
		bubbleTimer = setTimeout(function() {
			$("div#bubble").css("opacity", "0");
		},250);
	}
}


/**
* zoom the map */
function zoom() {
	if( d3.event.translate[0] !== lastTransformState.translate[0] ||
		d3.event.translate[1] !== lastTransformState.translate[1] ||
		d3.event.scale !== lastTransformState.scale) {
		//plotlayer.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		
		lastTransformState = d3.event;
		
		$("#ctrl-zoom>input").val((Math.log(d3.event.scale)/Math.log(2)+1).toFixed(1)).trigger("input");

		drawPlot(undefined,undefined); // TODO function parameters
		//forceBounds();
		genGrid();
	}
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