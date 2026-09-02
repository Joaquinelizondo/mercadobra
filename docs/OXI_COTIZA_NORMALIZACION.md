# Normalización inicial de variables — OXI Cotiza

**Fuente:** `Variables.xlsx`, hoja `Precios Base`.

**Objetivo:** disponer de un catálogo semilla importable para el futuro módulo de costos, conservando la trazabilidad hacia el archivo original. Este documento no publica precios ni convierte automáticamente una cotización existente.

## Resultado

Se extrajeron las **81 variables con nombre** del libro y se generaron dos archivos:

- `oxi-cotiza-variables-iniciales.csv`: formato tabular para revisión e importación.
- `oxi-cotiza-variables-iniciales.json`: mismo contenido, apto para el posterior importador del backend.

| Tipo | Cantidad | Uso previsto |
| --- | ---: | --- |
| Precio unitario | 58 | Materiales, consumibles, herrajes, terminaciones y costos operativos. |
| Rendimiento | 13 | Horas-hombre por peso, metro, unidad o superficie. |
| Tarifa de mano de obra | 6 | Tarifas horarias de taller, montaje, pintura y albañilería. |
| Regla comercial porcentual | 3 | Gastos generales, margen bruto objetivo e IVA. |
| Costo logístico | 1 | Flete por viaje. |

Las 81 variables catalogadas son reutilizables. Las cantidades y medidas que aparecen en las hojas `H01` a `H04` son datos específicos del proyecto Casa J: no se importan como precios base; deberán convertirse más adelante en entradas de plantilla o de cotización.

## Estructura del catálogo semilla

Cada registro conserva los siguientes campos:

| Campo | Propósito |
| --- | --- |
| `code` | Código existente y estable, por ejemplo `PU_IPN120`. |
| `description` y `category` | Nombre legible y clasificación de origen. |
| `variable_type` | `precio_unitario`, `tarifa_mano_obra`, `rendimiento`, `regla_comercial_porcentaje` o `costo_logistica`. |
| `semantic_key` | Regla con significado de negocio especial. |
| `reference_unit` y `consumption_per_reference_unit` | Unidad y consumo de referencia informados por el libro. |
| `initial_value` | Valor calculado vigente en el archivo de referencia. |
| `source_*` | Celda, fórmula y archivo de origen para auditoría. |
| `currency` | UYU en el catálogo inicial, según la portada del libro. |
| `scope` y `review_status` | Alcance reutilizable y señal de revisión. |

## Reglas económicas ya definidas

Los costos base se mantendrán inicialmente en **UYU**, respetando la moneda y los valores del archivo fuente. La propuesta comercial se emitirá en **USD**. Antes de aplicar IVA, el motor convertirá el precio comercial mediante una variable versionada `commercial.usd_uyu_rate`; cada cotización enviada guardará el tipo de cambio exacto utilizado.

