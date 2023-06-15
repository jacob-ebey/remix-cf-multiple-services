/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "app/**/*.tsx",
    "../../packages/component-library/dist/my-lib.es.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
