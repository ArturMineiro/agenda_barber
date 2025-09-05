/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],

  theme: {
    extend: {
      colors: {
        primary: "#68C5DB",     // azul principal
        secondary: "#F5F5F5",   // cor secundária
        grayDark: "#1f2937",    // cinza escuro atualizado
        gray: "#888888",        // cinza médio
        white: "#FFFFFF",       // branco
        black: "#000000",       // preto
        card: "#1F1F1F",        // fundo de card escuro
      },
    },
  },
  plugins: [],
};
