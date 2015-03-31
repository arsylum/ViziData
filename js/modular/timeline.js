////////////////
/// timeline ///
////////////////
function genChart(data){
	if(data === undefined) { data = current_setsel; } // TODO

	console.log("/~~ generating chart data ~~\\ ");

	var benchmark_chart = new Date();

	////
	/// tomporary hacky timeline fix for changed data structure
	// TODO refurbish when upgrading timeline
	// still TODO? check if it can improved
	var x = [], y = [], ticks = [];
	var dat_obj = {},
		i,j,d;
	
	var tilecount = (C_WMAX - C_WMIN) / data.parent.tile_width;
	for(i = 0; i < tilecount; i++) {
		for(j=data.min; j<=data.max; j++) {
			d = data.data[i][j];
			if(d !== undefined) {
				if(dat_obj[j] === undefined) {
					dat_obj[j] = d.length;
				} else {
					dat_obj[j] += d.length;
				}
			}
		}
	}

	for(i=data.min; i<=data.max; i++) {
		if(dat_obj[i] !== undefined) {
			//dat_arr.push([new Date(0,0).setFullYear(i),dat_obj[i]]);
			//x.push(new Date(0,0).setFullYear(i));
			//ticks.push(new Date(0,0).setFullYear(i));
			x.push(i);
			y.push(dat_obj[i]);
		}
	}
	

	chartdat = [
		[x,y]
	];


	console.log("  |BM| iterating and sorting finished (took "+(new Date()-benchmark_chart)+"ms)");

	initChart();

	//chart = new envision.templates.Finance(options);
	/*
	updateChart([{
		data: dat_arr,
		name: data.strings.label
	}]);*/
	console.log("  |BM| chart creation complete (total of "+(new Date()-benchmark_chart)+"ms");
	console.log("\\~~ finished generating chart ~~/ ");
}




function initChart() {
	if(chartdat === undefined) { return false; }
	if(chart !== undefined) {
		chart.destroy();
	}

	var connectionH = 10; // height of connection component

	var container = $("#chart");
	var containerW = container.width(),
		detailH = Math.floor(container.height() * (2/3)) - connectionH,
		summaryH = Math.floor(container.height() * (1/3)) - connectionH;

	var initSelection = {	// default initial selection
      	data : {			// TODO this could go into dataset config options
        	x : {
          		min : 1500,
          		max : 2014
    }  	}   };

    var selCallback = function() { // callback function for selection change
		genGrid();
	};

    var detail, detailOptions,
        summary, summaryOptions,
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
	        'lite-lines' : {
	    	    lineWidth : 1,
	          	show : true,
	          	fill : true,
	          	fillOpacity : 0.2
	        },
	        mouse : {
				track: true,
				trackY: false,
				trackAll: true,
				sensibility: 1,
				trackDecimals: 4,
				position: 'ne',
				trackFormatter : function (o) {
			    	return parseInt(o.y) + " " + current_setsel.strings.label + " in " + parseInt(o.x);
			    }
	        },
	        yaxis : { 
	          	autoscale : true,
	          	autoscaleMargin : 0.05,
	          	noTicks : 4,
	          	showLabels : true,
	          	min : 0
	        },
	        xaxis: { // TODO what is this?
	        	margin: false,
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
	        'lite-lines' : {
				show : true,
				lineWidth : 1,
				fill : true,
				fillOpacity : 0.2,
				fillBorder : true
	        },
	        xaxis : {
	          	noTicks: 5,
	          	showLabels : true,
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
	        },
	        grid : {
	          	verticalLines : false
	        }
      	}
    };

    connectionOptions = {
	    name : 'connection',
	    adapterConstructor : envision.components.QuadraticDrawing,
	    height: connectionH,
	    width: containerW
    };

    // Building the vis:
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

    // set to initial selection state
  	summary.trigger('select', initSelection);
}



/**
* updates/builds the chart
* (addSeries is bugged so build the chart from the ground)*/
function updateChart(seriez) {
	

	/*if(chart !== undefined) { chart.destroy(); }

	chart = new Highcharts.StockChart({
		chart: {
			type: 'spline',
			renderTo: 'chart'
		},
		title: {
			text: null
		},
		credits: {
			enabled: false
		},
		rangeSelector: {
			enabled: true,
			buttons: [{
				type: "year",
				count: 10,
				text: "10y"
			},{
				type: "year",
				count: 100,
				text: "100y"
			},{
				type: "year",
				count: 1000,
				text: "1000y"
			},{
				type: "all",
				text: "all"
			}],
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
					redrawTimer = setTimeout(genGrid, 200); // (!)genGrid adds another timeout
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
		},//*//*
		tooltip: {
			xDateFormat: "%Y"
		},
		series: seriez
	});*/

}

/////////////////////////////
/// Highcharts Extensions ///
/////////////////////////////
/*
Highcharts.wrap(Highcharts.Chart.prototype, 'pan', function (proceed) {

  proceed.apply(this, Array.prototype.slice.call(arguments, 1));
  genGrid();

});*/