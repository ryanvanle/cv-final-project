"use strict";

(function() {

  /**
 * Add a function that will be called when the window is loaded.
 */
  window.addEventListener("load", init);

  let placeToData = new Map();
  let PLACES = [];
  let timerIdArray = [];

  function init() {
    getData();
    id("clear").addEventListener("click", clearInput);
    qs("input").addEventListener("change", function () {
      clearAllTimerId();
      setupCamera(this.value);
    });

    //load model
    let video = document.getElementById('videoPlayer');
    let detector = ml5.objectDetector('yolo', {}, function() {
      console.log("working")
    });

    //todo
    // see if the model works during the day, it seems like it doesnt work as well in night
    // (not detecting in easy cases to humans)
    // tracking, so only moving cars can work
    // display results to user
    // image, object
    // display if video is invalid for some reason

    // send to user

    video.addEventListener('loadeddata', function() {
      let canvas = id("canvas");
      canvas.width = id("videoPlayer").videoWidth;
      canvas.height = id("videoPlayer").videoHeight;
      resizeCanvasToDisplaySize(canvas);

      let timerId = setInterval(function() {
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        detector.detect(video, (err, results) => {
          if (results == null) return;
          for (let i = 0; i < results.length; i++) {
            let x = results[i].normalized.x;
            let y = results[i].normalized.y;
            let width = results[i].normalized.width;
            let height = results[i].normalized.height;
            drawRectangle(x, y, width, height);
          }
          console.log(results); // Will output bounding boxes of detected objects
        });

      }, 500)

      timerIdArray.push(timerId);

    });
    // // detector
  }

  function clearInput() {
    qs("input").value = "";
  }

  function drawRectangle(x, y, width, height) {
    resizeCanvasToDisplaySize(document.getElementById('canvas'));
    const canvas = document.getElementById('canvas');

    let canvasWidth = canvas.offsetWidth;
    let canvasHeight = canvas.offsetHeight;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.strokeStyle = "#FF0000";
    console.table(x, y, width, height);
    console.table(canvasWidth, canvasHeight)
    context.rect(x*canvasWidth, y*canvasHeight, width*canvasWidth, height*canvasHeight);
    // context.rect(0,0, 10, 10);
    // context.rect(20,20, 10, 10);
    // context.rect(40,40, 10, 10);
    // context.rect(60,60, 10, 10);
    // context.rect(80,80, 10, 10);
    // context.rect(300, 80, 10, 10);
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
  async function getData() {
    let request = "https://web.seattle.gov/Travelers/api/Map/Data?zoomId=14&type=2"
    let resultFetch = await fetch(request)
      .then(statusCheck)
      .then(res => res.json())
      .catch(handleError);

    let points = resultFetch['Features'];

    let placeSet = new Set();

    for (let i = 0; i < points.length; i++) {
      let data = points[i];
      let coord = data['PointCoordinate'];
      let cameras = [];
      for (let j = 0; j < data['Cameras'].length; j++) {
        let currentCamera = data['Cameras'];
        let cameraId = currentCamera[0]['Id'];
        let cameraName = currentCamera[0]['Description'];
        let result = {
          'name': cameraName,
          'coord': coord,
          'id': cameraId,
        }

        if (currentCamera['0']['Type'] === "sdot") {
          let stream = currentCamera[0]['ImageUrl'].replace(".jpg", ".stream")
          let streamURL = "https://61e0c5d388c2e.streamlock.net:443/live/" + stream + "/playlist.m3u8";
          result['stream'] = streamURL;
          placeSet.add(cameraName);
          placeToData.set(cameraName, result);
        }
      }

    }

    PLACES = Array.from(placeSet);
    setOptions();
  }

  function setOptions() {
    let placeInput = id("places");
    for (let i = 0; i < PLACES.length; i++) {
      let option = gen("option");
      option.value = PLACES[i];
      placeInput.append(option);
    }
  }

  function setupCamera(input) {
    if (!placeToData.has(String(input))) return;
    let data = placeToData.get(input);
    displayCamera(data.stream, data.name);
  }

  async function displayCamera(streamURL, locationName) {
    let doesNotStreamExist = await fetch(streamURL).then(statusCheck404).catch(
      function() {
        doesNotStreamExist = false;
      }
    );


    if (doesNotStreamExist) {
      console.log("stream doesnt exist");
      // need to display something if invalid
      return;
    }

    id("location").textContent = locationName;
    let video = document.getElementById('videoPlayer');
    if (Hls.isSupported()) {
      let hls = new Hls();
      hls.loadSource(streamURL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function() {
          video.play();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamURL;
        video.addEventListener('loadedmetadata', function() {
            video.play();
        });
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