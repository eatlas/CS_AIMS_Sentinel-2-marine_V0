// Copyright 2021 Eric Lawrey - Australian Institute of Marine Science
// MIT License https://mit-license.org/

// This script is written to run on the Google Earth Engine.
//
// This script allows the user to browse through the image catalog to
// manually select the clearest images available. These can then be
// collated into a collection for subsequent processing.
// The IDs of the images at each step can be found in the console.


// Used to find the geometry of the selected images. For more info checkout
// https://eatlas.org.au/data/uuid/f7468d15-12be-4e3f-a246-b2882a324f59
var s2Tiles = ee.FeatureCollection("users/ericlawrey/World_ESA_Sentinel-2-tiling-grid");

// === README: Change the path to your local copy of the utils code ====
// The path to the util code must be an absolute path including the
// username and repository
var utils = require('users/ericlawrey/CS_AIMS_Sentinel2-marine_V0:utils');
 
// Date range to iterate through the Sentinel 2 imagery.
var START_DATE = ee.Date('2015-01-01');
var END_DATE = ee.Date('2021-09-20');

// Maximum cloud cover to include the image. Setting a low value removes
// images that have lots of cloud that will probably not be useful for
// subsequent processing. 
// In most areas setting this to 1 (%) means that about 30 - 50% of the
// images are useful for generating final composite images. 
// In some areas where there are very few images available. In which case
// this can be raised up to 100 (%) to allow previewing of all available
// imagery.
var CLOUDY_PIXEL_PERCENTAGE = 1;

// If true then images that are only a small fraction of the tile are
// removed. This is useful in some areas where there are both useful
// full tile images (the preferred images) mixed in with lots of 
// small tile fragments. Typically the fragments are less likely to
// have cloud (due to gaps) and so they slow down the image selection
// process.
// Set this to false if the tile correspond to an area where you need
// to get imagery for a small fragment.
var REMOVE_SMALL_IMAGES = false;

// Select the Sentinel 2 tiling grid to review the images for.
// Use the map link below to find the tileID for the area of interest.
// https://maps.eatlas.org.au/index.html?intro=false&z=7&ll=146.90137,-19.07287&l0=ea_ref%3AWorld_ESA_Sentinel-2-tiling-grid_Poly,ea_ea-be%3AWorld_Bright-Earth-e-Atlas-basemap,google_SATELLITE&v0=,,f
var tileID;

// This script only processes one tileID. Uncomment the tileID of the area under investigation.
// Normally the process is to select the best images to use for subsequent processing
// for each tile. Ensure that only one tileID is set then progressively record the Google Earth
// image IDs of the best images. This can then be copied into 03-create-composite.
// It typically takes 30 - 60 mins to preview all the images for a tile area (due to the limited
// processing speed of the Google Earth Engine.)
//
// Note the tile selection and the matching reefs in each tile were determined using:
//  - Sentinel 2 UTM Tiling Grid https://eatlas.org.au/data/uuid/f7468d15-12be-4e3f-a246-b2882a324f59
//  - Coral Sea geomorphic features (JCU) https://eatlas.org.au/data/uuid/25685ba5-6583-494f-974d-cce2f3429b78
// These were combined in 01-sentinel2-tile-selection map.
// The comments for the tileID of 'Far North', 'North', 'Central', and 'South' represent latitudinal
// regions in the Coral Sea. They are not based on any offical classification.
// Where a reef has been split across multiple tiles then which section of the reef is
// on the tile is indicated in brackets after the reef name.

//tileID = '55LBK';     // Boot Reef, Portlock Reefs (Coral Sea) - Far North
//tileID = '54LZP';     // Ashmore Reef (Coral Sea) - Far North
//tileID = '55LDE';     // Osprey Reef (Coral Sea) - North
//tileID = '55LEC';     // Bougainville Reef (Coral Sea) - Central
//tileID = '55LGC';     // Diane Bank (Coral Sea) - Central
//tileID = '55LHC';     // Willis Islets (Coral Sea) - Central
//tileID = '55KEB';     // Holmes Reefs (West), Flora Reef, McDermott Bank (Coral Sea) - Central
//tileID = '55KFB';     // Holmes Reefs (East) (Coral Sea) - Central
//tileID = '55KGB';     // Herald Cays, Willis Islets, Magdelaine Cays (West) (Coral Sea) - Central
//tileID = '55KHB';     // Magdelaine Cays, Coringa Islet (East), U/N reef (Coral Sea) - Central
//tileID = '56KLG';     // North Lihou Reef (Coral Sea, Australia) - Central
                        // (Boundaries: 25, Dry Reefs: 15, Cays/Islands: 6 )
