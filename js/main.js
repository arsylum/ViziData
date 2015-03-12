////////////////////////
/// data management ///
//////////////////////
/**
* loads data
* for dataset with given index */
function setSetSel(a) {
    //, callback){
    // load properties if missing
    if (current_datsel.props === undefined) {
        // TODO ? more loading feedback
        $.getJSON(DATA_DIR + current_datsel.properties, function(a) {
            current_datsel.props = a;
            console.log('~~ Member properties of "' + current_datsel.id + '" have been loaded');
        });
    }
    if (current_datsel.datasets[a].data !== undefined) {
        current_setsel = current_datsel.datasets[a];
        genChart();
        genGrid();
    } else {
        // loading feedback
        var b = 0;
        var c = setInterval(function() {
            var a = [ "loading... &nbsp; &nbsp; ┬──┬", "loading... &nbsp; &nbsp; ┬──┬", "loading... (°o°） ┬──┬", "loading... &nbsp;(°o°）┬──┬", "loading... (╯°□°）╯ ┻━┻", "loading... (╯°□°）╯︵ ┻━┻", "loading... (╯°□°）╯︵ ︵ ┻━┻", "loading... (╯°□°）╯︵ ︵ ︵ ┻━┻", "loading... ︵ ︵ ︵ ┻━┻", "loading... ︵ ︵ ┻━┻", "loading... ︵ ┻━┻", "loading... &nbsp; &nbsp; ┻━┻ &nbsp; &nbsp; (ツ)", "loading... &nbsp; &nbsp; ┻━┻ &nbsp; &nbsp;(ツ)", "loading... &nbsp; &nbsp; ┻━┻ &nbsp; (ツ)", "loading... &nbsp; &nbsp; ┻━┻ &nbsp;(ツ)", "loading... &nbsp; &nbsp; ┬──┬ ¯\\_(ツ)", "loading... &nbsp; &nbsp; ┬──┬ (ツ)" ];
            $("#legend").html(a[b]);
            b = (b + 1) % 17;
        }, 180);
        var d = new Date();
        console.log("~~ starting to load dataset " + current_datsel.datasets[a].strings.label + " ~~ ");
        $.getJSON(DATA_DIR + gdata[0].datasets[a].file, function(b) {
            console.log(" |BM| finished loading " + current_datsel.datasets[a].strings.label + " data (took " + (new Date() - d) + "ms)");
            clearInterval(c);
            current_datsel.datasets[a].data = b;
            current_setsel = current_datsel.datasets[a];
            genChart();
            genGrid();
        });
    }
}

////////////////////
/// global scope ///
////////////////////
////////////////////
/// pseudo constants
//^^^^^^^^^^^^^^^^^^
// coord parameters
var C_WMIN = -180, C_WMAX = 180, C_HMIN = -90, C_HMAX = 90, C_W = C_WMAX - C_WMIN, C_H = C_HMAX - C_HMIN;

// map parameters
var M_BOUNDING_THRESHOLD = 10, // grid clipping tolerance
M_ZOOM_RANGE = [ 1, 8 ], // zoom range (results in svg scale 2^(v-1))
M_BUBBLE_OFFSET = 5;

// distance of map tooltip from pointer
// DATA
var DATA_DIR = "./data/", META_FILES = [ "humans.json" ];

var DEFAULT_DATASET = 0;

// dataset to load up initially
var ARR_UNDEFINED = null, // undefined value
ARR_M_LON = 0, // longitude
ARR_M_LAT = 1, // latitude
ARR_M_I = 2;

// ref to prop
///_________________
/// pseudo constants
////////////////////
///////////////
/// global vars
//^^^^^^^^^^^^^
var chart, // Timeline / dataLine
//plotlayer,  // plot drawing layer (<g>)
bubble, // popup bubble on map
zoombh;

// zoomBehavior
var allow_redraw = true, colorize = true, redrawTimer, // genGrid
bubbleTimer, // hide map tooltip bubble
boundsTimer, // forceBounds
resizeTimeout;

// window resize handling
var gdata = [], // global rawdata
current_datsel, // slected data group
current_setsel, // selected dataset
tilemap, // latest generated tilemap;
drawdat;

// latest generated drawing dataset
var viewportH, viewportW;

var lastTransformState;

// remember map scaling (only redraw on changes)
// canvas
var canvas, ctx, canvasW, canvasH, canvasT, canvasL;

