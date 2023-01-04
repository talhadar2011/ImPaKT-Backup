import $ from 'jquery';
import { util } from 'jointjs/src/core.mjs';
import { Widget } from './Widget.mjs';
import { SelectBox } from '../SelectBox/SelectBox.mjs';
import { SelectButtonGroup } from '../SelectButtonGroup/SelectButtonGroup.mjs';

export const checkbox = Widget.extend({

    tagName: 'label',
    events: {
        'change .input': 'onChange',
        'mousedown': 'pointerdown',
        'touchstart': 'pointerdown',
        'mouseup': 'pointerup',
        'touchend': 'pointerup',
        'click': 'pointerclick'
    },
    documentEvents: {
        'mouseup': 'pointerup',
        'touchend': 'pointerup'
    },

    init: function() {
        util.bindAll(this, 'pointerup');
    },

    render: function() {

        var opt = this.options;

        var $label = $('<span/>').text(opt.label || '');
        this.$input = $('<input/>', { type: 'checkbox', 'class': 'input' }).prop('checked', !!opt.value);
        this.$span = $('<span/>');

        this.$el.append([$label, this.$input, this.$span]);

        return this;
    },

    onChange: function(evt) {
        this.trigger('change', !!evt.target.checked, evt);
    },

    pointerdown: function(evt) {
        evt = util.normalizeEvent(evt);
        this.$el.addClass('is-in-action');
        this.trigger('pointerdown', evt);
        this.delegateDocumentEvents();
    },

    pointerclick: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerclick', evt);
    },

    pointerup: function(evt) {
        evt = util.normalizeEvent(evt);
        this.undelegateDocumentEvents();
        this.trigger('pointerup', evt);
        this.$el.removeClass('is-in-action');
        if (evt.type === 'touchend') {
            this.$input.trigger('click');
            evt.preventDefault();
        }
    },

    isDisabled: function() {
        return this.$input.prop('disabled');
    },

    enable: function() {
        this.$el.removeClass('disabled');
        this.$input.prop('disabled', false);
    },

    disable: function() {
        this.$el.addClass('disabled');
        this.$input.prop('disabled', true);
    }
});

export const toggle = Widget.extend({

    tagName: 'label',
    events: {
        'change input.toggle': 'onChange',
        'click input.toggle': 'pointerclick',
        'mousedown': 'pointerdown',
        'touchstart': 'pointerdown',
        'mouseup': 'pointerup',
        'touchend': 'pointerup',

    },
    documentEvents: {
        'mouseup': 'pointerup',
        'touchend': 'pointerup'
    },

    init: function() {
        util.bindAll(this, 'pointerup');
    },

    render: function() {

        var opt = this.options;

        var $label = $('<span/>').text(opt.label || '');
        var $button = $('<span><i/></span>');
        this.$input = $('<input/>', { type: 'checkbox', class: 'toggle' }).prop('checked', !!opt.value);
        var $wrapper = $('<div/>').addClass(opt.type);

        this.$el.append([$label, $wrapper.append(this.$input, $button)]);

        return this;
    },

    onChange: function(evt) {
        this.trigger('change', !!evt.target.checked, evt);
    },

    pointerclick: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerclick', evt);
    },

    pointerdown: function(evt) {
        evt = util.normalizeEvent(evt);
        this.$el.addClass('is-in-action');
        this.trigger('pointerdown', evt);
        this.delegateDocumentEvents();
    },

    pointerup: function(evt) {
        evt = util.normalizeEvent(evt);
        this.undelegateDocumentEvents();
        this.$el.removeClass('is-in-action');
        this.trigger('pointerup', evt);

        if (evt.type === 'touchend') {
            this.$input.trigger('click');
            evt.preventDefault();
        }
    },

    isDisabled: function() {
        return this.$input.prop('disabled');
    },

    enable: function() {
        this.$el.removeClass('disabled');
        this.$input.prop('disabled', false);
    },

    disable: function() {
        this.$el.addClass('disabled');
        this.$input.prop('disabled', true);
    }
});

export const separator = Widget.extend({

    render: function() {

        if (this.options.width) {
            this.$el.css({ width: this.options.width });
        }

        return this;
    }
});

