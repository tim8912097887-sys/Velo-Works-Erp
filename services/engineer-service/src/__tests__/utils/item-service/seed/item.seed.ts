import { randomUUID } from 'crypto';
import { getApp } from '../../../setup.js';
import { DbService } from '../../../../infrastruture/persistence/db.service.js';

export async function seedItems() {
  const app = getApp();
  const dbService = app.get(DbService);
  console.log('🌱 Starting database seeding...');

  const itemTypes = ['RAW_MATERIAL', 'SUBASSEMBLY', 'FINISHED_GOOD'] as const;
  const makeBuysMap = {
    RAW_MATERIAL: ['BUY'],
    SUBASSEMBLY: ['MAKE', 'BUY', 'BOTH'],
    FINISHED_GOOD: ['MAKE', 'BUY', 'BOTH'],
  } as const;

  const units = ['PCS', 'KG', 'MTRS', 'LTRS', 'BOX'];
  const adjectives = [
    'Heavy Duty',
    'Standard',
    'Precision',
    'Eco',
    'Ultra',
    'Compact',
    'Industrial',
    'Modular',
  ];
  const nouns = [
    'Steel Bracket',
    'Copper Wire',
    'Control Board',
    'Housing Unit',
    'Sensor Module',
    'Gear Assembly',
    'Power Supply',
    'Connector Pin',
  ];

  const items = Array.from({ length: 50 }, (_, index) => {
    const id = randomUUID();
    const num = index + 1;
    const paddedNum = String(num).padStart(3, '0');

    // Cycle item types to distribute evenly
    const itemType = itemTypes[index % itemTypes.length];

    // Ensure rule: RAW_MATERIAL -> BUY only
    const validMakeBuys = makeBuysMap[itemType];
    const makeBuy = validMakeBuys[index % validMakeBuys.length];

    // Prefix based on type for clean code organization
    let prefix = 'RM';
    if (itemType === 'SUBASSEMBLY') prefix = 'SUB';
    if (itemType === 'FINISHED_GOOD') prefix = 'FG';

    const itemCode = `${prefix}-${paddedNum}`;
    const adj = adjectives[index % adjectives.length];
    const noun = nouns[Math.floor(index / adjectives.length) % nouns.length];
    const name = `${adj} ${noun} V${num}`;

    return {
      id,
      itemCode,
      name,
      itemType,
      unitOfMeasure: units[index % units.length],
      makeBuy,
      version: 1,
      leadTimeDays: (num % 20) + 1, // Generates lead times between 1 and 20 days (satisfies Zod >= 1)
      safetyStock: Number(((num * 2.25) % 150).toFixed(3)), // Satisfies Zod >= 0
      active: index !== 42 && index !== 47, // Make a couple inactive to test active filtering
    };
  });

  const result = await dbService.item.createMany({
    data: items,
  });

  console.log(`✅ Successfully seeded ${result.count} items.`);

  return items; // Return the seeded items for further use in tests
}