///////////////////
/// entry point ///
///////////////////
$(function() {
    // init stuff
    lastTransformState = {
        scale: 1,
        translate: [ 0, 0 ]
    };
    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });
    $("#zoom-slider").attr("min", M_ZOOM_RANGE[0]).attr("max", M_ZOOM_RANGE[1]);
    $("#freezer>input").on("change", function() {
        allow_redraw = !this.checked;
        if (this.checked) {
            $("#legend").css("opacity", ".5");
        } else {
            $("#legend").css("opacity", "1");
            genGrid();
        }
    });
    $("#colorizer>input").on("change", function() {
        colorize = !this.checked;
        genGrid();
    });
    // bind window resize handling
    $(window).resize(function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(onResize, 400);
    });
    // zoombehaviour
    zoombh = d3.behavior.zoom().scaleExtent([ Math.pow(2, M_ZOOM_RANGE[0] - 1), Math.pow(2, M_ZOOM_RANGE[1] - 1) ]).on("zoom", zoom);
    // setup canvas
    canvas = d3.select("#map").append("canvas").call(zoombh).on("mousemove", canvasMouseMove);
    onResize();
    // set canvas dimensions
    // setup svg
    /*d3.select("#mapcanvas").append("g").attr("id","maplayer");//experimental
	plotlayer = d3.select("#mapcanvas")
		.attr("viewBox", "-1 -1 "+(C_W+1)+" "+(C_H+1))
			.call(zoombh)
			.append("g")
				.attr("id","heatlayer");*/
    // Load default dataset once ready
    $(document).on("meta_files_ready", function() {
        current_datsel = gdata[0];
        // TODO get from dom
        $("#filter input")[DEFAULT_DATASET].click();
    });
    /// TODO
    // load all the meta data meta files
    var a = new Date();
    console.log("~~ started loading the meta files (total of " + META_FILES.length + ") ~~ ");
    var b = 0;
    // meta file counter
    for (var c = 0; c < META_FILES.length; c++) {
        $.getJSON(DATA_DIR + META_FILES[c], function(c) {
            gdata[b] = c;
            // TODO
            for (var d = 0; d < gdata[b].datasets.length; d++) {
                gdata[b].datasets[d].parent = gdata[b];
            }
            b++;
            if (b === META_FILES.length) {
                console.log(" |BM| got all the meta files (took " + (new Date() - a) + "ms)");
                setupControlHandlers();
                $(document).trigger("meta_files_ready");
            }
        });
    }
});

////////////////
/// on resize //
////////////////
function onResize() {
    // get viewport size
    viewportW = $(window).width();
    viewportH = $(window).height();
    // set canvas dimensions
    var a = $(canvas.node()).position();
    canvasT = Math.floor(a.top);
    canvasL = Math.floor(a.left);
    canvasW = Math.floor($("#map").width());
    canvasH = Math.floor($("#map").height());
    canvas.attr("width", canvasW).attr("height", canvasH);
    ctx = canvas.node().getContext("2d");
    genGrid();
}

/////////////////////////
/// general map logic ///
/////////////////////////
/**
* timeout wrapper*/
function genGrid(a, b, c) {
    if (chart === undefined) {
        return 0;
    }
    // depend on timeline
    clearTimeout(redrawTimer);
    redrawTimer = setTimeout(function() {
        generateGrid(a, b, c);
    }, 300);
}

