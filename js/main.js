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
var //ARR_UNDEFINED = null,	// undefined value
ARR_M_LON = 0, // longitude
ARR_M_LAT = 1, // latitude
ARR_M_I = 2;

// ref to prop
var TPI = Math.PI * 2;

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
var allow_redraw = true, colorize = true, currentGenGrid = 0, // genGrid cancelation with newer calls
redrawTimer, // genGrid
bubbleTimer, // hide map tooltip bubble
boundsTimer, // forceBounds
resizeTimeout;

// window resize handling
var gdata = [], // global rawdata
current_datsel, // slected data group
current_setsel, // selected dataset
cellmap, // latest generated tilemap;
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
    canvas = d3.select("#map").append("canvas").call(zoombh).on("mousemove", canvasMouseMove).on("click", canvasMouseClick);
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
    }, 200);
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
    currentGenGrid++;
    var d = currentGenGrid;
    $("#legend").html("<em>massive calculations...</em>");
    setTimeout(function() {
        //timeout for dom redraw
        console.log("/~~ generating new grid with resolution " + a + " ~~\\");
        var e = new Date();
        console.log("  ~ start iterating data");
        var f = 0;
        cellmap = {};
        // reset cellmap
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
        var j = function() {
            console.log("  |BM| iteration complete (" + (new Date() - e) + "ms)");
            drawPlot(true, cellmap, a);
            console.log("  |BM| finished genGrid (total of " + (new Date() - e) + "ms)");
            $("#legend").html("<em>inside the visible area</em><br>" + //"<span>["+mAE[0].min.toFixed(1)+","+mAE[1].min.toFixed(1)+"]-["+mAE[0].max.toFixed(1)+","+mAE[1].max.toFixed(1)+"]</span><br>"+
            "we have registered a total of<br>" + "<em>" + f + " " + c.parent.label + "</em><br>" + "that <em>" + c.strings.term + "</em><br>" + "between <em>" + g.min + "</em> and <em>" + g.max + "</em>");
            $("#export").removeAttr("disabled");
            console.log("\\~~ grid generation complete~~/ ");
        };
        var k = function(e) {
            if (d < currentGenGrid) {
                return 0;
            }
            // cancel if newer genGrid is running
            var l = {}, m, n, o;
            var p = h + e;
            if (p <= i) {
                // still work to do							// for each map tile in visible area
                for (var q = g.min; q <= g.max; q++) {
                    // go over each key in range
                    if (c.data[p][q] !== undefined) {
                        // if it is defined
                        m = c.data[p][q].length;
                        for (var r = 0; r < m; r++) {
                            // go over each event in key and
                            n = c.data[p][q][r];
                            if (section_filter(n, b)) {
                                // if it actually lies within map bounds
                                o = coord2index(n[ARR_M_LON], n[ARR_M_LAT], a);
                                if (cellmap[o] === undefined) {
                                    cellmap[o] = [];
                                }
                                // aggregate it on the grid
                                cellmap[o].push(n[ARR_M_I]);
                                l[o] = cellmap[o];
                                f++;
                            }
                        }
                    }
                }
                // draw each tile after aggregating
                drawPlot(false, l, a);
                setTimeout(function() {
                    k(e + 1);
                }, 1);
            } else {
                j();
            }
        };
        k(0);
    }, 1);
}

