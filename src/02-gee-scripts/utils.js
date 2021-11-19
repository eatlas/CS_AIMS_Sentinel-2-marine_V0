/**
 * Creates a composite Sentinel2 image from the specified set of image IDs, 
 * and applies the specified colourGrading to the image, creating, displaying
 * and exporting an image for each colourGrade.
 * 
 * The composite image removes sunglint and uses cloud masking to produce
 * a composite that is optimised for studying marine features.
 * 
 * The imageIds to use can be compiled using the 01-select-best-sentinel2-images
 * script.
 * 
 * The is_display and is_export options can be used to indicate the actions
 * to be performed. Set these to false after you have finished working on a
 * tile to stop the script wasting time on generating products that are already
 * complete.
 * 
 * @param {String[]} imageIds -     Google Earth image IDs of Sentinel 2 images to merge into 
 *                                  a composite.
 * @param {boolean} is_display -    If true then add the composite and its cloud mask to the 
 *                                  map. Use this for previewing prior to performing exports.
 * @param {boolean} is_export -     If true then generate exports of the image
 * @param {object} options -        Map of optional parameters listed below. Typical example: 
 *                                  var OPTIONS = {
 *                                    colourGrades: ['TrueColour','DeepFalse'],
 *                                    exportBasename: 'AU_AIMS_Sentinel2-marine_V1',
 *                                    exportFolder: 'EarthEngine\\AU_AIMS_Sentinel2-marine_V1',
 *                                    scale: 10
 *                                  };
 *        [{string}] colourGrades - Array of names of colourGrades to apply to the image and
 *                                  prepare for exporting. The allowable styles correspond to
 *                                  those supported by bake_s2_colour_grading(). These are:
 *                                  'TrueColour', 'DeepMarine', 'DeepFalse' , 'DeepFeature', 
 *                                  'Shallow', 'ReefTop' 
 *        {string} exportBasename - Base name of the export image file. The colourGrade
 *                                  and the image Sentinel tile IDs are appended to the
 *                                  image name. This approach is most appropriate for
 *                                  exporting images that are from a single Sentinel 2
 *                                  tile as exporting from multiple tile will potentially
 *                                  make the file names lengthy.
 *                                  exportBasename_{colourGrade}_{list of Sentinel tile IDs}_
 *                                  {date range}-n{number of images}
 *        {string} exportFolder -   Folder in Google Drive to export the image to. The colourGrade
 *                                  is appended to the folder to file tiles based on colourGrades.
 *        {integer} scale -         Default scale to apply to the exports in metres. For Sentinel 2
 *                                  full resolution exports would be 10. Set scale higher if you
 *                                  wish to lower the resolution of the export. It is probably
 *                                  wise to keep it a ratio of the native image resolution of 10 m
 *                                  for best quality, noting I have not tested this theory.
 */
