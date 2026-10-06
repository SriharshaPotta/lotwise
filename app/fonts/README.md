`Newsreader-500-{normal,italic}-opsz.woff2` are Newsreader (Production Type, SIL Open Font License 1.1)
instanced with fontTools: `wght` pinned to 500, the `opsz` axis (6–72) kept, subset to what the serif
ever sets: printable ASCII plus ’ ‘ “ ” – — · … → ← × − é and a no-break space. The site only uses
weight 500 for its serif, so this keeps the display optical sizes at about a quarter of the bytes
(74 KB for both styles instead of 279 KB). Add characters to the subset before using them in a heading.

To regenerate (e.g. to add characters), instance the upstream variable fonts with
`fontTools.varLib.instancer.instantiateVariableFont(font, {"wght": 500})` and subset with
`fontTools.subset` (flavor woff2, layout features kern/liga/calt/ccmp/locl/mark/mkmk).
