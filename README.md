ViziData
========

Visualization for spacio-temporal data from [Wikidata](http://www.wikidata.org/).

This is a visualization prototype for large datasets of spacio-temporal data from Wikidata. Events for a selected time-interval are shown as aggregate points in a map like fashion. The datasets are currently in JSON format and can be generated with [ViziDataPreprocessor](https://github.com/gordelwig/ViziDataPreprocessor).

This project was partly an experiment to test the limits of heavy duty data processing with web technologies (javascript in particular). By it's nature it demands a lot of ressources, more so with Wikidatas growing size. Expect massive memory allocations and browser crashes, especially if you load bigger datasets (like "items").

A working demo can currently be viewed [here](http://sylum.lima-city.de/viziData/) (Includes only the Dataset "Deaths" because of filesize limitations).

![screenshot](https://github.com/arsylum/ViziData/blob/master/screen.jpg)
