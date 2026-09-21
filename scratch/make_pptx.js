const fs = require('fs');
const JSZip = require('jszip');

const zip = new JSZip();
zip.file('ppt/slides/slide1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Hello PPTX</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>');

zip.generateAsync({type: "nodebuffer"}).then(function(content) {
    fs.writeFileSync('test.pptx', content);
    console.log('test.pptx created');
});
