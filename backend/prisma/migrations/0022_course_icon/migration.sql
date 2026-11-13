-- Course icons: optional animated preset id and optional custom SVG (additive only; existing rows stay NULL = "random from presets").
ALTER TABLE "Course" ADD COLUMN "svgPresetId" TEXT;
ALTER TABLE "Course" ADD COLUMN "customSvg" TEXT;
