/**
 * Histogram utility functions based on scikit-image and numpy implementations
 */

/**
 * Compute histogram bins for an array
 * @param {Array} arr - Input array
 * @param {number} binCount - Number of bins
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value  
 * @param {boolean} normalize - Whether to normalize (default: false)
 * @returns {Uint32Array|Float64Array} Histogram bins
 */
export function bincount(arr, binCount, min, max, normalize = false) {
  if (min === undefined) min = Math.min(...arr);
  if (max === undefined) max = Math.max(...arr);
  const scale = (binCount - 1) / (max - min)

  let bins = new Uint32Array(binCount);
  for (let i = 0; i < arr.length; i++) {
    // Clamping not needed under the assumption items do not exceed min-max range, otherwise will overflow
    const bin = (arr[i] - min) * scale;
    bins[Math.floor(bin)]++;
  }
  
  if (normalize) {
    bins = Float64Array.from(bins, b => b / arr.length);
  }
  
  return bins;
}

/**
 * Cumulative sum of array
 * @param {Array} arr - Input array
 * @returns {Float64Array} Cumulative sum
 */
export function cumsum(arr) {
  const n = arr.length;
  const out = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += arr[i];
    out[i] = sum;
  }
  return out;
}

/**
 * Linear interpolation (numpy.interp equivalent)
 * @param {Array} x - X coordinates to interpolate
 * @param {Array} xp - Known x coordinates
 * @param {Array} fp - Known y coordinates
 * @returns {Float64Array} Interpolated values
 */
export function interp(x, xp, fp) {
  const out = new Float64Array(x.length);

  for (let i = 0; i < x.length; i++) {
    const xi = x[i];

    // Clamp left of xp[0]
    if (xi <= xp[0]) {
      out[i] = fp[0];
      continue;
    }
    // Clamp right of xp[-1]
    if (xi >= xp[xp.length - 1]) {
      out[i] = fp[fp.length - 1];
      continue;
    }

    // Linear scanning to find when indexed surpasses interpolant
    let j = 1;
    while (xi > xp[j]) j++;

    const x0 = xp[j - 1], x1 = xp[j];
    const y0 = fp[j - 1], y1 = fp[j];
    const t = (xi - x0) / (x1 - x0);
    out[i] = y0 + t * (y1 - y0);
  }

  return out;
}

/**
 * Get normalized CDF Cumulative Distribution Function for uint8 array
 * @param {Uint8Array} arr - Input array
 * @returns {Object} Object with bincounts and cdf properties
 */
export function getNormalizedCdfUint8(arr) {
  const bincounts = bincount(arr, 256, 0, 255, true);
  const cdf = cumsum(bincounts);
  return { bincounts, cdf };
}

/**
 * Compute mapping between source and target by matching CDFs
 * @param {Uint8Array} source - Source channel data
 * @param {Uint8Array} target - Target channel data
 * @returns {Object} Object with mapping, srcHist, and tgtHist
 */
export function matchCdf(source, target) {
  const srcCdf = getNormalizedCdfUint8(source);
  const tgtCdf = getNormalizedCdfUint8(target);
  const values = Array.from({ length: 256 }, (_, i) => i);
  const mapping = interp(srcCdf.cdf, tgtCdf.cdf, values);

  return {
    mapping, 
    srcHist: srcCdf.bincounts, 
    tgtHist: tgtCdf.bincounts
  };
}

/**
 * High-level, Main histogram matching function for 2 Uint8Arrays
 * @param {Uint8Array} source - Source image array
 * @param {Uint8Array} target - Target image array
 * @param {number} channels - Number of channels (default: 3)
 * @param {string} returnType - 'MAPPING' or 'MATCHED_DATA' (default: 'MATCHED_DATA')
 * @param {number} maxMpx - Max megapixels for downsampling (default: -1, no limit)
 * @returns {Object} Object with mappings and optionally matched data
 */
export function matchHistograms(source, target, channels = 3, returnType = 'MATCHED_DATA', maxMpx = -1) {
  // Calculate downsampling if needed
  let srcDownsample = 1, tgtDownsample = 1;
  if (maxMpx > 0) {
    srcDownsample = Math.ceil((source.length / channels / 1e6) / maxMpx);
    tgtDownsample = Math.ceil((target.length / channels / 1e6) / maxMpx);
    console.log('Downsampling factors', srcDownsample, tgtDownsample);
  }

  // Process RGB channels
  const mappings = [];
  for (let c = 0; c < Math.min(3, channels); c++) {
    const srcChannel = [];
    const tgtChannel = [];
    for (let i = c; i < source.length; i += channels * srcDownsample) {
      srcChannel.push(source[i]);
    }
    for (let i = c; i < target.length; i += channels * tgtDownsample) {
      tgtChannel.push(target[i]);
    }
    mappings[c] = matchCdf(srcChannel, tgtChannel);
  }

  if (returnType === 'MAPPING') return { mappings };

  // Apply mappings to create matched image
  const out = new Uint8Array(source.length);
  for (let i = 0; i < source.length; i += channels) {
    for (let c = 0; c < 3; c++) {
      out[i + c] = mappings[c].mapping[source[i + c]];
    }
    if (channels === 4) out[i + 3] = source[i + 3]; // keep alpha
  }

  return { mappings, matched: out };
}