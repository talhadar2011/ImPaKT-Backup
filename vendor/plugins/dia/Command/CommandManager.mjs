// Command manager implements undo/redo functionality.

import Backbone from 'backbone';
import { util, dia } from 'jointjs/src/core.mjs';

export const CommandManager = Backbone.Model.extend({

    defaults: {
        cmdBeforeAdd: null,
        cmdNameRegex: /^(?:add|remove|change:\w+)$/,
        // List of options names that will passed when a command is applied (redone).
        // e.g ['propertyPath', 'propertyValue']
        // See `dia.Cell.prototype.prop()` for more about the `propertyPath` option.
        applyOptionsList: ['propertyPath'],
        // List of options names that will passed when a command is reverted (undone).
        revertOptionsList: ['propertyPath']
    },

    // length of prefix 'change:' in the event name
    PREFIX_LENGTH: 7,

    initialize: function(options) {

        util.bindAll(this, 'initBatchCommand', 'storeBatchCommand');

        this.graph = options.graph;

        this.reset();
        this.listen();
    },

    listen: function() {

        this.listenTo(this.graph, 'all', this.addCommand, this);

        this.listenTo(this.graph, 'batch:start', this.initBatchCommand, this);
        this.listenTo(this.graph, 'batch:stop', this.storeBatchCommand, this);
    },

    createCommand: function(options) {

        var cmd = {
            action: undefined,
            data: { id: undefined, type: undefined, previous: {}, next: {}},
            batch: options && options.batch
        };

        return cmd;
    },

    push: function(cmd, opt) {

        this.redoStack = [];

        if (!cmd.batch) {
            this.undoStack.push(cmd);
            this.notifyStackChange('push', cmd, opt);
            this.trigger('add', cmd);
        } else {
            this.lastCmdIndex = Math.max(this.lastCmdIndex, 0);
            // Commands possible thrown away. Someone might be interested.
            this.trigger('batch', cmd);
        }
    },

    addCommand: function(cmdName, cell, graph, options) {

        // Do not account for changes in `dry` run.
        if (options && options.dry) {
            return;
        }

        if (!this.get('cmdNameRegex').test(cmdName)) {
            return;
        }

        if (typeof this.get('cmdBeforeAdd') == 'function' && !this.get('cmdBeforeAdd').apply(this, arguments)) {
            return;
        }

        var command = undefined;
        var isGraphCommand = (cell instanceof dia.Graph);

        if (this.batchCommand) {
            // set command as the one used last.
            // in most cases we are working with same object, doing same action
            // etc. translate an object piece by piece
            command = this.batchCommand[Math.max(this.lastCmdIndex, 0)];

            // Check if we are start working with new object or performing different action with it.
            // Note, that command is uninitialized when lastCmdIndex equals -1. (see 'initBatchCommand()')
            // in that case we are done, command we were looking for is already set
            var isDifferentModel = ((isGraphCommand && !command.graphChange) || command.data.id !== cell.id);
            var isDifferentAction = (command.action !== cmdName);
            if (this.lastCmdIndex >= 0 && (isDifferentModel || isDifferentAction)) {

                // trying to find command first, which was performing same action with the object
                // as we are doing with the model now
                var similarCommandIndex = this.batchCommand.findIndex(function(cmd, index) {
                    return ((isGraphCommand && cmd.graphChange) || cmd.data.id === cell.id) && cmd.action === cmdName;
                });

                if (similarCommandIndex < 0 || (cmdName === 'add' || cmdName === 'remove')) {
                    // command with such an id and action was not found. Let's create new one.
                    // Adding and Removing is always preserve as new command. e.g.
                    // (add1, remove1, add2) can not be changed to (remove1, add2) neither (add2, remove1).
                    command = this.createCommand({ batch:  true });
                } else {
                    // move the command to the end of the batch.
                    command = this.batchCommand[similarCommandIndex];
                    this.batchCommand.splice(similarCommandIndex, 1);
                }

                this.lastCmdIndex = this.batchCommand.push(command) - 1;
            }

        } else {

            // single command
            command = this.createCommand({ batch: false });
        }

        if (cmdName === 'add' || cmdName === 'remove') {

            command.action = cmdName;
            command.data.id = cell.id;
            command.data.type = cell.attributes.type;
            command.data.attributes = util.merge({}, cell.toJSON());
            command.options = options || {};

            this.push(command, options);
            return;
        }

        // `changedAttribute` holds the attribute name corresponding
        // to the change event triggered on the model.
        var changedAttribute = cmdName.substr(this.PREFIX_LENGTH);

        if (!command.batch || !command.action) {
            // Do this only once. Set previous box and action (also serves as a flag so that
            // we don't repeat this branche).
            command.action = cmdName;
            command.data.previous[changedAttribute] = util.clone(cell.previous(changedAttribute));
            command.options = options || {};
            if (isGraphCommand) {
                command.graphChange = true;
            } else {
                command.data.id = cell.id;
                command.data.type = cell.attributes.type;
            }
        }

        command.data.next[changedAttribute] = util.clone(cell.get(changedAttribute));

        this.push(command, options);
    },

    // Batch commands are those that merge certain commands applied in a row (1) and those that
    // hold multiple commands where one action consists of more than one command (2)
    // (1) This is useful for e.g. when the user is dragging an object in the paper which would
    // normally lead to 1px translation commands. Applying undo() on such commands separately is
    // most likely undesirable.
    // (2) e.g When you are removing an element, you don't want all links connected to that element, which
    // are also being removed to be part of different command

    initBatchCommand: function() {

        if (!this.batchCommand) {

            this.batchCommand = [this.createCommand({ batch:  true })];
            this.lastCmdIndex = -1;

            // batch level counts how many times has been initBatchCommand executed.
            // It is useful when we doing an operation recursively.
            this.batchLevel = 0;

        } else {

            // batch command is already active
            this.batchLevel++;
        }
    },

    storeBatchCommand: function(opt) {

        // In order to store batch command it is necessary to run storeBatchCommand as many times as
        // initBatchCommand was executed
        if (this.batchCommand && this.batchLevel <= 0) {

            var batchCommand = this.filterBatchCommand(this.batchCommand);
            // checking if there is any valid command in batch
            // for example: calling `initBatchCommand` immediately followed by `storeBatchCommand`
            if (batchCommand.length > 0) {

                this.redoStack = [];

                this.undoStack.push(batchCommand);
                this.notifyStackChange('push', batchCommand, opt);
                this.trigger('add', batchCommand);
            }

            this.batchCommand = null;
            this.lastCmdIndex = null;
            this.batchLevel = null;

        } else if (this.batchCommand && this.batchLevel > 0) {

            // low down batch command level, but not store it yet
            this.batchLevel--;
        }
    },

    // Takes batch commands and returns only such commands, which when applied in order change the graph.
    filterBatchCommand: function(batchCommand) {

        var commands = batchCommand.slice();
        var filteredCommands = [];

        while (commands.length > 0) {

            var command = commands.shift();
            var id = command.data.id;

            if (command.action == null || (id == null && !command.graphChange)) {
                continue;
            }

            if (command.action === 'add') {

                var removeIndex = commands.findIndex(function(item) {
                    return item.action === 'remove' && item.data && item.data.id === id;
                });
                if (removeIndex >= 0) {
                    // `add` command followed by `remove` command
                    // Lets remove the `remove` command and all other commands related to
                    // this cell. Note that no commands can exist after the `remove` command,
                    // but some could inbetween `add` and `remove`.
                    // e.g.  . ADD . CHNG . REM . => . . . .
                    commands = commands.filter(function(cmd, index) {
                        return index > removeIndex || cmd.data.id !== id;
                    });
                    continue;
                }

            } else if (command.action === 'remove') {

                var addIndex = commands.findIndex(function(item) {
                    return item.action === 'add' && item.data && item.data.id == id;
                });
                if (addIndex >= 0) {
                    // `remove` command followed by `add` command
                    // Lets remove only the `add` command. Note that another commands could exist
                    // after the `add` command, but not inbetween `remove` and `add`.
                    // e.g. . CHNG1 . REM . ADD . CHNG2 . ==> . CHNG1 . . . CHNG2 .
                    commands.splice(addIndex, 1);
                    continue;
                }

            } else if (command.action.indexOf('change') === 0) {

                if (util.isEqual(command.data.previous, command.data.next)) {
                    // This is a command which when applied doesn't actually change anything.
                    continue;
                }
            }

            // This is a valid command.
            filteredCommands.push(command);
        }

        return filteredCommands;
    },

    revertCommand: function(command, opt) {

        this.stopListening();

        var batchCommand;
        if (Array.isArray(command)) {
            batchCommand = this.constructor.sortBatchCommands(command);
        } else {
            batchCommand = [command];
        }

        var graph = this.graph;
        for (var i = batchCommand.length - 1; i >= 0; i--) {

            var cmd = batchCommand[i];
            var model = cmd.graphChange ? graph : graph.getCell(cmd.data.id);
            var cmdOpt = util.assign({
                commandManager: this.id || this.cid
            }, opt, util.pick(cmd.options, this.get('revertOptionsList')));

            switch (cmd.action) {
                case 'add':
                    model.remove(cmdOpt);
                    break;

                case 'remove':
                    graph.addCell(cmd.data.attributes, cmdOpt);
                    break;

                default:
                    var attribute = cmd.action.substr(this.PREFIX_LENGTH);
                    model.set(attribute, cmd.data.previous[attribute], cmdOpt);
                    break;
            }
        }

        this.listen();
    },

    applyCommand: function(command, opt) {

        this.stopListening();

        var batchCommand;
        if (Array.isArray(command)) {
            batchCommand = this.constructor.sortBatchCommands(command);
        } else {
            batchCommand = [command];
        }

        var graph = this.graph;
        for (var i = 0; i < batchCommand.length; i++) {

            var cmd = batchCommand[i];
            var model = cmd.graphChange ? graph : graph.getCell(cmd.data.id);
            var cmdOpt = util.assign({
                commandManager: this.id || this.cid
            }, opt, util.pick(cmd.options, this.get('applyOptionsList')));

            switch (cmd.action) {

                case 'add':
                    graph.addCell(cmd.data.attributes, cmdOpt);
                    break;

                case 'remove':
                    model.remove(cmdOpt);
                    break;

                default:
                    var attribute = cmd.action.substr(this.PREFIX_LENGTH);
                    model.set(attribute, cmd.data.next[attribute], cmdOpt);
                    break;
            }
        }

        this.listen();
    },

    undo: function(opt) {

        var command = this.undoStack.pop();

        if (command) {

            this.revertCommand(command, opt);
            this.redoStack.push(command);
            this.notifyStackChange('undo', command, opt);
        }
    },

    redo: function(opt) {

        var command = this.redoStack.pop();

        if (command) {

            this.applyCommand(command, opt);
            this.undoStack.push(command);
            this.notifyStackChange('redo', command, opt);
        }
    },

    cancel: function(opt) {

        var command = this.undoStack.pop()
        if (command) {

            this.revertCommand(command, opt);
            this.redoStack = [];
            this.notifyStackChange('cancel', command, opt);
        }
    },

    reset: function(opt) {

        this.undoStack = [];
        this.redoStack = [];
        this.notifyStackChange('reset', null, opt);
    },

    hasUndo: function() {

        return this.undoStack.length > 0;
    },

    hasRedo: function() {

        return this.redoStack.length > 0;
    },

    notifyStackChange: function(name, command, opt = {}) {
        let args;
        if (command) {
            args = [Array.isArray(command) ? command : [command], opt]
        } else {
            args = [opt];
        }
        this.trigger(`stack:${name}`, ...args);
        this.trigger('stack', opt);
    }

}, {

    sortBatchCommands: function(commands) {

        // Note that `filterBatchCommand` method makes sure there is no `add` and `remove`
        // command in the same batch for the same element.

        // Here we swap only commands related to the same element, where `change` command
        // is before an `add` command (similary for the `remove` event).

        var commandsSorted = [];
        for (var index = 0; index < commands.length; index++) {

            var command = commands[index];
            var insertPosition = null;

            if (command.action === 'add') {
                var id = command.data.id;

                for (var i = 0; i < index; i++) {

                    if (commands[i].data.id === id) {
                        // add command should appear before the first change command
                        insertPosition = i;
                        break;
                    }
                }
            }

            if (insertPosition !== null) {
                commandsSorted.splice(insertPosition, 0, command);

            } else {
                commandsSorted.push(command);
            }
        }

        return commandsSorted;
    }

});
