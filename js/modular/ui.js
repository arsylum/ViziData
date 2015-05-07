//////////////////////
/// user interface ///
//////////////////////
/**
* bind control handlers */
function setupControlHandlers() {

	// build filter menu
	var fn = function() { setSetSel(this.value); };
	var filter = $("#filter");
	for(var i = 0; i<gdata.length; i++) {
		var fs = $("<fieldset>");
		fs.append('<legend>'+gdata[i].title+'</legend>');
		for(var j=0; j<gdata[i].datasets.length; j++) {
			
			var b = $('<input type="radio" name="radio" value="'+j+'" />')
				.on("change", fn);

			fs.append($('<label>'+gdata[i].datasets[j].strings.label+'</label>').prepend(b));
		}
		filter.append(fs);
	}

	$(".controls input[type='range']")
		.on("input", function() {
			$(this).siblings("input[type='text']").val(parseFloat($(this).val()).toFixed(1));
		});
	$("#zoom-slider").on("change", function() {
		transitTo(getZoomTransform($(this).val()));
	});
	$("#reso-slider").on("change", function() {
		resoFactor = parseFloat($(this).val());
		genGrid();
	});
	$("#freezer>input").on("change", function() {
		allow_redraw = !this.checked;
		if(this.checked) { 
			$("#legend").css("opacity",".5"); 
		} else { 
			$("#legend").css("opacity","1"); 
			genGrid();
		}
	});

	$("#ctrl-tlmode input").on("change", function() {
		timelineIsGlobal = parseInt($(this).val());
		updateChartData();
		if(current_setsel !== undefined) { urlifyState(); }
	});
	//.filter("[value="+timelineIsGlobal+"]").prop("checked", true);
	$("#tl-normalize").on("change", function() {
		if(chart === undefined) {
			return false;
		}
		var detail = chart.components[0],
			ac = detail.options.config.yaxis;
		if(this.checked) {
			ac.autoscale = true;
			delete(ac.max);
		} else {
			ac.autoscale = false;
			ac.max = current_setsel.maxEventCount + T_YAXIS_MAX_OFFSET;
		}
		updateChartData();
		urlifyState();
	});

	$("#sidebar>menu h2").on("click", function() {
		$(this).toggleClass("closed");
		$(this).siblings("fieldset").slideToggle();
	});

	// $("#colorizer>input").on("change", function() {
	// 	colorize = !this.checked;
	// 	genGrid();
	// });
	$("#infolist").on("scroll", infolistScroll);

	

	// $(window).resize(function() {
	// 	viewportW = $(this).width();
	// 	viewportH = $(this).height();
	// });

	// $("#export").click(function() {
	// 	$(this).attr("disabled","disabled");
	// 	exportSvg();
	// });


	// label language
	// TODO get full list from..where?
	var langs = langCodes;
	for(i = 0; i<langs.length; i++) {
		$("#langsel").append($('<option value="'+langs[i]+'">' + 
			langs[i] + '</option>'));
	}
	$("#langsel").on("change", function() {
		$("#infolist a").addClass("q");
		$("#infolist").trigger("scroll");
		urlifyState();
	});
}


////////////////////////////////
/// url parameters key overview:
//°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// c: selected Cell
// d: selected Dataset
// e: timeline Selection Interval
// f: timeline Data Source Mode
// g: grid Resolution Slider
// l: label language
// n: timeline normalization
// s: map scale
// t: map translation
////////////////////////////////
/**
* encodes current state of viz into url to make it shareable*/
function urlifyState() {
	// TODO selected cells are note encoded yet
	// TODO properly encode selcted dataset (depends on data management module)
	var setsel = $("#filter input[type='radio']:checked").val();
	// selected dataset
	var hash = "d="+setsel;
	// item label language
	hash += "&l=" + $("#langsel").val();
	// timeline settings
	hash += "&f=" + timelineIsGlobal;
	hash += "&n=" + $("#tl-normalize").get(0).checked;
	// timeline selection
	var time = getTimeSelection();
	hash += "&e=" + time.min + "_" + time.max;
	// grid resolution
	hash += "&g=" + resoFactor;
	// map transformation
	hash += "&t=" + lastTransformState.translate[0] + "_" + lastTransformState.translate[1] + "&s=" + lastTransformState.scale;
	// selected cell
	hash += "&c=" + selectedCell;

	window.location.hash = hash;
}

/**
* restore the url encoded viz state */
function statifyUrl() {
	var hash = window.location.hash;
	//if (hash === "") { return false; }

	/// default values
	var	labellang = DEFAULT_LABELLANG,
		timesel = { min: 1500, max: 2014 },
		ds = DEFAULT_DATASET,
		tl_mode = 0, // == map area
		tl_normalize = false;


	hash = hash.substring(1).split("&");
	for(var i= 0; i<hash.length; ++i) {
		var key = hash[i].substring(0,1);
		var val = hash[i].substring(2);
		switch(key) {
			case "d": // dataset selection
				ds = parseInt(val);
				break;
			case "l": // item label language
				labellang = val;
				break;
			case "f": // timeline data source (global or map area)
				tl_mode = val;
				break;
			case "n": // timeline normalization
				tl_normalize = (val === "true");
				break;
			case "e": // time selection (envision)
				var e = val.split("_");
				timesel = { min: parseInt(e[0]), max: parseInt(e[1]) };
				break;
			case "g": // grid resolution
				$("#reso-slider").val(parseFloat(val)).trigger("input").trigger("change");
				break;
			case "t": // map translation
				var t = val.split("_");
				lastTransformState.translate = [parseFloat(t[0]),parseFloat(t[1])];
				break;
			case "s": // map scale
				lastTransformState.scale = parseFloat(val);
				break;
			case "c": // selected cell
				selectedCell = parseFloat(val);
				break;
			default:
				console.warn("statifyUrl(): discarded unrecognized parameter '"+ key + "' in url pattern");
		}
	}

	// label language
	$("#langsel").val(labellang);

	/// timeline settings
	$("#ctrl-tlmode input[value="+tl_mode+"]").prop("checked", true).trigger("change");
	$("#tl-normalize").get(0).checked = tl_normalize;

	// time selection
	timeSel = {
	      	data : {		// TODO this could go into dataset config options
	        	x : {
	          		min : timesel.min,
	          		max : timesel.max
    	}  	}, fmin: 0, fmax: 0   };

	// recreate map state
	zoombh.scale(lastTransformState.scale);
	zoombh.translate(lastTransformState.translate);
	$("#ctrl-zoom>input").val((Math.log(lastTransformState.scale)/Math.log(2)+1).toFixed(1)).trigger("input");

	// select dataset
	if($("#filter input").get(ds) === undefined) { return false; }
	$("#filter input")[ds].click();
	return true;
}