import $ from 'jquery';
import { V, util, dia } from 'jointjs/src/core.mjs';

export const toSVG = function(paper, callback, opt) {

    opt = opt || {};

    if (paper === undefined) throw new Error('The the dia.Paper is a mandatory option.');

    paper.trigger('beforeexport', opt);

    // We'll be modifying `style` attribute of elements/nodes. Therefore,
    // we're making a deep clone of the whole SVG document.
    var exportSVG = V(paper.svg).clone();
    var exportNode = exportSVG.node;
    var exportViewport = exportSVG.findOne('.' + util.addClassNamePrefix('layers'));
    var viewportBBox = opt.area || paper.getContentArea();
    // Make the SVG dimensions as small as the viewport.
    // Note that those are set in the `viewBox` attribute rather then in the
    // `width`/`height` attributes. This allows for fitting the svg element inside containers.
    var dimensions = opt.preserveDimensions;
    if (dimensions) {
        exportSVG.attr({
            width: dimensions.width || viewportBBox.width,
            height: dimensions.height || viewportBBox.height
        });
    }
    // We're removing css styles from the svg container. (i.e background-image)
    // Set SVG viewBox starting at top-leftmost element's position (viewportBbox.x|y).
    // We're doing this because we want to trim the `whitespace` areas of the SVG making its size
    // as small as necessary.
    exportSVG.removeAttr('style').attr('viewBox', [
        viewportBBox.x,
        viewportBBox.y,
        viewportBBox.width,
        viewportBBox.height
    ].join(' '));
    // Remove the viewport transformation.
    // We do not want the resulting SVG to be scaled or translated.
    exportViewport.removeAttr('transform');

    if (opt.useComputedStyles !== false) {
        // Default branch (for backwards compatibility)
        copyExternalStyles(paper.svg, exportNode);
    }

    var stylesheet = opt.stylesheet;
    if (util.isString(stylesheet)) {
        // e.g [
        //     '.connection { fill: none }',
        //     '.connection-wrap, .marker-vertices, .marker-arrowheads, .link-tools { display: none }'
        // ].join('');
        addExternalStyles(exportSVG.node, stylesheet);
    }

    paper.trigger('afterexport', opt);

    const callbackWrapper = function() {

        const beforeSerializeFn = opt.beforeSerialize;
        if (typeof beforeSerializeFn === 'function') {
            const result = beforeSerializeFn.call(paper, exportNode, paper);
            if (result instanceof SVGElement) exportNode = result;
        }

        callback(serialize(exportNode));
    };

    if (opt.convertImagesToDataUris) {

        const exportImages = exportSVG.find('image');
        const deferredImages = exportImages.map(convertImage);
        $.when.apply($, deferredImages).then(() => callbackWrapper());

    } else {

        // Now, when our `exportSVG` is ready, serialize it to a string and return it.
        callbackWrapper();
    }
};

function convertImage(image) {

    var deffered = $.Deferred();
    // Firefox uses `href`, all the others 'xlink:href'
    var url = image.attr('xlink:href') || image.attr('href');
    util.imageToDataUri(url, function(err, dataUri) {
        if (!err && dataUri) {
            image.attr('xlink:href', dataUri);
        }
        deffered.resolve();
    });

    return deffered.promise();
}

function serialize(node) {
    // fix for invalid XML entities (no-break spaces) in Safari
    return (new XMLSerializer()).serializeToString(node).replace(/&nbsp;/g, '\u00A0');
}

function addExternalStyles(toNode, styles) {
    var doc = toNode.ownerDocument;
    var xml = doc.implementation.createDocument(null, 'xml', null);
    V(toNode).prepend(V('style', { type: 'text/css' }, [
        xml.createCDATASection(styles)
    ]));
}

