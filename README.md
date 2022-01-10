# uppjs

Unity PlayerPrefs parser and dumper in JavaScript

## Usage

```ts
import { load, dump } from "uppjs";

function load(buf: ArrayBuffer): Record<string, string | number>;
function dump(value: Record<string, unknown>): ArrayBuffer;
```

## License

MIT
