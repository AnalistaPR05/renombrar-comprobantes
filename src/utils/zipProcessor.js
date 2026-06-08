import JSZip from "jszip";
import { saveAs } from "file-saver";
import { getNewFileNameFromFile } from "./comprobanteReader";

export async function processZipFile(zipFile) {
  const inputZip = await JSZip.loadAsync(zipFile);
  const outputZip = new JSZip();

  const results = [];
  const usedNames = new Set();

  const entries = Object.values(inputZip.files).filter((entry) => !entry.dir);

  for (const entry of entries) {
    const originalName = entry.name;
    const extension = getExtension(originalName);

    if (!["xml", "pdf"].includes(extension)) {
      results.push({
        originalName,
        newName: "-",
        status: "OMITIDO",
        message: "No es XML ni PDF.",
      });

      continue;
    }

    try {
      const blob = await entry.async("blob");
      const file = new File([blob], getBaseName(originalName), {
        type: extension === "pdf" ? "application/pdf" : "text/xml",
      });

      let newName = await getNewFileNameFromFile(file);
      newName = getUniqueName(newName, usedNames);

      usedNames.add(newName);
      outputZip.file(newName, blob);

      results.push({
        originalName,
        newName,
        status: "OK",
        message: "Renombrado correctamente.",
      });
    } catch (error) {
      results.push({
        originalName,
        newName: "-",
        status: "ERROR",
        message: error.message,
      });
    }
  }

  return {
    outputZip,
    results,
  };
}

export async function downloadOutputZip(outputZip, fileName = "comprobantes-renombrados.zip") {
  const content = await outputZip.generateAsync({ type: "blob" });
  saveAs(content, fileName);
}

function getExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
}

function getBaseName(path) {
  return path.split("/").pop();
}

function getUniqueName(fileName, usedNames) {
  if (!usedNames.has(fileName)) {
    return fileName;
  }

  const extension = getExtension(fileName);
  const nameWithoutExtension = fileName.replace(`.${extension}`, "");

  let counter = 1;
  let newName = `${nameWithoutExtension} (${counter}).${extension}`;

  while (usedNames.has(newName)) {
    counter++;
    newName = `${nameWithoutExtension} (${counter}).${extension}`;
  }

  return newName;
}