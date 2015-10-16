////////////////
/// timeline ///
////////////////
/**
** actually rather "data line" or anything like that - or simply chart
** for displaying the non geographical axis of the supplied data
*/
function genChart(data){
	if(current_setsel.ready !== true || current_datsel.props === undefined) { 
		console.warn('cannot execute genChart: not ready. retry after 100ms');
		setTimeout(genChart, 100);
		return false; 
	}
	var benchmark_chart = new Date();

	updateChartDataFkt(data);
	initChart();

	console.log("  |BM| chart creation complete (total of "+(new Date()-benchmark_chart)+"ms)");
	console.log("\\~~ finished generating chart ~~/ ");
}

/**
* timeout wrapper * /
(not used right now)
function updateChartData(data) {
	if(current_setsel === undefined) { return false; }
	clearTimeout(chartdatTimer);
	chartdatTimer = setTimeout(function() {
		updateChartDataFkt(data);
		//summary.trigger("select", timeSel); // to make envision redraw...

		chart.components[0].draw(chartdat, { xaxis: {
			min: timeSel.data.x.min,
			max: timeSel.data.x.max
		}});
	}, Math.max((CALC_TIMEOUT-100),100));
}*/


function updateChartDataFkt(data) {
	if(data === undefined) { data = current_setsel; } // TODO

	console.log("/~~ generating chart data ~~\\ ");
	var benchmark_chart = Date.now();

	//drawWhat();
	var mAE = getBounds(); //drawdat.bounds,
	var mmt = getMinMaxTile(mAE); //drawdat.mmt;

	chartdat = [];

	var globob = {}, locob = {},
		i,j,l,k,q,p,d,it, itl;
	
	

	/// create envision data from the assembled object
	var nvision = function(o) {
		// create a sorted index for all o props
		var x = [], y = [], kay = [];
		for(i in o) {	kay.push(parseInt(i));	}
		kay.sort(function(a,b) { return a-b; });
		// and iterate over it
		l = kay.length;
		for(i = 0; i < l; i++) {
			x.push(kay[i]);
			y.push(o[kay[i]]);
		}
		chartdat.push([x,y]);
	};

	// the following is a bit redundant because it's rolled out for performance
	// to save a few milliseconds here and there
	// (even though it turns out that it doesn't make that much of a difference...)
	if(timelineIsGlobal) { // collect all
		var tilecount = (C_WMAX - C_WMIN) / data.parent.tile_width;
		for(i = 0; i < tilecount; i++) {
			itl = data.itarraytor[i].length;
			it = -1;
			//if(i >= mmt.min && i <= mmt.max) { // in range, collect both

			while(++it < itl) {
				j = data.itarraytor[i][it];
				d = data.data[i][j];
				l = d.length;
				// global part
				if(filterSel[0] === true) { // everything
					if(globob[j] === undefined) { globob[j] = d.length; }
					else { globob[j] += d.length; }
				} else { //filtered
					p = 0;
					q = l;
					while(--q) { if(property_filter(d[q])) { p++; }	}
					if(p > 0) { 
						if(globob[j] === undefined) { globob[j] = p; }
						else { globob[j] += p; }
					}
				}
				// local part
				if(globob[j] !== undefined && locob[j] === undefined) { locob[j] = 0; }
				if(i >= mmt.min && i <= mmt.max) {
					q = l;
					while(--q) {
						d = data.data[i][j][q];
						if(property_filter(d) && section_filter(d,mAE)) { locob[j]++; }
					}
			}	}
			// } else { // out of range, just global
			// 	while(++it < itl) {
			// 		j = data.itarraytor[i][it];
			// 		d = data.data[i][j];
			// 		if(globob[j] === undefined) { globob[j] = d.length; }
			// 		else { globob[j] += d.length; }
			// 	}
			// }
		}
		nvision(globob);
		nvision(locob);
	} else { // collect map area data only
		for(i = mmt.min; i<= mmt.max; i++) {
			it = data.itarraytor[i].length;
			while(it--) {
				j = data.itarraytor[i][it];
				l = data.data[i][j].length;
				p = 0;
				while(--l)  {
					d = data.data[i][j][l];
					if(property_filter(d) && section_filter(d,mAE)) { p++; }
				}
				if(p > 0) {
					if(locob[j] === undefined) { locob[j] = p; }
					else { locob[j] += p; }
		}	}	}	
		nvision(locob);
	}
	console.log("  |BM| timeline data updated in "+(Date.now()-benchmark_chart)+"ms");
}



