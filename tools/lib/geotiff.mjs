// Minimal GeoTIFF / ESRI ASCII grid reader for single-band elevation rasters
// (Environment Agency LiDAR DTM/DSM tiles). No dependencies.
// Supports: little/big endian, strips and tiles, no compression / LZW / Deflate,
// horizontal (2) and floating-point (3) predictors, float32/64 and 8/16/32-bit integers.
import { inflateSync } from 'node:zlib';

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 16: 8 };

export function readGeoTIFF(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const le = dv.getUint16(0) === 0x4949;
  if (!le && dv.getUint16(0) !== 0x4d4d) throw new Error('not a TIFF');
  const magic = dv.getUint16(2, le);
  const big = magic === 43;
  let ifd = big ? Number(dv.getBigUint64(8, le)) : dv.getUint32(4, le);
  const tags = {};
  const n = big ? Number(dv.getBigUint64(ifd, le)) : dv.getUint16(ifd, le);
  const entrySize = big ? 20 : 12, base = ifd + (big ? 8 : 2);
  for (let k = 0; k < n; k++) {
    const e = base + k * entrySize;
    const tag = dv.getUint16(e, le), type = dv.getUint16(e + 2, le);
    const count = big ? Number(dv.getBigUint64(e + 4, le)) : dv.getUint32(e + 4, le);
    const size = (TYPE_SIZE[type] || 1) * count;
    const inline = size <= (big ? 8 : 4);
    const off = inline ? e + (big ? 12 : 8) : (big ? Number(dv.getBigUint64(e + 12, le)) : dv.getUint32(e + 8, le));
    const vals = [];
    for (let i = 0; i < count; i++) {
      const p = off + i * (TYPE_SIZE[type] || 1);
      switch (type) {
        case 1: case 7: vals.push(dv.getUint8(p)); break;
        case 2: vals.push(dv.getUint8(p)); break;
        case 3: vals.push(dv.getUint16(p, le)); break;
        case 4: vals.push(dv.getUint32(p, le)); break;
        case 6: vals.push(dv.getInt8(p)); break;
        case 8: vals.push(dv.getInt16(p, le)); break;
        case 9: vals.push(dv.getInt32(p, le)); break;
        case 11: vals.push(dv.getFloat32(p, le)); break;
        case 12: vals.push(dv.getFloat64(p, le)); break;
        case 16: vals.push(Number(dv.getBigUint64(p, le))); break;
        default: vals.push(0);
      }
    }
    tags[tag] = type === 2 ? String.fromCharCode(...vals).replace(/\0+$/, '') : vals;
  }
  const W = tags[256][0], H = tags[257][0];
  const bps = (tags[258] || [8])[0], spp = (tags[277] || [1])[0], fmt = (tags[339] || [1])[0];
  const comp = (tags[259] || [1])[0], pred = (tags[317] || [1])[0];
  if (spp !== 1) throw new Error('only single-band rasters are supported');
  const bytesPer = bps / 8;
  const out = new Float32Array(W * H);
  const tiled = !!tags[322];
  const tw = tiled ? tags[322][0] : W, th = tiled ? tags[323][0] : (tags[278] || [H])[0];
  const offsets = tiled ? tags[324] : tags[273], counts = tiled ? tags[325] : tags[279];
  const across = Math.ceil(W / tw);
  for (let b = 0; b < offsets.length; b++) {
    let raw = buf.subarray(offsets[b], offsets[b] + counts[b]);
    if (comp === 5) raw = lzwDecode(raw);
    else if (comp === 8 || comp === 32946) raw = inflateSync(raw);
    else if (comp !== 1) throw new Error('unsupported TIFF compression ' + comp);
    const rows = tiled ? th : Math.min(th, H - b * th);
    const block = decodeBlock(raw, tw, rows, bytesPer, fmt, pred, le);
    const bx = tiled ? (b % across) * tw : 0, by = tiled ? Math.floor(b / across) * th : b * th;
    for (let y = 0; y < rows; y++) {
      const gy = by + y; if (gy >= H) break;
      for (let x = 0; x < tw; x++) { const gx = bx + x; if (gx < W) out[gy * W + gx] = block[y * tw + x]; }
    }
  }
  const scale = tags[33550], tie = tags[33922];
  if (!scale || !tie) throw new Error('GeoTIFF georeferencing tags (ModelPixelScale/ModelTiepoint) not found');
  const nodata = tags[42113] != null ? parseFloat(tags[42113]) : -9999;
  // tiepoint maps raster (i,j) -> model (X,Y); PixelIsArea: (0,0) is the top-left corner
  return { width: W, height: H, data: out, x0: tie[3] - tie[0] * scale[0], y0: tie[4] + tie[1] * scale[1], cellX: scale[0], cellY: scale[1], nodata };
}

