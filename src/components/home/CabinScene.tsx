/**
 * The hero's landscape: a cabin with panels on the roof, a ground mount, a
 * battery shed, pines and hills — so the page reads as off-grid before a word
 * of it is read.
 *
 * Two pieces, because they scale differently. The sun keeps the old sun-ring
 * pattern's motif, now radiating from an actual sun; it sits top right and is
 * dropped on narrow screens where it would land behind the headline. The
 * landscape is anchored to the bottom edge and slices at its sides. Below md
 * it is drawn twice as wide and pulled left so the crop lands on the cabin and
 * its array rather than the empty middle of the valley.
 *
 * Colours are the --zon-land-*, pine, wood and panel tokens in globals.css —
 * illustration tokens, kept apart from the state greens.
 */

export function HeroSun() {
  return (
    <svg
      className="pointer-events-none absolute right-0 top-0 hidden h-[520px] w-[520px] text-zon-gold md:block lg:right-[6%]"
      viewBox="0 0 520 520"
      aria-hidden="true"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="260" cy="250" r="90" strokeOpacity="0.35" />
        <circle cx="260" cy="250" r="140" strokeOpacity="0.22" />
        <circle cx="260" cy="250" r="195" strokeOpacity="0.14" />
        <circle cx="260" cy="250" r="255" strokeOpacity="0.08" />
      </g>
      <circle cx="260" cy="250" r="54" className="fill-zon-gold-light" />
    </svg>
  )
}

export function CabinScene() {
  return (
    <svg
      className="pointer-events-none absolute bottom-0 -left-[87%] h-[200px] w-[200%] md:left-0 md:h-[320px] md:w-full"
      viewBox="0 320 1280 320"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <g id="zz-pine">
          <path d="M0 0 L-13 24 L-6 24 L-17 44 L-8 44 L-21 68 L21 68 L8 44 L17 44 L6 24 L13 24 Z" />
          <rect x="-2.5" y="68" width="5" height="8" />
        </g>
      </defs>

      <path d="M0 420 L110 360 L200 395 L330 318 L450 388 L560 345 L680 402 L800 330 L930 392 L1050 322 L1170 380 L1280 350 L1280 640 L0 640 Z" className="fill-zon-land-far" />
      <path d="M0 470 C200 425 360 455 520 445 C700 432 860 405 1040 430 C1150 444 1220 434 1280 426 L1280 640 L0 640 Z" className="fill-zon-land-hills" />
      <g className="fill-zon-pine-far">
        <use href="#zz-pine" transform="translate(70 402) scale(0.7)" />
        <use href="#zz-pine" transform="translate(100 408) scale(0.55)" />
        <use href="#zz-pine" transform="translate(600 392) scale(0.6)" />
        <use href="#zz-pine" transform="translate(628 398) scale(0.5)" />
        <use href="#zz-pine" transform="translate(1180 380) scale(0.65)" />
        <use href="#zz-pine" transform="translate(1210 388) scale(0.5)" />
      </g>
      <path d="M0 540 C300 512 700 522 1280 500 L1280 640 L0 640 Z" className="fill-zon-land-meadow" />

      {/* Cabin, with the array as its roof */}
      <rect x="838" y="444" width="10" height="34" className="fill-zon-wood-dark" />
      <path d="M770 468 L960 468 L960 530 L770 530 Z" className="fill-zon-wood" />
      <path d="M770 484 H960 M770 500 H960 M770 516 H960" className="stroke-zon-wood-dark" strokeWidth="2" />
      <path d="M756 470 L974 470 L952 418 L782 418 Z" className="fill-zon-panel" />
      <path d="M769 444 L963 444 M825 418 L815 470 M868 418 L865 470 M911 418 L915 470" className="stroke-zon-panel-grid" strokeWidth="1.5" />
      <rect x="800" y="492" width="26" height="38" className="fill-zon-wood-dark" />
      <rect x="880" y="486" width="40" height="26" className="fill-zon-gold-light" />
      <path d="M900 486 V512 M880 499 H920" className="stroke-zon-wood" strokeWidth="2" />

      {/* Ground mount, and its cable run to the cabin */}
      <path d="M1060 520 L1052 488 M1150 516 L1146 474" className="stroke-zon-wood-dark" strokeWidth="3" />
      <path d="M1030 492 L1170 492 L1156 452 L1044 452 Z" className="fill-zon-panel" />
      <path d="M1037 472 H1163 M1072 452 L1068 492 M1100 452 V492 M1128 452 L1132 492" className="stroke-zon-panel-grid" strokeWidth="1.5" />
      <path d="M1060 522 C1030 540 990 536 960 526" fill="none" className="stroke-zon-wood-dark" strokeWidth="2" strokeDasharray="5 5" />

      {/* Battery shed */}
      <rect x="696" y="498" width="54" height="36" className="fill-zon-wood" />
      <path d="M690 500 L756 500 L746 486 L700 486 Z" className="fill-zon-wood-dark" />

      <g className="fill-zon-pine">
        <use href="#zz-pine" transform="translate(640 470)" />
        <use href="#zz-pine" transform="translate(605 490) scale(0.8)" />
        <use href="#zz-pine" transform="translate(1225 450) scale(1.2)" />
        <use href="#zz-pine" transform="translate(1255 480) scale(0.9)" />
        <use href="#zz-pine" transform="translate(30 488) scale(1.1)" />
        <use href="#zz-pine" transform="translate(360 500) scale(0.9)" />
      </g>
      <path d="M0 600 C400 585 900 592 1280 578 L1280 640 L0 640 Z" className="fill-zon-land-ground" />
    </svg>
  )
}