function initChart() {
	if(chartdat.length <= 0) { return false; }
	if(chart !== undefined) {
		chart.destroy();
	}


	var connectionH = 10; // height of connection component
		//summargin = 10; // extend value range of the summary component

	var container = $("#chart");
	var containerW = container.width(),
		detailH = Math.floor(container.height() * (2/3)) - connectionH,
		summaryH = Math.floor(container.height() * (1/3)); // - connectionH;

    var selCallback = function() { // callback function for selection change
    	var range = getTimeSelection();
    	if(timeSel.data.x.min !== range.min || timeSel.data.x.max !== range.max) {
    		timeSel.data.x = { 	min: range.min,	max: range.max };
    		genGrid();
    	}
    	$("#range-tt-min>div").text(range.min);
    	$("#range-tt-max>div").text(range.max);
	};

    var detail, detailOptions,
        summaryOptions, // summary, (is global)
        connection, connectionOptions;

    // Configuration for detail (top view):
    detailOptions = {
        name : 'detail',
        data : chartdat,
        height : detailH,
        width: containerW,
        title: "Timeline",
        // Flotr Configuration
        config : {
        	// envision default colors: ['#00A8F0', '#C0D800', '#CB4B4B', '#4DA74D', '#9440ED']
        	colors: (timelineIsGlobal ? ['#00A8F0', '#C0D800'] : ['#A0D345']),
	        'bars' : {
	    	    lineWidth : 1,
	          	show : true,
	          	fill : true,
	          	fillOpacity : 0.6
	        },
	        mouse : {
				track: true,
				trackY: false,
				trackAll: true,
				sensibility: 1,
				trackDecimals: 4,
				position: 'nw',
				lineColor: '#ff9900',
				fillColor: '#ff9900',
				fillOpacity: 0.6,
				trackFormatter : (function() {
					var str = current_setsel.strings.timelineToolTip || T_DEFAULT_TOOLTIP;
					str = str.match(/(.*)(\%.)(.*)(\%.)(.*)(\%.)(.*)/);
					
					var fkt = 'var k = parseInt(o.x);' +
						'highlightCellsFor(k);' +
						'return "';

					for(var i = 1; i<str.length; i++) {
						if(str[i] === "%l") {
							fkt += '<em>'+current_setsel.strings.label+'</em> ';
						} else if(str[i] === "%x") {
							fkt += '" + k + " ';
						} else if(str[i] === "%v") {
							fkt += '<em>" + parseInt(o.y) + "</em> ';
						} else {
							fkt += str[i];
						}
					}
					//.replace(/(\d)(?=(\d{3})+$)/g, "$1,")
					fkt += ' <span>(';
					if(timelineIsGlobal) {
						fkt += '<em>"+chart.components[0].options.config.data[1][o.index][1]+"</em> ';
					}
					fkt += 'in map area)</span>";';
					return Function('o', fkt);
				})()
	        },
	        yaxis : { 
	          	autoscale : true,
	          	autoscaleMargin : 0.05,
	          	noTicks : 4,
	          	showLabels : true,
	          	min : 0,
	        }
		}
    };

    // Configuration for summary (bottom view):
    summaryOptions = {
      	name : 'summary',
        data : chartdat,
        height : summaryH,
        width: containerW,
        // Flotr Configuration
        config : {
	        'bars' : {
				show : true,
				lineWidth : 1,
				fill : true,
				fillOpacity : 0.2,
				//fillBorder : true
	        },
	        xaxis : {
	          	noTicks: 5,
	          	showLabels : true,
	        	//min: current_setsel.min - summargin, // messy hack for issue #11
	        	//max: current_setsel.max + summargin  // causes trouble
	        },
	        yaxis : {
	          	autoscale : true,
	          	autoscaleMargin : 0.1
	        },
	        handles : {
	          	show : true
	        },
	        selection : {
	          	mode : 'x'
	        }
      	}
    };

    connectionOptions = {
	    name : 'connection',
	    adapterConstructor : envision.components.QuadraticDrawing,
	    height: connectionH,
	    width: containerW
    };

    // Building the viz:
    chart = new envision.Visualization();
    detail = new envision.Component(detailOptions);
    summary = new envision.Component(summaryOptions);
    connection = new envision.Component(connectionOptions);
    interaction = new envision.Interaction();

    // Render Visualization
    chart
      	.add(detail)
      	.add(connection)
      	.add(summary)
      	.render(container.get(0));
	
	// Wireup Interaction
	interaction
        .leader(summary)
        .follower(detail)
        .follower(connection)
        .add(envision.actions.selection, {callback: selCallback});

   	appendTimelineRangeTips();
   	appendListeners();

    // set to initial selection state
  	summary.trigger('select', timeSel);
}

