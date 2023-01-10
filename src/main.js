import "../style.css";
import * as d3 from "d3";
import polyclonal from "../data/hiv.json";
import { Chart } from "./chart.js";
import { Protein } from "./protein.js";

// INITIALIZE THE DATA //

// Format the JSON for each antibody model
for (const selection in polyclonal) {
  // Get the map for reference sites to sequential sites
  const siteMap = polyclonal[selection].sitemap;
  polyclonal[selection].mut_escape_df = polyclonal[selection].mut_escape_df.map(
    (e) => {
      return {
        ...e,
        site: siteMap[e.site],
        site_reference: e.site,
        escape: e.escape_mean,
      };
    }
  );
}

// INITIALIZE DEFAULTS //

const models = Object.keys(polyclonal);
let model = models[0];
let epitope = polyclonal[model].epitopes[0];
let metric = "sum";
let floor = true;

// UPDATE SELECT OPTIONS //

function updateSelection(selection, options) {
  selection
    .selectAll("option")
    .data(options)
    .join("option")
    .attr("value", (d) => d)
    .text((d) => d);
}
updateSelection(d3.select("#model"), models);
updateSelection(d3.select("#metric"), ["sum", "mean", "max", "min"]);
updateSelection(d3.select("#epitope"), polyclonal[model].epitopes);

// INITIALIZE THE PLOT //

const chart = new Chart(
  {
    model: model,
    epitope: epitope,
    metric: metric,
    floor: floor,
    parentElement: "#chart",
  },
  polyclonal
);

// Load the protein structure from a URL
const protein = new Protein(polyclonal, {
  parentElement: "viewport",
  model: model,
  epitope: epitope,
  metric: metric,
  floor: floor,
  pdbID: "6UDJ",
  dispatch: chart.dispatch,
});

// DOM SELECTIONS AND MANIPULATIONS //

d3.select("#metric").on("change", function () {
  chart.config.metric = d3.select(this).property("value");
  chart.updateVis();
  protein.config.metric = chart.config.metric;
  protein.makeColorScheme();
});

d3.select("#model").on("change", function () {
  chart.config.model = d3.select(this).property("value");
  chart.updateVis();
  protein.config.model = chart.config.model;
  protein.makeColorScheme();
});

d3.select("#floor").on("change", function () {
  chart.config.floor = d3.select(this).property("checked");
  chart.updateVis();
  protein.config.floor = chart.config.floor;
  protein.makeColorScheme();
});
