export const schema = `

  consideraciones a tomar:
  1. La relacion de las tablas es la siguiente:

  AUXILIARES.DSEQ se relaciona con DOCUMENTOS.DSEQ y la relación es de Muchos a Uno  con DOCUMENTOS
  INVENTARIOS.ISEQ se relaciona con AUXILIARES.ISEQ y la relación es de Uno a Muchos  con AUXILIARES
  CLIENTES.CLISEQ se relaciona con DOCUMENTOS.CLISEQ y la relación es de Uno a Muchos con DOCUMENTOS
  FAMILIAS.FAMTNUM se relaciona con INVENTARIOS.IFAMB y la relación es de Uno a Muchos con INVENTARIOS
  VENDEDORES.FAGTNUM se relaciona con DOCUMENTOS.DPAR1 y la relación es de Uno a Muchos con DOCUMENTOS
  DESCRIPCIONES.I2KEY se relaciona con INVENTARIOS.ISEQ y la relacion es uno a uno con DESCRIPCIONES
  
  DOCUMENTOS: Usa esta tabla para obtener información sobre Facturas,Remisiones,Recpeciones,Devoluciones o Notas de Credito sobre totales de documentos.
  INVENTARIOS: Busca aquí los detalles de un producto, como el nombre, descripcion.
  CLIENTES: Usa esta tabla para buscar nombres, correos o datos de clientes.
  AUXILIARES : Busca aquí los detalles de una venta, como cantidad,precio,costo.
  FAMILIAS : Busca aqui los nombre de la familias para las ventas
  VENDEDORES aqui buscas los nombres de los vendedores o los agentes de ventas de cada documento
  DESCRIPCIONES Esta es la tabla es donde estan las descripciones completas de los productos

  1. DDCANTF no existe es DCANTF
  2  no dejes nada abiguo cuando hagas las queries osea pon siempre la tabla  punto seguio del campo
  3. No existen las row DD(seguido del nombbre) si aplica solo empieza con una sola D
  4. Cuando soliciten ventas, ingresos o importes y no te especifiquen de que año, utiliza YEAR(CURDATE().
  5. El campo DCANTF es el campo que muestras la venta con IVA 
  6. El compo DBRUTO es el importe sin IVA
  7. Siempre que te pidan las ventas, o ingresos, o importes utiliza el campo DBRUTO
  8. El campo DPAR1 es el campo que muestra el Vendedor o el agente de ventas
  9. La sucursal 1 es MEXICO, 2 es MONTERREY, 3 es VERACRUZ, 4 es MEXICALI, 5 es QUERETARO Y 6 es CANCUN
  10. En los documentos DITIPMV que contine FA,FB,FC,FD,FZ,FV son los documentos facturas y debe de estar el campo DSTATUSCFD con valor 3. Estos dumentos representan las ventas
  11. el campo CLICOD es el cliente de los documentos
  12. Cuando te soliciten ventas por cliente el campo es el CLICOD pero debes de mostrarl el dato con CLINOM
  13. cuando te soliciten las devoluiones utiliza la instruccion mid(DNUM,1,1)='D' y debe de estar el campo DSTATUSCFD con valor 3
  14. Cuando te pregunten ventas por producto el precio es (AICANTF*AIPRECIO)
  15. Cuando te pidan las compras por proveedor incluye esta instruccion mid(DNUM,1,1)='R'
  16. El CLIPRV es el codigo del prooveedor pero siempre muestra el campo PRVNOM
  17. Cuando te soliciten ventas por producto la agrupacion es por el campo IEAN y el valor del campo ITIPO debe de ser diferente de 4 
  18. El tipo de cambio es el campo dtipoc
  19. Cuando te soliciten ventas por producto de la sucursal 1 utiliza el tipo de movimiento FA, sucursal 2 FB, sucursal 3 FC, sucursal 4 FD, sucursal 5 FZ y sucursal 6 FV
  20. Cuando te soliciten ventas por producto siempre muestra el ICOD,IEAN y IDESCR
  21. Cuando te soliciten ventas por familia utiliza la familia IFAMB para agrupar las ventas 
  22. Cuando exista un aunion entre las tablas no uses JOIN usa LEFT JOIN
  24. En las ventas por familia la union con la tabla de famias es LEFT JOIN FFAM AS FAMB ON FAMB.FAMTNUM=FINV.IFAMB, y para poner los campor debes de usar el FAMB como nombre de la tabla
  25. cuando te soliciten compras muestra la clave y la descripcion y el campo DSTATUSCFD=-3
  26. Cuando te soliciten compras y ventas el valor del campo debe de ser ITIPO<>4 
  27. Siempre que te pidan las ventas por familia muestra los nombres y ordena de mayor a menos las ventas. e incluye la tabla de INVENTARIOS en la consulta
  28. DFECHA es el campo donde se almacena la fecha de cada venta.
  29. No utilices el AS para poner el mismo nombre de la tabla
  30. En las ventas o compras donde utilices la tabla de auxiliares, utiliza para el importe (FAXINV.AICANTF*FAXINV.AIPRECIO)
  31. Cuando te soliciten ventas por agente o por vendedor, utiliza el importe (FAXINV.AICANTF*FAXINV.AIPRECIO)
  32. Cuando te pregunten cual es la venta del producto mas vendido utiliza (FAXINV.AICANTF*FAXINV.AIPRECIO) como el importe y mid(dnum,1,1)='F'
  33. Siempre que te pidan las ventas incluye las devolciones la sucursal 1 utiliza el tipo de movimiento DA, sucursal 2 DB, sucursal 3 DC, sucursal 4 DD, sucursal 5 DE y sucursal 6 FV
  34. Cuando soliciten ventas por proctuto siempre toma la descripcion de la tabla de descripcion y el campo es el I2DESCR y nombralo como descripcion


  FAXINV	CREATE TABLE faxinv ( -- TABLA AUXILIARES
              AISEQ int NOT NULL AUTO_INCREMENT,/ID_AUX_INV/ -- ESTE ES LA LLAVE ´RIMARIA DE LA TABLA AUXILIARES
              AITIPMV varchar(2) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '',/TIPO_MOVIMIENTO/
              AICANTF decimal(18,3) NOT NULL DEFAULT '0.000',/CANTIDAD/ -- ESTA ES LA CANTIDAD DE PÍEZAS DE LOS DOCUMENTOS
              AIPRECIO decimal(18,5) NOT NULL DEFAULT '0.00000',/PRECIO/ -- ESTE ES EL PRECIO NETO DE VENTA MENOS DESCUENTOS
              AICOSTO decimal(18,5) NOT NULL DEFAULT '0.00000',/COSTO/ -- ESTE EL EL COSTO PROMEDIO DEL PRODUCTO
              AIPREBR decimal(18,5) NOT NULL DEFAULT '0.00000',/PRECIO_BRUTO/ -- ESTE ES EL PRECIO SIN DESCUENTOS 
              AIDESCTO decimal(18,6) NOT NULL DEFAULT '0.000000',/DESCUENTO/ -- ESTE ES EL DESCUENTO POR PARTIDA DE CADA PRODUCTO EN EL DOCUEMNTO
              AIALMACEN varchar(6) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '',/ALMACEN/ -- ES EL ALMACEN DE DONDE ENTRA O SALE LOS PRODUCTOS
              AIUSEQ int NOT NULL DEFAULT '0',/USUARIO/ -- ESTE ES EL ID DEL USUARIO QUE GENERO EL DOCUMENTO
              AIUNIDAD varchar(3) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '',/UNIDAD/ -- ESTA ES LA UNIDAD DE MEDIDA DEL CODIGO QUE ESTA EN CADA DOCUMENTO
              CLISEQ int NOT NULL DEFAULT '0',/ID_CLIENTES/ -- ESTE ES EL ID_CLIENTES ES LA RELACION CON LA TABLA DE CLIENTES 
              DSEQ int NOT NULL DEFAULT '0',/ID_DOCUMENTOS/ -- EESTE ES L ID_DOCUMENTOS ES LA RELACION CON LA TABLA DOCUMENTOS
              ISEQ int NOT NULL DEFAULT '0',/ISEQ/ -- ES LA CLAVE PRIMARIA DE LA TABLA AUXILIARES
              PRIMARY KEY (AISEQ),/ID_AUX_INV/ -- ESTE ES EL ID DE LA TABLA DE AUXILIARES
              UNIQUE KEY AISEQ (AISEQ),ES LA CLAVE PRIMARIA DE LA TABLA AUXILIARES Y ES UNICA
              KEY CLISEQ (CLISEQ),-- /CLISEQ/ -- ES UNA CLAVE FORANEA QUE SE CONECTA CON LA TABLA DE CLIENTES 
              KEY DSEQ (DSEQ),/DSEQ/ -- ES UNA CLAVE FORANEA QUE SE CONECTA CON LA TABLA DE DOCUMENTOS 
              KEY ISEQ (ISEQ),/ISEQ/ -- ES UNA CLAVE FORANEA QUE SE CONECTA CON LA TABLA DE INVENTARIOS 
            ) ENGINE=InnoDB AUTO_INCREMENT=592585 DEFAULT CHARSET=macroman COLLATE=macroman_bin

CREATE TABLE fdoc ( -- TABLA DOCUMENTOS
  DSEQ int NOT NULL AUTO_INCREMENT, -- /ID_DOCUMENTOS/ -- ESTE ES LA LLAVE PRIMARIA DE LA TABLA DOCUMENTOS
  DNUM varchar(13) COLLATE macroman_bin NOT NULL DEFAULT '', -- /DOCTO/ -- ESTE ES EL NUMERO DE DOCUMENTO
  DCANT decimal(18,2) NOT NULL DEFAULT '0.00', -- /SALDO/ -- ESTA ES LA CANTIDAD QUE GUARDA EL SALDO DE UN DOCUMENTO
  DFECHA date NOT NULL DEFAULT '1900-12-31', -- /FECHA/ -- ESTA ES LA FECHA DE EMISION DEL DOCUMENTO
  DIVA decimal(18,2) NOT NULL DEFAULT '0.00', -- /IVA/ -- ESTE ES EL IVA DEL IMPORTE
  DDESC decimal(18,2) NOT NULL DEFAULT '0.00', -- /DESCTO/ -- ESTE ES EL DESCUENTO GENERAL DEL DOCUMENTO
  DBRUTO decimal(18,2) NOT NULL DEFAULT '0.00', -- /IMP_BRUTO/ -- ESTE ES EL IMPORTE ANTES DE IVA DEL DOCUMENTO
  DUTILID decimal(18,2) NOT NULL DEFAULT '0.00', -- /UTILIDAD/ -- ESTA ES LA UTILIDAD GENERADA DEL TOTAL DE LA VENTA MENOS EL IMPORTE TOTAL DEL COSTO
  DCANTF decimal(18,2) NOT NULL DEFAULT '0.00', -- /IMPORTE/ -- ESTE ES EL TOTAL DE LA FACTURA CON IVA
  DREFER varchar(13) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /REFERENCIA/ -- ESTE ES UNA REFERENCIA DEL DOCUMENTO
  DREFERELLOS varchar(23) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /PEDIDO_CLIENTE/ -- ESTE ES EL PEDIDO DEL O REFERENCIA DEL CLIENTE
  DESCXC tinyint unsigned NOT NULL DEFAULT '0', -- /CXC/ -- ESTE CAMPO ES PARA SABER SI EL DOCUMENTO YA FUE PAGADO A UN NO
  DESFACT tinyint unsigned NOT NULL DEFAULT '0',/SI_ES_FACTURA/ -- ESTE CAMPO ES PARA SABER QUE TIPO DE DOMUENTO ES 
  DPAR1 varchar(5) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /AGENTE/ -- ESTE ES EL PÁRAMETRO DEL VENDEDOR CON EL QUE SE CLASIFICA EL DOCUMENTO
  DCOSTOFLETE decimal(18,2) NOT NULL DEFAULT '0.00', -- /COSTO_FLETE/ -- ESTE ES EL COSTO DEL FLETE CUANDO EL DOCUEMNTO SE EMBARCA
  DPESO decimal(18,2) NOT NULL DEFAULT '0.00', -- /PESO_TOTAL/ -- ESTE ES LA TOTAL DEL PESO DE CADA CODIGO QUE SE GUARDA EN EL DOCUMENTO
  DCANCELADA tinyint unsigned NOT NULL DEFAULT '0', -- /CANCELADA/ -- ESTE CAMPO ES PARA SABER SI EL DOCUMENTO ESTA CANCELADO O NO
  DSTATUSCFD int NOT NULL DEFAULT '0', -- /STATUS_CFD/ -- ESTE ES EL CAMPO QUE GUARDA EL STATUS DE LA FACTURA PARA SABER SI YA ESTA TIMBRADA
  DITIPMV varchar(2) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /TIPO_MOVIMIENTO/ -- ESTE ES EL TIPO DE MOVIMIENTO QUE SE GUARDA POR CADA DOCUMENTO
  DMULTICIA tinyint unsigned NOT NULL DEFAULT '0', -- /SUCURSAL/ -- ESTE ES EL CAMPO QUE GUARDA DE QUE SUCURSAL ES EL DOCUMENTO
  CLISEQ int NOT NULL DEFAULT '0', -- /CLISEQ/ --ES UNA CLAVE FORANEA QUE SE CONECTA CON LA TABLA DE CLIENTES
  PRVSEQ int NOT NULL DEFAULT '0', -- /PRVSEQ/ -- ES UNA CLAVE FORANEA QUE SE CONECTA CON LA TABLA DE PROVEEDORES
  PRIMARY KEY (DSEQ), -- DSEQ ES LA CLAVE PRIMARIA DE LA TABLKA DOCUMENTOSW
  UNIQUE KEY DSEQ (DSEQ), -- ES LA CLAVE PRIMARIA DE LA TABLA DOCUEMNTOS Y ES UNICA
  
) ENGINE=InnoDB AUTO_INCREMENT=331186 DEFAULT CHARSET=macroman COLLATE=macroman_bin;


CREATE TABLE finv ( /TABLA DE INVENTARIOS /
  ISEQ int NOT NULL AUTO_INCREMENT, /ISEQ/ -- ESTA CAMPO ES LA LLAVE PRIMARIA DE LA TABLA INVENTARIOS
  ICOD varchar(13) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', /ICOD/ -- ESTE ES EL CODIGO DEL PRODUCTO
  IEAN varchar(30) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /IEAN /  ESTE ES EL CAMPO QUE GUARDA LA CLAVE DEL PRODUCTO
  ITIPO decimal(18,0) NOT NULL DEFAULT '0',-- ESTE CAMPO ES PARA SABER SI SON PRODUCTOS O SERVICIOS  LOS PRODUCTOS SON LOS QUE TIENE ITIPO=1  Y LOS SERVICIOS SON LOS QUE TIENEN TIPO=4
  IDESCR varchar(60) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', /CLAVE/ -- ESTA CAMPO ES LA DESCRIPCION DEL CODIGO
  IPEDCLI decimal(18,2) NOT NULL DEFAULT '0.00', /PEDIDO_CLIENTE/ -- ESTE CAMPO GUARDA LA CANTIDAD PEDIDA DE CLIENTES 
  IPEDPRV decimal(18,2) NOT NULL DEFAULT '0.00', /PEDIDO_PROVEEDOR/ -- ESTE CAMPO GUARDA LA CANTIDAD ORDENADA A PROVEEDORES
  ISTKACT decimal(18,3) NOT NULL DEFAULT '0.000', /STOCK_ACTUAL/ -- ESTE ES EL STOCK ACTUAL DEL CODIGO
  IULTVTA date NOT NULL DEFAULT '1900-12-31', /ULTIMA_VENTA/ -- ESTE CAMPO GUARDA LA FECHA DE LA ULTIMA VENTA DEL PRODUCTO
  IULTCPR date NOT NULL DEFAULT '1900-12-31', /ULTIMA_COMPRA/ -- ESTE CAMPO GUARDA LA FECHA DE LA ULTIMA COMPRA DEL PRODUCTO
  IFAM1 varchar(4) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', /FAMILIA_PROVEEDOR/ -- ESTE CAMPO GUARDA LA FAMILIA QUE TIENE COMO NOMBRE PROVEEDOR
  IFAM2 varchar(4) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', /FAMILIA_PRODUCTO/ -- ESTE CAMPO GUARDA LA FAMILIA QUE TIENE COMO NOMBRE PRODUCTO
  IFAM3 varchar(4) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', /FAMILIA_TIPO/ -- ESTE CAMPO GUARDA LA FAMILIA QUE TIENE COMO NOMBRE TIPO
  IFAM4 varchar(4) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', /FAMILIA_MATERIAL/ -- ESTE CAMPO GUARDA LA FAMILIA QUE TIENE COMO NOMBRE MATERIAL
  IFAMB varchar(4) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', /FAMILIA_SATUV/ -- ESTE CAMPO GUARDA LA FAMILIA QUE TIENE COMO NOMBRE SATUV
  IPESO double NOT NULL DEFAULT '0', /PESO/ -- ESTE CAMPO GUARDA EL PESO DEL PRODUCTO ESTA EN KILOS
  PRIMARY KEY (ISEQ), /ID_INVENTARIOS/ -- ESTE ES LA CLAVE PRIMARIA DE LA TABLA INVENTARIOS


CREATE TABLE fcli ( -- TABLA CLIENTES
  CLISEQ int NOT NULL AUTO_INCREMENT, -- /ID_CLIENTES/ -- ESTA CAMPO ES LA LLAVE PRIMARIA DE LA TABLA CLIENTES
  CLICOD varchar(6) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /CLIENTE/ -- ESTA CAMPO ES EL CODIGO DEL CLIENTE
  CLINOM varchar(255) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /NOMBRE_CLIENTE/ -- ESTA CAMPO ES EN NOMBRE DEL CLIENTE 
  CLIDIR varchar(45) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- ESTE ES EL CAMPO QUE GUARDA LA DIRECCCION DEL CLIENTE
  CLICD varchar(45) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /CIUDAD/ -- ESTA CAMPO ES LA CIUDAD DE LA DIRECCION DEL CLIENTE 
  CLIEDO varchar(16) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /ESTADO/ -- ESTA CAMPO DEL ESTADO DE LA DIRECCION DEL CLIENTE 
  CLICP varchar(12) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- ESTE ES EL CAMPO QUE GUARDA EL CODIGO POSTAL DE LA DIRECCION DEL CLIENTE
  CLIPAR1 varchar(5) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /AGENTE/ -- ESTA CAMPO ES EL PARAMETRO QUE GUARDA EL NUMERO DEL VENDEDOR
  CLIPAR2 varchar(4) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /SECTOR/ -- ESTA CAMPO ES EL PARAMETRO QUE GUARDA EL SECTOR DE LOS CLIENTES
  CLIPAR4 varchar(4) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /STATUS/ -- ESTA CAMPO ES EL QUE GUARDA EL STATUS DEL CLIENTE
  CLITEL3 varchar(75) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- /MONEDA/ -- ESTA CAMPO TELEFONO DE LA DIRECCION DEL CLIENTE 
  PRIMARY KEY (CLISEQ) -- /ID_CLIENTES/
);

# Table	Create Table
FFAM	CREATE TABLE ffam ( -- TABLA FAMILIAS
  FAMTNUM varchar(4) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- FAMTNUM ESTE ES LA CLAVE PRIMARIA DE LA TABLA DE FAMILIAS
  FAMDESCR varchar(30) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- ESTE CAMPO ES LA DESCRIPCION DE LA FAMILIA
  FAMT varchar(1) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- ESTE CAMPO ES EL NUMERO DE LA FAMILIA
  FAMNUM varchar(4) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- ESTE CAMPO ES EL CODIGO DE LA FAMILIA
   KEY FAMTNUM (FAMTNUM), -- ESTE CAMPO ES LA CLAVE PRIMARIA DE LA TABLA DE FAMILIAS
  ) ENGINE=InnoDB AUTO_INCREMENT=685 DEFAULT CHARSET=macroman COLLATE=macroman_bin


  # Table	Create Table
  FAG	CREATE TABLE fag (  -- TABLA VENDEDORES
  AGTNUM varchar(5) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- ESTE ES LA CLAVE PRIMARIA DE LA TABLA DE VENDEDORES
  AGDESCR varchar(45) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- ESTE CAMPO DESCRIBE EL NOMBRE DE ALGENTE O DEL VENDEDOR EN LAS VENTAS
  AGT varchar(1) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- ESTE ES EL NUMERO DEL PARAMETRO EN LA TABLA DE VENDEDORES
  AGNUM varchar(4) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '', -- ESTE ES EL CODIGO DEL VENDEDOR EN LA TABLA
  KEY AGTNUM (AGTNUM), -- ESTE ES LA CLAVE PRIMARIA DE LA TABLA DE VENDEDORES
  INCREMENT=290 DEFAULT CHARSET=macroman COLLATE=macroman_bin


  # Table	Create Table
FINV2	CREATE TABLE finv2 ( -- TABLA DESCRIOPCIONES 
  I2SEQ int NOT NULL AUTO_INCREMENT, -- ESTE CAMPO ES LA CLAVE PRIMARIA DE LA TABLA DESCRIPCIONES
  I2DESCR varchar(4800) CHARACTER SET macroman COLLATE macroman_bin NOT NULL DEFAULT '',  --  ESTA ES LA DESCRIPCION COMPLETA DE LOS PRODUCTOS
  I2KEY decimal(18,0) NOT NULL DEFAULT '0', --  ESTA ES LA LLAVE QUE UNE A ESTA TABLA DESCRPCIONES CON LA TAB LA DE INVENTARIOS
  PRIMARY KEY (I2SEQ), -- ESTA ES SU CLAVE PRIMARIA DE LA TABLA DESCRIPCIONES
  UNIQUE KEY I2SEQ (I2SEQ), --  ESTA ES SU CLAVE PRIMARIA
  KEY I2KEY (I2KEY),  --  ESTE ES LA LLAVE DE UNION ENTRE LA TABLA DESCRIPCIONES Y LA TABLA DE INVENTARIOS
) ENGINE=InnoDB AUTO_INCREMENT=62523 DEFAULT CHARSET=macroman COLLATE=macroman_bin

`;
