/*Copyright (c) 2013-2016, Rob Schmuecker
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* The name Rob Schmuecker may not be used to endorse or promote products
  derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.*/

const urlParams = new URLSearchParams(window.location.search);
const getUrlParam = (param, def) => urlParams.get(param) || def;

const idMap = {};

/**
 * Normalize the label, returning a globally unique identifier.
 *
 * In the case that more than one node has the same ID, we append an underscore
 * followed by a number guaranteed to be unique. As underscores are replaced
 * during the normalization process, the new ID is guaranteed to be unique.
 */
function getNodeId(label) {
  let id = label
    .toLowerCase()
    .replace(/[^\w]|_/g, '-')
    .replace(/\-{2,}/g, '-');

  if (idMap.hasOwnProperty(id)) {
    const n = idMap[id] += 1
    id = `${id}_${n}`;
  } else {
    idMap[id] = 0;
  }

  return id;
}

/**
 * Return a random 5-digit 36-bit string.
 */
function getRandomId() {
  return Math.random().toString(36).substring(2, 7);
}

/**
 * Normalize the raw YAML data into a tree structure expected by Mindmap.
 *
 * Recurse through the input object, converting the map into an array, with
 * each key, value pairing translated into a single { name, children } object.
 */
function normalize(parent, path) {
  if (!parent) {
    return []
  }
  if (!path) {
    path = []
  }

  return Object
    // Transform the object into an array
    .entries(parent)
    // Ignore any __ attributes - these should be considered private
    .filter(([name]) => !name.startsWith('__'))
    // Translate each entry into a { name, child } object
    // Recurse through the levels
    .map(([name, rawChildren]) => {
      const attrs = rawChildren?.__attrs || {};
      const id = getNodeId(name);
      const subPath = [...path, id]
      const child = {
        name,
        attrs,
        id,
        path: subPath,
        children: normalize(rawChildren, subPath),
      };

      return child;
    });
}

/**
 * Attempt to match a root node from the given GET parameter.
 */
function matchRoot(node, toMatch) {
  const current = toMatch[0];

  if (current) {
    const match = node.children.find(child => child.id === current);

    if (match) {
      return matchRoot(match, toMatch.slice(1));
    } else {
      return null;
    }
  } else {
    return node;
  }
}

/**
 * Parse the given YAML file, adding IDs as necessary.
 */
function parseTree(srcYaml) {
  const rawData = YAML.load(srcYaml);
  const parsed = normalize(rawData);
  const rootQuery = getUrlParam('root');
  let root = parsed[0];

  if (rootQuery) {
    const querySplit = rootQuery.trim().split('.');
    const rootMatch = matchRoot(root, querySplit);

    if (rootMatch) {
      return rootMatch;
    }

    console.error(`Failed to match root: ${rootQuery}`);
  }

  return root;
}

const iconCache = {};

/**
 * Attempt to return the character corresponding to a Font Awesome icon.
 */
function getFontIcon(iconName) {
  if (iconCache.hasOwnProperty(iconName)) {
    return iconCache[iconName];
  }

  // Create an element outside of the SVG - assign it the given FA class
  const tmpElem = document.createElement('i');
  tmpElem.classList.add('fa', `fa-${iconName}`);
  document.body.append(tmpElem);

  // Retrieve the unicode code point from the icon, then delete the element
  const content = window
    .getComputedStyle(tmpElem, '::before')
    .getPropertyValue('content');

  tmpElem.remove();

  // Display a question mark if unable to parse the icon
  const charCode = content === 'none'
    ? '61529'
    : content.charCodeAt(1);

  const icon = String.fromCharCode(charCode);
  iconCache[iconName] = icon;
  return icon;
}

const treeData = parseTree(getUrlParam('src_data', 'data.yaml'));

// Calculate total nodes, max label length
var totalNodes = 0;
var maxLabelLength = 0;
// panning variables
var panSpeed = 200;
// Misc. variables
var i = 0;
var duration = 750;
var root;

// size of the diagram
var viewerWidth = $(document).width();
var viewerHeight = $(document).height() - 40;

var tree = d3.layout.tree()
  .size([viewerHeight, viewerWidth]);

// define a d3 diagonal projection for use by the node paths later on.
var diagonal = d3.svg.diagonal()
  .projection(function (d) {
    return [d.y, d.x];
  });

// A recursive helper function for performing some setup by walking through all nodes

function visit(parent, visitFn, childrenFn) {
  if (!parent) return;

  visitFn(parent);

  var children = childrenFn(parent);
  if (children) {
    var count = children.length;
    for (var i = 0; i < count; i++) {
      visit(children[i], visitFn, childrenFn);
    }
  }
}

// Call visit function to establish maxLabelLength
visit(treeData, function (d) {
  totalNodes++;
  maxLabelLength = Math.max(d.name.length, maxLabelLength);

}, function (d) {
  return d.children && d.children.length > 0 ? d.children : null;
});


