// ui.Popup is like ui.ContextToolbar except that it can contain any HTML.
// This is useful for displaying a contextual widget that contains forms or other
// HTML. Popups also have an arrow pointing up.

// @import ui.ContextToolbar
import { ContextToolbar } from '../ContextToolbar/ContextToolbar.mjs';
import { util } from 'jointjs/src/core.mjs';

export const Popup = ContextToolbar.extend({

    className: 'popup',

    eventNamespace: 'popup',

    events: {},

    renderContent: function() {

        var content = util.isFunction(this.options.content) ? this.options.content(this.el) : this.options.content;
        if (content) {
            this.$el.html(content);
        }
    }
});
