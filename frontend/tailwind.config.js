/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // Include all relevant paths
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brandLight: "#8ecae6",
        brandMain: "#219ebc",
        brandDark: "#023047",
        brandAccent: "#ffb703",
        brandHot: "#fb8500",
      },
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
      // Subtle fade/transition for micro-interactions
      transitionProperty: {
        height: "height",
      },
      transitionTimingFunction: {
        "in-expo": "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },
    },
  },
  plugins: [],
};
