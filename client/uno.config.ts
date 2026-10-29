import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";

export default defineConfig({
  theme: {
    colors: {
      // Crate Factory palette: warm paper, ink, one safety-orange accent
      paper: "#f3f0e8",
      surface: "#fbfaf7",
      ink: "#1d1c1a",
      line: "#dcd6c8",
      muted: "#77705f",
      faint: "#a8a293",
      accent: "#e2571e",
      up: "#2e6b4a",
      down: "#a83a2c",
    },
    fontFamily: {
      sans: '"IBM Plex Sans", system-ui, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, monospace',
    },
    extend: {
      colors: {
        empirica: {
          50: "#fbfcfe",
          100: "#f2f7fd",
          200: "#bcd8f6",
          300: "#8abbef",
          400: "#549ce8",
          500: "#237fe1",
          600: "#1966b8",
          700: "#124b87",
          800: "#0c325a",
          900: "#06192d",
        },
      },
    },
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons(),
    presetTypography(),
    presetWebFonts({
      fonts: {
        // ...
      },
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
});
