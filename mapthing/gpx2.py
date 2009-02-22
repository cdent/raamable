#!/usr/bin/env python

"""
Read in a gpx file on stdin and write out a yaml file
that has the useful info in it.
"""

import sys

import html5lib
from html5lib import treebuilders

import yaml


def do():
    p = html5lib.HTMLParser(tree=treebuilders.getTreeBuilder('beautifulsoup'))
    tree = p.parse(sys.stdin)
    waypoints_xml = tree.findAll('wpt')


    waypoints = []
    for waypoint_xml in waypoints_xml:
        desc = str(waypoint_xml.find('desc').contents[0])
        desc, freq = desc.split('Freq: ')
        waypoint = dict(
                lat=waypoint_xml['lat'],
                lon=waypoint_xml['lon'],
                name=str(waypoint_xml.find('name').contents[0]),
                cmt=str(waypoint_xml.find('cmt').contents[0]),
                freq=freq)
        waypoints += [waypoint]
    print yaml.safe_dump(waypoints, default_flow_style=False)

if __name__ == '__main__':
    do()
