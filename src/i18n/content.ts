import { Language } from './types';
import { TierRank } from '../types';

export interface EntityTranslation {
  name: string;
  description: string;
}

export const UPGRADE_TRANSLATIONS: Record<Language, Record<string, EntityTranslation>> = {
  en: {
    tool_sieve: {
      name: 'Calibrated Sieve',
      description: 'Precision wire mesh capturing finer alluvial gold'
    },
    tool_magnetic_pan: {
      name: 'Magnetic Pan',
      description: 'Polarized rim captures black sands (+5% crit chance for 10x yield, up to 75% max)'
    },
    tool_prospector_rhythm: {
      name: 'Prospector Rhythm',
      description: 'Rhythmic swirling builds active tap combo meter up to 3.0x multiplier max'
    },
    tool_diamond_pickaxe: {
      name: 'Diamond-Tip Pickaxe',
      description: '+1% chance per level to instantly shatter 500g paydirt vein (up to 25% max)'
    },
    tool_pneumatic_drill: {
      name: 'Pneumatic Rock Drill',
      description: 'Compressed-air steel drill fracturing cemented bedrock (+20 g/tap)'
    },
    mach_sluice_box: {
      name: 'Sluice Box',
      description: 'Continuous gravity-fed wooden flume with riffles'
    },
    mach_water_monitor: {
      name: 'High-Pressure Water Monitor',
      description: 'Hydraulic wash giant blasting river gravel banks continuously'
    },
    mach_diesel_trommel: {
      name: 'Diesel Trommel',
      description: 'Heavy rotating motorized cylinder sorting gravel sizes'
    },
    mach_electric_dredge: {
      name: 'Electric Dredge',
      description: 'Continuous suction line vacuuming riverbed placer deposits'
    },
    mach_bucket_wheel: {
      name: 'Bucket-Wheel Excavator',
      description: 'Continuous heavy tracked excavator slicing deep gravel benches (+3,000 g/s)'
    },
    mach_cyclone_washplant: {
      name: 'Heavy Placer Wash Plant',
      description: 'High-volume vibrating screens and hydrocyclones processing deep paydirt (+18,000 g/s)'
    },
    mach_bearing_grease: {
      name: 'Synergy Bearing Grease',
      description: '+1% Machinery output per 10 total tool levels purchased (up to +200% max)'
    },
    market_gravel_crusher: {
      name: 'Road Gravel Crusher',
      description: 'Permanently raises base gravel price by +$0.005/g per level'
    },
    market_gold_concentrator: {
      name: 'Centrifugal Gold Concentrator',
      description: '+2%/s chance per level to find raw gold flakes with instant rewards (up to 50% max)'
    },
    market_bulk_contract: {
      name: 'Bulk Delivery Contract',
      description: 'Auto-sells sieved gravel every 30s with +25% bonus margin per level (up to +500% max)'
    },
    geo_probe: {
      name: 'Geological Probe',
      description: 'Reveals nugget depth range on HUD with up to ±2% pinpoint precision (4 levels max)'
    },
    geo_pulse_detector: {
      name: 'Pulse Metal Detector',
      description: 'Screen border begins glowing gold when dirt is within 15% of the nugget (1 level max)'
    },
    geo_radar: {
      name: 'Ground Penetrating Radar',
      description: 'Auto-strips 10% barren topsoil per level upon starting any new claim (up to 30% max)'
    }
  },
  ru: {
    tool_sieve: {
      name: 'Калиброванное сито',
      description: 'Точная проволочная сетка для улавливания мелкого россыпного золота'
    },
    tool_magnetic_pan: {
      name: 'Магнитный лоток',
      description: 'Поляризованный обод притягивает черные пески (+5% шанс крита с x10 добычей, макс. 75%)'
    },
    tool_prospector_rhythm: {
      name: 'Ритм старателя',
      description: 'Ритмичные круговые движения накапливают комбо-множитель вплоть до x3.0 макс'
    },
    tool_diamond_pickaxe: {
      name: 'Алмазная кирка',
      description: '+1% шанс за уровень мгновенно расколоть жилу на 500г породы (макс. 25%)'
    },
    tool_pneumatic_drill: {
      name: 'Пневматический бур',
      description: 'Стальной пневмоперфоратор, раскалывающий твердые коренные породы (+20 г/клик)'
    },
    mach_sluice_box: {
      name: 'Промывочный шлюз',
      description: 'Деревянный желоб с трафаретами для непрерывного гравитационного осаждения'
    },
    mach_water_monitor: {
      name: 'Гидромонитор высокого давления',
      description: 'Мощная гидропушка непрерывно размывает песчано-гравийные террасы'
    },
    mach_diesel_trommel: {
      name: 'Дизельный троммель',
      description: 'Тяжелый вращающийся барабан для автоматической калибровки породы'
    },
    mach_electric_dredge: {
      name: 'Электрическая драга',
      description: 'Мощный всасывающий грунтонасос для глубоких донных россыпей'
    },
    mach_bucket_wheel: {
      name: 'Роторный экскаватор',
      description: 'Тяжелый гусеничный комбайн непрерывного ковшового черпания (+3 000 г/сек)'
    },
    mach_cyclone_washplant: {
      name: 'Промывочный комплекс',
      description: 'Многодечные виброгрохоты и гидроциклоны для глубоких пластов (+18 000 г/сек)'
    },
    mach_bearing_grease: {
      name: 'Смазка подшипников (Синергия)',
      description: '+1% к мощности машин за каждые 10 суммарных уровней ручных инструментов (макс. +200%)'
    },
    market_gravel_crusher: {
      name: 'Гравийная дробилка',
      description: 'Навсегда повышает базовую стоимость продажи гравия на +$0.005/г за уровень'
    },
    market_gold_concentrator: {
      name: 'Центробежный концентратор',
      description: '+2%/сек шанс за уровень найти самородные золотые чешуйки (макс. 50%)'
    },
    market_bulk_contract: {
      name: 'Оптовый контракт поставки',
      description: 'Автоматически отгружает гравий каждые 30 сек с бонусом +25% к цене за уровень (макс. +500%)'
    },
    geo_probe: {
      name: 'Геологический зонд',
      description: 'Определяет диапазон глубины залегания самородка с точностью до ±2% (макс. 4 уровня)'
    },
    geo_pulse_detector: {
      name: 'Импульсный металлоискатель',
      description: 'Рамка экрана сияет золотом, когда до залежи самородка остается менее 15% породы (1 уровень)'
    },
    geo_radar: {
      name: 'Георадар подповерхностного слоя',
      description: 'Срезает по 10% пустой вскрышной породы за уровень на каждом новом участке (макс. 30%)'
    }
  }
};

