import Backbone from 'backbone';
import { util, dia } from 'jointjs/src/core.mjs';

// Implements Clipboard for copy-pasting elements.
// Note that the clipboard is also able to copy elements and their associated links from one graph
// and paste them to another.

// Usage:

//       var selection = new Backbone.Collection;
//       var graph = new dia.Graph;
//       // ... now something that adds elements to the selection ...
//       var clipboard = new joint.ui.Clipboard;
//       KeyboardJS.on('ctrl + c', function() { clipboard.copyElements(selection, graph); });
//       KeyboardJS.on('ctrl + v', function() { clipboard.pasteCells(graph); });
export const Clipboard = Backbone.Collection.extend({
    LOCAL_STORAGE_KEY: 'joint.ui.Clipboard.cells',
    defaults: {
        useLocalStorage: true
    },
    /**
     * @public
     * This function returns the elements and links from the original graph that were copied. This is useful for implements
     * the Cut operation where the original cells should be removed from the graph. `selection` contains
     * elements that should be copied to the clipboard. Note that with these elements, also all the associated
     * links are copied. That's why we also need the `graph` parameter, to find these links.
     *
     * @param {Backbone.Collection} selection
     * @param {dia.Graph} graph
     * @param {Object=} opt Used as a default for settings passed through the `pasteCells` method.
     * @returns {Array.<dia.Cell>}
     */
    copyElements: function(selection, graph, opt) {

        this.options = util.assign({}, this.defaults, opt);
        opt = this.options;

        var originalElements = selection.toArray();
        var clones = util.sortBy(graph.cloneSubgraph(originalElements, opt), function(cell) {
            return cell.isLink() ? 2 : 1;
        });

        this.reset(clones);

        if (opt.useLocalStorage && window.localStorage) {
            localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(this.toJSON()));
        }

        return originalElements;
    },

    /**
     * @public
     * Same logic as per `copyElements`, but elements are removed from the graph
     * @param {Backbone.Collection} selection
     * @param {dia.Graph} graph
     * @param {Object=} opt Used as a default for settings passed through the `pasteCells` method.
     * @returns {Array.<dia.Cell>} elements removed from graph
     */
    cutElements: function(selection, graph, opt) {

        var elementsToRemove = this.copyElements(selection, graph, opt);
        graph.trigger('batch:start', { batchName: 'cut' });
        util.invoke(elementsToRemove, 'remove');
        graph.trigger('batch:stop', { batchName: 'cut' });
        return elementsToRemove;
    },

    /**
     * @public
     * @param {dia.Graph} graph Where paste to.
     * @param {Object.<{ translate: {dx: number, dy: number}, useLocalStorage: boolean, link: Object}>=} opt
     * If `translate` object with `dx` and `dy` properties is passed, the copied elements will be
     * translated by the specified amount. This is useful for e.g. the 'cut' operation where we'd like to have
     * the pasted elements moved by an offset to see they were pasted to the paper.
     *
     * If `useLocalStorage` is `true`, the copied elements will be saved to the localStorage (if present)
     * making it possible to copy-paste elements between browser tabs or sessions.
     *
     * `link` is attributes that will be set all links before they are added to the `graph`.
     * This is useful for e.g. setting `z: -1` for links in order to always put them to the bottom of the paper.
     * @returns {Array.<dia.Cell>}
     */
    pasteCells: function(graph, opt) {

        //use options passed into copyElements as defaults for paste
        opt = util.defaults(opt || {}, this.options);

        if (opt.useLocalStorage && window.localStorage) {

            const cells = JSON.parse(localStorage.getItem(this.LOCAL_STORAGE_KEY));
            if (cells) {
                const graphJSON = { cells };
                // Note there is a `{ sort: false }` option passed to make sure
                // the temporary graph does not change the order of cells.
                // i.e. elements must stay before links
                const cellNamespace = graph.get('cells').cellNamespace;
                const tmpGraph = new dia.Graph([], { cellNamespace }).fromJSON(graphJSON, { sort: false, dry: true });
                this.reset(tmpGraph.getCells());
            }
        }

        //process modification on current data
        const pastedCells = this.map(function(cell) {
            return this.modifyCell(cell, opt);
        }.bind(this));

        graph.trigger('batch:start', { batchName: 'paste' });
        graph.addCells(pastedCells);
        graph.trigger('batch:stop', { batchName: 'paste' });

        this.copyElements(this, graph);

        return pastedCells;
    },

    /**
     * @public
     */
    clear: function() {

        this.options = {};
        this.reset([]);

        if (window.localStorage) {
            localStorage.removeItem(this.LOCAL_STORAGE_KEY);
        }
    },

    /**
     * @private
     * @param {dia.Cell} cell
     * @param {Object} opt
     * @returns {dia.Cell}
     */
    modifyCell: function(cell, opt) {

        cell.unset('z');
        if (cell.isLink() && opt.link) {
            cell.set(opt.link);
        }

        if (opt.translate) {
            cell.translate(opt.translate.dx || 20, opt.translate.dy || 20);
        }

        // It's necessary to unset the collection reference here. Backbone.Collection adds collection
        // attribute to every new model, except if the model already has one. The pasted elements needs to have
        // collection attribute set to the Graph collection (not the Selection collection).
        cell.collection = null;

        return cell;
    }
});