exports.s2_composite_display_and_export = function(
    imageIds, is_display, is_export, options) {
  
  var colourGrades = options.colourGrades;
  var exportFolder = options.exportFolder;
  var exportBasename = options.exportBasename;
  
  
  
  // Skip over if nothing to do
  if (!(is_export || is_display)) {
    return;
  }
  // Extract this from the imageIds.
  // Convert:
  
  // Determine the set of Sentinel 2 UTM tiles that are being composed together.
  // Use this set to create part of the final file name.
  // "COPERNICUS/S2/20170812T003031_20170812T003034_T55KDV"
  // To:
  // "55KDV"
  var utmTiles = imageIds.map(function(id) {
    // Find the position of the characters just before the UTM
    // tile in the Sentinel-2 IDs. 
    var n = id.lastIndexOf("_T")+2;
    return id.substr(n);
  });
  
  // Remove duplicates in the tileIds. 
  // Modified from 
  // https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
  var seen = {};
  var uniqueUtmTiles = utmTiles.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
  
  var utmTilesString = uniqueUtmTiles.join('-');
  
  // Get the years and months of the images in the composite to
  // generate a date range to put in the filename
  // COPERNICUS/S2/20170812T003031_20170812T003034_T55KDV"
  // To:
  // "201708"
  var tileDates = imageIds.map(function(id) {
    // Find the position of the characters just after S2/
    // tile in the Sentinel-2 IDs. 
    var n = id.lastIndexOf("S2/")+3;
    return id.substr(n,6);
  });
  
  var dateRangeStr;
  
  // This works because the date strings are in yyyymm format
  var datesInOrder = tileDates.sort();
  
  if (tileDates.length === 1) {
    // Just use the one date in the name
    // 201606-n1
    dateRangeStr = datesInOrder[0]+'-n1';
  } else {
    // Get the start and end dates
    // 201606-202008-n5
    dateRangeStr = datesInOrder[0]+'-'+datesInOrder[datesInOrder.length-1]+
      '-n'+datesInOrder.length;
  }

  if (!Array.isArray(colourGrades)) {
    print("ERROR: For tiles "+utmTilesString+
      " colourGrades must be an array for proper behaviour");
    return;
  }
  
  // Get the outter boundary polygon of the tiles
  // This is to help make the get_s2_cloud_collection process more
  // efficient. This part can be reused, however we only need it 
  // here to be used once.
  var tilesGeometry = exports.get_s2_tiles_geometry(
    imageIds, ee.Geometry.BBox(109, -33, 158, -7));
  
  // Can't seem to test for an empty geometry in GEE.

  var s2_cloud_collection = exports.get_s2_cloud_collection(imageIds, tilesGeometry);

  var composite = s2_cloud_collection
    .map(exports.removeSunGlint);
  
  // Don't apply a cloud mask if there is only a single image
  var applyCloudMask = imageIds.length > 1;
  if (applyCloudMask) {
    composite = composite.map(exports.add_s2_cloud_shadow_mask)
      .map(exports.apply_cloud_shadow_mask)
      .reduce(ee.Reducer.percentile([50],["p50"]))
      .rename(['B1','B2','B3','B4','B5','B6','B7','B8',
        'B8A','B9','B10','B11','B12','QA10','QA20','QA60','cloudmask']);
  } else {

    composite = composite
      .reduce(ee.Reducer.percentile([50],["p50"]))
      .rename(['B1','B2','B3','B4','B5','B6','B7','B8',
        'B8A','B9','B10','B11','B12','QA10','QA20','QA60']);
  }
    
  var includeCloudmask = false;
  
  // Prepare images for each of the specified colourGrades
  for (var i=0; i < colourGrades.length; i++) {
    
    
    // Example name: AU_AIMS_Sentinel2-marine_V1_TrueColour_55KDU_201606-202008-n10
    var exportName = exportBasename+'_'+colourGrades[i]+
      '_'+utmTilesString+'_'+dateRangeStr;
      
    // Create a shorter display name for on the map.
    // Example name: TrueColour_55KDU_201606-202008-n10
    var displayName = colourGrades[i]+
      '_'+utmTilesString+'_'+dateRangeStr;

    var final_composite = exports.bake_s2_colour_grading(composite, colourGrades[i], includeCloudmask);
  
    // Scale and convert the image to an 8 bit image to make the export
    // file size considerably smaller.
    // Reserve 0 for no_data so that the images can be converted to not
    // have black borders. Scaling the data ensures that no valid data
    // is 0.
    var uint8_composite = final_composite.multiply(254).add(1).toUint8();
    
    // Export the image, specifying scale and region.
    // Only trigger the export when we want. The export process can take quite a while
    // due to the queue time on the Earth Engine. The first export I did was
    // 3 days on the queue.
  
    if (is_export) {
      print("======= Exporting image "+exportName+" =======");
      //var saLayer = ui.Map.Layer(tilesGeometry, {color: 'FF0000'}, 'Export Area');
      //Map.layers().add(saLayer);
      Export.image.toDrive({
        //image: final_composite,
        image: uint8_composite,
        description: exportName,
        folder:exportFolder,
        fileNamePrefix: exportName,
        scale: 10,          // Native image resolution of Sentinel 2 is 10m.
        region: tilesGeometry,
        maxPixels: 3e8      // Raise the default limit of 1e8 to fit the export
      });
    }
    if (is_display) {
      Map.addLayer(final_composite, {'min': 0, 'max': 1, 'gamma': 1},
                      displayName, false, 1);
      if (includeCloudmask) {
        Map.addLayer(final_composite.select('cloudmask').selfMask(), {'palette': 'orange'},
                     displayName+'_cloudmask', false, 0.5);
      }
    } 
  }
};


/**
 * This function estimates a mask for the clouds and the shadows and adds
 * this as additional bands (highcloudmask, lowcloudmask and cloudmask).
 * 
 * This assumes that the img has the cloud probability setup from
 * COPERNICUS/S2_CLOUD_PROBABILITY, using get_s2_cloud_collection()
 * 
 * The mask includes the cloud areas, plus a mask to remove cloud shadows.
 * The shadows are estimated by projecting the cloud mask in the direction
 * opposite the angle to the sun.
 * 
 * The algorithm does not try to estimate the actual bounds of the shadows
 * based on the image, other than splitting the clouds into two categories.
 * 
 * This masking process assumes most small clouds are low and thus throw
 * short shadows. It assumes that large clouds are taller and throw
 * longer shadows. The height of the clouds is estimated based on the 
 * confidence in the cloud prediction level from COPERNICUS/S2_CLOUD_PROBABILITY,
 * where high probability corresponds to obvious large clouds and lower
 * probabilities pick up smaller clouds. The filtering of high clouds is
 * further refined by performing a erosion and dilation to remove all 
 * clouds smaller than 300 m.
 * 
 * @param {ee.Image} img - Sentinel 2 image to add the cloud masks to.
 * @return {ee.Image} Original image with extra bands highcloudmask, 
 *    lowcloudmask and cloudmask 
 */
exports.add_s2_cloud_shadow_mask = function(img) {
  // Treat the cloud shadow distance differently for low and high cloud.
  // High thick clouds can produce long shadows that can muck up the image.
  // There is no direct way to determine which clouds will throw long dark shadows
  // however it was found from experimentation that setting a high cloud
  // probability tended to pick out the thicker clouds that also through
  // long shadows. It is unclear how robust this approach is though.
  // Cloud probability threshold (%); values greater are considered cloud
  
  var low_cloud_mask = exports.get_s2_cloud_shadow_mask(img, 
    40,   // (cloud predication prob) Use low probability to pick up smaller
          // clouds. This threshold still misses a lot of small clouds. 
          // unfortunately lowering the threshold anymore results in sand cays
          // being detected as clouds.
    0,    // (m) Erosion. Keep small clouds.
    0.4,  // (km) Use a longer cloud shadow
    150    // (m) buffer distance
  ).rename("lowcloudmask");

  
  // Try to detect high thick clouds. Assume that this throw a longer shadow.
  var high_cloud_mask = exports.get_s2_cloud_shadow_mask(img, 
    80,   // Use high cloud probability to pick up mainly larger solid clouds
    300,  // (m)  Erosion. Remove small clouds because we are trying to just detect
          //      the large clouds that will throw long shadows.
    1.5,  // (km) Use a longer cloud shadow
    300   // (m) buffer distance
  ).rename("highcloudmask"); 

  
  // Combine both masks
  var cloud_mask = high_cloud_mask.add(low_cloud_mask).gt(0).rename("cloudmask");
  //var cloud_mask = high_cloud_mask.gt(0).rename("cloudmask");
  //var cloud_mask = low_cloud_mask.gt(0).rename("cloudmask");
  
  return img.addBands(cloud_mask).addBands(high_cloud_mask).addBands(low_cloud_mask);
};

