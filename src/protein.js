import * as NGL from "ngl";
import * as d3 from "d3";
import { summarizeMetricData, invertColor } from "./utils.js";

export class Protein {
  /**
   * Class constructor with initial configuration
   * @param {Object}
   * @param {Object}
   */
  constructor(_config, _data) {
    this.config = _config;
    this.config = {
      parentElement: _config.parentElement,
      experiment: _config.experiment,
      proteinEpitope: _config.proteinEpitope,
      summary: _config.summary,
      floor: _config.floor,
      pdbID: _config.pdbID,
      dispatch: _config.dispatch,
      stageColor: "#FFFFFF",
      proteinRepresentation: "cartoon",
      selectionRepresentation: "spacefill",
      backgroundRepresentation: "rope",
      proteinColor: "#D3D3D3",
      backgroundColor: "#D3D3D3",
      showGlycans: false,
    };
    this.data = _data;

    // Clear any stage
    document.getElementById(this.config.parentElement).innerHTML = "";

    // Initialize the stage object for the parent element
    this.stage = new NGL.Stage(this.config.parentElement, {
      backgroundColor: this.config.stageColor,
    });

    // Set the initial size of the stage
    this.resize();

    // Load the protein structure
    this.load(this.config.pdbID);
  }
  /**
   * Load in the protein structure from a URL
   * @param {String}
   */
  load(pdbID) {
    let protein = this;

    // Determine if the strcutre is a file or a URL
    if (pdbID.length == 4) {
      // Set the pdbURL to the RCSB PDB URL
      protein.pdbURL = `rcsb://${pdbID}`;
      protein.loadConfig = {};
    } else {
      // Set the pdbURL to the local file
      protein.pdbURL = new Blob([pdbID], { type: "text/plain" });
      protein.loadConfig = { ext: "pdb" };
    }

    // Determine how to handle the chains in the protein structure
    protein.dataChains = protein.data[protein.config.experiment].dataChains;
    protein.excludeChains =
      protein.data[protein.config.experiment].excludeChains;

    // Make the selection of chains to include in the protein structure
    if (protein.dataChains != "polymer") {
      protein.dataChainSelection = `:${protein.dataChains.join(" or :")}`;
      protein.backgroundChainSelection = `not :${protein.dataChains.join(
        " and not :"
      )}`;
      if (protein.excludeChains != "none") {
        protein.backgroundChainSelection += ` and not :${protein.excludeChains.join(
          " and not :"
        )}`;
      }
    } else {
      protein.dataChainSelection = "polymer";
      protein.backgroundChainSelection = "none";
    }

    // Load the structure from a URL
    protein.stage
      .loadFile(protein.pdbURL, protein.loadConfig)
      .then(function (comp) {
        // Add base protein representation
        comp.addRepresentation(protein.config.proteinRepresentation, {
          sele: protein.dataChainSelection,
          color: protein.config.proteinColor,
        });

        // Add background representation for non-data chains and non-excluded chains
        if (protein.backgroundChainSelection != "none") {
          comp.addRepresentation(protein.config.backgroundRepresentation, {
            sele: protein.backgroundChainSelection,
            color: protein.config.backgroundColor,
          });
        }

        // If ligands is true, add a representation of the ligands
        if (protein.config.showGlycans) {
          comp.addRepresentation("ball+stick", {
            sele: "ligand",
            color: "element",
          });
        }

        // Set the rotation of the structure upright by 90 degrees
        comp.setRotation([-Math.PI / 2, 0, 0]);
        protein.stage.autoView();

        // Protein structure
        protein.component = comp;

        // Make test color scheme
        protein.makeColorScheme();

        // Attach dispatch event
        protein.config.dispatch.on("updateSites", (d) => {
          protein.selectSites(d);
        });
      });

    // Add a custom tooltip to the protein structure
    // remove the old tooltip if it exists
    if (document.querySelector(".protein-tooltip")) {
      document.querySelector(".protein-tooltip").remove();
    }

    // Create a new tooltip and add it to the body
    const tooltip = document.createElement("div");
    tooltip.className = "protein-tooltip";
    document.body.appendChild(tooltip);

    // Add a tooltip to the protein structure
    protein.stage.mouseControls.remove("hoverPick");
    protein.stage.signals.hovered.add(function (pickingProxy) {
      if (pickingProxy && pickingProxy.atom) {
        let atom = pickingProxy.atom;
        // Tooltip content
        tooltip.innerHTML = `Site: ${atom.resno} </br > Residue: ${
          atom.resname
        }${protein._getOneLetterCode(atom.resname)} </br > Chain: ${
          atom.chainname
        }`;
        tooltip.style.display = "block";
      } else {
        tooltip.style.display = "none";
      }
    });

    // Register an event lister for mouse position on the viewport
    protein.stage.viewer.container.addEventListener("mousemove", (e) => {
      tooltip.style.top = e.pageY - 10 + "px";
      tooltip.style.left = e.pageX + 10 + "px";
    });

    // Set tooltip display to none when the mouse leaves the viewport
    protein.stage.viewer.container.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
  }
  /**
   * Clear the protein structure and reload it
   */
  clear() {
    let protein = this;
    // Clear the protein structure
    protein.stage.removeAllComponents();
    protein.load(protein.config.pdbID);
  }