/**
* sets or changes the time selection */
function changeTimeSel(min,max,relative) {
	if(relative === undefined) { relative = true; }

	var sel = chart.components[2].api.flotr.selection;
	if(relative) {
		timeSel.fmin += min - Math.floor(min);
		timeSel.fmax += max - Math.floor(max);

		min = Math.floor(min + timeSel.data.x.min + Math.floor(timeSel.fmin));
		max = Math.floor(max + timeSel.data.x.max + Math.floor(timeSel.fmax));

		timeSel.fmin -= Math.floor(timeSel.fmin);
		timeSel.fmax -= Math.floor(timeSel.fmax);
	}

	if(min > max) { return false; }
	if(max > current_setsel.max) { return false; }
	if(min < current_setsel.min) { return false; }

	timeSel.data.x = { min: min, max: max };

	if(min !== current_setsel.min || max !== current_setsel.max) {
		sel.selecting = true;
	}
	sel.setSelection({x1: min, x2: max});
	genGrid();
}

/**
* returns sanitized selection of the timeline */
function getTimeSelection() {
	var cAE, min = current_setsel.min, max = current_setsel.max,
		sel = chart.components[2].api.flotr.selection;

	if(sel.selecting !== false) {
		cAE = sel.getArea();
		cAE.min = Math.round(cAE.x1);
		cAE.max = Math.round(cAE.x2);
	} else { cAE = { min: min, max: max	}; }

	return {
		min: (cAE.min >= min ? cAE.min : min),
		max: (cAE.max <= max ? cAE.max : max)
	};
}

function appendListeners() {
	$(chart.components[0].node).on("mouseleave", function() {
    	highlightCell(false);
	});
}

function appendTimelineRangeTips() {
	var cont = $(
		'<div id="range-tt-min" class="range-tt hover-tt">' +
			'<span class="arrow arrow-left"></span>' + 
			'<div></div>' +
			'<span class="arrow arrow-right"></span>' +
		'</div>' +
		'<div id="range-tt-max" class="range-tt hover-tt">' +
			'<span class="arrow arrow-left"></span>' + 
			'<div></div>' +
			'<span class="arrow arrow-right"></span>' +
		'</div>'); //.hide();
	$("#chart").append(cont);

	// change interval limits with arrows
	var repeatTimeout, repeatInterval;
	$(".range-tt .arrow").on("mousedown", function() {

		//allow_redraw = false;
		var min = ($(this).parent().attr("id") === "range-tt-min" ?
			($(this).hasClass("arrow-left") ? -1 : +1 ) :
			0);
		var max = ($(this).parent().attr("id") === "range-tt-max" ?
			($(this).hasClass("arrow-left") ? -1 : +1 ) :
			0);
		changeTimeSel(min,max);

		repeatTimeout = setTimeout(function() {
			repeatInterval = setInterval(function() {
				changeTimeSel(min,max);
			}, 100);
		}, 100);
	}).on("mouseup mousemove", function() {
		clearTimeout(repeatTimeout);
		clearInterval(repeatInterval);
	});

	// drag behavior on detail view
	var stepSize;
	var drag = d3.behavior.drag()
        .on("drag", function(u,i) {
            changeTimeSel(-d3.event.dx*stepSize, -d3.event.dx*stepSize);
        }).on("dragstart", function() {
        	stepSize = (timeSel.data.x.max - timeSel.data.x.min) / $("#chart").width();
        });
    d3.selectAll("#chart .detail").call(drag);

    // registering empty event handlers to prevent weird ghost page dragging glitches
    d3.selectAll("#chart .connection, #chart .summary").call(d3.behavior.drag());
}