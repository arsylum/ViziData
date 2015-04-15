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

	$("#controls input[type='range']")
		.on("input", function() {
			$(this).parent().next("input[type='text']").val(parseFloat($(this).val()).toFixed(1));
		});
	$("#zoom-slider").on("change", function() {
		transitTo(getZoomTransform($(this).val()));
	});
	$("#reso-slider").on("change", function() {
		resoFactor = parseFloat($(this).val());
		genGrid();
	});


	$(window).resize(function() {
		viewportW = $(this).width();
		viewportH = $(this).height();
	});

	$("#export").click(function() {
		$(this).attr("disabled","disabled");
		exportSvg();
	});


	// label language
	// TODO get full list from..where?
	var langs = ["en", "de"];
	for(i = 0; i<langs.length; i++) {
		$("#langsel").append($('<option value="'+langs[i]+'">'+
			langs[i]+'</option>'));
	}
	$("#langsel").on("change", function() {
		$("#infolist a").addClass("q");
		$("#infolist").trigger("scroll");
	});
}

/**
* encodes current state of viz into url to make it shareable*/
function urlifyState() {
	// TODO selected cells are note encoded yet
	// TODO properly encode selcted dataset (depends on data management module)
	var setsel = $("#filter input[type='radio']:checked").val();
	var hash = "d="+setsel;
	hash += "&t=" + lastTransformState.translate[0] + "_" + lastTransformState.translate[1] + "&s=" + lastTransformState.scale;
	window.location.hash = hash;
}

/**
* restore the url encoded viz state */
function statifyUrl() {
	var hash = window.location.hash;
	if (hash === "") { return false; }

	var ds = 0;
	hash = hash.substring(1).split("&");
	for(var i= 0; i<hash.length; ++i) {
		var key = hash[i].substring(0,1);
		var val = hash[i].substring(2);
		switch(key) {
			case "d":
				ds = parseInt(val);
				break;
			case "t":
				var t = val.split("_");
				lastTransformState.translate = [parseFloat(t[0]),parseFloat(t[1])];
				break;
			case "s":
				lastTransformState.scale = parseFloat(val);
				break;
			default:
				console.warn("statifyUrl(): discarded unrecognized parameter '"+ hash[i].substring(0,1) + "' in url pattern");
		}
	}

	zoombh.scale(lastTransformState.scale);
	zoombh.translate(lastTransformState.translate);

	if($("#filter input").get(ds) === undefined) { return false; }
	$("#filter input")[ds].click();
	return true;
}