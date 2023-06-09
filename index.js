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

  let predictionData = {};

  const imageWidth = 600;
  const imageHeight = 400;

  function init() {
    detector = ml5.objectDetector('coco', {}, function() {
    });

    initMap();


    id("close").addEventListener("click", function() {
      id("welcome").style.display = "none";
      id("delete").disabled = false;
      id("submit").disabled = false;
    });

    id("delete").addEventListener("click", function() {
      deleteAllRectangles();
    });

    id("submit").addEventListener("click", async function() {
      id("streetview-container").innerHTML = `<h2>Identifying</h2>`;
      id("results").innerHTML = `<h2>Results</h2>`;
      let dataVisSection = gen("section");
      dataVisSection.id = "charts";
      let chartsTitle = gen("h3");
      chartsTitle.textContent = "Charts";
      dataVisSection.append(chartsTitle);
      let loading = gen("section");
      loading.classList.add("loading");
      dataVisSection.append(loading);
      id("results").append(dataVisSection);
      predictionData = {};
      id("delete").disabled = true;
      id("submit").disabled = true;

      for (let i = 0; i < rectanglesWithPoints.length; i++) {
        let rectangleTitle1 = gen("h3");
        rectangleTitle1.textContent = `Area ${i + 1}`;
        let rectangleTitle2 = gen("h3");
        rectangleTitle2.textContent = `Area ${i + 1}`;

        id("streetview-container").appendChild(rectangleTitle1);

        let resultsCars = gen("section");
        resultsCars.classList.add("test");

        id("results").appendChild(rectangleTitle2);
        id("results").appendChild(resultsCars);


        for (let j = 0; j < rectanglesWithPoints[i].points.length; j++) {
          await create360StaticStreetViewImage(rectanglesWithPoints[i].points[j], i);
        }
      }

      setTimeout(generateDataCharts, 18 * 1000) // i couldnt figure out how to make this run after the for loops :(
      id("delete").disabled = false;
      id("submit").disabled = false;

      window.scroll({
        top: 950,
        left: 0,
        behavior: 'smooth'
      });

    });
  }


  async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const {DrawingManager} = await google.maps.importLibrary("drawing")
    const pointAmountInput = document.getElementById('point-amount');

    map = new Map(document.getElementById("map"), {
      center: { lat: 47.6062, lng: -122.3321 },
      zoom: 11,
    });

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

    google.maps.event.addListener(drawingManager, 'rectanglecomplete', function(rectangle) {

      let bounds = rectangle.getBounds();
      let numPoints = parseInt(pointAmountInput.value);

      let points = evenlySpreadPoints(bounds, numPoints);

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

      let deleteButton = document.createElement('div');
      deleteButton.className = 'delete-button';
      deleteButton.innerHTML = 'Delete';

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

  function deleteAllRectangles() {
    // Remove each rectangle and associated markers
    rectanglesWithPoints.forEach(function(rectangleWithPoints) {
      rectangleWithPoints.rectangle.setMap(null); // Remove the rectangle from the map

      // Remove the associated markers
      rectangleWithPoints.markers.forEach(function(marker) {
        marker.setMap(null);
      });
    });

    // Clear the rectanglesWithPoints array
    rectanglesWithPoints = [];

    // Clear the results and streetview-container elements
    let deleteButtons = qsa(".delete-button");
    deleteButtons.forEach(function (element) { element.remove(); });
    id("streetview-container").innerHTML = `<h2>Identifying</h2>`;
    id("results").innerHTML = `<h2>Results</h2>`;
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


  async function create360StaticStreetViewImage(point, rectangleIndex) {
    return new Promise((resolve, reject) => {


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

    let coordsTitle = gen("h4");
    coordsTitle.textContent = `lat: ${point.lat()}, long: ${point.lng()}`;

    mainContainer.appendChild(coordsTitle);
    let images = [];
    const imagePromises = [];

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

      const imagePromise = new Promise((resolve, reject) => {
        let image = document.createElement("img");
        image.src = imageUrl;
        image.width = imageWidth;
        image.height = imageHeight;
        image.crossOrigin = "anonymous";
        imageContainer.appendChild(image);

        image.onload = function() {
          resolve();
        };

        image.onerror = function() {
          reject(new Error("Failed to load image: " + imageUrl));
        };

        images.push(image);
      });

      imagePromises.push(imagePromise);
    }

    Promise.all(imagePromises)
      .then(() => {
        for (let i = 0; i < images.length; i++) {
          let image = images[i];

          detector.detect(image, async function(error, results) {
            let canvas = gen("canvas");
            canvas.width = imageWidth;
            canvas.height = imageHeight;

            if (error) {
              console.error(error);
              return;
            }

            let cars = [];
            for (let i = 0; i < results.length; i++) {
              let label = results[i]['label'];
              let confidence = results[i]['confidence'];
              if (label === "car" && confidence > 0.6) {
                cars.push(results[i]);
              }
            }

            for (let i = 0; i < cars.length; i++) {
              let x = cars[i].normalized.x;
              let y = cars[i].normalized.y;
              let width = cars[i].normalized.width;
              let height = cars[i].normalized.height;

              let xModify = -0.05;
              let yModify = -0.05;
              let widthModify = 0.1;
              let heightModify = 0.1;

              let xNew = x + xModify;
              let yNew = y + yModify;
              let widthNew = width + widthModify;
              let heightNew = height + heightModify;

              xNew = Math.max(0, Math.min(xNew, 1));
              yNew = Math.max(0, Math.min(yNew, 1));
              widthNew = Math.max(0, Math.min(widthNew, 1 - xNew));
              heightNew = Math.max(0, Math.min(heightNew, 1 - yNew));

              let xScaled = xNew * imageWidth;
              let yScaled = yNew * imageHeight;
              let widthScaled = widthNew * imageWidth;
              let heightScaled = heightNew * imageHeight;

              xScaled = Math.max(0, Math.min(xScaled, imageWidth));
              yScaled = Math.max(0, Math.min(yScaled, imageHeight));
              widthScaled = Math.max(0, Math.min(widthScaled, imageWidth - xScaled));
              heightScaled = Math.max(0, Math.min(heightScaled, imageHeight - yScaled));

              await drawRectangle(canvas, xNew, yNew, widthNew, heightNew, "#F85149");
              extractImageArea(image, xScaled, yScaled, widthScaled, heightScaled, rectangleIndex);
            }

            canvasContainer.appendChild(canvas);
          });
        }
      })
      .catch((error) => {
        console.error(error);
      });

    flex.appendChild(imageContainer);
    flex.appendChild(canvasContainer);
    wrapper.appendChild(flex);
    mainContainer.appendChild(wrapper);
    container.appendChild(mainContainer);

    resolve()}
    );
  }

  function drawRectangle(canvas, x, y, width, height, hex) {
    return new Promise((resolve) => {
      let canvasWidth = canvas.width;
      let canvasHeight = canvas.height;
      const context = canvas.getContext('2d');
      context.beginPath();
      context.strokeStyle = hex;
      context.lineWidth = 3.5;
      context.rect(x * canvasWidth, y * canvasHeight, width * canvasWidth, height * canvasHeight);
      context.stroke();

      resolve();
    });
  }

  function extractImageArea(image, sourceX, sourceY, width, height, rectangleIndex) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, sourceX, sourceY, width, height, 0, 0, canvas.width, canvas.height);
    const extractedImageData = context.getImageData(0, 0, canvas.width, canvas.height);

    let extractedImage = new Image();
    extractedImage.src = canvas.toDataURL();
    predict(extractedImage, rectangleIndex)
  }

  async function predict(img, rectangleIndex) {
    let imagePath = img.src;
    img.crossOrigin = "anonymous"
    let apiURL = "http://localhost:8001/predict/";

    let formData = new FormData();
    formData.append("image_data", imagePath);

    let data = await fetch(apiURL, {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .catch(handleError);

    let container = gen("section");
    container.classList.add("prediction");

    let labelElement = gen("h4");
    let label = data.label;
    labelElement.textContent = label;
    let resultImg = gen("img");
    resultImg.src = "data:image/jpeg;base64," + data.image;


    container.appendChild(labelElement);
    container.appendChild(resultImg);

    let rectangles = qsa(".test");
    let currentRectangle = rectangles[rectangleIndex];
    currentRectangle.appendChild(container);

    if (predictionData[rectangleIndex] == null)  predictionData[rectangleIndex] = {};
    let dataObject = predictionData[rectangleIndex];

    if(dataObject[label] == null) {
      predictionData[rectangleIndex][label] = 1;
    } else {
      predictionData[rectangleIndex][label] += 1;
    }

    return;
  }

  function generateCanvasFromImage(image) {
    let canvas = gen("canvas");
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    return canvas;
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

  function generateDataCharts() {
    let rectangleAmount = rectanglesWithPoints.length;

    qs(".loading").style.display = "none";

    let max = 0;
    for (let i = 0; i < rectangleAmount; i++) {
      const currentMaxValue = d3.max(Object.values(predictionData[i]));
      if (currentMaxValue > max) {
        max = currentMaxValue;
      }
    }

    // Bar chart
    const margin = { top: 30, right: 100, bottom: 100, left: 200 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    for (let i = 0; i < rectangleAmount; i++) {
      let data = predictionData[i];
      if (data == null) alert("null data");


      const svg = d3
        .select("#charts")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const y = d3.scaleBand().range([0, height]).padding(0.1);
      const x = d3.scaleLinear().range([0, width]);

      y.domain(Object.keys(data));
      x.domain([0, max]);

      svg
        .selectAll(".bar")
        .data(Object.entries(data))
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", (d) => y(d[0]))
        .attr("width", (d) => x(d[1]))
        .attr("height", y.bandwidth())
        .attr("fill", "steelblue");

      svg.append("g").call(d3.axisLeft(y));

      svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

      svg
        .selectAll("text")
        .attr("transform", "rotate(0)")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .style("text-anchor", "end");

      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .text(`Area ${i + 1}`);

    }

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