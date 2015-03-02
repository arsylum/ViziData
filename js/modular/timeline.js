////////////////
/// timeline ///
////////////////
function genChart(data){
	if(data === undefined) { data = current_setsel; } // TODO

	console.log("/~~ generating chart data ~~\\ ");

	var benchmark_chart = new Date();

	var dat_arr = [],
		i,j,d,sum;

	for(i=data.min; i<=data.max; i++) {
		d = data.data[i];
		if(d !== undefined) {
			sum = 0;
			for(j=0; j<d.length; j++) {
				if(d[j] !== ARR_UNDEFINED) {
					sum += d[j].length;
				}
			}
			dat_arr.push([new Date(0,0).setFullYear(i),sum]);
		}
	}

	console.log("  |BM| iterating and sorting finished (took "+(new Date()-benchmark_chart)+"ms)");

	updateChart([{
		data: dat_arr,
		name: data.strings.label
	}]);
	console.log("  |BM| chart creation complete (total of "+(new Date()-benchmark_chart)+"ms");
	console.log("\\~~ finished generating chart ~~/ ");
}


/**
* updates/builds the chart
* (addSeries is bugged so build the chart from the ground)*/
function updateChart(seriez) {
	if(chart !== undefined) { chart.destroy(); }

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
		},//*/
		tooltip: {
			xDateFormat: "%Y"
		},
		series: seriez
	});

}

/////////////////////////////
/// Highcharts Extensions ///
/////////////////////////////

Highcharts.wrap(Highcharts.Chart.prototype, 'pan', function (proceed) {

  proceed.apply(this, Array.prototype.slice.call(arguments, 1));
  genGrid();

});