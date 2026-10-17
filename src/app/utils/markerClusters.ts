// Default import: the live Leaflet object the plugin extends (a namespace import is a copy without markerClusterGroup)
import L from 'leaflet';
import 'leaflet.markercluster';

// Count-badge marker clusters shared by the canvass map and the small dialog maps.
// colorFor picks the badge color from the cluster's markers; blue by default.

const CLUSTER_BLUE = '#2196F3'

export function createMarkerClusterGroup(colorFor: (markers: L.Marker[]) => string = () => CLUSTER_BLUE): L.MarkerClusterGroup {
  return L.markerClusterGroup({
    chunkedLoading: true, // avoids UI freezing
    maxClusterRadius: 50,
    iconCreateFunction: function (cluster) {
      const markers = cluster.getAllChildMarkers();

    const total = markers.length;
    const color = colorFor(markers);

    return L.divIcon({
      html: `
        <div style="
          background:${color};
          border-radius:50%;
          width:50px;
          height:50px;
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
          font-weight:bold;
          border:3px solid white;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
        ">
          ${total}
        </div>
      `,
      className: '',
      iconSize: L.point(50, 50)
    });
    }
  });
}
