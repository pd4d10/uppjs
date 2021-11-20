// https://answers.unity.com/questions/147431/how-can-i-view-a-webplayer-playerprefs-file.html

const HEADER = "UnityPrf";
const V1 = 0x10000;
const V2 = 0x100000;

const T_STRING = 0x80;
const T_FLOAT = 0xfd;
const T_INT = 0xfe;

export function parse(buf: Buffer) {
  const res: Record<string, unknown> = {};
  let offset = 0;

  // header
  if (
    buf.slice(0, 8).toString() !== HEADER ||
    buf.readUInt32LE(8) !== V1 ||
    buf.readUInt32LE(12) !== V2
  ) {
    throw new Error("incorrect header");
  }
  offset += 16;

  while (buf.length > offset) {
    const keyLen = buf.readUInt8(offset);
    offset += 1;

    const key = buf.slice(offset, offset + keyLen).toString();
    offset += keyLen;

    const type = buf.readUInt8(offset);
    // console.log(type.toString(16));
    offset += 1;

    let v;
    if (type < T_STRING) {
      v = buf.slice(offset, offset + type).toString();
      offset += type;
    } else if (type === T_STRING) {
      const valueLen = buf.readUInt32LE(offset);
      offset += 4;

      v = buf.slice(offset, offset + valueLen).toString();
      offset += valueLen;
    } else if (type === T_FLOAT) {
      v = buf.readFloatLE(offset);
      offset += 4;
    } else if (type === T_INT) {
      v = buf.readInt32LE(offset);
      offset += 4;
    }

    res[key] = v;
  }

  return res;
}

export function dump(value: Record<string, unknown>) {
  let buf = Buffer.allocUnsafe(16);

  // header
  buf.write(HEADER);
  buf.writeUInt32LE(V1, 8);
  buf.writeUInt32LE(V2, 12);

  for (const [k, v] of Object.entries(value)) {
    buf = Buffer.concat([buf, Buffer.from([k.length]), Buffer.from(k)]);

    if (typeof v === "string") {
      if (v.length < T_STRING) {
        buf = Buffer.concat([buf, Buffer.from([v.length]), Buffer.from(v)]);
      } else {
        const lenBuf = Buffer.allocUnsafe(4);
        lenBuf.writeUInt32LE(v.length);

        buf = Buffer.concat([
          buf,
          Buffer.from([T_STRING]),
          lenBuf,
          Buffer.from(v),
        ]);
      }
    } else if (typeof v === "number") {
      if (v % 1 === 0) {
        const valueBuf = Buffer.allocUnsafe(4);
        valueBuf.writeInt32LE(v);

        buf = Buffer.concat([buf, Buffer.from([T_INT]), valueBuf]);
      } else {
        const valueBuf = Buffer.allocUnsafe(4);
        valueBuf.writeFloatLE(v);

        buf = Buffer.concat([buf, Buffer.from([T_FLOAT]), valueBuf]);
      }
    } else {
      throw new Error("unsupported type");
    }
  }

  return buf;
}
