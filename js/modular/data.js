// properties
// 	members
// 		[0]: ["id", "int"],
// 		[1]: ["gender", [
// 			[0]: "male",
// 			[1]: "female",
//			[2] intersex (Q1097630), 
//			[3] transgender female (Q1052281), 
//			[4] transgender male (Q2449503), 
//			[5] genderqueer (Q48270)
// 		]]

// scan p21
// 	check value one of defined
// 	set value or null else
// 	add to map



////////////////////////
/// data management ///
//////////////////////
/**
* loads data
* for dataset with given index */
function setSetSel(dsi, dgi) { //, callback){

	current_datsel = gdata[dgi];
	filterSel = false;

	// load properties if missing
	if(current_datsel.props === undefined) {
		// TODO ? more loading feedback. maybe not as long as it's quick enough
		$.getJSON(DATA_DIR+current_datsel.properties, function(data) {
			current_datsel.props = data;
			current_datsel.props.labels = [];
			console.log('~~ Member properties of "'+current_datsel.id+'" have been loaded');
			updateFilterUI();
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
		$("#dsdesc").html(
			'<h4>Dataset <em>' + current_datsel.datasets[dsi].strings.label + '</em></h4>' +
			'<div class="loading-box"><div class="loading-bar"></div></div>');

		var lBM = new Date();
		console.log("~~ starting to load dataset "+current_datsel.datasets[dsi].strings.label+" ~~ ");
		$.ajax({
			dataType: "json",
			url: DATA_DIR+current_datsel.datasets[dsi].file,
			//data: data,
			progress: function(e) {
				if (e.lengthComputable) {
					var pct = Math.floor((e.loaded / e.total)*100);
					$("#dsdesc .loading-bar").css("width", pct+"%");
				}
			},
			success: function(data) {
		//$.getJSON(DATA_DIR+current_datsel.datasets[dsi].file, function(data){
				console.log(" |BM| finished loading "+current_datsel.datasets[dsi].strings.label+" data (took "+(new Date()-lBM)+"ms)");
							
				current_datsel.datasets[dsi].data = data;
				current_setsel = current_datsel.datasets[dsi];
				lBM = Date.now();
				preprocess(current_setsel);

				console.log(" |BM| finished preprocessing object iterators ("+(Date.now()-lBM)+"ms)");

				//clearInterval(lAnim);

				updateUI();
				genChart();
				initComplete = true;
				genGrid();
			}
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

function filterIntegrity() {
	filterSel[0] = true;
	for(var i = 1; i < filterSel.length; i++) {
		filterSel[i][0] = true;
		for(var j = 1; j < filterSel[i].length; j++) {
			if(filterSel[i][j] === true) { 
				filterSel[i][0] = false;	
				filterSel[0] = false;
			}
		}
	}
}