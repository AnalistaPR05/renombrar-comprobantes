import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import './App.css'

function App() {
  const barcodeInputRef = useRef(null)

  const [codigoActual, setCodigoActual] = useState('')
  const [codigosInventario, setCodigosInventario] = useState([])
  const [error, setError] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)
  const [filasPorPagina, setFilasPorPagina] = useState(10)

  useEffect(() => {
    setTimeout(() => {
      enfocarInput()
    }, 300)
  }, [])

  const totalUnidades = useMemo(() => {
    return codigosInventario.reduce((total, item) => {
      return total + Number(item.cantidad || 0)
    }, 0)
  }, [codigosInventario])

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(codigosInventario.length / filasPorPagina))
  }, [codigosInventario.length, filasPorPagina])

  const codigosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * filasPorPagina
    const fin = inicio + filasPorPagina
    return codigosInventario.slice(inicio, fin)
  }, [codigosInventario, paginaActual, filasPorPagina])

  const leerCodigo = () => {
    const codigo = String(codigoActual || '').trim()

    if (!codigo) {
      enfocarInput()
      return
    }

    setCodigosInventario((prev) => {
      const existente = prev.find((x) => x.codigo === codigo)

      if (existente) {
        return prev.map((item) =>
          item.codigo === codigo
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      }

      return [
        {
          codigo,
          cantidad: 1,
        },
        ...prev,
      ]
    })

    setPaginaActual(1)
    setError('')
    setCodigoActual('')
    enfocarInput()
  }

  const incrementarCantidad = (codigo) => {
    setCodigosInventario((prev) =>
      prev.map((item) =>
        item.codigo === codigo
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      )
    )

    enfocarInput()
  }

  const decrementarCantidad = (codigo) => {
    setCodigosInventario((prev) =>
      prev.map((item) =>
        item.codigo === codigo && item.cantidad > 1
          ? { ...item, cantidad: item.cantidad - 1 }
          : item
      )
    )

    enfocarInput()
  }

  const cambiarCantidad = (codigo, value) => {
    const cantidad = Number(value)

    const nuevaCantidad =
      Number.isNaN(cantidad) || cantidad < 1
        ? 1
        : Math.floor(cantidad)

    setCodigosInventario((prev) =>
      prev.map((item) =>
        item.codigo === codigo
          ? { ...item, cantidad: nuevaCantidad }
          : item
      )
    )

    enfocarInput()
  }

  const eliminarCodigo = (codigo) => {
    setCodigosInventario((prev) => prev.filter((x) => x.codigo !== codigo))
    enfocarInput()
  }

  const limpiarTodo = () => {
    setCodigosInventario([])
    setCodigoActual('')
    setError('')
    setPaginaActual(1)
    enfocarInput()
  }

  const exportarExcel = () => {
    try {
      if (!codigosInventario || codigosInventario.length === 0) {
        setError('No hay códigos para exportar')
        enfocarInput()
        return
      }

      const data = codigosInventario.map((item) => ({
        codigo: item.codigo,
        cantidad: Number(item.cantidad || 0),
      }))

      const worksheet = XLSX.utils.json_to_sheet(data, {
        header: ['codigo', 'cantidad'],
      })

      const workbook = {
        Sheets: {
          Inventario: worksheet,
        },
        SheetNames: ['Inventario'],
      }

      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      })

      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      })

      saveAs(blob, `inventario-codigos-${formatearFechaArchivo()}.xlsx`)

      setError('')
      enfocarInput()
    } catch (e) {
      setError('Ocurrió un error al exportar el archivo Excel')
      enfocarInput()
    }
  }

  const enfocarInput = () => {
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus()
      }
    }, 100)
  }

  const formatearFechaArchivo = () => {
    const fecha = new Date()

    const yyyy = fecha.getFullYear()
    const mm = String(fecha.getMonth() + 1).padStart(2, '0')
    const dd = String(fecha.getDate()).padStart(2, '0')
    const hh = String(fecha.getHours()).padStart(2, '0')
    const mi = String(fecha.getMinutes()).padStart(2, '0')

    return `${yyyy}${mm}${dd}-${hh}${mi}`
  }

  const cambiarFilasPorPagina = (event) => {
    setFilasPorPagina(Number(event.target.value))
    setPaginaActual(1)
    enfocarInput()
  }

  const irPaginaAnterior = () => {
    setPaginaActual((prev) => Math.max(1, prev - 1))
    enfocarInput()
  }

  const irPaginaSiguiente = () => {
    setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))
    enfocarInput()
  }

  return (
    <div className="inventario-page">
      <div className="inventario-header">
        <div className="title-block">
          <h2>Toma de Inventario</h2>
          <p>Escanea códigos de barras y acumula cantidades automáticamente</p>
        </div>
      </div>

      <div className="inventario-panel">
        <div className="form-row">
          <div className="input-container">
            <label className="inventario-label" htmlFor="barcodeInput">
              Código de barras
            </label>

            <input
              ref={barcodeInputRef}
              id="barcodeInput"
              type="text"
              className="inventario-input"
              value={codigoActual}
              placeholder="Escanea o ingresa el código"
              autoComplete="off"
              onChange={(e) => setCodigoActual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  leerCodigo()
                }
              }}
            />

            <small className="inventario-help">
              Escanea el código y presiona Enter. Si el código ya existe, se suma la cantidad.
            </small>
          </div>

          <div className="resumen-container">
            <div className="resumen-box">
              <span className="resumen-label">Códigos</span>
              <span className="resumen-value">{codigosInventario.length}</span>
            </div>

            <div className="resumen-box success">
              <span className="resumen-label">Unidades</span>
              <span className="resumen-value">{totalUnidades}</span>
            </div>
          </div>
        </div>

        <div className="button-row">
          <button type="button" className="btn btn-success" onClick={leerCodigo}>
            <span>+</span>
            Agregar
          </button>

          <button type="button" className="btn btn-help" onClick={exportarExcel}>
            <span>📄</span>
            Exportar Excel
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}
      </div>

      <div className="inventario-panel">
        <div className="table-wrapper">
          <table className="inventario-table">
            <thead>
              <tr>
                <th style={{ width: '10%' }}>#</th>
                <th style={{ width: '45%' }}>CÓDIGO</th>
                <th style={{ width: '25%' }}>CANTIDAD</th>
                <th style={{ width: '20%' }}>ACCIONES</th>
              </tr>
            </thead>

            <tbody>
              {codigosPaginados.length > 0 ? (
                codigosPaginados.map((item, index) => (
                  <tr key={item.codigo}>
                    <td>{(paginaActual - 1) * filasPorPagina + index + 1}</td>

                    <td>
                      <span className="ean-chip">{item.codigo}</span>
                    </td>

                    <td>
                      <div className="cantidad-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => decrementarCantidad(item.codigo)}
                          disabled={item.cantidad <= 1}
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min="1"
                          className="cantidad-input"
                          value={item.cantidad}
                          onChange={(e) =>
                            cambiarCantidad(item.codigo, e.target.value)
                          }
                        />

                        <button
                          type="button"
                          className="icon-btn success"
                          onClick={() => incrementarCantidad(item.codigo)}
                        >
                          +
                        </button>
                      </div>
                    </td>

                    <td className="text-center">
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => eliminarCodigo(item.codigo)}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">
                    <div className="empty-state">
                      <div className="empty-title">No hay códigos agregados</div>
                      <div className="empty-subtitle">
                        Escanea un código de barras para iniciar la toma de inventario
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {codigosInventario.length > 0 && (
          <div className="pagination-row">
            <div className="rows-select">
              <span>Filas:</span>
              <select value={filasPorPagina} onChange={cambiarFilasPorPagina}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="pagination-actions">
              <button
                type="button"
                className="page-btn"
                onClick={irPaginaAnterior}
                disabled={paginaActual === 1}
              >
                Anterior
              </button>

              <span>
                Página {paginaActual} de {totalPaginas}
              </span>

              <button
                type="button"
                className="page-btn"
                onClick={irPaginaSiguiente}
                disabled={paginaActual === totalPaginas}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App