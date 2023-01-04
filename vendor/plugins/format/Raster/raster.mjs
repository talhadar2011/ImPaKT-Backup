import { g, util, dia } from 'jointjs/src/core.mjs';
import { toSVG } from '../SVG/svg.mjs';

/**
 * @public
 * @param paper
 * @param {function} callback
 * @param {{width?:number, height?: number, size?:string, padding?: Object|number type: string backgroundColor: string quality: string, canvg?: Object }} opt
 */
export const toDataURL = function(paper, callback, opt = {}) {

    if (paper === undefined) throw new Error('The the dia.Paper is a mandatory argument.');

    /* global canvg:true */
    const canvgUtil = opt.canvg || (typeof canvg !== 'undefined' ? canvg : undefined);
    /* global canvg:false */

    var clientRect = opt.area || paper.paperToLocalRect(paper.getContentBBox());
    var svgViewBox = createSVGViewBox(clientRect, opt);

    var dimensions = (util.isNumber(opt.width) && util.isNumber(opt.height)) ? opt : svgViewBox;
    var rasterSize = scaleRasterSize(dimensions, getScale(opt.size));
    if (!isCanvasSizeAllowed(rasterSize.width, rasterSize.height)) {
        throw new Error('dia.Paper: raster size exceeded.');
    }

    var img = new Image();
    var svg;

    // Drawing an image into the canvas has to be done after the image was completely loaded.
    img.onload = function() {

        var dataURL, context, canvas;

        // Helper to create a new canvas.
        function createCanvas() {

            canvas = document.createElement('canvas');
            canvas.width = rasterSize.width;
            canvas.height = rasterSize.height;

            // Draw rectangle of a certain color covering the whole canvas area.
            // A JPEG image has black background by default and it might not be desirable.
            context = canvas.getContext('2d');
            context.fillStyle = opt.backgroundColor || 'white';
            context.fillRect(0, 0, rasterSize.width, rasterSize.height);
        }

        // Helper to read the canvas
        function readCanvas() {

            // Try to read the content of our canvas.
            dataURL = canvas.toDataURL(opt.type, opt.quality);
            // Return dataURL in the given callback.
            callback(dataURL);

            stopTimer();
        }

        function stopTimer() {
            if (canvas.svg && util.isFunction(canvas.svg.stop)) {
                // Clear the interval that is set up by the Canvg lib.
                setTimeout(canvas.svg.stop, 1);
            }
        }

        createCanvas();

        // Drawing SVG images can taint our canvas in some browsers. That means we won't be able
        // to read canvas back as it would fail with `Error: SecurityError: DOM Exception 18`.
        // See `http://getcontext.net/read/chrome-securityerror-dom-exception-18`.
        try {

            // Draw the image to the canvas with native `drawImage` method.
            context.drawImage(img, 0, 0, rasterSize.width, rasterSize.height);

            readCanvas();

        } catch (e) {

            // The security error was thrown. We have to parse and render the SVG image with
            // `canvg` library (https://code.google.com/p/canvg/).
            if (typeof canvgUtil === 'undefined') {

                // The library is not present.
                console.error('Canvas tainted. Canvg library required.');
                return;
            }

            // The canvas was tainted. We need to render a new one. Clearing only the content won't help.
            createCanvas();

            // Draw the SVG with canvg library.
            var canvgOpt = {
                ignoreDimensions: true,
                ignoreClear: true,
                ignoreMouse: true,
                ignoreAnimation: true,
                offsetX: 0,
                offsetY: 0,
                useCORS: true
            };

            canvgUtil(canvas, svg, util.assign(canvgOpt, {

                forceRedraw: function() {
                    // Force the redraw only the first time.
                    // Important in case the canvg is waiting for images to be loaded.
                    if (this.called) {
                        return false;
                    }
                    this.called = true;

                    return true;
                }.bind({ called: false }),

                renderCallback: function() {

                    try {

                        readCanvas();

                    } catch (e) {


                        stopTimer();
                        // As IE throws security error when trying to
                        // draw an SVG into the canvas that contains (even though data-uri'ed)
                        // <image> element with another SVG in it, we apply a little trick here.
                        // The trick is in replacing all <image> elements that have
                        // SVG in xlink:href with embedded <svg> elements.
                        svg = replaceSVGImagesWithSVGEmbedded(svg);

                        // And try again. If even this fails, there is no hope.
                        createCanvas();

                        canvgUtil(canvas, svg, util.assign(canvgOpt, { renderCallback: readCanvas }));
                    }
                }
            }));
        }
    };

    toSVG(paper, function(svgString) {

        // Setting the svg string for Canvg
        svg = svgString;
        // An image starts loading when we assign its source.
        img.src = 'data:image/svg+xml,' + encodeURIComponent(svgString);

    }, {
        paper: paper,
        convertImagesToDataUris: true,
        beforeSerialize: opt.beforeSerialize,
        area: svgViewBox,
        useComputedStyles: opt.useComputedStyles,
        stylesheet: opt.stylesheet,
        // A canvas doesn't like width and height to be defined as percentage for some reason. We need to replace it
        // with desired width and height instead.
        preserveDimensions: {
            width: rasterSize.width,
            height: rasterSize.height
        }
    });
};

