import * as d3 from "d3";
import { Chart } from "./chart.js";
import { Protein } from "./protein.js";
import { Legend } from "./legend.js";

// Write a class to handle the state of the tool
export class Tool {
  /**
   * Class constructor with initial configuration
   * @param {Object}
   */
  constructor(_data) {
    this.data = _data;
    this.initTool();
  }
  /**
   * Initialize the visualization
   */
  initTool() {
    let tool = this;

    // Format the data for each experiment
    for (const experiment in tool.data) {
      // Get the epitopes for the experiment and convert to strings
      tool.data[experiment].epitopes = tool.data[experiment].epitopes.map((e) =>
        e.toString()
      );
      // Get the map for reference sites to sequential sites
      const siteMap = tool.data[experiment].sitemap;
      // Get the column name of the mutation-level metric
      const metric = tool.data[experiment].metric_col;
      // Map the reference sites to sequential and protein sites
      tool.data[experiment].mut_metric_df = tool.data[
        experiment
      ].mut_metric_df.map((e) => {
        return {
          ...e,
          site: siteMap[e.reference_site].sequential_site,
          site_reference: e.reference_site,
          site_protein: siteMap[e.reference_site].protein_site,
          site_chain: siteMap[e.reference_site].chains,
          metric: e[metric],
          epitope: e.epitope.toString(),
        };
      });
    }

    // Get the detils from the data
    tool.setStateFromURL();

    // Update the URL parameters
    tool.updateURLParams();

    // Set up the initial chart
    tool.chart = new Chart(
      {
        parentElement: "#chart",
        experiment: tool.experiment,
        chartEpitopes: tool.chartEpitopes,
        summary: tool.summary,
        floor: tool.floor,
        metric: tool.data[tool.experiment].metric_col,
        tooltips: tool.data[tool.experiment].tooltip_cols,
        filters: tool.filters,
      },
      tool.data
    );

    // Set up the inital chart legend
    tool.legend = new Legend(
      {
        parentElement: "#legend",
        experiment: tool.experiment,
        proteinEpitope: tool.proteinEpitope,
        chartEpitopes: tool.chartEpitopes,
      },
      tool.data
    );

    // Set up the initial protein viewport
    tool.protein = new Protein(
      {
        parentElement: "viewport",
        experiment: tool.experiment,
        proteinEpitope: tool.proteinEpitope,
        summary: tool.summary,
        floor: tool.floor,
        pdbID: tool.data[tool.experiment].pdb,
        dispatch: tool.chart.dispatch,
        proteinRepresentation: tool.proteinRepresentation,
        selectionRepresentation: tool.selectionRepresentation,
        backgroundRepresentation: tool.backgroundRepresentation,
        ligandRepresentation: tool.ligandRepresentation,
        proteinColor: tool.proteinColor,
        backgroundColor: tool.backgroundColor,
        ligandColor: tool.ligandColor,
        backgroundOpacity: tool.backgroundOpacity,
        proteinOpacity: tool.proteinOpacity,
        selectionOpacity: tool.selectionOpacity,
        showGlycans: tool.showGlycans,
      },
      tool.data
    );

    // Populate Chart Options
    tool.initSelect(
      d3.select("#experiment"),
      Object.keys(tool.data),
      tool.experiment
    );
    tool.initSelect(
      d3.select("#summary"),
      ["sum", "mean", "max", "min"],
      tool.summary
    );
    tool.initCheckbox(d3.select("#floor"), tool.floor);

    // Populate Protein Options
    tool.initSelect(
      d3.select("#proteinRepresentation"),
      ["cartoon", "rope", "ball+stick"],
      tool.proteinRepresentation
    );
    tool.initSelect(
      d3.select("#selectionRepresentation"),
      ["spacefill", "surface"],
      tool.selectionRepresentation
    );
    tool.initSelect(
      d3.select("#backgroundRepresentation"),
      ["rope", "cartoon", "ball+stick"],
      tool.backgroundRepresentation
    );
    tool.initSelect(
      d3.select("#ligandRepresentation"),
      ["spacefill", "ball+stick"],
      tool.ligandRepresentation
    );
    tool.initCheckbox(d3.select("#showGlycans"), tool.showGlycans);
    tool.initColorPicker(d3.select("#proteinColor"), tool.proteinColor);
    tool.initColorPicker(d3.select("#backgroundColor"), tool.backgroundColor);
    tool.initColorPicker(d3.select("#ligandColor"), tool.ligandColor);
    tool.initRange(d3.select("#proteinOpacity"), tool.proteinOpacity);
    tool.initRange(d3.select("#selectionOpacity"), tool.selectionOpacity);
    tool.initRange(d3.select("#backgroundOpacity"), tool.backgroundOpacity);

    // Populate Filter Sites
    d3.select("#filters").html("");
    if (tool.data[tool.experiment].filter_cols) {
      Object.keys(tool.data[tool.experiment].filter_cols).forEach((col) => {
        // Add the filter to the page
        tool.initFilter(
          col,
          tool.data[tool.experiment].filter_cols[col],
          d3.min(tool.data[tool.experiment].mut_metric_df, (d) => d[col]),
          d3.max(tool.data[tool.experiment].mut_metric_df, (d) => d[col]),
          tool.filters[col]
        );
      });
    }
  }
  /**
   * Initialize and populate a select element
   */
  initSelect(selection, options, selected = options[0]) {
    selection
      .selectAll("option")
      .data(options)
      .join("option")
      .attr("value", (d) => d)
      .text((d) => d)
      .property("selected", (d) => d === selected);
  }
  /**
   * Initialize and set up the checkboxes
   */
  initCheckbox(selection, checked = true) {
    selection.property("checked", checked);
  }
  /**
   * Initialize and set up the color pickers
   */
  initColorPicker(selection, color = "#D3D3D3") {
    selection.attr("type", "color").property("value", color);
  }
  /**
   * Initialize the default value for a range input
   */
  initRange(selection, value = 1) {
    selection
      .attr("type", "range")
      .attr("min", 0)
      .attr("max", 1)
      .property("value", value)
      .attr("step", 0.01);
  }
  /**
   * Initialize and set up a filter slider
   */
  initFilter(column, label, min, max, value) {
    let tool = this;

    // Container for the filters
    let filters = d3.select("#filters");
    // Add a label for the filter
    filters
      .append("label")
      .attr("for", column)
      .style("display", "block")
      .text(label);
    // Add the slider element
    filters
      .append("input")
      .attr("type", "range")
      .attr("id", column)
      .attr("min", min)
      .attr("max", max)
      .attr("value", value)
      .attr("step", (max - min) / 100)
      .on("input", function () {
        // Add an event listener to update the text when the slider is moved
        tool.updateFilter(this);
      });
    // Add the text element
    filters
      .append("span")
      .attr("class", "output")
      .attr("id", `${column}-output`)
      .text(d3.format(".2f")(value));
  }
  /**
   * Handle updates to the selected experiment
   */
  updateSelectedExperiment(node) {
    let tool = this;
    // Update the experiment selection in the chart, protein, and legend
    tool.experiment = d3.select(node).property("value");
    tool.chart.config.experiment = tool.experiment;
    tool.protein.config.experiment = tool.experiment;
    tool.legend.config.experiment = tool.experiment;
    // Update the epitope selection because experiments have different epitopes
    tool.chartEpitopes = tool.data[tool.experiment].epitopes;
    tool.proteinEpitope = tool.chartEpitopes[0];
    tool.chart.config.chartEpitopes = tool.chartEpitopes;
    tool.legend.config.chartEpitopes = tool.chartEpitopes;
    tool.protein.config.proteinEpitope = tool.proteinEpitope;
    tool.legend.config.proteinEpitope = tool.proteinEpitope;
    // Update the filters
    tool.filters = {};
    if (tool.data[tool.experiment].filter_cols) {
      tool.filters = Object.keys(tool.data[tool.experiment].filter_cols).reduce(
        (acc, key) => ({
          ...acc,
          [key]: d3.min(
            tool.data[tool.experiment].mut_metric_df,
            (e) => e[key]
          ),
        }),
        {}
      );
    }
    d3.select("#filters").html("");
    if (tool.data[tool.experiment].filter_cols) {
      Object.keys(tool.data[tool.experiment].filter_cols).forEach((col) => {
        // Add the filter to the page
        tool.initFilter(
          col,
          tool.data[tool.experiment].filter_cols[col],
          d3.min(tool.data[tool.experiment].mut_metric_df, (d) => d[col]),
          d3.max(tool.data[tool.experiment].mut_metric_df, (d) => d[col]),
          tool.filters[col]
        );
      });
    }
    tool.chart.config.filters = tool.filters;

    // Update the chart and deselect all sites
    tool.chart.deselectSites();
    tool.chart.updateVis();
    tool.legend.updateVis();

    // Only update the protein if the structure has changed
    if (tool.data[tool.experiment].pdb !== tool.protein.config.pdbID) {
      tool.protein.config.pdbID = tool.data[tool.experiment].pdb;
      tool.protein.clear();
      tool.protein.load();
    }

    tool.updateURLParams();
  }
  /**
   * Handle updates within a single experiment
   */
  updateChartOptions(node) {
    let tool = this;

    // Select the node
    const selection = d3.select(node);
    const id = selection.attr("id");
    const value = selection.property(id == "floor" ? "checked" : "value");

    // Update the config
    tool[id] = value;
    tool.chart.config[id] = value;
    tool.protein.config[id] = value;

    // Update the chart and protein
    tool.chart.updateVis();
    tool.protein.updateData();

    tool.updateURLParams();
  }
  /**
   * Handle updates to the protein representation
   */
  updateProteinOptions(node) {
    let tool = this;

    // Select the node
    const selection = d3.select(node);
    const id = selection.attr("id");
    const value = selection.property(id == "showGlycans" ? "checked" : "value");

    // Update the config
    tool[id] = value;
    tool.protein.config[id] = value;

    // Update the chart and protein
    tool.protein.updateRepresentation();

    tool.updateURLParams();
  }
  /**
   * Handle updates to which eptiope is shown on the protein
   */
  updateProteinEpitope(epitope) {
    let tool = this;

    // Update the config
    tool.proteinEpitope = epitope;
    tool.protein.config.proteinEpitope = epitope;

    // Update the chart and protein
    tool.protein.updateData();

    tool.updateURLParams();
  }
  /**
   * Handle updates to which eptiopes are displayed on the chart
   */
  updateChartEpitopes(epitopes) {
    let tool = this;

    // Update the config
    tool.chartEpitopes = epitopes;
    tool.chart.config.chartEpitopes = epitopes;

    // Update the chart and protein
    tool.chart.updateVis();

    tool.updateURLParams();
  }
  /**
   * Update sites in the chart based on filters
   */
  updateFilter(node) {
    let tool = this;

    // Select the node
    const selection = d3.select(node);
    const col = selection.attr("id");
    const value = parseFloat(selection.property("value"));

    // Update the label for the filter
    d3.select(`#${col}-output`).text(d3.format(".2f")(value));

    // Update the filter object
    tool.filters[col] = value;
    tool.chart.config.filters = tool.filters;

    // Update the visualization
    tool.chart.updateVis();
    tool.protein.updateData();
    tool.protein.selectSites(d3.selectAll(".selected").data());

    tool.updateURLParams();
  }
  /**
   * Get the state from the URL
   */
  setStateFromURL() {
    let tool = this;

    // Get the URL parameters object
    const urlParams = new URLSearchParams(window.location.search);

    // Default chart option values for URL parameters
    const experiment = Object.keys(tool.data)[0];
    const proteinEpitope = tool.data[experiment].epitopes[0];
    const chartEpitopes = tool.data[experiment].epitopes;
    const summary = "sum";
    const floor = true;
    // Default protein option values for URL parameters
    const proteinRepresentation = "cartoon";
    const selectionRepresentation = "spacefill";
    const backgroundRepresentation = "rope";
    const ligandRepresentation = "spacefill";
    const proteinColor = "#D3D3D3";
    const backgroundColor = "#D3D3D3";
    const ligandColor = "#D3D3D3";
    const proteinOpacity = 1;
    const selectionOpacity = 1;
    const backgroundOpacity = 1;
    const showGlycans = false;
    // Default filter values for URL parameters
    let filters = {};
    if (tool.data[experiment].filter_cols) {
      filters = Object.keys(tool.data[experiment].filter_cols).reduce(
        (acc, key) => ({
          ...acc,
          [key]: d3.min(tool.data[experiment].mut_metric_df, (e) => e[key]),
        }),
        {}
      );
    }
    // Set the default chart option values or get the values from the URL
    tool.experiment = urlParams.get("experiment") || experiment;
    tool.proteinEpitope = urlParams.get("proteinEpitope") || proteinEpitope;
    tool.chartEpitopes =
      JSON.parse(decodeURIComponent(urlParams.get("chartEpitopes"))) ||
      chartEpitopes;
    tool.summary = urlParams.get("summary") || summary;
    tool.floor = urlParams.get("floor") || floor;
    if (typeof tool.floor == "string") {
      tool.floor = tool.floor == "true";
    }
    // Set the defult protein option values or get the values from the URL
    tool.proteinRepresentation =
      urlParams.get("proteinRepresentation") || proteinRepresentation;
    tool.selectionRepresentation =
      urlParams.get("selectionRepresentation") || selectionRepresentation;
    tool.backgroundRepresentation =
      urlParams.get("backgroundRepresentation") || backgroundRepresentation;
    tool.ligandRepresentation =
      urlParams.get("ligandRepresentation") || ligandRepresentation;
    tool.proteinColor = urlParams.get("proteinColor") || proteinColor;
    tool.backgroundColor = urlParams.get("backgroundColor") || backgroundColor;
    tool.ligandColor = urlParams.get("ligandColor") || ligandColor;
    tool.proteinOpacity = urlParams.get("proteinOpacity") || proteinOpacity;
    tool.selectionOpacity =
      urlParams.get("selectionOpacity") || selectionOpacity;
    tool.backgroundOpacity =
      urlParams.get("backgroundOpacity") || backgroundOpacity;
    tool.showGlycans = urlParams.get("showGlycans") || showGlycans;
    if (typeof tool.showGlycans == "string") {
      tool.showGlycans = tool.showGlycans == "true";
    }
    // Set the default filter values or get the values from the URL
    tool.filters =
      JSON.parse(decodeURIComponent(urlParams.get("filters"))) || filters;
  }
  /**
   * Update the URL parameters when the state changes
   */
  updateURLParams() {
    let tool = this;

    // Get the URL parameters object
    const urlParams = new URLSearchParams(window.location.search);

    // If the data parameter is not in the URL, then return
    if (!urlParams.has("data")) {
      return;
    }

    // Set the URL parameters for the chart options
    urlParams.set("experiment", tool.experiment);
    urlParams.set("summary", tool.summary);
    urlParams.set("floor", tool.floor);
    urlParams.set("proteinEpitope", tool.proteinEpitope);
    urlParams.set("chartEpitopes", JSON.stringify(tool.chartEpitopes));
    // Set the URL parameters for the protein options
    urlParams.set("proteinRepresentation", tool.proteinRepresentation);
    urlParams.set("selectionRepresentation", tool.selectionRepresentation);
    urlParams.set("backgroundRepresentation", tool.backgroundRepresentation);
    urlParams.set("ligandRepresentation", tool.ligandRepresentation);
    urlParams.set("proteinColor", tool.proteinColor);
    urlParams.set("backgroundColor", tool.backgroundColor);
    urlParams.set("ligandColor", tool.ligandColor);
    urlParams.set("proteinOpacity", tool.proteinOpacity);
    urlParams.set("selectionOpacity", tool.selectionOpacity);
    urlParams.set("backgroundOpacity", tool.backgroundOpacity);
    urlParams.set("showGlycans", tool.showGlycans);
    // Set the URL parameters for the filters
    urlParams.set("filters", JSON.stringify(tool.filters));

    // Update the URL
    window.history.replaceState(
      {},
      "",
      `${window.location.origin}${
        window.location.pathname
      }?${urlParams.toString()}`
    );
  }
}
