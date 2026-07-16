import { pipeline, RawImage } from "@xenova/transformers";
console.log("loading depth model (first run downloads ~50-100MB)…");
const depth = await pipeline("depth-estimation", "Xenova/depth-anything-small-hf");
console.log("model ready, estimating depth for public/host.jpg…");
const img = await RawImage.read("public/host.jpg");
const out = await depth(img);
await out.depth.save("public/host-depth.png");
console.log("saved public/host-depth.png", out.depth.width + "x" + out.depth.height);
