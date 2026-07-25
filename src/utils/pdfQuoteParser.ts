import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ExtractedQuoteData {
  folioCotizacion: string;
  cliente: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  resumen: string;
  partidas: {
    codigo?: string;
    descripcion: string;
    cantidad: number;
    valorUnitario: number;
    importe: number;
  }[];
  rawText?: string;
}

export async function parseQuotePdf(file: File): Promise<ExtractedQuoteData> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Load PDF with pdfjsLib
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  let fullText = '';
  const lines: string[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    
    let currentLine = '';
    let lastY = null;

    for (const item of textContent.items as any[]) {
      if (!item.str) continue;

      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 4) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
          fullText += currentLine.trim() + '\n';
        }
        currentLine = '';
      }

      currentLine += (currentLine ? ' ' : '') + item.str;
      lastY = item.transform[5];
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
      fullText += currentLine.trim() + '\n';
    }
  }

  // Fallback if worker or text extraction returned empty
  if (!fullText.trim()) {
    throw new Error('No se pudo extraer texto seleccionable del PDF. Verifique que no sea una imagen escaneada.');
  }

  return parseQuoteText(fullText, lines);
}

export function parseQuoteText(fullText: string, lines: string[]): ExtractedQuoteData {
  let folioCotizacion = '';
  let cliente = '';
  let fecha = new Date().toISOString().split('T')[0];
  let subtotal = 0;
  let iva = 0;
  let total = 0;
  const partidas: ExtractedQuoteData['partidas'] = [];

  // --- 1. FOLIO / SERIE EXTRACTION ---
  const folioRegexes = [
    // Matches "Serie / Folio C-Ecomerce-432", "Serie/Folio C-Ecomerce-432", etc.
    /(?:Serie\s*[\/\-]\s*Folio|Serie\s+Folio|Serie\s+A?\s*Folio)[\s\:\#]*([A-Za-z0-9\-\/]{3,35})/i,
    // Matches explicit Cotización codes like C-Ecomerce-432, C-Moni-123, C-Cesar-123
    /((?:C\-Ecomerce|C\-Moni|C\-Cesar|COT|GMD)\-[A-Za-z0-9\-]+)/i,
    // Matches "Cotización ... Folio C-Ecomerce-432"
    /(?:Cotización|Cotizacion)[\s\S]{0,100}?(?:Serie\s*[\/\-]\s*Folio|Folio|Serie)[\s\:\#]*([A-Za-z0-9\-\/]{3,35})/i,
    /(?:Folio|Cotización\s*N[°o]?|No\.\s*Cotización)[\s\:\#]*([A-Za-z0-9\-\/]{3,25})/i,
    /Folio\s*:\s*([^\s\n]+)/i
  ];

  for (const regex of folioRegexes) {
    const match = fullText.match(regex);
    if (match && match[1]) {
      folioCotizacion = match[1].trim();
      break;
    }
  }

  if (!folioCotizacion) {
    folioCotizacion = `COT-${Date.now().toString().slice(-5)}`;
  }

  // --- 2. CLIENTE EXTRACTION ---
  const clienteRegexes = [
    // Prioritize "Para:" field (e.g. "Para: Cliente Ejemplo S.A.")
    /(?:^|\n|\r|\s)(?:Para|PARA)[\s\:\#]+([^\n\r]{2,70})/i,
    /(?:Cliente|At'n|Atención|Contacto|Razón\s*Social|Señor\(es\)|Empresa)[\s\:\#]*([^\n\r]{3,70})/i,
    /DATOS DEL CLIENTE[\s\:\#\n]*([^\n\r]{3,70})/i
  ];

  for (const regex of clienteRegexes) {
    const match = fullText.match(regex);
    if (match && match[1] && match[1].trim().length > 2) {
      cliente = match[1].trim();
      // Cleanup unwanted trailing prefixes or next field labels
      cliente = cliente.split(/(?:RFC|Fecha|Dirección|Tel|Email|Condiciones|At'n|Atención|Página|Pagina)/i)[0].trim();
      if (cliente.length > 2) break;
    }
  }

  if (!cliente) {
    // Search line by line for Para / Client hints
    const clientLine = lines.find(l => 
      /^(?:PARA|CLIENTE|AT'N|ATENCIÓN|CONTACTO)\s*:\s*/i.test(l.trim())
    );
    if (clientLine) {
      cliente = clientLine.replace(/^(?:PARA|CLIENTE|AT'N|ATENCIÓN|CONTACTO)\s*:\s*/i, '').trim();
      cliente = cliente.split(/(?:RFC|Fecha|Dirección|Tel|Email|Condiciones)/i)[0].trim();
    }
  }

  // --- 3. FECHA EXTRACTION ---
  const dateRegex = /(?:Fecha|Emisión|FECHA)[\s\:]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i;
  const dateMatch = fullText.match(dateRegex);
  if (dateMatch && dateMatch[1]) {
    const rawDate = dateMatch[1].trim();
    const parts = rawDate.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let d = parts[0].padStart(2, '0');
      let m = parts[1].padStart(2, '0');
      let y = parts[2];
      if (y.length === 2) y = `20${y}`;
      // Check if Y-M-D or D-M-Y
      if (parseInt(parts[0]) > 31) {
        fecha = `${parts[0]}-${m}-${d}`;
      } else {
        fecha = `${y}-${m}-${d}`;
      }
    }
  }

  // --- 4. NUMERIC TOTALS EXTRACTION (Subtotal, IVA, Total) ---
  const subtotalMatch = fullText.match(/Subtotal[\s\:\$]*([0-9,]+\.[0-9]{2})/i);
  if (subtotalMatch && subtotalMatch[1]) {
    subtotal = parseFloat(subtotalMatch[1].replace(/,/g, '')) || 0;
  }

  const ivaMatch = fullText.match(/(?:I\.?V\.?A\.?|16\s*%|\(16%\))[\s\:\$]*([0-9,]+\.[0-9]{2})/i);
  if (ivaMatch && ivaMatch[1]) {
    iva = parseFloat(ivaMatch[1].replace(/,/g, '')) || 0;
  }

  const totalMatch = fullText.match(/(?:Total|TOTAL)[\s\:\$]*([0-9,]+\.[0-9]{2})/i);
  if (totalMatch && totalMatch[1]) {
    total = parseFloat(totalMatch[1].replace(/,/g, '')) || 0;
  }

  // If subtotal + iva are present but total is 0
  if (total === 0 && subtotal > 0) {
    total = iva > 0 ? subtotal + iva : subtotal * 1.16;
  }
  if (subtotal === 0 && total > 0) {
    subtotal = Math.round((total / 1.16) * 100) / 100;
    iva = Math.round((total - subtotal) * 100) / 100;
  }

  // --- 5. PRODUCTS / PARTIDAS EXTRACTION ---
  // Looking for tabular lines with Quantity, Code, Description, Unit Price, Amount
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern: [Cantidad] [Código] [Descripción...] [P.Unitario] [Importe]
    // or [Código] [Descripción] [Cantidad] [Precio] [Importe]
    const lineNumbers = line.match(/\$?([0-9,]+\.[0-9]{2})/g);
    
    if (lineNumbers && lineNumbers.length >= 1) {
      const amounts = lineNumbers.map(n => parseFloat(n.replace(/[\$,]/g, '')));
      
      // Filter out headers/totals lines
      if (
        !line.toUpperCase().includes('SUBTOTAL') &&
        !line.toUpperCase().includes('TOTAL') &&
        !line.toUpperCase().includes('I.V.A') &&
        !line.toUpperCase().includes('PÁGINA')
      ) {
        // Attempt to extract quantity (e.g., integer near start or end)
        const qtyMatch = line.match(/^(?:[0-9]{1,3}\s+)?([0-9]{1,4})(?:\s+pza|\s+pz|\s+m2|\s+m|\s+caja|\s+rollo)?/i);
        const qty = qtyMatch ? (parseInt(qtyMatch[1]) || 1) : 1;

        // Clean description
        let desc = line
          .replace(/\$?([0-9,]+\.[0-9]{2})/g, '')
          .replace(/^[0-9]{1,4}\s+/, '')
          .replace(/^(?:PZA|PZS|M2|ROLLO|CAJA|MTR|PIEZA|UNIDAD)\s+/i, '')
          .trim();

        const skuMatch = line.match(/([A-Z0-9]{3,15}\-[A-Z0-9]{2,10}|[A-Z0-9]{5,12})/);
        const skuCode = skuMatch ? skuMatch[1] : '';

        if (desc.length > 3) {
          const unitVal = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0];
          const importVal = amounts.length >= 1 ? amounts[amounts.length - 1] : unitVal * qty;

          partidas.push({
            codigo: skuCode || '',
            descripcion: desc || '',
            cantidad: qty || 1,
            valorUnitario: unitVal || 0,
            importe: importVal || 0
          });
        }
      }
    }
  }

  // Formulate clean resumen text
  let resumen = '';
  if (partidas.length > 0) {
    resumen = partidas
      .map(p => `${p.cantidad}x ${p.codigo ? `[${p.codigo}] ` : ''}${p.descripcion} ($${p.valorUnitario.toLocaleString('es-MX')} c/u = $${p.importe.toLocaleString('es-MX')})`)
      .join('\n');
  } else {
    // Extract block of text between "DATOS" and "TOTAL" as general summary
    resumen = fullText
      .split(/(?:Subtotal|TOTAL|I\.V\.A)/i)[0]
      .slice(-300)
      .trim();
  }

  return {
    folioCotizacion,
    cliente: cliente || 'Cliente de Cotización',
    fecha,
    subtotal,
    iva,
    total,
    resumen: resumen || 'Cotización de productos Grupo Más Digital',
    partidas,
    rawText: fullText
  };
}
