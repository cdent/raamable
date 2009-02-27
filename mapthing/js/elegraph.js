
function load() {
    var altitudes = [];
    var markers = [];
    var dirs = [];

    function drawProfile() {
        var min=Infinity, max=0;
        // ==== some Google Chart parameters ====
        var url = "http://chart.apis.google.com/chart?cht=ls&amp;chs=500x100&amp;chco=000000&amp;chm=B,33cc33,0,0,0&amp;chd=t:"
        for (var i=0; i<maxNodes; i++) {
            // == filter out bogus values ==
            if (altitudes[i] < -10000000000) altitudes[i] = 0;
            // == find min and max values ==
            if (altitudes[i]<min) min=altitudes[i];
            if (altitudes[i]>max) max=altitudes[i];
            // == add to the Chart URL ==
            url += altitudes[i];
            if (i<maxNodes-1) url += ",";
        }
        // == add min/max values to Chart URL ==
        url += "&amp;chds="+min+","+max;
        // == create the Google Chart image ==
        document.getElementById("profile").innerHTML = '<img src="' +url+ '" width=500 height=100 >';
    }


    function getAltitude(poly, i) {
        var point = poly.GetPointAtDistance(i*poly.Distance()/maxNodes);
        GDownloadUrl('/proxy?site=alt&lat=' +point.lat()+ '&lng=' +point.lng(),
                function(data) {
                    var doc = GXml.parse(data);
                    altitudes[i] = parseInt(GXml.value(doc));
                    nodes = nodes+1;
                    if (nodes == maxNodes) {
                        drawProfile();
                    }
        });
    }

    function establishRoute(map) {
        GDownloadUrl('/data/latlongelv.csv', function(data) {
                lines = data.split("\n");
                for (var i = 0; i < lines.length; i++) {
                    info = lines[i].split(',');
                    markers[i] =  new GMarker(new GLatLng(info[0], info[1]), {title:info[2]});
                    map.addOverlay(markers[i]);
                    altitudes[i] = info[2];
                    /* if(i > 0) {
                        dirs[i] = new GDirections();
                        dirs[i].loadFromWaypoints([markers[i-1].getLatLng().toUrlValue(), markers[i].getLatLng().toUrlValue()]);
//                        map.addOverlay(dirs[i].getPolyline());
                    } */
                }
        });
    }


    if (GBrowserIsCompatible()) {
        var map = new GMap2(document.getElementById("map"));
        map.setCenter(new GLatLng(36, -100), 4);
        map.addControl(new GLargeMapControl());

        establishRoute(map);
    }
}
