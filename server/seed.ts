import { prisma } from './db';
import { INITIAL_LETTERS_DATA, INITIAL_ERA_DATA } from '../src/data/initialData';
import { extractOrgUnit, classifyLetterType, parsePersianDate, DEFAULT_CAUSE_RULES, DEFAULT_EXCLUSION_RULES, processRawEraItems } from '../src/utils/parser';

export async function seedDatabase(force = false) {
  const lettersCount = await prisma.letter.count();
  const eraCount = await prisma.eraProcess.count();
  const rulesCount = await prisma.causeRule.count();
  const exclusionCount = await prisma.exclusionRule.count();

  if (!force && lettersCount > 0 && eraCount > 0 && rulesCount > 0 && exclusionCount > 0) {
    console.log(`Database already seeded with ${lettersCount} letters, ${eraCount} ERA processes, ${rulesCount} cause rules, ${exclusionCount} exclusion rules.`);
    return { lettersCount, eraCount, rulesCount, exclusionCount, seeded: false };
  }

  if (force) {
    await prisma.letter.deleteMany();
    await prisma.eraProcess.deleteMany();
    await prisma.causeRule.deleteMany();
    await prisma.exclusionRule.deleteMany();
  }

  // Seed Cause Rules
  if (rulesCount === 0 || force) {
    console.log(`Seeding ${DEFAULT_CAUSE_RULES.length} initial cause rules...`);
    for (const rule of DEFAULT_CAUSE_RULES) {
      await prisma.causeRule.create({
        data: {
          id: rule.id,
          keyword: rule.keyword,
          cause: rule.cause,
          targetUnit: rule.targetUnit || null,
          matchType: rule.matchType || 'contains',
          isActive: rule.isActive !== false,
          color: rule.color || '#2563EB',
          description: rule.description || null,
          priority: rule.priority || 0
        }
      });
    }
  }

  // Seed Exclusion Rules
  if (exclusionCount === 0 || force) {
    console.log(`Seeding ${DEFAULT_EXCLUSION_RULES.length} initial exclusion rules...`);
    for (const rule of DEFAULT_EXCLUSION_RULES) {
      await prisma.exclusionRule.create({
        data: {
          id: rule.id,
          keyword: rule.keyword,
          targetUnit: rule.targetUnit || null,
          matchType: rule.matchType || 'contains',
          field: rule.field || 'subject',
          isActive: rule.isActive !== false,
          reason: rule.reason || 'تست و آزمایشی'
        }
      });
    }
  }

  // Seed Default App Settings if not present
  const existingVisibility = await prisma.appSetting.findUnique({
    where: { key: 'unit_cause_visibility_config' }
  });
  if (!existingVisibility) {
    await prisma.appSetting.create({
      data: {
        key: 'unit_cause_visibility_config',
        value: JSON.stringify({
          'حسابداری مالی': true,
          'فروش': false,
          'all': true
        })
      }
    });
  }

  // Seed Letters
  if (lettersCount === 0 || force) {
    console.log(`Seeding ${INITIAL_LETTERS_DATA.length} initial letters...`);
    const letterRecords = INITIAL_LETTERS_DATA.map(item => {
      const creatorRaw = (
        item['ایجاد کننده نامه'] ||
        item['ایجاد کننده'] ||
        item['ایجادکننده نامه'] ||
        item['ایجادکننده'] ||
        item['ثبت کننده'] ||
        item['creatorRaw'] ||
        item['creator'] ||
        item['فرستنده نامه'] ||
        item['فرستنده'] ||
        ''
      );
      const { unit, name: creatorName, role: creatorRole } = extractOrgUnit(
        creatorRaw,
        item['فرستنده']
      );
      const actionType = classifyLetterType(item['موضوع'], item['موضوع نامه']);
      const dateInfo = parsePersianDate(item['تاریخ ثبت'] || item['تاریخ مشاهده'] || item['تاریخ وارده']);

      return {
        letterId: String(item['شناسه'] || ''),
        actionType,
        subject: item['موضوع نامه'] || item['موضوع'] || 'بدون عنوان',
        orgUnit: unit,
        sender: item['فرستنده'] || item['فرستنده نامه'] || 'نامشخص',
        receiver: item['گیرنده'] || item['گیرنده نامه'] || 'نامشخص',
        dateStr: dateInfo.dateStr,
        monthName: dateInfo.monthName,
        creatorName,
        creatorRole,
        creatorRaw: creatorRaw || item['فرستنده'] || '',
        urgency: item['فوریت'] || item['فوریت نامه'] || 'عادی',
        status: item['وضعیت نامه'] || 'عادی',
        registrationNumber: item['شماره ثبت'] || item['شماره وارده'] || null,
        rawJson: JSON.stringify(item)
      };
    });

    // Insert in batches of 100 for SQLite performance
    const batchSize = 100;
    for (let i = 0; i < letterRecords.length; i += batchSize) {
      const chunk = letterRecords.slice(i, i + batchSize);
      await prisma.letter.createMany({
        data: chunk
      });
    }
  }

  // Seed ERA Processes
  if (eraCount === 0 || force) {
    console.log(`Seeding ${INITIAL_ERA_DATA.length} initial ERA processes...`);
    const processedInitialEra = processRawEraItems(INITIAL_ERA_DATA);
    const eraRecords = processedInitialEra.map(item => ({
      processName: item.processName,
      orgUnit: item.orgUnit,
      executionDate: item.executionDate,
      operationType: item.operationType,
      entityType: item.entityType || 'فرآیند',
      description: item.description || '',
      rawJson: JSON.stringify(item)
    }));

    await prisma.eraProcess.createMany({
      data: eraRecords
    });
  }

  const finalLetters = await prisma.letter.count();
  const finalEra = await prisma.eraProcess.count();
  const finalRules = await prisma.causeRule.count();
  const finalExclusions = await prisma.exclusionRule.count();

  console.log(`Database seeded successfully: ${finalLetters} letters, ${finalEra} ERA processes, ${finalRules} cause rules, ${finalExclusions} exclusion rules.`);
  return { lettersCount: finalLetters, eraCount: finalEra, rulesCount: finalRules, exclusionCount: finalExclusions, seeded: true };
}

