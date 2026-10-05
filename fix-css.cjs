const fs = require('fs');
let css = fs.readFileSync('src/tt1/tradebit.css', 'utf-8');

// Replace any garbled bytes with the correct characters
css = css.replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â/g, '—');
css = css.replace(/Ãƒâ€šÃ‚Â·/g, '·');
css = css.replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“/g, '–');
css = css.replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ/g, '“');
css = css.replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â/g, '”');
// Ensure the quote line is completely reset just in case
css = css.replace(/\.tcard q\{quotes:[^;]+;/g, '.tcard q{quotes:"“" "”";');

fs.writeFileSync('src/tt1/tradebit.css', css, 'utf-8');
console.log('Fixed');
