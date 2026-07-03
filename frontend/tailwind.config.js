export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        title: ['"Sora"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        cubdle: {
          red: '#F0455A',
          orange: '#FA9C59',
          yellow: '#F2D24D',
          green: '#7BD45A',
          blue: '#57def6',
          background: '#0088f7',
        },
        tile: {
          correct: '#7BD45A',
          near: '#F2D24D',
          partial: '#FA9C59',
          wrong: '#F0455A',
          none: '#a8a8a8',
        }
      }
    }
  },
  plugins: [],
}