export const label = Widget.extend({

    tagName: 'label',

    render: function() {

        this.$el.text(this.options.text);

        return this;
    }
});

export const range = Widget.extend({

    events: {
        'change .input': 'onChange',
        'input .input': 'onChange'
    },

    render: function() {

        var opt = this.options;
        var $units;

        this.$output = $('<output/>').text(opt.value);
        $units = $('<span/>').addClass('units').text(opt.unit);
        this.$input = $('<input/>', {
            type: 'range',
            name: opt.type,
            min: opt.min,
            max: opt.max,
            step: opt.step,
            'class': 'input'
        }).val(opt.value);

        this.$el.append([this.$input, this.$output, $units]);

        return this;
    },

    onChange: function(evt) {

        var value = this.getValue();
        if (value === this.currentValue) {
            return;
        }

        this.currentValue = value;
        this.$output.text(value);
        this.trigger('change', value, evt);
    },

    getValue: function() {
        return parseInt(this.$input.val(), 10);
    },

    setValue: function(value, opt = {}) {
        this.$input.val(value);
        if (opt.silent) {
            value = this.getValue();
            this.currentValue = value;
            this.$output.text(value);
        } else {
            this.$input.trigger('change');
        }
    },

    isDisabled: function() {
        return this.$input.prop('disabled');
    },

    enable: function() {
        this.$input.prop('disabled', false);
    },

    disable: function() {
        this.$input.prop('disabled', true);
    }
});

export const selectBox = Widget.extend({

    render: function() {

        var selectBoxOptions = util.omit(this.options, 'type', 'group', 'index');

        this.selectBox = new SelectBox(selectBoxOptions);
        this.selectBox.render().$el.appendTo(this.el);

        return this;
    },

    bindEvents: function() {
        this.selectBox.on('all', this.trigger, this);
    },

    isDisabled: function() {
        return this.selectBox.isDisabled();
    },

    enable: function() {
        this.selectBox.enable();
    },

    disable: function() {
        this.selectBox.disable();
    }
});

export const button = Widget.extend({

    events: {
        'mousedown': 'pointerdown',
        'mouseup': 'pointerup',
        'touchend': 'pointerup',
        'touchstart': 'pointerdown',
        'click': 'pointerclick'
    },
    tagName: 'button',

    render: function() {

        var opt = this.options;

        this.$el.text(opt.text);

        return this;
    },

    pointerclick: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerclick', evt);
    },

    pointerdown: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerdown', evt);
    },

    pointerup: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerup', evt);

        if (evt.type === 'touchend') {
            this.$el.trigger('click');
            evt.preventDefault();
        }
    },

    isDisabled: function() {
        return this.$el.prop('disabled');
    },

    enable: function() {
        this.$el.prop('disabled', false);
    },

    disable: function() {
        this.$el.prop('disabled', true);
    }
});

export const inputText = Widget.extend({

    events: {
        'mousedown': 'pointerdown',
        'touchstart': 'pointerdown',
        'mouseup': 'pointerup',
        'touchend': 'pointerup',
        'click': 'pointerclick',
        'focusin': 'pointerfocusin',
        'focusout': 'pointerfocusout'
    },
    tagName: 'div',

    render: function() {

        var opt = this.options;

        this.$label = $('<label/>').text(opt.label);
        this.$text = $('<input/>', {
            type: 'text',
            'class': 'input'
        }).val(opt.value);

        this.$input = $('<div/>').addClass('input-wrapper').append(this.$text);

        this.$el.append([this.$label, this.$input]);

        return this;
    },

    pointerclick: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerclick', evt);
    },

    pointerdown: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerdown', evt);
        if (evt.type === 'touchstart') {
            this.$text.trigger('focus');
        }
    },

    pointerup: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerup', evt);
        if (evt.type === 'touchend') {
            this.$text.trigger('click');
            evt.preventDefault();
        }
    },

    pointerfocusin: function(evt) {
        evt = util.normalizeEvent(evt);
        this.$el.addClass('is-focused');
        this.trigger('pointerfocusin', evt);
    },

    pointerfocusout: function(evt) {
        evt = util.normalizeEvent(evt);
        this.$el.removeClass('is-focused');
        this.trigger('pointerfocusout', evt);
    },

    isDisabled: function() {
        return this.$text.prop('disabled');
    },

    enable: function() {
        this.$text.prop('disabled', false);
    },

    disable: function() {
        this.$text.prop('disabled', true);
    }
});