/**
* Generate data grid for the map
* parameters optional */
function generateGrid(a, b, c) {
    /// TODO poperly use global tilemap 
    if (!allow_redraw) {
        return false;
    }
    if (c === undefined) {
        c = current_setsel;
    }
    // todo dynamic from filter?
    if (b === undefined) {
        b = getBounds();
    }
    if (a === undefined) {
        a = calcReso();
    }
    $("#legend").html("<em>massive calculations...</em>");
    setTimeout(function() {
        //timeout for dom redraw
        console.log("/~~ generating new grid with resolution " + a + " ~~\\");
        var d = new Date();
        console.log("  ~ start iterating data");
        var e = {};
        var f = 0;
        /// calculate everything we can outside the loop for performance
        // get axisExtremes
        var g = chart.xAxis[0].getExtremes();
        g.min = new Date(g.min).getFullYear();
        g.max = new Date(g.max).getFullYear();
        // boundary enforcement
        if (b[0].min < C_WMIN) {
            b[0].min = C_WMIN;
        }
        if (b[0].max > C_WMAX) {
            b[0].max = C_WMAX;
        }
        if (b[1].min < C_HMIN) {
            b[1].min = C_HMIN;
        }
        if (b[1].max > C_HMAX) {
            b[1].max = C_HMAX;
        }
        var h = 0;
        while (b[0].min > C_WMIN + (h + 1) * c.parent.tile_width) {
            h++;
        }
        var i = h;
        while (b[0].max > C_WMIN + (i + 1) * c.parent.tile_width) {
            i++;
        }
        console.log("  # will iterate over tiles " + h + " to " + i);
        for (var j = g.min; j <= g.max; j++) {
            if (c.data[j] !== undefined) {
                for (var k = h; k <= i; k++) {
                    if (c.data[j][k] !== ARR_UNDEFINED && c.data[j][k] !== undefined) {
                        for (var l = 0; l < c.data[j][k].length; l++) {
                            if (section_filter(c.data[j][k][l], b)) {
                                e = testing_aggregator(e, c.data[j][k][l], a);
                                // TODO remove function call for performance?
                                f++;
                            }
                        }
                    }
                }
            }
        }
        console.log("  |BM| iteration complete (" + (new Date() - d) + "ms)");
        tilemap = e;
        //console.log(tile_mapping);
        drawPlot(true, {
            map: e,
            reso: a
        });
        console.log("  |BM| finished genGrid (total of " + (new Date() - d) + "ms)");
        $("#legend").html("<em>in this area</em><br>" + //"<span>["+mAE[0].min.toFixed(1)+","+mAE[1].min.toFixed(1)+"]-["+mAE[0].max.toFixed(1)+","+mAE[1].max.toFixed(1)+"]</span><br>"+
        "we have registered a total of<br>" + "<em>" + f + " " + c.parent.label + "</em><br>" + "that <em>" + c.strings.term + "</em><br>" + "between <em>" + g.min + "</em> and <em>" + g.max + "</em>");
        $("#export").removeAttr("disabled");
        console.log("\\~~ grid generation complete~~/ ");
    }, 1);
}

///////////////
/// filters ///
///////////////
// true if object geo lies within currently visible section
function section_filter(a, b) {
    return a[ARR_M_LON] >= b[0].min && a[ARR_M_LON] <= b[0].max && (a[ARR_M_LAT] >= b[1].min && a[ARR_M_LAT] <= b[1].max);
}

//////////////////
/// aggregators //
//////////////////
function testing_aggregator(a, b, c) {
    var d = coord2index(b[ARR_M_LON], b[ARR_M_LAT], c);
    if (a[d] === undefined) {
        a[d] = [];
        a[d].push(b[2]);
    } else {
        a[d].push(b[2]);
    }
    return a;
}

