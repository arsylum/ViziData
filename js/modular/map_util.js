/////////////////////
/// map utilities ///
/////////////////////
/**
* returns grid resolution*/
function calcReso(t) {
	return 1;
	// TODO remove dev mode dummy output

	if(t === undefined) { t = getTransform(); }
	var rf = parseFloat($("#reso-slider").val());
	return (1/t.scale)*rf;
}

function getBounds(t) {
	return [{min: -180, max: 180},{min: -90, max: 90}];
	// TODO rmove dev mode dummy output

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

	var lbx = (rowpos*reso)+(-C_WMIN), //+reso/2,
		lby = ((Math.floor((+i+cpr/2)/cpr)*reso)*(-1))+(-C_HMIN); //+reso/2;
	
	// canvas normaization, TODO unify
	lbx = (lbx/360)*canvasW;
	lby = (lby/180)*canvasH;

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
		//plotlayer.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		
		lastTransformState = d3.event;
		
		//$("#ctrl-zoom>input").val((Math.log(d3.event.scale)/Math.log(2)+1).toFixed(1)).trigger("input");

		drawPlot(undefined,1); // TODO function parameters
		//forceBounds();
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