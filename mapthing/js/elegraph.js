
function load() {
    var markers = [];
    var maxNodes = 326;

    function drawProfile(altitudes) {
        var min=Infinity, max=0;
        // ==== some Google Chart parameters ====
        var url = "http://chart.apis.google.com/chart?cht=ls&amp;chs=1000x100&amp;chco=000000&amp;chm=B,33cc33,0,0,0&amp;chd=t:"
        var multiplier = altitudes.length/maxNodes;
        multiplier = parseInt(multiplier);
        for (var i=0; i<maxNodes; i++) {
            index = (i * multiplier);
            // == filter out bogus values ==
            if (altitudes[index] < -10000000000) altitudes[index] = 0;
            // == find min and max values ==
            if (altitudes[index] < min) { min = altitudes[index]; }
            if (altitudes[index] > max) { max = altitudes[index]; }
            // == add to the Chart URL ==
            url += altitudes[index];
            if (i<maxNodes-1) url += ",";
        }
        // == add min/max values to Chart URL ==
        url += "&amp;chds="+min+","+max;
        // == create the Google Chart image ==
        document.getElementById("profile").innerHTML = '<img src="' +url+ '" width=1000 height=100 >';
    }


    function establishRoute(map) {
        GDownloadUrl('/data/latlongelv.csv', function(data) {
                lines = data.split("\n");
                var altitudes = [];
                for (var i = 0; i < lines.length; i++) {
                    info = lines[i].split(',');
                    markers[i] =  new GMarker(new GLatLng(info[0], info[1]), {title:info[2]});
                    map.addOverlay(markers[i]);
                    altitudes[i] = parseFloat(parseFloat(info[2]).toFixed(0));
                }
                drawProfile(altitudes);
        });
    }


    if (GBrowserIsCompatible()) {
        var map = new GMap2(document.getElementById("map"));
        map.setCenter(new GLatLng(36, -100), 4);
        map.addControl(new GLargeMapControl());
        establishRoute(map);
    }
}
