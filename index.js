#! /usr/bin/env node

const htmlparser = require('htmlparser');
const hash = require('hasha');
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const sourceDir = args[0];

const getFiles = (dir, fileArray) => {
  fileArray = fileArray || [];

    const files = fs.readdirSync(dir);
  for (const file in files) {
    const name = `${dir}/${files[file]}`;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, fileArray);
    } else {
      if (name.endsWith('.html')) {
        fileArray.push(name);
      }
    }
  }

  return fileArray;
}

const handler = new htmlparser.DefaultHandler(function (error, dom) {
  if (error) {
    console.log(error);
  }
});

const parser = new htmlparser.Parser(handler);

const dirContents = getFiles(sourceDir);
// assume sourceDir is layouts/portfolio
for (const dirContent of dirContents) {
  // dirContent will be of the form layouts/portfolio/index.html
  const rawHtml = fs.readFileSync(dirContent);
  parser.parseComplete(rawHtml);
  const { dom } = handler;
  const htmlTag = dom.find(domElement => domElement.name === 'html');
  try {
    const headTag = htmlTag.children.find(childTag => childTag.name === 'head');
    const styleTags = headTag.children.filter(headChild => headChild.name === 'style');

    for (const styleTag of styleTags) {
      for (const style of styleTag.children) {
        const css = style.raw;
        // destDir will be layouts/portfolio
        const destDir = path.dirname(dirContent);
        // fileName will be portfolio-checksum.css
        const fileName = `${path.basename(destDir)}-${hash(css, { algorithm: 'md5' })}.css`;

        // writes new css file
        fs.writeFileSync(
          `${destDir}/${fileName}`,
          css
        );

        let replacedContent = rawHtml.toString().replace(css, '');
        replacedContent = replacedContent.replace('</style>', '');
        replacedContent = replacedContent.replace(
          '<style type="text/css">',
          `<link href="${fileName}" rel="stylesheet" type="text/css" />`
        );

        // replaces style tag and contents with link tag
        fs.writeFileSync(
          dirContent,
          replacedContent
        );
      }
    }
  } catch(err) {
    console.log(`Error while handling ${dirContent}`);
  }
}