/**
* draw the map layer
* [@param clear] if false, do not clear canvas before drawing
* [@param newmap] new tile mapping to derive drawing data from
*/
function drawPlot(a, b) {
    if (a === undefined) {
        a = true;
    }
    ctx.save();
    if (a !== false) {
        ctx.clearRect(0, 0, canvasW, canvasH);
    }
    var c = new Date();
    if (b !== undefined) {
        // calculate new drawing map
        var d = [], e = Infinity, f = -Infinity;
        $.each(b.map, function(a, c) {
            var g = index2canvasCoord(a, b.reso);
            c = c.length;
            d.push([ [ g[0], g[1] ], c ]);
            // get extreme values
            if (c < e) {
                e = c;
            }
            if (c > f) {
                f = c;
            }
        });
        drawdat = {
            draw: d,
            min: e,
            max: f,
            reso: b.reso
        };
    }
    console.log("  ~ drawing " + drawdat.draw.length + " shapes");
    console.log("  # data extreme values - min: " + drawdat.min + ", max: " + drawdat.max);
    console.log("  |BM| (dataset generation in " + (new Date() - c) + "ms)");
    // color defs
    /// TODO color calculation is buggy
    // (using hsl model might be good idea)
    var g, h, i, j, k, l;
    if (colorize) {
        g = current_setsel.colorScale.min[0];
        rlog_factor = (g - current_setsel.colorScale.max[0]) / Math.log(drawdat.max);
        h = current_setsel.colorScale.min[1];
        k = (h - current_setsel.colorScale.max[1]) / Math.log(drawdat.max);
        i = current_setsel.colorScale.min[2];
        l = (i - current_setsel.colorScale.max[2]) / Math.log(drawdat.max);
    } else {
        i = 255;
        //215;
        l = i / drawdat.max;
        //Math.log(drawdat.max);
        h = 235;
        //205;
        k = h / Math.log(drawdat.max);
        g = 185;
        //14;
        rlog_factor = g / Math.log(drawdat.max);
    }
    var m = new Date();
    // sizes and radii of primitiva
    var n = 1.25;
    // larger size for bleeding with alpha channel
    var o = drawdat.reso * canvasW / 360 * n, p = drawdat.reso * canvasH / 180 * n, q = drawdat.reso * canvasW / 360 / 2 * n, r = drawdat.reso * canvasH / 180 / 2 * n;
    var s = -1, t = drawdat.draw.length, u, v, w, x, y;
    // TODO keep only what is used
    ctx.translate(lastTransformState.translate[0], lastTransformState.translate[1]);
    ctx.scale(lastTransformState.scale, lastTransformState.scale);
    while (++s < t) {
        u = drawdat.draw[s];
        v = u[0][0];
        w = u[0][1];
        ctx.fillStyle = //fc = 
        "rgba(" + Math.floor(g - Math.floor(Math.log(u[1]) * rlog_factor)) + "," + Math.floor(h - Math.floor(Math.log(u[1]) * k)) + "," + Math.floor(i - Math.floor(u[1] * l)) + "," + ".75)";
        //((d[1]/drawdat.max)/4+0.6)+")";
        /*gradient = ctx.createRadialGradient(cx,cy,rx,cx,cy,0);
		gradient.addColorStop(0,fc+"0)");
		gradient.addColorStop(0.6, fc+"0.4)");
		gradient.addColorStop(0.7, fc+"1)");
		gradient.addColorStop(1,fc+"1)");*/
        //ctx.fillStyle = gradient;
        ctx.fillRect(v - q, w - q, o, p);
    }
    console.log("  |BM| canvas rendering of " + drawdat.draw.length + " shapes took " + (new Date() - m) + "ms");
    ctx.restore();
}

/////////////////////
/// map utilities ///
/////////////////////
/**
* returns current grid resolution*/
// TODO remove param?
function calcReso(a) {
    //return 1;
    // TODO remove dev mode dummy output
    //if(t === undefined) { t = getTransform(); }
    var b = parseFloat($("#reso-slider").val());
    return 1 / lastTransformState.scale * b;
}

/**
* returns the current map bounds (rectangle of the currently visible map area)
* as real coordinate intervalls int the range [{min: -180, max: 180},{min: -90, max: 90}] */
// TODO remove param?
function getBounds(a) {
    //return [{min: -180, max: 180},{min: -90, max: 90}];
    // TODO rmove dev mode dummy output
    //if(t === undefined) { t = getTransform(); }
    var b = -lastTransformState.translate[0] / canvasW * 360, c = -lastTransformState.translate[1] / canvasH * 180;
    var d = b / lastTransformState.scale + C_WMIN, e = c / lastTransformState.scale + C_HMIN, f = M_BOUNDING_THRESHOLD / (lastTransformState.scale / 2);
    var g = [ {
        min: d - f,
        max: d + (C_WMAX - C_WMIN) / lastTransformState.scale + f
    }, {
        min: -(e + (C_HMAX - C_HMIN) / lastTransformState.scale) - f,
        max: -e + f
    } ];
    return g;
}

/**
* returns the index value for the cell of a grid with given resolution
* where the given real coordinate pair lies in*/
function coord2index(a, b, c) {
    if (a === C_WMAX) a -= c;
    // prevent 
    if (b === C_HMAX) b -= c;
    // out of bounds tiles
    return Math.floor(b / c) * ((C_WMAX - C_WMIN) / c) + Math.floor(a / c);
}

/**
* returns the canvas rendering coordinates for a given index */
function index2canvasCoord(a, b) {
    var c = (C_WMAX - C_WMIN) / b;
    var d = (a - c / 2) % c;
    if (d < 0) d += c;
    d -= c / 2;
    var e = d * b + -C_WMIN, //+reso/2,
    f = Math.floor((+a + c / 2) / c) * b * -1 + -C_HMIN;
    //+reso/2;
    // canvas normaization, TODO unify
    e = e / 360 * canvasW;
    f = f / 180 * canvasH;
    return [ e, f ];
}

