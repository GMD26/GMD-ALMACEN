import { Product } from '../types';

function parsePrice(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/[^0-9.-]+/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function categorizeProduct(sku: string, desc: string): { categoria: string; ubicacion: string; defaultMin: number } {
  const d = desc.toUpperCase();
  const s = sku.toUpperCase();

  if (s.startsWith('ART') || d.includes('ALGODÓN') || d.includes('Hahnemühle') || s.startsWith('1064') || d.includes('BAMBOO') || d.includes('PHOTO RAG') || d.includes('TURNER')) {
    return { categoria: 'Papeles de Arte y Fine Art', ubicacion: 'Estante A1 - Fine Art', defaultMin: 5 };
  }
  if (s.startsWith('BP') || s.startsWith('BX') || s.startsWith('PW') || s.startsWith('KE5') || s.startsWith('KX')) {
    return { categoria: 'Papel Bond y Calca', ubicacion: 'Pasillo B2 - Bond y Calca', defaultMin: 10 };
  }
  if (s.startsWith('DTF') || s.startsWith('SUBL') || s.startsWith('SUTC') || s.startsWith('TR')) {
    return { categoria: 'DTF, Sublimación y Transfer', ubicacion: 'Bodega C1 - Textil & Sublimación', defaultMin: 8 };
  }
  if (s.startsWith('GV') || s.startsWith('MIC') || s.startsWith('V') || s.startsWith('VEB') || s.startsWith('VENL') || s.startsWith('KE1') || s.startsWith('KE20')) {
    return { categoria: 'Viniles Autoadheribles y Microperforados', ubicacion: 'Rack D3 - Viniles Gran Formato', defaultMin: 6 };
  }
  if (s.startsWith('BLSQ') || s.startsWith('CV') || s.startsWith('LNG') || s.startsWith('LNM') || s.startsWith('PBL') || s.startsWith('SVL') || s.startsWith('VB')) {
    return { categoria: 'Lonas, Canvas y Back-Lit', ubicacion: 'Rack E2 - Canvas y Lonas', defaultMin: 4 };
  }
  if (s.startsWith('KEL') || s.startsWith('LC') || s.startsWith('LF') || s.startsWith('LTX') || s.startsWith('PA') || s.startsWith('BOPP') || s.startsWith('PET')) {
    return { categoria: 'Laminados y Películas', ubicacion: 'Estante F4 - Laminado y Acabado', defaultMin: 6 };
  }
  if (s.startsWith('PGL') || s.startsWith('PH') || s.startsWith('PMG') || s.startsWith('PMS') || s.startsWith('PRL') || s.startsWith('PRO') || s.startsWith('PB') || s.startsWith('KE0')) {
    return { categoria: 'Papel Fotográfico y Minilab', ubicacion: 'Anaquel G1 - Papeles Fotográficos', defaultMin: 8 };
  }
  if (s.startsWith('K6B') || s.startsWith('J3E') || s.startsWith('D9R') || s.startsWith('Q66') || s.startsWith('Q89') || s.startsWith('CG') || s.startsWith('E4J') || s.startsWith('Z6G') || s.startsWith('CH0') || s.startsWith('Y1N')) {
    return { categoria: 'Medios Especiales HP', ubicacion: 'Sección H2 - Medios HP', defaultMin: 3 };
  }

  return { categoria: 'Impresión y Medios Varios', ubicacion: 'Almacén Principal - Sección General', defaultMin: 5 };
}

// Raw catalog from Grupo Más Digital price list
const rawProducts = [
  ["AL690","PELÍCULA ACETATO PARA IMPRESORAS Y COPIADORAS LÁSER 4 mil",".216 x .279 m","PAQ C/100 H","$772.00","$896.00","$537.00"],
  ["ART200","PAPEL ESPECIAL PARA ARTE TEXTURA SUAVE 100% ALGODÓN 240 g/m²","0.43 x 12 m","RL","$3,814.00","$4,424.00","$2,655.00"],
  ["ART201","PAPEL ESPECIAL PARA ARTE TEXTURA SUAVE 100% ALGODÓN 240 g/m²","0.61 x 12 m","RL","$5,085.00","$5,899.00","$3,539.00"],
  ["ART202","PAPEL ESPECIAL PARA ARTE TEXTURA SUAVE 100% ALGODÓN 240 g/m²","0.91 x 12 m","RL","$7,625.00","$8,845.00","$5,307.00"],
  ["ART203","PAPEL ESPECIAL PARA ARTE TEXTURA SUAVE 100% ALGODÓN 240 g/m²","1.118 x 12 m","RL","$9,319.00","$10,810.00","$6,486.00"],
  ["ART204","PAPEL ESPECIAL PARA ARTE TEXTURA SUAVE 100% ALGODÓN 240 g/m²","1.524 x 12 m","RL","$12,705.00","$14,738.00","$8,843.00"],
  ["ART300","PAPEL ESPECIAL PARA ARTE TEXTURA FUERTE 100% ALGODÓN 240 g/m²","0.43 x 12 m","RL","$3,973.00","$4,609.00","$2,765.00"],
  ["ART301","PAPEL ESPECIAL PARA ARTE TEXTURA FUERTE 100% ALGODÓN 240 g/m²","0.61 x 12 m","RL","$5,306.00","$6,155.00","$3,693.00"],
  ["ART302","PAPEL ESPECIAL PARA ARTE TEXTURA FUERTE 100% ALGODÓN 240 g/m²","0.91 x 12 m","RL","$7,938.00","$9,208.00","$5,525.00"],
  ["ART303","PAPEL ESPECIAL PARA ARTE TEXTURA FUERTE 100% ALGODÓN 240 g/m²","1.118 x 12 m","RL","$9,703.00","$11,255.00","$6,753.00"],
  ["ART700","PAPEL ESPECIAL PARA ARTE TEXTURA SUAVE 100% ALGODÓN 320 g/m²","0.43 x 12 m","RL","$4,101.00","$4,757.00","$2,854.00"],
  ["ART701","PAPEL ESPECIAL PARA ARTE TEXTURA SUAVE 100% ALGODÓN 320 g/m²","0.61 x 12 m","RL","$5,470.00","$6,345.00","$3,807.00"],
  ["BJ240","PAPEL RECUBIERTO ALTA RESOLUCIÓN DOBLE CARA 230 g/m²",".216 x .279 m","PAQ C/25H","$173.00","$201.00","$120.00"],
  ["BJ241","PAPEL RECUBIERTO ALTA RESOLUCIÓN DOBLE CARA 230 g/m²","0.43 x 30 m","RL","$1,193.00","$1,384.00","$830.00"],
  ["BJ242","PAPEL RECUBIERTO ALTA RESOLUCIÓN DOBLE CARA 230 g/m²","0.61 x 30 m","RL","$1,681.00","$1,950.00","$1,170.00"],
  ["BJ312","PAPEL RECUBIERTO MATE ALTA RESOLUCIÓN 170 g/m² N2","0.91 x 27.4 m","RL","$1,629.00","$1,890.00","$1,134.00"],
  ["BJ320","PAPEL RECUBIERTO 24 lbs N2","0.91 x 45.7 m","RL","$1,210.00","$1,404.00","$842.00"],
  ["BLSQ02","PELÍCULA BACK-LIT SUPREME QUALITY - FRONT PRINT","1.07 x 30 m","RL","$5,103.00","$5,919.00","$3,552.00"],
  ["BLSQ03","PELÍCULA BACK-LIT SUPREME QUALITY - FRONT PRINT","1.27 x 30 m","RL","$6,057.00","$7,026.00","$4,216.00"],
  ["BP400","PAPEL BOND PREMIER 20lbs 75g/m² 100° Blancura Óptica N2","0.91 x 50 m","RL","$394.00","$457.00","$274.00"],
  ["BP401","PAPEL BOND PREMIER 20lbs 75g/m² 100° Blancura Óptica N2","0.91 x 100 m","RL","$780.00","$905.00","$543.00"],
  ["BP406","PAPEL BOND PREMIER 20lbs 75g/m² 100° Blancura Óptica N2","0.61 x 50 m","RL","$268.00","$311.00","$187.00"],
  ["BX400","PAPEL BOND PRECISIÓN 24lbs 90g/m² 96° Blancura Óptica N2","0.91 x 50 m","RL","$483.00","$560.00","$336.00"],
  ["CV340","TELA CANVAS ARTÍSTICA MATE 100% ALGODÓN 24 mil","0.91 x 12 m","RL","$6,673.00","$7,741.00","$4,644.00"],
  ["CV341","TELA CANVAS ARTÍSTICA MATE 100% ALGODÓN 24 mil","1.07 x 12 m","RL","$7,780.00","$9,025.00","$5,415.00"],
  ["CV350","TELA CANVAS ARTÍSTICA MATE 65% POLIÉSTER / 35% ALGODÓN 380 g","0.61 x 12 m","RL","$3,640.00","$4,222.00","$2,533.00"],
  ["DTF02","PELÍCULA PROFESIONAL DTF MATE 2 CARAS 3 MIL","0.30 x 100 m","RL","$504.00","$585.00","$281.88"],
  ["DTF03","PELÍCULA PROFESIONAL DTF MATE 2 CARAS 3 MIL","0.60 x 50 m","RL","$504.00","$585.00","$281.88"],
  ["DTF04","PELÍCULA PROFESIONAL DTF MATE 2 CARAS 3 MIL","0.60 x 100 m","RL","$1,008.00","$1,169.00","$563.76"],
  ["ETQ025","HOJA PARA ETIQUETAS AUTOADHERIBLES PARA IMPRESORAS LÁSER",".216 x .279 m","PAQ C/25 H","$65.00","$75.00","$45.00"],
  ["GVGL14","VINIL AUTOADHERIBLE GLOSSY CON ADHESIVO GRIS 4 MIL","1.524 x 50 m","RL","$3,577.00","$4,149.00","$2,490.00"],
  ["GVMT16","VINIL AUTOADHERIBLE MATE CON ADHESIVO GRIS 4 MIL","1.524 x 50 m","RL","$3,577.00","$4,149.00","$2,490.00"],
  ["KE010","PAPEL FOTOGRÁFICO ALTO BRILLO K+E 190 g/m² 8 mil","0.91 x 30 m","RL","$4,367.00","$5,066.00","$3,039.00"],
  ["KE020","PAPEL RECUBIERTO MATE PRESENTACIÓN K+E 140 g/m²","0.91 x 30 m","RL","$1,166.00","$1,353.00","$812.00"],
  ["KE030","PAPEL RECUBIERTO MATE PRESENTACIÓN K+E 180 g/m²","0.91 x 25 m","RL","$1,182.00","$1,371.00","$823.00"],
  ["KE100","VINIL AUTOADHERIBLE MATE PREMIUM K+E","0.91 x 20 m","RL","$6,544.00","$7,591.00","$4,555.00"],
  ["KE200","VINIL AUTOADHERIBLE GLOSSY PREMIUM K+E","0.61 x 20 m","RL","$4,585.00","$5,319.00","$3,191.00"],
  ["KEL402","PELÍCULA LAMINADO EN FRÍO BRILLANTE STANDARD 4 MIL","1.295 x 50 m","RL","$3,161.00","$3,667.00","$2,200.00"],
  ["KEL412","PELÍCULA LAMINADO EN FRÍO MATE STANDARD 4 MIL","1.295 x 50 m","RL","$3,161.00","$3,667.00","$2,200.00"],
  ["KX540","PAPEL CALCA NATURAL 90/95g/m² N2","0.91 x 50 m","RL","$1,253.00","$1,453.00","$872.00"],
  ["LC010","PELÍCULA BOPP 1 MIL / 24 MIC BRILLANTE P/LAM","0.30 x 250 m","PAQ / 2 RL","$599.00","$695.00","$417.00"],
  ["LC020","PELÍCULA BOPP 1 MIL / 24 MIC MATE P/LAM","0.30 x 250 m","PAQ / 2 RL","$599.00","$695.00","$417.00"],
  ["LF501","PELÍCULA LAMINADO EN FRÍO GLOSSY ALTA CALIDAD 4 MIL","0.965 x 45.7 m","RL","$4,426.00","$5,134.00","$3,080.00"],
  ["LF511","PELÍCULA LAMINADO EN FRÍO MATE ALTA CALIDAD 4 MIL","0.965 x 45.7 m","RL","$4,426.00","$5,134.00","$3,080.00"],
  ["LNG01","LONA GLOSSY 13 oz","1.524 x 50 m","RL","$3,546.00","$4,113.00","$2,468.00"],
  ["LNM10","LONA MATE 13 oz","1.524 x 50 m","RL","$3,546.00","$4,113.00","$2,468.00"],
  ["LTX10","PELÍCULA LAMINADO EN FRÍO TEXTURA SUPER ARENA 4 MIL","0.635 x 50 m","RL","$2,207.00","$2,560.00","$1,695.00"],
  ["MIC03","VINIL AUTOADHERIBLE MICROPERFORADO","1.524 x 50 m","RL","$6,945.00","$8,056.00","$4,834.00"],
  ["PA650","PELÍCULA ACETATO PARA RETROPROYECCIÓN 4 mil",".216 x .279 m","PAQ C/100 H","$266.00","$309.00","$185.00"],
  ["PGL037","PAPEL PROFESIONAL FOTOGRÁFICO BRILLANTE 260 g/m²","0.61 x 30 m","RL","$2,373.00","$2,753.00","$1,652.00"],
  ["PGL038","PAPEL PROFESIONAL FOTOGRÁFICO BRILLANTE 260 g/m²","0.91 x 30 m","RL","$3,560.00","$4,130.00","$2,478.00"],
  ["PH100","PROFESSIONAL METALLIC WHITE PHOTO PAPER 240 g/m²","0.30 x 30 m","RL","$1,256.00","$1,457.00","$874.00"],
  ["PH346","PAPEL PHOTO GLOSSY 260 g/m²",".216 x .279 m","PAQ C/50H","$454.00","$527.00","$316.00"],
  ["PST047","PAPEL PROFESIONAL FOTOGRÁFICO SATÍN 260 g/m²","0.61 x 30 m","RL","$2,464.00","$2,858.00","$1,715.00"],
  ["PW450","PAPEL BOND PRIME WHITE 22lbs 80g/m² 100° Blancura Óptica N2","0.91 x 50 m","RL","$466.00","$541.00","$324.00"],
  ["SUBL08","PAPEL PROFESIONAL PARA SUBLIMACIÓN SECADO RÁPIDO 100g","0.61 x 30 m","RL","$202.00","$234.00","$134.00"],
  ["SUBL10","PAPEL PROFESIONAL PARA SUBLIMACIÓN SECADO RÁPIDO 100g","0.91 x 100 m","RL","$1,007.00","$1,168.00","$669.00"],
  ["SUBL11","PAPEL PROFESIONAL PARA SUBLIMACIÓN SECADO RÁPIDO 100g","1.118 x 100 m","RL","$1,230.00","$1,427.00","$819.00"],
  ["SUBL14","PAPEL PROFESIONAL PARA SUBLIMACIÓN SECADO RÁPIDO 100g","1.62 x 100 m","RL","$1,781.00","$2,066.00","$1,187.00"],
  ["SUTC42","PAPEL SUBLIMACIÓN CON TACK 100g","1.118 x 100 m","RL","$1,528.00","$1,772.00","$1,077.00"],
  ["SVL135","PAPEL SOLVLATEX PREMIUM PÓSTER SEMI-GLOSSY 140 g","1.27 x 50 m","RL","$3,475.00","$4,031.00","$2,419.00"],
  ["TR300","PAPEL TRANSFER PARA TELAS CLARAS",".216 x .279 m","PAQ C/10 H","$173.00","$201.00","$120.00"],
  ["TR305","PAPEL TRANSFER PARA TELAS OSCURAS",".216 x .279 m","PAQ C/10 H","$311.00","$361.00","$216.00"],
  ["VEB02","VINIL ELECTROESTÁTICO BLANCO 6 MIL","1.524 x 50 m","RL","$5,175.00","$6,003.00","$3,602.00"],
  ["VNM15","VINIL AUTOADHERIBLE MATE","1.524 x 50 m","RL","$5,098.00","$5,914.00","$3,548.00"],
  ["VNS15","VINIL AUTOADHERIBLE GLOSSY","1.524 x 50 m","RL","$5,098.00","$5,914.00","$3,548.00"],
  ["BOPPGL07","Película para laminado térmico BOPP brillante 24 mic N3”","0.610 x 3000 m RL","RL","$3,440.00","$3,990.00","$3,990.00"],
  ["BOPPMT07","Película para laminado térmico BOPP mate 24 mic N3”","0.610 x 3000 m RL","RL","$3,440.00","$3,990.00","$3,990.00"],
  ["K6B80A","HP Matte Litho-realistic Paper 269 g/m² / 12.1 mil 3”","1.118 x 30.5 m","RL","$9,127.00","$10,587.00","$7,411.00"],
  ["J3E86A","HP Professional Matte Canvas 410 g/m² / 18.0 mil 2”","1.118 x 15.2 m","RL","$8,884.00","$10,305.00","$7,214.00"],
  ["Q8918A","HP Everyday Instant-dry Gloss Photo Paper 235 g/m²","1.07 x 30.5 m","RL","$4,808.00","$5,577.00","$3,904.00"],
  ["10643466","BAMBOO 290 g/m2 Fine Art","24\" x 12 m","RL","$4,423.00","$5,131.00","$4,105.00"],
  ["10643583","HEMP 290 g/m2 Fine Art","24\" x 12 m","RL","$4,817.00","$5,588.00","$4,470.00"],
  ["10643593","AGAVE 290 g/m2 Fine Art","24\" x 12 m","RL","$4,817.00","$5,588.00","$4,470.00"],
  ["10643270","PHOTO RAG 308 g/m2 Fine Art","24\" x 12 m","RL","$4,834.00","$5,607.00","$4,486.00"],
  ["10643134","WILLIAM TURNER 310 g/m2 Fine Art","24\" x 12 m","RL","$4,919.00","$5,706.00","$4,565.00"],
  ["10643123","GERMAN ETCHING 310 g/m2 Fine Art","24\" x 12 m","RL","$4,186.00","$4,856.00","$3,885.00"]
];

export function getPrecioConIva(p: Product): number {
  if (p && p.precioIva && p.precioIva > 0) {
    return p.precioIva;
  }
  return (p && p.precio) || 0;
}

export function extractPeso(desc: string): string {
  if (!desc) return 'Estándar';
  const grammageMatch = desc.match(/(\d+(?:\.\d+)?\s*(?:g\/m²|g\/m2|g|mil))/i);
  if (grammageMatch) {
    return grammageMatch[0].replace(/g\/m2/i, 'g/m²');
  }
  return 'Estándar';
}

export const INITIAL_PRODUCTS: Product[] = rawProducts.map((p, idx) => {
  const [sku, desc, medida, unidad, pStr, pIvaStr, cStr] = p;
  const precio = parsePrice(pStr);
  const precioIva = parsePrice(pIvaStr);
  const costo = parsePrice(cStr);
  
  const { categoria, ubicacion, defaultMin } = categorizeProduct(sku, desc);

  // Set initial stock level to 0 so users can enter inventory manually
  const cantidadActual = 0;

  return {
    id: sku,
    sku,
    descripcion: desc,
    medida,
    unidad,
    peso: extractPeso(desc),
    precio,
    precioIva,
    costo,
    cantidadActual,
    ubicacionAlmacen: ubicacion,
    minStock: 0,
    categoria,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Sistema Grupo Más Digital'
  };
});