export const CLAIM_NAMES: Record<Language, Record<number, string>> = {
  en: {
    1: 'Riverbank Alluvium',
    2: 'Compacted Creek Clay',
    3: 'Glacial Till & Granite',
    4: 'Cemented Bedrock Bench',
    5: 'Permafrost Quartz Vein',
    6: 'Abyssal Hypothermal Fissure'
  },
  ru: {
    1: 'Прибрежный аллювий',
    2: 'Плотная ручьевая глина',
    3: 'Моренный гранитный пласт',
    4: 'Сцементированная терраса коренных пород',
    5: 'Вечномерзлая кварцевая жила',
    6: 'Абиссальная гидротермальная расселина'
  }
};

export const PERK_TRANSLATIONS: Record<Language, Record<string, EntityTranslation>> = {
  en: {
    perk_diamond_chisels: {
      name: 'Diamond Chisel Bits',
      description: '-10% Rock Hardness per level (up to -50%)'
    },
    perk_assayer_grade: {
      name: "Certified Assayer's Seal",
      description: '+25% Permanent Gravel Price per level'
    },
    perk_grubstake: {
      name: 'Frontier Grubstake',
      description: 'Start new claims with +$50.00 cash per level'
    },
    perk_master_prospector: {
      name: 'Master Prospector',
      description: '+20% Global Manual & Machine Output per level'
    },
    perk_overburden_strip: {
      name: 'Topsoil Steam Shovel',
      description: 'Auto-strips 5% initial barren overburden on every claim'
    }
  },
  ru: {
    perk_diamond_chisels: {
      name: 'Алмазные резцы',
      description: '-10% к твердости породы за уровень (до -50%)'
    },
    perk_assayer_grade: {
      name: 'Печать пробирного мастера',
      description: '+25% к постоянной цене продажи гравия за уровень'
    },
    perk_grubstake: {
      name: 'Подъемный капитал старателя',
      description: 'Начинайте каждый новый участок с дополнительными +$50.00 за уровень'
    },
    perk_master_prospector: {
      name: 'Мастер-проспектор',
      description: '+20% к глобальной ручной и машинной добыче за уровень'
    },
    perk_overburden_strip: {
      name: 'Паровой экскаватор вскрыши',
      description: 'Автоматически удаляет 5% пустой поверхностной породы на каждом участке'
    }
  }
};