/**
 * This function creates a Sentinel 2 image collection with matching
 * cloud masks from the COPERNICUS/S2_CLOUD_PROBABILITY dataset
 * @author  Eric Lawrey
 * @param {String[]} image_ids - Array of image Ids such as 
 *      ["COPERNICUS/S2/20200820T005709_20200820T005711_T54LWQ",
 *      "COPERNICUS/S2/20200820T005709_20200820T005711_T54LXQ"]
 * @param {ee.Geometry} tiles_geometry - Outer geometry of the images 
 *      in the image_ids. This can be calculated from the get_tiles_geometry 
 *      function. We pass this in as a precalculated result to ensure that
 *      it only needs to be calculated once.
 * @return {ee.ImageCollection} Sentinel 2 image collection with cloud mask
 */
exports.get_s2_cloud_collection = function(image_ids, tiles_geometry) {

  // Create a collection from the specified image IDs. Note
  // we are assuming that these are Sentinel 2 images.
  var imageCollection = ee.ImageCollection(
    image_ids.map(function(id) {
      return ee.Image(id);
    }))
    // Preserve a copy of the system:index that is not modified
    // by the merging of image collections.
    .map(function(s2_img) {
      return s2_img.set('original_id', s2_img.get('system:index'));
    })
    // The masks for the 10m bands sometimes do not exclude bad data at
    // scene edges, so we apply masks from the 20m and 60m bands as well.
    // Example asset that needs this operation:
    // COPERNICUS/S2_CLOUD_PROBABILITY/20190301T000239_20190301T000238_T55GDP
    .map(function(s2_img) {
      return s2_img.updateMask(
        s2_img.select('B8A').mask().updateMask(s2_img.select('B9').mask()));
    });

  // Get the dataset containing high quality cloud masks. Use
  // this to mask off clouds from the composite. This masking
  // does not consider cloud shadows and so these can still
  // affect the final composite.
  var s2Clouds = ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY')
    .filterBounds(tiles_geometry)
    // Preserve a copy of the system:index that is not modified
    // by the merging of image collections.
    .map(function(s2_img) {
      return s2_img.set('original_id', s2_img.get('system:index'));
    });
  
  // Join S2 SR with cloud probability dataset to add cloud mask.
  return ee.ImageCollection(ee.Join.saveFirst('s2cloudless').apply({
    primary: imageCollection,
    secondary: s2Clouds,
    condition:
      ee.Filter.equals({leftField: 'original_id', rightField: 'original_id'})
  }));
};

/**
 * Return the merged geometry of the listed Sentinel 2 image IDs.
 * @author  Eric Lawrey
 * @param {String[]} image_ids - Array of Sentinel 2 image IDs to find the 
 *       polygon bounds of.
 * @param {ee.Geometry.BBox} search_bbox -Bounding box to search for the image tiles
 *       This is used to limit the search size. A search size of Australia seems
 *       to be performat. Australia = ee.Geometry.BBox(109, -33, 158, -7)
 * @return {ee.Geometry} Polygon feature corresponding to the union of all 
 *       image tiles
 */
exports.get_s2_tiles_geometry = function(image_ids, search_bbox) {
  // Determine the set of UTM tiles that we have applied manual
  // selection of images. 
  // Convert:
  // "COPERNICUS/S2/20170812T003031_20170812T003034_T55KDV"
  // To:
  // "55KDV"
  var utmTiles = image_ids.map(function(id) {
    // Find the position of the characters just before the UTM
    // tile in the Sentinel-2 IDs. 
    var n = id.lastIndexOf("_T")+2;
    return id.substr(n);
  });
  
  // Remove duplicates in the tileIds. Typically our image collection
  // contains many images for the same tiles. We just want the unique
  // tile IDs so we can then look them up in s2Tiles dataset without
  // wasting time collating duplicate boundaries. 
  // Modified from 
  // https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
  var seen = {};
  var uniqueUtmTiles = utmTiles.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
  
  // Used to find the geometry of the selected images. For more info checkout
  // https://eatlas.org.au/data/uuid/f7468d15-12be-4e3f-a246-b2882a324f59
  var s2Tiles = ee.FeatureCollection("users/ericlawrey/World_ESA_Sentinel-2-tiling-grid");
  
  // Find the feature that corresponds to the specified tileID.
  // Filter to the search region. This is to reduce the number of tiles that need 
  // to be searched (maybe).
  var searchTiles = s2Tiles.filterBounds(search_bbox);
  var tileFeatures = searchTiles.filter(ee.Filter.inList('Name', uniqueUtmTiles));

  // Merge all the features together
  return tileFeatures.geometry(0.1);
};

/**
 * This function estimates the sunglint from the B8 and B11 Sentinel channels.
 * This estimate is then subtracted from the visible colour bands to
 * create a new image. 
 * This function has the artifact that the edges of clouds become very dark.
 * This is because clouds are bright in the B8 channel and thus result in
 * a large subtraction from the ocean areas at the edge of the cloud making
 * it black. In the fully clouded area the value of the compensation is
 * clipped resulting in white clouds.
 * @param {ee.Image} image - Sentinel 2 image. Channels scaled from 0 - 1.
 * @param {float} landAtmosOffset - Atmospheric compensation for land areas.
 *    Constant offset to apply over land areas in image. Typical values
 *    0.02 - 0.04.
 * @return {ee.Image} RGB image based on bands B2 - B4 with sunglint
 *    removal based on B8.
 */ 
