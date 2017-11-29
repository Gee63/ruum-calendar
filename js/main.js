    var BOARD_WIDTH = 600;
    var BOARD_PADDING = 10;
    var boardDiv = document.getElementsByClassName('board')[0];

    /*var events = [
        {start: 30, end: 150},
        {start: 540, end: 600},
        {start: 560, end: 620},
        {start: 610, end: 670}
    ];*/

   /* var events = [
        {start: 479, end: 627},
        {start: 282, end: 613},
        {start: 81, end: 125},
        {start: 355, end: 643},
        {start: 195, end: 305},
        {start: 460, end: 675},
        {start: 618, end: 719}
    ];*/

   /* var events = [
     {start: 5, end: 261},
     {start: 11, end: 146},
     {start: 100, end:564},
     {start: 117, end:583},
     {start: 118, end: 689},
     {start: 119, end: 547},
     {start: 189, end: 689},
     {start: 194, end: 370},
     {start: 213, end: 322},
     { start: 226, end: 393},
     { start: 239, end: 353},
     { start: 262, end: 562},
     { start: 270, end: 410},
     { start: 272, end: 378},
     { start: 276, end: 495},
     { start: 289, end: 343},
     { start: 293, end: 645},
     { start: 302, end: 693},
     { start: 317, end: 619},
     { start: 327, end: 655},
     { start: 333, end: 567},
     { start: 345, end: 510},
     { start: 367, end: 580},
     { start: 373, end: 562},
     { start: 378, end: 433},
     { start: 394, end: 467},
     { start: 425, end: 483},
     { start: 431, end: 536},
     { start: 449, end: 574},
     { start: 465, end: 574},
     { start: 466, end: 586},
     { start: 484, end: 654},
     { start: 507, end: 720},
     { start: 520, end: 555},
     { start: 526, end: 575},
     { start: 547, end: 637},
     { start: 591, end: 710},
     { start: 629, end: 686},
     { start: 640, end: 689},
     { start: 664, end: 715}
     ];*/

 function Sort(a,b) {
     if (a.start < b.start)
         return -1;
     if (a.start > b.start)
         return 1;
     return 0;
 }

    function layOutDay(events) {
        boardDiv.innerHTML = '';

        /*lets sort this array by start time*/
        events.sort(Sort);

        /*And then give each object an id*/
        for(var i = 0; i < events.length; i++){
            events[i]["id"] = i;
        }


        var eventsWithPositioning = [];

            var eventsHTMLString = '';
            var histogram = createHistogram(events);
            var graph = createTheGraph(events, histogram);
            setClusterWidth(graph);
            setNodesPosition(graph);

            //setting the position and width of each event
            for(var nodeId in graph.nodes) {
                var node = graph.nodes[nodeId];
                var event = {
                    //id: node.id,
                    top: node.start,
                    left: node.position * node.cluster.width + BOARD_PADDING,
                    height: node.end + 1 - node.start,
                    width: node.cluster.width
                };

                eventsHTMLString += createEventHTMLString(event.id, event.top, event.left, event.width, event.height);
                eventsWithPositioning.push(event);
            }

            boardDiv.insertAdjacentHTML('beforeend', eventsHTMLString);


        return eventsWithPositioning;
    }


    /**
     * Creates an array of arrays, each index of the top array represents a minute, each minuet is an array of
     * events which takes place at this time (minute);
     * @param events
     * @returns {Array}
     */
    function createHistogram(events) {

        //initializing the minutes array
        var minutes = new Array(720);
        for (var i = 0; i < minutes.length; i++) {
            minutes[i] = [];
        }

        //setting which events occurs at each minute
        events.forEach(function (event) {
            for (var i = event.start; i <= event.end - 1; i++) {
                minutes[i].push(event.id);
            }
        });

        return minutes;
    }

    /**
     * creates a graph of events
     * @param events - the provided input (events)
     * @param minutes - the histogram array
     * @returns {Graph}
     */
    function createTheGraph(events, minutes) {
        var graph = new Graph();
        var nodeMap = {};

        //creating the nodes
        events.forEach(function (event) {
            var node = new Node(event.id, event.start, event.end - 1);
            nodeMap[node.id] = node;
        });

        //creating the clusters
        var cluster = null;

        //cluster is a group of nodes which have a connectivity path, when the minute array length is 0 it means that
        //there are n more nodes in the cluster - cluster can be "closed".
        minutes.forEach(function (minute) {
            if (minute.length > 0) {
                cluster = cluster || new Cluster();
                minute.forEach(function (eventId) {
                    if (!cluster.nodes[eventId]) {
                        cluster.nodes[eventId] = nodeMap[eventId];

                        //
                        nodeMap[eventId].cluster = cluster;
                    }
                });
            } else {
                if (cluster != null) {
                    graph.clusters.push(cluster);
                }

                cluster = null;
            }
        });

        if (cluster != null) {
            graph.clusters.push(cluster);
        }

        //adding neighbours to nodes, neighbours is the group of colliding nodes (events).
        //adding the biggest clique for each site
        minutes.forEach(function (minute) {
            minute.forEach(function (eventId) {
                var sourceNode = nodeMap[eventId];

                //a max clique is a biggest group of colliding events
                sourceNode.biggestCliqueSize = Math.max(sourceNode.biggestCliqueSize, minute.length);
                minute.forEach(function (targetEventId) {
                    if (eventId != targetEventId) {
                        sourceNode.neighbours[targetEventId] = nodeMap[targetEventId];
                    }
                });
            });
        });

        graph.nodes = nodeMap;

        return graph;
    }

    /**
     * width of each node in a cluster defined by the board width divided by the biggest colliding group (a.k.a neighbours)
     * in the cluster.
     * **/
    function setClusterWidth(graph) {
        graph.clusters.forEach(function (cluster) {

            //cluster must have at least one node
            var maxCliqueSize = 1;
            for (var nodeId in cluster.nodes) {
                maxCliqueSize = Math.max(maxCliqueSize, cluster.nodes[nodeId].biggestCliqueSize);
            }

            cluster.maxCliqueSize = maxCliqueSize;
            cluster.width = BOARD_WIDTH / (maxCliqueSize);
        });
    }

    /**
     * sets each nodes position (relative to its neighbours). The number of available positions on the X axes is
     * according to the biggest clique in the cluster.
     * @param graph
     */
    function setNodesPosition(graph) {
        graph.clusters.forEach(function (cluster) {
            for (var nodeId in cluster.nodes) {
                var node = cluster.nodes[nodeId];
                var positionArray = new Array(node.cluster.maxCliqueSize);

                //find a place (offset) on the X axis of the node
                for (var neighbourId in node.neighbours) {
                    var neighbour = node.neighbours[neighbourId];
                    if (neighbour.position != null) {
                        positionArray[neighbour.position] = true;
                    }
                }

                for (var i = 0; i < positionArray.length; i++) {
                    if (!positionArray[i]) {
                        node.position = i;
                        break;
                    }
                }
            }
        });
    }


    /**
     * create html
     */
    function createEventHTMLString(text, top, left, width, height) {
        var style =  'top: ' + top + 'px; left: ' + left + 'px; width: ' + width + 'px; height: ' + height + 'px;';
        return '<div class="event" style="' + style + '"><span><h1>Sample Item</h1><p>Sample Location</p></span></div>';
    }

