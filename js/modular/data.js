////////////////////////
/// data management ///
//////////////////////
/**
* loads data
* for dataset with given index */
function setSetSel(dsi, dgi) { //, callback){

	current_datsel = gdata[dgi];

	// load properties if missing
	if(current_datsel.props === undefined) {
		// TODO ? more loading feedback. maybe not as long as it's quick enough
		$.getJSON(DATA_DIR+current_datsel.properties, function(data) {
			current_datsel.props = data;
			console.log('~~ Member properties of "'+current_datsel.id+'" have been loaded');
		});
	}

	var iS = current_datsel.datasets[dsi].options.initSelection;
    if(initComplete && iS !== undefined) { // set to datasets default selection
    	timeSel.data.x = {min: iS.min, max: iS.max };
    }

	if(current_datsel.datasets[dsi].data !== undefined) {
		current_setsel = current_datsel.datasets[dsi];
		updateUI();
		genChart();
		genGrid();
	} else {
		// loading feedback
		var l = 0;
		var lAnim = setInterval(function(){
		var txt = [
			"loading... &nbsp; &nbsp; ┬──┬﻿",
			"loading... &nbsp; &nbsp; ┬──┬﻿",
			"loading... (°o°） ┬──┬﻿",
			"loading... &nbsp;(°o°）┬──┬﻿",
			"loading... (╯°□°）╯ ┻━┻",
			"loading... (╯°□°）╯︵ ┻━┻",
			"loading... (╯°□°）╯︵ ︵ ┻━┻",
			"loading... (╯°□°）╯︵ ︵ ︵ ┻━┻",
			"loading... ︵ ︵ ︵ ┻━┻",
			"loading... ︵ ︵ ┻━┻",
			"loading... ︵ ┻━┻",
			"loading... &nbsp; &nbsp; ┻━┻ &nbsp; &nbsp; (ツ)",
			"loading... &nbsp; &nbsp; ┻━┻ &nbsp; &nbsp;(ツ)",
			"loading... &nbsp; &nbsp; ┻━┻ &nbsp; (ツ)",
			"loading... &nbsp; &nbsp; ┻━┻ &nbsp;(ツ)",
			"loading... &nbsp; &nbsp; ┬──┬﻿ ¯\\_(ツ)",
			"loading... &nbsp; &nbsp; ┬──┬﻿ (ツ)",
			];
		$("#legend").html(txt[l]);
		l = (l+1)%17;
		},180);

		var lBM = new Date();
		console.log("~~ starting to load dataset "+current_datsel.datasets[dsi].strings.label+" ~~ ");
		$.getJSON(DATA_DIR+current_datsel.datasets[dsi].file, function(data){
			console.log(" |BM| finished loading "+current_datsel.datasets[dsi].strings.label+" data (took "+(new Date()-lBM)+"ms)");
						
			current_datsel.datasets[dsi].data = data;
			current_setsel = current_datsel.datasets[dsi];
			lBM = Date.now();
			preprocess(current_setsel);

			console.log(" |BM| finished preprocessing object iterators ("+(Date.now()-lBM)+"ms)");

			clearInterval(lAnim);

			updateUI();
			genChart();
			initComplete = true;
			genGrid();
		});
	}
}

function preprocess(ds) {
	if(ds.ready === true) { return false; }

	if(ds.itarraytor === undefined) {
		ds.itarraytor = [];
	}

	var i = (C_WMAX - C_WMIN) / ds.parent.tile_width;
	while(i--) {
		if(ds.itarraytor[i] === undefined) {
			ds.itarraytor[i] = [];
			for(var k in ds.data[i]) {
				ds.itarraytor[i].push(parseInt(k));
			}
		}
	}
	ds.ready = true;
}