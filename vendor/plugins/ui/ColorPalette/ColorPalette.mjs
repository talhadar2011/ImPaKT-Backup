import { SelectBox } from '../SelectBox/SelectBox.mjs';
import $ from 'jquery';

export const ColorPalette = SelectBox.extend({

    className: 'select-box color-palette',

    position: function() {

        var $selection = this.$('.select-box-selection');
        var selectionHeight = $selection.outerHeight();
        var selectionOffset = $selection.offset();

        var left = selectionOffset.left;
        var top = selectionOffset.top + selectionHeight;

        if (this.options.target !== document.body) {

            this.$target = this.$target || $(this.options.target);

            // Position relative to target element
            var targetOffset = this.$target.offset();
            left -= targetOffset.left - this.$target.scrollLeft();
            top -= targetOffset.top - this.$target.scrollTop();
        }

        this.$options.css({ left: left, top: top });
    }

}, {

    // Statics

    OptionsView: SelectBox.OptionsView.extend({

        renderOptionContent: function(option) {

            var $option = $('<div/>', { 'class': 'select-box-option-content' });

            $option.css('background-color', option.content);

            if (option.icon) {
                $option.prepend($('<img/>', {
                    'class': 'select-box-option-icon',
                    src: option.icon
                }));
            }

            return $option;
        }
    })

});
