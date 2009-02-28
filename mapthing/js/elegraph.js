
function load() {
    var maxNodes = 222;

    // Draw an image which shows the elevation of the markers.
    // Attempt to scale the image so the height information is aligned
    // with the points on the map.
    // There are problems with this:
    //   Using text encoding we can't put all the points on the graph.
    //   When we limit the noumber of points, the graph doesn't finish.
    // So _Next_:
    //   Use extended encoding.
    //   Make it so if you zoom the map only the markers we can see influence
    //     the profile image.
    function drawProfile(map, markers, altitudes) {
        var min=Infinity, max=0;
        // ==== some Google Chart parameters ====
        var url = "http://chart.apis.google.com/chart?cht=lxy&amp;chs=1000x100&amp;chco=000000&amp;chm=B,33cc33,0,0,0&amp;chd=t:"
        var inc = altitudes.length/maxNodes;
        var xs = [];
        var ys = [];
        var ii = 0;
        for (var i=0; i<altitudes.length; i += inc) {
            var index = parseInt(i);
            // == filter out bogus values ==
            if (altitudes[index] < -10000000000) altitudes[index] = 0;
            // == find min and max values ==
            if (altitudes[index] < min) min = altitudes[index];
            if (altitudes[index] > max) max = altitudes[index];
            // == add to the Chart URL ==
            ys[ii] = altitudes[index];
            xs[ii] = map.fromLatLngToContainerPixel(markers[index].getLatLng()).x;
            ii++;
        }
        var xdata = xs.join(',');
        var ydata = ys.join(',');
        url += xdata + '|' + ydata;
        // == add min/max values to Chart URL ==
        url += "&amp;chds=0,1000,"+min+","+max;
        // == create the Google Chart image ==
        document.getElementById("profile").innerHTML = '<img src="' +url+ '" width=1000 height=100 >';
    }

    // Read in the data of where towers are and put them on the map
    // Right now it puts all the towers on the map, which is not very helpful.
    // Could just put ones on the map that are near to the route.
    // Would be nice if they had better icons.
    // The freq is not getting out of the way point (yet).
    function addTowers(map) {
        GDownloadUrl('/data/noaa.gpx', function(data) {
                var xmlDoc = GXml.parse(data);
                waypoints = xmlDoc.documentElement.getElementsByTagName('wpt');
                for (var i=0; i<waypoints.length; i++) {
                    var lat = parseFloat(waypoints[i].getAttribute("lat"));
                    var lng = parseFloat(waypoints[i].getAttribute("lon"));
                    var point = new GLatLng(lat,lng);
                    // freq is not being set
                    var freq = waypoints[i].getElementsByTagName('desc')[0].nodeValue;
                    var marker = new GMarker(point, {title: freq});
                    map.addOverlay(marker);
                }
            }
        );
    }


    // Read in latlongelv.csv which has lat,lon,elevation information.
    // Make a bounds
    // Make a marker for each one.
    // Extend the bounds to include the marker.
    // Add the marker to the map.
    // Record the altitude for later used in drawProfile.
    // Once all the markers down, zoom the map to fit the bounds.
    function establishRoute(map) {
        GDownloadUrl('/data/latlongelv.csv', function(data) {
                lines = data.split("\n");
                var altitudes = [];
                var markers = [];
                var bounds = new GLatLngBounds();
                for (var i = 0; i < lines.length; i++) {
                    var info = lines[i].split(',');
                    if (info.length >= 3) {
                        var latlng = new GLatLng(info[0], info[1]);
                        markers[i] =  new GMarker(latlng, {title:info[2]});
                        bounds.extend(latlng);
                        map.addOverlay(markers[i]);
                        altitudes[i] = parseFloat(parseFloat(info[2]).toFixed(0));
                    }
                }
                map.setZoom(map.getBoundsZoomLevel(bounds));
                map.setCenter(bounds.getCenter());
                drawProfile(map, markers, altitudes);
                addTowers(map);
        });
    }


    if (GBrowserIsCompatible()) {
        var map = new GMap2(document.getElementById("map"));
        map.setCenter(new GLatLng(36, -100), 0);
        map.addControl(new GLargeMapControl());
        establishRoute(map);
    }
}