La fuente inicial será la [pizarra oficial de cotizaciones del BROU](https://www.brou.com.uy/cotizaciones). Para convertir un costo en UYU a un precio que se cobrará en USD se utilizará el valor **Dólar / Compra**: representa los pesos que el banco entrega al recibir esos USD. No se usará automáticamente el Dólar eBROU, porque es una cotización preferencial para operaciones específicas y puede no aplicar al cobro de cada proyecto. El valor importado deberá mostrar fecha y hora de consulta, y requerirá confirmación manual al enviar la cotización, ya que el propio BROU lo publica sujeto a confirmación.

Las variables comerciales se importarán con una clave semántica explícita:

| Código actual | Clave semántica | Tratamiento en el motor |
| --- | --- | --- |
| `PU_GASTOS_GRALES` | `commercial.overhead_rate` | Recargo sobre el costo directo. |
| `PU_BENEFICIO` | `commercial.gross_margin_target` | Margen bruto objetivo sobre venta antes de IVA. |
| `PU_IVA` | `commercial.tax_rate` | Impuesto aplicado después de determinar el precio sin IVA. |
| `PU_FLETE_VIAJE` | `logistics.trip_price` | Costo directo de logística por viaje. |

Por lo tanto, `PU_BENEFICIO` no se interpretará como un multiplicador de costo. La fórmula comercial aprobada es:

```text
costo_completo_uyu = costo_directo_uyu × (1 + gastos_generales)
precio_sin_IVA_uyu = costo_completo_uyu ÷ (1 - margen_bruto_objetivo)
precio_sin_IVA_usd = precio_sin_IVA_uyu ÷ cotizacion_usd_uyu
precio_final_usd = precio_sin_IVA_usd × (1 + IVA)
```

## Hallazgos y revisión pendiente

1. El libro contiene fórmulas de origen en 57 celdas de `Precios Base`. El catálogo conserva tanto el valor calculado como la fórmula como trazabilidad. En producción, el valor publicado será versionado; una fórmula de Excel no se ejecutará directamente desde la interfaz.
2. Las unidades de origen requieren normalización al importar: por ejemplo `Un`/`un`, `Kg`/`kg`, `hs` y `hs sold.`. El catálogo de unidades canónicas será `un`, `kg`, `ml`, `m²`, `m³`, `h`, `%` y `viaje`.
3. Nueve variables quedaron marcadas como `requiere_revision` porque su descripción o su contexto contiene supuestos, alternativas técnicas o datos no cerrados: `PU_CHAPA_PARRILLERO`, `PU_MALLA`, `PU_POLICARB`, `PU_DISCO_CORTE_4_5`, `PU_DISCO_DESBASTE_4_5`, `PU_DISCO_CORTE_7`, `PU_GAS_ARGON_CARGA`, `PU_GAS_ACETILENO` y `PU_GAS_OXIGENO`.
4. Las categorías 11.1 a 11.7 son extensiones especializadas. Se mantienen como reutilizables, pero cada plantilla deberá optar por ellas de forma explícita; no se agregarán automáticamente a toda cotización.
5. La portada menciona una hoja `Resumen`, pero el archivo recibido no la contiene. Los totales por estructura existen en las hojas H01–H04, pero no hay un total consolidado que deba importarse.

## Criterio para la siguiente etapa

La normalización queda preparada para iniciar la base técnica cuando se aprueben:

- La unidad canónica de cada registro y las conversiones necesarias.
- El estado inicial de las nueve variables en revisión.
- Confirmar la frecuencia de consulta automática de la pizarra del BROU; como punto de partida se actualizará una vez por día hábil y siempre se podrá reemplazar manualmente al emitir.
- La política de redondeo de costos, precio sin IVA e IVA.

## Base técnica creada

Con las reglas aprobadas se incorporó la migración `033_oxi_cotiza_cost_foundation.sql`, que crea:

- `cost_variables` para el catálogo estable.
- `cost_variable_versions` para precios, tarifas, rendimientos y reglas versionadas.
- `exchange_rate_versions` para la cotización UYU/USD de BROU y sus confirmaciones.
- `cost_audit_events` para la trazabilidad de cambios.

La carga inicial se ejecuta expresamente mediante `npm --prefix backend run costs:seed`. Inserta las 81 variables y sus versiones de origen sin sobrescribir cambios posteriores realizados desde administración. La migración y la carga fueron verificadas contra la base local; una segunda ejecución insertó cero registros, confirmando que es idempotente.

## Núcleo matemático inicial

El módulo `backend/src/costCalculator.js` implementa el cálculo determinístico inicial. Recibe líneas de costo en UYU, desperdicio, gastos generales, margen bruto objetivo, tipo de cambio UYU por USD e IVA; devuelve el desglose completo en ambas monedas y una traza legible de las fórmulas aplicadas.

El cálculo valida valores negativos, tasas fuera de rango, ausencia de líneas y cotizaciones inexistentes. Las pruebas de `backend/src/costCalculator.test.js` cubren el caso comercial base, la diferencia entre margen bruto y recargo, y la prevención de una división por cero.

El siguiente trabajo es conectar este núcleo con las versiones vigentes de `cost_variables` y con una versión confirmada del tipo de cambio, antes de incorporar fórmulas paramétricas por plantilla.
