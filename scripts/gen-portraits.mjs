// Generates the stylised portrait illustrations used as demo imagery.
// Run: node scripts/gen-portraits.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/img");
mkdirSync(OUT, { recursive: true });

const SKIN = {
  warm: ["#E3B492", "#C08B68"],
  olive: ["#D9A97F", "#B0805A"],
  deep: ["#A9765A", "#7E5340"],
};

const HAIR = {
  dark: ["#2A2226", "#151114"],
  brown: ["#4A3227", "#2B1C15"],
  chestnut: ["#5C3722", "#331E13"],
};

const FACE = {
  angular:
    "M124 196C124 138 154 104 200 104C246 104 276 138 276 196C276 233 267 259 253 283C241 304 220 319 200 319C180 319 159 304 147 283C133 259 124 233 124 196Z",
  soft:
    "M131 198C131 142 159 106 200 106C241 106 269 142 269 198C269 241 255 273 235 295C221 310 210 319 200 319C190 319 179 310 165 295C145 273 131 241 131 198Z",
};

/* ---------------------------------------------------------------- hair sets */
// back = drawn behind the head/shoulders, front = drawn over the skull.
const HAIRSTYLES = {
  // ——— masculine
  "m-current": {
    front:
      "M112 216C108 148 148 92 200 92C252 92 292 148 288 216C285 194 280 176 273 164C252 186 148 186 127 164C120 176 115 194 112 216Z",
    extras: `<ellipse cx="119" cy="199" rx="16" ry="36" opacity=".95"/><ellipse cx="281" cy="199" rx="16" ry="36" opacity=".95"/>`,
  },
  "m-textured-crop": {
    front:
      "M127 180C125 133 155 100 200 100C245 100 275 133 273 180C268 167 261 153 251 147C237 159 163 159 149 147C139 153 132 167 127 180Z",
    extras: `<path d="M158 122c8 10 18 14 30 12M186 114c6 12 16 18 28 17M214 118c4 11 14 17 26 15" stroke-width="5" stroke-linecap="round" fill="none" opacity=".35"/>`,
  },
  "m-low-taper": {
    front:
      "M132 184C127 118 157 84 200 84C243 84 273 118 268 184C263 165 256 150 246 143C232 155 168 155 154 143C144 150 137 165 132 184Z",
    extras: `<path d="M164 108c10 12 20 16 32 14M190 96c8 14 18 20 30 19M216 104c4 13 14 20 26 18" stroke-width="6" stroke-linecap="round" fill="none" opacity=".38"/>`,
  },
  "m-curtains": {
    front:
      "M122 214C118 142 152 92 200 92C248 92 282 142 278 214C274 192 269 173 262 160C249 149 234 150 222 159C212 143 207 131 200 126C193 131 188 143 178 159C166 150 151 149 138 160C131 173 126 192 122 214Z",
    extras: "",
  },
  // ——— feminine
  "f-current": {
    back:
      "M106 128C106 84 148 58 200 58C252 58 294 84 294 128L298 402L270 414C276 302 266 224 256 172C228 194 172 194 144 172C134 224 124 302 130 414L102 402Z",
    front:
      "M126 192C122 130 155 92 200 92C245 92 278 130 274 192C270 169 260 151 248 143C230 159 170 159 152 143C140 151 130 169 126 192Z",
  },
  "f-long-layers": {
    back:
      "M108 136C108 86 150 56 200 56C250 56 292 86 292 136L296 372C288 392 278 406 266 416C272 306 262 226 252 176C226 200 174 200 148 176C138 226 128 306 134 416C122 406 112 392 104 372Z",
    front:
      "M124 196C120 128 154 88 200 88C246 88 280 128 276 196C272 170 262 150 249 141C238 156 226 164 214 166C209 152 205 142 200 140C195 142 191 152 186 166C174 164 162 156 151 141C138 150 128 170 124 196Z",
  },
  "f-bob": {
    back:
      "M112 150C112 96 152 62 200 62C248 62 288 96 288 150L290 306C290 322 278 334 262 336C270 268 262 214 254 174C228 196 172 196 146 174C138 214 130 268 138 336C122 334 110 322 110 306Z",
    front:
      "M126 190C122 132 154 92 200 92C246 92 278 132 274 190C268 168 258 150 246 142C228 158 172 158 154 142C142 150 132 168 126 190Z",
  },
  "f-curtain-bangs": {
    back:
      "M110 140C110 88 150 58 200 58C250 58 290 88 290 140L294 356C288 382 274 400 258 410C266 300 258 224 248 174C224 196 176 196 152 174C142 224 134 300 142 410C126 400 112 382 106 356Z",
    front:
      "M124 200C120 132 154 90 200 90C246 90 280 132 276 200C271 174 262 154 250 144C239 166 227 182 214 190C207 172 204 156 200 148C196 156 193 172 186 190C173 182 161 166 150 144C138 154 129 174 124 200Z",
  },
  // ——— neutral
  "n-current": {
    front:
      "M116 210C112 146 150 94 200 94C250 94 288 146 284 210C281 190 276 174 269 163C250 183 150 183 131 163C124 174 119 190 116 210Z",
    extras: `<ellipse cx="122" cy="196" rx="14" ry="32" opacity=".95"/><ellipse cx="278" cy="196" rx="14" ry="32" opacity=".95"/>`,
  },
  "n-soft-crop": {
    front:
      "M128 182C126 130 156 96 200 96C244 96 274 130 272 182C267 168 260 154 250 147C236 160 164 160 150 147C140 154 133 168 128 182Z",
    extras: `<path d="M162 118c8 11 18 15 30 13M192 110c6 12 16 18 28 17" stroke-width="5" stroke-linecap="round" fill="none" opacity=".32"/>`,
  },
  "n-mid-length": {
    back:
      "M114 150C114 98 152 64 200 64C248 64 286 98 286 150L288 296C288 314 276 326 260 330C268 264 260 212 252 174C228 194 172 194 148 174C140 212 132 264 140 330C124 326 112 314 112 296Z",
    front:
      "M126 192C122 134 154 94 200 94C246 94 278 134 274 192C268 170 258 152 246 144C228 160 172 160 154 144C142 152 132 170 126 192Z",
  },
};

