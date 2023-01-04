// A context toolbar.
// Context toolbar contains tools (usually buttons) that should be displayed below a certain target element.
// Only one context toolbar can be opened at a time. This simplifies the process and makes sure you don't have to
// keep track of opened context toolbars.
import $ from 'jquery';
import { util, mvc } from 'jointjs/src/core.mjs';

export const ContextToolbar = mvc.View.extend({

    className: 'context-toolbar',

    eventNamespace: 'context-toolbar',

    events: {
        'click .tool': 'onToolPointerdown'
    },

    options: {
        padding: 20,
        autoClose: true,
        vertical: false
    },

    documentEvents: {
        'mousedown': 'onDocumentPointerdown',
        'touchstart': 'onDocumentPointerdown'
    },

    init: function() {

        util.bindAll(this, 'onDocumentPointerdown');
    },

    render: function() {

        var options = this.options;
        var constructor = this.constructor;

        if (constructor.opened) {
            // Only one context toolbar can be opened at a time.
            constructor.close();
        }

        if (options.autoClose) {
            // Internet Explorer handle same event immediately and triggers close action
            // postponing autoclose to next tick will work as all other browsers
            setTimeout(this.delegateAutoCloseEvents.bind(this), 0);
        }

        if (options.type) {
            this.$el.attr('data-type', options.type);
        }

        this.$el.toggleClass('joint-vertical', !!options.vertical);

        this.getRoot().append(this.$el);

        this.renderContent();

        this.position();

        constructor.opened = this;

        return this;
    },

    delegateAutoCloseEvents: function() {

        // It is important to have the toolbar opened on `mousedown` event instead
        // of `click`. This is because we want to handle the earliest event possible.
        // Imagine you want to show the context toolbar when the user clicks an element.
        // We render the toolbar. If we were to register a handler for click,
        // the user would at some point release its mouse, this toolbar would
        // catch the click event outside of both the target and the toolbar
        // itself and would remove itself immediately.

        this.delegateDocumentEvents();

        // add the native event listener for the `useCapture`
        // context toolbar is closed even mousedown is stopped somewhere else
        document.addEventListener('mousedown', this.onDocumentPointerdown, true);
        document.addEventListener('touchstart', this.onDocumentPointerdown, true);
    },

    undelegateAutoCloseEvents: function() {

        this.undelegateDocumentEvents();

        document.removeEventListener('mousedown', this.onDocumentPointerdown, true);
        document.removeEventListener('touchstart', this.onDocumentPointerdown, true);
    },

    renderContent: function() {

        var $tools = $('<div/>', { 'class': 'tools' });

        if (this.options.tools) {

            util.toArray(this.options.tools).forEach(function(tool) {

                var $html;
                if (tool.icon) {
                    $html = $('<img/>', { src: tool.icon });
                } else {
                    $html = tool.content;
                }

                var $tool = $('<button/>', {
                    'class': 'tool',
                    html: $html,
                    'data-action': tool.action
                });

                if (tool.attrs) {
                    $tool.attr(tool.attrs);
                }

                $tools.append($tool);
            });
        }

        this.$el.append($tools);
    },

    getRoot: function() {

        return $(this.options.root || document.documentElement);
    },

    position: function() {

        var bbox = util.getElementBBox(this.options.target);
        var rootBbox = util.getElementBBox(this.getRoot());
        var width = this.$el.outerWidth();

        var left = bbox.x + bbox.width / 2 - width / 2;
        var top = bbox.y + bbox.height + this.options.padding;

        left -= rootBbox.x;
        top -= rootBbox.y;

        this.$el.css({ left: left, top: top });
    },

    onRemove: function() {

        this.undelegateAutoCloseEvents();

        this.constructor.opened = undefined;
    },

    onToolPointerdown: function(evt) {

        var action = $(evt.currentTarget).attr('data-action');
        if (action) {
            this.trigger('action:' + action, evt);
        }
    },

    onDocumentPointerdown: function(evt) {

        var target = this.options.target;
        var eventTarget = evt.target;
        if (!this.el.contains(eventTarget) && !target.contains(eventTarget) && target !== eventTarget) {
            // Check if the user clicked outside the context toolbar and hide it if yes.
            this.constructor.close();
            this.remove();
        }
    }

}, {

    opened: undefined,  // The currently opened context toolbar.

    close: function() {

        if (this.opened) {
            this.opened.remove();
            this.opened = undefined;
        }
    },

    // Call whenever the `options.target` changes its position.
    update: function() {

        if (this.opened) {
            this.opened.position();
        }
    }

});
