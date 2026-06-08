import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export async function getNewFileNameFromFile(file) {
  const extension = getExtension(file.name);

  if (extension === "xml") {
    const text = await file.text();
    const number = getNumberFromXml(text);

    if (!number) {
      throw new Error(
        "No se encontró estab, ptoEmi, secuencial, claveAcceso ni numeroAutorizacion en el XML."
      );
    }

    return `${number}.xml`;
  }

  if (extension === "pdf") {
    const text = await readPdfText(file);
    const number = getNumberFromPdf(text);

    if (!number) {
      throw new Error(
        "No se encontró número de comprobante ni clave de acceso en el PDF."
      );
    }

    return `${number}.pdf`;
  }

  throw new Error("Archivo no soportado.");
}

function getExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
}

/**
 * Soporta XML en estos formatos:
 * 1. XML directo:
 *    <factura>
 *      <infoTributaria>
 *        <estab>001</estab>
 *        <ptoEmi>013</ptoEmi>
 *        <secuencial>000800508</secuencial>
 *      </infoTributaria>
 *    </factura>
 *
 * 2. XML directo solo con claveAcceso:
 *    <claveAcceso>0904202601189001066700120010130008005080080050811</claveAcceso>
 *
 * 3. XML autorizado del SRI:
 *    <autorizacion>
 *      <numeroAutorizacion>...</numeroAutorizacion>
 *      <comprobante><![CDATA[
 *        <factura>
 *          ...
 *        </factura>
 *      ]]></comprobante>
 *    </autorizacion>
 */
function getNumberFromXml(xmlText) {
  // Caso 1: XML directo con factura, notaCredito, retencion, etc.
  const directNumber = getNumberFromXmlText(xmlText);

  if (directNumber) {
    return directNumber;
  }

  // Caso 2: XML autorizado con comprobante dentro de CDATA
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "text/xml");

  const comprobanteCdata = getTagValue(xml, "comprobante");

  if (comprobanteCdata) {
    const innerNumber = getNumberFromXmlText(comprobanteCdata);

    if (innerNumber) {
      return innerNumber;
    }
  }

  // Caso 3: XML autorizado donde numeroAutorizacion es la clave de acceso
  const numeroAutorizacion = getTagValue(xml, "numeroAutorizacion");

  if (numeroAutorizacion) {
    return getNumberFromClaveAcceso(numeroAutorizacion);
  }

  return null;
}

function getNumberFromXmlText(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "text/xml");

  const estab = getTagValue(xml, "estab");
  const ptoEmi = getTagValue(xml, "ptoEmi");
  const secuencial = getTagValue(xml, "secuencial");

  if (estab && ptoEmi && secuencial) {
    return `${estab}-${ptoEmi}-${secuencial}`;
  }

  const claveAcceso = getTagValue(xml, "claveAcceso");

  if (claveAcceso) {
    return getNumberFromClaveAcceso(claveAcceso);
  }

  return null;
}

function getTagValue(xml, tagName) {
  return xml.getElementsByTagName(tagName)?.[0]?.textContent?.trim() || "";
}

function getNumberFromPdf(text) {
  // Busca formato directo: 003-103-000001281
  const directMatch = text.match(/\b\d{3}-\d{3}-\d{9}\b/);

  if (directMatch) {
    return directMatch[0];
  }

  // Busca clave de acceso SRI de 49 dígitos
  const claveMatch = text.match(/\b\d{49}\b/);

  if (claveMatch) {
    return getNumberFromClaveAcceso(claveMatch[0]);
  }

  return null;
}

function getNumberFromClaveAcceso(claveAcceso) {
  if (!claveAcceso) {
    return null;
  }

  const cleanClaveAcceso = claveAcceso.replace(/\D/g, "");

  if (!/^\d{49}$/.test(cleanClaveAcceso)) {
    return null;
  }

  // Estructura clave de acceso SRI:
  // 1-8   fecha emisión
  // 9-10  tipo comprobante
  // 11-23 RUC
  // 24    ambiente
  // 25-30 serie: estab + ptoEmi
  // 31-39 secuencial
  // 40-47 código numérico
  // 48    tipo emisión
  // 49    dígito verificador
  const estab = cleanClaveAcceso.substring(24, 27);
  const ptoEmi = cleanClaveAcceso.substring(27, 30);
  const secuencial = cleanClaveAcceso.substring(30, 39);

  return `${estab}-${ptoEmi}-${secuencial}`;
}

async function readPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += ` ${pageText}`;
  }

  return fullText;
}