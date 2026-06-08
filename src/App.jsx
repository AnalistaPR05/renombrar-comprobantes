import { useState } from "react";
import { downloadOutputZip, processZipFile } from "./utils/zipProcessor";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [outputZip, setOutputZip] = useState(null);
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    setSelectedFile(file || null);
    setOutputZip(null);
    setResults([]);
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      alert("Selecciona un archivo ZIP.");
      return;
    }

    const extension = selectedFile.name.split(".").pop().toLowerCase();

    if (extension !== "zip") {
      alert("Por ahora esta pantalla procesa archivos .zip. El resultado también se genera en .zip.");
      return;
    }

    try {
      setProcessing(true);

      const response = await processZipFile(selectedFile);

      setOutputZip(response.outputZip);
      setResults(response.results);
    } catch (error) {
      alert(`Error al procesar el ZIP: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!outputZip || !selectedFile) return;

    const zipName = selectedFile.name;
    const outputName = `renombrado-${zipName}`;

    await downloadOutputZip(outputZip, outputName);
  };

  const okCount = results.filter((item) => item.status === "OK").length;
  const errorCount = results.filter((item) => item.status === "ERROR").length;
  const omittedCount = results.filter((item) => item.status === "OMITIDO").length;

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Renombrar comprobantes desde ZIP</h1>

        <p style={styles.description}>
          Sube un archivo ZIP con comprobantes XML o PDF. El sistema leerá cada archivo
          y generará un nuevo ZIP con los nombres cambiados.
        </p>

        <div style={styles.uploadBox}>
          <input
            type="file"
            accept=".zip,.rar"
            onChange={handleFileChange}
          />

          {selectedFile && (
            <p style={styles.fileName}>
              Archivo seleccionado: <strong>{selectedFile.name}</strong>
            </p>
          )}
        </div>

        <div style={styles.actions}>
          <button
            style={styles.primaryButton}
            onClick={handleProcess}
            disabled={processing}
          >
            {processing ? "Procesando..." : "Procesar archivo"}
          </button>

          <button
            style={{
              ...styles.secondaryButton,
              opacity: outputZip ? 1 : 0.5,
              cursor: outputZip ? "pointer" : "not-allowed",
            }}
            onClick={handleDownload}
            disabled={!outputZip}
          >
            Descargar ZIP renombrado
          </button>
        </div>

        {results.length > 0 && (
          <>
            <div style={styles.summary}>
              <div style={styles.summaryItem}>
                <strong>{okCount}</strong>
                <span>Renombrados</span>
              </div>

              <div style={styles.summaryItem}>
                <strong>{errorCount}</strong>
                <span>Errores</span>
              </div>

              <div style={styles.summaryItem}>
                <strong>{omittedCount}</strong>
                <span>Omitidos</span>
              </div>
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Archivo original</th>
                  <th style={styles.th}>Nuevo nombre</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Detalle</th>
                </tr>
              </thead>

              <tbody>
                {results.map((item, index) => (
                  <tr key={`${item.originalName}-${index}`}>
                    <td style={styles.td}>{item.originalName}</td>
                    <td style={styles.td}>{item.newName}</td>
                    <td style={styles.td}>
                      <span style={getStatusStyle(item.status)}>
                        {item.status}
                      </span>
                    </td>
                    <td style={styles.td}>{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "40px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    maxWidth: "1100px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "14px",
    padding: "28px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  },
  title: {
    margin: 0,
    fontSize: "28px",
  },
  description: {
    color: "#555",
    marginTop: "10px",
  },
  uploadBox: {
    marginTop: "24px",
    padding: "20px",
    border: "2px dashed #cbd5e1",
    borderRadius: "12px",
    background: "#f8fafc",
  },
  fileName: {
    marginTop: "12px",
  },
  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "20px",
  },
  primaryButton: {
    padding: "10px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "10px 18px",
    border: "1px solid #2563eb",
    borderRadius: "8px",
    background: "#fff",
    color: "#2563eb",
    fontWeight: "bold",
  },
  summary: {
    display: "flex",
    gap: "14px",
    marginTop: "24px",
  },
  summaryItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: "130px",
    padding: "14px",
    borderRadius: "10px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "24px",
  },
  th: {
    background: "#f1f5f9",
    textAlign: "left",
    padding: "10px",
    border: "1px solid #e2e8f0",
  },
  td: {
    padding: "10px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
  },
};

function getStatusStyle(status) {
  const base = {
    padding: "4px 8px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
  };

  if (status === "OK") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "ERROR") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    ...base,
    background: "#e5e7eb",
    color: "#374151",
  };
}

export default App;