/**
 * @param paper
 * @param {function} callback
 * @param {Object} opt
 */
export const toPNG = function(paper, callback, opt) {

    // options: width, height, backgroundColor
    opt = opt || {};
    opt.type = 'image/png';
    toDataURL(paper, callback, opt);
};

/**
 * @param paper
 * @param {function} callback
 * @param {Object} opt
 */
export const toJPEG = function(paper, callback, opt) {

    // options: width, height, backgroundColor, quality
    opt = opt || {};
    opt.type = 'image/jpeg';
    toDataURL(paper, callback, opt);
};

/**
 * Just a little helper for quick-opening the paper as PNG in a new browser window.
 * @param paper
 */
export const openAsPNG = function(paper, opt) {

    var windowFeatures = 'menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes';
    var windowName = util.uniqueId('png_output');

    toPNG(paper, function(dataURL) {

        var imageWindow = window.open('', windowName, windowFeatures);
        imageWindow.document.write('<img src="' + dataURL + '"/>');

    }, util.assign({ padding: 10 }, opt));
};

function isCanvasSizeAllowed(width, height) {

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var x = width - 1;
    var y = height - 1;
    var context = canvas.getContext('2d');
    try {
        context.fillStyle = 'rgb(1,1,1)';
        context.fillRect(x, y, 1, 1);
        var rgba = context.getImageData(x, y, 1, 1).data;
        if (rgba[0] !== 1 || rgba[1] !== 1 || rgba[2] !== 1) {
            // Chrome, IE
            return false;
        }
    } catch (e) {
        // Firefox
        return false;
    }

    return true;
}

/**
 * @private
 * @param {{x:number, y:number, width:number, height:number}} clientBox
 * @param {{width?:number, height?: number, size?:string, padding?: Object|number}} opt
 * @returns {rect}
 */
function createSVGViewBox(clientBox, opt) {

    var padding = getPadding(opt);

    var paddingBox = g.rect({
        x: -padding.left,
        y: -padding.top,
        width: padding.left + padding.right,
        height: padding.top + padding.bottom
    });

    if (opt.width && opt.height) {

        var paddingWidth = clientBox.width + padding.left + padding.right;
        var paddingHeight = clientBox.height + padding.top + padding.bottom;

        paddingBox.scale(paddingWidth / opt.width, paddingHeight / opt.height);
    }

    return g.Rect(clientBox).moveAndExpand(paddingBox);
}

/**
 * @private
 * @param {string} size Size of the image could be also changed by a factor e.g, 0.5x, 2x, 4x
 * @returns {number}
 */
function getScale(size) {

    var scale = 1;

    if (size !== undefined) {
        scale = parseFloat(size);
        if (!Number.isFinite(scale) || scale === 0) {
            throw new Error('dia.Paper: invalid raster size (' + size + ')');
        }
    }
    return scale;
}

/**
 * @param {{width: number, height: number}} size
 * @param {number} scale
 * @returns {{width: number, height: number}}
 */
function scaleRasterSize(size, scale) {

    // the dimensions of the output image
    return {
        width: Math.max(Math.round(size.width * scale), 1),
        height: Math.max(Math.round(size.height * scale), 1)
    };
}

/**
 * @private
 * @param {{width?, height?, padding}}opt
 * @returns {{top, bottom, left, right}}
 */
function getPadding(opt) {

    var padding = util.normalizeSides(opt.padding);
    if (opt.width && opt.height) {

        // The content has to be at least 1px wide.
        if (padding.left + padding.right >= opt.width) {
            padding.left = padding.right = 0;
        }

        // The content has to be at least 1px high.
        if (padding.top + padding.bottom >= opt.height) {
            padding.top = padding.bottom = 0;
        }
    }

    return padding;
}

function replaceSVGImagesWithSVGEmbedded(svg) {

    return svg.replace(/<image[^>]*>/g, function(imageTag) {

        var match = imageTag.match(/href="([^"]*)"/);
        var href = match && match[1];
        var svgDataUriPrefix = 'data:image/svg+xml';

        if (href && href.substr(0, svgDataUriPrefix.length) === svgDataUriPrefix) {
            var svg = atob(href.substr(href.indexOf(',') + 1));
            return svg.substr(svg.indexOf('<svg'));
        }

        return imageTag;
    });
}

// for the backward compatibility:

dia.Paper.prototype.openAsPNG = function(opt) {
    return openAsPNG.apply(this, [this, ...arguments]);
};

dia.Paper.prototype.toJPEG = function(callback, opt) {
    return toJPEG.apply(this, [this, ...arguments]);
};

dia.Paper.prototype.toPNG = function(callback, opt) {
    return toPNG.apply(this, [this, ...arguments]);
};

dia.Paper.prototype.toDataURL = function(callback, opt) {
    return toDataURL.apply(this, [this, ...arguments]);
};
