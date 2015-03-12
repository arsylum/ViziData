////////////////////
/// global scope ///
////////////////////

////////////////////
/// pseudo constants
//^^^^^^^^^^^^^^^^^^
// coord parameters
var C_WMIN = -180,
	C_WMAX = 180,
	C_HMIN = -90,
	C_HMAX = 90,

	C_W = C_WMAX-C_WMIN,
	C_H = C_HMAX-C_HMIN;

// map parameters
var M_BOUNDING_THRESHOLD = 10,	// grid clipping tolerance
	M_ZOOM_RANGE = [1,8],		// zoom range (results in svg scale 2^(v-1))
	M_BUBBLE_OFFSET = 5;		// distance of map tooltip from pointer

// DATA
var DATA_DIR = "./data/",
	META_FILES = [
		"humans.json" 
	];
var DEFAULT_DATASET = 0;	// dataset to load up initially

var	ARR_UNDEFINED = null,	// undefined value
	ARR_M_LON = 0,			// longitude
	ARR_M_LAT = 1,			// latitude
	ARR_M_I = 2;			// ref to prop
///_________________
/// pseudo constants
////////////////////

///////////////
/// global vars
//^^^^^^^^^^^^^
var chart,		// Timeline / dataLine
	//plotlayer,  // plot drawing layer (<g>)
	bubble,		// popup bubble on map
	zoombh;		// zoomBehavior

var allow_redraw = true,
	colorize = true,
	redrawTimer, // genGrid
	bubbleTimer, // hide map tooltip bubble
	boundsTimer, // forceBounds
	resizeTimeout; // window resize handling

var gdata = [],		// global rawdata
	current_datsel,	// slected data group
	current_setsel,	// selected dataset
	cellmap, // latest generated tilemap;
	drawdat; // latest generated drawing dataset
	
var viewportH,
	viewportW;

var lastTransformState; // remember map scaling (only redraw on changes)

// canvas
var canvas,
	ctx,
	canvasW,
	canvasH,
	canvasT,
	canvasL;
//_____________
/// global vars
///////////////