exports.removeSunGlint = function(image) {
  
  // Sun Glint Correction
  // Previously I had used the the near-infra red B8 channel for sun glint removal.
  // I has a brightness response very similar to the visible channels, is the same
  // resolution, but doesn't penetrate the water much.
  //
  // Unfortunately in very shallow areas B8 slightly penetrates the water enough
  // that it picks up the subtrate, making it much brighter than for open water.  
  // When we use B8 to perform a sunglint correction we substract B8 from the visible 
  // colour bands. In these very shallow areas B8 picks up the bottom resulting 
  // in a very strong correction being applied, causing them to become unnaturally dark.
  
  // The SWIR channel B11 has similar sun glint correction characteristics, but is only
  // 20 m in resolution and so it is not preferred to apply over deeper waters, where B8
  // is preferred due to its 10 m resolution.
  //
  // B11 does not penetrate the water very far at all and so it is a much better channel
  // to use in very shallow waters than B8. We therefore use B11 to find areas that are
  // very shallow, so that we can tone down the B8 correction in these areas. 
  // In open water areas we don't want any correction to be applied as the 20 m pixel
  // size from B11 will introduce noise into the image, we therefore want this correction
  // to be entirely black (0) for open water. For this reason we subtract a small amount
  // from the B8, B11 difference.
  // We then subtract this correction factor to the B8 channel so that we should have
  // the normal B8 sunglint correction with toned down correction in very shallow areas.
  var shallowCorrectImg = image.expression('(B8-B11)-200', {
    'B11':image.select('B11'),
    'B8' :image.select('B8')
  }).clamp(0,10000);
  var rawSunGlint = image.select('B8').subtract(shallowCorrectImg);
  
  // We don't want to apply sunglint correction to land areas. The B8 channel is very bright
  // for land areas, much brighter than the visible channels (B2, B3, B4) and so simply 
  // subtracting B8, even with the B11 correction will result in land areas appearing black.
  // We therefore need to roll off and limit the correction applied to land areas.
  // Land areas do need some correction (lowering of brightness) to match the brightness
  // of the corrected sea areas. The land areas need atmospheric correction to be apply.
  // Since we are using Top of Atmosphere imagery the land areas are brighter due to atmospheric
  // haze. Proper correction of this haze is difficult as it requires estimating atmospheric
  // parameters that are not directly measured in the satellite imagery.
  // A poor mans atmospheric correction is to find the darkest pixels (deep shadows) in the scene 
  // and assume that they should be black. We then subtract an amount necessary to make them black
  // across the entire scene.
  // This method is only effective if the scene has some naturally black areas in the image.
  // Since we are focusing on marine imagery, where the image might consist of only open water
  // with some reefs, there is no guarantee that any of the pixels should be black.
  // For this reason we can't use the poor mans atmospheric correction.
  //
  // Since our focus is on making good imagery for marine areas we don't care so much about
  // land areas. Therefore we apply an even poorers version of atmospheric correction, simply
  // subtract a constant offset from the land areas so that the land and sea are approximately
  // the same brightness on average. This will result in some individual scenes having too much
  // atmospheric correction (because it was a non hazy day), leading to darker land areas than
  // ideal. In other days this will result in too little correction being applied leading to 
  // land areas appearing brighter than the surrounding marine area.
  // Since the final composite image is made up from multiple images, these errors should
  // average out somewhat. 
  // To further refine the land atmospheric correction we allow manual control over the 
  // land atmospheric offset. 

  var LAND_THRES = 600;    // Linear up to this threshold (sunglint correction)
                            // Sunglint in very reflective scenes can reach 900 however
                            // Setting the threshold that high results in an overlap in
                            // close in land areas and shadow areas on land, leading them
                            // to receive too much correction, resulting in them coming out
                            // black.
                            // A threshold of 700 provides a compromise of removing sunglint
                            // in most scenes, but not affecting the land sea boundary too
                            // much. 
                            // Setting this threshold on an image by image process would be
                            // optimal, but not implemented. 
 var LAND_ATMOS_OFFSET = 280; // Offset to apply to the land areas to compensate for 
                            // atmospheric haze. This is a very poor mans correction
                            // because it is constant over all time and space. 
                            // Some images will be darker than ideal and some will
                            // be lighter. 
 
  // Linear ramp up to  LAND_THRES, set anything above this to the
  // fixed atmospheric threshold we want to apply to land areas (LAND_ATMOS_OFFSET).
  //            ^ LAND_THRES **
  //            |          ** *  
  //            |        **   *
  // rawSunGlint|      **     *******  LAND_ATMOS_OFFSET
  //            |    **
  //            |  **
  //            ------------------> B8 
  
  var b8 = image.select('B8');

  // Determin the land sea boundary using the B8 channel rather than the 
  // combined B8 + B11 rawSunGlint variable. Using the rawSunGlint it was
  // found that mangrove areas tended to be treated as water and thus
  // end up being black. Switching to B8 fixed this problem. Presumably
  // mangroves are much brighter on B8 than in B11.
  var sunglintCorr = rawSunGlint.where(b8.gt(LAND_THRES),LAND_ATMOS_OFFSET);

  // Apply the sunglint and land atmospheric correction to the visible
  // channels.
  // Note: Each of the channels has a slight difference in sensitivity in the
  // correction. We therefore scale the correction differently for each band.
  // If we apply a scalar of 1.0 to B2 instead of 0.7 then strong areas of
  // sunglint get overcorrected resulting in patches that are darker
  // then their surrounding areas. This also appears to accentuate the
  // banding caused by the multiple sensor pickup of the satellite, possibly
  // due to the slight angle different with the sun.
  // The scale factors were manually optimised by finding clean images that
  // had patches of sunglint that were overcorrected. The scalar was then
  // adjusted so that the glint patches blended into surrounding waters.
  // Reference images used for this parameterisation:
  // For B2 0.75 seems to balance the sunglint, and level of the banding.
  // COPERNICUS/S2/20181005T001109_20181005T001104_T56KLF (Lihou Reef Coral Sea)
  //
  // On this reef the B2 sunglint correction seems too low at 0.75
  // COPERNICUS/S2/20180212T001111_20180212T001105_T56KME (Marion Reef Coral Sea)
  
  var  sunGlintComposite =  image
    .addBands(image.select('B1').subtract(sunglintCorr.multiply(0.75)),['B1'], true)
    .addBands(image.select('B2').subtract(sunglintCorr.multiply(0.75)),['B2'], true)
    .addBands(image.select('B3').subtract(sunglintCorr.multiply(0.9)),['B3'], true)
    .addBands(image.select('B4').subtract(sunglintCorr.multiply(1)),['B4'], true);

  return(sunGlintComposite);
};

