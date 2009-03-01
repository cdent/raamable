
function load() {
    var maxNodes = 222;
    var towerIcon = new GIcon(G_DEFAULT_ICON);
    towerIcon.image = "http://gmaps-samples.googlecode.com/svn/trunk/markers/blue/blank.png";
    var towerMax = Infinity;
    var towerMin = 0;
    var timeIcon = new GIcon(G_DEFAULT_ICON);
    timeIcon.image = "http://gmaps-samples.googlecode.com/svn/trunk/markers/orange/blank.png";


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
    // Use the provided routeBounds array to only put markers down
    // for towers that are near the route. Each item in the routeBounds
    // array is a GBoundsLatLng which is the extent of ten towers,
    // each one also extending the extent by 1 degree of both lat in lng.
    function addTowers(map, routeBounds) {
        GDownloadUrl('/data/noaa.gpx', function(data) {
                var xmlDoc = GXml.parse(data);
                waypoints = xmlDoc.documentElement.getElementsByTagName('wpt');
                for (var i=0; i<waypoints.length; i++) {
                    var lat = parseFloat(waypoints[i].getAttribute("lat"));
                    var lng = parseFloat(waypoints[i].getAttribute("lon"));
                    if (lat < towerMin || lat > towerMax) {
                        continue;
                    }
                    var point = new GLatLng(lat,lng);
                    for (var j=0; j<routeBounds.length; j++) {
                        if (routeBounds[j].containsLatLng(point)) {
                            var freq = waypoints[i].getElementsByTagName('desc')[0].firstChild.nodeValue;
                            var marker = new GMarker(point, {icon: towerIcon, title: freq});
                            map.addOverlay(marker);
                            break;
                        }
                    }
                }
            }
        );
    }

    // Add the RAAM route turns information to the map
    // as organge markers.
    function addTimeStations(map) {
        GDownloadUrl('/data/R09TS.csv', function(data) {
                lines = data.split("\n");
                for (var i = 0; i < lines.length; i++) {
                    var info = lines[i].split(',');
                    if (info.length >= 3) {
                        lat = parseFloat(info[0]);
                        lng = parseFloat(info[1]);
                        var latlng = new GLatLng(lat, lng);
                        var marker =  new GMarker(latlng, {title:info[2], icon: timeIcon});
                        map.addOverlay(marker);
                    }
                }
        });
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
                var routeBounds = [];
                var routeBound = new GLatLngBounds();
                var bounds = new GLatLngBounds();
                for (var i = 0; i < lines.length; i++) {
                    var info = lines[i].split(',');
                    if (info.length >= 3) {
                        lat = parseFloat(info[0]);
                        lng = parseFloat(info[1]);
                        var latlng = new GLatLng(lat, lng);
                        // ne and sw are ways to make our extent
                        // "more" so that we can later use them
                        // for choosing which radio towers to put
                        // on the map.
                        var ne = new GLatLng(lat+1, lng-1);
                        var sw = new GLatLng(lat-1, lng+1);
                        markers[i] =  new GMarker(latlng, {title:info[2]});
                        bounds.extend(latlng);
                        routeBound.extend(latlng);
                        routeBound.extend(ne);
                        routeBound.extend(sw);
                        map.addOverlay(markers[i]);
                        altitudes[i] = parseFloat(parseFloat(info[2]).toFixed(0));
                    }
                    if (i > 0 && i % 10 == 0) {
                        routeBounds.push(routeBound);
                        routeBound = new GLatLngBounds();
                    }
                }
                towerMin = bounds.getSouthWest().lat() - 2;
                towerMax = bounds.getNorthEast().lat() + 2;
                map.setZoom(map.getBoundsZoomLevel(bounds));
                map.setCenter(bounds.getCenter());
                drawProfile(map, markers, altitudes);
                addTowers(map, routeBounds);
        });
    }


    if (GBrowserIsCompatible()) {
        var map = new GMap2(document.getElementById("map"));
        map.setCenter(new GLatLng(36, -100), 0);
        map.addControl(new GLargeMapControl());
        establishRoute(map);
        addTimeStations(map);
    }
}
