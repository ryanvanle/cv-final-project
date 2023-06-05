"use strict";

(function() {

  /**
 * Add a function that will be called when the window is loaded.
 */
  window.addEventListener("load", init);

  let detector;
  let upscaler;
  let selectedLocation = null;
  let map, panorama;

  let rectanglesWithPoints = [];
  let drawingManager;
  let containerID = 0;
  let pointToResults = new Map();

  const imageWidth = 600;
  const imageHeight = 400;

  function init() {
    detector = ml5.objectDetector('coco', {}, function() {
      console.log("working")
      // identifyCars(qs(".main-container"));
    });

    upscaler = new Upscaler({
      model: DefaultUpscalerJSModel,
    })

    initMap();
    id("data").addEventListener("click", function() {
      let img = gen("img");
      img.src = "img/tesla.jpeg";

      img.crossOrigin = "anonymous";
      img.onload = async function() {
        let imagePath = img.src;
        let apiURL = "http://localhost:8001/predict/";

        let formData = new FormData();
        formData.append("image_url", imagePath);

        let data = await fetch(apiURL, {
          method: "POST",
          body: formData
        })
          .then(res => res.json())
          .catch(handleError);

        let resultImg = gen("img");
        resultImg.src = "data:image/jpeg;base64," + data.image;
        id("streetview-container").appendChild(resultImg);

        console.log(data);
      };

      id("streetview-container").appendChild(img);
    });

    id("submit").addEventListener("click", function() {
      for (let i = 0; i < rectanglesWithPoints.length; i++) {
        for (let j = 0; j < rectanglesWithPoints[i].points.length; j++) {
          create360StaticStreetViewImage(rectanglesWithPoints[i].points[j]);
        }
      }
    });
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
    // google.maps.event.addListener(drawingManager, 'rectanglecomplete', function(rectangle) {
    //     let bounds = rectangle.getBounds();
    //     let north = bounds.getNorthEast().lat();
    //     let south = bounds.getSouthWest().lat();
    //     let east = bounds.getNorthEast().lng();
    //     let west = bounds.getSouthWest().lng();

    //     console.log("North: " + north);
    //     console.log("South: " + south);
    //     console.log("East: " + east);
    //     console.log("West: " + west);
    // });

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


  async function create360StaticStreetViewImage(point) {
    const apiUrl = "http://localhost:8001/streetview/";
    const container = document.getElementById('streetview-container');

    let mainContainer = gen("section");
    mainContainer.classList.add("main-container");

    let wrapper = gen("div");
    wrapper.classList.add("container-wrapper");

    let flex = gen("div");
    flex.classList.add("container-flex");

    let imageContainer = gen("section");
    imageContainer.classList.add("image-container");

    let canvasContainer = gen("section");
    canvasContainer.classList.add("canvas-container");

    let coordsTitle = gen("h2");
    coordsTitle.textContent = `lat: ${point.lat()}, long: ${point.lng()}`
    mainContainer.appendChild(coordsTitle);
    let images = [];
    let imageCount = 0;

    for (let angle = 0; angle < 360; angle += 90) {
      let pov = 90;
      const params = new URLSearchParams({
        latitude: point.lat(),
        longitude: point.lng(),
        angle: angle,
        image_width: imageWidth,
        image_height: imageHeight,
        pov: pov,
      });

      const imageUrl = `${apiUrl}?${params}`;
      let request = await fetch(imageUrl)
      .then(statusCheck)
      .then(res => {return res})
      .catch(handleError);


      // console.log(request);


      // Create an image element and set the source to the Street View image URL
      let image = document.createElement("img");
      // image.src = "img/streetview (1).jpeg";
      image.src = request.url;
      image.width = imageWidth;
      image.height = imageHeight;
      image.crossOrigin = "anonymous";
      image.onload = function() {
        let canvas = generateCanvasFromImage(image);

        detector.detect(image, async function(error, results) {
          if (error) {
            console.error(error);
            return;
          }

          canvasContainer.appendChild(canvas);


          let cars = [];
          // get only cars
          for (let i = 0; i < results.length; i++) {
            let label = results[i]['label'];
            if (label === "car") cars.push(results[i]);
          }


          for (let i = 0; i < cars.length; i++) {
            if (cars[i].confidence < 0.75) continue;
            let x = cars[i].normalized.x;
            let y = cars[i].normalized.y;
            let width = cars[i].normalized.width;
            let height = cars[i].normalized.height;

            let xModify = -0.05;
            let yModify = -0.05;
            let widthModify = 0.1;
            let heightModify = 0.1;

            // adjusted normalized
            let xNew = x + xModify;
            let yNew = y + yModify;
            let widthNew = width + widthModify;
            let heightNew = height + heightModify;

            // Clamp the adjusted normalized values to stay within the range [0, 1]
            xNew = Math.max(0, Math.min(xNew, 1));
            yNew = Math.max(0, Math.min(yNew, 1));
            widthNew = Math.max(0, Math.min(widthNew, 1 - xNew));
            heightNew = Math.max(0, Math.min(heightNew, 1 - yNew));


            // scaled up with canvas;
            let xScaled = xNew * imageWidth;
            let yScaled = yNew * imageHeight;
            let widthScaled = widthNew * imageWidth;
            let heightScaled = heightNew * imageHeight;

            // Clamp the scaled values to stay within the bounds of the image
            xScaled = Math.max(0, Math.min(xScaled, imageWidth));
            yScaled = Math.max(0, Math.min(yScaled, imageHeight));
            widthScaled = Math.max(0, Math.min(widthScaled, imageWidth - xScaled));
            heightScaled = Math.max(0, Math.min(heightScaled, imageHeight - yScaled));

            drawRectangle(canvas, xNew, yNew, widthNew, heightNew, "#F85149");
            let extractedImage = extractImageArea(image, xScaled, yScaled, widthScaled, heightScaled, function(extractedImage) {
              extractedImage = predict(extractedImage);
            });
            console.log(extractedImage);
          }

          console.log(results);
        });
      }

      // Append the image element to the container
      images.push(image);
      imageContainer.appendChild(image);
    }

    flex.appendChild(imageContainer);
    flex.appendChild(canvasContainer);
    wrapper.appendChild(flex);
    mainContainer.appendChild(wrapper);
    container.appendChild(mainContainer);
  }

  async function predict(img) {
    let imagePath = img.src;
    img.crossOrigin = "anonymous"
    let apiURL = "http://localhost:8001/predict/";

    let formData = new FormData();
    console.log(imagePath);
    formData.append("image_data", imagePath);

    let data = await fetch(apiURL, {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .catch(handleError);

    let container = gen("section");
    container.classList.add("prediction");

    let labelElement = gen("h3");
    let label = data.label;
    labelElement.textContent = label;

    console.log(data);
    let resultImg = gen("img");
    resultImg.src = "data:image/jpeg;base64," + data.image;


    container.appendChild(labelElement);
    container.appendChild(resultImg);


    id("test").appendChild(container);
  }

  function generateCanvasFromImage(image) {
    let canvas = gen("canvas");
    canvas.width = imageHeight;
    canvas.height = imageWidth;
    return canvas;
  }

  function extractImageArea(image, sourceX, sourceY, width, height, callback) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, sourceX, sourceY, width, height, 0, 0, canvas.width, canvas.height);
    const extractedImageData = context.getImageData(0, 0, canvas.width, canvas.height);

    let extractedImage = new Image();
    extractedImage.src = canvas.toDataURL();
    extractedImage.onload = function() {
      // Check if the callback is a function before calling it
      if (typeof callback === 'function') {
        callback(extractedImage);
      } else {
        console.error('Invalid callback function.');
      }
    };
  }


  function drawRectangle(canvas, x, y, width, height, hex) {

    let canvasWidth = canvas.width;
    let canvasHeight = canvas.height;
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