// TODO: Pan function, can be better implemented.

function pan(domNode, direction) {
  var speed = panSpeed;
  if (panTimer) {
    clearTimeout(panTimer);
    translateCoords = d3.transform(svgGroup.attr("transform"));
    if (direction == 'left' || direction == 'right') {
      translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
      translateY = translateCoords.translate[1];
    } else if (direction == 'up' || direction == 'down') {
      translateX = translateCoords.translate[0];
      translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
    }
    scaleX = translateCoords.scale[0];
    scaleY = translateCoords.scale[1];
    scale = zoomListener.scale();
    svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
    d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
    zoomListener.scale(zoomListener.scale());
    zoomListener.translate([translateX, translateY]);
    panTimer = setTimeout(function () {
      pan(domNode, speed, direction);
    }, 50);
  }
}

// Define the zoom function for the zoomable tree

function zoom() {
  svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}


// define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

// define the baseSvg, attaching a class for styling and the zoomListener
var baseSvg = d3.select("#tree-container").append("svg")
  .attr("width", viewerWidth)
  .attr("height", viewerHeight)
  .attr("class", "overlay")
  .call(zoomListener);

// Helper functions for collapsing and expanding nodes.

function collapse(d) {
  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapse);
    d.children = null;
  }
}

function expand(d) {
  if (d._children) {
    d.children = d._children;
    d.children.forEach(expand);
    d._children = null;
  }
}

// Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

function centerNode(source) {
  scale = zoomListener.scale();
  x = -source.y0;
  y = -source.x0;
  x = x * scale + viewerWidth / 2;
  y = y * scale + viewerHeight / 2;
  d3.select('g').transition()
    .duration(duration)
    .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
  zoomListener.scale(scale);
  zoomListener.translate([x, y]);
}

// Toggle children function

function toggleChildren(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else if (d._children) {
    d.children = d._children;
    d._children = null;
  }
  return d;
}

// Toggle children on click.

function click(d) {
  if (d3.event.defaultPrevented) return; // click suppressed
  d = toggleChildren(d);
  update(d);
  centerNode(d);
}

function updatePath(source) {
  var crumbs = source.path.map((step, index, arr) => {
    // root = '' or root = 'sub.nodes.until.current.index'
    let path = (index > 0) ? [...arr].splice(1, index).join('.') : ''
    return "<li><a href='#' onClick=setRoot(\"" + path + "\") title='Focus on " + step + "'>" + step + "</a></li>";
  }).join("\n");
  document.getElementById('path-container').innerHTML = '<ul>' + crumbs + '</ul>';
}

function setRoot(path) {
  let params = new URLSearchParams(window.location.search);
  params.set('root', path.toString())
  window.location.search = '?' + params.toString()
}

