'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getTilePolygon = undefined;

var _bboxPolygon = require('@turf/bbox-polygon');

var _bboxPolygon2 = _interopRequireDefault(_bboxPolygon);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.getTilePolygon = getTilePolygon;


function getTilePolygon(z, x, y) {
  var bbox = [tile2long(x, z), tile2lat(y + 1, z), tile2long(x + 1, z), tile2lat(y, z)];
  return (0, _bboxPolygon2.default)(bbox);
}

function tile2long(x, z) {
  return x / Math.pow(2, z) * 360 - 180;
}

function tile2lat(y, z) {
  var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}