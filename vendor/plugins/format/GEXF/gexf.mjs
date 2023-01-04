export const toCellsArray = function(xmlString, makeElement, makeLink) {

    // Parse the `xmlString` into a DOM tree.
    var parser = new DOMParser();
    var dom = parser.parseFromString(xmlString, 'text/xml');
    if (dom.documentElement.nodeName == 'parsererror') {
        throw new Error('Error while parsing GEXF file.');
    }

    // Get all nodes and edges.
    var nodes = Array.from(dom.documentElement.querySelectorAll('node'));
    var edges = Array.from(dom.documentElement.querySelectorAll('edge'));

    // Return value.
    var cells = [];

    nodes.forEach(function(node) {

        var size = parseFloat(node.querySelector('size').getAttribute('value'));

        var element = makeElement({
            id: node.getAttribute('id'),
            width: size,
            height: size,
            label: node.getAttribute('label')
        });

        cells.push(element);
    });

    edges.forEach(function(edge) {

        var link = makeLink({ source: edge.getAttribute('source'), target: edge.getAttribute('target') });
        cells.unshift(link);
    });

    return cells;
};
