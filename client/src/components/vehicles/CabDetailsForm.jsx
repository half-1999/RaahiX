import { CAB_FEATURES, CAB_MAKES, CUSTOM_MAKE, modelsForMake } from '../../utils/cabCatalog';
import { VEHICLE_TYPE_OPTIONS } from '../../utils/vehicleLayouts';
import Input from '../ui/Input';
import Select from '../ui/Select';

export default function CabDetailsForm({ value, onChange, errors = {} }) {
  const makes = [...Object.keys(CAB_MAKES), CUSTOM_MAKE];
  const knownMake = Object.prototype.hasOwnProperty.call(CAB_MAKES, value.make);
  const makeChoice = value.customMake || !knownMake ? CUSTOM_MAKE : value.make;
  const models = modelsForMake(knownMake ? value.make : '');
  const modelChoice = value.customModel || !models.includes(value.model) ? 'Other' : value.model;

  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Registration number"
        name="registrationNumber"
        required
        value={value.registrationNumber}
        error={errors.registrationNumber}
        onChange={(e) => set({ registrationNumber: e.target.value.toUpperCase() })}
        hint="Example: DL01AB1001"
      />
      <Select
        label="Cabin"
        name="vehicleType"
        value={value.vehicleType}
        onChange={(e) => set({ vehicleType: e.target.value })}
        options={VEHICLE_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
      />
      <Select
        label="Company"
        value={makeChoice}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CUSTOM_MAKE) set({ customMake: true, make: '' });
          else set({ customMake: false, make: next, model: modelsForMake(next)[0] || '', customModel: false });
        }}
        options={makes.map((make) => ({ value: make, label: make === CUSTOM_MAKE ? 'Other company' : make }))}
      />
      {makeChoice === CUSTOM_MAKE ? (
        <>
          <Input
            label="Company name"
            value={value.make}
            error={errors.make}
            onChange={(e) => set({ make: e.target.value, customMake: true })}
          />
          <Input
            label="Model name"
            className="sm:col-span-2"
            value={value.model}
            error={errors.model}
            onChange={(e) => set({ model: e.target.value, customModel: true })}
          />
        </>
      ) : (
        <Select
          label="Model"
          value={modelChoice}
          onChange={(e) => {
            const next = e.target.value;
            if (next === 'Other') set({ customModel: true, model: '' });
            else set({ customModel: false, model: next });
          }}
          options={[...models.map((model) => ({ value: model, label: model })), { value: 'Other', label: 'Other model' }]}
        />
      )}
      {makeChoice !== CUSTOM_MAKE && modelChoice === 'Other' ? (
        <Input
          label="Model name"
          className="sm:col-span-2"
          value={value.model}
          error={errors.model}
          onChange={(e) => set({ model: e.target.value, customModel: true })}
        />
      ) : null}
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-ink">Features</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CAB_FEATURES.map((feature) => {
            const checked = (value.features || []).includes(feature);
            return (
              <label key={feature} className="flex items-center gap-2 rounded-lg border border-line bg-white px-2 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const features = new Set(value.features || []);
                    if (checked) features.delete(feature);
                    else features.add(feature);
                    set({ features: [...features] });
                  }}
                />
                {feature}
              </label>
            );
          })}
        </div>
        {errors.features ? <p className="mt-1 text-xs text-danger">{errors.features}</p> : null}
      </fieldset>
    </div>
  );
}
