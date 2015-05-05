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

	$("#sidebar>menu h2").on("click", function() {
		$(this).toggleClass("closed");
		$(this).siblings("fieldset").slideToggle();
	});

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
	var labellang;
	var timesel;

	var ds = 0;
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
	if(labellang === undefined) { labellang = DEFAULT_LABELLANG; }
	$("#langsel").val(labellang);

	// time selection
	if(timesel === undefined) {
		// TODO store default values somewhere (in dataset?)
		timesel = { min: 1500, max: 2014 };
	}
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