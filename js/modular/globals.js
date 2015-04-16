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
	M_BUBBLE_OFFSET = 10,		// distance of map tooltip from pointer
	M_HOVER_OFFSET = {			// pointer selection offset
		l: 0, 
		t: 0
	};

// DATA
var DATA_DIR = "./data/",
	META_FILES = [
		"humans.json",
		//"any.json"
	];
var DEFAULT_DATASET = 0;	// dataset to load up initially

var	//ARR_UNDEFINED = null,	// undefined value
	ARR_M_LON = 0,			// longitude
	ARR_M_LAT = 1,			// latitude
	ARR_M_I = 2;			// ref to prop

var TPI = Math.PI * 2;
///_________________
/// pseudo constants
////////////////////

///////////////
/// global vars
//^^^^^^^^^^^^^
var chart,		// Timeline / dataLine
	summary, 	// summary component of timeline (interaction leader)
	//plotlayer,  // plot drawing layer (<g>)
	bubble,		// popup bubble on map
	zoombh;		// zoomBehavior

var allow_redraw = true,
	colorize = false, //true,
	currentGenGrid = 0, // genGrid cancelation with newer calls
	redrawTimer, // genGrid
	bubbleTimer, // hide map tooltip bubble
	boundsTimer, // forceBounds
	resizeTimer, // window resize handling
	infolistTimer; // item table scroll handler

var gdata = [],		// global rawdata
	current_datsel,	// slected data group
	current_setsel,	// selected dataset
	chartdat = [], // timeline rendering data
	timeSel, // current timeline selection
	cellmap, // latest generated tilemap
	drawdat, // latest generated drawing data
	selectedCell = false, // currently selected cell
	renderRTL = false, // flag for tile iteration direction
	resoFactor; // current value of the reso slider


/// positions and dimensions
var viewportH,
	viewportW;

// map canvas
var mapcan,	mapctx,
	overcan, overctx,
	canvasW,
	canvasH,
	canvasT,
	canvasL;

var lastTransformState; // remember map scaling (only redraw on changes)
//_____________
/// global vars
///////////////