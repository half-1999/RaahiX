export const CAB_MAKES = {
  Maruti: ['Dzire', 'Ertiga', 'XL6', 'Ciaz', 'Brezza'],
  Toyota: ['Innova Crysta', 'Innova Hycross', 'Rumion'],
  Honda: ['Amaze', 'City'],
  Hyundai: ['Aura', 'Verna', 'Creta'],
  Kia: ['Carens', 'Seltos'],
  Mahindra: ['Marazzo', 'XUV700'],
  Tata: ['Tigor', 'Nexon'],
  Force: ['Urbania'],
};

export const CUSTOM_MAKE = 'Other';

export const CAB_FEATURES = [
  'AC',
  'Charging',
  'Wi-Fi',
  'USB ports',
  'Reclining seats',
  'Pushback seats',
  'Music system',
  'Reading light',
  'Water bottle',
  'Bottle holder',
  'Blanket',
  'First aid kit',
  'Luggage space',
  'Sanitized cabin',
  'Child seat',
  'Window shades',
];

export function modelsForMake(make) {
  return CAB_MAKES[make] || [];
}
