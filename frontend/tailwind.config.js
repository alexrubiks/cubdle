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
          orange: '#F4924D',
          yellow: '#F2D24D',
          green: '#7BD45A',
          blue: '#57def6',
          background: '#0088f7',
        }
      }
    }
  },
  plugins: [],
}