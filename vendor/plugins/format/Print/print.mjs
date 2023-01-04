import $ from 'jquery';
import { V, g, util, dia } from 'jointjs/src/core.mjs';

/*
    Gotcha's:
    * IE won't show background images and colors unless the "Print background colors and images" option is on. [1]
    * SVG filters are removed if their ID attribute conflicts with other elements in the DOM. [2]

    [1] https://support.microsoft.com/en-us/kb/296326
    [2] https://stackoverflow.com/questions/19042282/svg-filters-after-cloning-svg
*/
var MAX_ROWS = 200;
var MAX_COLUMNS = 200;

dia.Paper.prototype.print = function(opt) {

    var options = resolveOptions(opt);
    var pages = preparePages.call(this, options);
    var printAction = function(pages) {
        sendToPrinter.call(this, pages, opt)
    };

    var args = {
        sheetSizePx: getSheetSizePx(options)
    };

    options.ready(pages, printAction.bind(this), args);
};

/**
 * @param areaToPrintBBox
 * @param opt
 * @returns {{$el: jQuery, css: Object}}
 */
dia.Paper.prototype.preparePrintArea = function(areaToPrintBBox, opt) {

    this.trigger('beforeprint', opt);

    var $printArea = $('<div/>').addClass('printarea');
    var $printPaper = $('<div/>').addClass(util.addClassNamePrefix('print-paper')).css('position', 'relative');

    // deprecated option
    if (opt.size) {
        $printArea.addClass('printarea-size-' + opt.size);
    }

    var printSVGVel = V(this.svg).clone();
    var printLayersVel = printSVGVel.findOne(`.${util.addClassNamePrefix('layers')}`);
    $printPaper.append(printSVGVel.node);

    var sheetSizePx = getSheetSizePx(opt);
    var paperBBox = this.getArea();

    var { sx, sy } = this.scale();
    var { tx, ty } = this.translate();
    var printMatrix = V.createSVGMatrix().translate(tx / sx, ty / sy);

    var { scaleToFit, bBox } = getViewBox(paperBBox, areaToPrintBBox, sheetSizePx);

    $printPaper.css({
        left: 0,
        top: 0
    });

    printSVGVel.attr({
        width: bBox.width * scaleToFit,
        height: bBox.height * scaleToFit,
        style: 'position:relative',
        viewBox: [bBox.x, bBox.y, bBox.width, bBox.height].join(' ')
    });

    printLayersVel.attr('transform', V.matrixToTransformString(printMatrix));

    // TODO: display grid
    // TODO: display background

    $printArea.append([
        $printPaper.append([
            printSVGVel.node
        ])
    ]);

    $printArea.addClass('preview');

    return {
        $el: $printArea,
        sheetSizePx: sheetSizePx
    };
};

var sendToPrinter = function(pages, opt) {

    if (pages) {

        var $body = $(document.body);

        $body.addClass('joint-print');

        /*
            Detach the children of the paper element before adding the cloned paper element to the DOM.
            This is necessary because otherwise the SVG filters are removed because of duplicate element IDs.
        */
        var $detachedChildren = this.$el.children().detach();

        pages.forEach(function($page) {
            $page.removeClass('preview')
                .addClass('print-ready')
                .appendTo($body);
        });

        var called = false;
        var onceAfterPrint = function() {

            if (!called) {
                called = true;

                $body.removeClass('joint-print');

                pages.forEach(function(el) {
                    el.remove();
                });

                this.$el.append($detachedChildren);

                // remove generated css
                $('#print-styles').remove();

                this.trigger('afterprint', opt);
                $(window).off('afterprint', onceAfterPrint);
            }
        }.bind(this);

        $(window).one('afterprint', onceAfterPrint);

        // To make sure an app won't get stuck without its original body, add a delayed version.
        setTimeout(onceAfterPrint, 200);
        window.print();
    }
};

var preparePages = function(options) {

    var area = getArea.call(this, options);
    var pages = [];
    var printAreaObj;

    if (options.poster) {

        var posterPieceSize = getPosterPieceSize(area, options.poster);
        var pieces = splitArea(area, posterPieceSize);

        for (var i = 0; i < pieces.length; i++) {
            printAreaObj = this.preparePrintArea(pieces[i], options);
            pages.push(printAreaObj.$el);
        }
    } else {
        printAreaObj = this.preparePrintArea(area, options);
        pages.push(printAreaObj.$el);
    }

    if (printAreaObj) {
        var cssProps = {
            width: printAreaObj.sheetSizePx.cssWidth,
            height: printAreaObj.sheetSizePx.cssHeight
        };

        injectPrintCss(cssProps, options);
    }

    return pages;
};

var objectToCss = function(obj) {

    return Object.keys(obj).map(function(key) {
        return key + ':' + obj[key];
    }).join(';') + ';';
};

var getSheetSizePx = function(opt) {

    var margin = util.normalizeSides(opt.margin);
    var sheet = opt.sheet;
    margin.unit = opt.marginUnit;
    sheet.unit = opt.sheetUnit;

    var cssWidth = 'calc(' + sheet.width + sheet.unit + ' - ' + (margin.left + margin.right) + margin.unit + ')';
    var cssHeight = 'calc(' + sheet.height + sheet.unit + ' - ' + (margin.top + margin.bottom) + margin.unit + ')';

    var sizePx = convert.measure(cssWidth, cssHeight, '');

    return {
        cssWidth: cssWidth,
        cssHeight: cssHeight,
        width: sizePx.width,
        height: sizePx.height
    };
};