export const inputNumber = Widget.extend({

    events: {
        'mousedown': 'pointerdown',
        'touchstart': 'pointerdown',
        'mouseup': 'pointerup',
        'touchend': 'pointerup',
        'click': 'pointerclick',
        'focusin': 'pointerfocusin',
        'focusout': 'pointerfocusout'
    },
    tagName: 'div',

    render: function() {

        var opt = this.options;

        this.$label = $('<label/>').text(opt.label);
        this.$number = $('<input/>', {
            type: 'number',
            'class': 'number',
            max: opt.max,
            min: opt.min
        }).val(opt.value);
        this.$input = $('<div/>').addClass('input-wrapper').append(this.$number);

        this.$el.append([this.$label, this.$input]);

        return this;
    },

    pointerclick: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerclick', evt);
    },

    pointerdown: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerdown', evt);
        if (evt.type === 'touchstart') {
            this.$number.trigger('focus');
        }
    },

    pointerup: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerup', evt);
        if (evt.type === 'touchend') {
            this.$number.trigger('click');
            evt.preventDefault();
        }
    },

    pointerfocusin: function(evt) {
        evt = util.normalizeEvent(evt);
        this.$el.addClass('is-focused');
        this.trigger('pointerfocusin', evt);
    },

    pointerfocusout: function(evt) {
        evt = util.normalizeEvent(evt);
        this.$el.removeClass('is-focused');
        this.trigger('pointerfocusout', evt);
    },

    isDisabled: function() {
        return this.$number.prop('disabled');
    },

    enable: function() {
        this.$number.prop('disabled', false);
    },

    disable: function() {
        this.$number.prop('disabled', true);
    }
});

export const textarea = Widget.extend({

    events: {
        'mousedown': 'pointerdown',
        'touchstart': 'pointerdown',
        'mouseup': 'pointerup',
        'touchend': 'pointerup',
        'click': 'pointerclick',
        'focusin': 'pointerfocusin',
        'focusout': 'pointerfocusout'
    },
    tagName: 'div',

    render: function() {

        var opt = this.options;

        this.$label = $('<label/>').text(opt.label);
        this.$textarea = $('<textarea/>', {
            'class': 'textarea'
        }).text(opt.value);
        this.$input = $('<div/>').addClass('input-wrapper').append(this.$textarea);

        this.$el.append([this.$label, this.$input]);

        return this;
    },

    pointerclick: function(evt) {
        evt.preventDefault();
        evt = util.normalizeEvent(evt);
        this.trigger('pointerclick', evt);
    },

    pointerdown: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerdown', evt);
        if (evt.type === 'touchstart') {
            this.$textarea.focus();
        }
    },

    pointerup: function(evt) {
        evt = util.normalizeEvent(evt);
        this.trigger('pointerup', evt);
        if (evt.type === 'touchend') {
            this.$textarea.trigger('click');
            evt.preventDefault();
        }
    },

    pointerfocusin: function(evt) {
        evt = util.normalizeEvent(evt);
        this.$el.addClass('is-focused');
        this.trigger('pointerfocusin', evt);
    },

    pointerfocusout: function(evt) {
        evt = util.normalizeEvent(evt);
        this.$el.removeClass('is-focused');
        this.trigger('pointerfocusout', evt);
    },

    isDisabled: function() {
        return this.$textarea.prop('disabled');
    },

    enable: function() {
        this.$textarea.prop('disabled', false);
    },

    disable: function() {
        this.$textarea.prop('disabled', true);
    }
});

export const selectButtonGroup = Widget.extend({

    render: function() {

        var selectButtonGroupOptions = util.omit(this.options, 'type', 'group', 'index');

        this.selectButtonGroup = new SelectButtonGroup(selectButtonGroupOptions);
        this.selectButtonGroup.render().$el.appendTo(this.el);

        return this;
    },

    bindEvents: function() {
        this.selectButtonGroup.on('all', this.trigger, this);
    },

    isDisabled: function() {
        return this.selectButtonGroup.isDisabled();
    },

    enable: function() {
        this.selectButtonGroup.enable();
    },

    disable: function() {
        this.selectButtonGroup.disable();
    }
});

