//////////////////////
/// user interface ///
//////////////////////
/**
* bind control handlers */
function setupControlHandlers() {

	$mm = $("#main-menu");

	// build filter menu
	var fn = function(e) {
		$t = $(this);
		$("#filter fieldset div").removeClass("selected");
		$t.addClass("selected");
		setSetSel($t.attr("data-ds"), $t.parent().attr("data-gi"));
	};
/*	var grouptoggle = function() {
		var $t = $(this);
		$t.filter(":not(.open)").addClass("open").children("div").slideDown("fast");
		$('#filter .group-container:not([id="' + $t.attr("id") + '"]).open')
			.removeClass("open").children("div").slideUp("fast");
	};*/

	// grouptoggle
	var grouptoggle = function() {
		var $t = $(this);
		$t.filter(":not(.open)").addClass("open").children("div").slideDown("fast");
		$t.siblings(".open").removeClass("open").children("div").slideUp("fast");
	};
	$mm.on("click", ".group-container", grouptoggle).hoverIntent(grouptoggle, ".group-container");

	var filter = $("#filter fieldset"),
		div;
	for(var i = 0; i<gdata.length; i++) {

		div = $('<div id="dg-'+gdata[i].id+'" class="group-container" data-gi="'+i+'">' + 
				'<h4>'+gdata[i].id+'</h4></div>'); //.on("click mouseenter", grouptoggle);
				
		for(var j=0; j<gdata[i].datasets.length; j++) {

			var dateString = gdata[i].datasets[j].dump_date;
			var dateStamp = new Date(parseInt(dateString.substr(0,4)), parseInt(dateString.substr(4,2)) - 1, parseInt(dateString.substr(6,2)));
			var y = dateStamp.getFullYear().toString(),
				m = (dateStamp.getMonth() < 9 ? '0' + (dateStamp.getMonth() + 1) : dateStamp.getMonth() + 1), // increment because getMonth() returns range 0-11
				d = (dateStamp.getDate() < 10 ? '0'+dateStamp.getDate() : dateStamp.getDate().toString());
			dateString = y + '/' + m + '/' + d;
			
			div.append(
				$('<div data-ds="'+j+'" data-tt="'+gdata[i].datasets[j].strings.desc+'" class="tooltip">' +
					gdata[i].datasets[j].strings.label+'<span class="tray">'+dateString+'</span></div>').on("click", fn)
			);
		}
		filter.append(div);
	}

	// property filter interaction
	$mm.on("click", "#filter-props input", function() {
		var i = parseInt($(this).parents(".group-container").attr("data-i")),
			j = parseInt($(this).attr("data-i"));
		filterSel[i][j] = this.checked;
		filterIntegrity();
		genChart();
		genGrid();
	});

	/*$(".controls input[type='range']")
		.on("input", (function() {
			//$(this).siblings("input[type='text']").val(parseFloat($(this).val()).toFixed(1));

			var $t = $(this),
				min = parseFloat($t.attr("min")),
				max = parseFloat($t.attr("max"))-min;
				//val = parseFloat($t.val())-min;

			//var pc = parseFloat((val/max).toFixed(1)) * 10;

			return function() {
				var pc = parseInt((($t.val()-min)/max)*10);
				console.log(pc);
				$(this).attr("class", "valuepc-"+pc);

			}
		})());*/
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
	$("#controls-map input[type=checkbox]").on("change", function() {
		changeTileSrc();
		urlifyState();
	});
	$("#timeline-noglobal").on("change", function() {
		timelineIsGlobal = !this.checked;
		//updateChartData();
		genChart();
		urlifyState();
	});

	$("#main-menu h2").on("click", function() {
		$(this).toggleClass("closed");
		$(this).siblings("fieldset").slideToggle();
	});

	
	/// setup menu
	// toggle extended version
	$("#show-advanced").on("change", function() {
		if(this.checked) {
			$("#main-menu").removeClass("hide-advanced");
		} else {
			$("#main-menu").addClass("hide-advanced");
		}
	});

	// setup menu jumper
	var toggleMenu = function() {
		var $wa = $("#widget-area");
		if($wa.hasClass("open")) {
			$(window).off("click.menufocus");
			var mabo = -($("#main-menu").outerHeight() - $("#menu-launcher").outerHeight());
			$wa.css("margin-bottom", mabo);
		} else {
			$(window).on("click.menufocus", function(e) {
				if($(e.target).parents("#main-menu").length === 0) {
					toggleMenu();
				}
			});
		}
		$wa.toggleClass("open");
	};
	$("#menu-launcher").on("click", toggleMenu); //function() {
		//$("#widget-area").toggleClass("open");
	//});

	/// item table
	var $hoverdesc = $("#item-hover-desc");
	$("#infolist").on("scroll", infolistScroll);
	// hover images TODO very raw
	$("#infolist").hoverIntent({
		over: function() {
			var imgurl = 'https://commons.wikimedia.org/w/thumb.php?f=',
				imgsize = '&w=300',
				qid = $(this).find("a").attr('data-qid');

			var qstr = 'https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=' + qid + '&property=P18&callback=?';

			// https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=Q131234&property=P18
			$hoverdesc.css("bottom", $("#cellinfo").height() - $(this).position().top - $(this).height()/2 - 1);

			

			$.getJSON(qstr, function(data) {

				var img = 'No_image_available.svg';
				if(data.claims.P18 !== undefined) {

					img = data.claims.P18[0].mainsnak.datavalue.value;
				}
				$hoverdesc.html('<img src="' + imgurl + img + imgsize + '" alt="item image" />');
				$hoverdesc.show();
			});
		},
		out: function() {
			$hoverdesc.hide();
		},
		selector: 'tr'
	});

	
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

	// item table click tr > a
	$("#cellinfo tbody").on("click", "tr", function(e) {
		if(!$(e.target).is("a")) {
			$(this).find("a").get(0).click();
		}
	});

	// show ui, qick and dirty
	setTimeout(function() {
		toggleMenu();
		setTimeout(function() {
			$(".init").removeClass("init");
			//toggleMenu();
		}, 100);
	}, 500);
}