//tileID = '56KMG';     // North East Lihou Reef tip (Coral Sea, Australia) - Central
tileID = '55KFA';     // Flinders, Dart Heralds Surprise (Coral Sea) - Central
//tileID = '55KGA';     // Malay Reef, Magdelaine Cays, Coringa Islet (South), Abington Reef, 
                        // U/N Reef (Coral Sea) - Central
//tileID = '55KHA';     // Tregrosse Reefs, Diamond Islet West, Magdelaine Cays, Coringa Islet (South) 
                        // (Coral Sea) - Central
//tileID = '56KKF';     // Tregrosse Reefs, Diamond Islet (Coral Sea) - Central
//tileID = '56KLF';     // (V0) Lihou reef (South West) (Coral Sea, Australia) - Central
//tileID = '56KMF';     // Lihou reef (West) (Coral Sea, Australia) - Central
//tileID = '56KQF';     // Mellish Reef (Coral Sea) - Central
                        // This tile only had 2 images with < 1% cloud cover,
                        // neither of them were useful.
                        // Raising the threshold to 3% only gave 5 images, none
                        // of which were useful. We therefore instead use the neighbouring
                        // tile to pick up Mellish Reef.
//tileID = '56KRF';     // Mellish Reef (Coral Sea) - Central
                        // Raising the CLOUDY_PIXEL_PERCENTAGE to 10% still
                        // only resulted in 6 images. All of which were used.
//tileID = '56KME';     // (V0) Marion Reef (North) (Coral Sea, Australia) - Central
//tileID = '56KMD';     // (V0) Marion Reef (South) (Coral Sea, Australia) - Central
//tileID = '56KPC';     // Calder Bank, Coral Sea - South
//tileID = '56KNB';     // Saumarez Reefs (North) (Coral Sea, Australia) - South
//tileID = '56KPB';     // (V0) Frederick Reef (Coral Sea, Australia) - South
//tileID = '56KQB';     // Kenn Reefs (Coral Sea) - South
//tileID = '56KNA';     // Saumarez Reefs (South) (Coral Sea) - South
//tileID = '56KQA';     // Wreck Reefs (Coral Sea) - South
//tileID = '56KQV';     // Cato Reef (Coral Sea) - South
//tileID = '55LCJ';     // Eastern Fields (PNG) - Far North (Just ouside Coral Sea Marine Park)


// Sea mounts that probably don't have reefs.
//tileID = '56KQU';     // Fraser Seamount - South
//tileID = '56KQE';     // U/N Sea mount - Central AUS04634 - 29 m feature in marine chart 
                      // Only partial image scenes. 16 images, but none with clear
                      // view over reef area.
//tileID = '57KTS';   // Selfridge Rock (https://web.archive.org/web/20130305015208/http://www.shom.fr/fileadmin/data-www/01-LE_SHOM/02-ACTUALITES/01-LES_COMMUNIQUES/fig_2_-_Sandy_Island.png)
                    // Only one image and it has high cloud cover
//tileID = '57KUS';   // Selfridge Rock 2 images but neither are useful.
//tileID = '56KRB';   // Obstn Rep (1962) AUS04643 - only 1 image covered in clouds

//tileID = '56KKG';   // Magdelaine Cays, Coringa Islet (Coral Sea, Australia) (Boundaries: 8, Dry Reefs: 2, Cays/Islands: 2 )


// Potential shallow areas in Eastern Coral Sea
// These areas were identified as having potentially shallow areas based
// on the SRTM30-plus v8.0 dataset. 
//tileID = '57KXT';   
//tileID = '57KYT';       // Lansdowne Bank (potential 29 m Obstn)
//tileID = '57KYS';
//tileID = '57KZS';
//tileID = '57KXS';
//tileID = '57KWP';
//tileID = '57JWN';

