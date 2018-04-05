import bboxPolygon from '@turf/bbox-polygon';

export { getTilePolygon };

function getTilePolygon (z, x, y) {
  const bbox = [
    tile2long(x, z),
    tile2lat(y + 1, z),
    tile2long(x + 1, z),
    tile2lat(y, z),
  ];
  return bboxPolygon(bbox);
}

function tile2long (x, z) {
  return (x / Math.pow(2,z) * 360 - 180);
}

function tile2lat (y, z) {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2,z);
  return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}
