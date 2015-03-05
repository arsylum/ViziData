////////////////////////
/// data management ///
//////////////////////
/**
* loads data
* for dataset with given index */
function setSetSel(dsi) { //, callback){
	// load properties if missing
	if(current_datsel.props === undefined) {
		// TODO ? more loading feedback
		$.getJSON(DATA_DIR+current_datsel.properties, function(data) {
			current_datsel.props = data;
			console.log('~~ Member properties of "'+current_datsel.id+'" have been loaded');
		});
	}
	if(current_datsel.datasets[dsi].data !== undefined) {
		current_setsel = current_datsel.datasets[dsi];
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
		$.getJSON(DATA_DIR+gdata[0].datasets[dsi].file, function(data){
			console.log(" |BM| finished loading "+current_datsel.datasets[dsi].strings.label+" data (took "+(new Date()-lBM)+"ms)");
			clearInterval(lAnim);
			
			current_datsel.datasets[dsi].data = data;

			current_setsel = current_datsel.datasets[dsi];
			genChart();
			genGrid();

		});
	}
}