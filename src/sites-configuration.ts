export type SiteConfiguration = {
  link: string;
  paramOpts: ParamOpt[];
  extractors?: Extractors;
  httpOnly?: boolean;
  // it's only necessary to specify `maxZoom` if the website
  // doesn't handle gracefully a `zoom` parameter above their range
  maxZoom?: number;
}

export type ParamOpt = {
  ordered: string;
  unordered?: Partial<Record<OsmAttribute, string>>;
}

export type Extractors = {
  getPermalink?: (document: Document) => string | undefined;
  getAttributesFromPage?: (window: Window) => Partial<Record<OsmAttribute, string>>;
};

export type OsmAttribute =
  | "nodeId" | "wayId" | "relationId"
  | "userId" | "userName" | "changesetId"
  | "zoom" | "lat" | "lon"
  | "tracesId" | "key" | "value"
  ;

const urlPattern1: ParamOpt = { ordered: "/", unordered: { zoom: "zoom", lat: "lat", lon: "lon" } };

export const Sites: Record<string, SiteConfiguration> = {
  openstreetmap: {
    link: "openstreetmap.org",
    //icon: "www.openstreetmap.org/favicon.ico", // TODO: I will need to pre-download this because otherwise I need additional security permissions in the CSP
    paramOpts: [ // TODO: should I add {domain} at the start? it may be useful for sites that add something in a subdomain
      { ordered: "/node/{nodeId}#map={zoom}/{lat}/{lon}" },
      { ordered: "/node/{nodeId}" },
      { ordered: "/way/{wayId}#map={zoom}/{lat}/{lon}" },
      { ordered: "/way/{wayId}" },
      { ordered: "/relation/{relationId}#map={zoom}/{lat}/{lon}" }, //TODO: should I create a space to allow the existence of other parameters? For example to recognize http://www.openstreetmap.org/way/263290462?locale=pt#map=17/-26.30144/-48.84531
      { ordered: "/relation/{relationId}" },
      { ordered: "/changeset/{changesetId}#map={zoom}/{lat}/{lon}" },
      { ordered: "/changeset/{changesetId}" },
      { ordered: "/user/{userName}/traces/{tracesId}" },
      { ordered: "/user/someone/traces/{tracesId}" }, //when there is no {userName} data, but there is {tracesId}, because the userName doesn't really matter here when going to this page
      { ordered: "/user/{userName}" },
      { ordered: "/#map={zoom}/{lat}/{lon}" },
      { ordered: "/", unordered: { lat: "mlat", lon: "mlon" } }
      //TODO: recognize pattern https://www.openstreetmap.org/edit#map=18/-7.57646/110.94519
    ]
  },

  bingmaps: {
    link: "www.bing.com",
    paramOpts: [
      { ordered: "/maps?cp={lat}~{lon}&lvl={zoom}" }
    ],
    extractors: {
      getAttributesFromPage: (window: Window) => {
        // Known bug:
        // If the user enters into bing.com/maps (i.e. without parameters) and doesn't move the
        //    map around at least once, this script won't be able to extract any information.
        if (window.history && window.history.state && window.history.state) {
          // wrappedJSObject is a security feature from Firefox
          const whs = window.history.state.wrappedJSObject || window.history.state;
          if (whs && whs.state && whs.state.MapModeStateHistory) {
            const m = whs.state.MapModeStateHistory;
            if (m.level && typeof m.level === "number" && m.centerPoint && m.centerPoint.latitude && m.centerPoint.longitude
              && typeof m.centerPoint.latitude === "number" && typeof m.centerPoint.longitude === "number") {
              return {
                lat: m.centerPoint.latitude.toString(),
                lon: m.centerPoint.longitude.toString(),
                zoom: m.level.toString(),
              };
            }
          }
        }
        return {};
      }
    },
  },

  googlemaps: { // there is also maps.google.fr and so on
    link: "www.google.com/maps", //redirected from maps.google.com
    // TODO: otherDomainsRegExp: /.*.google.*/, // not sure whether that's the best way to go about it, but whatever
    paramOpts: [
      { ordered: "/@{lat},{lon},{zoom}z" }
    ]
  },

  /* TODO: change to https://maps.openrouteservice.org/directions?n1=49.409445&n2=8.692953&n3=13&b=0&k1=en-US&k2=km
    openmapsurfer: {
      link: "korona.geog.uni-heidelberg.de",
      paramOpts: [urlPattern1],
      extractors: {
        getPermalink: openLayers_getPermalink()
      }
    },
  */

  opencyclemap: {
    link: "www.opencyclemap.org",
    paramOpts: [urlPattern1],
    maxZoom: 18,
    extractors: {
      getPermalink: getPermalinkBySelector("a#permalink")
    },
  },

  openseamap: {
    link: "map.openseamap.org",
    paramOpts: [urlPattern1],
    maxZoom: 18,
    extractors: {
      getPermalink: openLayers_getPermalink()
    },
  },

  opensnowmap: {
    link: "www.opensnowmap.org",
    paramOpts: [urlPattern1],
    maxZoom: 18,
    extractors: {
      getPermalink: getPermalinkBySelector("a#permalink")
    },
  },

  historicmap: {
    link: "gk.historic.place/historische_objekte",
    paramOpts: [urlPattern1],
    maxZoom: 19,
    extractors: {
      getPermalink: getPermalinkBySelector("a#permalink")
    },
  },

  openstreetbrowser: {
    link: "openstreetbrowser.org",
    maxZoom: 20,
    paramOpts: [
      { ordered: "/#map={zoom}/{lat}/{lon}" },
    ],
  },

  openptmap: {
    link: "www.openptmap.org",
    httpOnly: true,
    paramOpts: [urlPattern1],
    maxZoom: 17,
    extractors: {
      getPermalink: openLayers_getPermalink()
    },
  },

  opnvkarte: {
    link: "xn--pnvkarte-m4a.de",
    paramOpts: [
      { ordered: "/#{lon};{lat};{zoom}" },
      urlPattern1,
    ],
    extractors: {
      getPermalink: getPermalinkBySelector("a#editLink"),
    },
  },

  stamen: { // Note: no permalink, so if an user enters into the site by a link without parameters and doesn't move around at least once, then we don't have access to current coordinates
    link: "maps.stamen.com",
    httpOnly: true,
    paramOpts: [
      { ordered: "/#toner/{zoom}/{lat}/{lon}" }, // Did not find a generic URL (without choosing theme). This theme was chosen because it seems to have the highest zoom capacity
      { ordered: "/#terrain/{zoom}/{lat}/{lon}" },
      { ordered: "/#watercolor/{zoom}/{lat}/{lon}" },
    ]
  },

  f4map: {
    link: "demo.f4map.com",
    paramOpts: [
      { ordered: "/#lat={lat}&lon={lon}&zoom={zoom}" } //there are other attributes that can be added if another website with 3D rendering shows up: &camera.theta=57.319&camera.phi=-2.005
    ]
  },

  hotmap: {
    link: "map.hotosm.org",
    httpOnly: true,
    paramOpts: [
      { ordered: "/#{zoom}/{lat}/{lon}" }
    ]
  },

  mapillary: {
    link: "mapillary.com",
    paramOpts: [ // Note: has a decimal zoom and numbers with high precision (15 digits)
      { ordered: "/app", unordered: { zoom: "z", lat: "lat", lon: "lng" } }
    ]
  },

  level0: {
    link: "level0.osmz.ru",
    httpOnly: true,
    paramOpts: [
      { ordered: "/?url=n{nodeId}" },
      { ordered: "/?url=w{wayId}!" },
      { ordered: "/?url=r{relationId}" },
      //In the future, there might be a permalink for the mini-map: https://github.com/Zverik/Level0/issues/16
    ]
  },

  umap: {
    link: "umap.openstreetmap.fr",
    paramOpts: [
      { ordered: "/#{zoom}/{lat}/{lon}" } // add {anything} and {lang} flags
      //add http://umap.openstreetmap.fr/pt/map/testpk_1#13/48.2057/-4.0259
    ]
  },

  osmdeephistory: {
    link: "osmlab.github.io/osm-deep-history",
    paramOpts: [
      { ordered: "/#/node/{nodeId}" },
      { ordered: "/#/way/{wayId}" },
      { ordered: "/#/relation/{relationId}" }
    ]
  },

  deepdiff: {
    link: "osm.mapki.com",
    httpOnly: true,
    paramOpts: [
      { ordered: "/history/node.php", unordered: { nodeId: "id" } },
      { ordered: "/history/way.php", unordered: { wayId: "id" } },
      { ordered: "/history/relation.php", unordered: { relationId: "id" } }
    ]
  },

  osmhistoryviewer: {
    link: "osmhv.openstreetmap.de",
    paramOpts: [
      { ordered: "/changeset.jsp", unordered: { changesetId: "id" } },
      { ordered: "/blame.jsp", unordered: { relationId: "id" } }
    ],
    extractors: {
      //TODO: getValues - we can get userName if it's a changeset analysis and maybe map coordinates on both cases
    },
  },

  osmcha: {
    link: 'osmcha.org',
    paramOpts: [
      { ordered: "/changesets/{changesetId}" },
    ],
  },

  /* TODO: change to https://simon04.dev.openstreetmap.org/whodidit/
  whodidit: {
    link: "zverik.osm.rambler.ru/whodidit",
    paramOpts: [urlPattern1],
    extractors: {
      //TODO: getValues - we may get an username or changeset info
      getPermalink: openLayers_getPermalink()
    },
  },
  */

  overpassapi: {
    link: "overpass-api.de/achavi",
    paramOpts: [
      { ordered: "/", unordered: { changesetId: "changeset", zoom: "zoom", lat: "lat", lon: "lon" } },
      { ordered: "/", unordered: { changesetId: "changeset" } }
    ],
    extractors: {
      getPermalink: openLayers_getPermalink(),
      //TODO: getValues - we can get userName if it's a changeset analysis and maybe map coordinates on both cases
    },
  },

  waze: { // TODO: this website has unique zoom levels, so it might need workarounds
    link: "www.waze.com",
    paramOpts: [
      { ordered: "/livemap/directions?latlng={lat}%2C{lon}" },
      { ordered: "/en/livemap/directions?latlng={lat}%2C{lon}" },
      { ordered: "/editor", unordered: { lat: "lat", lon: "lon", /* zoom: "zoom", not compatible with other websites zoom levels */ } },
    ],
    extractors: {
      getPermalink: getPermalinkBySelector("a#permalink"),
      getAttributesFromPage: (window: Window): Partial<Record<OsmAttribute, string>> => {
        const latLngElement = window.document.querySelector('.wm-attribution-control__latlng');
        if (latLngElement) {
          const latLngText = latLngElement.textContent;
          if (latLngText) {
            const [lat, lon] = latLngText.split(" | ");
            if (lat && lon) return { lat, lon };
          }
        };
        return {};
      },
    },
  },

  osmrelationanalyzer: {
    link: "ra.osmsurround.org",
    httpOnly: true,
    paramOpts: [
      { ordered: "/analyzeRelation", unordered: { relationId: "relationId" } }
    ],
    extractors: {
      //TODO: getValues - we can get userName if it's a changeset analysis and maybe map coordinates on both cases
    },
  },

  osmroutemanager: {
    link: "osmrm.openstreetmap.de",
    paramOpts: [
      { ordered: "/relation.jsp", unordered: { relationId: "id" } }
    ],
    extractors: {
      //TODO: getValues - get user that change this relation for the last time
    },
  },

  osmose: { // Note: has support for languages
    link: "osmose.openstreetmap.fr/map",
    paramOpts: [
      { ordered: "/#zoom={zoom}&lat={lat}&lon={lon}" },
    ],
    extractors: {
      getPermalink: getPermalinkBySelector("[class*=permalink] a"),
      //TODO: getValues - get parameters from URL because there is a language prefix between /map and /#zoom
    },
  },

  osminspector: {
    link: "tools.geofabrik.de/osmi",
    paramOpts: [urlPattern1],
    maxZoom: 18,
    extractors: {
      getPermalink: getPermalinkBySelector("a#permalink")
    },
  },

  mapcompare: {
    link: "tools.geofabrik.de/mc",
    paramOpts: [
      { ordered: "/#{zoom}/{lat}/{lon}" }
    ]
  },

  howdidyoucontribute: {
    link: "hdyc.neis-one.org",
    paramOpts: [
      { ordered: "/?{userName}" }
    ],
    extractors: {
      getPermalink: getPermalinkBySelector('a[href*="//hdyc.neis-one.org/?"]'),
    },
  },

  osmwiki: {
    link: "wiki.openstreetmap.org",
    paramOpts: [
      { ordered: "/Tag:{key}={value}" },
      { ordered: "/Key:{key}" }
    ]
  },

  osmchangeviz: {
    link: "resultmaps.neis-one.org",
    paramOpts: [
      { ordered: "/osm-change-viz?c={changesetId}" },
      { ordered: "/osm-change-viz.php?c={changesetId}" },
    ]
  },

  osmchangetiles: {
    link: "resultmaps.neis-one.org",
    paramOpts: [
      { ordered: "/osm-change-tiles#{zoom}/{lat}/{lon}" },
      { ordered: "/osm-change-tiles.php#{zoom}/{lat}/{lon}" }
    ]
  },

  taginfo: {
    link: "taginfo.openstreetmap.org",
    paramOpts: [
      { ordered: "/tags/{key}={value}" },
      { ordered: "/keys/{key}" }
    ]
  },

  osmbuildings: {
    link: "osmbuildings.org",
    paramOpts: [
      { ordered: "/?lat={lat}&lon={lon}&zoom={zoom}" }, // &tilt=45&rotation=168
    ]
  }
};
//http://brouter.de/brouter-web/#zoom=6&lat=50.99&lon=9.86&layer=OpenStreetMap
//Overpass Turbo Wizard: http://overpass-turbo.eu/?w=%22area%22%3D%22y%22+global
//http://maproulette.org/
//http://ris.dev.openstreetmap.org/tsbp-proto/{tracesId}/6/1/  from http://wiki.openstreetmap.org/wiki/That_Shouldnt_Be_Possible

/*
  josm: {
    link: "localhost:8111",
    paramOpts: [
      {ordered:"/load_and_zoom", unordered: {minLon:"left", minLat:"bottom", maxLon:"right", maxLat:"top"}} //TODO: that's not supported yet...
    ]
  },

*/
/*
  keepright: {
    link: "keepright.at",
    paramOpts: [
      { ordered: "/report_map.php" }, //TODO: parameters...
    ],
    extractors: {
      getPermalink: openLayers_getPermalink()
    },
  },
*/

function getPermalinkBySelector(selector: string) {
  return function (document: Document) {
    const permalink = document.querySelector(selector) as HTMLAnchorElement;
    return permalink && permalink.href;
  }
}


function openLayers_getPermalink() {
  return getPermalinkBySelector("[id*=Permalink] a");
}

// function getPermalinkByValue(){
//   return function(document: Document){
//     const permalinkAnchor = [...(document.querySelectorAll('a'))]
//                             .find(a => a.textContent && /permalink/i.test(a.textContent));
//     return permalinkAnchor && permalinkAnchor.href;
//   }
// }
