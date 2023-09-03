import Undici from "undici";

let fetch: Function;

const nodeVersion = process.versions.node
  .split(".")
  .map((item) => parseInt(item));

if (nodeVersion[0] < 18) {
    fetch = Undici.fetch
} else {
    fetch = globalThis.fetch
}

export default fetch