/**
* returns the aggrid cell index and real coords for a given canvas coordinate pair */
function canvasCoord2geoCoord(a, b) {
    var c = lastTransformState;
    return {
        x: -180 + (-c.translate[0] + a) / (canvasW * c.scale) * 360,
        y: 90 - (-c.translate[1] + b) / (canvasH * c.scale) * 180
    };
}

/**
* returns the coordinate values for the center of the cell
* with given index in the grid of given resolution* 
(is currently used nowhere)/
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
* map tooltip */
function canvasMouseMove() {
    if (drawdat === undefined) {
        return false;
    }
    // no drawing, no tooltip!
    var a = event.pageX - canvasL;
    var b = event.pageY - canvasT;
    //console.log('Position in canvas: ('+x+','+y+')');
    var c = canvasCoord2geoCoord(a, b);
    var d = coord2index(c.x, c.y, drawdat.reso);
    var e = tilemap[d];
    if (e !== undefined) {
        /*console.log(" ~~~~");
		console.log("index: "+i);
		console.log("we have "+tilemap[i].length+" events here: ");
		console.log(tilemap[i]);
		console.log(" ~~~~");*/
        // display the info bubble
        clearTimeout(bubbleTimer);
        $("div#bubble").css("opacity", "1").css("bottom", viewportH - event.pageY + M_BUBBLE_OFFSET + "px").css("right", viewportW - event.pageX + M_BUBBLE_OFFSET + "px").html(e.length + " <em>" + current_setsel.strings.label + "</em><br>" + "<span>[" + c.x.toFixed(2) + ", " + c.y.toFixed(2) + "]</span>");
    } else {
        // hide the info bubble
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(function() {
            $("div#bubble").css("opacity", "0");
        }, 250);
    }
}

/**
* zoom the map */
function zoom() {
    if (d3.event.translate[0] !== lastTransformState.translate[0] || d3.event.translate[1] !== lastTransformState.translate[1] || d3.event.scale !== lastTransformState.scale) {
        //plotlayer.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        lastTransformState = d3.event;
        $("#ctrl-zoom>input").val((Math.log(d3.event.scale) / Math.log(2) + 1).toFixed(1)).trigger("input");
        drawPlot(undefined, undefined);
        // TODO function parameters
        //forceBounds();
        genGrid();
    }
}

function forceBounds() {
    clearTimeout(boundsTimer);
    boundsTimer = setTimeout(function() {
        forceBoundsFkt();
    }, 300);
}

function forceBoundsFkt() {
    var a = giveBounds;
    if (a) {
        transitTo(a);
    }
}

/**
* returns false if t is in map bounds
* proper bounds otherwise 
*(very anti-elegant function...)*/
function giveBounds(a) {
    if (a === undefined) {
        a = getTransform();
    }
    var b = {
        translate: []
    };
    var c = false;
    if (a.translate[0] > 0) {
        b.translate[0] = 0;
        c = true;
    }
    if (a.translate[1] > 0) {
        b.translate[1] = 0;
        c = true;
    }
    if (a.translate[0] < (a.scale - 1) * C_W * -1) {
        b.translate[0] = (a.scale - 1) * C_W * -1;
        c = true;
    }
    if (a.translate[1] < (a.scale - 1) * C_H * -1) {
        b.translate[1] = (a.scale - 1) * C_H * -1;
        c = true;
    }
    if (c) {
        if (b.translate[0] === undefined) {
            b.translate[0] = a.translate[0];
        }
        if (b.translate[1] === undefined) {
            b.translate[1] = a.translate[1];
        }
        b.scale = a.scale;
        return b;
    } else {
        return false;
    }
}

function transitTo(a) {
    if (a === undefined) {
        console.error("transitTo: invalid fkt call, t undefined");
        return 0;
    }
    zoombh.scale(a.scale);
    zoombh.translate(a.translate);
    d3.select("#heatlayer").transition().duration(600).ease("cubic-in-out").attr("transform", "translate(" + a.translate + ")scale(" + a.scale + ")");
    genGrid(calcReso(a), getBounds(a));
}

