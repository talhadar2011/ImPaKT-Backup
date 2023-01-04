import { util } from 'jointjs/src/core.mjs';
import * as widgets from './widgets.mjs';
import { Widget } from './Widget.mjs';

Widget.create = function cre(opt, refs) {

    var type = util.camelCase(util.isString(opt) ? opt : opt.type);

    if (!util.isFunction(widgets[type])) {
        throw new Error('Widget: unable to find widget: "' + type + '"');
    }

    var widget = new widgets[type](opt, refs);

    var invalidRefs = widget.validateReferences(refs);
    if (invalidRefs.length > 0) {
        throw new Error('Widget: "' + type + '" missing dependency: ' + invalidRefs.join(', '));
    }

    widget.render();
    widget.updateAttrs(opt.attrs);
    widget.bindEvents();
    widget.$el.attr('data-type', type);

    if (opt.name) {
        widget.$el.attr('data-name', opt.name);
    }

    return widget;
}
