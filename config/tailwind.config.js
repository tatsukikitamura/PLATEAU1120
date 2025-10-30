/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './app/views/**/*.html.erb',
      './app/assets/stylesheets/**/*.css',
      './app/javascript/**/*.js',
      '!./app/assets/builds/**'
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }
  