# 2018-06-26, v0.2.0
* **NEW! Basic Pascal VOC and COCO format support. EXPERIMENTAL!**
* Some text clarifications.
* Fixed a bug with uppercase extension names on images not working.

# 2018-06-24, v0.1.9
* Fixed issue with newlines in classes for different OS.

# 2018-03-16, v0.1.8
* Some minor refactoring.
* Added ability to fit image into screen. Configurable.
* Fixed bug with images resetting upon not selecting anything from file window.
* Added detailed explanations on the configurable parameters.

# 2018-03-13, v0.1.7
* Changed middle dot to a cross sign. Also made it configurable.
* Added guidelines for cursor. Configurable.
* Updated README.md.

# 2018-03-04, v0.1.6
* Fixed bbox dimension display being affected by zoom.
* Added a middle dot in bboxes for easier center approximation.

# 2018-03-01, v0.1.5
* Fixed canvas not resetting on image mouse select.
* Fixed classes and bboxes not reloading on selecting the same files.
* Added image and current bbox information.
* Updated README.md.

# 2018-02-19, v0.1.4
* Fixed bbox select form name. Not sure if it caused problems.
* Made sure cursor is shown as busy upon crop. (Doesn't work properly - this needs a proper "wait" spinner).
* Fixed crops not working on Linux.
* Updated README.md.

# 2018-02-18, v0.1.3
MAJOR:
* Added ability to crop and saves images from bboxes (experimental).
* Added FileSaver to better handle file downloading.
* Fixed issue where MacBook DELETE key wouldn't work.

MINOR:
* Renamed labels.zip to bboxes.zip.
* Updated screenshot to reflect changes.
* Fixed previous version CHANGELOG typo.
* Added version to footer.

# 2018-02-17, v0.1.2

* Fixed CHANGELOG formatting.
* Fixed select box not auto scrolling to selection.
* Made sure coordinate pixels are without decimal point.
* Canvas now resets on image change to original zoom and position (can be turned off).
* Implemented rudimentary image search by name.
* Added ability to upload unzipped and/or multiple bboxes.
* Fixed mouse cursor not resetting on bbox delete.
* Updated README.md and screenshot to reflect changes.
    
# 2018-02-15, v0.1.1

* Fixed, so that canvas left offset doesn't cause misplacement of bboxes.
* Fixed, that errors won't be thrown in console if image doesn't exist for a bbox.

# 2018-02-14, v0.1.0

* Initial release