/**
* update UI labels etc on dataset change */
function updateUI() {
	var zprop = current_setsel.strings.zprop || T_DEFAULT_ZPROP;
	$("#cellinfo th:last-child").text(zprop);

	$("#dsdesc").html(
		'<h4>Dataset <em>' + 
		//current_setsel.parent.label + '</em> &gt; <em>' + 
		current_setsel.strings.label + '</em></h4>' +
		'<p>' + current_setsel.strings.desc + '</p>');

	var showDsDesc = function() {

	};

	updateFilterUI();
}


function updateFilterUI() {
	if(filterSel !== false || current_datsel.props === undefined) {	return false; }

	filterSel = [];
	var $fieldset = $("#filter-props fieldset"), div,
		props = current_datsel.props.properties,
		labels = current_datsel.props.labels,
		qidMap = {},
		getLabels = true, //(labels.length === 0),
		i,j;

	$fieldset.html("");
	for(i = 1; i < props.length; i++) {
		if(getLabels) { labels[i] = []; }
		filterSel[i] = [];
		div = $('<div id="fg-' + i + '" class="group-container" data-i="'+i+'">' +
				'<h4>' + props[i][0] + '</h4></div>');
		for(j = 1; j < props[i].length; j++) {
			var id = 'fg-'+i+'-'+j;
			if(getLabels) {	
				labels[i][j] = props[i][j];	
				qidMap[props[i][j]] = [i,j];
			}
			div.append(
				$('<div><input type="checkbox" id="'+id+'" data-i="'+j+'" /><label id="'+props[i][j]+'" for="'+id+'"">'+labels[i][j]+'</label></div>')
			);
		}
		$fieldset.append(div);
	}

	if(getLabels) {
		var lang = $("#langsel").val(),
			ids = '', v, k;
		for(i = 1; i<labels.length; i++) {
			for(j = 1; j < labels[i].length; j++) {
				ids += labels[i][j] + '%7C';
			}
		}
		ids = ids.substring(ids, ids.length-3);
		$.getJSON('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=' + ids + 
		'&props=labels&languages='+lang+'&languagefallback=&callback=?', function(data) {
			$.each(data.entities, function() {
				if(this.labels !== undefined) {						// TODO
					if(this.labels[lang] !== undefined) {			// this sanity check is 
						if((v = this.labels[lang].value) !== undefined) {	// probably slightly overkill
							k = qidMap[this.id];
							labels[k[0]][k[1]] = v;
							$fieldset.find("#"+this.id).text(v);
				}	}	}
			});
	    });
	}
	filterIntegrity();
}

function filterString() {
	var s = '', substr, strs,
		ems = '<em class="logicalor">';
	if(filterSel[0] !== true) {
		for(var i = 1; i < filterSel.length; i++) {
			strs = []; 
			substr = '';
			if(filterSel[i][0] !== true) {
				if(s.length > 0) { s += ' <em class="operator">and</em> '; }
				for(var j = 1; j < filterSel[i].length; j++) {
					if(filterSel[i][j] === true) {
						strs.push(current_datsel.props.labels[i][j]);
					}
				}
				for(j=0; j<strs.length-1; j++) { substr += strs[j] + ', ';	}
				
				if(j > 0) { 
					substr = substr.substring(0, substr.length-2) + '</em> <em class="operator">or</em> '+ems; 
				}
				substr += strs[j] + '</em>';
			}
			if(substr.length > 0) { s += '(' + ems + substr + '</em>)'; }
		}
	}
	if(s.length>0) { s += ' '; }
	return s;
}

// TODO selected cell solution
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
	//var setsel = $("#filter input[type='radio']:checked").val();
	var setsel = $("#filter div.selected").attr("data-ds");
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
	if(tl_mode === 'false') {
		timelineIsGlobal = false;
		$("#timeline-noglobal").get(0).checked = true;
	}
	//$("#ctrl-tlmode input[value="+tl_mode+"]").prop("checked", true).trigger("change");
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
	//$("#filter fieldset[data-gid="+dg+"] input").get(ds).click();

	$("#dg-"+dg+">div").get(ds).click();
	attachMapHandlers();
	//return true;
}