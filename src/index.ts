// https://answers.unity.com/questions/147431/how-can-i-view-a-webplayer-playerprefs-file.html

const HEADER = "UnityPrf";
const V1 = 0x10000;
const V2 = 0x100000;

const T_STRING = 0x80;
const T_FLOAT = 0xfd;
const T_INT = 0xfe;

export function parse(buf: ArrayBuffer) {
  const view = new DataView(buf);
  // TODO: TextDecoder seems to be slower than buffer at node.js
  // https://github.com/nodejs/node/issues/39879
  const decoder = new TextDecoder();

  const res: Record<string, unknown> = {};

  // header
  if (
    // subarray is slower than slice
    decoder.decode(buf.slice(0, 8)) !== HEADER ||
    view.getUint32(8, true) !== V1 ||
    view.getUint32(12, true) !== V2
  ) {
    throw new Error("incorrect header");
  }

  let offset = 16;

  while (buf.byteLength > offset) {
    const keyLen = view.getUint8(offset);
    offset += 1;

    const key = decoder.decode(buf.slice(offset, offset + keyLen));
    offset += keyLen;

    const type = view.getUint8(offset);
    // console.log(type.toString(16));
    offset += 1;

    let v;
    if (type < T_STRING) {
      v = decoder.decode(buf.slice(offset, offset + type));
      offset += type;
    } else if (type === T_STRING) {
      const valueLen = view.getUint32(offset, true);
      offset += 4;

      v = decoder.decode(buf.slice(offset, offset + valueLen));
      offset += valueLen;
    } else if (type === T_FLOAT) {
      v = view.getFloat32(offset, true);
      offset += 4;
    } else if (type === T_INT) {
      v = view.getInt32(offset, true);
      offset += 4;
    }

    res[key] = v;
  }

  return res;
}

function merge(b0: ArrayBuffer, b1: ArrayBuffer): ArrayBuffer {
  var tmp = new Uint8Array(b0.byteLength + b1.byteLength);
  tmp.set(new Uint8Array(b0));
  tmp.set(new Uint8Array(b1), b0.byteLength);
  return tmp.buffer;
}

export function dump(value: Record<string, unknown>) {
  const encoder = new TextEncoder();
  let buf = new ArrayBuffer(16);

  // header
  new Uint8Array(buf).set(encoder.encode(HEADER));
  const view = new DataView(buf);
  view.setUint32(8, V1, true);
  view.setUint32(12, V2, true);

  for (const [k, v] of Object.entries(value)) {
    buf = merge(buf, Uint8Array.of(k.length).buffer);
    buf = merge(buf, encoder.encode(k).buffer);

    if (typeof v === "string") {
      if (v.length < T_STRING) {
        buf = merge(buf, Uint8Array.of(v.length).buffer);
        buf = merge(buf, encoder.encode(v).buffer);
      } else {
        buf = merge(buf, Uint8Array.of(T_STRING).buffer);

        const lenBuf = new ArrayBuffer(4);
        new DataView(lenBuf).setUint32(0, v.length, true);
        buf = merge(buf, lenBuf);

        buf = merge(buf, encoder.encode(v).buffer);
      }
    } else if (typeof v === "number") {
      if (v % 1 === 0) {
        buf = merge(buf, Uint8Array.of(T_INT));

        const vBuf = new ArrayBuffer(4);
        new DataView(vBuf).setUint32(0, v, true);
        buf = merge(buf, vBuf);
      } else {
        buf = merge(buf, Uint8Array.of(T_FLOAT));

        const vBuf = new ArrayBuffer(4);
        new DataView(vBuf).setFloat32(0, v, true);
        buf = merge(buf, vBuf);
      }
    } else {
      throw new Error("unsupported type");
    }
  }

  return buf;
}
