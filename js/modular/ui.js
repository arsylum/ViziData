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

	$("#controls input[type=\"range\"]")
		.on("input", function() {
			$(this).parent().next("input[type=\"text\"").val(parseFloat($(this).val()).toFixed(1));
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