function copyExternalStyles(fromNode, toNode) {

    var fromElements = Array.from(fromNode.querySelectorAll('*'));
    var toElements = Array.from(toNode.querySelectorAll('*'));

    // Now the fun part. The code below has one purpuse and i.e. store all the CSS declarations
    // from external stylesheets to the `style` attribute of the SVG document nodes.
    // This is achieved in three steps.

    // 1. Disabling all the stylesheets in the page and therefore collecting only default style values.
    //    This, together with the step 2, makes it possible to discard default CSS property values
    //    and store only those that differ.
    // 2. Enabling back all the stylesheets in the page and collecting styles that differ from the default values.
    // 3. Applying the difference between default values and the ones set by custom stylesheets
    //    onto the `style` attribute of each of the nodes in SVG.

    // Note that all of this would be much more simplified if `window.getMatchedCSSRules()` worked
    // in all the supported browsers. Pity is that it doesn't even work in WebKit that
    // has it (https://bugzilla.mozilla.org/show_bug.cgi?id=438278).
    // Pollyfil for Firefox can be https://gist.github.com/ydaniv/3033012;

    var doc = fromNode.ownerDocument;
    var styleSheetsCount = doc.styleSheets.length;
    var styleSheetsCopy = [];

    // 1.
    for (var i = styleSheetsCount - 1; i >= 0; i--) {

        // There is a bug (bugSS) in Chrome 14 and Safari. When you set stylesheet.disable = true it will
        // also remove it from document.styleSheets. So we need to store all stylesheets before
        // we disable them. Later on we put them back to document.styleSheets if needed.
        // See the bug `https://code.google.com/p/chromium/issues/detail?id=88310`.
        styleSheetsCopy[i] = doc.styleSheets[i];
        doc.styleSheets[i].disabled = true;
    }

    var defaultComputedStyles = {};

    fromElements.forEach(function(el, idx) {

        var computedStyle = window.getComputedStyle(el, null);
        // We're making a deep copy of the `computedStyle` so that it's not affected
        // by that next step when all the stylesheets are re-enabled again.
        var defaultComputedStyle = {};
        util.forIn(computedStyle, function(property) {
            defaultComputedStyle[property] = computedStyle.getPropertyValue(property);
        });

        defaultComputedStyles[idx] = defaultComputedStyle;
    });


    // bugSS: Check whether the stylesheets have been removed from document.styleSheets
    if (styleSheetsCount != doc.styleSheets.length) {
        // bugSS: Copy all stylesheets back
        styleSheetsCopy.forEach(function(copy, i) {
            doc.styleSheets[i] = copy;
        });
    }

    // 2.
    // bugSS: Note that if stylesheet bug happen the document.styleSheets.length is still 0.
    for (var j = 0; j < styleSheetsCount; j++) {
        doc.styleSheets[j].disabled = false;
    }
    // bugSS: Now is document.styleSheets.length = number of stylesheets again.

    var customStyles = {};

    fromElements.forEach(function(el, idx) {

        var computedStyle = window.getComputedStyle(el, null);
        var defaultComputedStyle = defaultComputedStyles[idx];
        var customStyle = {};

        util.forIn(computedStyle, function(property) {
            // Ignore string indexes e.g. "15"
            if (!isNaN(property)) return;
            // Store only those that differ from the default styles applied by the browser.
            // TODO: Problem will arise with browser specific properties (browser prefixed ones).
            if (computedStyle.getPropertyValue(property) !== defaultComputedStyle[property]) {
                customStyle[property] = computedStyle.getPropertyValue(property);
            }
        });

        customStyles[idx] = customStyle;
    });

    // 3.
    toElements.forEach(function(el, idx) {
        $(el).css(customStyles[idx]);
    });
}

// Just a little helper for quick-opening the paper as data-uri SVG in a new browser window.
export const openAsSVG = function(paper, opt) {

    var windowFeatures = 'menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes';
    var windowName = util.uniqueId('svg_output');

    toSVG(paper, function(svg) {

        var imageWindow = window.open('', windowName, windowFeatures);
        var dataImageUri = 'data:image/svg+xml,' + encodeURIComponent(svg);
        imageWindow.document.write('<img src="' + dataImageUri + '" style="max-height:100%" />');

    }, util.assign({ convertImagesToDataUris: true }, opt));
};

dia.Paper.prototype.toSVG = function() {
    return toSVG.apply(this, [this, ...arguments]);
};

dia.Paper.prototype.openAsSVG = function() {
    return openAsSVG.apply(this, [this, ...arguments]);
};
