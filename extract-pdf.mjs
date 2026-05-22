import { readFileSync, writeFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const buf = new Uint8Array(readFileSync('C:/Users/jeeva/Downloads/Warehouse Grade3 Storage Distribution Compliance Induction Manual.pdf'));
const doc = await getDocument({ data: buf }).promise;
console.log('Pages:', doc.numPages);
let fullText = '';
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const tc = await page.getTextContent();
  const pageText = tc.items.map(item => item.str).join(' ');
  fullText += `\n--- PAGE ${i} ---\n${pageText}`;
}
writeFileSync('C:/Users/jeeva/warehouse-lms/pdf-output.txt', fullText);
console.log('Done. Length:', fullText.length);
