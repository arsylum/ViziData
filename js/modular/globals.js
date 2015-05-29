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
var M_BOUNDING_THRESHOLD = 0,	// grid clipping tolerance
	//M_ZOOM_RANGE = [1,8],		// zoom range (results in svg scale 2^(v-1))
	M_BASE_GRIDROWS = 300,		// number of horizontal grid cells
	M_BUBBLE_OFFSET = 10,		// distance of map tooltip from pointer
	M_HOVER_OFFSET = {			// pointer selection offset
		l: 5, 
		t: 5
	};
// color scale
var M_COLOR_SCALE = [	// provided by colorbrewer2.org
	/*'rgb(248,251,207)', // http://colorbrewer2.org/?type=sequential&scheme=YlGnBu&n=9
	'rgb(237,248,177)',
	'rgb(199,233,180)',
	'rgb(127,205,187)',
	'rgb(65,182,196)',
	'rgb(29,145,192)',
	'rgb(34,94,168)',
	'rgb(37,52,148)',
	'rgb(8,29,88)'];*/
	'#ccddff', '#aacc66', '#aa6611', '#800', '#300'],
	M_DEFAULT_TILE_OPACITY = 1, // default visibility of tile layer
	M_DEFAULT_TILE_CONF = 3; // default config tile layer ([2]shape [1]labels)

// "Timeline" (can be almost anything)
var T_YAXIS_MAX_EXPAND = 1.21; // faktor for top margin
	

// timing, responsiveness
var CALC_TIMEOUT = 200; // default timeout before large operations are run

// UI labels
var T_DEFAULT_TOOLTIP = '%l in %x: %v', // default timeline hover tooltip
	T_DEFAULT_ZPROP = '#', // default label for the chart data axis
	L_DEFAULT_TERM = 'between %l and %h'; // default legend suffix

// DATA
var DATA_DIR = "./data/",
	META_FILES = [
		"humans.json",
		"items.json"
	];
var DEFAULT_DATAGROUP = 'humans', // default datagroup 
	DEFAULT_DATASET = 0,	// dataset to load up initially
	DEFAULT_LABELLANG = 'en';// default language for item labels

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
	leafly,		//leaflet map
	bubble,		// popup bubble on map
	zoombh;		// zoomBehavior

var allow_redraw = true, // global genGrid prevention switch
	timelineIsGlobal = 0,
	colorScale, // color scaling function
	mutexGenGrid = 0, // genGrid mutex (0: free, 1: looping, -1: kill loop)
	initComplete = false, // true after initial initialization
	redrawTimer, // genGrid
	chartdatTimer, // updateChartData
	bubbleTimer, // hide map tooltip bubble
	//boundsTimer, // forceBounds
	resizeTimer, // window resize handling
	infolistTimer; // item table scroll handler

var gdata = [],		// global rawdata
	current_datsel,	// slected data group
	current_setsel = {}, // selected dataset
	chartdat = [], // timeline rendering data
	timeSel, // current timeline selection
	cellmap, // latest generated tilemap
	drawdat = {}, // latest generated drawing data
	//filledTiles = [9999], // don't need to draw whats already there [min,max]
	selectedCell = false, // currently selected cell
	renderRTL = false, // flag for progressive tile iteration direction
	resoFactor; // current value of the reso slider


/// positions and dimensions
var viewportH,
	viewportW;

/// leaflet layers
var leafloor,		// tilemap layer
	leaflaggrid,	// grid layer
	//leavlover;		// overlay layer
	overcan, overctx;
// map canvas
var //mapcan,	mapctx,
	//overcan, overctx,
	canvasW,
	canvasH,
	canvasT,
	canvasL;

var //lastTransformState; // remember map scaling (only redraw on changes)
	lastMapCenter, // to determine direction of panning
	lastMapZoom, // keep track if zoom changes
	lastAgPos = [0,0]; // css positioning of aggrid layer


