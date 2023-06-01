"use strict";

(function() {

  /**
 * Add a function that will be called when the window is loaded.
 */
  window.addEventListener("load", init);

  let detector;
  let selectedLocation = null;
  let map, panorama;

  let rectanglesWithPoints = [];
  let drawingManager;

  function init() {
    initMap();
    id("data").addEventListener("click", function() {
      console.log(rectanglesWithPoints);
    });

    id("submit").addEventListener("click", function() {
      createStreetViewPanorama(rectanglesWithPoints[0].points[0])
      // createStaticStreetViewImage(rectanglesWithPoints[0].points[0])

    })
    detector = ml5.objectDetector('cocossd', {}, function() { console.log("working") });
  }

  async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const {DrawingManager} = await google.maps.importLibrary("drawing")
    const pointAmountInput = document.getElementById('point-amount'); // Get the input element for point amount

    map = new Map(document.getElementById("map"), {
      center: { lat: 47.6062, lng: -122.3321 },
      zoom: 11,
    });

    // Create a drawing manager
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.RECTANGLE,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [google.maps.drawing.OverlayType.RECTANGLE]
        },
        rectangleOptions: {
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            editable: true,
            draggable: true
        }
    });

    drawingManager.setMap(map);

    // Add an event listener for when the rectangle is complete
    google.maps.event.addListener(drawingManager, 'rectanglecomplete', function(rectangle) {
        let bounds = rectangle.getBounds();
        let north = bounds.getNorthEast().lat();
        let south = bounds.getSouthWest().lat();
        let east = bounds.getNorthEast().lng();
        let west = bounds.getSouthWest().lng();

        console.log("North: " + north);
        console.log("South: " + south);
        console.log("East: " + east);
        console.log("West: " + west);
    });

    google.maps.event.addListener(drawingManager, 'rectanglecomplete', function(rectangle) {

      let bounds = rectangle.getBounds();
      let numPoints = parseInt(pointAmountInput.value); // Get the number of points from the input value

      let points = evenlySpreadPoints(bounds, numPoints);

      // Create markers for the evenly spread points
      let markers = points.map(function(point) {
        return new google.maps.Marker({
            position: point,
            map: map
        });
      });

      let rectangleWithPoints = {
        "rectangle": rectangle,
        "points": points,
        "markers": markers
      };

      rectanglesWithPoints.push(rectangleWithPoints);

      // Create a delete button for the rectangle
      let deleteButton = document.createElement('div');
      deleteButton.className = 'delete-button';
      deleteButton.innerHTML = 'Delete';

      // Position the delete button at the top right of the rectangle
      deleteButton.style.position = 'absolute';
      deleteButton.style.top = '0';
      deleteButton.style.right = '0';

      // Add the delete button to the map
      map.controls[google.maps.ControlPosition.TOP_RIGHT].push(deleteButton);

      // Add an event listener to delete the rectangle when the delete button is clicked
      deleteButton.addEventListener('click', function() {
        rectangleWithPoints.rectangle.setMap(null); // Remove the rectangle from the map

        // Remove the associated markers
        rectangleWithPoints.markers.forEach(function(marker) {
            marker.setMap(null);
        });

        rectanglesWithPoints = rectanglesWithPoints.filter(function(item) {
            return item.rectangle !== rectangleWithPoints.rectangle;
        });
        deleteButton.remove(); // Remove the delete button
      });

      google.maps.event.addListener(rectangle, 'bounds_changed', function() {
        let bounds = rectangle.getBounds();

        // Update the rectangle bounds in the rectanglesWithPoints array
        rectanglesWithPoints.forEach(function(rectangleWithPoints) {
            if (rectangleWithPoints.rectangle === rectangle) {
                rectangleWithPoints.points = evenlySpreadPoints(bounds, rectangleWithPoints.points.length);

                // Update the markers on the map
                rectangleWithPoints.markers.forEach(function(marker) {
                    marker.setMap(null);
                });
                rectangleWithPoints.markers = rectangleWithPoints.points.map(function(point) {
                    return new google.maps.Marker({
                        position: point,
                        map: map
                    });
                });

                // Update any other data associated with the rectangle as needed
            }
        });
      });

      google.maps.event.addListener(rectangle, 'dragend', function() {
          let bounds = rectangle.getBounds();

          // Update the rectangle bounds in the rectanglesWithPoints array
          rectanglesWithPoints.forEach(function(rectangleWithPoints) {
              if (rectangleWithPoints.rectangle === rectangle) {
                  rectangleWithPoints.points = evenlySpreadPoints(bounds, rectangleWithPoints.points.length);

                  // Update the markers on the map
                  rectangleWithPoints.markers.forEach(function(marker) {
                      marker.setMap(null);
                  });
                  rectangleWithPoints.markers = rectangleWithPoints.points.map(function(point) {
                      return new google.maps.Marker({
                          position: point,
                          map: map
                      });
                  });

                  // Update any other data associated with the rectangle as needed
              }
          });
      });



    });

    pointAmountInput.addEventListener('change', function() {
      let numPoints = parseInt(pointAmountInput.value);
      rectanglesWithPoints.forEach(function(rectangleWithPoints) {
          let bounds = rectangleWithPoints.rectangle.getBounds();
          let points = evenlySpreadPoints(bounds, numPoints);

          rectangleWithPoints.points = points;

          rectangleWithPoints.markers.forEach(function(marker) {
            marker.setMap(null);
          });

          // Update the markers on the map
          rectangleWithPoints.markers = points.map(function(point) {
            return new google.maps.Marker({
                position: point,
                map: map
            });
        });
      });
    });
  }

  function evenlySpreadPoints(bounds, numPoints) {
    let ne = bounds.getNorthEast();
    let sw = bounds.getSouthWest();

    let lngSpan = ne.lng() - sw.lng();
    let latSpan = ne.lat() - sw.lat();

    let aspectRatio = lngSpan / latSpan;
    let gridCols = Math.ceil(Math.sqrt(numPoints * aspectRatio));
    let gridRows = Math.ceil(numPoints / gridCols);

    let lngIncrement = lngSpan / gridCols;
    let latIncrement = latSpan / gridRows;

    let points = [];
    let colSizes = [];
    let averageColSize = Math.floor(numPoints / gridCols);

    for (let i = 0; i < gridCols; i++) {
        colSizes.push(averageColSize);
    }

    let remainingPoints = numPoints - averageColSize * gridCols;
    let symmetricalPoints = Math.floor(remainingPoints / 2);

    let colIndex = Math.floor(gridCols / 2); // Center the column with the least number of points

    while (symmetricalPoints > 0) {
        colSizes[colIndex]++;
        colSizes[gridCols - 1 - colIndex]++;
        symmetricalPoints--;
        colIndex--;
    }

    if (remainingPoints % 2 !== 0) {
        colSizes[Math.floor(gridCols / 2)]++;
    }

    let colStartIndex = 0;

    for (let i = 0; i < gridCols; i++) {
        let colSize = colSizes[i];
        let colLng = sw.lng() + lngIncrement * (i + 0.5);

        let rowStartIndex = colStartIndex + Math.floor((gridRows - colSize) / 2);

        for (let j = 0; j < colSize; j++) {
            let rowIndex = (rowStartIndex + j) % gridRows;
            let lat = sw.lat() + latIncrement * (rowIndex + 0.5);
            let lng = colLng;
            let point = new google.maps.LatLng(lat, lng);

            // Check if the point is within the bounds
            if (bounds.contains(point)) {
                points.push(point);
            }
        }

        colStartIndex += gridRows;
    }

    return points;
  }

  function createStreetViewPanorama(point) {
    const panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'), {
      position: point,
      pov: {
        heading: 0,
        pitch: 0

      },
      disableDefaultUI: true,
      visible: true
    });


    // take screenshots
    id("input-canvas").height = id("pano").offsetHeight;
    id("input-canvas").width = id("pano").offsetWidth;

    let panoCanvas = qs("#pano canvas");
    console.log(panoCanvas);

    let heading = 0;
    let timerId = setInterval(() => {
      heading += 90;
      panorama.setPov({ heading: heading, pitch: 0 });

      if (heading === 360) clearInterval(timerId);
    }, 250); // Rotate every 2 seconds (adjust the interval as desired)
  }

  function createStaticStreetViewImage(point) {
    const apiKey = 'AIzaSyBrihFqby1UCOB9U0pMfSHauXWZlFtLfek';
    const container = document.getElementById('streetview-container');
    const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${point.lat()},${point.lng()}&key=${apiKey}`;

    // Create an image element and set the source to the Street View image URL
    const image = document.createElement('img');
    image.src = imageUrl;

    // Append the image element to the container
    container.appendChild(image);
  }


  function runModel(detector, video) {
    detector.detect(video, gotResults);
  }

  async function gotResults(error, results) {
    if (error) {
      console.error(error);
      return;
    }

    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < results.length; i++) {
      let x = results[i].normalized.x;
      let y = results[i].normalized.y;
      let width = results[i].normalized.width;
      let height = results[i].normalized.height;


      resizeCanvasToDisplaySize(document.getElementById('canvas'));
      const canvas = document.getElementById('canvas');
      let canvasWidth = canvas.offsetWidth;
      let canvasHeight = canvas.offsetHeight;

      drawRectangle(x-0.025, y-0.025, width+0.05, height+0.05, "#FF0000");
    }

    detector.detect(video, gotResults);
  }


  function drawRectangle(x, y, width, height, hex) {
    resizeCanvasToDisplaySize(document.getElementById('canvas'));
    const canvas = document.getElementById('canvas');

    let canvasWidth = canvas.offsetWidth;
    let canvasHeight = canvas.offsetHeight;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.strokeStyle = hex;
    context.rect(x*canvasWidth, y*canvasHeight, width*canvasWidth, height*canvasHeight);
    context.stroke();
  }

  function resizeCanvasToDisplaySize(canvas) {
    // look up the size the canvas is being displayed
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // If it's resolution does not match change it
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }

    return false;
  }


  /**
 * Make sure to always add a descriptive comment above
 * every function detailing what it's purpose is
 * Use JSDoc format with @param and @return.
 */
  function exampleFunction1() {
    /* SOME CODE */
  }

  /**
 * Make sure to always add a descriptive comment above
 * every function detailing what it's purpose is
 * @param {variabletype} someVariable This is a description of someVariable, including, perhaps, preconditions.
 * @returns {returntype} A description of what this function is actually returning
 */
  function exampleFunction2(someVariable) {
    /* SOME CODE */
    return something;
  }

  /** ------------------------------ Helper Functions  ------------------------------ */
  /**
 * Note: You may use these in your code, but remember that your code should not have
 * unused functions. Remove this comment in your own code.
 */

  /**
 * Returns the element that has the ID attribute with the specified value.
 * @param {string} idName - element ID
 * @returns {object} DOM object associated with id.
 */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
 * Returns the first element that matches the given CSS selector.
 * @param {string} selector - CSS query selector.
 * @returns {object} The first DOM object matching the query.
 */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
 * Returns the array of elements that match the given CSS selector.
 * @param {string} selector - CSS query selector
 * @returns {object[]} array of DOM objects matching the query.
 */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  /**
 * Returns a new element with the given tag name.
 * @param {string} tagName - HTML tag name for new DOM element.
 * @returns {object} New DOM object for given HTML tag.
 */
  function gen(tagName) {
    return document.createElement(tagName);
  }

    /**
   * Return the response's result text if successful, otherwise
   * returns the rejected Promise result with an error status and corresponding text
   * @param {object} response - response to check for success/error
   * @return {object} - valid response if response was successful, otherwise rejected
   *                    Promise result
   */
    async function statusCheck(response) {
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response;
    }

    async function statusCheck404(response) {
      return response['status'] === 404;
    }

    function handleError(error) {
      console.error(error);
    }

    function clearAllTimerId() {
      for (let i = 0; i < timerIdArray.length; i++) {
        clearInterval(timerIdArray[i]);
      }

      timerIdArray = [];
    }
})();