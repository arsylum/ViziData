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
				console.log("|WARNING| discarded unrecognized parameter '"+ hash[i].substring(0,1) + "' in url pattern");
		}
	}

	zoombh.scale(lastTransformState.scale);
	zoombh.translate(lastTransformState.translate);

	if($("#filter input").get(ds) === undefined) { return false; }
	$("#filter input")[ds].click();
	return true;
}

/**
 * SVG export*/
function exportSvg() {
	$("#export").attr("disabled", "disabled");

    var iframe = $('<iframe>',{css:{display:'none'}})
		.appendTo('body');

    var formHTML = '<form action="" method="post">'+
        '<input type="hidden" name="filename" />'+
        '<input type="hidden" name="content" />'+
        '</form>';

    var body = iframe.prop('contentDocument').body;
    /* don't care about IE
    (iframe.prop('contentDocument') !== undefined) ?
		iframe.prop('contentDocument').body :
        iframe.prop('document').body;	// IE*/
    $(body).html(formHTML);

    var form = $(body).find('form');
    form.attr('action',"export.php");
    form.find('input[name=filename]').val("dataPlot.svg");
    form.find('input[name=content]').val($("#map").html());

    // Submitting the form to export.php. This will
    // cause the file download dialog box to appear.
    form.submit();
}