/**
 * This function is deprecated in preference of 'removeSunGlint()'.
 * This function estimates the sunglint from the B8 Sentinel channel.
 * This estimate is then subtracted from the visible colour bands to
 * create a new image. The compensation only works for images with
 * light sunglint.
 * The removeSunGlint function is an improvement on this function.
 * This function has the artifact that the edges of clouds become very dark.
 * This is because clouds are bright in the B8 channel and thus result in
 * a large subtraction from the ocean areas at the edge of the cloud making
 * it black. In the fully clouded area the value of the compensation is
 * clipped resulting in white clouds.
 * @param {ee.Image} img - Sentinel 2 image
 * @return {ee.Image} RGB image based on bands B2 - B4 with sunglint
 *    removal based on B8.
 */ 
exports.removeSunGlintB8 = function(img) {
  
  // The brightness fluctuation of the waves and the sun glint
  // in B8 matches the same in B2, B3 and B4. Unfortunately
  // B8 is very bright for clouds and land and so these become
  // black if B8 is simply subtracted from these channels. We therefore
  // need to only apply the compensation when the brightness is not too
  // much. Cloud are assumed to be masked out in a separate process
  // and so we focus here on the transition from land to sea.
  
  var B8 = img.select('B8');
  var B4 = img.select('B4');
  var B3 = img.select('B3');
  var B2 = img.select('B2');
  

  // Provide linear compensation up to a moderate amount of sun glint.
  // Above this level clip the amount we subtract so that land areas
  // don't turn black. At high levels of B8 we can be pretty sure that
  // we have land pixels and so reduce the amount that we subtract so that
  // the contrast on the land does not get too high.
  // We still subtract a small amount even from land areas to compensate 
  // of haze in the atmosphere making dark areas brighter.
  
  // The limitations of this algorithm are that:
  // 1. land areas with deep shadows such as on the side of mountains or 
  // cliffs have very low B8 brightness and so are considered water and 
  // thus receive the full subtraction of the B8 channel from the other 
  // colours making them black. 
  // 2. At low tides some reef flats have bright B8 channels resulting
  // resulting in them being treated as land, resulting in less sun glint
  // compensation. This leads to an artifical step in brightness across
  // across the reef flat.
  // 3. When the sun glint is strong the brightness of the water, overlaps
  // in values with the brightness of the land and so the algorithm can not
  // be used. Essentially images with a high sunglint should not be used.
  // Calculate the amount of sunglint removal to apply. By default
  // for areas where the sunglint is low (B8 < 200) then keep this as-is.
  // For areas between 200 - 300, cap the amount to remove at 200. At this
  // brightness for B8 we can't distinguish between very shallow water (< 0.5 m)
  // and high levels of sunglint. We therefore choose this threshold as
  // the maximum level of compensation that we can apply to the image.
  // In areas where there is high sunglint this limitation will make the
  // image unusable.
  
  // Deep cloud shadows have a B8 value lower than the surrounding water
  // due to being in a shadow. However the linearity of the sunglint
  // compensation seems to slightly break down in these conditions.
  // The visible channels seem to be darkened slightly more than the
  // B8 channel and so the compensation in these areas results in
  // very dark areas. This dark cloud shadows can then mess up subsequent
  // processing. Additionally these large dark shadows seem to be associated
  // with high clouds that not easy to mask out automatically, as the shadows
  // are quite separated from the clouds. These clouds have B8 values in
  // the order of 180 - 240 for high sunglint scene and 100 - 115 for a
  // low sunglint scene.
  //var TRANSITION_THRES = 450;
  //var TRANSITION_THRES = 800;
  //var PEAK_THRES = 1000;
  var THRES = 800;
  var TRANSITION_THRES = 1000;
  var PEAK_THRES = 1200;
  var B8new = B8.where(B8.gt(THRES), 
    B8.subtract(THRES).divide(2).add(THRES));

  // This threshold is intended to help with the transition from very shallow
  // areas to land. We want land areas to have less compensation for sunglint,
  // because it makes no sense to apply it to land.
  B8new = B8new.where(B8.gt(TRANSITION_THRES), ee.Image((TRANSITION_THRES-THRES)/2+THRES));
  
  B8new = B8new.where(B8.gt(PEAK_THRES), ee.Image(300));
  
  // For really bright areas this probably corresponds to land, so don't
  // try to remove sunglint. i.e. we only subtract 100 from the image,
  // which acts as a slight haze removal and reduces the transition gradient
  // between the land and the ocean making the blending less severe. 
  // If we let B8 go through for land areas, unclipped then the very high B8
  // brightness on land results in black land areas after the B8 has been
  // subtracted from the other colour bands.
  //B8new = B8new.where(B8.gt(500), ee.Image(150));
  //B8new = B8new.where(B8.gt(800), ee.Image(400));
  //B8new = B8new.where(B8.gt(1200), ee.Image(350));
  //B8new = B8new.where(B8.gt(1800), ee.Image(300));

  // The remaining sunglint is brighter in the red band so increase the
  // compensation in the red band, to achieve a more pleasing image.
  return img.addBands(B4.subtract(B8new.multiply(1.15)),['B4'],true)
    .addBands(B3.subtract(B8new),['B3'], true)
    .addBands(B2.subtract(B8new),['B2'], true);
};