var getViewBox = function(paperAreaBBox, areaToPrint, sheetSizePx) {

    var rect = new g.Rect({
        x: (areaToPrint.x - paperAreaBBox.x),
        y: (areaToPrint.y - paperAreaBBox.y),
        width: areaToPrint.width,
        height: areaToPrint.height
    });

    var viewBoxRatio = rect.width / rect.height;
    var sheetRatio = sheetSizePx.width / sheetSizePx.height;
    var scaleToFit;

    if (viewBoxRatio > sheetRatio) {
        scaleToFit = sheetSizePx.width / rect.width;
    } else {
        scaleToFit = sheetSizePx.height / rect.height;
    }

    return { bBox: rect, scaleToFit: scaleToFit, fitHorizontal: viewBoxRatio > sheetRatio };
};

var resolveOptions = function(opt) {

    var options = util.defaultsDeep({}, opt, {
        area: null,
        poster: false,
        sheet: {
            width: 210,
            height: 297
        },
        // support mm, in, pt, pc, cm,
        // 1 in = 2.54cm = 25.4mm = 72pt = 6pc
        sheetUnit: 'mm',
        ready: function(printAreaElements, readyToPrint, opt) {
            readyToPrint(printAreaElements);
        },

        margin: 0.4,
        marginUnit: 'in',
        // applicable only if area is not defined
        padding: 5

        // @deprecated - backward compatibility
        // For setting actual paper print size via CSS.
        // Adds another class to printarea <div/> like `printarea-size-a4`.
        //
        // CSS:
        // .printarea-size-a4 {
        //      width: 210mm !important;
        //      height: 297mm !important;
        // }

        // size: 'a4'
    });

    if (!options.area) {
        options.printingAll = true;
    }

    return options;
};

var injectCss = function(cssString) {

    var stylesCssEl = $('#print-styles');

    var style = '<style type="text/css" id="print-styles">' + cssString + '</style>';
    if (stylesCssEl.length) {
        stylesCssEl.html(cssString);
    } else {
        $('head').append(style);
    }
};

var injectPrintCss = function(printAreaObjCss, opt) {

    var printAreaCssValue = objectToCss(printAreaObjCss);
    var margin = util.normalizeSides(opt.margin);
    var unit = opt.marginUnit;

    var pageMarginCssValue = [margin.top + unit, margin.right + unit, margin.bottom + unit, margin.left + unit].join(' ');
    var pageSizeCss = 'size:' + (opt.sheet.width + opt.sheet.unit) + ' ' + (opt.sheet.height + opt.sheet.unit);

    var printCss = [
        '@media print {',
        '.printarea.print-ready {', printAreaCssValue, '}',
        '@page {', 'margin:' + pageMarginCssValue + ';', pageSizeCss, '}',
        '.printarea.preview {', printAreaCssValue, '}',
        '}'
    ];
    injectCss(printCss.join(''));
};

var getArea = function(opt) {

    var area = opt.area;
    // backward compatibility
    if (!area) {

        var padding = util.normalizeSides(opt.padding);
        area = this.getContentArea().moveAndExpand({
            x: -padding.left,
            y: -padding.top,
            width: padding.left + padding.right,
            height: padding.top + padding.bottom
        });
    }

    return area;
};

var splitArea = function(area, chunkSize) {

    var w = chunkSize.width;
    var h = chunkSize.height;

    var chunk;
    var res = [];

    var rowsHeight = 0;
    var colsWidth = 0;
    var rows = 0;
    var columns = 0;

    while (rowsHeight < area.height) {
        while (colsWidth < area.width) {
            chunk = g.Rect(area.x + colsWidth, area.y + rowsHeight, w, h);
            res.push(chunk);
            colsWidth += w;
            if (columns > MAX_COLUMNS) {
                break;
            }
            columns++;
        }
        colsWidth = 0;
        columns = 0;
        rowsHeight += h;
        if (rows > MAX_ROWS) {
            break;
        }
        rows++
    }

    return res;
};

var getPosterPieceSize = function(area, opt) {

    var pieceSize = {
        width: opt.width,
        height: opt.height
    };

    if (!pieceSize.width) {
        pieceSize.width = Math.ceil(area.width / (opt.columns || 1));
    }

    if (!pieceSize.height) {
        pieceSize.height = Math.ceil(area.height / (opt.rows || 1));
    }

    return pieceSize;
};

var convert = {

    supportedUnits: {
        'px': function(value) {
            return value;
        },
        'mm': function(value) {
            return this.millimeterSize * value;
        },
        'cm': function(value) {
            return (this.millimeterSize * value) * 10;
        },
        'in': function(value) {
            return this.millimeterSize * value * 25.4;
        },
        'pt': function(value) {
            return this.millimeterSize * ((value * 25.4) / 72);
        },
        'pc': function(value) {
            return this.millimeterSize * ((value * 25.4) / 6);
        }
    },

    measure: function(width, height, unit) {

        unit = unit || '';
        var box = $('<div/>').css({
            display: 'inline-block',
            position: 'absolute',
            left: -15000,
            top: -15000,
            width: width + unit,
            height: height + unit
        }).appendTo(document.body);

        var size = {
            width: box.width(),
            height: box.height()
        };
        box.remove();

        return size;
    },

    toPx: function(value, unit) {

        if (!this.millimeterSize) {
            this.millimeterSize = this.measure(1, 1, 'mm').width;
        }

        unit = (unit || '').toLowerCase();

        if (!this.supportedUnits[unit]) {
            throw new Error('Unsupported unit ' + unit);
        }

        return this.supportedUnits[unit].call(this, value);
    }
};

