
function load() {
    var maxNodes = 40;
    var nodes = 0;
    var altitudes = [];

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

    if (GBrowserIsCompatible()) {
        var map = new GMap2(document.getElementById("map"));
        map.setCenter(new GLatLng(0, 0), 0);
        map.addControl(new GLargeMapControl());
        var dirn = new GDirections(map);

        GEvent.addListener(dirn,"load",function() {
                nodes = 0;
                var poly=dirn.getPolyline();
                for (var i=0; i<maxNodes; i++) {
                    getAltitude(poly,i)
                }
        });

        dirn.load( "from: Los Angeles to: New York",{getPolyline:true});
    }
}
