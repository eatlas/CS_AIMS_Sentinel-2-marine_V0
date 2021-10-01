// Copyright 2021 Eric Lawrey - Australian Institute of Marine Science
// MIT License https://mit-license.org/

// This script is written to run on the Google Earth Engine at 
// https://code.earthengine.google.com/8381c7f6846e4460a5271dd8469896ae
//
// Use this script to browse through a specific set of Sentinel 2
// images. This can be used to fine tune the selection of images obtained
// using the 01-select-best-sentinel2-images script. This saves having to
// step through all the non relevant images.

var utils = require('users/ericlawrey/CS_AIMS_Sentinel2-marine_V0:utils');

var IMAGE_IDS = 
  [
//"COPERNICUS/S2/20180813T004711_20180813T004705_T54LZP",
//"COPERNICUS/S2/20160903T002102_20160903T032316_T55LGC"
 "COPERNICUS/S2/20161215T003032_20161215T003028_T55LDE"
 //"COPERNICUS/S2/20160827T002712_20160827T051759_T55KDU",
 //"COPERNICUS/S2/20200727T002711_20200727T002713_T55KDU", //1 Low tide
//		"COPERNICUS/S2/20200816T002711_20200816T002713_T55KDU" //2
//"COPERNICUS/S2/20180812T002659_20180812T002702_T55LEC",
//		"COPERNICUS/S2/20200822T004711_20200822T004712_T54LZP",
//		"COPERNICUS/S2/20210603T004709_20210603T004707_T54LZP"
  ];

var tilesGeometry = utils.get_s2_tiles_geometry(IMAGE_IDS, ee.Geometry.BBox(109, -33, 158, -7));

var s2_cloud_collection = utils.get_s2_cloud_collection(IMAGE_IDS, tilesGeometry);

// Zoom to our tile of interest.
Map.centerObject(tilesGeometry, 9);

// Adjust the collection of images
var collection = s2_cloud_collection;
  //.map(utils.removeSunGlint);

var listOfImage = collection.toList(collection.size());

// Sets up next and previous buttons used to navigate through previews of the
// images in the collection.
var prevButton = new ui.Button('Previous', null, true, {margin: '0 auto 0 0'});
var nextButton = new ui.Button('Next', null, true, {margin: '0 0 0 auto'});
var buttonPanel = new ui.Panel(
    [prevButton, nextButton],
    ui.Panel.Layout.Flow('horizontal'));
    
// Build the display panel
var introPanel = ui.Panel([
  ui.Label({
    value: 'Browse images',
    style: {fontWeight: 'bold', fontSize: '24px', margin: '10px 5px'}
  }),
  //ui.Label('')
]);

// Setup the user interface
var progressLabel = ui.Label({style: {margin: '2px 0'}});
var idLabel = ui.Label({style: {margin: '2px 0'}});
var mainPanel = ui.Panel({
  widgets: [introPanel, idLabel, progressLabel, buttonPanel,],
  style: {position: 'bottom-left', width: '340px'}
});
Map.add(mainPanel);


var selectedIndex = 0;
var collectionLength = 0;
// Get the total number of images asynchronously, so we know how far to step.
// This async process because we want the value on the client but the size
// is a server side value.
listOfImage.size().evaluate(function(length) {
  collectionLength = length;
  updateUI();
});


var updateUI = function() {

  progressLabel.setValue('Image: '+(selectedIndex+1)+' of '+(collectionLength));


  var image = ee.Image(listOfImage.get(selectedIndex));
  // Don't perform the cloud removal because this is computationally
  // expensive and significantly slows down the calculation of the images.
  var visParams = {'min': 0, 'max': 1, 'gamma': 1};
  var composite = utils.removeSunGlint(image)
    .rename(['B1','B2','B3','B4','B5','B6','B7','B8',
      'B8A','B9','B10','B11','B12','QA10','QA20','QA60']);
  var includeCloudmask = false;
  
  Map.layers().reset();
  var trueColour_composite = utils.bake_s2_colour_grading(composite, 'TrueColour', includeCloudmask);
  Map.addLayer(trueColour_composite, visParams, 'Sentinel-2 True Colour',false);
  
  var deepMarine_composite = utils.bake_s2_colour_grading(composite, 'DeepMarine', includeCloudmask);
  Map.addLayer(deepMarine_composite, visParams, 'Sentinel-2 Deep Marine',true);

  var reefTop_composite = utils.bake_s2_colour_grading(composite, 'ReefTop', includeCloudmask);
  Map.addLayer(reefTop_composite, visParams, 'Sentinel-2 ReefTop',false);

  //var deepMarine2_composite = utils.bake_s2_colour_grading(composite, 'TrueColourA', includeCloudmask);
  //print(deepMarine_composite);
  //print(deepMarine2_composite);
  
  //Map.addLayer(deepMarine2_composite, visParams, 'Sentinel-2 Deep Marine2',true);
  
  var shallow_composite = utils.bake_s2_colour_grading(composite, 'Shallow', includeCloudmask);
  Map.addLayer(shallow_composite, visParams, 'Sentinel-2 Shallow',false);

  Map.addLayer(deepMarine_composite.select('vis-blue'), visParams, 'Sentinel-2 Deep Marine vis-blue',false);
  Map.addLayer(deepMarine_composite.select('vis-green'), visParams, 'Sentinel-2 Deep Marine vis-green',false);
  Map.addLayer(deepMarine_composite.select('vis-red'), visParams, 'Sentinel-2 Deep Marine vis-red',false);
  Map.addLayer(composite.select("B1"), {'min': 1100, 'max': 1500, 'gamma': 2}, 'Sentinel-2 B1 after glint removal',false);
  Map.addLayer(composite.select("B2"), {'min': 650, 'max': 1500, 'gamma': 2}, 'Sentinel-2 B2 after glint removal',false);
  Map.addLayer(composite.select("B4"), {'min': 0, 'max': 1500, 'gamma': 2}, 'Sentinel-2 B4 after glint removal',false);
  Map.addLayer(composite.select("B5"), {'min': 0, 'max': 1500, 'gamma': 2}, 'Sentinel-2 B5 raw',false);
  Map.addLayer(composite.select("B8"), {'min': 0, 'max': 1500, 'gamma': 2}, 'Sentinel-2 B8 raw',false);
  Map.addLayer(composite.select("B11"), {'min': 0, 'max': 1500, 'gamma': 2}, 'Sentinel-2 B11 raw',false);
  Map.addLayer(image, {
      bands: ['B4', 'B3', 'B2'],
      min: [130, 200, 500],
      max: [1700, 1900, 2000],
      gamma: [2, 2, 2]
    }, 'Sentinel-2 Raw',false);

  

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

//updateUI();
