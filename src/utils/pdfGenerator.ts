import jsPDF from 'jspdf';
import { PurchaseOrder, Product } from '../types';

export function generatePurchaseOrderPDF(order: PurchaseOrder) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Corporate Colors - Grupo Más Digital
  const navy = [10, 25, 47]; // #0A192F
  const cyan = [0, 180, 216]; // #00B4D8
  const darkGray = [51, 65, 85];

  // Header Banner
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, 210, 38, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('GRUPO MÁS DIGITAL', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 180, 216);
  doc.text('Soluciones de Impresión Digital y Gran Formato | grupomasdigital.com', 14, 25);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SOLICITUD DE PEDIDO DE MATERIAL', 130, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Folio: ${order.folio}`, 130, 25);
  doc.text(`Fecha: ${new Date(order.fecha).toLocaleDateString('es-MX')}`, 130, 31);

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 44, 182, 22, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 44, 182, 22, 'S');

  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Solicitado por:', 18, 51);
  doc.setFont('helvetica', 'normal');
  doc.text(`${order.solicitante} (${order.solicitanteEmail})`, 48, 51);

  doc.setFont('helvetica', 'bold');
  doc.text('Proveedor Sugerido:', 18, 59);
  doc.setFont('helvetica', 'normal');
  doc.text(order.proveedor || 'Proveedor Autorizado / Directo', 54, 59);

  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', 135, 51);
  doc.setFont('helvetica', 'normal');
  doc.text(order.estado, 150, 51);

  // Table Header
  let y = 74;
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(14, y, 182, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('SKU', 18, y + 5.5);
  doc.text('Descripción del Producto', 42, y + 5.5);
  doc.text('Medida / Unidad', 112, y + 5.5);
  doc.text('Cant. Pedida', 152, y + 5.5);
  doc.text('Costo Est.', 178, y + 5.5);

  y += 8;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  order.items.forEach((item, index) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 7, 'F');
    }

    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(item.sku, 18, y + 5);

    // Truncate long description
    const desc = item.descripcion.length > 42 ? item.descripcion.substring(0, 42) + '...' : item.descripcion;
    doc.text(desc, 42, y + 5);

    doc.text(`${item.medida} (${item.unidad})`, 112, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.text(`${item.cantidadPedida}`, 158, y + 5, { align: 'right' });

    const totalItemCosto = item.costoEstimado * item.cantidadPedida;
    doc.text(`$${totalItemCosto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 192, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 7;
  });

  // Footer / Summary
  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 196, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL ESTIMADO DE PEDIDO:', 120, y);
  doc.setTextColor(0, 180, 216);
  doc.text(`$${order.totalEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, 192, y, { align: 'right' });

  // Signatures Area
  y += 25;
  if (y < 250) {
    doc.setDrawColor(148, 163, 184);
    doc.line(25, y, 85, y);
    doc.line(125, y, 185, y);

    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma Solicitante (Almacén)', 55, y + 5, { align: 'center' });
    doc.text('Aprobación de Compras', 155, y + 5, { align: 'center' });
  }

  // Footer Page Note
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Grupo Más Digital - Control Interno de Inventarios y Pedidos. Generado automáticamente.', 105, 287, { align: 'center' });

  doc.save(`Pedido_Material_${order.folio}.pdf`);
}

export function generateInventoryReportPDF(products: Product[]) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const navy = [10, 25, 47];
  const darkGray = [51, 65, 85];

  // Header
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, 297, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('GRUPO MÁS DIGITAL - REPORTE DE INVENTARIO GENERAL EN TIEMPO REAL', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-MX')}`, 14, 22);

  // Table Header
  let y = 35;
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(14, y, 269, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SKU', 18, y + 5.5);
  doc.text('Descripción del Producto', 42, y + 5.5);
  doc.text('Categoría', 125, y + 5.5);
  doc.text('Ubicación Almacén', 175, y + 5.5);
  doc.text('Stock', 225, y + 5.5);
  doc.text('Mínimo', 245, y + 5.5);
  doc.text('Valor Total ($)', 265, y + 5.5);

  y += 8;

  let grandTotalValue = 0;
  let totalItemsCount = 0;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  products.forEach((p, idx) => {
    if (y > 185) {
      doc.addPage();
      y = 20;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 269, 6, 'F');
    }

    const value = p.cantidadActual * (p.costo || p.precio);
    grandTotalValue += value;
    totalItemsCount += p.cantidadActual;

    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(p.sku, 18, y + 4);
    
    const desc = p.descripcion.length > 48 ? p.descripcion.substring(0, 48) + '...' : p.descripcion;
    doc.text(desc, 42, y + 4);

    const cat = p.categoria.length > 26 ? p.categoria.substring(0, 26) + '...' : p.categoria;
    doc.text(cat, 125, y + 4);

    const ubi = p.ubicacionAlmacen.length > 26 ? p.ubicacionAlmacen.substring(0, 26) + '...' : p.ubicacionAlmacen;
    doc.text(ubi, 175, y + 4);

    // Color code stock
    if (p.cantidadActual === 0) {
      doc.setTextColor(220, 38, 38); // Red
      doc.setFont('helvetica', 'bold');
      doc.text(`${p.cantidadActual} (Agotado)`, 225, y + 4);
    } else if (p.cantidadActual <= p.minStock) {
      doc.setTextColor(217, 119, 6); // Amber
      doc.setFont('helvetica', 'bold');
      doc.text(`${p.cantidadActual} (Bajo)`, 225, y + 4);
    } else {
      doc.setTextColor(22, 101, 52); // Green
      doc.setFont('helvetica', 'normal');
      doc.text(`${p.cantidadActual}`, 225, y + 4);
    }

    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`${p.minStock}`, 245, y + 4);

    doc.text(`$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 265, y + 4);

    y += 6;
  });

  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 269, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`TOTAL PRODUCTOS SKUs: ${products.length}  |  PIEZAS EN ALMACÉN: ${totalItemsCount}`, 18, y + 6.5);
  doc.text(`VALOR TOTAL INVENTARIO: $${grandTotalValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, 200, y + 6.5);

  doc.save(`Reporte_Inventario_GrupoMasDigital_${new Date().toISOString().split('T')[0]}.pdf`);
}
