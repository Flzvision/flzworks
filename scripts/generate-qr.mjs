// Regenerates the static ID-card QR code so visitors never call a third-party QR API.
// Run: node scripts/generate-qr.mjs
import { writeFile } from "node:fs/promises";
import QRCode from "qrcode";

const target = "https://flz.works";
const svg = await QRCode.toString(target, {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 1,
  color: { dark: "#000000", light: "#ffffff" },
});

await writeFile(new URL("../public/qr-flz-works.svg", import.meta.url), svg);
console.log(`Wrote public/qr-flz-works.svg for ${target}`);
