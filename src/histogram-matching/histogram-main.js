import { matchHistograms } from './histogram-utils.js';

/**
 * Check if file is GeoTIFF
 * @param {File|string} fileOrUrl - File object or data URL
 * @returns {boolean} True if GeoTIFF
 */
function isGeoTIFF(fileOrUrl) {
  return (typeof fileOrUrl !== "string" && fileOrUrl.type === "image/tiff") ||
          (typeof fileOrUrl === "string" && fileOrUrl.startsWith("data:image/tiff;base64,"));
}

/**
 * Load image (regular or GeoTIFF)
 * @param {File|string} fileOrUrl - File object or URL
 * @param {string} slot - 'source' or 'target'
 * @param {number} maxMpx - Max megapixels for processing
 * @returns {Promise<void>}
 */
async function loadImage(fileOrUrl, slot, maxMpx = -1) {
  try {
    if (isGeoTIFF(fileOrUrl)) {
      await loadGeoTIFF(fileOrUrl, slot, maxMpx);
    } else {
      await loadRegularImage(fileOrUrl, slot, maxMpx);
    }
  } catch (error) {
    console.error(`Failed to load ${slot} image:`, error);
    throw error;
  }
}

/**
 * Load regular image (PNG, JPEG)
 * @param {File|string} fileOrUrl - File object or URL
 * @param {string} slot - 'source' or 'target'
 * @param {number} maxMpx - Max megapixels for processing
 * @returns {Promise<void>}
 */