export const NUGGET_TRANSLATIONS: Record<Language, { name: string; lore: string }[]> = {
  en: [
    { name: 'Welcome Stranger of Klondike', lore: 'A fabled solid hunk of native gold uncovered near bedrock.' },
    { name: 'Eureka Crown Jewel', lore: 'Gleams with crystalline quartz inclusions and 24K pure gold veins.' },
    { name: 'Sierra Nevada Boulder', lore: 'Heavy nugget polished by millennia of rushing mountain flumes.' },
    { name: 'Bonanza Creek Heart', lore: 'The legend of Dawson City, dense enough to tip industrial scales.' },
    { name: 'Yukon Colossus', lore: 'Mammoth geological wonder discovered in the deep river bench.' },
    { name: 'El Dorado Solar Relic', lore: 'Radiates an amber glow with unyielding natural splendor.' },
    { name: 'Midas Bedrock Core', lore: 'Pure crystalline gold relic thought to exist only in miner myths.' }
  ],
  ru: [
    { name: 'Желанный гость Клондайка', lore: 'Легендарная глыба самородного золота, поднятая с самого скального основания.' },
    { name: 'Венец Эврики', lore: 'Сверкает кристаллическими кварцевыми включениями и прожилками золота 999 пробы.' },
    { name: 'Валун Сьерра-Невады', lore: 'Увесистый самородок, отшлифованный тысячелетиями бурных горных потоков.' },
    { name: 'Сердце Бонанза-Крик', lore: 'Легенда Доусона — самородок настолько тяжелый, что опрокидывает весы.' },
    { name: 'Юконский колосс', lore: 'Геологическое чудо исполинских размеров, извлеченное из древнего русла.' },
    { name: 'Солнечная реликвия Эльдорадо', lore: 'Излучает теплое янтарное сияние нетускнеющего природного золота.' },
    { name: 'Ядро Мидаса', lore: 'Кристаллический золотой монолит, ранее считавшийся лишь шахтерской легендой.' }
  ]
};

export const RANK_TRANSLATIONS: Record<Language, Record<TierRank, string>> = {
  en: {
    Bronze: 'Bronze',
    Silver: 'Silver',
    Gold: 'Gold',
    Diamond: 'Diamond',
    Secret: 'Secret'
  },
  ru: {
    Bronze: 'Бронза',
    Silver: 'Серебро',
    Gold: 'Золото',
    Diamond: 'Алмаз',
    Secret: 'Секрет'
  }
};

export function getUpgradeText(lang: Language, id: string, fallbackName: string, fallbackDesc: string): EntityTranslation {
  return UPGRADE_TRANSLATIONS[lang]?.[id] || { name: fallbackName, description: fallbackDesc };
}

export function getClaimName(lang: Language, tier: number, fallbackName: string): string {
  return CLAIM_NAMES[lang]?.[tier] || (lang === 'ru' ? `Участок #${tier}: Глубинный плутон` : fallbackName);
}

export function getPerkText(lang: Language, id: string, fallbackName: string, fallbackDesc: string): EntityTranslation {
  return PERK_TRANSLATIONS[lang]?.[id] || { name: fallbackName, description: fallbackDesc };
}

export function getNuggetText(lang: Language, index: number, fallbackName: string, fallbackLore: string): { name: string; lore: string } {
  const list = NUGGET_TRANSLATIONS[lang];
  if (list && list[index % list.length]) {
    return list[index % list.length];
  }
  return { name: fallbackName, lore: fallbackLore };
}
