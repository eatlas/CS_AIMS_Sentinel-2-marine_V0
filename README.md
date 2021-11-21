# Coral Sea Sentinel 2 marine composite images 2015 – 2021 (AIMS)

Eric Lawrey – 22 September 2021

Australian Institute of Marine Science

This repository contains all the scripts used to create the Coral Sea
Sentinel 2 marine composite images. It includes the Google Earth Engine
javascript code and the Python scripts for subsequent post processing
of the imagery.

This repository is intended to allow others to reproduce and extend this
dataset.

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

## Videos

The following videos provide a walk through of the steps used to collate
the imagery being used and to generate and export the final imagery.

[![Video Step 1 Selecting Sentinel 2 images in GEE](./media/vimeo-thumbnail-648150983.jpg)](https://vimeo.com/648150983 "Step 1 Selecting Sentinel 2 images in GEE - Click to Watch!")

[![Video Step 2 Creating composite images in GEE](./media/vimeo-thumbnail-648151138.jpg)](https://vimeo.com/6648151138 "Step 2 Creating composite images in GEE - Click to Watch!")
## Dataset description

This dataset contains composite satellite images for the Coral Sea
region based on 10 m resolution Sentinel 2 imagery from 2015 – 2021. 

This collection contains composite imagery for 31 Sentinel 2 tiles in the Coral Sea. 
For each tile there are 5 different colour and contrast enhancement styles intended 
to highlight different features.

![Preview map of this dataset](./examples/CS_AIMS_Sentinel-2-marine_V0_preview-map.jpg)
A preview of the dataset and the image styles. 

More information about this dataset can be found on the 
[Dataset metadata page](https://eatlas.org.au/data/uuid/2932dc63-9c9b-465f-80bf-09073aacaf1c)




pandoc --extract-media=media -f docx -t markdown
2021-09-22_CS_AIMS_Sentinel2-marine_V0_Metadata.docx -o metadata.md
