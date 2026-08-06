import { useId } from 'react';
import { INDIA_COUNTRY, INDIA_LOCATIONS, INDIAN_STATES } from '../data/indiaLocations.js';

function fieldName(prefix, name) {
  return prefix ? `${prefix}.${name}` : name;
}

function fieldError(form, name) {
  return name.split('.').reduce((value, key) => value?.[key], form.formState.errors);
}

export function LocationFields({ form, prefix = '' }) {
  const listId = useId();
  const countryName = fieldName(prefix, 'country');
  const stateName = fieldName(prefix, 'state');
  const cityName = fieldName(prefix, 'city');
  const state = form.watch(stateName);
  const cities = INDIA_LOCATIONS[state] || [];
  const countryError = fieldError(form, countryName);
  const stateError = fieldError(form, stateName);
  const cityError = fieldError(form, cityName);
  const stateField = form.register(stateName, { required: 'Choose your state' });

  return <>
    <label>Country
      <select aria-invalid={Boolean(countryError)} {...form.register(countryName, { required: 'Choose your country' })}>
        <option value={INDIA_COUNTRY}>{INDIA_COUNTRY}</option>
      </select>
      {countryError && <small className="field-error" role="alert">{countryError.message}</small>}
    </label>
    <label>State
      <select aria-invalid={Boolean(stateError)} {...stateField} onChange={(event) => { stateField.onChange(event); form.setValue(cityName, '', { shouldDirty: true, shouldValidate: false }); }}>
        <option value="">Choose state</option>
        {INDIAN_STATES.map((item) => <option value={item} key={item}>{item}</option>)}
      </select>
      {stateError && <small className="field-error" role="alert">{stateError.message}</small>}
    </label>
    <label>City
      <input list={listId} autoComplete="address-level2" placeholder={state ? 'Choose or enter city' : 'Choose state first'} aria-invalid={Boolean(cityError)} {...form.register(cityName, { required: 'Choose or enter your city', minLength: { value: 2, message: 'Enter at least 2 characters' } })}/>
      <datalist id={listId}>{cities.map((item) => <option value={item} key={item}/>)}</datalist>
      {cityError && <small className="field-error" role="alert">{cityError.message}</small>}
    </label>
  </>;
}