export const zoomIn = button.extend({

    references: ['paperScroller'],
    options: {
        min: 0.2,
        max: 5,
        step: 0.2
    },

    bindEvents: function() {
        if (!this.options.autoToggle) return;
        const { paperScroller } = this.getReferences();
        this.updateAvailability(paperScroller);
        this.listenTo(paperScroller.options.paper, 'scale', () => this.updateAvailability(paperScroller));
    },

    pointerdown: function(evt) {

        var opt = this.options;

        this.getReferences().paperScroller.zoom(opt.step, { max: opt.max, grid: opt.step });
        button.prototype.pointerdown.call(this, evt);
    },

    updateAvailability: function(paperScroller) {
        if (paperScroller.zoom() < this.options.max) {
            this.enable();
        } else {
            this.disable();
        }
    }
});

export const zoomOut = button.extend({

    references: ['paperScroller'],
    options: {
        min: 0.2,
        max: 5,
        step: 0.2
    },

    bindEvents: function() {
        if (!this.options.autoToggle) return;
        const { paperScroller } = this.getReferences();
        this.updateAvailability(paperScroller);
        this.listenTo(paperScroller.options.paper, 'scale', () => this.updateAvailability(paperScroller));
    },

    pointerdown: function(evt) {

        var opt = this.options;

        this.getReferences().paperScroller.zoom(-opt.step, { min: opt.min, grid: opt.step });
        button.prototype.pointerdown.call(this, evt);
    },

    updateAvailability: function(paperScroller) {
        if (paperScroller.zoom() > this.options.min) {
            this.enable();
        } else {
            this.disable();
        }
    }
});

export const zoomToFit = button.extend({

    references: ['paperScroller'],
    options: {
        min: 0.2,
        max: 5,
        step: 0.2
    },

    pointerdown: function(evt) {

        const { options } = this;

        this.getReferences().paperScroller.zoomToFit({
            padding: 20,
            scaleGrid: options.step,
            minScale: options.min,
            maxScale: options.max
        });
        button.prototype.pointerdown.call(this, evt);
    }
});

export const zoomSlider = range.extend({

    references: ['paperScroller'],
    options: {
        min: 20,
        max: 500,
        step: 20,
        value: 100,
        unit: ' %'
    },

    bindEvents: function() {

        const { paperScroller } = this.getReferences();

        this.on('change', function(value) {
            paperScroller.zoom(value / 100, { absolute: true, grid: this.options.step / 100 });
        }, this);

        this.listenTo(paperScroller.options.paper, 'scale', (value) => {
            this.setValue(Math.floor(value * 100), { silent: true });
        });
    }
});

export const undo = button.extend({

    references: ['commandManager'],

    bindEvents: function() {
        if (!this.options.autoToggle) return;
        const { commandManager } = this.getReferences();
        this.updateAvailability(commandManager);
        this.listenTo(commandManager, 'stack', () => this.updateAvailability(commandManager));
    },

    pointerclick: function() {
        this.getReferences().commandManager.undo();
    },

    updateAvailability: function(commandManager) {
        if (commandManager.hasUndo()) {
            this.enable();
        } else {
            this.disable();
        }
    }
});

export const redo = button.extend({

    references: ['commandManager'],

    bindEvents: function() {
        if (!this.options.autoToggle) return;
        const { commandManager } = this.getReferences();
        this.updateAvailability(commandManager);
        this.listenTo(commandManager, 'stack', () => this.updateAvailability(commandManager));
    },

    pointerclick: function() {
        this.getReferences().commandManager.redo();
    },

    updateAvailability: function(commandManager) {
        if (commandManager.hasRedo()) {
            this.enable();
        } else {
            this.disable();
        }
    }
});

export const fullscreen = button.extend({

    onRender: function() {
        var target = this.target = $(this.options.target)[0];
        if (target && !$.contains(window.top.document, target)) {
            // The fullscreen feature is available only if the target is not displayed within an iframe.
            this.$el.hide();
        }
    },

    pointerclick: function() {
        util.toggleFullScreen(this.target);
    }
});

