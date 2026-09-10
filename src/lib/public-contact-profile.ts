// No email address is published on the public site; visitors reach the owner
// through the on-site message form instead.
export const PUBLIC_CONTACT_PROFILE = {
  name: "Bence Flosz",
  interest: "3D Artist & Game Dev",
  webLabel: "flz.works",
  webUrl: "https://flz.works",
} as const;

export const PUBLIC_CONTACT_ROWS = [
  ["NAME", PUBLIC_CONTACT_PROFILE.name],
  ["INTEREST", PUBLIC_CONTACT_PROFILE.interest],
  ["WEB", PUBLIC_CONTACT_PROFILE.webLabel],
] as const;

// Served from /public so opening the ID card never calls a third-party QR API.
export const PUBLIC_CONTACT_QR_SRC = "/qr-flz-works.svg";