function decodeBlock(raw, w, h, bytesPer, fmt, pred, le) {
  const n = w * h;
  let bytes = raw;
  if (pred === 3) { // floating-point predictor: byte-wise differencing, then de-interleave
    const rowBytes = w * bytesPer; const out = new Uint8Array(rowBytes * h);
    for (let y = 0; y < h; y++) {
      const row = raw.slice(y * rowBytes, (y + 1) * rowBytes);
      for (let i = 1; i < rowBytes; i++) row[i] = (row[i] + row[i - 1]) & 0xff;
      for (let x = 0; x < w; x++) for (let k = 0; k < bytesPer; k++) {
        const src = k * w + x; const dst = y * rowBytes + x * bytesPer + (le ? bytesPer - 1 - k : k);
        out[dst] = row[src];
      }
    }
    bytes = out;
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const vals = new Float32Array(n);
  for (let i = 0; i < n && (i + 1) * bytesPer <= bytes.length; i++) {
    const p = i * bytesPer;
    let v;
    if (fmt === 3) v = bytesPer === 4 ? dv.getFloat32(p, le) : dv.getFloat64(p, le);
    else if (fmt === 2) v = bytesPer === 1 ? dv.getInt8(p) : bytesPer === 2 ? dv.getInt16(p, le) : dv.getInt32(p, le);
    else v = bytesPer === 1 ? dv.getUint8(p) : bytesPer === 2 ? dv.getUint16(p, le) : dv.getUint32(p, le);
    vals[i] = v;
  }
  if (pred === 2) for (let y = 0; y < h; y++) for (let x = 1; x < w; x++) vals[y * w + x] += vals[y * w + x - 1];
  return vals;
}

function lzwDecode(input) {
  // Table-based TIFF LZW (MSB-first codes, "early change"), fast enough for 5 km EA tiles.
  const prefix = new Int32Array(4096), suffix = new Uint8Array(4096), length = new Int32Array(4096), first = new Uint8Array(4096);
  for (let i = 0; i < 256; i++) { prefix[i] = -1; suffix[i] = i; length[i] = 1; first[i] = i; }
  let out = new Uint8Array(Math.max(1024, input.length * 4)), op = 0;
  const ensure = (n) => { if (op + n > out.length) { const o = new Uint8Array(Math.max(out.length * 2, op + n)); o.set(out); out = o; } };
  let bitPos = 0, codeLen = 9, next = 258, prev = -1;
  const totalBits = input.length * 8;
  const write = (code) => {
    const L = length[code]; ensure(L);
    let c = code; for (let k = L - 1; k >= 0; k--) { out[op + k] = suffix[c]; c = prefix[c]; }
    op += L;
  };
  while (bitPos + codeLen <= totalBits) {
    let code = 0;
    for (let i = 0; i < codeLen; i++) { const bit = (input[(bitPos + i) >> 3] >> (7 - ((bitPos + i) & 7))) & 1; code = (code << 1) | bit; }
    bitPos += codeLen;
    if (code === 257) break;
    if (code === 256) { next = 258; codeLen = 9; prev = -1; continue; }
    if (prev === -1) { write(code); prev = code; continue; }
    if (code < next) {
      write(code);
      if (next < 4096) { prefix[next] = prev; suffix[next] = first[code]; length[next] = length[prev] + 1; first[next] = first[prev]; next++; }
    } else { // KwKwK case
      if (next < 4096) { prefix[next] = prev; suffix[next] = first[prev]; length[next] = length[prev] + 1; first[next] = first[prev]; next++; }
      write(code);
    }
    prev = code;
    if (next + 1 >= (1 << codeLen) && codeLen < 12) codeLen++;
  }
  return out.subarray(0, op);
}

/** ESRI ASCII grid (.asc) as published for older EA LiDAR products. */
export function readAsc(text) {
  const lines = text.split(/\r?\n/); const hdr = {}; let i = 0;
  for (; i < lines.length; i++) { const m = lines[i].trim().match(/^([a-zA-Z_]+)\s+(-?[\d.eE+-]+)$/); if (!m) break; hdr[m[1].toLowerCase()] = parseFloat(m[2]); }
  const W = hdr.ncols, H = hdr.nrows, c = hdr.cellsize;
  const data = new Float32Array(W * H); let k = 0;
  for (; i < lines.length && k < W * H; i++) for (const v of lines[i].trim().split(/\s+/)) if (v) data[k++] = parseFloat(v);
  const x0 = hdr.xllcorner ?? (hdr.xllcenter - c / 2), yll = hdr.yllcorner ?? (hdr.yllcenter - c / 2);
  return { width: W, height: H, data, x0, y0: yll + H * c, cellX: c, cellY: c, nodata: hdr.nodata_value ?? -9999 };
}
