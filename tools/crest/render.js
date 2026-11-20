// node render.js in.svg out.png width   (needs: npm i --no-save @resvg/resvg-js)
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');
const [, , input, output, width] = process.argv;
const fontDir = path.join(__dirname, 'fonts');
const r = new Resvg(fs.readFileSync(input, 'utf8'), {
  fitTo: { mode: 'width', value: Number(width) },
  font: { loadSystemFonts: false, fontFiles: fs.readdirSync(fontDir).map((f) => path.join(fontDir, f)), defaultFontFamily: 'Arimo' },
  shapeRendering: 2, textRendering: 2,
});
fs.writeFileSync(output, r.render().asPng());
