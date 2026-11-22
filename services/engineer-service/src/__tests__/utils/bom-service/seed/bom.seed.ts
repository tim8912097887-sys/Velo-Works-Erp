import { randomUUID } from 'node:crypto';
import { getApp } from '../../../setup.js';
import { DbService } from '../../../../infrastruture/persistence/db.service.js';

export interface SeedBicycleBomOptions {
  /** Optional prefix to prevent itemCode unique collisions across parallel tests */
  codePrefix?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
  status?: 'DRAFT' | 'ACTIVE' | 'OBSOLETE';
}

export async function seedBomHeaders(parentItemId: string, count = 2) {
  const dbService = getApp().get(DbService);
  const revisions = Array.from({ length: count }, () => ({
    parentItemId,
    revision: `SEED-${randomUUID().slice(0, 15)}`,
    status: 'OBSOLETE',
    version: 1,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
  }));

  if (revisions.length === 0) {
    return [];
  }

  await dbService.bomHeader.createMany({ data: revisions });
  return dbService.bomHeader.findMany({
    where: {
      parentItemId,
      revision: { in: revisions.map(({ revision }) => revision) },
    },
    orderBy: { revision: 'asc' },
  });
}

export async function seedBomHeader(
  parentItemId: string,
  effectiveFrom: Date,
  effectiveTo: Date | null,
  status: string,
) {
  const dbService = getApp().get(DbService);
  return dbService.bomHeader.create({
    data: {
      parentItemId,
      revision: `SEED-${randomUUID().slice(0, 15)}`,
      status,
      version: 1,
      effectiveFrom,
      effectiveTo,
    },
  });
}

export async function seedBomComponent(bomHeaderId: string, componentItemId: string) {
  const dbService = getApp().get(DbService);
  return dbService.bomComponent.create({
    data: {
      bomHeaderId,
      componentItemId,
      quantityPer: 1,
      scrapRate: 0,
    },
  });
}