/**
 * Estimate the cloud and shadow mask for a given image. This uses the following
 * algorithm:
 * 1. Estimate the dark pixels corresponding to cloud shadow pixels using a 
 *    threshold on the B8 channel. Note that this only works on land. On water
 *    this algorithm treats all water as a shadow.
 * 2. Calculate the angle of the shadows using the MEAN_SOLAR_AZIMUTH_ANGLE
 * 3. Create a cloud mask based on a probability threshold (cloud_prob_thresh) to 
 *    apply to the COPERNICUS/S2_CLOUD_PROBABILITY data.
 * 4. Apply a erosion and dilation (negative then positive buffer) to the 
 *    cloud mask. This removes all cloud features smaller than the
 *    erosion distance.
 * 5. Project this cloud mask along the line of the shadow for a distance specified
 *    by cloud_proj_dist. The shadows of low clouds will only need a short
 *    project distance (~ 0.4 km), where as high clouds throw longer shadows (~ 1 - 2 km).
 * 6. Multiply the dark pixels by the projected cloud shadow. On land this will crop
 *    the mask to just the cloud shadow. On water this will retain the whole cloud
 *    mask and cloud projection as all the water are considered dark pixels.
 * 7. Add the shadow and cloud masks together to get a complete mask. This will
 *    ensure a full mask on land, and will have no effect on water areas as the 
 *    shadow mask already includes the clouded areas.
 * 8. Apply a buffer to the mask to expand the area masked out. This is to 
 *    slightly overcome the imperfect nature of the cloud masks.
 * This assumes that the images were produced by get_s2_cloud_collection() and
 * that the cloud probability layer has been associated with the image.
 * @param {ee.Image} img - Sentinel 2 image to add the cloud mask to. Assumes that
 *    the the COPERNICUS/S2_CLOUD_PROBABILITY dataset has been merged with
 *    image from the get_s2_cloud_collection(). In this case the probability
 *    band in the image stored under the s2cloudless property is used.
 * @param {Number} cloud_prob_thresh - (0-100) probability threshold to 
 *    apply to the COPERNICUS/S2_CLOUD_PROBABILITY layer to create the
 *    cloud mask. This basic mask is then has the erosion apply to it,
 *    is projected along the shadow and a final buffer applied.
 * @param {Number} erosion - (m) erosion applied to the initial cloud mask
 *    prior to creating the cloud shadow project. This can be used to remove
 *    small cloud features. A dilation (buffer) is applied after the erosion to
 *    bring the cloud mask features back to their original size (except those
 *    that were too small and thus disappeared) prior to shadow projection.
 *    This dilation has the same distance as the erosion.
 * @param {Number} cloud_proj_dist - (m) distance to project the cloud mask
 *    in the direction of shadows. 
 * @param {Number} buffer - (m) Final buffer to apply to the shadow projected
 *    cloud mask. This expands the mask in all directions and can be used to 
 *    catch more of the neighbouring cloud areas just outside the cloud
 *    masking.
 */