// ------------- Global test reefs --------------
// Reefs around the world for testing the definition of reef boundaries

// Drowned coral atoll reefs because of subsidence 
//tileID = '56NLP';   // Federated States of Micronesia
//tileID = '55PHK';   // Federated States of Micronesia

// Near surface drowned continental areas
//tileID = '41LMJ';   // Saya de Malha Banks (1 image, not much vis)
//tileID = '41LLJ';   // Saya de Malha Banks (6 images, 2 usable images)
//tileID = '41LLK';   // Saya de Malha Banks 

//tileID = '57KVV';   // Chesterfield Reefs
//tileID = '57KVU';   // Chesterfield Reefs
//tileID = '57KVT';   // Chesterfield Reefs
//tileID = '57KVS';   // Chesterfield Reefs
//tileID = '57KWS';   // Chesterfield Reefs
//tileID = '57KWR';   // Chesterfield Reefs


// Find the feature that corresponds to the specified tileID.
// Filter to Australia. This is to reduce the number of tiles that need 
// to be searched.
//var ausTropicsTiles = s2Tiles.filterBounds(ee.Geometry.BBox(109, -33, 165, -7));
//var tileFeature = ausTropicsTiles.filter(ee.Filter.equals('Name', tileID));
var tileFeature = s2Tiles.filter(ee.Filter.equals('Name', tileID));


// =================================================================
//                         Functions
// =================================================================

// Sets the image in the Google Earth Engine interface to the
// specified date. This is called as part of clicking the next and
// previous buttons.
var setImageByDate = function(date) {
  var startDate = ee.Date(date).advance(-1,'day');
  var endDate = ee.Date(date).advance(+1,'day');

  var imagesFiltered = images.filter(ee.Filter.date(startDate,endDate));
  var IDs = imagesFiltered.aggregate_array('system:id');
  // Print the IDs to the console so the user can copy them if the
  // image is a good one.
  print(IDs);


  // Don't perform the cloud removal because this is computationally
  // expensive and significantly slows down the calculation of the images.
  var visParams = {'min': 0, 'max': 1, 'gamma': 1};
  var composite = imagesFiltered
    .map(utils.removeSunGlint)
    .reduce(ee.Reducer.percentile([50],["p50"]))
    .rename(['B1','B2','B3','B4','B5','B6','B7','B8',
      'B8A','B9','B10','B11','B12','QA10','QA20','QA60']);
  var includeCloudmask = false;
  
  Map.layers().reset();
  var trueColour_composite = utils.bake_s2_colour_grading(composite, 'TrueColour', includeCloudmask);
  Map.addLayer(trueColour_composite, visParams, 'Sentinel-2 True Colour',false);
  
  var deepMarine_composite = utils.bake_s2_colour_grading(composite, 'DeepMarine', includeCloudmask);
  Map.addLayer(deepMarine_composite, visParams, 'Sentinel-2 Deep Marine',false);

  var reefTop_composite = utils.bake_s2_colour_grading(composite, 'ReefTop', includeCloudmask);
  Map.addLayer(reefTop_composite, visParams, 'Sentinel-2 ReefTop',false);
  
  var shallow_composite = utils.bake_s2_colour_grading(composite, 'Shallow', includeCloudmask);
  Map.addLayer(shallow_composite, visParams, 'Sentinel-2 Shallow',false);
  
  Map.addLayer(deepMarine_composite.select('vis-blue'), visParams, 'Sentinel-2 Deep Marine vis-blue',false);
  Map.addLayer(deepMarine_composite.select('vis-green'), visParams, 'Sentinel-2 Deep Marine vis-green',false);
  Map.addLayer(deepMarine_composite.select('vis-red'), visParams, 'Sentinel-2 Deep Marine vis-red',false);
  var deepFalse_composite = utils.bake_s2_colour_grading(composite, 'DeepFalse', includeCloudmask);
  Map.addLayer(deepFalse_composite, visParams, 'Sentinel-2 DeefFalse',true);
  
  Map.addLayer(composite.select("B2"), {'min': 650, 'max': 1500, 'gamma': 2}, 'Sentinel-2 B2 raw',false);
  Map.addLayer(composite.select("B8"), {'min': 0, 'max': 1500, 'gamma': 2}, 'Sentinel-2 B8 raw',false);
  Map.addLayer(composite.select("B11"), {'min': 0, 'max': 1500, 'gamma': 2}, 'Sentinel-2 B11 raw',false);
  
  var raw_composite = imagesFiltered.reduce(ee.Reducer.mean());
  Map.addLayer(raw_composite, {
      bands: ['B4_mean', 'B3_mean', 'B2_mean'],
      min: [130, 200, 500],
      max: [1700, 1900, 2000],
      gamma: [2, 2, 2]
    }, 'Sentinel-2 Raw',false);

};


