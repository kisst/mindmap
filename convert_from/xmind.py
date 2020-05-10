#!/usr/bin/env python3
"""
Tool to convert the basics of xmind mindmaps into simple yaml flat file
"""
from zipfile import ZipFile
import sys
import xml.etree.ElementTree as ET

XML_NODE_CONTENT = "_xml_node_content"


def main():
    """
    The main function
    """
    unzip()
    proccess()


def unzip():
    """
    Unzip the contet from the given zip file
    """
    with ZipFile(sys.argv[1], "r") as zip_obj:
        zip_obj.extract("content.xml")


def proccess():
    """
    Process the data
    """
    with open("content.xml") as xmlf:
        tree = ET.parse(xmlf)
        yamlout(tree.getroot())


def yamlout(node, depth=0):
    if not depth:
        print("---")
    # Nodes with both content AND nested nodes or attributes
    # have no valid yaml mapping. Add  'content' node for that case
    nodeattrs = node.attrib
    children = list(node)
    content = node.text.strip() if node.text else ""

    if content and node.tag == "{urn:xmind:xmap:xmlns:content:2.0}title":
        if not (nodeattrs or children):
            print("{indent}{text}:".format(indent=depth * " ", text=content or ""))
            return
        else:
            nodeattrs[XML_NODE_CONTENT] = node.text
    depth += 1

    for child in children:
        yamlout(child, depth)


if __name__ == "__main__":
    main()