function update(source) {
  // Compute the new height, function counts total children of root node and sets tree height accordingly.
  // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
  // This makes the layout more consistent.
  var levelWidth = [1];
  updatePath(source);
  var childCount = function (level, n) {

    if (n.children && n.children.length > 0) {
      if (levelWidth.length <= level + 1) levelWidth.push(0);

      levelWidth[level + 1] += n.children.length;
      n.children.forEach(function (d) {
        childCount(level + 1, d);
      });
    }
  };
  childCount(0, root);
  var newHeight = d3.max(levelWidth) * 25; // 25 pixels per line
  tree = tree.size([newHeight, viewerWidth]);

  // Compute the new tree layout.
  var nodes = tree.nodes(root).reverse(),
    links = tree.links(nodes);

  // Set widths between levels based on maxLabelLength.
  nodes.forEach(function (d) {
    d.y = (d.depth * (maxLabelLength * 10)); //maxLabelLength * 10px
    // alternatively to keep a fixed scale one can set a fixed depth per level
    // Normalize for fixed-depth by commenting out below line
    // d.y = (d.depth * 500); //500px per level.
  });

  // Update the nodes…
  node = svgGroup.selectAll("g.node")
    .data(nodes, function (d) {
      return d.id || (d.id = ++i);
    });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("g")
    .attr("class", "node")
    .attr('id', d => `node--${d.id}`)
    .attr("transform", function (d) {
      return "translate(" + source.y0 + "," + source.x0 + ")";
    });

  nodeEnter.append("circle")
    .attr('class', 'nodeCircle')
    .attr("r", 0)
    .style("fill", function (d) {
      return d._children ? "lightsteelblue" : "#fff";
    })
    .on('click', click);

  nodeEnter.append("text")
    .attr("x", function (d) {
      return d.children || d._children ? -10 : 10;
    })
    .attr("dy", ".35em")
    .attr('class', 'nodeText')
    .attr("text-anchor", function (d) {
      return d.children || d._children ? "end" : "start";
    })
    .text(function (d) {
      return d.name;
    })
    .style("fill-opacity", 0);

  // Update the text to reflect whether node has children or not.
  node.select('text')
    .attr("x", function (d) {
      return d.children || d._children ? -10 : 10;
    })
    .attr("text-anchor", function (d) {
      return d.children || d._children ? "end" : "start";
    })
    .style('fill', (node) => {
      const { color } = node.attrs;

      if (color) {
        return `#${color}`;
      }

      return null;
    })
    .html(function (d) {
      let text = d.name;

      const { attrs } = d;
      const { hyperlink, icon } = attrs;

      // Prepend a font-based icon if provided
      if (icon) {
        text = `${getFontIcon(icon)} ${text}`;
      }

      if (hyperlink) {
        // Use jQuery to create the anchor safely
        const anchor = $('<a>')
          .attr({
            href: hyperlink,
            target: '_blank',
            class: 'hyperlink',
          })
          .text(getFontIcon('external-link'));

        return `${anchor[0].outerHTML} ${text}`;
      }

      return text;
    });

  // Add a `rect` to provide a background to all applicable nodes
  nodeEnter
    .filter(d => !!d.attrs.background)
    .append('rect')
    .style('opacity', 0)
    .each(function (d) {
      const parent = this.parentElement;
      const parentBound = parent.getBBox();

      const paddingY = 1;
      const paddingX = 2;

      d3.select(this).attr({
        fill: `#${d.attrs.background}`,
        x: parentBound.x - paddingX,
        y: parentBound.y - paddingY,
        width: parentBound.width + (paddingX * 2),
        height: parentBound.height + (paddingY * 2),
      });

      parent.insertBefore(this, parent.firstChild);
    })

  // Change the circle fill depending on whether it has children and is collapsed
  node.select("circle.nodeCircle")
    .attr("r", 4.5)
    .style("fill", function (d) {
      return d._children ? "lightsteelblue" : "#fff";
    });

  // Transition nodes to their new position.
  var nodeUpdate = node.transition()
    .duration(duration)
    .attr("transform", function (d) {
      return "translate(" + d.y + "," + d.x + ")";
    });

  // Fade the text in
  nodeUpdate.select("text")
    .style("fill-opacity", 1);

  // Fade the background in
  nodeUpdate.select("rect")
    .style("opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition()
    .duration(duration)
    .attr("transform", function (d) {
      return "translate(" + source.y + "," + source.x + ")";
    })
    .remove();

  nodeExit.select("circle")
    .attr("r", 0);

  nodeExit.select("rect")
    .style("opacity", 0);

  nodeExit.select("text")
    .style("fill-opacity", 0);

  // Update the links…
  var link = svgGroup.selectAll("path.link")
    .data(links, function (d) {
      return d.target.id;
    });

  // Enter any new links at the parent's previous position.
  link.enter().insert("path", "g")
    .attr("class", "link")
    .attr("d", function (d) {
      var o = {
        x: source.x0,
        y: source.y0
      };
      return diagonal({
        source: o,
        target: o
      });
    });

  // Transition links to their new position.
  link.transition()
    .duration(duration)
    .attr("d", diagonal);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
    .duration(duration)
    .attr("d", function (d) {
      var o = {
        x: source.x,
        y: source.y
      };
      return diagonal({
        source: o,
        target: o
      });
    })
    .remove();

  // Stash the old positions for transition.
  nodes.forEach(function (d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

// Append a group which holds all nodes and which the zoom Listener can act upon.
var svgGroup = baseSvg.append("g");

// Define the root
root = treeData;
root.x0 = viewerHeight / 2;
root.y0 = 0;

/**
 * Iterate over each of the children of the given node, hiding all not
 * matching the path given by `toMatch`. This method is called recursively from
 * the root, and returns the node which matches the initial query when found.
 */
function hideInitialNodes(node, toMatch) {
  const current = toMatch[0];
  let initial;

  // We're yet to reach our initial node - recurse through the children until we do
  if (current) {
    node.children.forEach((child) => {
      // This child is an ancestor of our initial node
      // Recurse through its children
      if (child.id === current) {
        const newInitial = hideInitialNodes(child, toMatch.slice(1));

        // Capture the initial node from the child call and bubble it up
        if (newInitial) {
          initial = newInitial;
        }
      } else {
        // This child is not an ancestor of our initial node
        // Hide all of its children
        toggleChildren(child);
      }
    });
    // We've found our initial node, mark it
  } else {
    initial = node;
  }

  // Return the initial node if found
  return initial;
}

/**
 * If an `initial` query parameter is given, hide all nodes from the root
 * which don't match, and center it.
 */
function processInitialNodes(root) {
  const initial = getUrlParam('initial');

  if (!initial) {
    return root;
  }

  const toMatch = initial.trim().split('.');
  const initialNode = hideInitialNodes(root, toMatch);
  return initialNode || root;
}

// Layout the tree and center on the initial node.
const initial = processInitialNodes(root);
update(root);
centerNode(initial);

