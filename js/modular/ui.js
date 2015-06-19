//////////////////////
/// user interface ///
//////////////////////
/**
* bind control handlers */
function setupControlHandlers() {

	// build filter menu
	var fn = function() { 
		setSetSel(this.value, $(this).parent().parent().attr("data-gi")); 
	};
	var filter = $("#filter");
	for(var i = 0; i<gdata.length; i++) {
		var fs = $("<fieldset>").attr("data-gid", gdata[i].id).attr("data-gi", i);
		fs.append('<legend>'+gdata[i].title+'</legend>');
		for(var j=0; j<gdata[i].datasets.length; j++) {
			var b = $('<input type="radio" name="radio" value="'+j+'" />')
				.on("change", fn);
			//var tt = $('<span class="tooltip">'+gdata[i].datasets[j].strings.desc+'</span>');
			fs.append($('<label class="tooltip" data-tt="'+gdata[i].datasets[j].strings.desc+
				'">'+gdata[i].datasets[j].strings.label+'</label>').prepend(b));
		}
		filter.append(fs);
	}

	$(".controls input[type='range']")
		.on("input", function() {
			$(this).siblings("input[type='text']").val(parseFloat($(this).val()).toFixed(1));
		});
	/*$("#zoom-slider").on("change", function() {
		transitTo(getZoomTransform($(this).val()));
	});*/
	$("#reso-slider").on("change", function() {
		resoFactor = parseFloat($(this).val());
		genGrid();
	});
	$("#bleed-slider").on("change", function() {
		leaflaggrid._redraw();
		urlifyState();
	});
	/*$("#freezer>input").on("change", function() {
		allow_redraw = !this.checked;
		if(this.checked) { 
			$("#legend").css("opacity",".5"); 
		} else { 
			$("#legend").css("opacity","1"); 
			genGrid();
		}
	});*/
	$("#map-opacity").on("input", function() {
		$(leafloor._container).css("opacity",$(this).val());
		urlifyState();
	});
	$("#ctrl-maplayer input[type=checkbox]").on("change", function() {
		changeTileSrc();
		urlifyState();
	});
	$("#ctrl-tlmode input").on("change", function() {
		timelineIsGlobal = parseInt($(this).val());
		//updateChartData();
		genChart();
		urlifyState();
	});

	$("#main-menu h2").on("click", function() {
		$(this).toggleClass("closed");
		$(this).siblings("fieldset").slideToggle();
	});

	/// setup menu
	$("#menu-launcher").on("click", function() {
		$("#widget-area").toggleClass("open");
	});


	/// item table
	$("#infolist").on("scroll", infolistScroll);

	
	$("#map").on("mouseleave", function() {
		$bubble.css("opacity", "0");
	});

	// bind window resize handling
	$(window).resize(function() {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(onResize, 400);
	});

	// label language
	// TODO get proper labels somehow
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
* update UI labels etc on dataset change */
function updateUI() {
	var zprop = current_setsel.strings.zprop || T_DEFAULT_ZPROP;
	$("#cellinfo th:last-child").text(zprop);

	$("#dsdesc").html(
		'<h4>Dataset</h4><h3><em>' + 
		//current_setsel.parent.label + '</em> &gt; <em>' + 
		current_setsel.strings.label + '</em></h3>'
		//+ '<p>' + current_setsel.strings.desc + '</p>'
		);

	var showDsDesc = function() {

	}
}

// TODO:  mapop sl
////////////////////////////////
/// url parameters key overview:
//°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// c: selected cell
// d: selected dataset
// e: timeline selection interval
// f: timeline data source mode
// g: grid resolution slider
// h: grid drawing overlap slider 
// l: label language
// m: selected datagroup
// o: tile map opacity ###
// p: tile map parameters ###
// x: map center longitude
// y: map center latitude
// z: map zoom
////////////////////////////////
/**
* encodes current state of viz into url to make it shareable*/
function urlifyState() {
	if(!initComplete) { return false; }

	// selected dataset
	var setsel = $("#filter input[type='radio']:checked").val();
	var hash = "d="+setsel;
	// selected datagroup
	hash += "&m=" + current_datsel.id;

	// item label language
	hash += "&l=" + $("#langsel").val();

	// timeline settings
	hash += "&f=" + timelineIsGlobal;
	// timeline selection
	var time = getTimeSelection();
	hash += "&e=" + time.min + "," + time.max;

	// selected cell
	//hash += "&c=" + index2geoCoord(selectedCell, calcReso()).toString(); //selectedCell;
	// grid resolution
	hash += "&g=" + resoFactor;
	// grid drawing overlap
	hash += "&h=" + $("#bleed-slider").val();

	// tilemap opacity
	hash += "&o=" + $("#map-opacity").val();
	// tilemap config (TODO universalify)
	var tileconf = 0;
	if($("#maplayer-labels").get(0).checked) { tileconf += 1; }
	if($("#maplayer-shape").get(0).checked) { tileconf += 2; }
	hash += "&p=" + tileconf;

	// map transformation state
	var mcenter = leafly.getCenter();
	hash += "&x=" + mcenter.lng + "&y=" + mcenter.lat;
	hash += "&z=" + leafly.getZoom();

	window.location.hash = hash;
}

/**
* restore the url encoded viz state */
function statifyUrl() {
	mutexStatify = 1;
	var hash = window.location.hash;
	//if (hash === "") { return false; }

	/// default values
	var	labellang = DEFAULT_LABELLANG,
		timesel,
		cellsel = false,
		dg = DEFAULT_DATAGROUP,
		ds = DEFAULT_DATASET,
		tl_mode = timelineIsGlobal,
		tile_opacity = M_DEFAULT_TILE_OPACITY,
		tile_conf = M_DEFAULT_TILE_CONF,
		map_lng = 0, map_lat = 0, map_zoom = 2;

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
			case "m": // datagroup selection
				dg = val;
				break;
			case "e": // time selection (envision)
				var e = val.split(",");
				timesel = { min: parseInt(e[0]), max: parseInt(e[1]) };
				break;
			case "g": // grid resolution
				$("#reso-slider").val(parseFloat(val)).trigger("input").trigger("change");
				break;
			case "h": // drawing overlap
				$("#bleed-slider").val(parseFloat(val)).trigger("input");
				break;
			case "o": // tilemap opacity
				tile_opacity = parseFloat(val);
				break;
			case "p": // tilemap parameters
				tile_conf = parseInt(val);
				break;
			case "x": // map longitude
				map_lng = parseFloat(val);
				break;
			case "y": // map latitude
				map_lat = parseFloat(val);
				break;
			case "z": // map zoom
				map_zoom = parseInt(val);
				break;
			case "c": // selected cell
				//selectedCell = parseFloat(val);
				//cellsel = val.split(",");
				break;
			default:
				console.warn("statifyUrl(): discarded unrecognized parameter '"+ key + "' in url pattern");
		}
	}

	// datagroup fallback
	var dgi = gdata.length;
	while(--dgi && gdata[dgi].id !== dg) {}
	if(gdata[dgi].id !== dg) {
		console.warn('cannot find datagroup "'+dg+'". '+
					 'Falling back to "'+gdata[dgi].id + '"');
		dg = gdata[dgi].id;
	}

	if(timesel === undefined) { timesel = { 
		min: gdata[dgi].datasets[ds].options.initSelection.min, 
		max: gdata[dgi].datasets[ds].options.initSelection.max 
	};	}

	// label language
	$("#langsel").val(labellang);

	/// timeline settings
	$("#ctrl-tlmode input[value="+tl_mode+"]").prop("checked", true).trigger("change");
	//$("#tl-normalize").get(0).checked = tl_normalize;

	// time selection
	timeSel = {
	      	data : {		// TODO this could go into dataset config options
	        	x : {
	          		min : timesel.min,
	          		max : timesel.max
    	}  	}, fmin: 0, fmax: 0   };

	// recreate tilemap config
    $("#map-opacity").val(parseFloat(tile_opacity)).trigger("input");
    $("#maplayer-shape").get(0).checked = tile_conf > 1;
    $("#maplayer-labels").get(0).checked = tile_conf % 2; 
    changeTileSrc();

	// recreate map state
	leafly.setView([map_lat,map_lng],map_zoom, { reset: true });
	//selectedCell = geoCoord2index(cellsel[0], cellsel[1], calcReso());
	
	// select dataset
	$("#filter fieldset[data-gid="+dg+"] input").get(ds).click();
	attachMapHandlers();
	//return true;
}