import Promise from 'bluebird';
import tilebelt from '@mapbox/tilebelt';
import bboxPolygon from '@turf/bbox-polygon';
import intersect from '@turf/intersect';
import cliProgress from 'cli-progress';
import { getTilePolygon } from './conversions';

export default class TileStrataWarmer {

  /**
   * constructor
   *
   * @param  {object}       options
   * @param  {string[]}     options.bbox bounding box params provided as a list of numbers
   * @param  {string[]}     options.filenames list of filenames to retrieve for each XYZ tile
   * @param  {string}       options.layerName layer name
   * @param  {number}       options.maxZoom max zoom
   * @param  {number}       options.minZoom min zoom
   * @param  {TileServer}   options.server instance ot TileStata TileServer
   */
  constructor(options) {
    this.filenames = options.filenames;
    this.layerName = options.layerName;
    this.maxZoom = options.maxZoom;
    this.server = Promise.promisifyAll(options.server, { multiArgs: true });

    let smallestTile = tilebelt.bboxToTile(options.bbox);
    while (smallestTile[2] > options.minZoom) {
      smallestTile = tilebelt.getParent(smallestTile);
    }

    this.bboxPolygon = bboxPolygon(options.bbox);
    this.toProcess = [ smallestTile ];
    this.processed = [];

    this.progressBar = new cliProgress.Bar({
      format: '{bar} {percentage}% | {value}/{total} | layer: {layer} x: {x} y: {y} z: {z}',
    }, cliProgress.Presets.shades_classic);
  }

  /**
   * initialize - Initialize the TileStrata TileServer
   *
   * @return {Promise}
   */
  initialize() {
    return this.server.initializeAsync();
  }

  /**
   * warm - Commence tile warming
   *
   * @return {type}  description
   */
  warm() {
    this.progressBar.start(this.toProcess.length, 0);
    return this.warmTiles(this.toProcess);
  }

  /**
   * warmTiles - Recursive function used to process from the current list of tiles
   *
   * @param  {number[][]} tiles list of tiles
   * @return {Promise}
   */
  warmTiles(tiles) {

    if (!tiles.length) {
      this.progressBar.stop();
      return Promise.resolve(this.processed);
    }

    const t0 = tiles.shift();

    this.progressBar.increment(1, {
      layer: this.layerName,
      x: t0[0],
      y: t0[1],
      z: t0[2],
    });

    return this.warmTile(t0)
      .then(() => {

        this.processed.push(t0);

        const z = t0[2];

        if (z >= this.maxZoom) {
          return this.warmTiles(tiles);
        }

        const kids = tilebelt.getChildren(t0);

        kids.forEach((k) => {

          // only add overlapping tiles to the queue
          const tilePolygon = getTilePolygon(k[2], k[0], k[1]);
          const overlaps = intersect(tilePolygon, this.bboxPolygon);
          if (overlaps) {
            tiles.push(k);
          }
        });

        this.progressBar.setTotal(tiles.length + this.processed.length);

        return this.warmTiles(tiles);
      });
  }

  /**
   * warmTile - Process a single tile
   *
   * @param  {number[]} t coordinates (x, y, z)
   * @return {Promise}   description
   */
  warmTile(t) {
    const promises = this.filenames.map((f) => {
      return this.server.getTileAsync(this.layerName, f, t[0], t[1], t[2]);
    });
    return Promise.all(promises);
  }

}
