
// Global list of GMarkers of all the turns on the route
var turn_markers = [];
// How many slices do we want in the altitude profile
var maxSlices = 444; 
// The size of the profile image
var maxProfileWidth = 1000;
var profileHeight = 100;
// The chars used for extended encoding
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.';

// Weather tower Icon
var towerIcon = new GIcon(G_DEFAULT_ICON);
towerIcon.image = "/data/Tall_Tower.png";
towerIcon.shadow = null;
// For determining the window into which towers are place (near the map)
var towerMax = Infinity;
var towerMin = 0;

// turn icon
var turnIcon = new GIcon(G_DEFAULT_ICON);
turnIcon.iconSize = new GSize(10,20);
turnIcon.iconAnchor = new GPoint(5,20);
turnIcon.shadow = null;

// Time Station Icon
var timeIcon = new GIcon(turnIcon);
timeIcon.image = "http://gmaps-samples.googlecode.com/svn/trunk/markers/orange/blank.png";


// Draw an image which shows the elevation of the markers.
// Attempt to scale the image so the height information is aligned
// with the points on the map.
function drawProfile(gmap, markers) {
    mapWidth = gmap.getSize().width;
    profileWidth = Math.min(mapWidth, maxProfileWidth); 
    
    var xs = [], ys = [], min = Infinity, max = 0;

    var inc = markers.length/maxSlices;

    for (var i = 0; i < markers.length; i += inc) {
        var index = parseInt(i);
        // == filter out bogus values ==
        if (markers[index].altitude < -10000000000) markers[index].altitude = 0;
        // == find min and max values ==
        if (markers[index].altitude < min) min = markers[index].altitude;
        if (markers[index].altitude > max) max = markers[index].altitude;
        // == add to the Chart URL ==
        xs.push( gmap.fromLatLngToContainerPixel(markers[index].getLatLng()).x );
        ys.push( markers[index].altitude );
    }

    $('#profile').html('<img src="' + googleChartUrl(xs, ys, min, max)
                     + '" width="' + profileWidth + '" height="' + profileHeight + '"/>');
}

function googleChartUrl(xs, ys, min, max) {
    // Scale to 0-4095
    xs = $.map(xs, function(x) { return x/profileWidth*4095 });
    ys = $.map(ys, function(y) { return (y-min)/(max-min)*4095 });

    return 'http://chart.apis.google.com/chart?cht=lxy&amp;chxt=r'
         + '&amp;chxl=0:|' + min + '|' + max
         + '&amp;chs=' + profileWidth + 'x' + profileHeight
         + '&amp;chco=000000&amp;chm=B,33cc33,0,0,0'
         + '&amp;chds=0,4095,0,4095'
         + '&amp;'
         + 'chd=e:'
         + $.map(xs, encodeExtended).join('')
         + ','
         + $.map(ys, encodeExtended).join('');
}

function encodeExtended(n) {
    return chars[n>>6] + chars[n&63];
}

// Process data of where towers are and put them on the gmap
// Use the provided routeBounds array to only put markers down
// for towers that are near the route. Each item in the routeBounds
// array is a GBoundsLatLng which is the extent of ten towers,
// each one also extending the extent by 1 degree of both lat in lng.
// Add the frequency info as a freq attribute on the GMarker.
function _addTowersCallback(data, gmap, bounds) {
    var xmlDoc = GXml.parse(data);
    waypoints = xmlDoc.documentElement.getElementsByTagName('wpt');
    for (var i=0; i<waypoints.length; i++) {
        var lat = parseFloat(waypoints[i].getAttribute("lat"));
        var lng = parseFloat(waypoints[i].getAttribute("lon"));
        if (lat < towerMin || lat > towerMax) {
            continue;
        }
        var point = new GLatLng(lat,lng);
        for (var j = 0; j < bounds.length; j++) {
            if (bounds[j].containsLatLng(point)) {
                var freq = waypoints[i].getElementsByTagName('desc')[0].firstChild.nodeValue;
                var marker = new GMarker(point, {icon: towerIcon, title: freq, clickable: false});
                marker.freq = freq;
                gmap.addOverlay(marker);
                break;
            }
        }
    }
}

function addTowers(gmap, routeBounds) {
    GDownloadUrl('/data/noaa.gpx', function(data) {
            _addTowersCallback(data, gmap, routeBounds);
    });
}

function _addTimeStationsCallback(data, gmap) {
    lines = data.split("\n");
    for (var i = 0; i < lines.length; i++) {
        var info = lines[i].split(',');
        if (info.length >= 3) {
            lat = parseFloat(info[0]);
            lng = parseFloat(info[1]);
            var latlng = new GLatLng(lat, lng);
            var marker =  new GMarker(latlng, {title:info[2], icon: timeIcon, clickable: false});
            gmap.addOverlay(marker);
        }
    }
}