export async function seedBicycleBom(options: SeedBicycleBomOptions = {}) {
  const dbService = getApp().get(DbService);

  const {
    codePrefix = '',
    effectiveFrom = new Date('2026-01-01T00:00:00.000Z'),
    effectiveTo = null,
    status = 'ACTIVE',
  } = options;

  const withPrefix = (code: string) => `${codePrefix}${code}`.slice(0, 50);

  // 1. Define all items across levels 0 -> 4
  const itemDefinitions = [
    // Level 0: Finished Good
    {
      key: 'BIKE_ROAD',
      itemCode: withPrefix('FG-BIKE-ROAD'),
      name: 'Complete Road Bicycle',
      itemType: 'FINISHED_GOOD',
      unitOfMeasure: 'PCS',
      makeBuy: 'MAKE',
      leadTimeDays: 3,
      safetyStock: 5,
    },

    // Level 1: Subassemblies & direct purchased items
    {
      key: 'FRAME_ASSY',
      itemCode: withPrefix('SUB-FRAME-ASSY'),
      name: 'Painted Frame Assembly',
      itemType: 'SUBASSEMBLY',
      unitOfMeasure: 'PCS',
      makeBuy: 'MAKE',
      leadTimeDays: 4,
      safetyStock: 10,
    },
    {
      key: 'WHEEL_ASSY',
      itemCode: withPrefix('SUB-WHEEL-ASSY'),
      name: '700c Wheel Assembly',
      itemType: 'SUBASSEMBLY',
      unitOfMeasure: 'PCS',
      makeBuy: 'MAKE',
      leadTimeDays: 2,
      safetyStock: 16,
    },
    {
      key: 'DRIVETRAIN',
      itemCode: withPrefix('SUB-DRIVETRAIN'),
      name: '11-Speed Drivetrain Kit',
      itemType: 'SUBASSEMBLY',
      unitOfMeasure: 'PCS',
      makeBuy: 'MAKE',
      leadTimeDays: 2,
      safetyStock: 8,
    },
    {
      key: 'SADDLE_PRO',
      itemCode: withPrefix('RM-SADDLE-PRO'),
      name: 'Ergonomic Road Saddle',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 7,
      safetyStock: 20,
    },
    {
      key: 'BRAKE_CALIPER',
      itemCode: withPrefix('RM-BRAKE-CALIPER'),
      name: 'Hydraulic Disc Brake Caliper',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 10,
      safetyStock: 24,
    },

    // Level 2: Subassemblies & raw materials
    {
      key: 'FRAME_WELD',
      itemCode: withPrefix('SUB-FRAME-WELD'),
      name: 'Welded Aluminum Frame',
      itemType: 'SUBASSEMBLY',
      unitOfMeasure: 'PCS',
      makeBuy: 'MAKE',
      leadTimeDays: 5,
      safetyStock: 10,
    },
    {
      key: 'PAINT_PRIMER',
      itemCode: withPrefix('RM-PAINT-PRIMER'),
      name: 'Epoxy Primer & Gloss Coat',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'LTRS',
      makeBuy: 'BUY',
      leadTimeDays: 5,
      safetyStock: 15,
    },
    {
      key: 'HUB_ASSY',
      itemCode: withPrefix('SUB-HUB-ASSY'),
      name: 'Sealed Bearing Hub Assembly',
      itemType: 'SUBASSEMBLY',
      unitOfMeasure: 'PCS',
      makeBuy: 'MAKE',
      leadTimeDays: 3,
      safetyStock: 20,
    },
    {
      key: 'RIM_CARBON',
      itemCode: withPrefix('RM-RIM-CARBON'),
      name: '700c Carbon Rim',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 14,
      safetyStock: 20,
    },
    {
      key: 'SPOKE_SS',
      itemCode: withPrefix('RM-SPOKE-SS'),
      name: 'Stainless Steel J-Bend Spoke',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 5,
      safetyStock: 500,
    },
    {
      key: 'NIPPLE_BRASS',
      itemCode: withPrefix('RM-NIPPLE-BRASS'),
      name: 'Brass Spoke Nipple',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 5,
      safetyStock: 500,
    },
    {
      key: 'TIRE_700C',
      itemCode: withPrefix('RM-TIRE-700C'),
      name: '700x28c Road Tire',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 6,
      safetyStock: 30,
    },
    {
      key: 'TUBE_BUTYL',
      itemCode: withPrefix('RM-TUBE-BUTYL'),
      name: '700c Inner Tube',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 4,
      safetyStock: 50,
    },
    {
      key: 'CRANKSET',
      itemCode: withPrefix('SUB-CRANKSET'),
      name: '50/34T Alloy Crankset',
      itemType: 'SUBASSEMBLY',
      unitOfMeasure: 'PCS',
      makeBuy: 'MAKE',
      leadTimeDays: 3,
      safetyStock: 12,
    },
    {
      key: 'CHAIN_11S',
      itemCode: withPrefix('RM-CHAIN-11S'),
      name: '11-Speed Roller Chain',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 5,
      safetyStock: 25,
    },
    {
      key: 'CASSETTE_11S',
      itemCode: withPrefix('RM-CASSETTE-11S'),
      name: '11-28T Cassette',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 7,
      safetyStock: 20,
    },
    {
      key: 'DERAILLEUR_RR',
      itemCode: withPrefix('RM-DERAILLEUR-RR'),
      name: '11-Speed Rear Derailleur',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 9,
      safetyStock: 15,
    },

    // Level 3: Subassembly & raw materials
    {
      key: 'TUBE_AL6061',
      itemCode: withPrefix('RM-TUBE-AL6061'),
      name: '6061 Aluminum Tubing',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'MTRS',
      makeBuy: 'BUY',
      leadTimeDays: 12,
      safetyStock: 100,
    },
    {
      key: 'DROPOUT_CNC',
      itemCode: withPrefix('RM-DROPOUT-CNC'),
      name: 'CNC Rear Dropout',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 8,
      safetyStock: 40,
    },
    {
      key: 'WELD_ROD',
      itemCode: withPrefix('RM-WELD-ROD'),
      name: 'Aluminum Welding Rod',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'KG',
      makeBuy: 'BUY',
      leadTimeDays: 4,
      safetyStock: 10,
    },
    {
      key: 'HUB_SHELL',
      itemCode: withPrefix('RM-HUB-SHELL'),
      name: 'Forged Alloy Hub Shell',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 10,
      safetyStock: 30,
    },
    {
      key: 'BEARING_CART',
      itemCode: withPrefix('RM-BEARING-CART'),
      name: 'Sealed Cartridge Bearing',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 6,
      safetyStock: 80,
    },
    {
      key: 'AXLE_KIT',
      itemCode: withPrefix('SUB-AXLE-KIT'),
      name: 'Thru-Axle & End Cap Kit',
      itemType: 'SUBASSEMBLY',
      unitOfMeasure: 'PCS',
      makeBuy: 'MAKE',
      leadTimeDays: 2,
      safetyStock: 25,
    },
    {
      key: 'CRANK_ARM',
      itemCode: withPrefix('RM-CRANK-ARM'),
      name: 'Forged Crank Arm Pair',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 10,
      safetyStock: 20,
    },
    {
      key: 'CHAINRING_50T',
      itemCode: withPrefix('RM-CHAINRING-50T'),
      name: '50T Outer Chainring',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 7,
      safetyStock: 20,
    },
    {
      key: 'CHAINRING_34T',
      itemCode: withPrefix('RM-CHAINRING-34T'),
      name: '34T Inner Chainring',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 7,
      safetyStock: 20,
    },
    {
      key: 'CHAINRING_BOLT',
      itemCode: withPrefix('RM-CHAINRING-BOLT'),
      name: 'Chainring Bolt Set',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 3,
      safetyStock: 100,
    },

    // Level 4: Deepest raw materials
    {
      key: 'AXLE_TI',
      itemCode: withPrefix('RM-AXLE-TI'),
      name: 'Titanium Axle Shaft',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 14,
      safetyStock: 20,
    },
    {
      key: 'ENDCAP_AL',
      itemCode: withPrefix('RM-ENDCAP-AL'),
      name: 'Anodized End Cap',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'PCS',
      makeBuy: 'BUY',
      leadTimeDays: 5,
      safetyStock: 60,
    },
  ] as const;

  type ItemKey = (typeof itemDefinitions)[number]['key'];

  const itemsData = itemDefinitions.map(({ key: _key, ...item }) => ({
    id: randomUUID(),
    ...item,
    version: 1,
    active: true,
  }));

  await dbService.item.createMany({ data: itemsData });

  const itemByKey = Object.fromEntries(
    itemDefinitions.map((def, idx) => [def.key, itemsData[idx]]),
  ) as Record<ItemKey, (typeof itemsData)[number]>;

  // 2. Create BOM headers for the Finished Good and every Subassembly (reusing existing seedBomHeader)
  const parentKeys: ItemKey[] = [
    'BIKE_ROAD',
    'FRAME_ASSY',
    'FRAME_WELD',
    'WHEEL_ASSY',
    'HUB_ASSY',
    'AXLE_KIT',
    'DRIVETRAIN',
    'CRANKSET',
  ];

  const bomHeaderByKey = {} as Record<ItemKey, Awaited<ReturnType<typeof seedBomHeader>>>;

  for (const key of parentKeys) {
    bomHeaderByKey[key] = await seedBomHeader(
      itemByKey[key].id,
      effectiveFrom,
      effectiveTo,
      status,
    );
  }

  // 3. Wire up multi-level BOM components
  const componentEdges: Array<{
    parent: ItemKey;
    component: ItemKey;
    quantityPer: number;
    scrapRate?: number;
    operationSeq?: number;
  }> = [
    // Level 0 -> Level 1 (BIKE_ROAD)
    { parent: 'BIKE_ROAD', component: 'FRAME_ASSY', quantityPer: 1, operationSeq: 10 },
    { parent: 'BIKE_ROAD', component: 'WHEEL_ASSY', quantityPer: 2, operationSeq: 20 },
    { parent: 'BIKE_ROAD', component: 'DRIVETRAIN', quantityPer: 1, operationSeq: 30 },
    { parent: 'BIKE_ROAD', component: 'BRAKE_CALIPER', quantityPer: 2, operationSeq: 40 },
    { parent: 'BIKE_ROAD', component: 'SADDLE_PRO', quantityPer: 1, operationSeq: 50 },

    // Level 1 -> Level 2 (FRAME_ASSY)
    { parent: 'FRAME_ASSY', component: 'FRAME_WELD', quantityPer: 1, operationSeq: 10 },
    {
      parent: 'FRAME_ASSY',
      component: 'PAINT_PRIMER',
      quantityPer: 0.45,
      scrapRate: 0.08,
      operationSeq: 20,
    },

    // Level 2 -> Level 3 (FRAME_WELD)
    {
      parent: 'FRAME_WELD',
      component: 'TUBE_AL6061',
      quantityPer: 3.2,
      scrapRate: 0.05,
      operationSeq: 10,
    },
    { parent: 'FRAME_WELD', component: 'DROPOUT_CNC', quantityPer: 2, operationSeq: 20 },
    {
      parent: 'FRAME_WELD',
      component: 'WELD_ROD',
      quantityPer: 0.25,
      scrapRate: 0.1,
      operationSeq: 20,
    },

    // Level 1 -> Level 2 (WHEEL_ASSY)
    { parent: 'WHEEL_ASSY', component: 'HUB_ASSY', quantityPer: 1, operationSeq: 10 },
    { parent: 'WHEEL_ASSY', component: 'RIM_CARBON', quantityPer: 1, operationSeq: 10 },
    {
      parent: 'WHEEL_ASSY',
      component: 'SPOKE_SS',
      quantityPer: 28,
      scrapRate: 0.02,
      operationSeq: 20,
    },
    {
      parent: 'WHEEL_ASSY',
      component: 'NIPPLE_BRASS',
      quantityPer: 28,
      scrapRate: 0.02,
      operationSeq: 20,
    },
    { parent: 'WHEEL_ASSY', component: 'TIRE_700C', quantityPer: 1, operationSeq: 30 },
    { parent: 'WHEEL_ASSY', component: 'TUBE_BUTYL', quantityPer: 1, operationSeq: 30 },

    // Level 2 -> Level 3 (HUB_ASSY)
    { parent: 'HUB_ASSY', component: 'HUB_SHELL', quantityPer: 1, operationSeq: 10 },
    { parent: 'HUB_ASSY', component: 'BEARING_CART', quantityPer: 2, operationSeq: 20 },
    { parent: 'HUB_ASSY', component: 'AXLE_KIT', quantityPer: 1, operationSeq: 30 },

    // Level 3 -> Level 4 (AXLE_KIT)
    { parent: 'AXLE_KIT', component: 'AXLE_TI', quantityPer: 1, operationSeq: 10 },
    { parent: 'AXLE_KIT', component: 'ENDCAP_AL', quantityPer: 2, operationSeq: 20 },

    // Level 1 -> Level 2 (DRIVETRAIN)
    { parent: 'DRIVETRAIN', component: 'CRANKSET', quantityPer: 1, operationSeq: 10 },
    { parent: 'DRIVETRAIN', component: 'CHAIN_11S', quantityPer: 1, operationSeq: 20 },
    { parent: 'DRIVETRAIN', component: 'CASSETTE_11S', quantityPer: 1, operationSeq: 30 },
    { parent: 'DRIVETRAIN', component: 'DERAILLEUR_RR', quantityPer: 1, operationSeq: 40 },

    // Level 2 -> Level 3 (CRANKSET)
    { parent: 'CRANKSET', component: 'CRANK_ARM', quantityPer: 1, operationSeq: 10 },
    { parent: 'CRANKSET', component: 'CHAINRING_50T', quantityPer: 1, operationSeq: 20 },
    { parent: 'CRANKSET', component: 'CHAINRING_34T', quantityPer: 1, operationSeq: 20 },
    { parent: 'CRANKSET', component: 'CHAINRING_BOLT', quantityPer: 5, operationSeq: 30 },
  ];

  const componentsData = componentEdges.map((edge) => ({
    id: randomUUID(),
    bomHeaderId: bomHeaderByKey[edge.parent].id,
    componentItemId: itemByKey[edge.component].id,
    // Link child's active BOM revision when the component is itself a subassembly
    componentRevision: bomHeaderByKey[edge.component]?.revision ?? null,
    quantityPer: edge.quantityPer,
    scrapRate: edge.scrapRate ?? 0,
    operationSeq: edge.operationSeq ?? null,
  }));

  await dbService.bomComponent.createMany({ data: componentsData });

  return {
    rootItem: itemByKey.BIKE_ROAD,
    rootBomHeader: bomHeaderByKey.BIKE_ROAD,
    items: itemByKey,
    bomHeaders: bomHeaderByKey,
    components: componentsData,
  };
}