function getZoomTransform(a) {
    //if(zoom === undefined) { return 0; }
    var b = getTransform();
    a = Math.pow(2, a - 1);
    var c = a / b.scale;
    var d = c < 1 ? -(1 - c) : c - 1;
    b.translate[0] = parseFloat(b.translate[0]) * c - C_W / 2 * d;
    b.translate[1] = parseFloat(b.translate[1]) * c - C_H / 2 * d;
    b.scale = a;
    var e = giveBounds(b);
    if (e) {
        b = e;
    }
    return b;
}

////////////////
/// timeline ///
////////////////
function genChart(a) {
    if (a === undefined) {
        a = current_setsel;
    }
    // TODO
    console.log("/~~ generating chart data ~~\\ ");
    var b = new Date();
    var c = [], d, e, f, g;
    for (d = a.min; d <= a.max; d++) {
        f = a.data[d];
        if (f !== undefined) {
            g = 0;
            for (e = 0; e < f.length; e++) {
                if (f[e] !== ARR_UNDEFINED) {
                    g += f[e].length;
                }
            }
            c.push([ new Date(0, 0).setFullYear(d), g ]);
        }
    }
    console.log("  |BM| iterating and sorting finished (took " + (new Date() - b) + "ms)");
    updateChart([ {
        data: c,
        name: a.strings.label
    } ]);
    console.log("  |BM| chart creation complete (total of " + (new Date() - b) + "ms");
    console.log("\\~~ finished generating chart ~~/ ");
}

/**
* updates/builds the chart
* (addSeries is bugged so build the chart from the ground)*/
function updateChart(a) {
    if (chart !== undefined) {
        chart.destroy();
    }
    chart = new Highcharts.StockChart({
        chart: {
            type: "spline",
            renderTo: "chart"
        },
        title: {
            text: null
        },
        credits: {
            enabled: false
        },
        rangeSelector: {
            enabled: true,
            buttons: [ {
                type: "year",
                count: 10,
                text: "10y"
            }, {
                type: "year",
                count: 100,
                text: "100y"
            }, {
                type: "year",
                count: 1e3,
                text: "1000y"
            }, {
                type: "all",
                text: "all"
            } ],
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
                    redrawTimer = setTimeout(genGrid, 200);
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
        },
        //*/
        tooltip: {
            xDateFormat: "%Y"
        },
        series: a
    });
}

/////////////////////////////
/// Highcharts Extensions ///
/////////////////////////////
Highcharts.wrap(Highcharts.Chart.prototype, "pan", function(a) {
    a.apply(this, Array.prototype.slice.call(arguments, 1));
    genGrid();
});

//////////////////////
/// user interface ///
//////////////////////
/**
* bind control handlers */
function setupControlHandlers() {
    // build filter menu
    var a = function() {
        setSetSel(this.value);
    };
    var b = $("#filter");
    for (var c = 0; c < gdata.length; c++) {
        var d = $("<fieldset>");
        d.append("<legend>" + gdata[c].title + "</legend>");
        for (var e = 0; e < gdata[c].datasets.length; e++) {
            var f = $('<input type="radio" name="radio" value="' + e + '" />').on("change", a);
            d.append($("<label>" + gdata[c].datasets[e].strings.label + "</label>").prepend(f));
        }
        b.append(d);
    }
    $('#controls input[type="range"]').on("input", function() {
        $(this).parent().next('input[type="text"').val(parseFloat($(this).val()).toFixed(1));
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
        $(this).attr("disabled", "disabled");
        exportSvg();
    });
}

/**
 * SVG export*/
function exportSvg() {
    $("#export").attr("disabled", "disabled");
    var a = $("<iframe>", {
        css: {
            display: "none"
        }
    }).appendTo("body");
    var b = '<form action="" method="post">' + '<input type="hidden" name="filename" />' + '<input type="hidden" name="content" />' + "</form>";
    var c = a.prop("contentDocument").body;
    /* don't care about IE
    (iframe.prop('contentDocument') !== undefined) ?
		iframe.prop('contentDocument').body :
        iframe.prop('document').body;	// IE*/
    $(c).html(b);
    var d = $(c).find("form");
    d.attr("action", "export.php");
    d.find("input[name=filename]").val("dataPlot.svg");
    d.find("input[name=content]").val($("#map").html());
    // Submitting the form to export.php. This will
    // cause the file download dialog box to appear.
    d.submit();
}