///////////////
/// filters ///
///////////////
// true if object geo lies within currently visible section
function section_filter(a, b) {
    return a[ARR_M_LAT] >= b[1].min && a[ARR_M_LAT] <= b[1].max && (a[ARR_M_LON] >= b[0].min && a[ARR_M_LON] <= b[0].max);
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
function drawPlot(a, b, c, d) {
    if (a === undefined) {
        a = true;
    }
    if (b !== undefined && c === undefined) {
        conslole.log("|WARNING| newmap given but no resolution. Using old drawing data.");
    }
    ctx.save();
    if (a !== false) {
        ctx.clearRect(0, 0, canvasW, canvasH);
    }
    var e = new Date();
    if (b !== undefined && c !== undefined) {
        // calculate new drawing map
        var f = [], g = Infinity, h = -Infinity;
        $.each(b, function(a, b) {
            var d = index2canvasCoord(a, c);
            b = b.length;
            f.push([ [ d[0], d[1] ], b ]);
            // get extreme values
            if (b < g) {
                g = b;
            }
            if (b > h) {
                h = b;
            }
        });
        drawdat = {
            draw: f,
            min: g,
            max: h,
            reso: c
        };
    }
    console.log("  ~ drawing " + drawdat.draw.length + " shapes");
    console.log("  # data extreme values - min: " + drawdat.min + ", max: " + drawdat.max);
    console.log("  |BM| (dataset generation in " + (new Date() - e) + "ms)");
    // color defs
    /// TODO color calculation is buggy
    // (using hsl model might be good idea)
    var i, j, k, l, m, n;
    if (colorize) {
        i = current_setsel.colorScale.min[0];
        rlog_factor = (i - current_setsel.colorScale.max[0]) / Math.log(drawdat.max);
        j = current_setsel.colorScale.min[1];
        m = (j - current_setsel.colorScale.max[1]) / Math.log(drawdat.max);
        k = current_setsel.colorScale.min[2];
        n = (k - current_setsel.colorScale.max[2]) / Math.log(drawdat.max);
    } else {
        k = 255;
        //215;
        n = k / drawdat.max;
        //Math.log(drawdat.max);
        j = 235;
        //205;
        m = j / Math.log(drawdat.max);
        i = 185;
        //14;
        rlog_factor = i / Math.log(drawdat.max);
    }
    var o = new Date();
    // sizes and radii of primitiva
    var p = 1 + 1 / lastTransformState.scale * .25;
    // 1.25; // larger size for bleeding with alpha channel
    var q = drawdat.reso * canvasW / 360 * p, r = drawdat.reso * canvasH / 180 * p, s = drawdat.reso * canvasW / 360 / 2 * p, t = drawdat.reso * canvasH / 180 / 2 * p;
    var u = -1, v = drawdat.draw.length, w, x, y, z, A;
    // TODO keep only what is used
    ctx.translate(lastTransformState.translate[0], lastTransformState.translate[1]);
    ctx.scale(lastTransformState.scale, lastTransformState.scale);
    while (++u < v) {
        w = drawdat.draw[u];
        x = w[0][0];
        y = w[0][1];
        ctx.fillStyle = //fc = 
        "rgba(" + Math.floor(i - Math.floor(Math.log(w[1]) * rlog_factor)) + "," + Math.floor(j - Math.floor(Math.log(w[1]) * m)) + "," + Math.floor(k - Math.floor(w[1] * n)) + "," + ".75)";
        //((d[1]/drawdat.max)/4+0.6)+")";
        /*gradient = ctx.createRadialGradient(cx,cy,rx,cx,cy,0);
		gradient.addColorStop(0,fc+"0)");
		gradient.addColorStop(0.6, fc+"0.4)");
		gradient.addColorStop(0.7, fc+"1)");
		gradient.addColorStop(1,fc+"1)");*/
        //ctx.fillStyle = gradient;
        //ctx.fillRect(cx-rx,cy-rx,wx,wy);
        ctx.fillRect(x, y - r, q, r);
    }
    if (d !== undefined) {
        if (c === undefined) {
            c = drawdat.reso;
        }
        var B = index2canvasCoord(d, c);
        /*ctx.fillStyle = "rgba(150,250,150,0.3)";
		ctx.beginPath();
		ctx.arc(c[0]+rx,c[1]-ry,rx*2,0,TPI);
		ctx.fill();*/
        ctx.lineWidth = 2 / lastTransformState.scale;
        ctx.strokeStyle = "rgba(255,127,0,0.75)";
        //orange";
        ctx.strokeRect(B[0], B[1] - r, q, r);
    }
    console.log("  |BM| canvas rendering of " + drawdat.draw.length + " shapes took " + (new Date() - o) + "ms");
    ctx.restore();
}

/////////////////////
/// map utilities ///
/////////////////////
/**
* returns current grid resolution*/
function calcReso() {
    var a = parseFloat($("#reso-slider").val());
    return 1 / lastTransformState.scale * a;
}

/**
* returns the current map bounds (rectangle of the currently visible map area)
* as real coordinate intervalls int the range [{min: -180, max: 180},{min: -90, max: 90}] */
function getBounds() {
    var a = -lastTransformState.translate[0] / canvasW * 360, b = -lastTransformState.translate[1] / canvasH * 180;
    var c = a / lastTransformState.scale + C_WMIN, d = b / lastTransformState.scale + C_HMIN, e = M_BOUNDING_THRESHOLD / (lastTransformState.scale / 2);
    var f = [ {
        min: c - e,
        max: c + (C_WMAX - C_WMIN) / lastTransformState.scale + e
    }, {
        min: -(d + (C_HMAX - C_HMIN) / lastTransformState.scale) - e,
        max: -d + e
    } ];
    return f;
}

/**
* returns the index value for the cell of a grid with given resolution
* where the given real coordinate pair lies in*/
function coord2index(a, b, c) {
    if (a === C_WMAX) a -= c;
    // prevent 
    if (b === C_HMAX) b -= c;
    // out of bounds cells
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
    // canvas normalization
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
* map tooltip */
function canvasMouseMove() {
    if (drawdat === undefined) {
        return false;
    }
    // no drawing, no tooltip!
    var a = d3.event.pageX - canvasL;
    var b = d3.event.pageY - canvasT;
    //console.log('Position in canvas: ('+x+','+y+')');
    var c = canvasCoord2geoCoord(a, b);
    var d = coord2index(c.x, c.y, drawdat.reso);
    var e = cellmap[d];
    if (e !== undefined) {
        /*console.log(" ~~~~");
		console.log("index: "+i);
		console.log("we have "+cellmap[i].length+" events here: ");
		console.log(cellmap[i]);
		console.log(" ~~~~");*/
        // display the info bubble
        clearTimeout(bubbleTimer);
        $("div#bubble").css("opacity", "1").css("bottom", viewportH - d3.event.pageY + M_BUBBLE_OFFSET + "px").css("right", viewportW - d3.event.pageX + M_BUBBLE_OFFSET + "px").html(e.length + " <em>" + current_setsel.strings.label + "</em><br>" + "<span>[" + c.x.toFixed(2) + ", " + c.y.toFixed(2) + "]</span>");
    } else {
        // hide the info bubble
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(function() {
            $("div#bubble").css("opacity", "0");
        }, 250);
    }
}

function canvasMouseClick() {
    // TODO copied from cabvasMouseMove, DRY?
    if (drawdat === undefined) {
        return false;
    }
    // no drawing, no info!
    var a = d3.event.pageX - canvasL;
    var b = d3.event.pageY - canvasT;
    var c = canvasCoord2geoCoord(a, b);
    var d = coord2index(c.x, c.y, drawdat.reso);
    var e = cellmap[d];
    if (e !== undefined) {
        drawPlot(true, undefined, undefined, d);
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
    ////
    /// tomporary hacky timeline fix for changed data structure
    // TODO refurbish when upgrading timeline
    var c = [], d = {}, e, f, g, h;
    var i = (C_WMAX - C_WMIN) / a.parent.tile_width;
    for (e = 0; e < i; e++) {
        for (f = a.min; f <= a.max; f++) {
            g = a.data[e][f];
            if (g !== undefined) {
                if (d[f] === undefined) {
                    d[f] = g.length;
                } else {
                    d[f] += g.length;
                }
            }
        }
    }
    for (e = a.min; e <= a.max; e++) {
        if (d[e] !== undefined) {
            c.push([ new Date(0, 0).setFullYear(e), d[e] ]);
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
    $("#controls input[type='range']").on("input", function() {
        $(this).parent().next("input[type='text']").val(parseFloat($(this).val()).toFixed(1));
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