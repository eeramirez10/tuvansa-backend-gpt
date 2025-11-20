// Valvulas 

//           SELECT ICOD,IEAN as ean,
//           I2DESCR AS description2,
//           IDESCR AS description1,
//           FAM2.FAMDESCR as tipo,
//           FAM3.FAMDESCR as subtipo,
//           FAM4.FAMDESCR as material,
//           FAM8.FAMDESCR as diametro,
//           FAM7.FAMDESCR as cedula,
//           UDESCR as unidad,
//           FAM5.FAMDESCR as termino,
//           FAMC.FAMDESCR as acabado
// const diameter = diametro ? cleanDiameter(diametro) : ''

// const cedOrSW = ((cedula === 'STD' || cedula === '40') && cedula) ?? ((termino === 'SW') && termino)

// const selectDescription = description2 ?? description1

// const figura = extraerFiguraDeDescripcion(selectDescription) ?? ''

// const desc = normalizarDescripcionSWPorCedula(selectDescription, cedOrSW)

// const sub = subtipo === 'NO ASIGNADO' || !subtipo ? '' : subtipo

// let cedulaFinal = cedula && cedula.toUpperCase() !== 'NO ASIGNADO' && cedula !== ''
//   ? cedula.toUpperCase()
//   : extraerCedulaDeDescripcion(selectDescription);

// const mat = material ? normalizeValue(material) : ''

// const term = termino === 'NO ASIGNADO' || !termino ? '' : termino
// const aca = acabado === 'NO ASIGNADO' || !acabado ? '' : acabado


// const addTypes = `${desc}  ${mat}  ${!termino ? '' : omit[termino] ? '' : termino} ${!acabado ? '' : omit[acabado] ? '' : acabado} `


// const analyzeResult = {
//   id: normalizarGrados(ean),
//   product: 'VALVULA',
//   material: material ? normalizeValue(material) : '',
//   diameter,
//   ced: cedulaFinal ?? '',
//   termino: term,
//   acabado: aca,
//   subtipo: sub,
//   figura,
//   originalDescription: selectDescription,
//   ean,
//   description: normalizeValue(addTypes),
// };


// *************** CODOS ********************** //

//           SELECT ICOD,IEAN as ean,
//           I2DESCR AS          description2,
//           IDESCR AS           description1,
//           FAM2.FAMDESCR as    tipo,
//           FAM3.FAMDESCR as    radio,
//           FAM4.FAMDESCR as    material,
//           FAM8.FAMDESCR as    diametro,
//           FAM7.FAMDESCR as    cedula,
//           UDESCR as           unidad,
//           FAM5.FAMDESCR as    termino,
//           FAMC.FAMDESCR as    acabado


// TUBOS

//           SELECT ICOD,IEAN as ean,
//           I2DESCR AS description2,
//           IDESCR AS description1,
//           FAM2.FAMDESCR as tipo,
//           FAM3.FAMDESCR as costura,
//           FAM4.FAMDESCR as material,
//           FAM8.FAMDESCR as diametro,
//           FAM7.FAMDESCR as cedula,
//           UDESCR as unidad,
//           FAM5.FAMDESCR as termino,
//           FAMC.FAMDESCR as acabado

//Bridas

// SELECT ICOD,
// IEAN as ean,
// I2DESCR AS description2,
// IDESCR AS description1,
// FAM2.FAMDESCR as tipo,
// FAM3.FAMDESCR as subtipo,
// FAM4.FAMDESCR as material,
// FAM8.FAMDESCR as diametro,
// FAM7.FAMDESCR as cedula,
// UDESCR as unidad,
// FAM5.FAMDESCR as termino,
// FAMC.FAMDESCR as acabado