function _establishRouteCallback(data, gmap, map_add, afterRouteFunction) {
    var lines = data.split("\n");
    var altitudes = [];
    var routeBounds = [];
    var routeBound = new GLatLngBounds();
    var bounds = new GLatLngBounds();
    for (var i = 0; i < lines.length; i++) {
        var info = lines[i].split(',');
        if (info.length >= 3) {
            var lat = parseFloat(info[0]);
            var lng = parseFloat(info[1]);
            var latlng = new GLatLng(lat, lng);
            // ne and sw are ways to make our extent
            // "more" so that we can later use them
            // for choosing which radio towers to put
            // on the gmap.
            var ne = new GLatLng(lat + 1, lng - 1);
            var sw = new GLatLng(lat - 1, lng + 1);
            turn_markers[i] =  new GMarker(latlng, {title:info[2], icon: turnIcon, clickable: false});
            bounds.extend(latlng);
            routeBound.extend(latlng);
            routeBound.extend(ne);
            routeBound.extend(sw);
            if (map_add) {
                gmap.addOverlay(turn_markers[i]);
            }
            turn_markers[i].altitude = parseFloat(parseFloat(info[2]).toFixed(0));
        }
        if (i > 0 && i % 10 == 0) {
            routeBounds.push(routeBound);
            routeBound = new GLatLngBounds();
        }
    }
    towerMin = bounds.getSouthWest().lat() - 2;
    towerMax = bounds.getNorthEast().lat() + 2;
    if (map_add) {
        gmap.setCenter(bounds.getCenter());
    }
    afterRouteFunction(gmap, routeBounds);
}


// Add the RAAM route time station information to the gmap
// as organge markers.
function addTimeStations(gmap) {
    GDownloadUrl('/data/R09TS.csv', function(data) {
            _addTimeStationsCallback(data, gmap);
    });
}


// Read in latlongelv.csv which has lat,lon,elevation information.
// Make a bounds
// Make a marker for each one.
// Extend the bounds to include the marker.
// Add the marker to the gmap.
// Record the altitude as a property on the marker.
// Once all the markers down, zoom the gmap to fit the bounds.
function establishRoute(gmap, map_add, afterRouteFunction) {
    GDownloadUrl('/data/latlongelv.csv', function(data) {
            _establishRouteCallback(data, gmap, map_add, afterRouteFunction);
    });
}

function blueLine(gmap, lengthDiv) {
    var gdir = new GDirections();
    var j = 0;
    var lineLength = 0;

    GEvent.addListener(gdir, 'load', function() {
        polyline = gdir.getPolyline();
        gmap.addOverlay(polyline);
        if (lengthDiv) {
            length = (polyline.getLength()/1000);
            lineLength += length;
            lengthDiv.innerHTML = lineLength.toFixed(0) + ' km';
        }
        j += 24;
        if (j < turn_markers.length)
            addPolyline(j);
    });

    addPolyline(0);

    function addPolyline(n) {
        var waypoints = []; // TODO add first time station first; last time station last
        for (var i = n; (i < n+25) && (i < turn_markers.length); i++) {
            waypoints.push( turn_markers[i].getLatLng().toUrlValue() );
        }

        gdir.loadFromWaypoints(waypoints, {getPolyline: true});
    }
}

// When the map is moved or zoomed, redraw the profile.
// We get the bounds of the map, make a list of the markers
// that are in it, and redraw the profile.
function updateProfile(gmap) {
    var zoomed_markers = [];
    var bounds = gmap.getBounds();
    for (var i=0; i<turn_markers.length; i++) {
        if (bounds.contains(turn_markers[i].getLatLng())) {
            zoomed_markers.push(turn_markers[i]);
        }
    }
    if (zoomed_markers.length > 0) {
        drawProfile(gmap, zoomed_markers);
    }
}

function setupMap(lat,lng, zoom) {
        var mapContainer = document.getElementById("map");
        var gmap = new GMap2(mapContainer);
        gmap.addMapType(G_PHYSICAL_MAP);
        gmap.setMapType(G_PHYSICAL_MAP);
        gmap.setCenter(new GLatLng(lat, lng), zoom);
        return gmap;
}

function altload() {
    if (GBrowserIsCompatible()) {
        var gmap = setupMap(35, -100, 4)
        gmap.addControl(new GLargeMapControl());
        gmap.addControl(new GMenuMapTypeControl());
        gmap.enableGoogleBar();
        gmap.enableContinuousZoom()
        establishRoute(gmap, 1, function(gmap, routeBounds){
                addTowers(gmap, routeBounds);
                blueLine(gmap, 0);
        });
        addTimeStations(gmap);
        GEvent.addListener(gmap, 'moveend', function() {
                updateProfile(gmap);
        });
        GEvent.addDomListener(window, 'resize', function() {
                updateProfile(gmap);
        });
    }
}

function frontload() {
        var gmap = setupMap(35, -100, 4);
        var lengthDiv = document.getElementById("length");
        establishRoute(gmap, 0, function(gmap, routeBounds){
                blueLine(gmap, lengthDiv);
        });
}
