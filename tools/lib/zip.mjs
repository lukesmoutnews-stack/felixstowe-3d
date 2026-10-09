// Minimal ZIP reader (stored + deflate entries) so Environment Agency downloads can be
// used without unzipping by hand. No dependencies.
import { inflateRawSync } from 'node:zlib';

export function* zipEntries(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip file');
  let count = dv.getUint16(eocd + 10, true), cd = dv.getUint32(eocd + 16, true);
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(cd, true) !== 0x02014b50) throw new Error('bad zip central directory');
    const method = dv.getUint16(cd + 10, true), csize = dv.getUint32(cd + 20, true);
    const nlen = dv.getUint16(cd + 28, true), xlen = dv.getUint16(cd + 30, true), clen = dv.getUint16(cd + 32, true);
    const local = dv.getUint32(cd + 42, true);
    const name = buf.subarray(cd + 46, cd + 46 + nlen).toString('utf8');
    const lnlen = dv.getUint16(local + 26, true), lxlen = dv.getUint16(local + 28, true);
    const start = local + 30 + lnlen + lxlen;
    const data = buf.subarray(start, start + csize);
    yield { name, read: () => (method === 0 ? Buffer.from(data) : method === 8 ? inflateRawSync(data) : (() => { throw new Error('zip method ' + method); })()) };
    cd += 46 + nlen + xlen + clen;
  }
}