  /**
   * Make and Update the color scheme for the protein
   */
  makeColorScheme() {
    let protein = this;

    // Process DATA
    protein.mutMetric = protein.data[protein.config.experiment].mut_metric_df;
    protein.mutMetricSummary = summarizeMetricData(protein.mutMetric).filter(
      (e) => e.epitope === protein.config.proteinEpitope
    );

    // Make the COLOR SCALE
    protein.positiveColor =
      protein.data[protein.config.experiment].epitope_colors[
        protein.config.proteinEpitope
      ];
    protein.negativeColor = invertColor(protein.positiveColor);
    // Color is dynamic depending on whether the data is floored
    protein.colorAccessor = (d) => {
      return protein.config.floor && d[protein.config.summary] < 0
        ? 0
        : d[protein.config.summary];
    };
    protein.metricExtent = d3
      .extent(protein.mutMetricSummary, protein.colorAccessor)
      .map(Math.abs);
    // Make the color scale
    if (!protein.config.floor) {
      protein.colorScale = d3
        .scaleLinear()
        .domain([
          -d3.max(protein.metricExtent),
          0,
          d3.max(protein.metricExtent),
        ])
        .range([protein.negativeColor, "white", protein.positiveColor]);
    } else {
      protein.colorScale = d3
        .scaleLinear()
        .domain([0, d3.max(protein.mutMetricSummary, protein.colorAccessor)])
        .range(["white", protein.positiveColor]);
    }
    // Use the scale function to map data to a color
    protein.colorMap = new Map(
      protein.mutMetricSummary.map((d) => {
        return [
          parseInt(d.site_protein),
          protein.colorScale(d[protein.config.summary]),
        ];
      })
    );

    // Define a schemeId with the color registry for this data combination
    protein.schemeId = NGL.ColormakerRegistry.addScheme(function () {
      this.atomColor = (atom) => {
        if (protein.colorMap.has(atom.resno)) {
          // Color by array of metric summary - must be hexbase integer
          return parseInt(
            d3.color(protein.colorMap.get(atom.resno)).formatHex().slice(1),
            16
          );
        } else {
          // Use the background color for the rest of the protein
          return parseInt(protein.config.proteinColor.slice(1), 16);
        }
      };
    });

    // Run selectSites to update the color scheme
    protein.selectSites(d3.selectAll(".selected").data());
  }
  /**
   * Format site string for selection
   * @param {Int16Array}
   * @param {String}
   */
  _makeSiteString(site, chain) {
    return `${chain != "polymer" ? ":" : ""}${chain} and ${site} and protein`;
  }
  /**
   * Select sites on the protein structure to color
   * @param {Array}
   */
  selectSites(data) {
    let protein = this;

    // Define a placeholder for the selected sites
    protein.selectedSitesStrings = [];

    // Iterate over each selected data point
    data.forEach((d) => {
      // Get the residue number on the protein structure
      const site = d.site_protein;
      // Get the chains on the protein structure for this site
      const chains = d.site_chain.split(" ");

      // Only make site strings for site on the protein structure
      if (isNaN(parseInt(site))) {
        return;
      } else {
        // For each chain in chains, make the site string
        const siteStrings = chains
          .map((chain) => protein._makeSiteString(site, chain))
          .join(" or ");
        // Add the site string to the array of selected sites
        protein.selectedSitesStrings.push(siteStrings);
      }
    });

    // Convert the selected sites into a selection string
    protein.currentSelectionSiteString = protein.selectedSitesStrings.length
      ? protein.selectedSitesStrings.join(" or ")
      : undefined;

    // Create a representation of the selected sites on the protein structure
    if (protein.currentSelectionSiteString !== undefined) {
      protein.stage.getRepresentationsByName("currentSelection").dispose();
      return protein.component
        .addRepresentation(protein.config.selectionRepresentation, {
          color: protein.schemeId,
          roughness: 1,
          name: "currentSelection",
          surfaceType: "av",
        })
        .setSelection(protein.currentSelectionSiteString);
    } else {
      protein.stage.getRepresentationsByName("currentSelection").dispose();
    }
  }
  /**
   * Convert the three letter code to a one letter code
   * @param {String}
   */
  _getOneLetterCode(threeLetterCode) {
    const aminoAcidMap = {
      ALA: "A",
      ARG: "R",
      ASN: "N",
      ASP: "D",
      CYS: "C",
      GLU: "E",
      GLN: "Q",
      GLY: "G",
      HIS: "H",
      ILE: "I",
      LEU: "L",
      LYS: "K",
      MET: "M",
      PHE: "F",
      PRO: "P",
      SER: "S",
      THR: "T",
      TRP: "W",
      TYR: "Y",
      VAL: "V",
      SEC: "U",
      PYL: "O",
    };
    return ` (${aminoAcidMap[threeLetterCode.toUpperCase()]})` || "";
  }
  resize() {
    let protein = this;

    // Get the height of the window, header, and chart
    const windowHeight = window.innerHeight;
    const headerHeight = document.querySelector(".header").offsetHeight;
    const chartHeight = document.querySelector(".chart").offsetHeight;
    // Margin below the protein viewport
    const margins = 50;
    // Calculate the remaining height
    const proteinHeight = windowHeight - headerHeight - chartHeight - margins;
    document.querySelector(".protein").style.height = `${proteinHeight}px`;
    // Handle the resize event for the protein structure
    protein.stage.handleResize();
    // Reset the Zoom
    protein.stage.autoView();
  }
}
