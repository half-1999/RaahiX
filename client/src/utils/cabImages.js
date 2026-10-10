/** Real cab photos, matched by make and model. Uploaded driver photos still win. */
const CAB_PHOTOS = {
  'maruti|dzire': '/cabs/maruti-dzire.jpg',
  'maruti|ertiga': '/cabs/maruti-ertiga.jpg',
  'maruti|xl6': '/cabs/maruti-xl6.jpg',
  'maruti|ciaz': '/cabs/maruti-ciaz.jpg',
  'maruti|brezza': '/cabs/maruti-brezza.jpg',
  'toyota|innova crysta': '/cabs/toyota-innova-crysta.jpg',
  'toyota|innova hycross': '/cabs/toyota-innova-hycross.jpg',
  'toyota|rumion': '/cabs/toyota-rumion.jpg',
  'honda|amaze': '/cabs/honda-amaze.jpg',
  'honda|city': '/cabs/honda-city.jpg',
  'hyundai|aura': '/cabs/hyundai-aura.jpg',
  'hyundai|verna': '/cabs/hyundai-verna.jpg',
  'hyundai|creta': '/cabs/hyundai-creta.jpg',
  'kia|carens': '/cabs/kia-carens.jpg',
  'kia|seltos': '/cabs/kia-seltos.jpg',
  'mahindra|marazzo': '/cabs/mahindra-marazzo.jpg',
  'mahindra|xuv700': '/cabs/mahindra-xuv700.jpg',
  'tata|tigor': '/cabs/tata-tigor.jpg',
  'tata|nexon': '/cabs/tata-nexon.jpg',
};

const SEDAN = '/cabs/maruti-dzire.jpg';
const PEOPLE_MOVER = '/cabs/toyota-innova-crysta.jpg';

export function stockCabImage(make, model, vehicleType) {
  const key = `${String(make || '').trim().toLowerCase()}|${String(model || '').trim().toLowerCase()}`;
  if (CAB_PHOTOS[key]) return CAB_PHOTOS[key];
  const type = String(vehicleType || '').toUpperCase();
  if (type.includes('6') || type.includes('7') || type.includes('SUV') || type.includes('MUV')) {
    return PEOPLE_MOVER;
  }
  return SEDAN;
}
