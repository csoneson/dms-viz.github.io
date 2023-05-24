import "../style.css";
import "./ui.js";
import * as d3 from "d3";
import * as NGL from "ngl";
import { Tool } from "./tool.js";
import exampleData from "../data/example.json";

// Initialize the tool and it's state
let State;
fetchData().then((data) => {
  // Add data to the tool
  State = new Tool(data);

  // Set up the event listeners
  setUpJsonFileUploadListeners();
  setUpChartOptionListeners();
  setUpProteinOptionListeners();
  setUpDownloadButtonListeners();
  setUpWindowResizeListener();
});

// Get data from remote URL or local JSON file
async function fetchData() {
  const urlParams = new URLSearchParams(window.location.search);
  const dataUrl = urlParams.get("data");

  if (dataUrl) {
    try {
      const response = await fetch(dataUrl);

      if (!response.ok) {
        alert(`HTTP error! status: ${response.status}`);
        return exampleData; // return example data as fallback
      } else {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      alert(`Fetch operation failed: ${error.message}`);
      return exampleData; // return example data as fallback
    }
  } else {
    return exampleData; // no dataUrl parameter, return example data
  }
}

// Set up the event listener for the JSON file upload
function setUpJsonFileUploadListeners() {
  d3.select("#local-json-file").on("change", function () {
    // Get the file input element
    const input = document.getElementById("local-json-file");

    // Check if a file was selected
    if (input.files.length === 0) {
      alert("Please select a JSON file to upload.");
      return;
    }

    // Get the selected file
    const file = input.files[0];

    // Check if the selected file is a JSON file
    if (file.type !== "application/json") {
      alert("Please select a valid JSON file.");
      return;
    }

    // Use the FileReader API to read the contents of the JSON file
    const reader = new FileReader();
    reader.onload = function () {
      // Parse the JSON file into an object and write it to data
      const data = JSON.parse(reader.result);
      // Update the tool's state
      State.data = data;
      State.initTool();
    };
    reader.readAsText(file);

    // Update the URL and remove the data URL
    const urlParams = new URLSearchParams(window.location.search);
    // Clear all URL parameters
    // Display the keys
    for (const key of urlParams.keys()) {
      urlParams.delete(key);
    }
    window.history.replaceState({}, "", `${location.pathname}`);

    // Clear the URL input element
    document.getElementById("url-json-file").value = "";
  });

  d3.select("#url-json-file").on("keyup", async function (event) {
    // If the key pressed was not 'Enter', return
    if (event.key !== "Enter") {
      return;
    }

    // Check if a URL was provided
    if (!this.value) {
      alert("Please enter a URL.");
      return;
    }

    // Check if the URL is valid
    try {
      new URL(this.value);
    } catch (_) {
      alert("Please enter a valid URL.");
      return;
    }

    try {
      const response = await fetch(this.value);

      if (!response.ok) {
        alert(
          `There was an error fetching data from the URL. HTTP Status: ${response.status}`
        );
        return;
      }

      // Parse the response into a JSON object
      const data = await response.json();

      // Update the URL to include the data URL
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("data", this.value);
      window.history.replaceState({}, "", `${location.pathname}?${urlParams}`);

      // Update the tool's state
      State.data = data;
      State.initTool();

      // Clear the local input element
      document.getElementById("local-json-file").value = "";
    } catch (error) {
      alert(`Fetch operation failed: ${error.message}`);
    }
  });
}

// Set up the event listeners for the chart options
function setUpChartOptionListeners() {
  d3.select("#experiment").on("change", function () {
    State.updateSelectedExperiment(this);
    // Reize the accordion menu if necessary (i.e. legend size changes)
    let btn = document.getElementById("chart-btn");
    if (btn.classList.contains("is-open")) {
      let content = btn.nextElementSibling;
      content.style.maxHeight = content.scrollHeight + "px";
    }
  });
  window.addEventListener("proteinEpitopeSelected", function (event) {
    State.updateProteinEpitope(event.detail);
  });
  window.addEventListener("chartEpitopesSelected", function (event) {
    State.updateChartEpitopes(event.detail);
  });
  d3.select("#summary").on("change", function () {
    State.updateChartOptions(this);
  });
  d3.select("#floor").on("change", function () {
    State.updateChartOptions(this);
  });
}

// Set up the event listeners for the protein options
function setUpProteinOptionListeners() {
  d3.select("#proteinRepresentation").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#selectionRepresentation").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#backgroundRepresentation").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#proteinColor").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#backgroundColor").on("change", function () {
    State.updateProteinOptions(this);
  });
  d3.select("#showGlycans").on("change", function () {
    State.updateProteinOptions(this);
  });
}

// Set up the event listeners for the download buttons
function setUpDownloadButtonListeners() {
  // Set up the event listeners for the download buttons
  d3.select("#downloadProtein").on("click", function () {
    State.protein.stage
      .makeImage({
        factor: 4,
        antialias: true,
        trim: false,
        transparent: false,
      })
      .then(function (blob) {
        NGL.download(blob, "protein_plot.png");
      });
  });
}

// Set up the event listener to respond to window resizing
function setUpWindowResizeListener() {
  // Set up the event listener to respond to window resizing
  window.addEventListener("resize", function () {
    State.chart.resize();
    State.protein.resize();
  });
}
