'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _tilebelt = require('@mapbox/tilebelt');

var _tilebelt2 = _interopRequireDefault(_tilebelt);

var _bboxPolygon = require('@turf/bbox-polygon');

var _bboxPolygon2 = _interopRequireDefault(_bboxPolygon);

var _intersect = require('@turf/intersect');

var _intersect2 = _interopRequireDefault(_intersect);

var _cliProgress = require('cli-progress');

var _cliProgress2 = _interopRequireDefault(_cliProgress);

var _conversions = require('./conversions');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TileStrataWarmer = function () {

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
  function TileStrataWarmer(options) {
    _classCallCheck(this, TileStrataWarmer);

    this.filenames = options.filenames;
    this.layerName = options.layerName;
    this.maxZoom = options.maxZoom;
    this.server = _bluebird2.default.promisifyAll(options.server, { multiArgs: true });

    var smallestTile = _tilebelt2.default.bboxToTile(options.bbox);
    while (smallestTile[2] > options.minZoom) {
      smallestTile = _tilebelt2.default.getParent(smallestTile);
    }

    this.bboxPolygon = (0, _bboxPolygon2.default)(options.bbox);
    this.toProcess = [smallestTile];
    this.processed = [];

    this.progressBar = new _cliProgress2.default.Bar({
      format: '{bar} {percentage}% | {value}/{total} | layer: {layer} x: {x} y: {y} z: {z}'
    }, _cliProgress2.default.Presets.shades_classic);
  }

  /**
   * initialize - Initialize the TileStrata TileServer
   *
   * @return {Promise}
   */


  _createClass(TileStrataWarmer, [{
    key: 'initialize',
    value: function initialize() {
      return this.server.initializeAsync();
    }

    /**
     * warm - Commence tile warming
     *
     * @return {type}  description
     */

  }, {
    key: 'warm',
    value: function warm() {
      this.progressBar.start(this.toProcess.length, 0);
      return this.warmTiles(this.toProcess);
    }

    /**
     * warmTiles - Recursive function used to process from the current list of tiles
     *
     * @param  {number[][]} tiles list of tiles
     * @return {Promise}
     */

  }, {
    key: 'warmTiles',
    value: function warmTiles(tiles) {
      var _this = this;

      if (!tiles.length) {
        this.progressBar.stop();
        return _bluebird2.default.resolve(this.processed);
      }

      var t0 = tiles.shift();

      this.progressBar.increment(1, {
        layer: this.layerName,
        x: t0[0],
        y: t0[1],
        z: t0[2]
      });

      return this.warmTile(t0).then(function () {

        _this.processed.push(t0);

        var z = t0[2];

        if (z >= _this.maxZoom) {
          return _this.warmTiles(tiles);
        }

        var kids = _tilebelt2.default.getChildren(t0);

        kids.forEach(function (k) {

          // only add overlapping tiles to the queue
          var tilePolygon = (0, _conversions.getTilePolygon)(k[2], k[0], k[1]);
          var overlaps = (0, _intersect2.default)(tilePolygon, _this.bboxPolygon);
          if (overlaps) {
            tiles.push(k);
          }
        });

        _this.progressBar.setTotal(tiles.length + _this.processed.length);

        return _this.warmTiles(tiles);
      });
    }

    /**
     * warmTile - Process a single tile
     *
     * @param  {number[]} t coordinates (x, y, z)
     * @return {Promise}   description
     */

  }, {
    key: 'warmTile',
    value: function warmTile(t) {
      var _this2 = this;

      var promises = this.filenames.map(function (f) {
        return _this2.server.getTileAsync(_this2.layerName, f, t[0], t[1], t[2]);
      });
      return _bluebird2.default.all(promises);
    }
  }]);

  return TileStrataWarmer;
}();

exports.default = TileStrataWarmer;