exports.get_s2_cloud_shadow_mask = function(img, cloud_prob_thresh, erosion, cloud_proj_dist, buffer) {
  var SR_BAND_SCALE = 1e4;    // Sentinel2 channels are 0 - 10000.
  var NIR_DRK_THRESH = 0.15;  // Near-infrared reflectance; values less than are
                              // considered potential cloud shadow. This threshold was
                              // chosen to detect cloud shadows on land areas where
                              // the B8 channel is consistently bright (except in shadows).
                              // All water areas are considered dark by this threshold.
  
  // Determine the dark areas on land. This doesn't work on water because all 
  // water appears too dark. As such the simple dark pixels approach only refines
  // the masking of shadows on land areas. In the water it is determined by the 
  // the cloud_proj_dist.
  var dark_pixels = img.select('B8').lt(NIR_DRK_THRESH*SR_BAND_SCALE).rename('dark_pixels');
  
  // Determine the direction to project cloud shadow from clouds (assumes UTM projection).
  var shadow_azimuth = ee.Number(90).subtract(ee.Number(img.get('MEAN_SOLAR_AZIMUTH_ANGLE')));
  
  // Condition s2cloudless by the probability threshold value.
  var is_cloud = ee.Image(img.get('s2cloudless')).select('probability')
    .gt(cloud_prob_thresh).rename('allclouds');
  
  var is_cloud_erosion_dilation;
  
  // Save on computations if no erosion is needed.
  if (erosion > 0) {
    // Make sure the erosion and dilation filters don't get too large as this
    // will become too computationally expensive.
    // We want the filter size to be approximately 4 pixels in size so that
    // the calculations are smooth enough, but the computations are not too
    // expensive.
    // We also have a lower resultion limit of 20 m to save on computations
    // for full image exports.
    // Find the scale that would give us approximately a 4 pixel filter or
    // our lower resolution limit.
    var APPROX_EROSION_PIXELS = 4;   // pixels
    // Find the resolution of the filter rounded to the nearest 10 m (Sentinel 2 resolultion)
    // Make sure that it isn't smaller than 20 m
    var erosion_scale = Math.max(Math.round(erosion/APPROX_EROSION_PIXELS/10)*10,20);

    //print("Erosion scale: "+erosion_scale)
    
    // Operate at a erosion_scale m pixel scale. The focal_min and focal_max operators require
    // units of pixels and adjust the erosion variable from m to pixels
    is_cloud_erosion_dilation = (is_cloud.focal_min(erosion/erosion_scale).focal_max(erosion/erosion_scale)
        .reproject({crs: img.select([0]).projection(), scale: erosion_scale})
        .rename('cloudmask'));
  } else {
    is_cloud_erosion_dilation = is_cloud;
  }
  
  // Project shadows from clouds for the distance specified by the cloud_proj_dist input.
  // We use a scale of 100 m to reduce the computations. This results is pixelated
  // results, however the buffer stage smooths this out.
  var cloud_proj = (is_cloud_erosion_dilation
        .directionalDistanceTransform(shadow_azimuth, cloud_proj_dist*10)
        .reproject({crs: img.select(0).projection(), scale: 100})
        .select('distance')
        .mask()
        .rename('cloud_transform'));

  // Identify the intersection of dark pixels with cloud shadow projection.
  var shadows = cloud_proj.multiply(dark_pixels).rename('shadows');
  
  // Add the cloud mask to the shadows. On water the clouds are already
  // masked off because all the water pixels are considered shadows due to
  // the limited shadow detection algorith. For land areas the shadows
  // don't include the cloud mask.
  //var is_cloud_or_shadow = is_cloud.add(shadows).gt(0);
  var is_cloud_or_shadow = cloud_proj;
  
  var APPROX_BUFFER_PIXELS = 4;   // pixels
    // Find the resolution of the filter rounded to the nearest 10 m (Sentinel 2 resolultion)
    // Make sure that it isn't smaller than 20 m
  var buffer_scale = Math.max(Math.round(buffer/APPROX_BUFFER_PIXELS/10)*10,20);
  
  //print("Buffer scale: "+buffer_scale)
  // Remove small cloud-shadow patches and dilate remaining pixels by BUFFER input.
  // 20 m scale is for speed, and assumes clouds don't require 10 m precision.
  // Removing the small patches also reduces the false positive rate on
  // beaches significantly.
  var buffered_cloud_or_shadow = (is_cloud_or_shadow.focal_max(buffer/buffer_scale)
        .reproject({crs: img.select([0]).projection(), scale: buffer_scale})
        .rename('cloudmask'));
  return buffered_cloud_or_shadow;
  
};


/**
 * Applies a contrast enhancement to the image, limiting the image
 * between the min and max and applying a gamma correction. This 
 * enhancement is suitable for stretching out the dark tones in deep water.
 */
exports.contrastEnhance = function(image, min, max, gamma) {
  return image.subtract(min).divide(max-min).clamp(0,1).pow(1/gamma);
};

/**
 * Apply the cloud mask to each of the image bands. This should be
 * done prior to reducing all the images using median or percentile.
 */
exports.apply_cloud_shadow_mask = function(img) {
    // Subset the cloudmask band and invert it so clouds/shadow are 0, else 1.
    var not_cld_shdw = img.select('cloudmask').not();

    var masked_img = img.select('B.*').updateMask(not_cld_shdw);
    // Get remaining QA bands
    var QA_img = img.select('QA.*');
	
    // Subset reflectance bands and update their masks, return the result.
    return masked_img.addBands(QA_img).addBands(img.select('cloudmask'));
};

/**
 * Bakes in the colour grading of the image so it is ready for exporting.
 * This rescales the data from 0 - 1.
 * @param {ee.Image} img - image to colour grade
 * @param {string} colourGradeStyle - 
 *      'TrueColour'  - Relatively faithful true colour reproduction (note: sunglint remove 
 *                      does introduce some small issues at the water land boundary)
 *      'DeepMarine'  - Focus on deeper marine features.
 *      'DeepFalse'   - False colour image from Ultra violet (B1), Blue (B2) and Green that shows
 *                      deep marine features well in clear waters.
 *      'DeepFeature' - High contrast difference between green and blue bands for detecting deep seagrass.
 *                      Grey scale image. This style has not been well tested or tuned.
 *      'Shallow'     - False colour image that highlights shallow areas. This is useful
 *                      for determining islands and cays, along with dry exposed reef areas.
 *                      It is determined B5, B8 and B11.
 *      'ReefTop'     - This is a grey scale image with a threshold that is applied to the
 *                      red channel (B4) to approximate reef top areas (~5 m depth) in 
 *                      clear oceananic water. This is close to a binary mask, but has a
 *                      small smooth grey scale transition to help with smooth digitisation.
 *                      This reef top masking has a 10 m radius circular spatial filter applied to
 *                      the image to reduce the noise. The threshold chosen was intended to be close
 *                      to the deepest features visible in red, as this will naturally be close to
 *                      a 6 m depth. The threshold was raised above the noise floor to reduce false
 *                      positives. This threshold was chosen to not have too many false positive 
 *                      in the coral sea, where waves contribute significant noise into the red channel.
 * @param {Boolean} processCloudMask - If true then copy over the cloudMask band.
 *            This is a slight hack because I couldn't work out how to perform
 *            conditional GEE server side execution, and cloning the original
 *            image to include channels other than B2, B3 and B4, followed by 
 *            applying the contrast enhancement didn't seem to work.
 */