const BEARDS = {
  none: "",
  stubble:
    "M141 246c6 34 27 62 59 62s53-28 59-62c4 26-2 78-59 78s-63-52-59-78Z",
  full: "M136 232c4 44 28 92 64 92s60-48 64-92c8 40 4 108-64 108s-72-68-64-108Z",
  defined:
    "M148 258c6 26 24 48 52 48s46-22 52-48c2 22-6 62-52 62s-54-40-52-62Z",
};

function portrait({
  id,
  crop = "34 8 332 415",
  face = "angular",
  hair = "m-current",
  beard = "none",
  skin = "warm",
  hairColor = "dark",
  garment = "#1D1B21",
  bg = ["#1A1720", "#0C0B0F"],
  glow = "#E5B26A",
  glowOpacity = 0.22,
  brow = 1,
  lashes = false,
}) {
  const h = HAIRSTYLES[hair];
  const [s1, s2] = SKIN[skin];
  const [h1, h2] = HAIR[hairColor];
  const b = BEARDS[beard];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${crop}" width="400" height="500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrated portrait">
<defs>
  <radialGradient id="bg-${id}" cx="50%" cy="34%" r="78%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/>
  </radialGradient>
  <radialGradient id="glow-${id}" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="${glow}" stop-opacity="${glowOpacity}"/>
    <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="skin-${id}" x1="20%" y1="0%" x2="90%" y2="100%">
    <stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/>
  </linearGradient>
  <linearGradient id="hair-${id}" x1="25%" y1="0%" x2="80%" y2="100%">
    <stop offset="0" stop-color="${h1}"/><stop offset="1" stop-color="${h2}"/>
  </linearGradient>
  <linearGradient id="cloth-${id}" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0" stop-color="${garment}"/><stop offset="1" stop-color="${garment}" stop-opacity=".55"/>
  </linearGradient>
  <linearGradient id="vig-${id}" x1="0%" y1="55%" x2="0%" y2="100%">
    <stop offset="0" stop-color="${bg[1]}" stop-opacity="0"/><stop offset="1" stop-color="${bg[1]}" stop-opacity=".55"/>
  </linearGradient>
</defs>
<rect width="400" height="500" fill="url(#bg-${id})"/>
<ellipse cx="200" cy="215" rx="215" ry="215" fill="url(#glow-${id})"/>
${h.back ? `<path d="${h.back}" fill="url(#hair-${id})"/>` : ""}
<path d="M52 500C52 402 132 356 200 356C268 356 348 402 348 500Z" fill="url(#cloth-${id})"/>
<path d="M176 284c0 42-4 60-13 80h74c-9-20-13-38-13-80Z" fill="${s2}" opacity=".95"/>
<ellipse cx="200" cy="298" rx="42" ry="17" fill="#0A090D" opacity=".22"/>
<ellipse cx="126" cy="212" rx="12" ry="18" fill="${s2}"/>
<ellipse cx="274" cy="212" rx="12" ry="18" fill="${s2}"/>
<path d="${FACE[face]}" fill="url(#skin-${id})"/>
${b ? `<path d="${b}" fill="url(#hair-${id})" opacity="${beard === "stubble" ? 0.42 : 0.9}"/>` : ""}
<g fill="url(#hair-${id})" stroke="url(#hair-${id})">
  <path d="${h.front}" stroke="none"/>
  ${h.extras || ""}
</g>
<g opacity=".8">
  <path d="M156 187c10-8 24-9 34-3" stroke="${h2}" stroke-width="${5 * brow}" stroke-linecap="round" fill="none"/>
  <path d="M244 187c-10-8-24-9-34-3" stroke="${h2}" stroke-width="${5 * brow}" stroke-linecap="round" fill="none"/>
</g>
<g>
  <path d="M158 210c9-11 23-11 32 0-9 10-23 10-32 0Z" fill="#F6F2EC" opacity=".9"/>
  <path d="M210 210c9-11 23-11 32 0-9 10-23 10-32 0Z" fill="#F6F2EC" opacity=".9"/>
  <circle cx="174" cy="210" r="5.4" fill="#2C2229"/><circle cx="226" cy="210" r="5.4" fill="#2C2229"/>
  ${lashes ? `<path d="M157 208c10-12 25-12 34-1M209 207c9-11 24-11 34 1" stroke="#2C2229" stroke-width="2.6" fill="none" stroke-linecap="round"/>` : ""}
</g>
<path d="M200 220c-3 14-6 24-9 30 4 4 12 4 17 0" stroke="${s2}" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".75"/>
<path d="M182 272c11-7 25-7 36 0-8 11-28 11-36 0Z" fill="#B4705F" opacity=".82"/>
<path d="M182 272c11-3 25-3 36 0" stroke="#8C4F42" stroke-width="1.6" fill="none" opacity=".6"/>
<rect width="400" height="500" fill="url(#vig-${id})"/>
</svg>`;
}

const files = {
  // ——— neutral persona (the male and female personas use real photos)
  "neutral-current": { face: "soft", hair: "n-current", skin: "olive", hairColor: "brown", glow: "#8E8AA0", glowOpacity: 0.14 },
  "hero-neutral": { crop: "56 34 288 360", face: "soft", hair: "n-mid-length", skin: "olive", hairColor: "brown", glowOpacity: 0.34 },

  "neutral-soft-crop": { face: "soft", hair: "n-soft-crop", skin: "olive", hairColor: "brown" },
  "neutral-mid-length": { face: "soft", hair: "n-mid-length", skin: "olive", hairColor: "brown" },
  "neutral-curtains": { face: "soft", hair: "m-curtains", skin: "olive", hairColor: "brown" },

  // ——— progress day 30
  "neutral-day30": { face: "soft", hair: "n-mid-length", skin: "olive", hairColor: "brown", garment: "#26232B", glowOpacity: 0.3 },
};

for (const [name, cfg] of Object.entries(files)) {
  writeFileSync(`${OUT}/${name}.svg`, portrait({ id: name, ...cfg }));
}
console.log(`wrote ${Object.keys(files).length} portraits to public/img`);