// ======================================================================
//                             Main code
// ======================================================================

// Find all the images that correspond to the specied tile that are in the
// date range and with a suitable cloud cover.
var images = ee.ImageCollection('COPERNICUS/S2')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CLOUDY_PIXEL_PERCENTAGE))
    .filter(ee.Filter.gt('system:asset_size', 500E6))  // Remove small fragments of tiles
    .filterDate(START_DATE, END_DATE)
    .filter(ee.Filter.inList('MGRS_TILE', ee.List([tileID])));

if (REMOVE_SMALL_IMAGES) {
  images = images.filter(ee.Filter.gt('system:asset_size', 500E6));  // Remove small fragments of tiles
}

// Find all the dates of the images images in the collection. Do this so we can
// set through the dates when reviewing the images.
// From https://gis.stackexchange.com/questions/307115/earth-engine-get-dates-from-imagecollection
var dates = images
    .map(function(image) {
      return ee.Feature(null, {'date': image.date().format('YYYY-MM-dd')});
    })
    .distinct('date')
    .aggregate_array('date');

print(dates);

// Zoom to our tile of interest.
Map.centerObject(tileFeature, 9);


// Sets up next and previous buttons used to navigate through previews of the
// images in the collection.
var prevButton = new ui.Button('Previous', null, false, {margin: '0 auto 0 0'});
var nextButton = new ui.Button('Next', null, false, {margin: '0 0 0 auto'});
var buttonPanel = new ui.Panel(
    [prevButton, nextButton],
    ui.Panel.Layout.Flow('horizontal'));
    
// Build the thumbnail display panel
var introPanel = ui.Panel([
  ui.Label({
    value: 'Find images',
    style: {fontWeight: 'bold', fontSize: '24px', margin: '10px 5px'}
  }),
  ui.Label('IDs are listed in Console. Copy and paste the good ones.')
]);


// Setup the user interface
var dateLabel = ui.Label({style: {margin: '2px 0'}});
var progressLabel = ui.Label({style: {margin: '2px 0'}});
var idLabel = ui.Label({style: {margin: '2px 0'}});
var mainPanel = ui.Panel({
  //widgets: [introPanel, imagePanel, idLabel, dateLabel, progressLabel, buttonPanel,],
  widgets: [introPanel, idLabel, dateLabel, progressLabel, buttonPanel,],
  style: {position: 'bottom-left', width: '340px'}
});
Map.add(mainPanel);



var selectedIndex = 0;
var collectionLength = 0;
// Get the total number of images asynchronously, so we know how far to step.
// This async process because we want the value on the client but the size
// is a server side value.
dates.size().evaluate(function(length) {
  collectionLength = length;
  updateUI();
});


var updateUI = function() {
  dates.get(selectedIndex).evaluate(function(date) {
    dateLabel.setValue('Date: ' + date);
  });
  progressLabel.setValue('index: '+(selectedIndex+1)+' of '+(collectionLength));
  setImageByDate(dates.get(selectedIndex));
  nextButton.setDisabled(selectedIndex >= collectionLength - 1);
  prevButton.setDisabled(selectedIndex <= 0);
};

// Gets the index of the next/previous image in the collection and sets the
// thumbnail to that image.  Disables the appropriate button when we hit an end.
var setImage = function(button, increment) {
  if (button.getDisabled()) return;
  //setImageByIndex(selectedIndex += increment);
  selectedIndex += increment;
  updateUI();
};

// Set up the next and previous buttons.
prevButton.onClick(function(button) { setImage(button, -1); });
nextButton.onClick(function(button) { setImage(button, 1); });