async function loadRegularImage(fileOrUrl, slot, maxMpx) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        imageObjects[slot] = { ctx, img, canvas };
        document.getElementById(slot + "-img-div").replaceChildren(img);

        if (imageObjects.source && imageObjects.target) {
          await processMatching(maxMpx);
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${fileOrUrl}`));
    img.src = fileOrUrl;
  });
}

/**
 * Load GeoTIFF image
 * @param {File|string} fileOrUrl - File object or data URL
 * @param {string} slot - 'source' or 'target'
 * @param {number} maxMpx - Max megapixels for processing
 * @returns {Promise<void>}
 */
async function loadGeoTIFF(fileOrUrl, slot, maxMpx) {
  const { fromArrayBuffer } = await import("https://esm.sh/geotiff@2.1.4-beta.0");
  
  let arrayBuffer;
  if (typeof fileOrUrl === "string") {
    const base64 = fileOrUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    arrayBuffer = bytes.buffer;
  } else {
    arrayBuffer = await fileOrUrl.arrayBuffer();
  }

  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const rasters = await image.readRasters({ interleave: true });

  const width = image.getWidth();
  const height = image.getHeight();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(rasters);
  ctx.putImageData(imageData, 0, 0);

  imageObjects[slot] = {
    ctx,
    canvas,
    geoMetadata: {
      geoKeys: image.getGeoKeys(),
      fileDirectory: image.fileDirectory,
      image
    }
  };

  document.getElementById(slot + "-img-div").replaceChildren(canvas);
  
  if (imageObjects.source && imageObjects.target) {
    await processMatching(maxMpx);
  }
}

/**
 * Process histogram matching between loaded images
 * @param {number} maxMpx - Max megapixels for processing
 * @returns {Promise<void>}
 */
async function processMatching(maxMpx = -1) {
  const sourceCanvas = imageObjects.source.canvas;
  const targetCanvas = imageObjects.target.canvas;
  const sourceArr = imageObjects.source.ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
  const targetArr = imageObjects.target.ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height).data;

  // Perform histogram matching
  const start = Date.now();
  const matched = matchHistograms(sourceArr, targetArr, 4, 'MATCHED_DATA', maxMpx);
  const elapsed_ms = Date.now() - start;

  // Create output canvas
  const outCanvas = document.createElement("canvas");
  outCanvas.width = sourceCanvas.width;
  outCanvas.height = sourceCanvas.height;
  const ctxOut = outCanvas.getContext("2d");
  const outData = ctxOut.createImageData(outCanvas.width, outCanvas.height);
  outData.data.set(matched.matched);
  ctxOut.putImageData(outData, 0, 0);

  // Display results and handle exports
  await displayResults(outCanvas, matched, elapsed_ms, maxMpx);
}

/**
 * Display processing results
 * @param {HTMLCanvasElement} outCanvas - Output canvas
 * @param {Object} matched - Matching results
 * @param {number} elapsed_ms - Processing time
 * @returns {Promise<void>}
 */
async function displayResults(outCanvas, matched, elapsed_ms, maxMpx) {
  const container = document.getElementById('matched-img-div');

  // Make download Link/Button
  const headerContainer = document.getElementById('matched-header');
  const a = document.createElement("a");
  headerContainer.innerHTML = 'MATCHED OUTPUT <br/>';
  headerContainer.appendChild(a);
  a.innerHTML = '<button type="button">Download</button>'
  a.download = 'sourced-geotiff-matched-to-target.tiff';

  // Convert to image and display
  outCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const img = document.createElement("img");
    img.src = url;
    a.href = url;
    container.replaceChildren(img);

    // Add statistics
    const statsDiv = document.getElementById('output-stats')
    // const statsDiv = document.createElement("pre");
    // statsDiv.className = "stats";
    // statsDiv.style = 'text-align: left; padding: 20px;'
    const sourceMpix = (imageObjects.source.canvas.width * imageObjects.source.canvas.height / 1e6).toFixed(2);
    const targetMpix = (imageObjects.target.canvas.width * imageObjects.target.canvas.height / 1e6).toFixed(2);
    statsDiv.textContent = `Histogram matching took ${elapsed_ms}ms (maxMpx: ${maxMpx <= 0 ? 'uncapped' : maxMpx + 'Mpx'})\nSource: ${sourceMpix}Mpx (${imageObjects.source.canvas.width} x ${imageObjects.source.canvas.height})\nTarget: ${targetMpix}Mpx (${imageObjects.target.canvas.width} x ${imageObjects.target.canvas.height})`;
    // statsContainer.replaceChildren(statsDiv);
  }, "image/png");

  // Handle GeoTIFF export
  if (imageObjects.source.geoMetadata) {
    const outUrl = await exportGeoTIFF(matched.matched, imageObjects.source.geoMetadata);
    a.href = outUrl;
    // downloadFile(outUrl, 'histogram-matched-geotiff.tiff');
  }

  // Render Histograms
  renderHistograms(matched.mappings)
}

/**
 * Export GeoTIFF file
 * @param {Uint8Array} raster - Image data
 * @param {Object} geoMetadata - Geospatial metadata
 * @returns {Promise<string>} Download URL
 */
async function exportGeoTIFF(raster, geoMetadata) {
  const { writeArrayBuffer } = await import("https://esm.sh/geotiff@2.1.4-beta.0");
  
  const { ModelPixelScale, ModelTiepoint, ImageWidth: width, ImageLength: height } = geoMetadata.fileDirectory;
  const metadata = {
    GeographicTypeGeoKey: geoMetadata.geoKeys.GeographicTypeGeoKey,
    width,
    height,
    ModelPixelScale,
    ModelTiepoint,
  };

  const arrayBuffer = await writeArrayBuffer(raster, metadata);
  const blob = new Blob([arrayBuffer], { type: "image/tiff" });
  return URL.createObjectURL(blob);
}

/**
 * Get current maxMpx value from input
 * @returns {number} Current maxMpx value
 */
function getInputMaxMpx() {
  const input = document.getElementById('max-mpx-input');
  return input ? parseFloat(input.value) || 0 : 0;
}

/**
 * Handle file input change
 * @param {Event} e - Input change event
 */
function handleFileInput(e) {
  const maxMpx = getInputMaxMpx()
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (ev) => {
    const slot = e.target.id.includes('source') ? 'source' : 'target';
    loadImage(ev.target.result, slot, maxMpx);
  };
  reader.readAsDataURL(file);
}


// -------------------------------------
// Chartjs for plotting histograms
// -------------------------------------

/**
 * Render histogram chart
 * @param {Object} histData - Histogram data with R, G, B properties
 * @param {HTMLElement} element - DOM element to render chart
 * @param {string} title - Chart title
 * @returns {Chart} Chart.js instance
 */
function renderHistogram(histData, element, title = 'Histogram') {
  const commonLineOpts = {
    fill: true,
    pointRadius: 0,
    borderWidth: 1,
  };

  const histChartOpts = {
    plugins: { 
      title: { display: true, text: title }, 
      legend: { display: false }, 
      tooltip: { enabled: false }
    },
    scales: {
      x: {
        type: 'linear',   
        ticks: { display: false, stepSize: 50 },
        grid: { display: true },
      },
      y: {
        type: 'linear',
        ticks: { display: false, stepSize: 0.005 },
        grid: { display: true }, 
      }
    }
  };

  // Destroy existing chart if present
  if (Chart.getChart(element)) {
    Chart.getChart(element).destroy();
  }

  const chart = new Chart(element, {
    type: 'line',
    data: {
      labels: Array.from({ length: histData.R.length }, (_, i) => i),
      datasets: [
        {
          data: histData.R,
          borderColor: 'rgba(255,0,0,0.8)',
          backgroundColor: 'rgba(255,0,0,0.15)',
          ...commonLineOpts
        },
        {
          data: histData.G,
          borderColor: 'rgba(0,255,0,0.8)',
          backgroundColor: 'rgba(0,255,0,0.15)',
          ...commonLineOpts
        },
        {
          data: histData.B,
          borderColor: 'rgba(0,0,255,0.8)',
          backgroundColor: 'rgba(0,0,255,0.15)',
          ...commonLineOpts
        }
      ]
    },
    options: histChartOpts
  });

  return chart;
}

/**
 * Get or create histogram canvas element
 * @param {string} containerId - Container element ID
 * @param {string} canvasId - Canvas element ID
 * @returns {HTMLElement} Canvas element
 */
function getOrCreateHistogramCanvas(containerId, canvasId) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = canvasId;
    document.getElementById(containerId).replaceChildren(canvas);
  }
  return canvas;
}

/**
 * Render histograms for source and target images
 * @param {Array} mappings - Histogram mappings from processing
 */
function renderHistograms(mappings) {
  // Create histogram canvases if they don't exist
  const srcHistCanvas = getOrCreateHistogramCanvas('source-hist-chart', 'source-histogram');
  const tgtHistCanvas = getOrCreateHistogramCanvas('target-hist-chart', 'target-histogram');

  // Prepare histogram data
  const srcHistData = { 
    R: mappings[0].srcHist, 
    G: mappings[1].srcHist, 
    B: mappings[2].srcHist 
  };
  const tgtHistData = { 
    R: mappings[0].tgtHist, 
    G: mappings[1].tgtHist, 
    B: mappings[2].tgtHist 
  };

  // Render charts
  charts.source = renderHistogram(srcHistData, srcHistCanvas, 'Source Histogram');
  charts.target = renderHistogram(tgtHistData, tgtHistCanvas, 'Target Histogram');
}


// -------------------------------------
// Main application initialization
// -------------------------------------

// Global variables
let charts = {}
let imageObjects = {}

/**
 * Set up DOM event listeners
 */
function setupEventListeners() {
  const sourceInput = document.getElementById("source-input");
  const targetInput = document.getElementById("target-input");
  const maxMpxInput = document.getElementById("max-mpx-input");
  
  if (sourceInput) {
    sourceInput.addEventListener("change", (e) => handleFileInput(e));
  }
  if (targetInput) {
    targetInput.addEventListener("change", (e) => handleFileInput(e));
  }
  if (maxMpxInput) {
    maxMpxInput.addEventListener("change", async (e) => {
      const maxMpx = getInputMaxMpx()
      await processMatching(maxMpx)
    });
  }
}

/**
 * Load default images if available
 */
async function loadDefaultImages() {
  const maxMpx = getInputMaxMpx()
  console.log('maxMpx', maxMpx)
  try {
    await Promise.allSettled([
      loadImage('./source1.jpg', "source", maxMpx),
      loadImage('./reference1.jpg', "target", maxMpx)
    ]);
  } catch (error) {
    console.log('Default images not available, waiting for user input');
  }
}

// Initialize application when DOM is ready
function init() {
  setupEventListeners();
  loadDefaultImages();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}