var langCodes = [
'aa',
'ab',
'ace',
'aeb',
'af',
'ak',
'aln',
'als',
'am',
'an',
'ang',
'anp',
'ar',
'arc',
'arn',
'arq',
'ary',
'arz',
'as',
'ast',
'av',
'avk',
'ay',
'az',
'azb',
'ba',
'bar',
'bbc',
'bbc-latn',
'bcc',
'bcl',
'be',
'be-tarask',
'be-x-old',
'bg',
'bh',
'bho',
'bi',
'bjn',
'bm',
'bn',
'bo',
'bpy',
'bqi',
'br',
'brh',
'bs',
'bug',
'bxr',
'ca',
'cbk-zam',
'cdo',
'ce',
'ceb',
'ch',
'cho',
'chr',
'chy',
'ckb',
'co',
'cps',
'cr',
'crh-cyrl',
'crh-latn',
'cs',
'csb',
'cu',
'cv',
'cy',
'da',
'de',
'de-at',
'de-ch',
'de-formal',
'diq',
'dsb',
'dtp',
'dv',
'dz',
'ee',
'egl',
'el',
'eml',
'en',
'en-ca',
'en-gb',
'eo',
'es',
'et',
'eu',
'ext',
'fa',
'ff',
'fi',
'fit',
'fiu-vro',
'fj',
'fo',
'fr',
'frc',
'frp',
'frr',
'fur',
'fy',
'ga',
'gag',
'gan',
'gan-hans',
'gan-hant',
'gd',
'gl',
'glk',
'gn',
'gom-latn',
'got',
'grc',
'gsw',
'gu',
'gv',
'ha',
'hak',
'haw',
'he',
'hi',
'hif',
'hif-latn',
'hil',
'ho',
'hr',
'hrx',
'hsb',
'ht',
'hu',
'hy',
'hz',
'ia',
'id',
'ie',
'ig',
'ii',
'ik',
'ike-cans',
'ike-latn',
'ilo',
'inh',
'io',
'is',
'it',
'iu',
'ja',
'jam',
'jbo',
'jut',
'jv',
'ka',
'kaa',
'kab',
'kbd',
'kbd-cyrl',
'kg',
'khw',
'ki',
'kiu',
'kj',
'kk',
'kk-arab',
'kk-cn',
'kk-cyrl',
'kk-kz',
'kk-latn',
'kk-tr',
'kl',
'km',
'kn',
'ko',
'ko-kp',
'koi',
'kr',
'krc',
'kri',
'krj',
'ks',
'ks-arab',
'ks-deva',
'ksh',
'ku',
'ku-arab',
'ku-latn',
'kv',
'kw',
'ky',
'la',
'lad',
'lb',
'lbe',
'lez',
'lfn',
'lg',
'li',
'lij',
'liv',
'lmo',
'ln',
'lo',
'loz',
'lrc',
'lt',
'ltg',
'lus',
'lv',
'lzh',
'lzz',
'mai',
'map-bms',
'mdf',
'mg',
'mh',
'mhr',
'mi',
'min',
'mk',
'ml',
'mn',
'mo',
'mr',
'mrj',
'ms',
'mt',
'mus',
'mwl',
'my',
'myv',
'mzn',
'na',
'nah',
'nan',
'nap',
'nb',
'nds',
'nds-nl',
'ne',
'new',
'ng',
'niu',
'nl',
'nl-informal',
'nn',
'no',
'nov',
'nrm',
'nso',
'nv',
'ny',
'oc',
'om',
'or',
'os',
'ota',
'pa',
'pag',
'pam',
'pap',
'pcd',
'pdc',
'pdt',
'pfl',
'pi',
'pih',
'pl',
'pms',
'pnb',
'pnt',
'prg',
'ps',
'pt',
'pt-br',
'qu',
'qug',
'rgn',
'rif',
'rm',
'rmy',
'rn',
'ro',
'roa-tara',
'ru',
'rue',
'rup',
'ruq',
'ruq-cyrl',
'ruq-latn',
'rw',
'rwr',
'sa',
'sah',
'sat',
'sc',
'scn',
'sco',
'sd',
'sdc',
'se',
'sei',
'sg',
'sgs',
'sh',
'shi',
'shi-latn',
'shi-tfng',
'si',
'simple',
'sk',
'sl',
'sli',
'sm',
'sma',
'sn',
'so',
'sq',
'sr',
'sr-ec',
'sr-el',
'srn',
'ss',
'st',
'stq',
'su',
'sv',
'sw',
'szl',
'ta',
'tcy',
'te',
'tet',
'tg',
'tg-cyrl',
'tg-latn',
'th',
'ti',
'tk',
'tl',
'tly',
'tn',
'to',
'tokipona',
'tpi',
'tr',
'tru',
'ts',
'tt',
'tt-cyrl',
'tt-latn',
'tum',
'tw',
'ty',
'tyv',
'udm',
'ug',
'ug-arab',
'ug-latn',
'uk',
'ur',
'uz',
've',
'vec',
'vep',
'vi',
'vls',
'vmf',
'vo',
'vot',
'vro',
'wa',
'war',
'wo',
'wuu',
'xal',
'xh',
'xmf',
'yi',
'yo',
'yue',
'za',
'zea',
'zh',
'zh-cn',
'zh-hans',
'zh-hant',
'zh-hk',
'zh-min-nan',
'zh-mo',
'zh-my',
'zh-sg',
'zh-tw',
'zu'];
//_____________
/// global vars
///////////////