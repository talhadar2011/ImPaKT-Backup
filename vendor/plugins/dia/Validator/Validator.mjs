import Backbone from 'backbone';
import { util } from 'jointjs/src/core.mjs';

export const Validator = Backbone.Model.extend({

    initialize: function(options) {

        this._map = {};
        this._commandManager = options.commandManager;

        this.listenTo(this._commandManager, 'add', this._onCommand);
    },

    defaults: {

        // To cancel (= undo + delete from redo stack) a command if is not valid.
        cancelInvalid: true
    },

    // iterates throught each command, stops on first invalid command.
    _onCommand: function(command) {

        if (Array.isArray(command)) {
            return command.find(function(singleCmd) { return !this._validateCommand(singleCmd); }, this);
        }

        return this._validateCommand(command);
    },

    // check whether the command is not against any rule
    _validateCommand: function(command) {

        // Backbone.model set() and Backbone.collection add() allow to pass an option parameter.
        // That is also kept within the command. It skips validation if requested.
        if (command.options && command.options.validation === false) return true;

        var handoverErr;

        util.toArray(this._map[command.action]).forEach(function(route) {

            var i = 0;

            function callbacks(err) {

                var fn = route[i++];

                try {
                    if (fn) {
                        fn(err, command, callbacks);
                    } else {
                        handoverErr = err;
                        return;
                    }
                } catch (err) {
                    callbacks(err);
                }
            }

            callbacks(handoverErr);
        });

        if (handoverErr) {

            if (this.get('cancelInvalid')) this._commandManager.cancel();
            this.trigger('invalid', handoverErr);
            return false;
        }

        //command is valid
        return true;
    },


    validate: function(actions) {

        var callbacks = Array.prototype.slice.call(arguments, 1);

        callbacks.forEach(function(callback) {
            if (util.isFunction(callback)) return;
            throw new Error(actions + ' requires callback functions.');
        });

        actions.split(' ').forEach(function(action) {
            (this._map[action] = this._map[action] || []).push(callbacks);
        }, this);

        return this;
    }

});