exports.bake_s2_colour_grading = function(img, colourGradeStyle, processCloudMask) {
  var compositeContrast;
  var scaled_img = img.divide(1e4);
  var B4contrast;
  var B3contrast;
  var B2contrast;
  var B1contrast;
  if (colourGradeStyle === 'TrueColour') {
    //B4contrast = exports.contrastEnhance(scaled_img.select('B4'),0.013,0.17, 2);
    //B3contrast = exports.contrastEnhance(scaled_img.select('B3'),0.025,0.19, 2);
    //B2contrast = exports.contrastEnhance(scaled_img.select('B2'),0.045,0.19, 2);
    B4contrast = exports.contrastEnhance(scaled_img.select('B4'),0.013,0.3, 2.2);
    B3contrast = exports.contrastEnhance(scaled_img.select('B3'),0.025,0.31, 2.2);
    B2contrast = exports.contrastEnhance(scaled_img.select('B2'),0.045,0.33, 2.2);
    compositeContrast = ee.Image.rgb(B4contrast, B3contrast, B2contrast);
  } else if (colourGradeStyle === 'DeepMarine') {
    //B4contrast = exports.contrastEnhance(scaled_img.select('B4'),0.011,0.08, 2);
    //B3contrast = exports.contrastEnhance(scaled_img.select('B3'),0.033,0.09, 2);
    // De-emphasise B4 compared to B3 and B2 because B4 only contains information
    // about shallow features, and is heavily affected by waves, since these
    // are not fully corrected by sunglint removal.
    B4contrast = exports.contrastEnhance(scaled_img.select('B4'),0.013,0.2, 2.2);
    B3contrast = exports.contrastEnhance(scaled_img.select('B3'),0.033,0.12, 2.5);
    B2contrast = exports.contrastEnhance(scaled_img.select('B2'),0.07,0.13, 2.5); //0.067
    compositeContrast = ee.Image.rgb(B4contrast, B3contrast, B2contrast);
  } else if (colourGradeStyle === 'DeepFalse') {
    
    //B3contrast = exports.contrastEnhance(scaled_img.select('B3'),0.0355,0.175, 2.5);
    //B2contrast = exports.contrastEnhance(scaled_img.select('B2'),0.074,0.175, 2.5);
    //B1contrast = exports.contrastEnhance(scaled_img.select('B1'),0.109,0.177, 2.5); 
    
    B3contrast = exports.contrastEnhance(scaled_img.select('B3'),0.034,0.175, 2.5);
    B2contrast = exports.contrastEnhance(scaled_img.select('B2'),0.071,0.175, 2.5);
    B1contrast = exports.contrastEnhance(scaled_img.select('B1'),0.103,0.177, 2.5); 
    compositeContrast = ee.Image.rgb(B3contrast, B2contrast, B1contrast);

  } else if (colourGradeStyle === 'ReefTop') {
    //B4contrast = exports.contrastEnhance(scaled_img.select('B4'),0.02,0.021, 1);
    //var B5contrast = exports.contrastEnhance(scaled_img.select('B5'),0.02,0.05, 1);
    var smootherKernel = ee.Kernel.circle({radius: 10, units: 'meters'});
    //var waveKernel = ee.Kernel.gaussian({radius: 40, sigma: 1, units: 'meters'});

    var B4Filtered = scaled_img.select('B4').focal_mean({kernel: smootherKernel, iterations: 4});
    //B4contrast = exports.contrastEnhance(B4Filtered,0.015,0.016, 1);
    // This threshold was chosen so that it would reject most waves in the Coral Sea
    // but be as sensitive as possible.
    B4contrast = exports.contrastEnhance(B4Filtered,0.018,0.019, 1);
    compositeContrast = B4contrast;
  } else if (colourGradeStyle === 'Shallow') {
    //print(scaled_img);
    var B5contrast = exports.contrastEnhance(scaled_img.select('B5'),0.02,0.3, 2);
    var B8contrast = exports.contrastEnhance(scaled_img.select('B8'),0.02,0.3, 2);
    var B11contrast = exports.contrastEnhance(scaled_img.select('B11'),0.02,0.3, 2);
    compositeContrast = ee.Image.rgb(B11contrast, B8contrast, B5contrast);

  } else if (colourGradeStyle === 'DeepFeature') {
    var B3 = exports.contrastEnhance(scaled_img.select('B3'),0.027,0.17, 4);
    var B2 = exports.contrastEnhance(scaled_img.select('B2'),0.06,0.15, 3.3);
    
    // Apply a 30m filter to reduce the noise in the image prior to taking the difference
    var waveKernel = ee.Kernel.circle({radius: 40, units: 'meters'});
    var B3Filtered = B3.focal_mean({kernel: waveKernel, iterations: 4});
    var B2Filtered = B2.focal_mean({kernel: waveKernel, iterations: 4});
    
    compositeContrast = exports.contrastEnhance(B2Filtered.subtract(B3Filtered.clamp(0,1)),0,0.15,2);

  } else {
    print("Error: unknown colourGradeStyle: "+colourGradeStyle);
  }
  if (processCloudMask) {
    var cloudmask = img.select('cloudmask');
    return compositeContrast.addBands(cloudmask);
  } else {
    return compositeContrast;
  }
};
