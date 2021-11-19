// Copyright 2021 Eric Lawrey - Australian Institute of Marine Science
// MIT License https://mit-license.org/

// This script is written to run on the Google Earth Engine 
//
// Use this script to export individual Sentinel 2 images.

var utils = require('users/ericlawrey/CS_AIMS_Sentinel2-marine_V0:utils');

// These are the options for the exports
var REF1_OPTIONS = {
  colourGrades: ['DeepMarine', 'Shallow'],
  exportBasename: 'AU_AIMS_Sentinel2-marine',
  exportFolder: 'EarthEngine/AU_AIMS_Sentinel2-marine',
  scale: 10
};

// Torres Strait - Saibai
utils.s2_composite_display_and_export(
  [ "COPERNICUS/S2/20151117T004742_20170102T064132_T54LXQ"], // Clear water shows reef structure
  true, true, REF1_OPTIONS);
  
utils.s2_composite_display_and_export(
  [ "COPERNICUS/S2/20180917T004659_20180917T004657_T54LXQ"],  // Low tide - shows cay
  true, true, REF1_OPTIONS);
