# Coral Sea Sentinel 2 marine composite images 2015 – 2021 (AIMS) - V0

Eric Lawrey – 21 November 2021

Australian Institute of Marine Science

This repository contains all the scripts used to create the Coral Sea
Sentinel 2 marine composite images. It includes the Google Earth Engine
javascript code and the Python scripts for subsequent post processing
of the imagery.

This repository is intended to allow others to reproduce and extend this
dataset. The scripts in this repository represent a draft version of this
dataset, as the composite imagery was only created from a partial review (50-70%)
of all the Sentinel 2 imagery. A future more refined version of this dataset 
will be published in approximately 6 months. When it is available it will be linked to
from here. 

No functional upgrades will be made to this repository as it represents about
snap shot of the processing that was used to create the dataset.

More information about this dataset can be found on the 
[Dataset metadata page](https://eatlas.org.au/data/uuid/2932dc63-9c9b-465f-80bf-09073aacaf1c)

## Setup and installation
This dataset is created using the Google Earth Engine followed by some
file format adjustments using a Python script to process the imagery using
GDAL tools.

To reproduce this dataset from scratch you will need:
 - [Google Earth Engine account](https://earthengine.google.com/)
 - Python and GDAL installed (On Windows [OSGeo4W](https://www.osgeo.org/projects/osgeo4w/) is recommended)
 
The `01-sentinel2-tile-selection` folder contains a reference map that
was used to determine which Sentinel-2 tiles should be processed. It also
contains the previewing of the final imagery. However this imagery is not
part of this code repository due to its size (45GB). To ensure the imagery
works [download the dataset imagery](https://nextcloud.eatlas.org.au/apps/sharealias/a/cs-aims-sentinel-2-marine-v0) 
and save the imagery in the `finaldata` directory in subfolders for
each type of image style, i.e. `R1_DeepFalse`, etc.

The `02-gee-scripts` folder contains the scripts that should be
run on the Google Earth Engine. To set these up create a new Repository
and copy the scripts into the repo. Each script includes a description
of their purpose.

The `03-local-scripts` contains the scripts for converting the output
images from Google Earth Engine into the final imagery. More information
can be found in the [READMD.md](./03-local-scripts) file.

## Dataset description

This dataset contains composite satellite images for the Coral Sea
region based on 10 m resolution Sentinel 2 imagery from 2015 – 2021. 

This collection contains composite imagery for 31 Sentinel 2 tiles in the Coral Sea. 
For each tile there are 5 different colour and contrast enhancement styles intended 
to highlight different features.

![Preview map of this dataset](./examples/CS_AIMS_Sentinel-2-marine_V0_preview-map.jpg)
A preview of the dataset and the image styles. 

## Videos

The following videos provide a walk through of the using the Google Earth Engine 
scripts to select good imagery then combine that imagery into a composite image 
for download.

[![Video Step 1 Selecting Sentinel 2 images in GEE](./media/vimeo-thumbnail-648150983.jpg)](https://vimeo.com/648150983 "Step 1 Selecting Sentinel 2 images in GEE - Click to Watch!")

[![Video Step 2 Creating composite images in GEE](./media/vimeo-thumbnail-648151138.jpg)](https://vimeo.com/6648151138 "Step 2 Creating composite images in GEE - Click to Watch!")


